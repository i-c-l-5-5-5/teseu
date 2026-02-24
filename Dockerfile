# Multi-stage Dockerfile para build e runtime
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

# Dependências
COPY package.json package-lock.json* ./
ENV HUSKY=0
RUN npm install --ignore-scripts

# Código
COPY tsconfig.json ./tsconfig.json
COPY src ./src
# Scripts e schema para o postbuild
COPY scripts ./scripts
COPY database ./database
# Não copie .env; a Render injeta variáveis em runtime

# Build
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0

# Apenas deps de produção
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# Copiar artefatos de build
COPY --from=builder /app/dist ./dist

# Copiar dbsetup.js para compatibilidade com Fly.io
COPY dbsetup.js ./dbsetup.js

# Porta gerenciada pela Render via $PORT
ENV PORT=3000

# Usar ENTRYPOINT para evitar sobrescrita do comando
ENTRYPOINT ["node"]
CMD ["dist/bin/index.js"]
