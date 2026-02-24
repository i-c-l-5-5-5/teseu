import type { Request } from "express";
import type { QuizResult as SquadQuizResult, SquadQuizQuestion } from "./squad.js";
export interface EmbedRequest {
    channelId: string;
    title: string;
    description: string;
    color?: string;
    image?: string;
}
export interface CommandsListItem {
    name: string;
    description: string;
}
export interface CommandsListResponse {
    commands: CommandsListItem[];
}
export interface InstalledGuild {
    id: string;
    name: string;
}
export interface PanelInfo {
    sub: string;
    username?: string;
    avatar_url?: string;
    admin?: string[];
    installed?: InstalledGuild[];
    memberInstalled?: InstalledGuild[];
}
export interface RankRoleRow {
    level: number;
    role_name: string;
}
export interface QuizMetricsRow {
    question_idx: number;
    result: string;
    count: number;
}
export interface QuizConfig {
    disclaimer?: string;
    results: SquadQuizResult[];
    questions: SquadQuizQuestion[];
}
export interface RequestWithNext extends Request {
    query: {
        next?: string;
    };
}
