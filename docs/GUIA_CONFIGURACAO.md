# Guia de Configuração do Bot Barqueiro

Este guia consolida todas as instruções para configurar e executar o bot Barqueiro corretamente.

## 1. Configuração Inicial

### 1.1 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Token do seu bot Discord
DISCORD_TOKEN="SEU_TOKEN_AQUI"

# ID do Cliente (Application ID) do seu bot
DISCORD_CLIENT_ID="SEU_CLIENT_ID_AQUI"

# ID do Servidor (Guild ID) para registro de comandos de teste (OPCIONAL)
# Se definido, os comandos serão registrados APENAS neste servidor
# Se deixado em branco, os comandos serão registrados globalmente (pode levar até 1 hora)
DISCORD_GUILD_ID="SEU_GUILD_ID_AQUI"
```

### 1.2 Instalação de Dependências

```bash
npm install
```

## 2. Registro de Comandos

### 2.1 Registrar Comandos (Uso Normal)

Compila o código e envia a lista de comandos para o Discord:

```bash
npm run bot:register-commands
```

### 2.2 Limpar Comandos (Correção de Problemas)

Se tiver problemas com comandos antigos ou inconsistências, limpe todos os comandos antes de registrá-los novamente:

```bash
npm run bot:clean-commands
npm run bot:register-commands
```

**Nota:** O script de limpeza aceita o argumento `--clean` para remover todos os comandos registrados.

## 3. Execução do Bot

### 3.1 Modo Produção

```bash
npm start
```

### 3.2 Modo Desenvolvimento

```bash
npm run dev:bot
```

## 4. Solução de Problemas Comuns

### Comandos não aparecem no Discord

1. Execute `npm run bot:clean-commands`
2. Execute `npm run bot:register-commands`
3. Aguarde alguns minutos (comandos globais podem levar até 1 hora)
4. Se estiver testando, use `DISCORD_GUILD_ID` para registro instantâneo no servidor

### Bot não responde

1. Verifique se o token está correto no `.env`
2. Verifique se o bot tem as permissões necessárias no servidor
3. Verifique os logs do console para erros

## 5. Estrutura do Banco de Dados

O bot usa SQLite. O arquivo do banco é criado automaticamente em `database/barqueiro.db`.

Para verificar o schema:

```bash
npm run db:check-schema
```

Para executar migrações:

```bash
npm run db:migrate
```

## 6. Testes

Execute os testes automatizados:

```bash
npm test
```

## 7. Recursos Adicionais

- **Documentação do Painel Admin**: Ver `docs/PAINEL_ADMIN.md`
- **Arquitetura**: Ver `docs/ARQUITETURA-INTERFACES-INTERATIVAS.md`
- **Análise do Banco**: Ver `docs/ANALISE-BANCO-DADOS.md`
