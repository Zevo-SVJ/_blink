/**
 * Blink — who legally operates this site.
 *
 * ## Why this file exists, and why most of it is `null`
 *
 * French law (LCEN, art. 6-III) requires a site's editor to identify itself:
 * name, legal form, address, registration number, VAT number where applicable,
 * the publication director, and the host's name and address. Stripe asks for
 * the same facts during account activation and compares them against what the
 * website says.
 *
 * None of that can be guessed. A plausible-looking company name, a made-up
 * SIREN or an invented address would be worse than an empty page: it is a
 * false statement to consumers, and a mismatch with the Stripe application is
 * exactly what stalls an activation review.
 *
 * So every unknown field is `null`, and the legal notice renders what is
 * genuinely known while saying plainly that the rest is pending. Fill these in
 * and the page completes itself — no other file needs to change.
 *
 * Each `null` below is also an item in the "before Stripe" list in the audit
 * report.
 */

export interface LegalEntity {
  /** Registered name of the person or company operating Blink. */
  name: string | null;
  /** e.g. "Entrepreneur individuel", "SASU", "SAS". */
  legalForm: string | null;
  /** Full registered address, as it appears on the registration record. */
  address: string | null;
  /** SIREN (9 digits) or SIRET (14 digits). */
  registrationNumber: string | null;
  /** RCS city, when the operator is registered with one. */
  rcsCity: string | null;
  /** Intra-EU VAT number, or null when not VAT-registered. */
  vatNumber: string | null;
  /** Share capital, for companies that have one. */
  shareCapital: string | null;
  /** Directeur de la publication — the named person responsible for content. */
  publicationDirector: string | null;
  /** Phone number, if one is published. Not required when an email is given. */
  phone: string | null;
}

/**
 * TODO(blink): supplied by the operator before Stripe submission.
 * Every field here is deliberately unset — see the note above.
 */
export const ENTITY: LegalEntity = {
  name: null,
  legalForm: null,
  address: null,
  registrationNumber: null,
  rcsCity: null,
  vatNumber: null,
  shareCapital: null,
  publicationDirector: null,
  phone: null,
};

/** True once the operator's identification is complete enough to publish. */
export function entityIsPublished(entity: LegalEntity = ENTITY): boolean {
  return Boolean(entity.name && entity.address && entity.registrationNumber);
}

/**
 * Contact addresses.
 *
 * One real, monitored mailbox rather than three invented aliases. The page
 * previously advertised `support@`, `privacy@` and `hello@` at a domain Blink
 * does not operate — mail to any of them would have bounced, which for a
 * privacy request is a compliance failure and for Stripe is unreachable
 * support.
 */
export const CONTACT = {
  /** Support, privacy requests and legal notices all land here today. */
  email: "zevo.flcs@gmail.com",
  /** Working target for a first reply. Stated, so it can be held to. */
  responseDays: 3,
  /** Statutory maximum for a data-subject request under the GDPR. */
  privacyResponseMonths: 1,
} as const;

/**
 * Processors Blink relies on. These are facts about the current deployment,
 * read off the code rather than assumed:
 *
 *  - Supabase — auth, database, storage, edge functions (`lib/supabase.ts`).
 *  - Rork — hosting for the web app, and the AI gateway the edge function
 *    calls (`backend/functions/analyze/index.ts` → `toolkit.rork.com`).
 *  - Google and OpenAI — the vision models that read the screenshot, reached
 *    through that gateway (`google/gemini-3-flash`, `openai/gpt-4.1`).
 *  - Google — additionally the identity provider, for "Sign in with Google".
 *
 * `region` is left null where the deployment region has not been confirmed
 * from the provider's dashboard. Naming a region we have not checked would be
 * inventing a transfer analysis, so the notice says "to be confirmed" instead.
 */
export interface Subprocessor {
  name: string;
  purpose: { en: string; fr: string };
  /** TODO(blink): confirm from each provider's dashboard. */
  region: string | null;
}

export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: "Supabase",
    purpose: {
      en: "Accounts, database, file storage and the analysis endpoint",
      fr: "Comptes, base de données, stockage de fichiers et point d'entrée de l'analyse",
    },
    region: null,
  },
  {
    name: "Rork",
    purpose: {
      en: "Web hosting, and the gateway that forwards a screenshot to the AI model",
      fr: "Hébergement du site et passerelle qui transmet la capture au modèle d'IA",
    },
    region: null,
  },
  {
    name: "Google (Gemini)",
    purpose: {
      en: "The vision model that reads the screenshot and writes the analysis",
      fr: "Le modèle visuel qui lit la capture et rédige l'analyse",
    },
    region: null,
  },
  {
    name: "OpenAI",
    purpose: {
      en: "Fallback vision model, used only when the primary model fails",
      fr: "Modèle visuel de secours, utilisé uniquement si le modèle principal échoue",
    },
    region: null,
  },
  {
    name: "Google (Sign-in)",
    purpose: {
      en: "Identity provider, when you choose to sign in with Google",
      fr: "Fournisseur d'identité, si tu choisis la connexion Google",
    },
    region: null,
  },
];

/**
 * Minimum age.
 *
 * 16, and the reasoning is in the terms rather than only here:
 *
 *  - The GDPR sets the information-society-services consent age between 13 and
 *    16; France sets 15 (art. 7-1, loi Informatique et Libertés). 16 clears the
 *    highest national figure in the EU, so one number is correct everywhere
 *    Blink is reachable rather than a per-country matrix.
 *  - Blink profiles people from photographs and publishes an opt-in ranking.
 *    Several US state laws attach extra duties to processing teenagers' data
 *    for profiling; setting the floor above the teen brackets avoids building a
 *    consent-and-verification apparatus this product has no way to run.
 *  - It is above the COPPA line (13) by a clear margin.
 *
 * This is a defensible policy, not an age *verification* system — Blink asks
 * and states the rule, and acts on credible reports. Verification would mean
 * collecting identity documents, which is more intrusive than the service.
 */
export const MINIMUM_AGE = 16;
