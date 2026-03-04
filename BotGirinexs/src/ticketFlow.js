import {
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { cfg } from "./config.js";
import { createPayment, updatePayment, createKey, updateKey, listEntities } from "./base44.js";
import { makeKeyCode, calcExpiresAt } from "./keyutil.js";
import { plansEmbed, pixEmbed, logProofEmbed, approvedEmbed, rejectedEmbed, dmKeyEmbed, baseEmbed } from "./embeds.js";

// In-memory state (plus channel topic persistence)
const state = new Map(); // ticketChannelId -> { userId, planId, paymentId }

function topicBuild(s) {
  return `girinexs|user=${s.userId}|plan=${s.planId || ""}|payment=${s.paymentId || ""}`;
}
function topicParse(topic) {
  if (!topic || typeof topic !== "string" || !topic.startsWith("girinexs|")) return null;
  const obj = {};
  for (const part of topic.split("|").slice(1)) {
    const [k, ...rest] = part.split("=");
    obj[k] = rest.join("=") || "";
  }
  return { userId: obj.user || null, planId: obj.plan || null, paymentId: obj.payment || null };
}

function staffGuard(interaction) {
  const m = interaction.member;
  if (!m) return false;
  return m.roles?.cache?.some(r => r.name === cfg.staffRoleName) || m.permissions?.has(PermissionFlagsBits.Administrator);
}

export async function openPurchaseTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
  ];

  const staffRole = guild.roles.cache.find(r => r.name === cfg.staffRoleName);
  if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const ch = await guild.channels.create({
    name: `compra-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    type: ChannelType.GuildText,
    parent: cfg.ticketCategoryId,
    permissionOverwrites: overwrites,
    topic: "girinexs|user=" + user.id,
  });

  // menu de planos
  const select = new StringSelectMenuBuilder()
    .setCustomId(`plan_select:${ch.id}`)
    .setPlaceholder("Selecione um plano...")
    .addOptions(cfg.plans.map(p => ({ label: p.label, description: `${p.desc} • R$ ${p.price}`, value: p.id })));

  await ch.send({ content: `<@${user.id}>`, embeds: [plansEmbed()], components: [new ActionRowBuilder().addComponents(select)] });

  state.set(ch.id, { userId: user.id, planId: null, paymentId: null });
  await interaction.reply({ content: `✅ Ticket criado: <#${ch.id}>`, ephemeral: true });
}

export async function openSupportTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
  ];

  const staffRole = guild.roles.cache.find(r => r.name === cfg.staffRoleName);
  if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const ch = await guild.channels.create({
    name: `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    type: ChannelType.GuildText,
    parent: cfg.ticketCategoryId,
    permissionOverwrites: overwrites,
    topic: `girinexs|user=${user.id}|support=1`,
  });

  await ch.send({ content: `<@${user.id}>`, embeds: [baseEmbed().setTitle("🎫 Suporte").setDescription("Explique seu problema aqui.")] });
  await interaction.reply({ content: `✅ Ticket de suporte criado: <#${ch.id}>`, ephemeral: true });
}

export async function handlePlanSelect(interaction) {
  const [_, channelId] = interaction.customId.split(":");
  if (interaction.channelId !== channelId) return interaction.reply({ content: "Menu inválido para este canal.", ephemeral: true });

  const s = state.get(channelId) || topicParse(interaction.channel?.topic);
  if (!s?.userId) return interaction.reply({ content: "Não reconheci este ticket.", ephemeral: true });
  if (interaction.user.id !== s.userId) return interaction.reply({ content: "Apenas o dono do ticket escolhe o plano.", ephemeral: true });

  const planId = interaction.values?.[0];
  const plan = cfg.plans.find(p => p.id === planId);
  if (!plan) return interaction.reply({ content: "Plano inválido.", ephemeral: true });

  // cria Payment com schema real
  const paymentRes = await createPayment({
    plan: plan.base44,
    amount: plan.price,
    pix_key: cfg.pixKey,
    discord_user_id: s.userId,
    discord_username: interaction.user.username,
    comprovante_url: null,
    status: "pending",
    key_generated: null,
    reviewed_by: null,
    reviewed_at: null,
    notes: null,
    user_email: null,
  });

  const next = { userId: s.userId, planId: plan.id, paymentId: paymentRes.id };
  state.set(channelId, next);
  await interaction.channel.setTopic(topicBuild(next)).catch(() => null);

  await interaction.update({ embeds: [pixEmbed(plan)], components: [] });
}

export async function handleProofMessage(message, client) {
  if (message.author?.bot) return;
  if ((message.attachments?.size ?? 0) <= 0) return;

  // Rehydrate state
  let s = state.get(message.channelId);
  if (!s) {
    const parsed = topicParse(message.channel?.topic);
    if (parsed?.userId) {
      s = { userId: parsed.userId, planId: parsed.planId || null, paymentId: parsed.paymentId || null };
      state.set(message.channelId, s);
    }
  }

  if (!s?.planId || !s?.paymentId) {
    await message.reply("⚠️ Envie o comprovante **após** selecionar um plano no menu.").catch(() => null);
    return;
  }

  const plan = cfg.plans.find(p => p.id === s.planId);
  const imgUrl = message.attachments.first()?.url || null;

  // Atualiza Payment com comprovante_url
  await updatePayment(s.paymentId, { comprovante_url: imgUrl, notes: "Comprovante enviado (aguardando revisão)", status: "pending" }).catch(() => null);

  // Envia no canal #comprovantes (cópia)
  const comprovantes = await client.channels.fetch(cfg.comprovantesChannelId).catch(() => null);
  if (comprovantes) {
    await comprovantes.send({ embeds: [logProofEmbed(message.author, plan, message.channelId, imgUrl)] }).catch(() => null);
  }

  // Envia no canal #logs-pagamentos com botões
  const logs = await client.channels.fetch(cfg.logsPagamentosChannelId).catch(() => null);
  if (!logs) {
    await message.reply("❌ Não consigo acessar #logs-pagamentos. Verifique permissões/ID.").catch(() => null);
    return;
  }

  const approveBtn = new ButtonBuilder()
    .setCustomId(`pay_approve:${message.channelId}:${s.userId}:${s.planId}:${s.paymentId}`)
    .setLabel("Aprovar")
    .setStyle(ButtonStyle.Success);

  const rejectBtn = new ButtonBuilder()
    .setCustomId(`pay_reject:${message.channelId}:${s.userId}:${s.planId}:${s.paymentId}`)
    .setLabel("Rejeitar")
    .setStyle(ButtonStyle.Danger);

  await logs.send({
    embeds: [logProofEmbed(message.author, plan, message.channelId, imgUrl)],
    components: [new ActionRowBuilder().addComponents(approveBtn, rejectBtn)],
  }).catch(async () => {
    await message.reply("❌ Sem permissão para enviar embeds/botões em #logs-pagamentos.").catch(() => null);
  });

  await message.reply({ embeds: [baseEmbed().setTitle("⏳ Recebido!").setDescription("Comprovante enviado para análise do staff.")] }).catch(() => null);
}

export async function handleApprovalButton(interaction, client) {
  if (!staffGuard(interaction)) return interaction.reply({ content: "Sem permissão.", ephemeral: true });

  const [action, ticketChannelId, userId, planId, paymentId] = interaction.customId.split(":");
  const plan = cfg.plans.find(p => p.id === planId);

  const ticketChannel = await interaction.guild.channels.fetch(ticketChannelId).catch(() => null);
  const user = await client.users.fetch(userId).catch(() => null);

  if (!ticketChannel) return interaction.reply({ content: "Ticket não existe mais.", ephemeral: true });

  if (action === "pay_reject") {
    await updatePayment(paymentId, { status: "rejected", reviewed_by: interaction.user.id, reviewed_at: new Date().toISOString(), notes: "Rejeitado pelo staff" }).catch(() => null);
    await interaction.update({ components: [] });
    await ticketChannel.send({ embeds: [rejectedEmbed({ id: userId }, plan)] }).catch(() => null);
    return;
  }

  // Aprovar: cria Key no Base44
  const keyCode = makeKeyCode();
  const expiresAt = calcExpiresAt(plan.days);

  await createKey({
    key_code: keyCode,
    plan: plan.base44,
    status: "active",
    expires_at: expiresAt,
    activated_by: null,
    activated_at: null,
    discord_user_id: userId,
    discord_username: user?.username || null,
    price: plan.price,
    notes: `Gerada via aprovação Payment ${paymentId}`,
  }).catch(() => null);

  await updatePayment(paymentId, {
    status: "approved",
    key_generated: keyCode,
    reviewed_by: interaction.user.id,
    reviewed_at: new Date().toISOString(),
    notes: "Aprovado e key gerada",
  }).catch(() => null);

  // DM
  if (user) await user.send({ embeds: [dmKeyEmbed(plan, keyCode, expiresAt)] }).catch(() => null);

  // Log keys geradas
  const keysLog = await client.channels.fetch(cfg.keysGeradasChannelId).catch(() => null);
  if (keysLog) await keysLog.send({ embeds: [approvedEmbed({ id: userId }, plan, keyCode)] }).catch(() => null);

  await interaction.update({ components: [] });

  await ticketChannel.send({ embeds: [baseEmbed().setTitle("✅ Aprovado").setDescription(`KEY enviada por DM. Fechando em **${cfg.autoCloseSeconds}s**.`)] }).catch(() => null);

  await ticketChannel.permissionOverwrites.edit(userId, { SendMessages: false, AttachFiles: false }).catch(() => null);
  setTimeout(async () => {
    await ticketChannel.delete("Compra finalizada (auto-close)").catch(() => null);
    state.delete(ticketChannelId);
  }, cfg.autoCloseSeconds * 1000);
}

// ======= User Commands =======

export async function handleMyKey(interaction) {
  const userId = interaction.user.id;
  const payments = await listEntities("Payment").catch(() => []);
  const mine = payments.filter(p => p.discord_user_id === userId && p.status === "approved").sort((a,b)=> String(b.reviewed_at||"").localeCompare(String(a.reviewed_at||"")));
  const last = mine[0];
  if (!last) return interaction.reply({ content: "Você ainda não tem key aprovada.", ephemeral: true });

  return interaction.reply({
    embeds: [
      baseEmbed()
        .setTitle("🔑 Minha KEY")
        .addFields(
          { name: "Plano", value: String(last.plan), inline: true },
          { name: "Status", value: String(last.status), inline: true },
          { name: "Key", value: `\`${last.key_generated || "—"}\``, inline: false },
        )
    ],
    ephemeral: true
  });
}

export async function handleActivateKey(interaction) {
  const code = interaction.options.getString("codigo", true).trim();

  const keys = await listEntities("Key").catch(() => []);
  const k = keys.find(x => String(x.key_code || "").toUpperCase() === code.toUpperCase());
  if (!k) return interaction.reply({ content: "❌ Key não encontrada.", ephemeral: true });

  const id = k.id || k._id;
  if (!id) return interaction.reply({ content: "❌ Não consegui identificar o ID da key no Base44.", ephemeral: true });

  // Verifica expiração (se existir)
  if (k.expires_at) {
    const exp = new Date(k.expires_at);
    if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return interaction.reply({ content: "❌ Esta key está expirada.", ephemeral: true });
    }
  }

  // Ativa (marca quem ativou)
  await updateKey(id, {
    status: "activated",
    activated_by: interaction.user.id,
    activated_at: new Date().toISOString(),
    discord_user_id: interaction.user.id,
    discord_username: interaction.user.username,
    notes: "Ativada via Discord /key",
  }).catch(() => null);

  return interaction.reply({ embeds: [baseEmbed().setTitle("✅ Key ativada!").setDescription(`Key: \`${code}\``)], ephemeral: true });
}

export async function handleStatus(interaction) {
  return interaction.reply({
    embeds: [baseEmbed().setTitle("📡 Status").setDescription("✅ Bot online\n✅ Base44 configurado\n✅ Fluxo de compras ativo")],
    ephemeral: true
  });
}
