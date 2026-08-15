/**
 * Blink — the legal surfaces: privacy, terms, cookies, legal notice, contact.
 *
 * ## These pages describe the code, not an ideal
 *
 * Every factual claim below was checked against the implementation before it
 * was written, and several of them changed the *product* rather than the page.
 * The previous version said screenshots were "never shared with third parties"
 * while the analysis endpoint forwarded every one of them to an external AI
 * gateway, and offered three support addresses at a domain Blink does not own.
 * A privacy policy that is wrong is worse than none: it is a representation to
 * the reader, and to a regulator.
 *
 * So: no claim here that the repository does not support. Where an answer
 * depends on information only the operator has — the registered entity, the
 * provider regions — the page says so instead of guessing. See
 * `lib/legal-entity.ts`.
 *
 * ## Why the content is data
 *
 * Both languages are built from the same `Section[]` shape and rendered by the
 * same components. Structure therefore cannot drift between them: a section
 * that exists in English exists in French, in the same order, with the same
 * headings. Translating free-form JSX twice is how one language quietly ends
 * up a revision behind.
 */

import { Link } from "react-router-dom";

import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { LanguageToggle } from "@/components/blink/LanguageToggle";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  CONTACT,
  ENTITY,
  MINIMUM_AGE,
  SUBPROCESSORS,
  entityIsPublished,
} from "@/lib/legal-entity";

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

type Block =
  | { kind: "p"; body: React.ReactNode }
  | { kind: "ul"; items: React.ReactNode[] }
  | { kind: "table"; head: string[]; rows: React.ReactNode[][] }
  | { kind: "note"; body: React.ReactNode };

interface Section {
  id: string;
  heading: string;
  blocks: Block[];
}

const p = (body: React.ReactNode): Block => ({ kind: "p", body });
const ul = (items: React.ReactNode[]): Block => ({ kind: "ul", items });
const note = (body: React.ReactNode): Block => ({ kind: "note", body });
const table = (head: string[], rows: React.ReactNode[][]): Block => ({
  kind: "table",
  head,
  rows,
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * The legal shell.
 *
 * Same background, same logo, same type scale as the rest of Blink — a legal
 * page that looks like a different website reads as boilerplate someone pasted
 * in. What changes is density: longer measure, larger body text than the
 * marketing pages, and real spacing between sections, because these are the
 * only pages on the site anyone actually *reads*.
 */
function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />
      <header className="fixed inset-x-0 top-0 z-50 bg-white/[0.03] shadow-[0_1px_0_rgba(175,224,249,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <BlinkLogo width={28} />
            <span className="text-lg font-bold tracking-tight text-white">Blink</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {t.common.backToBlink}
            </Link>
          </div>
        </div>
      </header>
      <main className="px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          {updated && (
            <p className="mt-3 text-xs text-white/35">
              {t.legalPages.lastUpdated} : {updated}
            </p>
          )}
          <div className="mt-10 space-y-10">{children}</div>
        </div>
      </main>
    </div>
  );
}

function SectionList({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`h-${section.id}`}>
          <h2
            id={`h-${section.id}`}
            className="text-lg font-bold tracking-tight text-white sm:text-xl"
          >
            {section.heading}
          </h2>
          <div className="mt-3 space-y-4 text-[0.95rem] leading-relaxed text-white/65">
            {section.blocks.map((block, i) => (
              <BlockView key={i} block={block} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === "p") return <p>{block.body}</p>;

  if (block.kind === "ul") {
    return (
      <ul className="space-y-2 pl-5">
        {block.items.map((item, i) => (
          <li key={i} className="list-disc marker:text-white/25">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "note") {
    return (
      <div className="rounded-2xl border border-blink-sky/15 bg-blink-sky/[0.06] p-4 text-sm leading-relaxed text-white/70">
        {block.body}
      </div>
    );
  }

  // A data table is the honest way to publish a processing record — and the
  // widest thing on these pages by a distance.
  //
  // A four-column table on a 390px screen has two bad answers: shrink it until
  // the retention column is three characters wide, or let it scroll sideways,
  // where the last column is simply never seen. On a privacy notice the column
  // nobody scrolls to is "how long we keep it", which is the one people came
  // for.
  //
  // So the same data is rendered twice, from one source: a real table from
  // `sm` up, and a stacked list below it where every row becomes a labelled
  // block. Nothing is hidden at any width, and no cell is ever clipped.
  const labels = block.head.map((h) => h.trim());

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {block.head.map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  className="py-2 pr-4 align-bottom text-xs font-bold uppercase tracking-wider text-white/40"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 align-top">
                {row.map((cell, j) => (
                  <td key={j} className="py-3 pr-4 text-white/65">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {block.rows.map((row, i) => (
          <li
            key={i}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            {row.map((cell, j) => (
              <div key={j} className={j === 0 ? "" : "mt-3"}>
                {labels[j] && (
                  <p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/35">
                    {labels[j]}
                  </p>
                )}
                <div
                  className={
                    j === 0
                      ? "text-sm font-semibold text-white/85"
                      : "mt-0.5 text-sm text-white/65"
                  }
                >
                  {cell}
                </div>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Inline link styled for running legal prose. */
function A({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-blink-sky underline underline-offset-2 hover:text-white">
      {children}
    </Link>
  );
}

function Mail() {
  return (
    <a
      href={`mailto:${CONTACT.email}`}
      className="text-blink-sky underline underline-offset-2 hover:text-white"
    >
      {CONTACT.email}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

function privacySections(lang: Lang): Section[] {
  const providers = SUBPROCESSORS.map((s) => [
    s.name,
    s.purpose[lang],
    s.region ?? (lang === "fr" ? "À confirmer" : "To be confirmed"),
  ]);

  if (lang === "fr") {
    return [
      {
        id: "resume",
        heading: "En bref",
        blocks: [
          ul([
            "Ta capture d'écran est transmise à un modèle d'IA externe qui la lit, puis n'est pas conservée.",
            "Le texte de l'analyse, lui, est conservé dans ton compte jusqu'à ce que tu le supprimes.",
            "Une empreinte numérique (hash) de la capture est conservée pour empêcher qu'une même image serve deux fois à marquer des points.",
            "Ton profil n'apparaît dans le classement public que si tu l'as activé.",
            "Blink ne vend pas et ne partage pas tes données à des fins publicitaires, et n'utilise aucun traceur publicitaire.",
          ]),
          p(
            <>
              Le détail complet est ci-dessous. Pour toute demande :{" "}
              <Mail />.
            </>,
          ),
        ],
      },
      {
        id: "responsable",
        heading: "1. Responsable de traitement",
        blocks: entityIsPublished()
          ? [
              p(
                `${ENTITY.name} est responsable du traitement des données décrites dans cette politique.`,
              ),
              p(ENTITY.address ?? ""),
              p(
                <>
                  Contact : <Mail />
                </>,
              ),
            ]
          : [
              p(
                <>
                  L'identification complète de l'éditeur figure dans les{" "}
                  <A to="/mentions-legales">mentions légales</A>. Elle est en cours de
                  finalisation et sera publiée dès qu'elle sera disponible.
                </>,
              ),
              p(
                <>
                  En attendant, toute demande relative à tes données peut être adressée à{" "}
                  <Mail />, qui est une adresse réellement relevée.
                </>,
              ),
            ],
      },
      {
        id: "donnees",
        heading: "2. Ce que Blink traite, pourquoi, et sur quelle base",
        blocks: [
          p(
            "Ce tableau correspond à ce que le code fait réellement. Chaque ligne existe parce qu'une donnée est effectivement transmise ou enregistrée.",
          ),
          table(
            ["Donnée", "Finalité", "Base légale", "Conservation"],
            [
              [
                "La capture d'écran envoyée",
                "Produire l'analyse",
                "Exécution du service demandé (art. 6.1.b)",
                "Le temps du traitement uniquement ; non conservée ensuite",
              ],
              [
                "Empreinte (SHA-256) de la capture",
                "Empêcher qu'une même capture rapporte deux fois des points",
                "Intérêt légitime : intégrité du classement (art. 6.1.f)",
                "Jusqu'à la suppression du compte",
              ],
              [
                "Le résultat écrit de l'analyse (score, traits, texte, catégorie, pseudo Instagram lu sur l'image)",
                "Te permettre de retrouver tes analyses",
                "Exécution du service demandé (art. 6.1.b)",
                "Jusqu'à ce que tu la supprimes, ou jusqu'à la suppression du compte",
              ],
              [
                "E-mail et données d'authentification",
                "Créer et sécuriser ton compte",
                "Exécution du service demandé (art. 6.1.b)",
                "Jusqu'à la suppression du compte",
              ],
              [
                "Nom, photo de profil Google",
                "Afficher ton compte, si tu choisis la connexion Google",
                "Exécution du service demandé (art. 6.1.b)",
                "Jusqu'à la suppression du compte",
              ],
              [
                "Profil public : pseudo, nom affiché, avatar, pays, lien Instagram",
                "Apparaître au classement",
                "Consentement — désactivé par défaut, activé par toi (art. 6.1.a)",
                "Jusqu'à désactivation ou suppression du compte",
              ],
              [
                "Historique de score",
                "Mesurer ta progression et le classement",
                "Exécution du service demandé (art. 6.1.b)",
                "Jusqu'à la suppression du compte",
              ],
              [
                "Pseudo suggéré via « Ajouter quelqu'un »",
                "Étudier l'ajout d'un profil au classement",
                "Intérêt légitime : curation du classement (art. 6.1.f)",
                "Jusqu'à traitement de la suggestion",
              ],
            ],
          ),
          note(
            "Blink ne demande ni ne conserve ton mot de passe Instagram, et n'accède jamais à ton compte Instagram. Une capture d'écran suffit.",
          ),
        ],
      },
      {
        id: "tiers",
        heading: "3. Si tu apparais dans l'analyse de quelqu'un d'autre",
        blocks: [
          p(
            "Blink peut analyser la capture du profil d'une autre personne. Cette personne est identifiable — son pseudo, sa photo et son contenu figurent sur l'image — et elle n'a pas déposé la capture elle-même. Nous la traitons comme une personne concernée à part entière.",
          ),
          ul([
            "La base légale est l'intérêt légitime (art. 6.1.f) : permettre à quelqu'un de comprendre comment un profil public est perçu.",
            "Ce qui est conservé est le texte de l'analyse dans le compte de la personne qui l'a lancée, y compris le pseudo lu sur l'image. La capture elle-même n'est pas conservée.",
            "Les conseils d'amélioration sont systématiquement retirés quand le profil n'est pas celui de l'utilisateur : ils ne sont écrits que pour la personne qui gère le compte.",
            "Ces analyses ne sont pas publiées : elles restent privées, dans le compte de leur auteur.",
            "Le profil d'une autre personne n'apparaît jamais au classement public à cause d'une analyse : seul le titulaire d'un compte peut y faire figurer le sien, et seulement en l'activant.",
          ]),
          p(
            <>
              Nous ne pouvons pas informer individuellement une personne analysée : nous n'avons
              aucun moyen de la contacter (art. 14.5.b — effort disproportionné). Cette section
              tient lieu d'information. Si tu apparais dans une analyse et souhaites sa
              suppression ou son opposition, écris à <Mail /> avec le pseudo concerné : nous la
              supprimons sans demander de justification.
            </>,
          ),
        ],
      },
      {
        id: "ia",
        heading: "4. Analyse par IA et décision automatisée",
        blocks: [
          p(
            "L'intégralité de l'analyse — score, traits, catégorie, textes — est produite automatiquement par un modèle d'IA visuelle, sans relecture humaine préalable. C'est un profilage au sens du RGPD : une évaluation automatisée d'aspects personnels à partir d'une image.",
          ),
          p(
            "Ce traitement ne produit aucun effet juridique ni aucun effet comparable au sens de l'article 22 : le résultat ne conditionne l'accès à aucun droit, aucun service, aucun emploi et aucune décision te concernant. C'est une interprétation à visée divertissante et informative.",
          ),
          p(
            "Un score Blink n'est pas une mesure de valeur personnelle, de crédibilité ou d'employabilité, et ne doit jamais être utilisé comme tel — cet usage est interdit par les conditions d'utilisation.",
          ),
          p(
            "Blink n'utilise pas de reconnaissance des émotions et ne catégorise pas les personnes à partir de données biométriques. Le modèle ne déduit pas le genre à partir des traits du visage : il ne le note que lorsqu'il est écrit sur le profil (prénom, pronoms dans la bio), uniquement pour accorder les phrases, et « inconnu » par défaut.",
          ),
        ],
      },
      {
        id: "sous-traitants",
        heading: "5. Destinataires et sous-traitants",
        blocks: [
          p(
            "Blink ne vend pas de données personnelles et n'en partage aucune à des fins publicitaires. Les prestataires suivants traitent des données pour faire fonctionner le service :",
          ),
          table(["Prestataire", "Rôle", "Région d'hébergement"], providers),
          p(
            "Ta capture d'écran est transmise à l'un des fournisseurs de modèles ci-dessus pour être lue. C'est indispensable : c'est ce fournisseur qui produit l'analyse.",
          ),
          note(
            "Les régions d'hébergement et les garanties de transfert hors UE (clauses contractuelles types) sont en cours de vérification auprès de chaque prestataire et seront publiées ici. Tant qu'elles ne le sont pas, considère qu'un transfert hors Union européenne est possible.",
          ),
        ],
      },
      {
        id: "conservation",
        heading: "6. Durées de conservation",
        blocks: [
          ul([
            "Capture d'écran : non conservée après l'analyse.",
            "Analyses, historique de score, profil, compte : jusqu'à ce que tu les supprimes.",
            "Suppression du compte : les données associées sont effacées au moment de la demande.",
            "Journaux techniques des prestataires : selon leurs propres durées, que nous ne maîtrisons pas.",
          ]),
        ],
      },
      {
        id: "droits",
        heading: "7. Tes droits",
        blocks: [
          p(
            "Tu disposes des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition, ainsi que du droit de retirer ton consentement au classement public à tout moment.",
          ),
          ul([
            <>
              <strong className="font-semibold text-white/85">Directement dans l'app</strong> :
              télécharger tes données (JSON), supprimer une analyse, désactiver ton profil
              public, supprimer ton compte — depuis les <A to="/settings">réglages</A>.
            </>,
            <>
              <strong className="font-semibold text-white/85">Par e-mail</strong> : <Mail />.
              Réponse sous un mois maximum.
            </>,
          ]),
          p(
            "Tu peux introduire une réclamation auprès de la CNIL (3 place de Fontenoy, 75007 Paris — cnil.fr) ou de l'autorité de protection des données de ton pays de résidence.",
          ),
        ],
      },
      {
        id: "mineurs",
        heading: "8. Âge minimum",
        blocks: [
          p(
            `Blink est réservé aux personnes de ${MINIMUM_AGE} ans et plus. Nous ne collectons pas sciemment de données concernant des personnes plus jeunes.`,
          ),
          p(
            <>
              Si tu penses qu'un compte appartient à une personne de moins de {MINIMUM_AGE} ans,
              signale-le à <Mail /> : le compte et ses données seront supprimés.
            </>,
          ),
        ],
      },
      {
        id: "etats-unis",
        heading: "9. Résidents des États-Unis",
        blocks: [
          p(
            "Quel que soit ton État de résidence, Blink applique les mêmes règles : pas de vente de données personnelles, pas de partage à des fins de publicité ciblée, pas de publicité comportementale, et les mêmes droits d'accès, de suppression, de correction et de portabilité que ci-dessus, exerçables à la même adresse.",
          ),
          p(
            "Blink ne vend ni ne partage de données personnelles au sens du CCPA/CPRA californien, ni au sens des lois du Colorado, du Connecticut, de Virginie, du Texas, de l'Oregon, du Montana, du Delaware, de l'Iowa, du Tennessee, du New Jersey, du Minnesota, du Maryland, de l'Indiana, du Kentucky, du Nebraska, du New Hampshire ou de Rhode Island. Il n'y a donc pas de mécanisme « Do Not Sell or Share » à proposer : il n'y a rien à désactiver.",
          ),
          p(
            "Blink n'utilise aucun traceur publicitaire ni aucun outil de mesure d'audience tiers. Un signal de préférence de confidentialité (Global Privacy Control) n'a donc rien à désactiver sur ce site ; il est respecté par construction.",
          ),
        ],
      },
      {
        id: "securite",
        heading: "10. Sécurité",
        blocks: [
          ul([
            "Les données sont isolées par utilisateur au niveau de la base (Row Level Security) : une analyse n'est lisible que par le compte qui l'a créée.",
            "Aucune clé secrète n'est présente côté navigateur ; l'appel au modèle d'IA passe par un point d'entrée serveur.",
            "Les échanges sont chiffrés en transit (HTTPS).",
            "Seules les données que tu as explicitement rendues publiques sont lisibles sans être connecté.",
          ]),
        ],
      },
      {
        id: "modifications",
        heading: "11. Modifications",
        blocks: [
          p(
            "Cette politique sera modifiée si le produit change. La date de mise à jour en haut de page indique la version. Un changement substantiel sera signalé dans l'application.",
          ),
        ],
      },
    ];
  }

  return [
    {
      id: "summary",
      heading: "In short",
      blocks: [
        ul([
          "Your screenshot is sent to an external AI model that reads it, and is not kept afterwards.",
          "The written analysis is kept in your account until you delete it.",
          "A fingerprint (hash) of the screenshot is kept, so the same image can't be re-used to score points twice.",
          "Your profile only appears on the public leaderboard if you turned that on.",
          "Blink does not sell or share your data for advertising, and runs no advertising trackers.",
        ]),
        p(
          <>
            The detail is below. For any request: <Mail />.
          </>,
        ),
      ],
    },
    {
      id: "controller",
      heading: "1. Who is responsible",
      blocks: entityIsPublished()
        ? [
            p(`${ENTITY.name} is the controller for the processing described here.`),
            p(ENTITY.address ?? ""),
            p(
              <>
                Contact: <Mail />
              </>,
            ),
          ]
        : [
            p(
              <>
                The operator's full identification is published in the{" "}
                <A to="/legal">legal notice</A>. It is being finalised and will appear there as
                soon as it is available.
              </>,
            ),
            p(
              <>
                In the meantime, any request about your data can be sent to <Mail />, which is a
                real, monitored address.
              </>,
            ),
          ],
    },
    {
      id: "data",
      heading: "2. What Blink processes, why, and on what basis",
      blocks: [
        p(
          "This table matches what the code actually does. Every row exists because something is genuinely transmitted or written down.",
        ),
        table(
          ["Data", "Purpose", "Legal basis", "Retention"],
          [
            [
              "The screenshot you upload",
              "Producing the analysis",
              "Performance of the service you asked for (Art. 6(1)(b))",
              "For the duration of the analysis only; not kept afterwards",
            ],
            [
              "A SHA-256 fingerprint of the screenshot",
              "Stopping the same capture from scoring points twice",
              "Legitimate interest: integrity of the ranking (Art. 6(1)(f))",
              "Until you delete your account",
            ],
            [
              "The written result (score, traits, prose, category, and the Instagram handle read off the image)",
              "Letting you find your analyses again",
              "Performance of the service you asked for (Art. 6(1)(b))",
              "Until you delete it, or delete your account",
            ],
            [
              "Email and authentication data",
              "Creating and securing your account",
              "Performance of the service you asked for (Art. 6(1)(b))",
              "Until you delete your account",
            ],
            [
              "Name and picture from Google",
              "Showing your account, if you sign in with Google",
              "Performance of the service you asked for (Art. 6(1)(b))",
              "Until you delete your account",
            ],
            [
              "Public profile: handle, display name, avatar, country, Instagram link",
              "Appearing on the leaderboard",
              "Consent — off by default, switched on by you (Art. 6(1)(a))",
              "Until you switch it off or delete your account",
            ],
            [
              "Score history",
              "Measuring progress and standings",
              "Performance of the service you asked for (Art. 6(1)(b))",
              "Until you delete your account",
            ],
            [
              "A handle suggested through “Add someone”",
              "Considering a profile for the leaderboard",
              "Legitimate interest: curating the board (Art. 6(1)(f))",
              "Until the suggestion is reviewed",
            ],
          ],
        ),
        note(
          "Blink never asks for, receives or stores your Instagram password, and never connects to your Instagram account. A screenshot is all it uses.",
        ),
      ],
    },
    {
      id: "third-parties",
      heading: "3. If you appear in someone else's analysis",
      blocks: [
        p(
          "Blink can analyze a screenshot of another person's profile. That person is identifiable — their handle, photo and content are in the image — and they did not upload it. We treat them as a data subject in their own right.",
        ),
        ul([
          "The legal basis is legitimate interest (Art. 6(1)(f)): letting someone understand how a public profile comes across.",
          "What is kept is the written analysis in the account of the person who ran it, including the handle read off the image. The screenshot itself is not kept.",
          "Improvement advice is always stripped out when the profile is not the user's own — it is only written for the person who controls the account.",
          "These analyses are not published. They stay private to the account that created them.",
          "Another person's profile never reaches the public leaderboard because of an analysis: only an account holder can put their own profile there, and only by switching it on.",
        ]),
        p(
          <>
            We cannot notify an analyzed person individually — we have no way to contact them
            (Art. 14(5)(b), disproportionate effort). This section is that information. If you
            appear in an analysis and want it deleted, or want to object, email <Mail /> with the
            handle: we delete it without asking you to justify the request.
          </>,
        ),
      ],
    },
    {
      id: "ai",
      heading: "4. AI analysis and automated decisions",
      blocks: [
        p(
          "The entire analysis — score, traits, category, prose — is produced automatically by an AI vision model, with no human reviewing it first. That is profiling under the GDPR: an automated evaluation of personal aspects from an image.",
        ),
        p(
          "It produces no legal effect and nothing similarly significant under Article 22: the result gates no right, no service, no job and no decision about you. It is an interpretation, for entertainment and self-reflection.",
        ),
        p(
          "A Blink score is not a measure of personal worth, credibility or employability, and must never be used as one — the Terms prohibit that use.",
        ),
        p(
          "Blink does not perform emotion recognition and does not categorise people using biometric data. The model does not infer gender from facial features: it records it only when the profile states it in words (first name, pronouns in the bio), solely so sentences agree grammatically, and defaults to unknown.",
        ),
      ],
    },
    {
      id: "processors",
      heading: "5. Who receives the data",
      blocks: [
        p(
          "Blink does not sell personal data and shares none of it for advertising. These providers process data to make the service work:",
        ),
        table(["Provider", "Role", "Hosting region"], providers),
        p(
          "Your screenshot is transmitted to one of the model providers above so it can be read. That transmission is the service: the provider is what produces the analysis.",
        ),
        note(
          "Hosting regions and the transfer safeguards for any processing outside the EU (standard contractual clauses) are being confirmed with each provider and will be published here. Until they are, assume a transfer outside the European Union is possible.",
        ),
      ],
    },
    {
      id: "retention",
      heading: "6. How long things are kept",
      blocks: [
        ul([
          "Screenshot: not kept after the analysis.",
          "Analyses, score history, profile, account: until you delete them.",
          "Account deletion: the associated data is erased at the time of the request.",
          "Providers' technical logs: per their own retention periods, which we do not control.",
        ]),
      ],
    },
    {
      id: "rights",
      heading: "7. Your rights",
      blocks: [
        p(
          "You have the rights of access, rectification, erasure, restriction, portability and objection, and you can withdraw consent to the public leaderboard at any time.",
        ),
        ul([
          <>
            <strong className="font-semibold text-white/85">In the app</strong>: download your
            data (JSON), delete an analysis, switch your public profile off, delete your account
            — from <A to="/settings">Settings</A>.
          </>,
          <>
            <strong className="font-semibold text-white/85">By email</strong>: <Mail />. Answered
            within one month at the latest.
          </>,
        ]),
        p(
          "You can lodge a complaint with the CNIL (3 place de Fontenoy, 75007 Paris — cnil.fr) or with the data protection authority where you live.",
        ),
      ],
    },
    {
      id: "age",
      heading: "8. Minimum age",
      blocks: [
        p(
          `Blink is for people aged ${MINIMUM_AGE} and over. We do not knowingly collect data about anyone younger.`,
        ),
        p(
          <>
            If you believe an account belongs to someone under {MINIMUM_AGE}, report it to{" "}
            <Mail /> and the account and its data will be deleted.
          </>,
        ),
      ],
    },
    {
      id: "us",
      heading: "9. United States residents",
      blocks: [
        p(
          "Whichever state you live in, Blink applies the same rules: no sale of personal information, no sharing for targeted advertising, no behavioural advertising, and the same access, deletion, correction and portability rights described above, exercisable at the same address.",
        ),
        p(
          "Blink does not sell or share personal information as those terms are defined by the California CCPA/CPRA, or by the laws of Colorado, Connecticut, Virginia, Texas, Oregon, Montana, Delaware, Iowa, Tennessee, New Jersey, Minnesota, Maryland, Indiana, Kentucky, Nebraska, New Hampshire or Rhode Island. There is therefore no “Do Not Sell or Share My Personal Information” control to offer: there is nothing to switch off.",
        ),
        p(
          "Blink runs no advertising trackers and no third-party analytics. An opt-out preference signal such as Global Privacy Control has nothing to disable on this site; it is honoured by construction.",
        ),
      ],
    },
    {
      id: "security",
      heading: "10. Security",
      blocks: [
        ul([
          "Data is isolated per user in the database (Row Level Security): an analysis is readable only by the account that created it.",
          "No secret key is present in the browser; the AI model is called through a server-side endpoint.",
          "Traffic is encrypted in transit (HTTPS).",
          "Only what you explicitly made public is readable without signing in.",
        ]),
      ],
    },
    {
      id: "changes",
      heading: "11. Changes",
      blocks: [
        p(
          "This policy will change when the product does. The date at the top identifies the version, and a substantive change will be flagged in the app.",
        ),
      ],
    },
  ];
}

export function PrivacyPolicy() {
  const { lang, t } = useI18n();
  return (
    <LegalLayout title={t.legalPages.privacy} updated={t.legalPages.august2026}>
      <SectionList sections={privacySections(lang)} />
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

function termsSections(lang: Lang): Section[] {
  if (lang === "fr") {
    return [
      {
        id: "objet",
        heading: "1. Objet et acceptation",
        blocks: [
          p(
            "Ces conditions régissent l'utilisation de Blink. En utilisant le service, tu les acceptes. Si tu n'es pas d'accord, n'utilise pas Blink.",
          ),
          p(
            <>
              L'éditeur du service est identifié dans les{" "}
              <A to="/mentions-legales">mentions légales</A>.
            </>,
          ),
        ],
      },
      {
        id: "age",
        heading: "2. Âge requis",
        blocks: [
          p(
            `Blink est réservé aux personnes de ${MINIMUM_AGE} ans et plus. En créant un compte, tu déclares avoir au moins ${MINIMUM_AGE} ans.`,
          ),
          p(
            "Nous ne vérifions pas l'âge par pièce d'identité — ce serait plus intrusif que le service lui-même — mais nous supprimons tout compte signalé comme appartenant à une personne plus jeune.",
          ),
        ],
      },
      {
        id: "service",
        heading: "3. Ce que Blink est, et ce qu'il n'est pas",
        blocks: [
          p(
            "Blink lit une capture d'écran de profil Instagram et produit, au moyen d'un modèle d'IA, une interprétation de la première impression que ce profil donne : un score, des traits, des catégories et des textes.",
          ),
          ul([
            "C'est un divertissement et un outil de réflexion personnelle. Ce n'est ni un conseil professionnel, ni une évaluation psychologique, ni une mesure de valeur personnelle.",
            "Les résultats sont générés automatiquement par une IA, sans relecture humaine. Ils peuvent être inexacts, incohérents d'une analyse à l'autre, ou simplement se tromper.",
            "Le score dépend de ce qui est visible sur une image. Une autre capture du même profil peut donner un autre résultat.",
            "Blink n'est affilié ni à Instagram ni à Meta.",
          ]),
          p(
            "Il est interdit d'utiliser un résultat Blink pour décider d'un recrutement, d'un logement, d'un crédit, d'une assurance, d'une admission ou de toute autre décision affectant une personne.",
          ),
        ],
      },
      {
        id: "compte",
        heading: "4. Ton compte",
        blocks: [
          ul([
            "Tu es responsable de la confidentialité de tes identifiants et de l'activité de ton compte.",
            "Un compte est personnel. Ne le partage pas.",
            "Tu peux supprimer ton compte à tout moment depuis les réglages.",
          ]),
        ],
      },
      {
        id: "usage",
        heading: "5. Usages interdits",
        blocks: [
          p("Tu t'engages à ne pas utiliser Blink pour :"),
          ul([
            "harceler, humilier, intimider ou diffamer quelqu'un ;",
            "analyser le profil d'une personne mineure ;",
            "envoyer des images à caractère sexuel, violent, haineux ou illégal ;",
            "publier ou diffuser l'analyse d'une autre personne dans le but de lui nuire ;",
            "prendre une décision concernant une personne sur la base d'un score (emploi, logement, crédit, etc.) ;",
            "contourner les limites techniques, automatiser l'accès au service ou en extraire massivement les données.",
          ]),
          p(
            "Un compte utilisé pour ces usages peut être suspendu ou supprimé, sans préavis en cas d'atteinte à une personne.",
          ),
        ],
      },
      {
        id: "tiers",
        heading: "6. Analyser le profil de quelqu'un d'autre",
        blocks: [
          p(
            "Blink accepte la capture d'un autre profil public. Tu restes responsable de ce que tu envoies et de l'usage que tu en fais.",
          ),
          ul([
            "Les conseils d'amélioration sont automatiquement retirés : ils ne s'adressent qu'au titulaire du compte analysé.",
            "Ces analyses restent privées dans ton compte ; elles ne sont pas publiées.",
            "Une personne analysée peut demander la suppression de l'analyse la concernant. Nous y donnons suite.",
          ]),
        ],
      },
      {
        id: "contenu",
        heading: "7. Contenus et propriété intellectuelle",
        blocks: [
          ul([
            "Tu conserves tes droits sur les images que tu envoies. Tu nous accordes uniquement le droit de les traiter pour produire ton analyse.",
            "Le texte d'une analyse t'est fourni pour ton usage personnel, y compris son partage.",
            "Le nom Blink, son logo, son design et son code restent la propriété de l'éditeur.",
          ]),
        ],
      },
      {
        id: "classement",
        heading: "8. Profil public et classement",
        blocks: [
          ul([
            "Le classement est facultatif et désactivé par défaut. Rien n'y apparaît sans activation explicite de ta part.",
            "Une fois activé, ton pseudo, ton nom affiché, ton avatar, ton pays, ton score et ton lien Instagram deviennent visibles publiquement.",
            "Tu peux te retirer à tout moment depuis les réglages.",
            "Le classement mesure la lisibilité d'un profil, jamais la popularité : ni le nombre d'abonnés, ni la certification, ni la portée n'entrent dans le calcul.",
            "Une progression n'est comptée que sur une nouvelle capture de ton propre profil.",
          ]),
        ],
      },
      {
        id: "prix",
        heading: "9. Prix",
        blocks: [
          p(
            "Blink est aujourd'hui gratuit. Aucune offre payante, aucun abonnement et aucun moyen de paiement ne sont proposés dans le service à ce jour.",
          ),
          p(
            "Si une offre payante est introduite, son prix total, sa durée, ses conditions de reconduction et de résiliation, ainsi que les règles applicables au droit de rétractation pour les contenus et services numériques, seront affichés avant tout paiement et feront l'objet de conditions de vente distinctes.",
          ),
        ],
      },
      {
        id: "responsabilite",
        heading: "10. Garanties et responsabilité",
        blocks: [
          p(
            "Blink est fourni en l'état, sans garantie de disponibilité continue ni d'exactitude des résultats.",
          ),
          p(
            "Rien dans ces conditions n'écarte la responsabilité de l'éditeur en cas de faute lourde ou intentionnelle, de dommage corporel, ni les garanties légales de conformité et des vices cachés dont bénéficient les consommateurs.",
          ),
          p(
            "Dans les limites permises par la loi, l'éditeur n'est pas responsable des décisions prises sur la base d'une analyse, ni de l'usage qu'un tiers fait d'un résultat partagé.",
          ),
        ],
      },
      {
        id: "resiliation",
        heading: "11. Fin de l'utilisation",
        blocks: [
          p(
            "Tu peux cesser d'utiliser Blink et supprimer ton compte à tout moment. Nous pouvons suspendre un compte en cas de manquement à l'article 5, ou fermer le service en informant les utilisateurs avec un préavis raisonnable.",
          ),
        ],
      },
      {
        id: "droit",
        heading: "12. Droit applicable et litiges",
        blocks: [
          p(
            "Ces conditions sont soumises au droit français. Si tu es consommateur, tu conserves le bénéfice des dispositions impératives du droit de ton pays de résidence et la possibilité de saisir les tribunaux de ce pays.",
          ),
          p(
            <>
              En cas de litige, écris d'abord à <Mail /> : la plupart se règlent ainsi. Un
              consommateur peut ensuite recourir gratuitement à un médiateur de la consommation.
              Le médiateur compétent sera désigné dans les{" "}
              <A to="/mentions-legales">mentions légales</A> dès l'adhésion de l'éditeur à un
              dispositif de médiation.
            </>,
          ),
        ],
      },
      {
        id: "modifs",
        heading: "13. Modification des conditions",
        blocks: [
          p(
            "Ces conditions peuvent évoluer. Une modification substantielle sera annoncée dans l'application, et la date de mise à jour en haut de page fait foi.",
          ),
        ],
      },
    ];
  }

  return [
    {
      id: "acceptance",
      heading: "1. Scope and acceptance",
      blocks: [
        p(
          "These terms govern your use of Blink. By using the service you accept them. If you do not agree, do not use Blink.",
        ),
        p(
          <>
            The operator of the service is identified in the <A to="/legal">legal notice</A>.
          </>,
        ),
      ],
    },
    {
      id: "age",
      heading: "2. Age requirement",
      blocks: [
        p(
          `Blink is for people aged ${MINIMUM_AGE} and over. By creating an account you confirm you are at least ${MINIMUM_AGE}.`,
        ),
        p(
          "We do not verify age with identity documents — that would be more intrusive than the service itself — but we delete any account reported as belonging to someone younger.",
        ),
      ],
    },
    {
      id: "service",
      heading: "3. What Blink is, and what it is not",
      blocks: [
        p(
          "Blink reads a screenshot of an Instagram profile and uses an AI model to produce an interpretation of the first impression it makes: a score, traits, categories and written text.",
        ),
        ul([
          "It is entertainment and a self-reflection tool. It is not professional advice, not a psychological assessment, and not a measure of personal worth.",
          "Results are generated automatically by an AI, with no human review. They can be inaccurate, inconsistent between runs, or simply wrong.",
          "The score depends on what is visible in one image. A different screenshot of the same profile can produce a different result.",
          "Blink is not affiliated with Instagram or Meta.",
        ]),
        p(
          "You must not use a Blink result to decide anything about a person — hiring, housing, credit, insurance, admission, or any similar decision.",
        ),
      ],
    },
    {
      id: "account",
      heading: "4. Your account",
      blocks: [
        ul([
          "You are responsible for keeping your credentials confidential and for activity on your account.",
          "Accounts are personal. Do not share them.",
          "You can delete your account at any time from Settings.",
        ]),
      ],
    },
    {
      id: "use",
      heading: "5. Prohibited use",
      blocks: [
        p("You agree not to use Blink to:"),
        ul([
          "harass, humiliate, intimidate or defame anyone;",
          "analyze the profile of a minor;",
          "upload sexual, violent, hateful or illegal imagery;",
          "publish or circulate someone else's analysis in order to harm them;",
          "make a decision about a person based on a score (employment, housing, credit and the like);",
          "circumvent technical limits, automate access, or extract the service's data in bulk.",
        ]),
        p(
          "An account used this way can be suspended or deleted — without notice where someone is being harmed.",
        ),
      ],
    },
    {
      id: "third-party",
      heading: "6. Analyzing someone else's profile",
      blocks: [
        p(
          "Blink accepts a screenshot of another public profile. You remain responsible for what you upload and what you do with the result.",
        ),
        ul([
          "Improvement advice is automatically removed: it is written only for the person who controls the account being analyzed.",
          "These analyses stay private in your account; they are not published.",
          "A person who has been analyzed may ask for that analysis to be deleted. We act on that.",
        ]),
      ],
    },
    {
      id: "content",
      heading: "7. Content and intellectual property",
      blocks: [
        ul([
          "You keep your rights in the images you upload. You grant us only what is needed to process them and produce your analysis.",
          "The text of an analysis is provided for your own use, including sharing it.",
          "The Blink name, logo, design and code remain the operator's property.",
        ]),
      ],
    },
    {
      id: "leaderboard",
      heading: "8. Public profile and leaderboard",
      blocks: [
        ul([
          "The leaderboard is optional and off by default. Nothing appears there unless you switch it on.",
          "Once on, your handle, display name, avatar, country, score and Instagram link are publicly visible.",
          "You can leave at any time from Settings.",
          "The board measures how well a profile reads, never popularity: follower count, verification and reach are not part of the calculation.",
          "Progress is only counted from a new screenshot of your own profile.",
        ]),
      ],
    },
    {
      id: "price",
      heading: "9. Price",
      blocks: [
        p(
          "Blink is free today. There is no paid plan, no subscription and no payment method in the service at this time.",
        ),
        p(
          "If a paid offer is introduced, its total price, duration, renewal and cancellation terms, and the rules on the right of withdrawal for digital content and services will be shown before any payment and set out in separate terms of sale.",
        ),
      ],
    },
    {
      id: "liability",
      heading: "10. Warranties and liability",
      blocks: [
        p(
          "Blink is provided as is, without a guarantee of continuous availability or of accurate results.",
        ),
        p(
          "Nothing in these terms excludes the operator's liability for gross negligence or wilful misconduct, for personal injury, or the statutory guarantees consumers have of conformity and against hidden defects.",
        ),
        p(
          "To the extent the law allows, the operator is not liable for decisions made on the basis of an analysis, nor for what a third party does with a result you shared.",
        ),
      ],
    },
    {
      id: "termination",
      heading: "11. Ending your use",
      blocks: [
        p(
          "You can stop using Blink and delete your account at any time. We may suspend an account that breaches section 5, or close the service with reasonable notice to users.",
        ),
      ],
    },
    {
      id: "law",
      heading: "12. Governing law and disputes",
      blocks: [
        p(
          "These terms are governed by French law. If you are a consumer, you keep the protection of the mandatory rules of your country of residence and the right to bring proceedings in its courts.",
        ),
        p(
          <>
            If something goes wrong, email <Mail /> first — most things are resolved that way. A
            consumer may then use a consumer mediator free of charge. The competent mediator will
            be named in the <A to="/legal">legal notice</A> once the operator has joined a
            mediation scheme.
          </>,
        ),
      ],
    },
    {
      id: "changes",
      heading: "13. Changes to these terms",
      blocks: [
        p(
          "These terms may change. A substantive change will be announced in the app, and the date at the top identifies the version.",
        ),
      ],
    },
  ];
}

export function TermsOfService() {
  const { lang, t } = useI18n();
  return (
    <LegalLayout title={t.legalPages.terms} updated={t.legalPages.august2026}>
      <SectionList sections={termsSections(lang)} />
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

/**
 * The cookie page is the result of an actual runtime audit, not a template.
 *
 * What the audit found: Blink sets no cookies of its own, loads no analytics,
 * no pixel, no embed and no third-party script. Two `localStorage` keys exist —
 * the Supabase session, and the language choice — both written only as a direct
 * consequence of something the visitor asked for.
 *
 * Under the ePrivacy rules as applied by the CNIL, storage strictly necessary
 * to deliver a service the user explicitly requested is exempt from consent,
 * and a stored language preference is the CNIL's own example of an exempt
 * preference. So there is no consent banner here — not as an omission, but
 * because interrupting every visitor to ask about storage that is exempt would
 * be theatre. If a non-essential tracker is ever added, this page and a real
 * consent mechanism have to arrive with it.
 */
function cookieSections(lang: Lang): Section[] {
  if (lang === "fr") {
    return [
      {
        id: "resume",
        heading: "Pourquoi il n'y a pas de bandeau cookies",
        blocks: [
          p(
            "Blink ne dépose aucun cookie, n'utilise aucun outil de mesure d'audience, aucun pixel publicitaire, aucun script tiers et aucun contenu embarqué.",
          ),
          p(
            "Il reste deux informations stockées dans ton navigateur, toutes deux strictement nécessaires au service que tu demandes. Ce type de stockage est exempté de consentement : t'interrompre pour te le demander n'apporterait rien.",
          ),
        ],
      },
      {
        id: "liste",
        heading: "Ce qui est stocké",
        blocks: [
          table(
            ["Clé", "Type", "Rôle", "Durée"],
            [
              [
                "sb-…-auth-token",
                "localStorage",
                "Te maintenir connecté d'une page à l'autre. Déposé uniquement après connexion.",
                "Jusqu'à la déconnexion ou l'effacement du navigateur",
              ],
              [
                "blink.lang",
                "localStorage",
                "Retenir la langue que tu as choisie. Écrit uniquement si tu changes de langue toi-même.",
                "Jusqu'à l'effacement du navigateur",
              ],
            ],
          ),
          p(
            "Ces données restent sur ton appareil et ne sont transmises à personne à des fins publicitaires.",
          ),
        ],
      },
      {
        id: "controle",
        heading: "Comment les supprimer",
        blocks: [
          ul([
            "Te déconnecter supprime la session.",
            "Vider le stockage local du site dans les réglages de ton navigateur supprime les deux.",
            "Aucun des deux n'est nécessaire pour lire les pages publiques du site.",
          ]),
        ],
      },
      {
        id: "evolution",
        heading: "Si cela change",
        blocks: [
          p(
            "Si un outil de mesure ou un traceur non essentiel est ajouté un jour, il ne sera déposé qu'après ton consentement, refuser sera aussi simple qu'accepter, et cette page sera mise à jour au même moment.",
          ),
        ],
      },
    ];
  }

  return [
    {
      id: "summary",
      heading: "Why there is no cookie banner",
      blocks: [
        p(
          "Blink sets no cookies, runs no analytics, no advertising pixel, no third-party script and no embedded content.",
        ),
        p(
          "Two things are stored in your browser, both strictly necessary to the service you asked for. Storage of that kind is exempt from consent: interrupting every visitor to ask about it would achieve nothing.",
        ),
      ],
    },
    {
      id: "list",
      heading: "What is stored",
      blocks: [
        table(
          ["Key", "Type", "Role", "Lifetime"],
          [
            [
              "sb-…-auth-token",
              "localStorage",
              "Keeps you signed in between pages. Written only after you sign in.",
              "Until you sign out or clear your browser",
            ],
            [
              "blink.lang",
              "localStorage",
              "Remembers the language you picked. Written only if you change it yourself.",
              "Until you clear your browser",
            ],
          ],
        ),
        p("Both stay on your device and are not shared with anyone for advertising."),
      ],
    },
    {
      id: "control",
      heading: "How to remove them",
      blocks: [
        ul([
          "Signing out removes the session.",
          "Clearing the site's local storage in your browser settings removes both.",
          "Neither is needed to read the public pages of the site.",
        ]),
      ],
    },
    {
      id: "future",
      heading: "If this changes",
      blocks: [
        p(
          "If a non-essential tracker or analytics tool is ever added, it will only load after you consent, refusing will be as easy as accepting, and this page will be updated at the same time.",
        ),
      ],
    },
  ];
}

export function CookiePolicy() {
  const { lang, t } = useI18n();
  return (
    <LegalLayout title={t.legalPages.cookies} updated={t.legalPages.august2026}>
      <SectionList sections={cookieSections(lang)} />
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// Legal notice (mentions légales)
// ---------------------------------------------------------------------------

/**
 * The identification page French law requires, and the one a payment provider
 * reads to check a business is real.
 *
 * When `ENTITY` is unfilled it says so, in plain words, rather than rendering
 * an official-looking block of invented registration data. An empty field is a
 * missing formality; a fabricated SIREN is a false statement.
 */
function noticeSections(lang: Lang): Section[] {
  const fr = lang === "fr";
  const rows: React.ReactNode[][] = [];

  const row = (label: string, value: string | null) => {
    rows.push([label, value ?? (fr ? "À compléter" : "To be completed")]);
  };

  row(fr ? "Éditeur du site" : "Site operator", ENTITY.name);
  row(fr ? "Forme juridique" : "Legal form", ENTITY.legalForm);
  row(fr ? "Adresse" : "Address", ENTITY.address);
  row(fr ? "SIREN / SIRET" : "Registration number", ENTITY.registrationNumber);
  row(fr ? "RCS" : "Companies register", ENTITY.rcsCity);
  row(fr ? "Numéro de TVA" : "VAT number", ENTITY.vatNumber);
  row(fr ? "Capital social" : "Share capital", ENTITY.shareCapital);
  row(
    fr ? "Directeur de la publication" : "Publication director",
    ENTITY.publicationDirector,
  );

  if (fr) {
    return [
      {
        id: "editeur",
        heading: "Éditeur",
        blocks: [
          ...(entityIsPublished()
            ? []
            : [
                note(
                  "L'identification légale de l'éditeur est en cours de finalisation et sera publiée ici. Aucune information n'est inventée en attendant : les champs non renseignés sont indiqués comme tels.",
                ),
              ]),
          table([" ", " "], rows),
          p(
            <>
              Contact : <Mail />
            </>,
          ),
        ],
      },
      {
        id: "hebergeur",
        heading: "Hébergement",
        blocks: [
          p(
            "Le site est hébergé par Rork. Les données de compte, la base de données et le stockage de fichiers sont opérés par Supabase.",
          ),
          note(
            "Les raisons sociales et adresses complètes des hébergeurs, telles qu'exigées par la LCEN, seront ajoutées ici une fois vérifiées auprès de chaque prestataire.",
          ),
        ],
      },
      {
        id: "ia",
        heading: "Contenus générés par IA",
        blocks: [
          p(
            "Les analyses proposées par Blink — score, traits, catégories et textes — sont générées automatiquement par un modèle d'intelligence artificielle, sans relecture humaine préalable. Elles sont signalées comme telles dans le produit.",
          ),
        ],
      },
      {
        id: "propriete",
        heading: "Propriété intellectuelle",
        blocks: [
          p(
            "Le nom Blink, son logo, son identité visuelle, ses textes et son code sont protégés. Toute reproduction sans autorisation est interdite.",
          ),
        ],
      },
      {
        id: "donnees",
        heading: "Données personnelles",
        blocks: [
          p(
            <>
              Le traitement des données personnelles est décrit dans la{" "}
              <A to="/privacy">politique de confidentialité</A>. Le stockage dans le navigateur
              est détaillé dans la page <A to="/cookies">cookies et stockage</A>.
            </>,
          ),
        ],
      },
    ];
  }

  return [
    {
      id: "operator",
      heading: "Operator",
      blocks: [
        ...(entityIsPublished()
          ? []
          : [
              note(
                "The operator's legal identification is being finalised and will be published here. Nothing is invented in the meantime: fields that are not yet known are marked as such.",
              ),
            ]),
        table([" ", " "], rows),
        p(
          <>
            Contact: <Mail />
          </>,
        ),
      ],
    },
    {
      id: "hosting",
      heading: "Hosting",
      blocks: [
        p(
          "The site is hosted by Rork. Account data, the database and file storage are operated by Supabase.",
        ),
        note(
          "The hosts' full corporate names and addresses, as required by French law, will be added here once confirmed with each provider.",
        ),
      ],
    },
    {
      id: "ai",
      heading: "AI-generated content",
      blocks: [
        p(
          "Blink's analyses — score, traits, categories and prose — are generated automatically by an artificial intelligence model, with no prior human review. They are labelled as such in the product.",
        ),
      ],
    },
    {
      id: "ip",
      heading: "Intellectual property",
      blocks: [
        p(
          "The Blink name, logo, visual identity, text and code are protected. Reproduction without permission is prohibited.",
        ),
      ],
    },
    {
      id: "data",
      heading: "Personal data",
      blocks: [
        p(
          <>
            Processing of personal data is described in the <A to="/privacy">Privacy Policy</A>.
            Browser storage is detailed on the <A to="/cookies">cookies and storage</A> page.
          </>,
        ),
      ],
    },
  ];
}

export function LegalNotice() {
  const { lang, t } = useI18n();
  return (
    <LegalLayout title={t.legalPages.legalNotice} updated={t.legalPages.august2026}>
      <SectionList sections={noticeSections(lang)} />
    </LegalLayout>
  );
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export function ContactPage() {
  const { lang, t } = useI18n();
  const fr = lang === "fr";

  return (
    <LegalLayout title={t.legalPages.contact}>
      <SectionList
        sections={[
          {
            id: "email",
            heading: fr ? "Nous écrire" : "Get in touch",
            blocks: [
              p(
                fr
                  ? "Une seule adresse, relevée par une personne réelle. Support, questions sur tes données, signalements et demandes juridiques arrivent tous au même endroit."
                  : "One address, read by a real person. Support, questions about your data, reports and legal requests all arrive in the same place.",
              ),
              p(
                <span className="text-lg font-bold text-white">
                  <Mail />
                </span>,
              ),
              ul(
                fr
                  ? [
                      `Support et questions générales : réponse sous ${CONTACT.responseDays} jours ouvrés en général.`,
                      `Demandes relatives à tes données personnelles : réponse sous ${CONTACT.privacyResponseMonths} mois maximum, comme l'exige le RGPD.`,
                      "Signalement d'une analyse te concernant : précise le pseudo, nous la supprimons.",
                    ]
                  : [
                      `Support and general questions: usually answered within ${CONTACT.responseDays} working days.`,
                      `Requests about your personal data: answered within ${CONTACT.privacyResponseMonths} month at the latest, as the GDPR requires.`,
                      "Reporting an analysis that features you: give us the handle and we delete it.",
                    ],
              ),
            ],
          },
          {
            id: "self",
            heading: fr ? "À faire toi-même, tout de suite" : "Things you can do right now",
            blocks: [
              ul([
                <>
                  {fr ? "Télécharger toutes tes données depuis les " : "Download all your data from "}
                  <A to="/settings">{fr ? "réglages" : "Settings"}</A>.
                </>,
                <>
                  {fr ? "Supprimer ton compte et tes données depuis les " : "Delete your account and data from "}
                  <A to="/settings">{fr ? "réglages" : "Settings"}</A>.
                </>,
                <>
                  {fr ? "Lire ce que Blink conserve exactement : " : "Read exactly what Blink keeps: "}
                  <A to="/privacy">
                    {fr ? "politique de confidentialité" : "Privacy Policy"}
                  </A>
                  .
                </>,
              ]),
            ],
          },
          {
            id: "operator",
            heading: fr ? "Identification de l'éditeur" : "Who operates Blink",
            blocks: [
              p(
                <>
                  {fr ? "Voir les " : "See the "}
                  <A to={fr ? "/mentions-legales" : "/legal"}>
                    {fr ? "mentions légales" : "legal notice"}
                  </A>
                  .
                </>,
              ),
            ],
          },
        ]}
      />
    </LegalLayout>
  );
}
