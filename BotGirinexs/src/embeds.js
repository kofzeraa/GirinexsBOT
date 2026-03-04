import { EmbedBuilder } from "discord.js";
import { cfg } from "./config.js";

export function baseEmbed() {
  const e = new EmbedBuilder()
    .setColor(0x7C3AED)
    .setAuthor({ name: "Girinexs • Sistema de Keys (PRO)" })
    .setFooter({ text: "Girinexs Bot • Automático" })
    .setTimestamp(new Date());
  if (cfg.bannerUrl) e.setImage(cfg.bannerUrl);
  return e;
}

export function plansEmbed() {
  const e = baseEmbed()
    .setTitle("🛒 Comprar Key — Planos Disponíveis")
    .setDescription("Escolha seu plano no menu abaixo. Após escolher, enviaremos o PIX e você manda o comprovante (imagem).");
  e.addFields(...cfg.plans.map(p => ({
    name: p.label,
    value: `⏱️ ${p.desc}\n💳 **R$ ${p.price}**`,
    inline: false
  })));
  return e;
}

export function pixEmbed(plan) {
  return baseEmbed()
    .setTitle("💳 Pagamento via PIX")
    .setDescription(
      `Plano: **${plan.label}**\n` +
      `PIX: \`${cfg.pixKey}\`\n\n` +
      `📌 Envie o **comprovante (imagem)** aqui neste ticket.\n` +
      `Após aprovação, você receberá a **KEY via DM**.`
    );
}

export function logProofEmbed(user, plan, ticketChannelId, imgUrl) {
  const e = baseEmbed()
    .setTitle("✅ Novo comprovante enviado")
    .setDescription(`Cliente: <@${user.id}> (ID: \`${user.id}\`)\nPlano: **${plan.label}**\nTicket: <#${ticketChannelId}>`);
  if (imgUrl) e.setImage(imgUrl);
  return e;
}

export function approvedEmbed(user, plan, keyCode) {
  return baseEmbed()
    .setTitle("✅ Aprovado — KEY liberada")
    .setDescription(`Cliente: <@${user.id}>\nPlano: **${plan.label}**\nKEY: \`${keyCode}\``);
}

export function rejectedEmbed(user, plan) {
  return baseEmbed()
    .setTitle("❌ Rejeitado")
    .setDescription(`Cliente: <@${user.id}>\nPlano: **${plan.label}**\nMotivo: comprovante rejeitado.`);
}

export function dmKeyEmbed(plan, keyCode, expiresAt) {
  return baseEmbed()
    .setTitle("🔑 Sua KEY Girinexs")
    .setDescription(
      `Plano: **${plan.label}**\n` +
      `KEY: \`${keyCode}\`\n` +
      `Expira em: \`${expiresAt}\`\n\n` +
      `Para ativar: \`/key ${keyCode}\``
    );
}
