import { getDB } from "./db-connector.js";
function isPerfilBadge(data) {
    return (typeof data === "object" &&
        data !== null &&
        typeof data.imageUrl === "string" &&
        typeof data.nome === "string");
}
function isPerfilApparencia(data) {
    return (typeof data === "object" &&
        data !== null &&
        typeof data.corFundo === "string");
}
function isPerfilCustomizado(data) {
    return (typeof data === "object" &&
        data !== null &&
        typeof data.user_id === "string" &&
        typeof data.bio === "string" &&
        typeof data.area === "string" &&
        Array.isArray(data.emblemas) &&
        Array.isArray(data.badges) &&
        data.badges.every(isPerfilBadge) &&
        isPerfilApparencia(data.aparencia));
}
export async function getPerfilCustomizado(userId) {
    try {
        const db = getDB();
        const row = (await db.get("SELECT * FROM perfil WHERE user_id = $1", [
            userId,
        ]));
        if (row === null || row === undefined)
            return null;
        const parsedAparencia = (() => {
            const raw = row.aparencia ?? "{}";
            let parsed = {};
            try {
                parsed = JSON.parse(raw);
            }
            catch {
                parsed = {};
            }
            return {
                corFundo: parsed.corFundo ?? "#5865F2",
                corTexto: parsed.corTexto ?? "#FFFFFF",
                corDestaque: parsed.corDestaque ?? "#FFD700",
                imagemFundo: parsed.imagemFundo,
            };
        })();
        const perfil = {
            user_id: row.user_id,
            bio: row.bio,
            area: row.area,
            emblemas: JSON.parse(row.emblemas !== null &&
                row.emblemas !== undefined &&
                row.emblemas !== ""
                ? row.emblemas
                : "[]"),
            badges: JSON.parse(row.badges !== null && row.badges !== undefined && row.badges !== ""
                ? row.badges
                : "[]"),
            aparencia: parsedAparencia,
        };
        return isPerfilCustomizado(perfil) ? perfil : null;
    }
    catch (error) {
        console.error("[DB] Erro ao buscar perfil:", error);
        return null;
    }
}
export async function getPerfilOuPadrao(userId) {
    const perfil = await getPerfilCustomizado(userId);
    if (perfil)
        return perfil;
    return {
        user_id: userId,
        bio: "Não informado",
        area: "Não informado",
        emblemas: [],
        badges: [],
        aparencia: {
            corFundo: "#005a2dff",
            corTexto: "#FFFFFF",
            corDestaque: "#a3940dff",
        },
    };
}
export function criarPerfilExemplo(userId) {
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
            corFundo: "#2F3136",
            corTexto: "#FFFFFF",
            corDestaque: "#5865F2",
        },
    };
}
export async function setPerfilCustomizado(perfil) {
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
    }
    catch (error) {
        console.error("[DB] Erro ao salvar perfil:", error);
        return false;
    }
}
