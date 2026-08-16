/**
 * Blink — who legally operates this site.
 *
 * ## The situation this file encodes
 *
 * Blink is run by a private individual, not a company. There is no registered
 * business, no SIREN, no VAT number, no share capital and no RCS entry — and
 * the service is free. That is a real and perfectly ordinary legal position,
 * not a gap to be papered over with a plausible-looking company block.
 *
 * French law recognises it directly. Under the LCEN (art. 6 III-2), a person
 * publishing a site **non-professionally** may keep their name and home address
 * off the page, provided they have given those details to their host and the
 * site publishes the host's identity instead. That is the regime `nonProfessional`
 * selects, and it is what makes the legal notice *complete* today rather than a
 * page of "to be completed" fields.
 *
 * ## What changes when Blink starts charging
 *
 * The moment there is a paid plan, the activity becomes professional, the
 * exemption no longer applies, and the operator must publish full
 * identification — name (or company), address, registration number, VAT status
 * where applicable, and a named publication director. Switching `mode` to
 * `"professional"` makes the legal notice demand exactly those fields, and
 * nothing else in the app needs to change.
 *
 * Nothing here is ever invented. A field that is unknown stays `null` and the
 * page says so.
 */

export type OperatorMode = "nonProfessional" | "professional";

export interface LegalEntity {
  /**
   * Which regime applies.
   *
   * `nonProfessional` — an individual, no business activity, nothing sold.
   *   Personal details are lodged with the host rather than published.
   * `professional` — anything sold, or a registered business. Full public
   *   identification required.
   */
  mode: OperatorMode;

  /** Registered name of the person or company. Published only when professional. */
  name: string | null;
  /** e.g. "Entrepreneur individuel", "SASU", "SAS". Professional only. */
  legalForm: string | null;
  /** Full registered address. Professional only. */
  address: string | null;
  /** SIREN (9 digits) or SIRET (14 digits). */
  registrationNumber: string | null;
  /** RCS city, when registered with one. */
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
 * The current operator.
 *
 * TODO(blink): when a paid plan launches, set `mode: "professional"` and fill
 * in the identification fields. Until then every one of them is legitimately
 * absent, and the legal notice explains why rather than showing blanks.
 */
export const ENTITY: LegalEntity = {
  mode: "nonProfessional",
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

/**
 * Is the notice complete for the regime that applies?
 *
 * A non-professional site is complete once the host is published — the
 * operator's own details are lodged with the host, not with the reader. A
 * professional one needs the full identification block.
 */
export function entityIsPublished(entity: LegalEntity = ENTITY): boolean {
  if (entity.mode === "nonProfessional") return hostIsPublished();
  return Boolean(entity.name && entity.address && entity.registrationNumber);
}

/**
 * The host, whose identity a French site must publish in every case.
 *
 * This is the one piece the non-professional regime cannot do without, and it
 * is a fact about a third party — so it is left null until confirmed from the
 * provider rather than guessed from a website footer.
 *
 * TODO(blink): fill in from Rork's own legal notice / terms.
 */
export interface Host {
  /** Trading name, as shown to users. Known. */
  name: string;
  /** Registered corporate name. */
  legalName: string | null;
  /** Registered address. */
  address: string | null;
  /** What they actually host for Blink. */
  role: { en: string; fr: string };
}

export const HOSTS: Host[] = [
  {
    name: "Rork",
    legalName: null,
    address: null,
    role: {
      en: "Hosts the website and operates the gateway that reaches the AI model",
      fr: "Héberge le site et opère la passerelle vers le modèle d'IA",
    },
  },
  {
    name: "Supabase",
    legalName: null,
    address: null,
    role: {
      en: "Hosts the database, accounts and file storage",
      fr: "Héberge la base de données, les comptes et le stockage de fichiers",
    },
  },
];

/** True once at least the primary host is fully identified. */
export function hostIsPublished(): boolean {
  return HOSTS.every((h) => h.legalName && h.address);
}

/**
 * Contact addresses.
 *
 * One real, monitored mailbox rather than three invented aliases. The page
 * previously advertised `support@`, `privacy@` and `hello@` at a domain Blink
 * does not operate — mail to any of them would have bounced, which for a
 * privacy request is a compliance failure and for a payment provider is
 * unreachable support.
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
 * Whether Blink currently sells anything.
 *
 * Read by the terms and the legal notice so the free-product statement can
 * never drift from reality: there is no payment code in this repository, no
 * price and no checkout. Flipping this to `true` without adding terms of sale
 * is meant to be uncomfortable — the pages will start asking for them.
 */
export const SELLS_ANYTHING = false;

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
