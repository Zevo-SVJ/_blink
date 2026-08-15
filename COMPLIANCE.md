# Blink — legal, privacy, AI and payment-readiness audit

**Date:** August 2026
**Scope:** the code in this repository and the behaviour it produces.
**Status:** implemented where the repository allows; everything else is listed
as an open item with the decision or information it needs.

> This is an engineering audit, not legal advice, and nothing here says Blink is
> "compliant". It says: here is what the product actually does, here is what the
> law asks of that, here is what was changed, and here is what is still open.
> A qualified lawyer should review the result before it is relied on.

---

## 1. What Blink actually does with data

Traced from the code, not from the previous privacy policy.

```
you → landing (static, no trackers)
    → /analyze  upload a screenshot
       └ resized in the browser  (lib/resize.ts)
       └ POST base64 → Supabase Edge Function  (lib/analysis.ts)
            └ → toolkit.rork.com  (AI gateway)
                 └ → google/gemini-3-flash, or openai/gpt-4.1 on failure
            └ result validated, owner-advice stripped for third parties
    → sign in  (Supabase Auth: email/password or Google)
    → save
       ├ analyses          the written result + the handle read off the image
       ├ score_history     score, category, SHA-256 of the screenshot
       └ blink_profiles    the rankable projection (private until opted in)
    → Ranks / public profile  only for profiles with is_public = true
```

**Findings that mattered**

| # | Finding | Status |
|---|---|---|
| 1 | Site claimed screenshots were "never shared with third parties". Every screenshot is sent to an external AI provider — that transmission is the service. | **Fixed** (wording, in 4 places) |
| 2 | Site claimed screenshots were "never stored". A SHA-256 of each one is kept in `score_history` as an anti-replay fingerprint. | **Fixed** (disclosed, wording changed to "not kept") |
| 3 | "Delete account" deleted one row from `profiles`. Analyses, score history, public profile, avatar and the login all survived. | **Fixed** (`delete_my_account`, migration 0006) |
| 4 | `score_history` and `blink_profiles` had no RLS delete policy — the user could not erase them even in principle. | **Fixed** (migration 0006) |
| 5 | Three support addresses at `blink.app`, a domain Blink does not operate. Mail to any of them bounced. | **Fixed** (one real address) |
| 6 | 34 invented testimonials presented as "what people said after running their own profile". | **Fixed** (labelled, heading rewritten) |
| 7 | The model inferred `subjectGender` from photographs. | **Fixed** (text-only inference; see §4) |
| 8 | No AI-generated disclosure on output. | **Fixed** (result notice + footer + FAQ) |
| 9 | No mentions légales. | **Added**, pending operator identity |
| 10 | No data export. | **Added** (JSON, Settings) |
| 11 | `og:url` pointed at `https://blink.app`. | **Fixed** |

---

## 2. France (LCEN, consumer law)

| Requirement | Verdict | Note |
|---|---|---|
| Mentions légales page, reachable site-wide | **PARTIAL** | Page exists at `/mentions-legales` and `/legal`, linked in the footer. Operator identity is **pending** — see §11. |
| Host name and address | **PARTIAL** | Named (Rork, Supabase); full corporate names and addresses pending confirmation. |
| Directeur de la publication | **OPEN** | Needs a named person. |
| Privacy policy | **PASS** | Rewritten from the implementation. |
| Cookie information | **PASS** | Real audit; see §8. |
| CGU / Terms | **PASS** | Rewritten to match the product. |
| CGV / refunds / withdrawal | **N/A today** | No paid plan exists in the code. Terms say so explicitly. Becomes required the moment a price is charged — see §10. |
| Contact information | **PASS** | `zevo.flcs@gmail.com`, stated response times. |
| Review transparency (art. L111-7-2) | **PASS** | Testimonials are labelled as written examples, not verified reviews. |

## 3. GDPR

| Area | Verdict | Note |
|---|---|---|
| Lawful basis per activity | **PASS** | Published as a table: 6(1)(b) for the service, 6(1)(a) for the public leaderboard, 6(1)(f) for anti-replay and suggestions. |
| Transparency | **PASS** | Data map, retention and recipients published. |
| Data minimisation | **PASS** | Screenshot is transient; only a hash and the written result persist. |
| Storage limitation | **PARTIAL** | User-controlled deletion is implemented. There is **no automatic expiry** of dormant accounts — a retention decision is needed (§11). |
| Rights: access, rectification, erasure, portability, objection, restriction | **PASS** | Export (JSON) and full deletion in Settings; the rest by email, one-month commitment published. |
| Art. 22 (automated decisions) | **PASS** | Profiling, yes. No legal or similarly significant effect: the score gates nothing. Documented, and the Terms prohibit consequential use. |
| Art. 14 (people in someone else's screenshot) | **PASS, with caveat** | Third-party subjects are addressed explicitly; individual notice is impossible (14(5)(b)) and a no-questions deletion route is published. |
| Processors / Art. 28 contracts | **OPEN** | Provider DPAs must be accepted/recorded — §11. |
| International transfers | **OPEN** | Provider regions unconfirmed; the notice says so rather than guessing. |
| Records of processing (Art. 30) | **PARTIAL** | The published table is most of it; a formal register is an operator task. |
| DPIA / AIPD | **RECOMMENDED** | See below. |
| Breach procedure | **OPEN** | No documented 72-hour process. Operator task. |

**On the DPIA.** Blink evaluates personal aspects (personality/perception) by
automated means, at scale, on a public-facing service, on data including
photographs, and processes data about people who are not users. Against CNIL's
criteria that is evaluation/scoring + automated processing + vulnerable persons
(a young audience) + innovative use — comfortably enough to make a DPIA the
prudent call. It is not something the repository can produce: it needs the
operator's decisions on retention, providers and risk acceptance.

## 4. EU AI Act

Applicable analysis as at August 2026, after the Digital Omnibus deferral of
Annex III high-risk deadlines (which did **not** move Article 50 — transparency
applies since 2 August 2026).

| Question | Answer |
|---|---|
| **Art. 5(1)(c) — social scoring?** | **Outside the prohibition, on the mechanics.** The prohibition targets evaluation/classification of persons over time from social behaviour or personal characteristics where the resulting social score causes detrimental treatment in an unrelated context, or treatment that is unjustified or disproportionate. Blink's score is derived from one artefact (a profile screenshot), is used only inside the same context it came from (how a social-media profile reads), attaches to no decision, benefit, access or sanction, and appears publicly only where the user has switched that on. There is no detrimental treatment for the prohibition to bite on. The Terms now forbid consequential use, which keeps that true. |
| **Art. 5(1)(g) — biometric categorisation?** | **Removed as a question.** The model previously inferred gender partly from photographs. That was categorisation of a person from a physical characteristic in an image, for one grammatical pronoun. The prompt now reads gender only from text the profile itself states, and forbids inference from appearance. |
| **Emotion recognition?** | **No.** Blink infers how a *profile* reads to a viewer, not the emotional state of the person from their biometrics. |
| **Art. 50(1) — disclosure of AI interaction** | **PASS.** Every result carries an AI-generated notice, the FAQ answers it directly, and the footer carries a permanent line. |
| **Art. 50(2) — marking synthetic content** | **PARTIAL.** Output is AI-generated text. It is clearly labelled to the reader in the interface; there is no machine-readable marking of exported/shared text or share-card images. Worth a decision — see §11. |
| **High-risk (Annex III)?** | **No.** Not employment, education, credit, essential services, law enforcement or biometrics. |

## 5. DSA

Blink is not an online platform in the DSA sense: users cannot post content to
the public at large. The only public surface is an opt-in leaderboard row
(handle, avatar, score) with no user-authored text. Notice-and-action
obligations therefore do not attach. A reporting route exists anyway, because
a person appearing in someone else's analysis needs one.

## 6. United States

| Regime | Applies? | Reasoning |
|---|---|---|
| **California CCPA/CPRA** | **Not currently** | None of the thresholds are met on the current business: revenue is far below \$25M, the service does not handle 100k+ California consumers, and it derives no revenue from selling/sharing. |
| **CCPA ADMT rules** | **Not yet** | ADMT consumer-rights duties start 1 January 2027 and only for businesses the CCPA covers. Blink also does not use ADMT for "significant decisions" — the score decides nothing. |
| **CO, CT, VA, TX, OR, MT, DE, IA, TN, NJ, MN, MD, IN, KY, NE, NH, RI** | **Not currently** | All are threshold-based (typically 25k–100k consumers, or revenue from data sales). Blink meets none and sells no data. |
| **COPPA** | **No** | Not directed to children; minimum age 16. |

**What was implemented anyway**, because it is universal and cheap: no sale, no
sharing, no targeted advertising, no third-party analytics, the same rights for
every user regardless of state, and a plain statement that an opt-out preference
signal (GPC) has nothing to disable here. A "Do Not Sell or Share" link was
**deliberately not** added: publishing an opt-out for a practice that does not
exist is itself a misleading statement.

## 7. Children

Minimum age **16**, chosen rather than defaulted:

- clears the highest EU national digital-consent age (France sets 15), so one
  number is correct everywhere Blink is reachable;
- sits above the US teen-privacy brackets that attach extra duties to profiling
  minors, none of which this product could operate;
- well above COPPA's 13.

Implemented as a stated rule at account creation, in the Terms and in the
Privacy Policy, plus a reporting address. It is a policy, not verification —
verification would mean collecting identity documents, which is more intrusive
than the service.

## 8. Cookies and storage — runtime audit

| What | Type | Consent | Why |
|---|---|---|---|
| `sb-…-auth-token` | localStorage | Exempt | Strictly necessary; written only after sign-in |
| `blink.lang` | localStorage | Exempt | User-set preference, written only on an explicit switch |

No cookies. No analytics, no pixel, no third-party script, no embed. One
external request: the Google Fonts stylesheet in `index.html`.

**Result: no consent banner**, because there is nothing non-exempt to consent
to. If any tracker is ever added, consent must arrive with it — the cookie page
says so.

> One open item: the Google Fonts stylesheet is fetched from `fonts.googleapis.com`,
> which discloses visitor IPs to Google. German regulators have taken issue with
> exactly this. Self-hosting the font removes the question entirely — see §11.

## 9. Security / RLS

| Check | Verdict |
|---|---|
| Anonymous cannot read private analyses | **PASS** — self-read only |
| Public profile exposes only intended fields | **PASS** — `leaderboard` view, `security_invoker`, filtered to `is_public` |
| No email leakage | **PASS**, now asserted — `profiles` policies restated in migration 0006 |
| Analysis text cannot appear on someone else's profile | **PASS** — `toView` omits it structurally |
| Service-role keys never in the client | **PASS** — AI credentials live in the Edge Function only |
| Avatars can't leak after deletion | **Fixed** — deletion removes the storage object |
| Suggestion queue not publicly readable | **PASS** — insert-only, author-read |
| Deletion actually removes data | **Fixed** — see §1.3 |

Not weakened anywhere. Migration 0006 only ever narrows.

## 10. Payments

There is **no payment code in the repository** — no Stripe, no prices, no
checkout, no subscription. The Terms and FAQ now say Blink is free, which is
the only statement consistent with the code.

This matters for activation: a payment provider reviews the site expecting the
product, the price and the terms it will be charging for. Right now the site
truthfully advertises a free product. **Before submitting**, either sell
something (and add the pricing page, CGV, withdrawal information and refund
policy that come with it) or submit it as a free service and add those when the
paid plan ships. What must not happen is a refund policy for a product that
does not exist — that is the fabrication this audit exists to avoid.

## 11. What is needed from the operator

Nothing below can be invented, and each blocks a specific item above.

**Identity — blocks mentions légales, privacy controller, payment activation**
1. Legal name of the operator (person or company)
2. Legal form (entrepreneur individuel, SASU, SAS…)
3. Registered address
4. SIREN or SIRET
5. RCS city, if registered
6. Intra-EU VAT number, or confirmation that none applies
7. Share capital, if a company
8. Directeur de la publication (a named person)

→ fill in `web-blink/src/lib/legal-entity.ts`; every page completes itself.

**Hosting and processors — blocks the transfer section**
9. Full corporate name and address of the web host, and of Supabase's operating entity
10. Deployment regions for Supabase, Rork and the AI providers
11. Confirmation that each provider's DPA has been accepted, and whether SCCs apply
12. Whether the AI providers train on submitted images under the current plan
    (the policy deliberately does not claim they do not)

**Decisions only you can make**
13. Retention for dormant accounts — or a decision that there is none
14. Confirmation of the 16+ age policy
15. Whether to self-host the font and drop the Google Fonts request
16. Whether shared results should carry machine-readable AI marking (AI Act 50(2))
17. A consumer-mediation scheme to join (required in France once selling)
18. If selling: price, billing period, renewal, cancellation, refund policy, and
    whether withdrawal is waived for immediate digital delivery
19. Custom domain, if any — it must match everywhere, including `og:url`

**Operational**
20. Apply `backend/migrations/0006_account_deletion_and_data_rights.sql`.
    Until it runs, account deletion falls back to a partial erase and tells the
    user so.
21. Redeploy the analyze Edge Function so the gender-inference change takes effect.
22. Write a breach-response procedure and a record of processing.
23. Consider a DPIA (§3).

## 12. Known gaps in this pass

Stated rather than glossed:

- **The app screens are still English-only.** Landing, authentication, settings
  and all legal pages are bilingual. Library, Ranks, Profile, onboarding and the
  analysis result prose are not yet — the machinery is in place, the strings are
  not written.
- **The deployed site was not verified from here.** This environment's network
  policy blocks `blink-ig.rork.app`. Everything was verified against a local
  production build instead: same bundle, same prerender, not the same server.
- **`analyses` and `profiles` policies were never in the repository.** Migration
  0006 restates the intended rules, but the live policies could not be read from
  here to confirm what they are today.
