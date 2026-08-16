# Blink

See yourself the way others see you.

Blink analyzes Instagram profile screenshots using vision AI and reveals the first impression the profile makes — from multiple perspectives (crush, stranger, friends, recruiter).

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Cloudflare Worker (AI vision analysis via Rork proxy)
- **Auth:** Supabase native auth (email/password + Google OAuth)
- **Database:** Supabase Postgres (profiles + analyses tables)
- **UI:** shadcn/ui components, custom Blink design system

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (package manager)

### Install

```bash
bun install
```

### Run locally

```bash
bun run dev
```

The app will be available at `http://localhost:8080`.

### Build

```bash
bun run build
```

Output goes to `dist/`.

## Environment Variables

Create a `.env` file in the project root (never commit this). See `.env.example` for the template.

| Variable | Description | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase dashboard → Project Settings → API |
| `EXPO_PUBLIC_RORK_FUNCTIONS_URL` | Cloudflare Worker URL | Deployed Worker URL |
| `EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY` | Rork toolkit secret key | Rork project settings |
| `EXPO_PUBLIC_TOOLKIT_URL` | Rork toolkit URL | Defaults to `https://toolkit.rork.com` |

## Authentication Setup

Blink uses **native Supabase Auth** (not Rork Auth).

### Email/Password
- Enabled by default in Supabase
- Email confirmation can be toggled in Supabase dashboard → Authentication → Settings

### Google OAuth
1. Go to Supabase dashboard → Authentication → Providers
2. Enable Google
3. Add your Google OAuth client ID and secret (from Google Cloud Console)
4. Set the redirect URL to your Supabase auth callback: `https://[your-project].supabase.co/auth/v1/callback`
5. Add your production URL to the allowed redirect URLs

### Database
The `profiles` and `analyses` tables are created via SQL migration. A trigger auto-creates a profile row on signup.

## Migrations

Blink has no migration runner. Every file in `backend/migrations/` is applied by
hand, in order, by pasting it into the **Supabase SQL editor**. They are
idempotent, so re-running one that has already been applied changes nothing.

| file | what it does | if it hasn't been run |
|---|---|---|
| `0002_ranking_and_leaderboards.sql` | scores, ranks, the `leaderboard` view | the board is empty |
| `0003_profile_identity_and_avatars.sql` | handles, avatars, countries | those fields are missing from profiles |
| `0004_public_profile_onboarding.sql` | `instagram_url`, public opt-in | no "View Instagram" button |
| `0005_leaderboard_suggestions.sql` | the `leaderboard_suggestions` table | "Add someone" reports it can't save, and saves nothing |
| `0006_account_deletion_and_data_rights.sql` | `delete_my_account()` and the missing delete policies | **"Delete your account" cannot erase everything it says it erases.** Apply this one. |
| `0007_suggestion_category.sql` | `leaderboard_suggestions.category` | a person you add appears under **All** but not under the board you filed them on |

The client tolerates an unapplied migration rather than crashing — it detects
the missing table (`42P01`) or column (`42703`) and degrades — so a deploy
never *breaks* on one. But "degrades" means a feature quietly does less than
the UI implies, which is what the right-hand column above records. `0006` is
the one whose consequence is legal rather than cosmetic.

To see a degraded path rather than reason about it:

```sh
DROP_COLUMNS=leaderboard_suggestions.category node qa/mock-backend.mjs
```

See `qa/README.md`.

## Project Structure

```
web-blink/
├── src/
│   ├── components/
│   │   ├── blink/          # Blink-specific UI components
│   │   └── ui/             # shadcn/ui base components
│   ├── hooks/
│   │   └── useAuth.tsx     # Supabase auth context + hooks
│   ├── lib/
│   │   ├── analysis.ts     # Analysis schema, validation, API calls
│   │   ├── supabase.ts     # Supabase client
│   │   ├── brand.ts        # Brand constants (logo, name, tagline)
│   │   ├── resize.ts       # Client-side image compression
│   │   └── utils.ts        # Utilities
│   ├── pages/
│   │   ├── Index.tsx       # Landing page
│   │   ├── Product.tsx     # Analysis flow (upload → analyze → results)
│   │   ├── AppHome.tsx     # Authenticated home
│   │   ├── Library.tsx     # Saved analyses
│   │   ├── Settings.tsx    # Account settings
│   │   ├── AuthCallback.tsx # OAuth callback handler
│   │   ├── Legal.tsx       # Privacy, Terms, Cookies, Contact
│   │   └── NotFound.tsx    # 404 page
│   ├── App.tsx             # Routes + providers
│   └── main.tsx            # Entry point
├── functions/
│   └── index.ts            # Cloudflare Worker (AI analysis + data endpoints)
└── public/
    └── brand/              # Logo and brand assets
```

## Analysis Architecture

```
Upload → Client resize → POST /analyze (Worker) → AI vision model → Validate JSON → UI
```

- Screenshots are processed in memory and deleted — never permanently stored
- AI provider is replaceable (change model ID + prompt in `functions/index.ts`)
- Structured JSON response validated client-side before display
- Results locked behind auth — user must create an account to see full analysis

## Production Deployment

1. Set all environment variables
2. Configure Google OAuth in Supabase
3. Deploy the Cloudflare Worker
4. Build and deploy the frontend
5. Verify the complete flow: land → upload → analyze → unlock → save → library

## Notes

- The analysis store on the Worker is in-memory (per-isolate). For production persistence, use Durable Object SQLite or move to Supabase for data storage.
- Screenshots are never stored — only the structured analysis result is saved to the user's account.
