import {
  finalizePerfilQuiz,
  getPerfilQuizPreview,
  getPerfilQuizProgress,
} from "@services/perfil-quiz.js";
import type { ButtonInteraction, Message, User } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import {
  clearPerfilQuizSession,
  getPerfilQuizConfig,
  getPerfilQuizSession,
  isPerfilQuizReady,
  type PerfilQuizSession,
  startPerfilQuizSession,
} from "@/storage/perfil-quiz.js";

/**
 * Handler do fluxo interativo do Quiz de Perfil.
 * Responsável por:
 * - Iniciar sessão de quiz por usuário/guild
 * - Renderizar questões como botões (paginadas)
 * - Consolidar respostas e chamar serviço de processamento
 * - Exibir resultado final em embed
 *
 * Segurança:
 * - Valida interação para garantir que apenas o dono da sessão avance ou cancele
 * - Usa customId estruturado: `perfil_quiz_<userId>_<questionIndex>_<answerIndex>`
 *
 * @remarks
 * Limites: máximo 5 botões por linha (Discord UI) e label truncado em 80 chars.
 * O resultado final depende da lógica em `processPerfilQuizResults` (serviço).
 */

/**
 * Inicia uma sessão de quiz para o usuário, validando canal e sessão existente.
 * @param message Mensagem de invocação (ex: comando textual)
 * @param user Usuário alvo (geralmente autor da mensagem)
 */
export async function startPerfilQuiz(
  message: Message,
  user: User,
): Promise<void> {
  try {
    if (!message.guild) return;

    // Verificar se o quiz está configurado e ativo
    const isReady = await isPerfilQuizReady();
    if (!isReady) {
      await message.reply({
        content:
          "❌ O quiz de perfil não está configurado ou ativo no momento.",
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    const config = await getPerfilQuizConfig();

    // Verificar se estamos no canal correto
    if (config.channelId && message.channel.id !== config.channelId) {
      await message.reply({
        content: `❌ O quiz de perfil só pode ser iniciado em <#${config.channelId}>.`,
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // Verificar se o usuário já tem um quiz em andamento
    const existingSession = await getPerfilQuizSession(
      user.id,
      message.guild.id,
    );
    if (existingSession) {
      await message.reply({
        content:
          "⚠️ Você já tem um quiz de perfil em andamento. Use os botões da mensagem anterior para continuar.",
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // Iniciar nova sessão
    const session = await startPerfilQuizSession(user.id, message.guild.id);
    await sendPerfilQuizQuestion(message, session);
  } catch (error) {
    console.error("Erro ao iniciar quiz de perfil:", error);
    await message
      .reply({
        content: "❌ Erro ao iniciar o quiz de perfil.",
        allowedMentions: { repliedUser: false },
      })
      .catch(() => {});
  }
}

/**
 * Envia questão corrente do quiz como embed + botões.
 * Avança para processamento final se não houver mais perguntas.
 */
async function sendPerfilQuizQuestion(
  message: Message,
  session: PerfilQuizSession,
): Promise<void> {
  try {
    const config = await getPerfilQuizConfig();
    const question = config.questions[session.currentQuestion];

    if (!question) {
      // Quiz finalizado
      await finalizePerfilQuiz(session);
      return;
    }

    const progress = await getPerfilQuizProgress(session);
    const preview = await getPerfilQuizPreview(session);

    const embed = new EmbedBuilder()
      .setTitle("🎯 Quiz de Perfil")
      .setDescription(question.text)
      .addFields([
        {
          name: "Progresso",
          value: `${progress}% (${session.currentQuestion + 1}/${config.questions.length})`,
          inline: true,
        },
        {
          name: "Tendência Atual",
          value: `${preview.topResult} (${preview.confidence}% confiança)`,
          inline: true,
        },
      ])
      .setColor("#5865F2")
      .setFooter({
        text: `Pergunta ${session.currentQuestion + 1} de ${config.questions.length}`,
      });

    // Criar botões para as respostas (máximo 5 por linha, máximo 25 total)
    const components: Array<ActionRowBuilder<ButtonBuilder>> = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    question.answers.forEach((answer, index) => {
      if (index > 0 && index % 5 === 0) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }

      const button = new ButtonBuilder()
        .setCustomId(
          `perfil_quiz_${session.userId}_${session.currentQuestion}_${index}`,
        )
        .setLabel(answer.text.substring(0, 80)) // Limitar tamanho do label
        .setStyle(ButtonStyle.Primary);

      currentRow.addComponents(button);
    });

    if (currentRow.components.length > 0) {
      components.push(currentRow);
    }

    // Adicionar botão de cancelar
    const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`perfil_quiz_cancel_${session.userId}`)
        .setLabel("❌ Cancelar Quiz")
        .setStyle(ButtonStyle.Danger),
    );

    components.push(cancelRow);

    await message.reply({
      content: `<@${session.userId}>`,
      embeds: [embed],
      components,
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    console.error("Erro ao enviar pergunta do quiz:", error);
    await message
      .reply({
        content: "❌ Erro ao enviar pergunta do quiz.",
        allowedMentions: { repliedUser: false },
      })
      .catch(() => {});
  }
}

/**
 * Processa interação de resposta ou cancelamento.
 * Valida dono da sessão e índice atual antes de registrar resposta.
 */
export async function handlePerfilQuizAnswer(
  interaction: ButtonInteraction,
): Promise<void> {
  try {
    const { customId } = interaction;

    // Parse do customId: perfil_quiz_{userId}_{questionIndex}_{answerIndex}
    const parts = customId.split("_");

    if (parts[0] !== "perfil" || parts[1] !== "quiz") return;

    // Verificar se é cancelamento
    if (parts[2] === "cancel") {
      const userId = parts[3];
      if (interaction.user.id !== userId) {
        await interaction.reply({
          content: "❌ Você não pode cancelar o quiz de outro usuário.",
          ephemeral: true,
        });
        return;
      }
      if (!interaction.guildId) {
        await interaction.reply({
          content: "Este comando só pode ser usado em um servidor.",
          ephemeral: true,
        });
        return;
      }

      await clearPerfilQuizSession(userId, interaction.guildId);
      await interaction.update({
        content: "❌ Quiz de perfil cancelado.",
        embeds: [],
        components: [],
      });
      return;
    }

    // Parse da resposta normal
    const userId = parts[2];
    const questionIndex = Number.parseInt(parts[3] ?? "0");
    const answerIndex = Number.parseInt(parts[4] ?? "0");

    // Verificar se o usuário que clicou é o dono do quiz
    if (interaction.user.id !== userId) {
      await interaction.reply({
        content: "❌ Este quiz pertence a outro usuário.",
        ephemeral: true,
      });
      return;
    }

    // Obter sessão
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando só pode ser usado em servidores.",
        ephemeral: true,
      });
      return;
    }

    const session = await getPerfilQuizSession(userId, interaction.guild.id);
    if (session?.currentQuestion !== questionIndex) {
      await interaction.reply({
        content: "❌ Sessão de quiz inválida ou expirada.",
        ephemeral: true,
      });
      return;
    }

    // Obter configuração e resposta
    const config = await getPerfilQuizConfig();
    const question = config.questions[questionIndex];
    const answer = question?.answers[answerIndex];

    if (!question || !answer) {
      await interaction.reply({
        content: "❌ Resposta inválida.",
        ephemeral: true,
      });
      return;
    }

    // Registrar resposta
    session.answers.push({
      questionIndex,
      answerIndex,
      result: answer.result,
      weight: answer.weight || 1,
    });

    // Avançar para próxima questão
    session.currentQuestion++;
    // Função para atualizar sessão será implementada no próprio handler
    // updatePerfilQuizSession(session);

    // Verificar se há mais questões
    await (session.currentQuestion >= config.questions.length
      ? finalizePerfilQuiz(session)
      : sendPerfilQuizQuestionToInteraction(interaction, session));
  } catch (error) {
    console.error("Erro ao processar resposta do quiz de perfil:", error);
    await interaction
      .reply({
        content: "❌ Erro ao processar resposta do quiz.",
        ephemeral: true,
      })
      .catch(() => {});
  }
}

/**
 * Atualiza mensagem de interação com próxima questão mantendo menção ao usuário.
 */
async function sendPerfilQuizQuestionToInteraction(
  interaction: ButtonInteraction,
  session: PerfilQuizSession,
): Promise<void> {
  const config = await getPerfilQuizConfig();
  const question = config.questions[session.currentQuestion];

  if (!question) {
    throw new Error("Pergunta não encontrada");
  }

  const progress = await getPerfilQuizProgress(session);
  const preview = await getPerfilQuizPreview(session);

  const embed = new EmbedBuilder()
    .setTitle("🎯 Quiz de Perfil")
    .setDescription(question.text)
    .addFields([
      {
        name: "Progresso",
        value: `${progress}% (${session.currentQuestion + 1}/${config.questions.length})`,
        inline: true,
      },
      {
        name: "Tendência Atual",
        value: `${preview.topResult} (${preview.confidence}% confiança)`,
        inline: true,
      },
    ])
    .setColor("#5865F2")
    .setFooter({
      text: `Pergunta ${session.currentQuestion + 1} de ${config.questions.length}`,
    });

  // Criar botões (mesmo código da função anterior)
  const components: Array<ActionRowBuilder<ButtonBuilder>> = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  question.answers.forEach((answer, index) => {
    if (index > 0 && index % 5 === 0) {
      components.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }

    const button = new ButtonBuilder()
      .setCustomId(
        `perfil_quiz_${session.userId}_${session.currentQuestion}_${index}`,
      )
      .setLabel(answer.text.substring(0, 80))
      .setStyle(ButtonStyle.Primary);

    currentRow.addComponents(button);
  });

  if (currentRow.components.length > 0) {
    components.push(currentRow);
  }

  const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`perfil_quiz_cancel_${session.userId}`)
      .setLabel("❌ Cancelar Quiz")
      .setStyle(ButtonStyle.Danger),
  );

  components.push(cancelRow);

  await interaction.update({
    content: `<@${session.userId}>`,
    embeds: [embed],
    components,
  });
}
