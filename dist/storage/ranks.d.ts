import type { RankRole } from "../tipos/index.js";
export declare function getRankRoles(guildId: string): Promise<RankRole[]>;
export declare function setRankRole(guildId: string, level: number, roleName: string): Promise<boolean>;
export declare function removeRankRole(guildId: string, level: number): Promise<boolean>;
