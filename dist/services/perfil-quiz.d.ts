import type { PerfilCustomizado, PerfilQuizSession } from "../tipos/index.js";
export declare function processPerfilQuizResults(session: PerfilQuizSession): Promise<PerfilCustomizado | null>;
export declare function finalizePerfilQuiz(session: PerfilQuizSession): Promise<PerfilCustomizado | null>;
export declare function getPerfilQuizProgress(session: PerfilQuizSession): Promise<number>;
export declare function getPerfilQuizPreview(session: PerfilQuizSession): Promise<{
    topResult: string;
    confidence: number;
    possibleBadges: string[];
}>;
