export interface RankRole {
    level: number;
    role_name: string;
}
export interface RankRoleRecord {
    guild_id: string;
    level: number;
    role_name: string;
}
export interface RankRoleConfig {
    id?: number;
    name: string;
    threshold: number;
    color?: string;
    discord_role_id?: string;
}
export interface UserRank {
    user_id: string;
    guild_id: string;
    message_count: number;
    current_rank?: string;
    last_activity: string;
    xp: number;
    level: number;
    position: number;
    last_message_at: string;
    created_at: string;
    updated_at: string;
}
export interface LeaderboardEntry {
    user_id: string;
    username?: string;
    avatar_url?: string;
    message_count: number;
    current_rank?: string;
    position: number;
}
