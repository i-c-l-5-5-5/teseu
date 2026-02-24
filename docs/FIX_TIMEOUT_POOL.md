# 🔧 Fix: Bot Para de Responder Após 3 Comandos

## 🐛 Problema Identificado

**Sintoma:** Bot para de responder comandos após executar ~3 comandos slash no Discord.

**Causa Raiz:** Pool de conexões PostgreSQL esgotando suas conexões disponíveis.

### Análise Técnica

1. **Pool pequeno**: Configurado com apenas 10 conexões máximas
2. **Timeout curto**: ConnectionTimeout de apenas 5 segundos
3. **Sem monitoramento**: Não havia logs de conexões do pool
4. **Sem timeout em queries**: Queries lentas podiam bloquear conexões indefinidamente

---

## ✅ Correções Implementadas

### 1. Otimização do Pool PostgreSQL

**Arquivo:** `src/storage/postgres.ts`

**Antes:**

```typescript
const baseConfig = {
  connectionString,
  connectionTimeoutMillis: 5000, // 5s
  idleTimeoutMillis: 30000, // 30s
  max: 10, // Apenas 10 conexões
};
```

**Depois:**

```typescript
const baseConfig = {
  connectionString,
  connectionTimeoutMillis: 10000, // 10s (dobrado)
  idleTimeoutMillis: 30000, // 30s (mantido)
  max: 20, // 20 conexões (dobrado)
  min: 2, // Mínimo de 2 conexões mantidas
  allowExitOnIdle: false, // Não sair se idle
  maxUses: 7500, // Reciclar conexões após muitos usos
};
```

### 2. Monitoramento do Pool

Adicionados eventos de log para rastrear conexões:

```typescript
pool.on("connect", () => {
  console.log("[PostgreSQL] Nova conexão estabelecida no pool");
});

pool.on("remove", () => {
  console.log("[PostgreSQL] Conexão removida do pool");
});
```

### 3. Timeout em Queries

Adicionado timeout de 5 segundos para queries + logging de queries lentas:

```typescript
export async function query(text: string, params?: unknown[]) {
  const startTime = Date.now();
  const client = await dbPool.connect();

  try {
    // Timeout de 5s
    const result = await Promise.race([
      client.query(text, params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout após 5s")), 5000),
      ),
    ]);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[PostgreSQL] Query lenta (${duration}ms)`);
    }

    return result;
  } finally {
    client.release(); // SEMPRE libera
  }
}
```

---

## 🧪 Como Testar

### 1. Fazer Deploy das Alterações

```bash
# Build local
npm run build

# Commit e push para deploy automático no Render
git add .
git commit -m "fix: otimizar pool PostgreSQL para prevenir timeout"
git push
```

### 2. Monitorar Logs em Tempo Real

```bash
# Terminal 1: Monitor de logs
npm run mcp:monitor

# Terminal 2: Dashboard
watch -n 5 'npm run mcp:dashboard'
```

### 3. Executar Comandos no Discord

Execute **5-10 comandos consecutivos** no Discord:

```
/config-canais xp listar
/config-canais xp adicionar canal:#general
/config-canais xp listar
/rank
/perfil
/config-canais xp remover canal:#general
/config-canais xp listar
```

### 4. Verificar Comportamento

**✅ Sucesso se:**

- Todos os comandos respondem em < 3 segundos
- Nenhum erro "componente expirado"
- Logs mostram conexões sendo criadas/liberadas corretamente
- Dashboard mostra dados sendo salvos

**❌ Ainda há problema se:**

- Bot para de responder após alguns comandos
- Erros de timeout aparecem nos logs
- Queries demoram > 5 segundos

---

## 📊 Monitoramento de Conexões

### Ver Conexões Ativas no PostgreSQL

```sql
SELECT
  count(*) as total_conexoes,
  count(*) FILTER (
    WHERE
      state = 'active'
  ) as ativas,
  count(*) FILTER (
    WHERE
      state = 'idle'
  ) as idle
FROM
  pg_stat_activity
WHERE
  datname = 'barqueiro_wx6k';
```

Execute via script:

```bash
node -e "
const {Pool} = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(\`
  SELECT
    count(*) as total_conexoes,
    count(*) FILTER (WHERE state = 'active') as ativas,
    count(*) FILTER (WHERE state = 'idle') as idle
  FROM pg_stat_activity
  WHERE datname = 'barqueiro_wx6k'
\`).then(r => {
  console.log('Conexões:', r.rows[0]);
  pool.end();
});
"
```

---

## 🔍 Diagnóstico Adicional

### Se o problema persistir:

1. **Verificar queries lentas:**

   ```bash
   # Nos logs, procure por:
   [PostgreSQL] Query lenta (XXXms)
   ```

2. **Verificar pool esgotado:**

   ```bash
   # Logs devem mostrar:
   [PostgreSQL] Nova conexão estabelecida no pool
   [PostgreSQL] Conexão removida do pool
   ```

3. **Verificar timeout de conexão:**
   ```bash
   # Se aparecer erro:
   TimeoutError: ResourceRequest timed out
   # Significa que pool está esgotado
   ```

### Ajustes Adicionais (se necessário)

Se ainda houver problemas, aumente ainda mais:

```typescript
// src/storage/postgres.ts
max: 30,                    // Aumentar para 30
connectionTimeoutMillis: 15000,  // Aumentar para 15s
```

---

## 📈 Métricas Esperadas

### Pool Saudável:

- 📊 **Total de conexões:** 2-20 (flutuante)
- ⚡ **Tempo médio de query:** < 100ms
- 🔄 **Reutilização de conexões:** Alta (muitas queries, poucas conexões novas)
- ⏱️ **Tempo de resposta:** < 3 segundos

### Pool com Problemas:

- ❌ **Total de conexões:** Sempre no máximo (20/20)
- 🐌 **Tempo médio de query:** > 1000ms
- 🆕 **Conexões novas constantes:** Muitas criações/remoções
- ⏱️ **Timeout:** Comandos falhando após 3 segundos

---

## 🚀 Deploy e Validação

### Checklist de Deploy:

- [ ] Build local sem erros (`npm run build`)
- [ ] Commit e push para GitHub
- [ ] Aguardar deploy no Render (2-3 minutos)
- [ ] Verificar logs: `npm run mcp:status`
- [ ] Testar comandos no Discord (5-10 comandos)
- [ ] Verificar dashboard: `npm run mcp:dashboard`
- [ ] Confirmar que dados persistem
- [ ] Monitorar por 5-10 minutos

### Comandos de Monitoramento:

```bash
# Status completo
npm run mcp:dashboard

# Logs em tempo real
npm run mcp:monitor

# Status do serviço
npm run mcp:status

# Suite de testes
npm run mcp:test-all
```

---

## 📝 Notas Técnicas

### Por que o pool esgotava?

1. **Comandos simultâneos:** Discord permite múltiplos comandos rapidamente
2. **Operações assíncronas:** Cada comando pode fazer múltiplas queries
3. **Coletores de componentes:** Buttons/SelectMenus mantêm conexões abertas
4. **Timeouts longos:** Coletores ficam ativos por 15 minutos (padrão Discord)

### Solução Implementada:

1. ✅ **Pool maior:** Mais conexões disponíveis (20 vs 10)
2. ✅ **Timeout maior:** Mais tempo para conectar (10s vs 5s)
3. ✅ **Queries com timeout:** Evita queries lentas travando conexões
4. ✅ **Logging:** Visibilidade do comportamento do pool
5. ✅ **Min connections:** Pool sempre tem conexões prontas (2 mínimo)

---

**Data da correção:** 2 de dezembro de 2025  
**Versão:** 0.1.0  
**Status:** ✅ Implementado, aguardando validação em produção
