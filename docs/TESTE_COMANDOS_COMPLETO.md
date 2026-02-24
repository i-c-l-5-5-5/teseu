# 🧪 Guia de Teste Completo - Comandos do Barqueiro

## ✅ Status do Banco de Dados

**Banco PostgreSQL (Render):** ✅ Funcionando perfeitamente

- Conexão: ✅ Estabelecida
- SSL: ✅ Habilitado
- Schema: ✅ 9 tabelas criadas
- Operações: ✅ INSERT, UPDATE, DELETE testados

---

## 🎮 Testes de Comandos no Discord

### 1️⃣ Configuração de Canais XP

**Adicionar canal para XP:**

```
/config-canais xp adicionar canal:#seu-canal
```

**Listar canais XP:**

```
/config-canais xp listar
```

**Remover canal XP:**

```
/config-canais xp remover canal:#seu-canal
```

**Resultado esperado:**

- ✅ Mensagem de sucesso: "Configuração salva com sucesso"
- ✅ Dados salvos na tabela `channel_config`
- ❌ Se falhar: "erro ao salvar configurações"

---

### 2️⃣ Sistema de Ranking

**Ver ranking do servidor:**

```
/rank
```

**Ver perfil individual:**

```
/perfil @usuario
```

**Resultado esperado:**

- ✅ Embed com ranking dos usuários
- ✅ Informações de XP e level
- ❌ Se falhar: erro ao carregar dados

---

### 3️⃣ Comandos Admin

**Ver configurações:**

```
/admin config
```

**Configurar cargo de rank:**

```
/admin rank nivel:5 cargo:@cargo
```

**Resultado esperado:**

- ✅ Painel de admin com botões interativos
- ✅ Configurações salvas corretamente
- ❌ Se falhar: "componente expirado"

---

## 🔍 Como Monitorar os Testes

### Opção 1: Monitor em Tempo Real (Recomendado)

Em um terminal, execute:

```bash
chmod +x scripts/mcp/monitor-realtime.sh
bash scripts/mcp/monitor-realtime.sh
```

Isso mostrará:

- 📊 Estatísticas do banco atualizadas a cada 10 segundos
- 📜 Logs em tempo real do bot
- 💾 Confirmações de salvamento

Pressione `Ctrl+C` para parar.

### Opção 2: Verificação Manual

Após executar comandos no Discord, rode:

```bash
bash scripts/test-commands-mcp.sh
```

Isso mostrará:

- Total de configurações salvas
- Total de usuários com XP
- Rank roles configurados

---

## 🐛 Possíveis Problemas e Soluções

### "erro ao salvar configurações"

**Causa:** Bot não conseguiu conectar ao banco
**Solução:**

1. Verificar se DATABASE_URL está correto no Render
2. Verificar se DATABASE_SSL=true
3. Reiniciar o bot no Render Dashboard

### "componente expirado"

**Causa:** Interação demorou mais de 15 minutos ou bot reiniciou
**Solução:**

1. Execute o comando novamente
2. Se persistir, verificar logs do bot

### Comando não responde

**Causa:** Bot pode estar offline ou sem permissões
**Solução:**

1. Verificar status no Render Dashboard
2. Verificar permissões do bot no Discord
3. Ver logs: `bash scripts/mcp/check-render-status.sh`

---

## 📊 Consultas SQL Úteis

Para verificar dados diretamente no banco:

**Ver configurações de canais:**

```bash
node -e "const {Pool}=require('pg'); const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); pool.query('SELECT * FROM channel_config').then(r=>{console.log(r.rows); pool.end();})"
```

**Ver usuários com XP:**

```bash
node -e "const {Pool}=require('pg'); const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); pool.query('SELECT * FROM xp ORDER BY xp DESC LIMIT 10').then(r=>{console.log(r.rows); pool.end();})"
```

---

## ✨ Sequência de Testes Recomendada

1. **Inicie o monitor em tempo real** (terminal 1):

   ```bash
   bash scripts/mcp/monitor-realtime.sh
   ```

2. **Execute comandos no Discord** (na ordem):
   - `/config-canais xp adicionar canal:#general`
   - `/config-canais xp listar`
   - Envie mensagens no canal configurado para ganhar XP
   - `/rank`
   - `/perfil @voce`

3. **Observe o monitor** - deve mostrar:
   - Salvamentos de configuração
   - Atualizações de XP
   - Logs de comandos

4. **Verifique os dados**:
   ```bash
   bash scripts/mcp/test-commands-mcp.sh
   ```

---

## 🎯 Critérios de Sucesso

✅ **Tudo funcionando se:**

- Comandos respondem em < 3 segundos
- Configurações persistem após reiniciar o bot
- XP é salvo e atualizado corretamente
- Ranking exibe dados corretos
- Nenhum erro "componente expirado"

❌ **Há problemas se:**

- "erro ao salvar configurações" aparece
- Dados não persistem após reinício
- Comandos demoram > 10 segundos
- Erros de timeout na interação

---

## 📞 Comandos de Debug Disponíveis

```bash
# Status completo do bot
bash scripts/mcp/check-render-status.sh

# Teste de conectividade do banco
npm run db:diagnose

# Teste de operações no banco
node scripts/test-db-operations.mjs

# Monitor em tempo real
bash scripts/mcp/monitor-realtime.sh

# Estatísticas rápidas
bash scripts/mcp/test-commands-mcp.sh
```

---

## 💡 Próximos Passos

Após validar que tudo funciona:

1. ✅ Configurar canais de produção
2. ✅ Configurar rank roles
3. ✅ Habilitar quiz de perfil (se necessário)
4. ✅ Monitorar uso em produção
5. ✅ Aplicar RLS policies (opcional, para segurança extra)

---

**Última atualização:** 2 de dezembro de 2025
**Status do banco:** ✅ Operacional
**Deploy:** ✅ LIVE no Render
