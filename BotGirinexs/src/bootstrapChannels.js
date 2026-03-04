import { cfg } from "./config.js";
import { upsertDiscordChannel } from "./base44.js";

export async function syncDiscordChannelsToBase44(client) {
  const guild = await client.guilds.fetch(cfg.guildId);
  const channels = await guild.channels.fetch();

  const map = [
    { id: cfg.comprasChannelId, name: "compras", category: "compras", type: "purchase", status: "open" },
    { id: cfg.ticketsChannelId, name: "tickets", category: "suporte", type: "ticket", status: "open" },
    { id: cfg.comprovantesChannelId, name: "comprovantes", category: "pagamentos", type: "proofs", status: "open" },
    { id: cfg.logsPagamentosChannelId, name: "logs-pagamentos", category: "logs", type: "log", status: "open" },
    { id: cfg.keysGeradasChannelId, name: "keys-geradas", category: "admin", type: "keys", status: "open" },
  ];

  for (const c of map) {
    const ch = channels.get(c.id);
    const channel_name = ch?.name || c.name;
    await upsertDiscordChannel(c.id, {
      channel_id: c.id,
      channel_name,
      category: c.category,
      type: c.type,
      status: c.status,
      user_id: null,
      payment_id: null,
    });
  }
}
