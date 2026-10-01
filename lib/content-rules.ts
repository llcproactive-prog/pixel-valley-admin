// Deterministic checks run on every AI draft before it reaches the owner.
// Pure functions — no I/O — so they are easy to test.

export type Channel = "gbp_post" | "case_study" | "instagram" | "facebook" | "review_request" | "faq";

export type RuleContext = {
  license: string; // e.g. "CSLB #1155142"
  allowedCities: string[];
  bannedPhrases: string[];
  jobCity: string;
  customerFirstName?: string | null;
  customerNameOk: boolean;
};

export type Flag = { level: "block" | "warn"; message: string };

const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const STREET_RE = /\b\d{2,6}\s+[A-Z][a-z]+(\s[A-Z][a-z]+)*\s(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Way|Blvd|Pl|Place)\b/;

export const GBP_MAX_CHARS = 1500;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function checkContent(channel: Channel, text: string, ctx: RuleContext): Flag[] {
  const flags: Flag[] = [];
  const lower = text.toLowerCase();

  for (const phrase of ctx.bannedPhrases) {
    if (phrase && lower.includes(phrase.toLowerCase())) {
      flags.push({ level: "warn", message: `Uses a claim you've banned: "${phrase}"` });
    }
  }

  if (STREET_RE.test(text)) {
    flags.push({ level: "block", message: "Looks like it contains a street address — remove it to protect the homeowner." });
  }

  // A review request goes privately to the customer, so their name is fine there.
  if (ctx.customerFirstName && !ctx.customerNameOk && channel !== "review_request") {
    const re = new RegExp(`\\b${escapeRe(ctx.customerFirstName)}\\b`, "i");
    if (re.test(text)) flags.push({ level: "block", message: `Names the customer (${ctx.customerFirstName}) without permission.` });
  }

  const otherCities = ctx.allowedCities.filter(
    (c) => c.toLowerCase() !== ctx.jobCity.toLowerCase() && lower.includes(c.toLowerCase()),
  );
  if (otherCities.length) {
    flags.push({ level: "warn", message: `Mentions other cities (${otherCities.join(", ")}) — this job was in ${ctx.jobCity}.` });
  }

  if (channel === "gbp_post") {
    if (text.length > GBP_MAX_CHARS) flags.push({ level: "block", message: `Too long for Google (${text.length}/${GBP_MAX_CHARS} characters).` });
    if (PHONE_RE.test(text)) flags.push({ level: "block", message: "Google rejects posts that contain a phone number in the text — use the Call button instead." });
  }

  if (channel === "case_study" || channel === "facebook" || channel === "instagram") {
    // The license number is the longest digit run (ignores the "33" in "C-33").
    const digits = (ctx.license.match(/\d+/g) ?? []).sort((a, b) => b.length - a.length)[0];
    if (digits && !text.includes(digits)) {
      flags.push({ level: "block", message: `Missing your license number (${ctx.license}) — required on advertising.` });
    }
  }

  return flags;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
