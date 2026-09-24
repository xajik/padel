import { describe, expect, it } from "vitest";
import {
  advance,
  applyScore,
  buildPlayers,
  cleanName,
  hashKey,
  isValidCode,
  newJoinCode,
  newOrganizerKey,
  normalizeCode,
  prepareGame,
  publicGame,
  ToolError,
  type CloudGame,
} from "../src/game";

function cloudGame(): CloudGame {
  const { state } = prepareGame({ mode: "americano", names: ["A", "B", "C", "D", "E", "F", "G", "H"], courts: 2 });
  return { id: "1", code: "ABCDEF", name: "Test", ownerUid: "mcp:x", status: "live", source: "mcp", createdAt: 0, updatedAt: 0, state, keyHashes: ["h"] };
}

describe("identifiers", () => {
  it("join codes avoid ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const c = newJoinCode();
      expect(isValidCode(c)).toBe(true);
      expect(c).not.toMatch(/[01OIL]/);
    }
  });

  it("normalises codes from links", () => {
    expect(normalizeCode("https://x.dev/g/k7q2mx")).toBe("K7Q2MX");
    expect(normalizeCode("https://x.dev/g/K7Q2MX?key=abc")).toBe("K7Q2MX");
    expect(normalizeCode(" k7q2mx ")).toBe("K7Q2MX");
  });

  it("organizer keys are 128-bit and hash deterministically", async () => {
    const k = newOrganizerKey();
    expect(k).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await hashKey(k)).toBe(await hashKey(k));
    expect(await hashKey(k)).toHaveLength(64);
  });
});

describe("building games", () => {
  it("sanitises names and de-duplicates", () => {
    expect(cleanName("  <b>Anna</b>\n ")).toBe("bAnna/b");
    const ps = buildPlayers({ mode: "americano", names: ["Anna", "anna", "Mikko", "Laura"] });
    expect(ps.map((p) => p.name)).toEqual(["Anna", "anna 2", "Mikko", "Laura"]);
  });

  it("gives actionable validation errors", () => {
    expect(() => prepareGame({ mode: "up-and-down", players: 10, courts: 2 })).toThrow(/multiple of 4/);
    try {
      prepareGame({ mode: "americano", players: 8, courts: 5 });
    } catch (e) {
      expect((e as ToolError).code).toBe("INVALID_COURTS");
    }
  });

  it("public view never exposes key hashes", () => {
    expect("keyHashes" in publicGame(cloudGame())).toBe(false);
  });
});

describe("operations", () => {
  it("scores by court and advances only when complete", () => {
    let g = cloudGame();
    g = applyScore(g, 1, 15, null).game;
    expect(g.state.rounds[0].matches[0].scoreB).toBe(9);
    expect(() => advance(g)).toThrow(/court 2/);
    g = applyScore(g, 2, 10, null).game;
    expect(advance(g).state.current).toBe(1);
  });

  it("rejects unknown courts and finished games", () => {
    const g = cloudGame();
    expect(() => applyScore(g, 5, 10, null)).toThrow(ToolError);
    expect(() => applyScore({ ...g, status: "done" }, 1, 10, null)).toThrow(/finished/);
  });
});
