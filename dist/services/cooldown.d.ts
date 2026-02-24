export declare function isInCooldown(key: string): boolean;
export declare function setCooldown(key: string, duration: number): void;
export declare function getCooldownRemaining(key: string): number;
export declare function clearCooldown(key: string): void;
export declare function cleanupExpiredCooldowns(): void;
