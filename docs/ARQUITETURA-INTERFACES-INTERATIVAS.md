# 🎯 Arquitetura de Interfaces Interativas - Bot Discord

## 📋 Visão Geral

Todo o bot agora segue uma **arquitetura padronizada** de interfaces interativas, onde comandos administrativos e de visualização oferecem botões, menus e modais para melhor experiência do usuário.

## 🏗️ Padrão Arquitetural

### Componentes Principais

1. **ActionRowBuilder + ButtonBuilder**
   - Botões para ações rápidas (Atualizar, Publicar, Configurar, etc.)
   - Máximo de 5 botões por linha
   - Estilos: Primary, Secondary, Success, Danger

2. **StringSelectMenuBuilder**
   - Seleção de canais, opções e configurações
   - Suporta múltipla seleção (minValues/maxValues)
   - Máximo de 25 opções por menu

3. **ModalBuilder + TextInputBuilder**
   - Entrada de texto multilinha
   - Formulários estruturados
   - Validação de dados

4. **ComponentCollector**
   - **SEM timeout** (padrão de bots Discord modernos)
   - Validação de usuário (apenas quem iniciou pode interagir)
   - Collectors persistentes que não expiram

5. **EmbedBuilder**
   - Preview em tempo real
   - Feedback visual das ações
   - Informações estruturadas

## 📊 Status dos Comandos

### ✅ Comandos com Interface Completa

| Comando                 | Funcionalidades Interativas                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `/config-canais`        | Menu de canais, botões de configuração XP/Comandos, preview em tempo real |
| `/embed`                | Modal builder, preview, seleção de canal, editor de campos                |
| `/publicar-quiz-perfil` | Setup inicial, preview, toggle ativar/desativar, seleção de canal         |
| `/publicar-quiz`        | Preview, estatísticas, seleção de canal, confirmação visual               |
| `/debug`                | Refresh, limpar cooldowns, garbage collect, estatísticas ao vivo          |
| `/rank`                 | Refresh, ver perfil, top 10, barra de progresso                           |
| `/perfil`               | Ver rank, atualizar, editar (se próprio usuário)                          |

### 📝 Comandos Simples (Sem Necessidade de Interface)

| Comando      | Função                         |
| ------------ | ------------------------------ |
| `/ping`      | Teste de conectividade         |
| `/server-id` | Retorna ID do servidor (admin) |

## 🎨 Padrões de Implementação

### Template Base

```typescript
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";

export async function handleComando(interaction: ChatInputCommandInteraction) {
  // 1. Validações iniciais
  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ Use em servidor.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. Defer reply se necessário
  await interaction.deferReply({ ephemeral: true });

  // 3. Função para gerar embed (permite refresh)
  const gerarEmbed = () => {
    return new EmbedBuilder()
      .setTitle("🎯 Título")
      .setDescription("Descrição")
      .setColor("#5865F2")
      .setTimestamp();
  };

  // 4. Botões de ação
  const botoes = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("acao_1")
      .setLabel("Ação 1")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔄"),
    new ButtonBuilder()
      .setCustomId("acao_2")
      .setLabel("Ação 2")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⚙️"),
  );

  // 5. Enviar resposta com componentes
  const response = await interaction.editReply({
    embeds: [gerarEmbed()],
    components: [botoes],
  });

  // 6. Coletor de interações (sem timeout)
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
  });

  // 7. Handler de interações
  collector.on("collect", async (i) => {
    // Validar usuário
    if (i.user.id !== interaction.user.id) {
      await i.reply({
        content: "❌ Apenas quem iniciou pode interagir.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Processar ação
    if (i.customId === "acao_1") {
      await i.deferUpdate();
      // ... lógica
      await i.editReply({ embeds: [gerarEmbed()], components: [botoes] });
    }
  });

  // 8. Handler de fim (opcional - collectors persistentes não expiram automaticamente)
  collector.on("end", async () => {
    try {
      // Pode adicionar botão de refresh se necessário
      const refreshRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("refresh")
          .setLabel("Atualizar")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔄"),
      );
      await interaction.editReply({ components: [refreshRow] }).catch(() => {});
    } catch {
      // Mensagem deletada
    }
  });
}
```

### Padrão de Seleção de Canal

```typescript
const canais = interaction.guild.channels.cache.filter(
  (c) => c.type === ChannelType.GuildText,
);

const menu = new StringSelectMenuBuilder()
  .setCustomId("menu_canal")
  .setPlaceholder("Escolha o canal")
  .addOptions(
    Array.from(canais.values())
      .slice(0, 25)
      .map((canal) => ({
        label: canal.name,
        value: canal.id,
        description: `Publicar em #${canal.name}`,
        default: canal.id === targetChannelId,
      })),
  );

const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
```

### Padrão de Modal

```typescript
const modal = new ModalBuilder()
  .setCustomId("modal_form")
  .setTitle("Título do Modal");

const input = new TextInputBuilder()
  .setCustomId("campo")
  .setLabel("Label do Campo")
  .setStyle(TextInputStyle.Paragraph)
  .setPlaceholder("Digite aqui...")
  .setRequired(true);

const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
modal.addComponents(row);

await interaction.showModal(modal);
```

## 🎯 Benefícios

1. **UX Consistente**: Todos os comandos seguem o mesmo padrão
2. **Redução de Erros**: Menos digitação manual de parâmetros
3. **Feedback Visual**: Preview em tempo real das ações
4. **Descoberta Natural**: Usuários descobrem funcionalidades pelos botões
5. **Manutenibilidade**: Código padronizado e fácil de estender

## 🔧 Boas Práticas

1. ✅ Sempre validar `i.user.id !== interaction.user.id`
2. ✅ Usar `MessageFlags.Ephemeral` para comandos admin
3. ✅ **NÃO usar timeout nos collectors** (padrão moderno de bots Discord)
4. ✅ Collectors persistentes evitam erros de "componente expirado"
5. ✅ Usar `deferUpdate()` antes de operações longas
6. ✅ Criar função `gerarEmbed()` para permitir refresh
7. ✅ Adicionar emojis nos botões para melhor visual
8. ✅ Usar `.setTimestamp()` nos embeds para feedback temporal
9. ✅ Adicionar botão de refresh no evento `on('end')` se necessário

## 🚀 Próximos Passos

- [ ] Implementar sistema de leaderboard (top 10) no `/rank`
- [ ] Adicionar paginação para listas longas
- [ ] Criar sistema de ajuda contextual nos botões
- [ ] Implementar cache para operações frequentes
- [ ] Adicionar analytics de uso dos componentes

## 📚 Referências

- [Discord.js Guide - Buttons](https://discordjs.guide/message-components/buttons.html)
- [Discord.js Guide - Select Menus](https://discordjs.guide/message-components/select-menus.html)
- [Discord.js Guide - Modals](https://discordjs.guide/interactions/modals.html)
- [Discord API - Message Components](https://discord.com/developers/docs/interactions/message-components)
