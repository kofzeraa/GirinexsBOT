import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder().setName("comprar").setDescription("Abrir compra de key (ticket privado)."),
  new SlashCommandBuilder().setName("planos").setDescription("Ver todos os planos disponíveis."),
  new SlashCommandBuilder().setName("suporte").setDescription("Abrir ticket de suporte."),
  new SlashCommandBuilder().setName("status").setDescription("Verificar status do bot/sistema."),
  new SlashCommandBuilder().setName("minha-key").setDescription("Ver informações da sua key atual (Base44)."),
  new SlashCommandBuilder()
    .setName("key")
    .setDescription("Ativar uma key Girinexs.")
    .addStringOption(o => o.setName("codigo").setDescription("Código da key").setRequired(true)),
].map(c => c.toJSON());
