export declare const MODAL_TIMEOUT_MS = 300000;
export declare const DISCORD_COLORS: {
    readonly BLURPLE: 5793266;
    readonly SUCCESS: 47252;
    readonly ERROR: 15548997;
    readonly WARNING: 16705372;
};
export interface PanelSession {
    sub: string;
    guilds: Array<{
        id: string;
        name: string;
    }>;
    admin?: Array<{
        id: string;
        name: string;
    }>;
    memberInstalled?: Array<{
        id: string;
        name: string;
    }>;
    username?: string;
    avatar_url?: string;
}
export interface ChannelConfig {
    guild_id: string;
    embeds_channel?: string;
    xp_channels?: string[];
    xp_ignore_channels?: string[];
    perfil_quiz_channel?: string;
    squad_quiz_channel?: string;
    admin_commands_channel?: string;
    bot_commands_channels?: string[];
    level_up_channel?: string;
    rank_channel?: string;
    restrict_commands: boolean;
    created_at?: string;
    updated_at?: string;
}
export declare function defaultChannelConfig(guildId: string): ChannelConfig;
export interface SquadQuizConfig {
    questions: Array<{
        text: string;
        answers: Array<{
            text: string;
            result: string;
        }>;
    }>;
    results: Array<{
        key: string;
        label: string;
        role_name: string;
        description: string;
        color?: string;
    }>;
    disclaimer: string;
    enabled: boolean;
}
export declare function defaultQuiz(): SquadQuizConfig;
export declare function exampleQuizTemplate(): SquadQuizConfig;
export declare function defaultPerfilQuiz(): PerfilQuizConfig;
export declare function examplePerfilQuizTemplate(): PerfilQuizConfig;
export interface RankConfig {
    enabled: boolean;
    roles: Array<{
        name: string;
        threshold: number;
        color?: string;
    }>;
}
export interface MemberActivity {
    user_id: string;
    guild_id: string;
    message_count: number;
    last_activity: string;
}
export interface CooldownEntry {
    lastUsed: number;
    duration: number;
}
export interface PerfilApparencia {
    corFundo: string;
    corTexto?: string;
    corDestaque?: string;
    imagemFundo?: string;
}
export interface PerfilQuizBadgeResult {
    tech: string;
    level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
    color: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "grey";
    displayName: string;
    description?: string;
}
export interface PerfilQuizResult {
    key: string;
    bio: string;
    area: string;
    emblemas: string[];
    badges: PerfilQuizBadgeResult[];
    aparencia: PerfilApparencia;
}
export interface PerfilQuizAnswer {
    text: string;
    result: string;
    weight?: number;
}
export interface PerfilQuizQuestion {
    text: string;
    type: "skill" | "experience" | "preference" | "goal";
    answers: PerfilQuizAnswer[];
}
export interface PerfilQuizConfig {
    enabled: boolean;
    channelId?: string;
    questions: PerfilQuizQuestion[];
    results: PerfilQuizResult[];
}
export interface PerfilBadge {
    imageUrl: string;
    nome: string;
    descricao?: string;
}
export interface PerfilApparencia {
    corFundo: string;
    corTexto?: string;
    corDestaque?: string;
    imagemFundo?: string;
}
export interface PerfilCustomizado {
    user_id: string;
    bio: string;
    area: string;
    emblemas: string[];
    badges: PerfilBadge[];
    aparencia: PerfilApparencia;
}
