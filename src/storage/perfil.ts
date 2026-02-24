import type {
  PerfilApparencia,
  PerfilBadge,
  PerfilCustomizado,
} from "@barqueiro/types";

import { getDB } from "./db-connector.js";

function isPerfilBadge(data: unknown): data is PerfilBadge {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as PerfilBadge).imageUrl === "string" &&
    typeof (data as PerfilBadge).nome === "string"
  );
}

function isPerfilApparencia(data: unknown): data is PerfilApparencia {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as PerfilApparencia).corFundo === "string"
  );
}

function isPerfilCustomizado(data: unknown): data is PerfilCustomizado {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as PerfilCustomizado).user_id === "string" &&
    typeof (data as PerfilCustomizado).bio === "string" &&
    typeof (data as PerfilCustomizado).area === "string" &&
    Array.isArray((data as PerfilCustomizado).emblemas) &&
    Array.isArray((data as PerfilCustomizado).badges) &&
    (data as PerfilCustomizado).badges.every(isPerfilBadge) &&
    isPerfilApparencia((data as PerfilCustomizado).aparencia)
  );
}

export async function getPerfilCustomizado(
  userId: string,
): Promise<PerfilCustomizado | null> {
  try {
    const db = getDB();
    const row = (await db.get("SELECT * FROM perfil WHERE user_id = $1", [
      userId,
    ])) as
      | {
          user_id: string;
          bio: string;
          area: string;
          emblemas: string;
          badges: string;
          aparencia: string;
        }
      | undefined;

    if (row === null || row === undefined) return null;
    const parsedAparencia = ((): PerfilApparencia => {
      const raw = row.aparencia ?? "{}";
      let parsed: Partial<PerfilApparencia> = {};
      try {
        parsed = JSON.parse(raw) as Partial<PerfilApparencia>;
      } catch {
        parsed = {};
      }
      return {
        corFundo: parsed.corFundo ?? "#5865F2",
        corTexto: parsed.corTexto ?? "#FFFFFF",
        corDestaque: parsed.corDestaque ?? "#FFD700",
        imagemFundo: parsed.imagemFundo,
      } as PerfilApparencia;
    })();

    const perfil = {
      user_id: row.user_id,
      bio: row.bio,
      area: row.area,
      emblemas: JSON.parse(
        row.emblemas !== null &&
          row.emblemas !== undefined &&
          row.emblemas !== ""
          ? row.emblemas
          : "[]",
      ) as string[],
      badges: JSON.parse(
        row.badges !== null && row.badges !== undefined && row.badges !== ""
          ? row.badges
          : "[]",
      ) as PerfilBadge[],
      aparencia: parsedAparencia,
    };

    return isPerfilCustomizado(perfil) ? perfil : null;
  } catch (error) {
    console.error("[DB] Erro ao buscar perfil:", error);
    return null;
  }
}

/**
 * Obtém perfil customizado ou retorna valores padrão
 */
export async function getPerfilOuPadrao(
  userId: string,
): Promise<PerfilCustomizado> {
  const perfil = await getPerfilCustomizado(userId);
  if (perfil) return perfil;

  // Perfil padrão
  return {
    user_id: userId,
    bio: "Não informado",
    area: "Não informado",
    emblemas: [],
    badges: [],
    aparencia: {
      corFundo: "#005a2dff", // Cor padrão do Discord
      corTexto: "#FFFFFF",
      corDestaque: "#a3940dff",
    },
  };
}

/**
 * Cria um perfil exemplo com badges demonstrativos usando Badgen
 */
export function criarPerfilExemplo(userId: string): PerfilCustomizado {
  return {
    user_id: userId,
    bio: "Desenvolvedor apaixonado por tecnologia",
    area: "Desenvolvimento Full-Stack",
    emblemas: ["Veterano", "Contribuidor"],
    badges: [
      {
        imageUrl: "https://badgen.net/badge/JavaScript/Advanced/yellow",
        nome: "JavaScript",
        descricao: "Proficiente em JavaScript",
      },
      {
        imageUrl: "https://badgen.net/badge/TypeScript/Expert/blue",
        nome: "TypeScript",
        descricao: "Expert em TypeScript",
      },
      {
        imageUrl: "https://badgen.net/badge/Node.js/Backend/green",
        nome: "Node.js",
        descricao: "Backend com Node.js",
      },
    ],
    aparencia: {
      corFundo: "#2F3136", // Cor escura elegante
      corTexto: "#FFFFFF",
      corDestaque: "#5865F2",
    },
  };
}

export async function setPerfilCustomizado(
  perfil: PerfilCustomizado,
): Promise<boolean> {
  try {
    const db = getDB();
    const sql = `
      INSERT INTO perfil 
      (user_id, bio, area, emblemas, badges, aparencia, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        bio = EXCLUDED.bio,
        area = EXCLUDED.area,
        emblemas = EXCLUDED.emblemas,
        badges = EXCLUDED.badges,
        aparencia = EXCLUDED.aparencia,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.run(sql, [
      perfil.user_id,
      perfil.bio,
      perfil.area,
      JSON.stringify(perfil.emblemas),
      JSON.stringify(perfil.badges),
      JSON.stringify(perfil.aparencia),
    ]);

    return true;
  } catch (error) {
    console.error("[DB] Erro ao salvar perfil:", error);
    return false;
  }
}
