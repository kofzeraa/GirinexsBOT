import dotenv from "dotenv";
dotenv.config();

export const cfg = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  bannerUrl: process.env.BANNER_URL || null,

  ticketCategoryId: process.env.TICKET_CATEGORY_ID,

  comprasChannelId: process.env.COMPRAS_CHANNEL_ID,
  ticketsChannelId: process.env.TICKETS_CHANNEL_ID,
  comprovantesChannelId: process.env.COMPROVANTES_CHANNEL_ID,
  logsPagamentosChannelId: process.env.LOGS_PAGAMENTOS_CHANNEL_ID,
  keysGeradasChannelId: process.env.KEYS_GERADAS_CHANNEL_ID,

  staffRoleName: process.env.STAFF_ROLE_NAME || "Staff Pagamentos",
  pixKey: process.env.PIX_KEY,

  base44ApiUrl: process.env.BASE44_API_URL,
  base44ApiKey: process.env.BASE44_API_KEY,

  autoCloseSeconds: Number(process.env.AUTO_CLOSE_SECONDS || "10"),
  keyPrefix: process.env.KEY_PREFIX || "GIRINEXS",

  plans: [
    { id: "free_1d", label: "Grátis 1 Dia", base44: "free_1day", days: 1, price: 0,  desc: "FREE 24 horas" },
    { id: "wk_7d",   label: "R$ 15 — 1 Semana", base44: "weekly",   days: 7, price: 15, desc: "7 dias" },
    { id: "mo_30d",  label: "R$ 50 — 1 Mês",    base44: "monthly",  days: 30, price: 50, desc: "30 dias" },
    { id: "yr_365d", label: "R$ 100 — Anual",   base44: "annual",   days: 365, price: 100, desc: "365 dias" },
  ],
};

export function assertConfig() {
  const req = [
    "DISCORD_TOKEN","CLIENT_ID","GUILD_ID",
    "TICKET_CATEGORY_ID",
    "COMPRAS_CHANNEL_ID","TICKETS_CHANNEL_ID","COMPROVANTES_CHANNEL_ID","LOGS_PAGAMENTOS_CHANNEL_ID","KEYS_GERADAS_CHANNEL_ID",
    "PIX_KEY",
    "BASE44_API_URL","BASE44_API_KEY"
  ];
  const missing = req.filter(k => !process.env[k]);
  if (missing.length) throw new Error("Config faltando no .env: " + missing.join(", "));
}
