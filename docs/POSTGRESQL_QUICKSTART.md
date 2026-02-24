# 🔐 PostgreSQL + RLS - Setup Rápido

## ⚡ Quick Start

### 1. Configure o Supabase

```bash
# 1. Crie um projeto em https://supabase.com
# 2. Copie a Connection String (Settings → Database)
# 3. Configure a variável de ambiente:

export DATABASE_URL="postgres://postgres.[ref]:[password]@...supabase.com:6543/postgres"
```

### 2. Aplique o Schema e RLS

```bash
# Opção A: Automático (recomendado)
npm start
# O schema será aplicado automaticamente na primeira conexão

# Opção B: Manual
npm run db:apply-rls
```

### 3. Deploy no Render

```bash
# No Render Dashboard:
# Environment → Add Environment Variable:
DATABASE_URL = sua-connection-string-do-supabase

# Ou use o render.yaml (já configurado):
git push origin main
# O Render criará automaticamente o PostgreSQL
```

## 🛡️ Segurança RLS

O sistema está configurado com Row Level Security:

- ✅ **Leitura pública**: XP, rankings, perfis
- 🔒 **Somente backend**: Configurações, respostas de quiz
- 🔐 **Service role**: Todas as operações de escrita

## 🔄 Fallback Automático

Se o PostgreSQL falhar:

- ✅ Bot continua funcionando
- ✅ SQLite assume automaticamente
- ✅ Nenhuma intervenção necessária
- ✅ Dados locais preservados

## 📝 Comandos Úteis

```bash
# Aplicar políticas RLS
npm run db:apply-rls

# Configurar PostgreSQL completo
npm run db:setup-postgres

# Backup SQLite local
npm run db:backup

# Testar configuração
npm start
```

## 📚 Documentação Completa

Veja [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) para detalhes completos.

## ✅ Checklist de Deploy

- [ ] Projeto Supabase criado
- [ ] Connection string copiada
- [ ] `DATABASE_URL` configurada no Render
- [ ] Schema aplicado (automático no primeiro start)
- [ ] RLS aplicado (opcional, mas recomendado)
- [ ] Bot testado e funcionando
- [ ] Logs verificados (deve mostrar "Usando PostgreSQL")

## 🆘 Problemas?

```bash
# Verificar logs
# Procure por:
[DB] Usando PostgreSQL  # ✅ OK
[DB] Usando SQLite      # ⚠️ Fallback ativo

# Testar conexão
psql $DATABASE_URL

# Ver detalhes
npm start 2>&1 | grep -E "\[DB\]|\[PostgreSQL\]|\[SQLite\]"
```
