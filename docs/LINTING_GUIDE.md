# 🔍 Guia de Qualidade de Código - Linters e Formatadores

## 📋 Visão Geral das Mudanças

### ✅ Dependências Removidas

- ❌ `install` - Pacote obsoleto e redundante
- ❌ `oraculo` - Ferramenta customizada não mais necessária
- ❌ `@vitejs/plugin-legacy` - Não utilizado no projeto

### ✨ Novos Linters Adicionados

- ✅ `eslint-plugin-security` - Detecta vulnerabilidades de segurança
- ✅ `eslint-plugin-sonarjs` - Melhora qualidade e detecta code smells
- ✅ `eslint-plugin-unicorn` - Melhores práticas modernas JS/TS
- ✅ `eslint-plugin-n` - Validações específicas para Node.js
- ✅ `@types/pg` - Types para PostgreSQL
- ✅ `sql-lint` - Linting para arquivos SQL
- ✅ Workflow Linter via GitHub Actions

### 🔒 TypeScript Mais Rigoroso

O `tsconfig.json` agora inclui todas as verificações estritas:

- `noUnusedLocals` - Detecta variáveis não usadas
- `noUnusedParameters` - Detecta parâmetros não usados
- `noImplicitReturns` - Garante returns explícitos
- `noFallthroughCasesInSwitch` - Previne bugs em switch
- `noUncheckedIndexedAccess` - Segurança em acessos de array/objeto
- `noImplicitOverride` - Requer keyword `override` explícito

## 🚀 Comandos Disponíveis

### Linting TypeScript

```bash
# Lint completo (TypeScript + Workflows)
npm run lint

# Apenas TypeScript
npm run lint:ts

# TypeScript com auto-fix
npm run lint:ts:fix
```

### Linting SQL

```bash
# Verificar todos os arquivos SQL
npm run lint:sql

# Verificar apenas SQLite
npm run lint:sql:sqlite

# Verificar apenas PostgreSQL
npm run lint:sql:postgres

# Formatar SQLite (auto-fix)
npm run format:sql:sqlite

# Formatar PostgreSQL (auto-fix)
npm run format:sql:postgres

# Formatar todos os SQL
npm run format:sql
```

### Linting de Workflows

```bash
# Verificar workflows do GitHub Actions
npm run lint:workflows
```

### Formatação

```bash
# Formatar tudo (TypeScript, CSS, HTML, SQL, YAML)
npm run format:fix

# Verificar formatação sem modificar
npm run format:check
```

## 🛡️ Novas Regras de Segurança

### ESLint Security Plugin

Detecta padrões inseguros:

- ✅ Regex inseguros (ReDoS)
- ✅ Uso de `eval()` e expressões perigosas
- ✅ Acesso a filesystem sem validação
- ✅ Child processes sem sanitização
- ✅ CSRF vulnerabilities
- ⚠️ `crypto.pseudoRandomBytes()` (usar `randomBytes`)

### SonarJS - Qualidade de Código

Detecta:

- 🔍 Funções duplicadas
- 🔍 Complexidade cognitiva alta (>20)
- 🔍 Strings duplicadas (>5 vezes)
- 🔍 Template literals aninhados
- 🔍 Returns desnecessários

### Unicorn - Melhores Práticas

Encoraja:

- ✨ Regex modernos e otimizados
- ✨ Array methods modernos (`.find()`, `.some()`, `.flatMap()`)
- ✨ APIs modernas do JavaScript
- ✨ Nomenclatura consistente de arquivos (kebab-case)
- ✨ Error handling adequado

### Node.js Específico

Valida:

- 🟢 APIs não depreciadas
- 🟢 ES syntax suportado
- 🟢 Uso adequado de `process.exit()`

## 📝 Configuração SQL

### SQLite (`database/schema.sql`)

```bash
# Verificar sem modificar
npm run lint:sql:sqlite

# Formatar (cuidado: modifica o arquivo)
npm run format:sql:sqlite
```

### PostgreSQL (`database/schema.postgres.sql`, `database/rls-policies.sql`)

```bash
# Verificar sem modificar
npm run lint:sql:postgres

# Formatar (cuidado: modifica o arquivo)
npm run format:sql:postgres
```

**⚠️ IMPORTANTE:** Os linters SQL **NÃO** aplicam auto-fix automaticamente para evitar que um estrague o outro. Você precisa executar manualmente os comandos de formatação quando necessário.

## 🔄 Git Hooks (lint-staged)

Ao fazer commit, os seguintes linters rodam automaticamente:

### TypeScript (`.ts`)

- ESLint com auto-fix
- Prettier

### CSS (`.css`)

- Stylelint com auto-fix
- Prettier

### HTML (`.html`)

- HTMLHint
- Prettier

### SQL (`.sql`)

- **Apenas verificação** (sem auto-fix)
- SQLite para `schema.sql`
- PostgreSQL para `schema.postgres.sql` e `rls-policies.sql`

### YAML (`.yml`)

- Prettier

## 🎯 Exemplos de Uso

### Antes de Commitar

```bash
# Verificar tudo
npm run lint
npm run lint:sql
npm run format:check

# Corrigir automaticamente
npm run lint:ts:fix
npm run format:fix
```

### Após Modificar SQL

```bash
# Verificar SQLite
npm run lint:sql:sqlite

# Se necessário, formatar
npm run format:sql:sqlite

# Verificar PostgreSQL
npm run lint:sql:postgres

# Se necessário, formatar
npm run format:sql:postgres
```

### CI/CD

O GitHub Actions agora roda:

- ✅ Lint de TypeScript
- ✅ Lint de Workflows (actionlint + yamllint)
- ✅ Type checking
- ✅ Testes

## 🐛 Troubleshooting

### Erro: "yamllint not found"

```bash
# Instalar yamllint (opcional)
pip install yamllint

# Ou ignorar (o script já trata isso)
npm run lint:workflows
```

## 🧭 Usando o pacote local `shared-config` (sem publicar)

Se você mantém um pacote interno com regras compartilhadas (como o diretório `shared-config/` neste repositório), não é necessário publicar para usar as configurações no projeto — basta referenciar os arquivos diretamente e instalar os CLIs que executam essas configurações.

Exemplo (já aplicado ao projeto):

- no `package.json` do seu projeto, a dependência local é apontada assim:

```json
"@morallus-software/shared-config": "file:./shared-config"
```

- para formatar/rodar os linters você pode apontar para os arquivos dentro do pacote local:

```bash
stylelint --config ./node_modules/@morallus-software/shared-config/configs/stylelint/.stylelintrc.json "**/*.{css,scss}" --fix
```

Observação importante: as ferramentas (ex.: `stylelint`, `sql-formatter`, `yamllint`) não são instaladas automaticamente quando você apenas adiciona um pacote de configuração — os `devDependencies` das bibliotecas não são propagados para o consumidor. Garanta que o projeto consumidor tenha os CLIs instalados (ex.: `npm install -D stylelint sql-formatter yaml-lint`) para que os scripts do `package.json` funcionem.

### ESLint muito rigoroso

Se alguma regra estiver causando problemas:

```javascript
// eslint.config.js
rules: {
  "nome-da-regra": "off", // ou "warn"
}
```

### TypeScript muito rigoroso

Se necessário, ajustar no `tsconfig.json`:

```json
{
  "compilerOptions": {
    "noUnusedLocals": false // exemplo
  }
}
```

### SQL formatter modificando código incorretamente

```bash
# Fazer backup antes
npm run db:backup

# Depois formatar
npm run format:sql:sqlite
```

## 📊 Métricas de Qualidade

Com essas configurações, o projeto agora tem:

- 🛡️ **Segurança**: Vulnerabilidades detectadas automaticamente
- 🎯 **Qualidade**: Code smells e duplicações identificados
- 📈 **Manutenibilidade**: Complexidade monitorada
- 🔍 **Type Safety**: Máximo rigor do TypeScript
- ✨ **Modernidade**: Melhores práticas JS/TS/Node.js
- 🔒 **SQL Seguro**: Validação de sintaxe SQL

## 🔗 Recursos

- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [SonarJS Rules](https://github.com/SonarSource/eslint-plugin-sonarjs)
- [Unicorn Rules](https://github.com/sindresorhus/eslint-plugin-unicorn)
- [SQL Formatter](https://github.com/sql-formatter-org/sql-formatter)
- [Actionlint](https://github.com/rhysd/actionlint)
