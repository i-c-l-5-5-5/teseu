/*
SPDX-License-Identifier: MIT
*/
// Union types não podem ser convertidos para interface
export type SquadType = "Analyst" | "Diplomat" | "Sentinel" | "Explorer";
export type SquadMapping = Record<SquadType, string>;
export type ResultKey = string; // identificador interno livre (ex.: "analyst", "diplomat"…)

export interface QuizResult {
  key: ResultKey;
  label: string; // rótulo opcional para UI/telemetria
  role_name: string; // nome do cargo a ser atribuído
  description: string; // descrição do resultado
  color?: string; // cor do cargo (hex #RRGGBB)
}

export interface SquadQuizAnswer {
  label: string;
  result: ResultKey; // aponta para uma das chaves em config.results
  text?: string; // alternativa para compatibilidade
}

export interface SquadQuizQuestion {
  idx?: number;
  text: string;
  answers: SquadQuizAnswer[]; // múltiplas opções levando a resultados
  weight?: number; // padrão 1; a última pode ser 2 para desempate determinístico
}

// Tipos expandidos para o sistema de quiz/squad (compatibilidade com services)
export interface QuizQuestion {
  text: string;
  answers: Array<{
    text: string;
    result: string;
  }>;
}

export interface UserQuizResult {
  user_id: string;
  guild_id: string;
  result_key: string;
  completed_at: string;
  answers: string;
}

export interface QuizSession {
  user_id: string;
  guild_id: string;
  current_question: number;
  answers: Array<{
    questionIndex: number;
    answerIndex: number;
    result: string;
    weight?: number;
  }>;
  started_at: number;
}

/**
 * Interface para sessão de quiz de perfil em andamento
 * Formato camelCase para compatibilidade com handlers
 */
export interface PerfilQuizSession {
  userId: string;
  guildId: string;
  currentQuestion: number;
  answers: Array<{
    questionIndex: number;
    answerIndex: number;
    result: string;
    weight?: number;
  }>;
  startedAt: number;
}
