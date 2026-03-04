# Girinexs Bot PRO — Discord + Base44 (V2)

✅ Fluxo automático:
1) `/comprar`
2) Bot cria ticket privado (categoria `TICKET_CATEGORY_ID`)
3) Usuário escolhe plano → cria `Payment` no Base44
4) Usuário envia comprovante (imagem)
5) Bot posta o comprovante em:
   - `#comprovantes`
   - `#logs-pagamentos` com botões ✅/❌
6) Staff aprova → bot cria `Key` no Base44 e envia por DM
7) Bot loga em `#keys-geradas` e fecha ticket automaticamente

✅ Comandos:
- `/comprar`
- `/planos`
- `/suporte`
- `/status`
- `/minha-key`
- `/key <código>` (ativa uma key no Base44)

✅ Extra:
- Ao iniciar, o bot **preenche a entidade `DiscordChannel`** no Base44 com os canais do servidor.

---

## Pré-requisito no Discord Developer Portal
Bot → **Privileged Gateway Intents**
- Ative **MESSAGE CONTENT INTENT**

## Instalar e rodar
```bash
npm i
copy .env.example .env
npm start
```

## Base44 — Entidades

### Payment (schema)
- `plan` enum: `free_1day | weekly | monthly | annual`
- `status` enum: `pending | approved | rejected`
- `pix_key`, `discord_username`, `discord_user_id`, `comprovante_url`, `key_generated`, `reviewed_by`, `reviewed_at`, `notes`

### Key (usado pelo bot)
- `key_code`, `plan`, `status`, `expires_at`, `activated_by`, `activated_at`, `discord_user_id`, `discord_username`, `price`, `notes`

### DiscordChannel
- `channel_id`, `channel_name`, `category`, `type`, `status`, `user_id`, `payment_id`
