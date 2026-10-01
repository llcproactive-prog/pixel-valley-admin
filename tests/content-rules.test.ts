import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContent, slugify, type RuleContext } from "../lib/content-rules.ts";

const ctx: RuleContext = {
  license: "CSLB #1155142 (C-33)",
  allowedCities: ["San Jose", "Willow Glen", "Campbell", "Los Gatos"],
  bannedPhrases: ["best in the Bay Area", "guaranteed"],
  jobCity: "Willow Glen",
  customerFirstName: "Maria",
  customerNameOk: false,
};

test("GBP post with a phone number is blocked", () => {
  const f = checkContent("gbp_post", "Call us at 408-516-7750 for a quote.", ctx);
  assert.ok(f.some((x) => x.level === "block" && /phone/i.test(x.message)));
});

test("GBP post over 1500 chars is blocked", () => {
  const f = checkContent("gbp_post", "a".repeat(1501), ctx);
  assert.ok(f.some((x) => x.level === "block" && /Too long/.test(x.message)));
});

test("case study without license number is blocked", () => {
  const f = checkContent("case_study", "Great Willow Glen project.", ctx);
  assert.ok(f.some((x) => /license/i.test(x.message)));
});

test("case study with license number passes the license check", () => {
  const f = checkContent("case_study", "Willow Glen project. Pixel Valley Painting · CSLB #1155142", ctx);
  assert.ok(!f.some((x) => /license/i.test(x.message)));
});

test("street addresses are blocked", () => {
  const f = checkContent("facebook", "We painted 1234 Lincoln Ave this week. CSLB 1155142", ctx);
  assert.ok(f.some((x) => /address/i.test(x.message)));
});

test("customer name without permission is blocked in public content", () => {
  const f = checkContent("instagram", "Thanks Maria! CSLB #1155142", ctx);
  assert.ok(f.some((x) => /Names the customer/.test(x.message)));
});

test("customer name is fine in a private review request", () => {
  const f = checkContent("review_request", "Hi Maria, thanks for choosing us", ctx);
  assert.ok(!f.some((x) => /Names the customer/.test(x.message)));
});

test("customer name allowed when permission given", () => {
  const f = checkContent("instagram", "Thanks Maria! CSLB #1155142", { ...ctx, customerNameOk: true });
  assert.ok(!f.some((x) => /Names the customer/.test(x.message)));
});

test("banned phrases warn", () => {
  const f = checkContent("facebook", "Best in the Bay Area. CSLB #1155142", ctx);
  assert.ok(f.some((x) => x.level === "warn" && /banned/.test(x.message)));
});

test("other-city stuffing warns", () => {
  const f = checkContent("gbp_post", "Serving Willow Glen, Campbell and Los Gatos", ctx);
  assert.ok(f.some((x) => /other cities/.test(x.message)));
});

test("slugify", () => {
  assert.equal(slugify("Willow Glen Kitchen Cabinets & Trim!"), "willow-glen-kitchen-cabinets-and-trim");
  assert.equal(slugify("  Café   Exterior  "), "cafe-exterior");
});
