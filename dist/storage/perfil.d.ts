import type { PerfilCustomizado } from "../tipos/index.js";
export declare function getPerfilCustomizado(userId: string): Promise<PerfilCustomizado | null>;
export declare function getPerfilOuPadrao(userId: string): Promise<PerfilCustomizado>;
export declare function criarPerfilExemplo(userId: string): PerfilCustomizado;
export declare function setPerfilCustomizado(perfil: PerfilCustomizado): Promise<boolean>;
