import type {
  PerfilCustomizado,
  PerfilQuizBadgeResult,
  PerfilQuizResult,
  PerfilQuizSession,
} from "@barqueiro/types";
import { setPerfilCustomizado } from "@storage/perfil.js";
import { getPerfilQuizConfig } from "@storage/perfil-quiz.js";

/**
 * Número máximo de badges exibidos no perfil final.
 */
const MAX_BADGES = 4;

/**
 * Fator mínimo (score relativo) para considerar resultado secundário na agregação de badges.
 */
const SECONDARY_BADGE_THRESHOLD_RATIO = 0.5;

/**
 * Constrói URL de badge (Badgen) com tech/level/color.
 * @param badge Badge derivado do resultado
 */
function generateBadgeUrl(badge: PerfilQuizBadgeResult): string {
  return `https://badgen.net/badge/${encodeURIComponent(badge.tech)}/${encodeURIComponent(badge.level)}/${badge.color}`;
}

/**
 * Processa respostas acumuladas e determina perfil customizado.
 * Combina badges do resultado principal e de resultados secundários (>= limiar).
 * @param session Sessão ativa do quiz
 * @returns Perfil montado ou null se não habilitado / sem resultados
 */
export async function processPerfilQuizResults(
  session: PerfilQuizSession,
): Promise<PerfilCustomizado | null> {
  const config = await getPerfilQuizConfig();
  if (!config.enabled || config.results.length === 0) return null;

  // Contar pontos para cada resultado possível
  const resultScores = new Map<string, number>();

  for (const answer of session.answers) {
    const currentScore = resultScores.get(answer.result) || 0;
    resultScores.set(answer.result, currentScore + (answer.weight || 1));
  }

  // Encontrar o resultado com maior pontuação
  let topResult: PerfilQuizResult | null = null;
  let maxScore = 0;

  for (const [resultKey, score] of resultScores.entries()) {
    if (score > maxScore) {
      const result = config.results.find((r) => r.key === resultKey);
      if (result) {
        topResult = result;
        maxScore = score;
      }
    }
  }

  if (!topResult) return null;

  // Combinar badges de múltiplos resultados se tiver respostas variadas
  const allBadges: PerfilQuizBadgeResult[] = [];
  const badgeSet = new Set<string>(); // Para evitar badges duplicados

  // Adicionar badges do resultado principal
  for (const badge of topResult.badges) {
    if (!badgeSet.has(badge.tech)) {
      allBadges.push(badge);
      badgeSet.add(badge.tech);
    }
  }

  // Adicionar badges de outros resultados com pontuação significativa (>= 50% do máximo)
  const significantThreshold = Math.max(
    1,
    maxScore * SECONDARY_BADGE_THRESHOLD_RATIO,
  );
  for (const [resultKey, score] of resultScores.entries()) {
    if (resultKey !== topResult.key && score >= significantThreshold) {
      const result = config.results.find((r) => r.key === resultKey);
      if (result) {
        for (const badge of result.badges) {
          if (!badgeSet.has(badge.tech) && allBadges.length < MAX_BADGES) {
            // Reduzir o nível se não for o resultado principal
            const adjustedBadge = {
              ...badge,
              level: adjustBadgeLevel(badge.level),
            } as PerfilQuizBadgeResult;
            allBadges.push(adjustedBadge);
            badgeSet.add(badge.tech);
          }
        }
      }
    }
  }

  // Limitar a quantidade máxima de badges
  const finalBadges = allBadges.slice(0, MAX_BADGES);

  // Montar perfil customizado
  const perfil: PerfilCustomizado = {
    user_id: session.userId,
    bio: topResult.bio,
    area: topResult.area,
    emblemas: topResult.emblemas,
    badges: finalBadges.map((badge) => ({
      imageUrl: generateBadgeUrl(badge),
      nome: badge.displayName,
      descricao: badge.description,
    })),
    aparencia: topResult.aparencia,
  };

  return perfil;
}

/**
 * Ajusta nível de badge para resultados secundários (downgrade progressivo).
 */
function adjustBadgeLevel(
  level: PerfilQuizBadgeResult["level"],
): PerfilQuizBadgeResult["level"] {
  switch (level) {
    case "Expert":
      return "Advanced";
    case "Advanced":
      return "Intermediate";
    case "Intermediate":
      return "Beginner";
    case "Beginner":
      return "Beginner";
    default:
      return "Beginner";
  }
}

/**
 * Finaliza fluxo do quiz persistindo perfil customizado.
 * @param session Sessão com respostas
 * @returns Perfil salvo ou null
 */
export async function finalizePerfilQuiz(
  session: PerfilQuizSession,
): Promise<PerfilCustomizado | null> {
  const perfil = await processPerfilQuizResults(session);
  if (!perfil) return null;

  // Salvar perfil no banco de dados
  const saved = await setPerfilCustomizado(perfil);
  if (!saved) return null;

  return perfil;
}

/**
 * Calcula progresso percentual baseado em índice atual da questão.
 */
export async function getPerfilQuizProgress(
  session: PerfilQuizSession,
): Promise<number> {
  const config = await getPerfilQuizConfig();
  if (config.questions.length === 0) return 0;

  return Math.round((session.currentQuestion / config.questions.length) * 100);
}

/**
 * Gera prévia do resultado mais provável e badges potenciais.
 * @param session Sessão ativa
 * @returns Objeto com topResult (área), confidence (%) e lista de badges displayName
 */
export async function getPerfilQuizPreview(
  session: PerfilQuizSession,
): Promise<{
  topResult: string;
  confidence: number;
  possibleBadges: string[];
}> {
  const config = await getPerfilQuizConfig();
  const resultScores = new Map<string, number>();

  for (const answer of session.answers) {
    const currentScore = resultScores.get(answer.result) || 0;
    resultScores.set(answer.result, currentScore + (answer.weight || 1));
  }

  if (resultScores.size === 0) {
    return {
      topResult: "Indeterminado",
      confidence: 0,
      possibleBadges: [],
    };
  }

  const [topResultKey, maxScore] = Array.from(resultScores.entries()).reduce(
    (a, b) => (a[1] > b[1] ? a : b),
  );

  const totalScore = Array.from(resultScores.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const confidence = Math.round((maxScore / totalScore) * 100);

  const topResult = config.results.find((r) => r.key === topResultKey);
  const possibleBadges = topResult?.badges.map((b) => b.displayName) || [];

  return {
    topResult: topResult?.area || "Indeterminado",
    confidence,
    possibleBadges,
  };
}
