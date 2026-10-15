import { describe, expect, it } from "vitest";
import { canonicalResource } from "../src/resource";

const site = "https://padel-americanoo.com";
const canonical = `${site}/mcp/account`;

describe("canonicalResource", () => {
  it("maps the URLs users type to the account resource", () => {
    for (const v of [canonical, `${canonical}/`, `${site}/mcp`, `${site}/mcp/`, site, `${site}/`, "HTTPS://Padel-Americanoo.com/mcp"]) {
      expect(canonicalResource(v, site)).toBe(canonical);
    }
  });

  it("leaves other resources alone so the provider still rejects them", () => {
    for (const v of ["https://evil.example/mcp", `${site}/api/games`, `${site}/mcp?x=1`, "not a url"]) {
      expect(canonicalResource(v, site)).toBe(v);
    }
  });
});
