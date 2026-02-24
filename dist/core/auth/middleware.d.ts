import type express from "express";
export declare function requireDiscordSession(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void>;
export declare function requirePanelToken(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void>;
