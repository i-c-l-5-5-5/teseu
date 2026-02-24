# Guia de Configuração PostgreSQL + Supabase

Este guia explica como configurar o bot Barqueiro com PostgreSQL/Supabase, incluindo fallback automático para SQLite.

## 🎯 Visão Geral

O bot foi configurado para:

- **Usar PostgreSQL (Supabase)** em produção para persistência de dados
- **Fallback automático para SQLite** se o PostgreSQL falhar ou não estiver disponível
- **Row Level Security (RLS)** para proteção adicional dos dados
- **Zero downtime** - o bot continua funcionando mesmo se o banco principal falhar

## 🔐 Segurança com RLS

As políticas de Row Level Security (RLS) foram implementadas para:

### Tabelas com Leitura Pública:

- `xp` - Rankings e XP dos usuários
- `rank_roles` - Configuração de cargos por nível
- `channel_config` - Configuração de canais
- `quiz_configs` - Configuração dos quizzes
- `perfil_quiz_config` - Configuração do quiz de perfil
- `perfil` - Perfis customizados dos usuários

### Tabelas Restritas:

- `config` - Configurações sensíveis (apenas backend)
- `squad_quiz_responses` - Respostas privadas dos quizzes
- `perfil_quiz_sessions` - Sessões temporárias do quiz

**Importante:** Apenas o `service_role` (backend do bot) pode inserir/atualizar dados.

## 📦 Opção 1: Configurar com Supabase (Recomendado)

### Passo 1: Criar Projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Preencha:
   - **Name:** `barqueiro`
   - **Database Password:** (escolha uma senha forte)
   - **Region:** escolha a mais próxima (ex: South America)
4. Clique em "Create new project"

### Passo 2: Obter Connection String

1. No Supabase Dashboard, vá em **Settings → Database**
2. Role até **Connection String**
3. Escolha **Connection pooling** → **Transaction mode**
4. Copie a string que se parece com:
   ```
   postgres://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```

### Passo 3: Aplicar Schema

Você tem duas opções:

#### Opção A: Via Supabase Dashboard

1. No Supabase, vá em **SQL Editor**
2. Clique em "New query"
3. Cole o conteúdo de `database/schema.postgres.sql`
4. Clique em "Run"

#### Opção B: Via Script

```bash
# Configure a variável
export DATABASE_URL="sua-connection-string-aqui"

# Execute o script (será aplicado automaticamente na primeira conexão)
npm start
```

### Passo 4: Aplicar Políticas RLS

```bash
# Configure a variável
export DATABASE_URL="sua-connection-string-aqui"

# Execute o script de RLS
node scripts/apply-rls-policies.mjs
```

Ou via Supabase Dashboard:

1. Vá em **SQL Editor**
2. Cole o conteúdo de `database/rls-policies.sql`
3. Clique em "Run"

### Passo 5: Configurar no Render

1. No Render Dashboard, vá em seu serviço
2. Em **Environment**, adicione:
   ```
   DATABASE_URL = sua-connection-string-do-supabase
   ```
3. Clique em "Save Changes"
4. O Render fará redeploy automaticamente

## 📦 Opção 2: PostgreSQL no Render

Se preferir usar o PostgreSQL do próprio Render:

### Passo 1: Usar o render.yaml

O arquivo `render.yaml` já está configurado com:

- Serviço PostgreSQL (`barqueiro-db`)
- Conexão automática via `DATABASE_URL`

### Passo 2: Deploy

1. Faça commit e push do código
2. No Render, ele criará automaticamente:
   - O banco PostgreSQL
   - O serviço web conectado ao banco

### Passo 3: Aplicar RLS (Opcional para Render)

```bash
# Obtenha a DATABASE_URL do Render Dashboard
# Em Settings → Environment → DATABASE_URL (Internal Database URL)

DATABASE_URL="..." node scripts/apply-rls-policies.mjs
```

## 🔄 Sistema de Fallback Automático

O bot implementa um sistema inteligente de fallback:

### Quando o PostgreSQL Falha:

1. **Detecção Automática**: O sistema detecta falhas de conexão
2. **Switch para SQLite**: Automaticamente usa SQLite local
3. **Logs Informativos**: Registra a mudança nos logs
4. **Continuidade**: O bot continua funcionando normalmente

### Logs Esperados:

```
[PostgreSQL] Pool de conexões criado.
✓ Schema PostgreSQL aplicado
[DB] Usando PostgreSQL
```

Ou em caso de fallback:

```
[PostgreSQL] Erro crítico ao conectar: ...
[PostgreSQL] Mudando para SQLite como fallback.
[DB] PostgreSQL configurado mas indisponível, usando SQLite como fallback
[SQLite] Conectado em: /app/database/barqueiro.db. (Modo de fallback)
[DB] Usando SQLite
```

## 🧪 Testando a Configuração

### Testar Conexão PostgreSQL:

```bash
# Configure DATABASE_URL
export DATABASE_URL="sua-connection-string"

# Execute o bot
npm start
```

Verifique os logs para confirmar que está usando PostgreSQL.

### Testar Fallback para SQLite:

```bash
# Use uma URL inválida
export DATABASE_URL="postgres://invalid:invalid@invalid:5432/invalid"

# Execute o bot
npm start
```

O bot deve automaticamente usar SQLite e continuar funcionando.

### Verificar Políticas RLS:

```bash
# Após aplicar as políticas
node scripts/apply-rls-policies.mjs
```

Você verá uma lista de todas as políticas configuradas.

## 📊 Monitoramento

### Via Supabase Dashboard:

1. **Database → Tables**: Ver dados em tempo real
2. **Database → Replication**: Verificar integridade
3. **Logs**: Monitorar queries e erros

### Via Logs do Render:

```bash
# No Render Dashboard → Logs
# Procure por:
[DB] Usando PostgreSQL  # ✅ Tudo certo
[DB] Usando SQLite      # ⚠️ Fallback ativo
```

## 🔧 Solução de Problemas

### Erro: "SSL connection required"

- Certifique-se de usar **Connection pooling** no Supabase
- Ou adicione `?sslmode=require` na connection string

### Erro: "password authentication failed"

- Verifique se copiou a senha correta
- No Supabase, você pode resetar a senha em Settings → Database

### Bot usando SQLite em produção:

- Verifique se `DATABASE_URL` está configurada corretamente
- Teste a conexão com: `psql $DATABASE_URL`
- Verifique os logs para ver o erro específico

### RLS bloqueando operações:

- As políticas RLS só afetam conexões não-privilegiadas
- O bot usa a connection string do service role, que bypassa RLS
- Se usar Supabase, certifique-se de usar a connection string correta

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Render PostgreSQL](https://render.com/docs/databases)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do Render/Supabase
2. Teste a conexão localmente
3. Confirme que as variáveis de ambiente estão corretas
4. Revise as políticas RLS no Supabase Dashboard
