import { generateObject, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { BrandSettings } from "../settings";

export const AGENT_NAME = "marketing";

export type JobInput = {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  service_type: string;
  surfaces: string | null;
  starting_condition: string | null;
  prep_work: string | null;
  products: string | null;
  colors: string | null;
  method: string | null;
  repairs: string | null;
  duration_days: number | null;
  completed_on: string | null;
  customer_first_name: string | null;
  customer_name_ok: boolean;
  homeowner_questions: string | null;
  notes: string | null;
};

export type PhotoInput = { id: string; stage: string; room: string | null; caption: string | null; url: string };

export const packageSchema = z.object({
  missing_info: z
    .array(z.string())
    .describe("Short questions for the owner about facts that would make this content stronger but were NOT in the intake. Empty if nothing important is missing."),
  gbp_post: z.object({
    body: z.string().describe("Google Business Profile update. 120-250 words, max 1400 characters. No phone numbers, no URLs, no hashtags."),
    cta: z.enum(["CALL", "LEARN_MORE", "BOOK"]),
  }),
  case_study: z.object({
    title: z.string().describe("Human headline for the project page, e.g. 'Willow Glen Kitchen Cabinet Refinish'."),
    slug: z.string().describe("lowercase-hyphenated URL slug: service-city-detail, e.g. cabinet-refinishing-willow-glen-shaker"),
    seo_title: z.string().describe("<= 60 characters, includes service + city"),
    meta_description: z.string().describe("<= 155 characters"),
    body_markdown: z
      .string()
      .describe("400-700 word project page in Markdown with ## sections: The Project, Starting Condition, Prep & Repairs, Products & Finish, Result. End with a one-line license/contact footer."),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).describe("2-4 FAQs grounded in homeowner_questions or the job facts. Empty if there is nothing real to answer."),
  }),
  instagram: z.object({
    caption: z.string().describe("60-150 words, first line is the hook, ends with license line."),
    hashtags: z.array(z.string()).describe("8-15 hashtags without the # sign, mix of local (city) and service tags."),
  }),
  facebook: z.object({ post: z.string().describe("80-180 words, conversational, ends with license line and website.") }),
  review_request: z.object({
    sms: z.string().describe("Under 300 characters. Uses {{first_name}} and {{review_link}} placeholders."),
    email_subject: z.string(),
    email_body: z.string().describe("Short, warm, specific to this job. Uses {{first_name}} and {{review_link}} placeholders."),
  }),
  photo_text: z
    .array(z.object({ photo_id: z.string(), alt_text: z.string().describe("<= 125 chars, literal description + service + city"), caption: z.string() }))
    .describe("One entry per photo provided, using the exact photo_id."),
});

export type ContentPackage = z.infer<typeof packageSchema>;

export function buildSystemPrompt(s: BrandSettings): string {
  const b = s.business;
  const rename = s.brand_state.gbp_rename_done
    ? `The Google Business Profile is named "${b.name}".`
    : `The Google Business Profile is STILL named "${s.brand_state.gbp_name}" (rename pending). GBP posts should say "${b.name} (formerly ${s.brand_state.gbp_name})" once, naturally, so customers aren't confused.`;

  return `You are the Marketing Agent for ${b.name}, a licensed painting contractor (${b.license}) serving the South Bay since ${b.founded}. Owner: ${b.owner}.

Your job: turn ONE completed painting job into a content package the owner will review before anything is published. You draft; the owner approves. Nothing you write is sent automatically.

## Hard rules (never break)
1. Use ONLY facts in the job intake and photo list. Never invent products, colors, sheens, number of coats, durations, prices, square footage, warranties, or customer quotes. If a fact is missing, write around it and add a question to missing_info.
2. Never include a street address, house number, or anything that identifies the home. City and neighborhood only.
3. Use the customer's first name ONLY if customer_name_ok is true. Otherwise say "the homeowner".
4. Name only the job's city/neighborhood. Do not stuff in other cities or claim service areas beyond: ${s.service_cities.join(", ")}.
5. Never use these claims: ${(s.voice.avoid ?? []).join(", ") || "(none listed)"}. No superlatives you can't prove, no fake urgency, no reviews or testimonials you weren't given.
6. Include the license line "${b.license}" in the case study footer, the Instagram caption, and the Facebook post. Do NOT put a phone number or URL in the Google Business Profile post — Google rejects those.
7. Prices never appear in any content.

## Brand state
${rename}
Website: ${b.website}. Phone (OK outside GBP posts): ${b.phone}.
${s.brand_state.notes ? `Notes: ${s.brand_state.notes}` : ""}

## Voice
${s.voice.tone}
Pillars to draw on when the facts support them: ${(s.voice.pillars ?? []).join("; ")}.
Write like a craftsman explaining the work to a neighbor: specific, concrete, calm. Lead with the transformation, then the prep that made it last. Prep details are your differentiator — when the intake has them, feature them.

## SEO
Case study: service + city in the title, slug, SEO title and first paragraph. Write for a homeowner who searched "[service] [city]" and for AI assistants that summarize contractors — clear facts, short sections, real FAQs. No keyword stuffing.

## Photos
Write alt text that literally describes what's visible (room, surface, color if stated) plus service and city. If photos are attached as images, look at them, but never contradict the intake.`;
}

export function buildUserPrompt(job: JobInput, photos: PhotoInput[], instructions?: string): string {
  const fields: [string, unknown][] = [
    ["title", job.title],
    ["city", job.city],
    ["neighborhood", job.neighborhood],
    ["service_type", job.service_type],
    ["surfaces", job.surfaces],
    ["starting_condition", job.starting_condition],
    ["prep_work", job.prep_work],
    ["products", job.products],
    ["colors", job.colors],
    ["method", job.method],
    ["repairs", job.repairs],
    ["duration_days", job.duration_days],
    ["completed_on", job.completed_on],
    ["customer_first_name", job.customer_first_name],
    ["customer_name_ok", job.customer_name_ok],
    ["homeowner_questions", job.homeowner_questions],
    ["notes", job.notes],
  ];
  const intake = fields.map(([k, v]) => `${k}: ${v === null || v === undefined || v === "" ? "(not provided)" : v}`).join("\n");
  const photoList = photos.length
    ? photos.map((p) => `- photo_id=${p.id} stage=${p.stage}${p.room ? ` room=${p.room}` : ""}${p.caption ? ` note="${p.caption}"` : ""}`).join("\n")
    : "(no photos approved for marketing yet — return an empty photo_text array)";

  return `## Job intake
${intake}

## Photos approved for marketing
${photoList}
${instructions ? `\n## Owner's instructions for this draft\n${instructions}\n` : ""}
Produce the full content package.`;
}

export function resolveModel(): { model: LanguageModel; label: string } {
  if (process.env.ANTHROPIC_API_KEY) {
    const id = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
    return { model: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(id), label: `anthropic:${id}` };
  }
  // Vercel AI Gateway — authenticates automatically on Vercel via OIDC.
  const id = process.env.MARKETING_MODEL || "anthropic/claude-sonnet-5.5";
  return { model: id, label: `gateway:${id}` };
}

export async function generatePackage(opts: {
  settings: BrandSettings;
  job: JobInput;
  photos: PhotoInput[];
  instructions?: string;
}) {
  const { model, label } = resolveModel();
  const images = opts.photos.slice(0, 6);
  const result = await generateObject({
    model,
    schema: packageSchema,
    system: buildSystemPrompt(opts.settings),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildUserPrompt(opts.job, opts.photos, opts.instructions) },
          ...images.map((p) => ({ type: "image" as const, image: new URL(p.url) })),
        ],
      },
    ],
    temperature: 0.4,
    maxRetries: 1,
  });
  return { pkg: result.object, usage: result.usage, modelLabel: label };
}
