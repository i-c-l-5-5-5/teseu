# Guia Rápido: Debug do PostgreSQL na Render

Este guia mostra como usar o MCP da Render para debugar problemas de conexão com o PostgreSQL.

## 🎯 Setup Rápido (1 minuto)

1. **Criar API Key**:
   - Acesse: https://dashboard.render.com/account/settings
   - Role até "API Keys" → "Create API Key"
   - Nome: "MCP Debug"
   - Copie a chave

2. **Configurar Cursor**:

   ```bash
   # Copie o template
   cp docs/cursor-mcp-template.json ~/.cursor/mcp.json

   # Edite e substitua <SUA_RENDER_API_KEY_AQUI> pela sua chave
   nano ~/.cursor/mcp.json
   ```

3. **Reinicie o Cursor**

## 🔍 Debug em 3 Passos

### Passo 1: Definir Workspace

No chat do Cursor, digite:

```
Set my Render workspace to barqueiro
```

### Passo 2: Verificar Serviços e Database

```
List my Render services and databases
```

### Passo 3: Diagnosticar

#### Ver logs do bot:

```
Show the last 200 logs for barqueiro containing "PostgreSQL" or "Database" or "SQLite"
```

#### Verificar se as tabelas existem:

```
Query barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
```

#### Ver variáveis de ambiente:

```
Show environment variables for barqueiro (mask sensitive values)
```

## 🐛 Diagnósticos Comuns

### Bot usando SQLite em vez de PostgreSQL?

```
Show logs for barqueiro containing "fallback" or "SQLite" in the last 24 hours
```

**Causas possíveis**:

- DATABASE_URL não está configurada
- DATABASE_URL está incorreta
- Database não está acessível

**Verificar**:

```
Check if DATABASE_URL environment variable is set for service barqueiro
Show connection details for database barqueiro-db
```

### Schema não aplicado (tabelas vazias)?

```
Query barqueiro-db: SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'
```

Se retornar 0:

```
Show logs for barqueiro containing "Schema" or "initializeSchema"
```

**Causas possíveis**:

- Bot nunca conectou ao PostgreSQL
- Erro ao aplicar schema
- Caiu no fallback antes de aplicar

### Erros de SSL?

```
Show error logs for barqueiro containing "SSL" or "ssl" in the last hour
```

**Solução**:

```
What is the value of DATABASE_SSL for service barqueiro?
```

Se não estiver definido e você vê erros SSL:

```
Update environment variable DATABASE_SSL to "true" for service barqueiro
```

## 🎯 Comando All-in-One

Para fazer um diagnóstico completo:

```
Debug barqueiro PostgreSQL connection:
1. Show last 100 logs filtering for "PostgreSQL", "Database", "SSL", or "error"
2. Query barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public'
3. Check environment variables DATABASE_URL and DATABASE_SSL
4. Show connection details for barqueiro-db
5. Show CPU and memory usage for the last hour
```

## 📊 Queries SQL Úteis

### Ver todas as tabelas:

```
Query barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
```

### Contar registros:

```
Query barqueiro-db: SELECT
  (SELECT COUNT(*) FROM xp) as usuarios,
  (SELECT COUNT(*) FROM channel_config) as canais,
  (SELECT COUNT(*) FROM quiz_configs) as quizzes
```

### Ver versão PostgreSQL:

```
Query barqueiro-db: SELECT version()
```

### Verificar conectividade:

```
Query barqueiro-db: SELECT NOW() as server_time, current_database() as db_name
```

## 🔄 Workflow de Debug Completo

1. **Ver status geral**:

   ```
   Show overview of service barqueiro and database barqueiro-db
   ```

2. **Verificar logs recentes**:

   ```
   Show last 500 logs for barqueiro
   ```

3. **Filtrar erros**:

   ```
   From those logs, show only error and warning level messages
   ```

4. **Verificar database**:

   ```
   Query barqueiro-db: SELECT tablename FROM pg_tables WHERE schemaname = 'public'
   ```

5. **Comparar DATABASE_URL**:

   ```
   Show DATABASE_URL for barqueiro (mask password)
   Show internal connection string for barqueiro-db (mask password)
   Are they the same host and database?
   ```

6. **Ver métricas**:
   ```
   Show CPU, memory, and connection count for barqueiro-db in the last hour
   ```

## 🆘 Troubleshooting Específico

### "Pool de conexões criado" mas sem "Schema aplicado"

```
Show logs between "Pool de conexões criado" and 2 minutes after that timestamp
Filter for "schema" or "error" or "fail"
```

### Bot reiniciando constantemente

```
Show deployment history for barqueiro
Show error logs for each deploy
Check memory usage spikes
```

### DATABASE_URL parece correta mas não conecta

```
Compare:
1. DATABASE_URL value for service barqueiro
2. Internal connection string for barqueiro-db
Show any differences in host, port, or database name
```

## 📚 Documentação Completa

Para referência completa, veja:

- [docs/RENDER_MCP_DEBUG.md](./RENDER_MCP_DEBUG.md) - Guia completo do MCP
- [docs/POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) - Setup PostgreSQL/Supabase

## 💡 Dicas

- Use prompts em linguagem natural - o MCP é inteligente!
- Combine múltiplas ações em um único prompt
- Peça comparações e análises, não apenas dados brutos
- Use "mask sensitive values" para proteger senhas nos logs

---

**Exemplo de sessão de debug bem-sucedida**:

```
1. Set my Render workspace to barqueiro
2. Show me the current status of barqueiro service and barqueiro-db database
3. Show the last 100 logs for barqueiro containing database-related keywords
4. Query barqueiro-db to list all tables
5. If tables exist, show me a count of records in each table
6. If no tables, show me logs containing "schema" from the last deploy
```
