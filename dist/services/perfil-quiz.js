import { setPerfilCustomizado } from "../storage/perfil.js";
import { getPerfilQuizConfig } from "../storage/perfil-quiz.js";
const MAX_BADGES = 4;
const SECONDARY_BADGE_THRESHOLD_RATIO = 0.5;
function generateBadgeUrl(badge) {
    return `https://badgen.net/badge/${encodeURIComponent(badge.tech)}/${encodeURIComponent(badge.level)}/${badge.color}`;
}
export async function processPerfilQuizResults(session) {
    const config = await getPerfilQuizConfig();
    if (!config.enabled || config.results.length === 0)
        return null;
    const resultScores = new Map();
    for (const answer of session.answers) {
        const currentScore = resultScores.get(answer.result) || 0;
        resultScores.set(answer.result, currentScore + (answer.weight || 1));
    }
    let topResult = null;
    let maxScore = 0;
    for (const [resultKey, score] of resultScores.entries()) {
        if (score > maxScore) {
            const result = config.results.find((r) => r.key === resultKey);
            if (result) {
                topResult = result;
                maxScore = score;
            }
        }
    }
    if (!topResult)
        return null;
    const allBadges = [];
    const badgeSet = new Set();
    for (const badge of topResult.badges) {
        if (!badgeSet.has(badge.tech)) {
            allBadges.push(badge);
            badgeSet.add(badge.tech);
        }
    }
    const significantThreshold = Math.max(1, maxScore * SECONDARY_BADGE_THRESHOLD_RATIO);
    for (const [resultKey, score] of resultScores.entries()) {
        if (resultKey !== topResult.key && score >= significantThreshold) {
            const result = config.results.find((r) => r.key === resultKey);
            if (result) {
                for (const badge of result.badges) {
                    if (!badgeSet.has(badge.tech) && allBadges.length < MAX_BADGES) {
                        const adjustedBadge = {
                            ...badge,
                            level: adjustBadgeLevel(badge.level),
                        };
                        allBadges.push(adjustedBadge);
                        badgeSet.add(badge.tech);
                    }
                }
            }
        }
    }
    const finalBadges = allBadges.slice(0, MAX_BADGES);
    const perfil = {
        user_id: session.userId,
        bio: topResult.bio,
        area: topResult.area,
        emblemas: topResult.emblemas,
        badges: finalBadges.map((badge) => ({
            imageUrl: generateBadgeUrl(badge),
            nome: badge.displayName,
            descricao: badge.description,
        })),
        aparencia: topResult.aparencia,
    };
    return perfil;
}
function adjustBadgeLevel(level) {
    switch (level) {
        case "Expert":
            return "Advanced";
        case "Advanced":
            return "Intermediate";
        case "Intermediate":
            return "Beginner";
        case "Beginner":
            return "Beginner";
        default:
            return "Beginner";
    }
}
export async function finalizePerfilQuiz(session) {
    const perfil = await processPerfilQuizResults(session);
    if (!perfil)
        return null;
    const saved = await setPerfilCustomizado(perfil);
    if (!saved)
        return null;
    return perfil;
}
export async function getPerfilQuizProgress(session) {
    const config = await getPerfilQuizConfig();
    if (config.questions.length === 0)
        return 0;
    return Math.round((session.currentQuestion / config.questions.length) * 100);
}
export async function getPerfilQuizPreview(session) {
    const config = await getPerfilQuizConfig();
    const resultScores = new Map();
    for (const answer of session.answers) {
        const currentScore = resultScores.get(answer.result) || 0;
        resultScores.set(answer.result, currentScore + (answer.weight || 1));
    }
    if (resultScores.size === 0) {
        return {
            topResult: "Indeterminado",
            confidence: 0,
            possibleBadges: [],
        };
    }
    const [topResultKey, maxScore] = Array.from(resultScores.entries()).reduce((a, b) => (a[1] > b[1] ? a : b));
    const totalScore = Array.from(resultScores.values()).reduce((a, b) => a + b, 0);
    const confidence = Math.round((maxScore / totalScore) * 100);
    const topResult = config.results.find((r) => r.key === topResultKey);
    const possibleBadges = topResult?.badges.map((b) => b.displayName) || [];
    return {
        topResult: topResult?.area || "Indeterminado",
        confidence,
        possibleBadges,
    };
}
