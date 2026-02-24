# barqueiro

> Proveniência e Autoria: Este documento integra o projeto Barqueiro (licença MIT).
> Nada aqui implica cessão de direitos morais/autorais.
> Conteúdos de terceiros não licenciados de forma compatível não devem ser incluídos.
> Referências a materiais externos devem ser linkadas e reescritas com palavras próprias.

---

![congelado](https://ascentus-oss.vercel.app/api/svg/badges/decorativos/badge-congelado.svg)

---

Bot do Discord com integração GitHub via Supabase, ranking por mensagens, anúncios em embed e atribuição de cargos por "squad" (personalidade).

> Como um bom e velho dev que ta cozido, a documentacao nao tem nada haver com o projeto. os erros de build foram corrigidos e esta com boa type safety, pelo menos acho. depois dou mais uma ajeitada.

## Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha com seus valores:

```bash
cp .env.example .env
```

### Configuração Mínima Obrigatória

```bash
# Discord Bot (obtenha em: https://discord.com/developers/applications)
DISCORD_TOKEN=seu_token_aqui
DISCORD_CLIENT_ID=seu_client_id_aqui
DISCORD_CLIENT_SECRET=seu_client_secret_aqui

# Servidor Web
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000

# Segurança (gere uma chave aleatória)
PANEL_JWT_SECRET=sua_chave_jwt_secreta_aqui
```

Para gerar uma chave JWT segura:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Configuração Opcional

```bash
# Desenvolvimento: Registrar comandos apenas em um servidor específico
DISCORD_GUILD_ID=id_do_seu_servidor

# Permissões do bot (bitmask decimal)
DISCORD_PERMISSIONS=8

# Banco de dados personalizado
DB_PATH=database/barqueiro.db

# Modo de armazenamento em memória (testes)
CONFIG_STORAGE_MODE=memory

# Keep-Alive para evitar hibernação
KEEPALIVE_ENABLED=true
KEEPALIVE_INTERVAL_MS=300000
```

### Segurança

- ⚠️ **NUNCA** commite o arquivo `.env` no Git (já está no `.gitignore`)
- Rotacione o `PANEL_JWT_SECRET` periodicamente
- Mantenha `DISCORD_TOKEN` e `DISCORD_CLIENT_SECRET` privados
- Em produção, defina `NODE_ENV=production`

### Supabase (Descontinuado)

O projeto agora usa SQLite por padrão. As variáveis do Supabase são mantidas para compatibilidade legada, mas não são mais necessárias.

## Scripts

- Instalar: npm install
- Dev: npm run dev
- Build: npm run build
- Start: npm start
- Registrar comandos do Discord: npm run register-commands

## Qualidade de código

- Lint: npm run lint
- Format: npm run format
- Hooks: Husky + lint-staged (pre-commit) formatam e corrigem automaticamente os arquivos alterados.

## Supabase (schema e RLS)

SQL em `supabase/schema.sql` com tabelas `xp` e `portfolio` e políticas básicas de RLS. Ajuste conforme seu modelo de autenticação.

## Licença e conformidade

Este projeto é licenciado sob a licença MIT (veja `LICENSE`).

- Todos os arquivos fonte devem conter o cabeçalho `SPDX-License-Identifier: MIT`.
- Conteúdos de terceiros que não forem compatíveis com MIT não podem ser adicionados ao repositório.
- Se trechos de terceiros compatíveis forem utilizados, mantenha os avisos de copyright e a licença original, e documente a procedência.

Observação: usamos ESLint (flat config em `eslint.config.js`) e Prettier. Os hooks de commit rodam `lint-staged` para formatar e corrigir arquivos alterados.

## Frontend: estilos e utilitários

Centralizamos estilos em `public/css/styles.css` (tema/base) e `public/css/utilities.css` (utilitários e componentes). Evite `style="..."` inline. Prefira as classes utilitárias:

- Layout: `flex`, `col`, `row-sm`, `wrap`, `align-center`, `gap-6`, `gap-8`.
- Espaçamento: `mt-6`, `mt-8`, `mt-12`, `mt-24`, `mb-8`, `m-0`, `py-16`.
- Larguras: `w-32`, `h-32`, `w-80`, `w-100`, `w-160`, `w-240`, `min-160`, `min-240`, `min-360`, `w-100p`, `flex-1`.
- Cards: `card`, `card-pad-sm`, `card-pad-md`, `card-row`.
- Form: `input`, `select`, `textarea` (estilizam foco/borda/fundo padrão).
- Botões: `.button` base; variação secundária via `.button secondary` e alias `.btn-secondary`.

Exemplo:

```html
<div class="card card-pad-md">
  <div class="row-sm">
    <input class="input w-160" type="number" />
    <select class="select min-160"></select>
  </div>
  <textarea class="textarea mt-8" rows="4"></textarea>
  <button class="button secondary btn-secondary mt-12">Salvar</button>
  <div class="w-32 h-32 radius-6 bd mt-12" style="background:#5865F2"></div>
</div>
```

Observação: para previews dinâmicos de cor (ex.: quadrado de cor), mantemos `style="background:#..."` apenas para o background enquanto todo o resto (tamanho, borda, raio) é feito com utilitários.
# barqueiro
