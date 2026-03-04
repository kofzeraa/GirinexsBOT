# Imagem oficial do Node
FROM node:20-alpine

# Criar pasta do app
WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar restante do código
COPY . .

# Rodar como usuário não-root (segurança)
RUN addgroup -S botgroup && adduser -S botuser -G botgroup
USER botuser

# Porta opcional (caso bot use API)
EXPOSE 3000

# Comando para iniciar o bot
CMD ["npm", "start"]