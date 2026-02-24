/*
SPDX-License-Identifier: MIT
*/
import type {
  CommandContext,
  CommandHandler,
  CommandRegistry,
  ComponentHandler,
  EventHandler,
  SlashCommand,
} from "@barqueiro/types";
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  StringSelectMenuInteraction,
} from "discord.js";
import { PermissionFlagsBits } from "discord.js";

/**
 * Registry centralizado para comandos, componentes e eventos do bot.
 * Responsável por:
 * - Registrar e descadastrar comandos (Slash), componentes interativos e eventos
 * - Aplicar validações de permissão básica (adminOnly)
 * - Gerenciar cooldown per-user por comando
 * - Executar handlers encapsulando tratamento de erro e replay seguro (reply/editReply)
 * - Expor estatísticas para diagnóstico / painéis
 *
 * @remarks
 * Preferimos Map para O(1) por nome/ID. Cooldowns são limpos via setTimeout simples;
 * caso o volume cresça, considerar estrutura baseada em min-heap para expiração eficiente.
 */
class BotRegistry implements CommandRegistry {
  public commands = new Map<string, CommandHandler>();
  public components = new Map<string, ComponentHandler>();
  public events = new Map<string, EventHandler>();
  private readonly cooldowns = new Map<string, number>();

  /**
   * Registra um item dinamicamente (deduz tipo via shape).
   * @param item SlashCommand | ComponentHandler | EventHandler
   * @example
   * register({ data: new SlashCommandBuilder().setName('ping'), handler })
   */
  public register(item: SlashCommand | ComponentHandler | EventHandler): void {
    if ("data" in item && "handler" in item) {
      // É um SlashCommand
      this.commands.set(item.data.name, item.handler);
    } else if ("customId" in item && "type" in item) {
      // É um ComponentHandler
      const id =
        typeof item.customId === "string"
          ? item.customId
          : item.customId.source;
      this.components.set(id, item);
    } else if ("name" in item && "execute" in item) {
      // É um EventHandler
      this.events.set(item.name, item);
    }
  }

  /**
   * Remove item previamente registrado.
   * @param name Nome do comando / customId / nome do evento
   * @param type Tipo do registro
   */
  public unregister(
    name: string,
    type: "command" | "component" | "event",
  ): void {
    switch (type) {
      case "command":
        this.commands.delete(name);
        break;
      case "component":
        this.components.delete(name);
        break;
      case "event":
        this.events.delete(name);
        break;
    }
  }

  /**
   * Executa comando aplicando verificação de permissão e cooldown.
   * @param commandName nome do comando
   * @param interaction interação Slash original
   */
  public async executeCommand(
    commandName: string,
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const handler = this.commands.get(commandName);
    if (!handler) {
      await interaction.reply({
        content: "❌ Comando não encontrado ou desabilitado.",
        ephemeral: true,
      });
      return;
    }

    const context = this.createCommandContext(interaction);

    // Verificar permissões
    if (!this.checkPermissions(handler, context)) {
      await interaction.reply({
        content: "🔒 Você não tem permissão para usar este comando.",
        ephemeral: true,
      });
      return;
    }

    // Verificar cooldown
    if (!this.checkCooldown(handler, context.userId)) {
      const remaining = this.getRemainingCooldown(handler, context.userId);
      await interaction.reply({
        content: `⏱️ Aguarde **${remaining}s** antes de usar este comando novamente.`,
        ephemeral: true,
      });
      return;
    }

    try {
      // Aplicar cooldown
      this.applyCooldown(handler, context.userId);

      // Executar comando
      await handler.execute(interaction);
    } catch (error) {
      console.error(`Erro ao executar comando ${commandName}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      const replyOptions = {
        content: `Erro ao executar comando: ${errorMessage}`,
        ephemeral: true,
      };

      await (interaction.replied || interaction.deferred
        ? interaction.editReply(replyOptions)
        : interaction.reply(replyOptions));
    }
  }

  /**
   * Executa componente (botão ou select), suporta customId exato ou regex.
   * @param interaction Interação de botão ou select menu
   */
  public async executeComponent(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
  ): Promise<void> {
    const { customId } = interaction;

    // Procurar por match exato primeiro
    let handler = this.components.get(customId);

    // Se não encontrar, procurar por regex
    if (!handler) {
      for (const [_key, comp] of this.components) {
        if (comp.customId instanceof RegExp && comp.customId.test(customId)) {
          handler = comp;
          break;
        }
      }
    }

    if (!handler) {
      await interaction.reply({
        content: "❌ Componente não encontrado ou expirado.",
        ephemeral: true,
      });
      return;
    }

    try {
      await handler.execute(interaction);
    } catch (error) {
      console.error(`Erro ao executar componente ${customId}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      const replyOptions = {
        content: `Erro no componente: ${errorMessage}`,
        ephemeral: true,
      };

      await (interaction.replied || interaction.deferred
        ? interaction.editReply(replyOptions)
        : interaction.reply(replyOptions));
    }
  }

  /**
   * Registra eventos no cliente Discord (on/once conforme flag do handler).
   * @param client Instância do Discord.js Client
   */
  public registerEvents(client: Client): void {
    for (const [name, handler] of this.events) {
      const runner = async (...args: unknown[]) =>
        handler.execute(client, ...args);
      (handler.once
        ? (
            client as Client & {
              once: (event: string, fn: (...a: unknown[]) => void) => void;
            }
          ).once
        : (
            client as Client & {
              on: (event: string, fn: (...a: unknown[]) => void) => void;
            }
          ).on
      ).call(client as never, name as unknown as string, runner);
    }
  }

  /**
   * Cria contexto simples (guildId, userId, isAdmin) para validações e handlers.
   * @param interaction Interação do comando
   */
  private createCommandContext(
    interaction: ChatInputCommandInteraction,
  ): CommandContext {
    const isAdmin =
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
      false;

    return {
      interaction,
      guildId: interaction.guildId,
      userId: interaction.user.id,
      isAdmin,
    };
  }

  /**
   * Verifica permissões (atualmente apenas adminOnly). Pode ser expandido para bitfield.
   * @param handler Handler do comando
   * @param context Contexto derivado da interação
   */
  private checkPermissions(
    handler: CommandHandler,
    context: CommandContext,
  ): boolean {
    return !handler.adminOnly || context.isAdmin;
  }

  /**
   * Retorna true se o usuário pode executar (cooldown expirado ou inexistente).
   * @param handler Handler do comando
   * @param userId ID do usuário
   */
  private checkCooldown(handler: CommandHandler, userId: string): boolean {
    if (!handler.cooldown) return true;

    const cooldownKey = `${handler.name}:${userId}`;
    const expireTime = this.cooldowns.get(cooldownKey);

    if (!expireTime) return true;

    return Date.now() > expireTime;
  }

  /**
   * Registra cooldown per-user e agenda limpeza após expiração.
   * @param handler Handler do comando
   * @param userId ID do usuário
   */
  private applyCooldown(handler: CommandHandler, userId: string): void {
    if (!handler.cooldown) return;

    const cooldownKey = `${handler.name}:${userId}`;
    const expireTime = Date.now() + handler.cooldown * 1000;

    this.cooldowns.set(cooldownKey, expireTime);

    // Limpar cooldown automaticamente
    setTimeout(() => {
      this.cooldowns.delete(cooldownKey);
    }, handler.cooldown * 1000);
  }

  /**
   * Retorna segundos restantes de cooldown.
   * @param handler Handler do comando
   * @param userId ID do usuário
   */
  private getRemainingCooldown(
    handler: CommandHandler,
    userId: string,
  ): number {
    if (!handler.cooldown) return 0;

    const cooldownKey = `${handler.name}:${userId}`;
    const expireTime = this.cooldowns.get(cooldownKey);

    if (!expireTime) return 0;

    return Math.ceil((expireTime - Date.now()) / 1000);
  }

  /**
   * Limpa todos os cooldowns (diagnóstico / reset global).
   */
  public clearCooldowns(): void {
    this.cooldowns.clear();
  }

  /**
   * Estatísticas do estado atual (tamanhos e nomes) para monitoramento.
   */
  public getStats() {
    return {
      commands: this.commands.size,
      components: this.components.size,
      events: this.events.size,
      activeCooldowns: this.cooldowns.size,
      commandNames: Array.from(this.commands.keys()),
      componentIds: Array.from(this.components.keys()),
      eventNames: Array.from(this.events.keys()),
    };
  }

  /**
   * Verifica se comando existe.
   */
  public hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Verifica se componente existe.
   */
  public hasComponent(customId: string): boolean {
    return this.components.has(customId);
  }
}

// Instância singleton do registry
export const botRegistry = new BotRegistry();

// Utilitários para facilitar o uso
export const registerCommand = (command: SlashCommand) =>
  botRegistry.register(command);
export const registerComponent = (component: ComponentHandler) =>
  botRegistry.register(component);
export const registerEvent = (event: EventHandler) =>
  botRegistry.register(event);
