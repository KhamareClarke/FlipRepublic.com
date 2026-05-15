import { describe, expect, it } from "vitest";
import { EMPIRE_SKILLS, EMPIRE_SKILL_COUNT } from "@/lib/empire-os/skills";

describe("Empire OS skills registry", () => {
  it("registers all 33 skills with unique ids", () => {
    expect(EMPIRE_SKILL_COUNT).toBe(33);
    expect(EMPIRE_SKILLS).toHaveLength(33);
    const ids = EMPIRE_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(33);
  });

  it("fires high-value order skill on order.paid", () => {
    const skill = EMPIRE_SKILLS.find((s) => s.id === "E18_marketplace_pulse");
    expect(skill?.when("order.paid", { amount: 400 })).toBe(true);
    expect(skill?.when("order.paid", { amount: 50 })).toBe(false);
  });

  it("fires zero-result search skill", () => {
    const skill = EMPIRE_SKILLS.find((s) => s.id === "E08_zero_results_search");
    expect(skill?.when("search.performed", { result_count: 0 })).toBe(true);
    expect(skill?.when("search.performed", { result_count: 5 })).toBe(false);
  });
});
