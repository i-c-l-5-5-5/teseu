import { type PerfilQuizConfig, type PerfilQuizSession } from "../tipos/index.js";
export type { PerfilQuizSession } from "../tipos/index.js";
export declare function getPerfilQuizConfig(): Promise<PerfilQuizConfig>;
export declare function setPerfilQuizConfig(config: PerfilQuizConfig): Promise<boolean>;
export declare function isPerfilQuizReady(): Promise<boolean>;
export declare function startPerfilQuizSession(userId: string, guildId: string): Promise<PerfilQuizSession>;
export declare function getPerfilQuizSession(userId: string, guildId: string): Promise<PerfilQuizSession | null>;
export declare function updatePerfilQuizSession(session: PerfilQuizSession): Promise<boolean>;
export declare function clearPerfilQuizSession(userId: string, guildId: string): Promise<void>;
