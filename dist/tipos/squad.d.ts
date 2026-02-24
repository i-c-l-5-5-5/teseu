export type SquadType = "Analyst" | "Diplomat" | "Sentinel" | "Explorer";
export type SquadMapping = Record<SquadType, string>;
export type ResultKey = string;
export interface QuizResult {
    key: ResultKey;
    label: string;
    role_name: string;
    description: string;
    color?: string;
}
export interface SquadQuizAnswer {
    label: string;
    result: ResultKey;
    text?: string;
}
export interface SquadQuizQuestion {
    idx?: number;
    text: string;
    answers: SquadQuizAnswer[];
    weight?: number;
}
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
