import { Client, GatewayIntentBits, Partials, REST, Routes, Events } from "discord.js";
import { cfg, assertConfig } from "./config.js";
import { commands } from "./commands.js";
import { syncDiscordChannelsToBase44 } from "./bootstrapChannels.js";
import {
  openPurchaseTicket,
  openSupportTicket,
  handlePlanSelect,
  handleProofMessage,
  handleApprovalButton,
  handleMyKey,
  handleActivateKey,
  handleStatus,
} from "./ticketFlow.js";
import { plansEmbed } from "./embeds.js";

assertConfig();

process.on("unhandledRejection", (r) => console.error("UnhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(cfg.discordToken);
  await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), { body: commands });
  console.log("✅ Slash commands registrados.");
}

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Online como ${client.user.tag}`);
  await registerCommands().catch(e => console.error("❌ Falha ao registrar commands:", e));

  // Sync DiscordChannel entities
  await syncDiscordChannelsToBase44(client)
    .then(() => console.log("✅ DiscordChannel sincronizado no Base44."))
    .catch(e => console.error("❌ Sync DiscordChannel falhou:", e?.message || e));
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case "comprar": return openPurchaseTicket(interaction);
        case "planos": return interaction.reply({ embeds: [plansEmbed()], ephemeral: true });
        case "suporte": return openSupportTicket(interaction);
        case "status": return handleStatus(interaction);
        case "minha-key": return handleMyKey(interaction);
        case "key": return handleActivateKey(interaction);
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("plan_select:")) {
      return handlePlanSelect(interaction);
    }

    if (interaction.isButton() && (interaction.customId.startsWith("pay_approve:") || interaction.customId.startsWith("pay_reject:"))) {
      return handleApprovalButton(interaction, client);
    }
  } catch (e) {
    console.error("Interaction error:", e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Erro ao processar.", ephemeral: true }).catch(() => null);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.author?.bot && (message.attachments?.size ?? 0) > 0) {
      console.log(`[MSG] attachment channel=${message.channelId} user=${message.author.id} count=${message.attachments.size}`);
    }
    await handleProofMessage(message, client);
  } catch (e) {
    console.error("Message handler error:", e);
  }
});

client.login(cfg.discordToken);
