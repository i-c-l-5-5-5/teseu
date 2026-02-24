import type { LeaderboardEntry, RankConfig, RankRoleConfig, UserRank } from "../tipos/index.js";
export declare function getRankConfig(guildId: string): Promise<RankConfig>;
export declare function setRankConfig(guildId: string, config: RankConfig): Promise<boolean>;
export declare function addMessageXP(userId: string, guildId: string, channelId?: string): Promise<{
    newLevel: number;
    leveledUp: boolean;
    newRank?: string;
}>;
export declare function getUserXP(userId: string, guildId: string): Promise<number>;
export declare function getUserRank(userId: string, guildId: string): Promise<UserRank>;
export declare function getLeaderboard(guildId: string, limit?: number): Promise<LeaderboardEntry[]>;
export declare function setRankRole(guildId: string, level: number, roleName: string): Promise<boolean>;
export declare function removeRankRole(guildId: string, level: number): Promise<boolean>;
export declare function getRankRoles(guildId: string): Promise<RankRoleConfig[]>;
