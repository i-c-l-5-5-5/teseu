/*
SPDX-License-Identifier: MIT
*/
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  finalizePerfilQuiz,
  getPerfilQuizPreview,
  getPerfilQuizProgress,
  processPerfilQuizResults,
} from "@/services/perfil-quiz.js";

let currentConfig: any;
let lastSavedPerfil: any = null;

vi.mock("@storage/perfil-quiz.js", () => ({
  getPerfilQuizConfig: vi.fn(async () => currentConfig),
}));

vi.mock("@storage/perfil.js", () => ({
  setPerfilCustomizado: vi.fn(async (perfil: any) => {
    lastSavedPerfil = perfil;
    return true;
  }),
}));

describe("PerfilQuiz Service - behavior branches", () => {
  const baseSession = {
    userId: "u",
    guildId: "g",
    currentQuestion: 0,
    answers: [] as any[],
    startedAt: Date.now(),
  };

  const baseConfig = {
    enabled: true,
    channelId: "ch",
    questions: [{ text: "q1", type: "skill", answers: [] }],
    results: [
      {
        key: "backend",
        bio: "bio backend",
        area: "Backend",
        emblemas: ["API"],
        badges: [
          {
            tech: "Node.js",
            level: "Expert",
            color: "green",
            displayName: "Node.js",
            description: "",
          },
          {
            tech: "DB",
            level: "Advanced",
            color: "blue",
            displayName: "DB",
            description: "",
          },
        ],
        aparencia: { corFundo: "#339933" },
      },
      {
        key: "frontend",
        bio: "bio frontend",
        area: "Frontend",
        emblemas: ["UI"],
        badges: [
          {
            tech: "React",
            level: "Advanced",
            color: "blue",
            displayName: "React",
            description: "",
          },
          {
            tech: "CSS",
            level: "Intermediate",
            color: "purple",
            displayName: "CSS",
            description: "",
          },
        ],
        aparencia: { corFundo: "#61DAFB" },
      },
      {
        key: "devops",
        bio: "bio devops",
        area: "DevOps",
        emblemas: ["Ops"],
        badges: [
          {
            tech: "Docker",
            level: "Expert",
            color: "blue",
            displayName: "Docker",
            description: "",
          },
          {
            tech: "CI",
            level: "Beginner",
            color: "grey",
            displayName: "CI",
            description: "",
          },
        ],
        aparencia: { corFundo: "#0db7ed" },
      },
    ],
  };

  beforeEach(() => {
    currentConfig = { ...baseConfig };
    lastSavedPerfil = null;
  });

  it("retorna null quando config desabilitado", async () => {
    currentConfig.enabled = false;
    const res = await processPerfilQuizResults({ ...baseSession });
    expect(res).toBeNull();
  });

  it("retorna null quando não há resultados configurados", async () => {
    currentConfig.results = [];
    const res = await processPerfilQuizResults({
      ...baseSession,
      answers: [
        { questionIndex: 0, answerIndex: 0, result: "backend", weight: 1 },
      ],
    });
    expect(res).toBeNull();
  });

  it("seleciona topResult por maior pontuação e agrega badges secundários >= 50%", async () => {
    const session = {
      ...baseSession,
      answers: [
        { questionIndex: 0, answerIndex: 0, result: "backend", weight: 4 }, // max=4
        { questionIndex: 1, answerIndex: 0, result: "frontend", weight: 2 }, // 50% de 4
      ],
    };
    const perfil = await processPerfilQuizResults(session as any);
    expect(perfil).not.toBeNull();
    if (perfil) {
      expect(perfil.area).toBe("Backend");
      // Deve conter badge principal "Node.js" (Expert mantém no principal)
      const names = perfil.badges.map((b) => b.nome);
      expect(names).toContain("Node.js");
      // Secundário "React" deve entrar com downgrade de nível (Advanced -> Intermediate) e virar URL
      const urls = perfil.badges.map((b) => b.imageUrl);
      // URL contem level ajustado "Intermediate" no caminho
      expect(urls.join(" ")).toContain("Intermediate");
    }
  });

  it("respeita limite máximo de 4 badges", async () => {
    // Forçar muitos badges via múltiplos resultados significativos
    const session = {
      ...baseSession,
      answers: [
        { questionIndex: 0, answerIndex: 0, result: "backend", weight: 6 },
        { questionIndex: 1, answerIndex: 0, result: "frontend", weight: 4 },
        { questionIndex: 2, answerIndex: 0, result: "devops", weight: 3 },
      ],
    };
    const perfil = await processPerfilQuizResults(session as any);
    expect(perfil).not.toBeNull();
    if (perfil) {
      expect(perfil.badges.length).toBeLessThanOrEqual(4);
    }
  });

  it("finalizePerfilQuiz retorna null se persistência falha", async () => {
    // Mudar mock para falhar
    const mod = await import("@storage/perfil.js");
    (mod.setPerfilCustomizado as any).mockResolvedValueOnce(false);

    const session = {
      ...baseSession,
      answers: [
        { questionIndex: 0, answerIndex: 0, result: "backend", weight: 2 },
      ],
    };
    const perfil = await finalizePerfilQuiz(session as any);
    expect(perfil).toBeNull();
  });

  it("getPerfilQuizProgress usa tamanho das questões da config", async () => {
    currentConfig.questions = new Array(4).fill({
      text: "q",
      type: "skill",
      answers: [],
    });
    const session = { ...baseSession, currentQuestion: 2 };
    const progress = await getPerfilQuizProgress(session as any);
    expect(progress).toBe(50);
  });

  it("getPerfilQuizPreview retorna área e confiança calculada", async () => {
    const session = {
      ...baseSession,
      answers: [
        { questionIndex: 0, answerIndex: 0, result: "backend", weight: 3 },
        { questionIndex: 1, answerIndex: 0, result: "frontend", weight: 1 },
      ],
    };
    const preview = await getPerfilQuizPreview(session as any);
    expect(preview.topResult).toBe("Backend");
    expect(preview.confidence).toBeGreaterThan(0);
    expect(Array.isArray(preview.possibleBadges)).toBe(true);
  });
});
