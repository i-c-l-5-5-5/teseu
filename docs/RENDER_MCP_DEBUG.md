# Guia de Debug com Render MCP Server

Este guia explica como usar o Render MCP (Model Context Protocol) Server para debugar o bot diretamente do Cursor/Claude Code.

## 🎯 O que é o Render MCP?

O MCP da Render permite que você gerencie sua infraestrutura usando prompts de linguagem natural:

- Listar serviços e databases
- Ver logs em tempo real
- Analisar métricas (CPU, memória, tráfego)
- Executar queries SQL read-only
- Criar novos recursos

## 🔧 Configuração Inicial

### 1. Criar API Key da Render

1. Acesse [Render Account Settings](https://dashboard.render.com/account/settings)
2. Role até **API Keys**
3. Clique em **Create API Key**
4. Nomeie como "MCP Debug" e copie a chave

⚠️ **Importante**: A API key tem acesso total aos seus workspaces e serviços. Guarde com segurança.

### 2. Configurar Cursor MCP

Crie/edite o arquivo `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer <SUA_API_KEY_AQUI>"
      }
    }
  }
}
```

Substitua `<SUA_API_KEY_AQUI>` pela chave que você criou.

### 3. Reiniciar o Cursor

Feche e reabra o Cursor para carregar a nova configuração MCP.

## 🚀 Primeiros Passos

### Definir Workspace

Primeiro, defina qual workspace usar:

```
Set my Render workspace to [SEU_WORKSPACE]
```

Ou simplesmente:

```
List my Render workspaces
```

E depois:

```
Set my Render workspace to barqueiro
```

## 🔍 Comandos de Debug Essenciais

### Listar Serviços

```
List my Render services
```

```
Show details of service barqueiro
```

### Ver Logs Recentes

```
Show the last 50 logs for service barqueiro
```

```
Pull the most recent error-level logs for barqueiro
```

```
Show logs from the last hour for barqueiro
```

### Analisar Métricas

```
What was the CPU usage for barqueiro in the last hour?
```

```
Show memory usage for barqueiro today
```

```
What was the busiest traffic day for barqueiro this week?
```

### Database

```
List all databases in my workspace
```

```
Show details of database barqueiro-db
```

```
Run this query on barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public'
```

```
Query barqueiro-db: SELECT COUNT(*) FROM xp
```

⚠️ Apenas queries **read-only** são permitidas via MCP.

## 🐛 Cenários de Debug Comuns

### 1. Bot não conecta ao PostgreSQL

```
Show the last 100 logs for barqueiro and filter for "PostgreSQL" or "DATABASE"
```

```
Check if DATABASE_URL is set for service barqueiro
```

```
Show connection details for database barqueiro-db
```

### 2. Schema não foi aplicado

```
Query barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
```

Se retornar vazio, o schema não foi aplicado.

### 3. Bot usando SQLite em vez de PostgreSQL

```
Show logs for barqueiro containing "SQLite" or "fallback"
```

```
Show logs for barqueiro containing "Pool de conexões criado"
```

### 4. Erros de SSL

```
Show error logs for barqueiro in the last 24 hours
```

```
Check environment variables for barqueiro
```

Se ver erros de SSL:

```
Update barqueiro environment variable DATABASE_SSL to "true"
```

### 5. Alta CPU ou Memória

```
What was the memory usage for barqueiro in the last 6 hours?
```

```
Show CPU spikes for barqueiro today
```

```
Compare CPU usage between yesterday and today for barqueiro
```

## 📊 Monitoramento Contínuo

### Ver Status Geral

```
Show me an overview of all my Render services
```

### Verificar Deploys

```
List deploy history for barqueiro
```

```
Show details of the last deploy for barqueiro
```

### Análise de Performance

```
What was barqueiro's response time in the last hour?
```

```
Show response count by status code for barqueiro today
```

```
What's the outbound bandwidth usage for barqueiro this week?
```

## 🛠️ Troubleshooting com MCP

### Workflow Típico de Debug

1. **Ver logs recentes**:

   ```
   Show the last 200 logs for barqueiro
   ```

2. **Filtrar por erros**:

   ```
   Show error-level logs for barqueiro in the last hour
   ```

3. **Verificar variáveis de ambiente**:

   ```
   List environment variables for service barqueiro
   ```

4. **Checar database**:

   ```
   Show connection string for database barqueiro-db
   ```

   ```
   Query barqueiro-db: SELECT version()
   ```

5. **Ver métricas**:
   ```
   Show CPU and memory usage for barqueiro in the last 30 minutes
   ```

### Queries SQL Úteis

```sql
-- Ver tabelas existentes
SELECT
  tablename
FROM
  pg_tables
WHERE
  schemaname = 'public'
ORDER BY
  tablename
  -- Contar registros em cada tabela
SELECT
  (
    SELECT
      COUNT(*)
    FROM
      xp
  ) as xp_count,
  (
    SELECT
      COUNT(*)
    FROM
      rank_roles
  ) as rank_roles_count,
  (
    SELECT
      COUNT(*)
    FROM
      channel_config
  ) as channel_config_count
  -- Ver versão do PostgreSQL
SELECT
  version ()
  -- Ver hora do servidor
SELECT
  NOW ()
  -- Top 10 usuários por XP
SELECT
  user_id,
  xp,
  level
FROM
  xp
ORDER BY
  xp DESC
LIMIT
  10
```

Use com:

```
Query barqueiro-db: [SUA_QUERY_AQUI]
```

## 🎯 Prompts Avançados

### Análise Combinada

```
Check if barqueiro is healthy: show recent error logs, CPU usage, and verify database connectivity
```

```
Debug why barqueiro isn't responding: check logs, metrics, and database status
```

### Comparações

```
Compare barqueiro's performance today vs yesterday
```

```
Show me the difference in error rates between last week and this week for barqueiro
```

### Criação de Recursos

```
Create a new database named barqueiro-staging with 1 GB storage
```

⚠️ Note que o MCP **não cria instâncias free**, apenas paid plans.

## ⚠️ Limitações

- **Read-only SQL**: Apenas SELECT permitido via MCP
- **Modificações limitadas**: Só pode alterar variáveis de ambiente
- **Sem deploys**: Não pode triggerar deploys via MCP
- **Sem free tier**: Criação de recursos requer plans pagos

Para operações não suportadas, use:

- [Render Dashboard](https://dashboard.render.com)
- [Render REST API](https://api-docs.render.com/reference/introduction)

## 📚 Recursos

- [Render MCP Documentation](https://docs.render.com/mcp-server)
- [Render MCP GitHub](https://github.com/render-oss/render-mcp-server)
- [Cursor MCP Docs](https://docs.cursor.com/context/context-mcp)

## 🆘 Exemplos Práticos

### Debug: Bot não inicia

```
Set my Render workspace to barqueiro
Show the last 500 logs for service barqueiro
Filter those logs for "error" or "failed" or "crash"
Show me the deploy history for barqueiro
```

### Debug: Database vazio

```
Query barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public'
If no tables, check logs for "Schema PostgreSQL aplicado"
Show logs containing "initializeSchema" or "schema"
```

### Debug: Fallback para SQLite

```
Show logs for barqueiro containing "Using PostgreSQL" or "Using SQLite"
Check environment variable DATABASE_URL for service barqueiro
Show connection details for database barqueiro-db
Compare the DATABASE_URL with the database connection string
```

### Debug: SSL issues

```
Show error logs for barqueiro mentioning "SSL" or "ssl"
Check if DATABASE_SSL environment variable is set for barqueiro
Show me the DATABASE_URL format (mask the password)
```

---

**Dica**: Você pode combinar múltiplos comandos em um único prompt para análise mais eficiente!
