# PassVault

A small, zero-knowledge password manager. Save the website, email/username and password for
each account, then open it from any phone by signing in.

- **Client-side encryption** — AES-256-GCM, key derived from your master password with
  PBKDF2-SHA256 (600,000 rounds)
- **Zero-knowledge server** — Supabase only ever stores encrypted blobs
- **Cross-device** — email + account password sign-in, then unlock with your master password
- **Quick unlock** — optional 6-digit PIN per device (wraps the vault key locally)
- **Everyday features** — search, add/edit/delete, show/hide, copy (auto-clears clipboard),
  password generator, encrypted notes, auto-lock after 5 minutes
- **Installable** — web app manifest, works on a phone home screen

## How the security works

```
account password ──► Supabase Auth (login only)

master password ──► PBKDF2-SHA256 (600k, random salt) ──► AES-256-GCM key
                                                          │
                              entries JSON ──► encrypted blob ──► Supabase
```

The server sees: your email, the PBKDF2 salt, an encrypted verifier blob, the encrypted vault,
and timestamps. It never sees the master password, the derived key, or any plaintext entry.

### Important limitations

- **No recovery.** If you forget the master password, the vault cannot be decrypted — by you,
  by me, or by Supabase. This is the cost of zero-knowledge encryption.
- **The PIN is convenience, not strong protection.** A 6-digit PIN wrapped with PBKDF2 can be
  brute-forced offline by someone who already has your unlocked device and its storage. Use a
  long, unique master password, and remove the PIN if you need maximum safety.
- **XSS is the real risk.** While the vault is unlocked, the key lives in memory. Only host
  this on an origin you control, and do not add third-party scripts.
- Supabase can see account metadata (email, when you sign in, when the vault was updated),
  but not what is inside it.

## Setup

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a free project.
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates the `vaults` table and row-level security policies.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

Optional: in **Authentication → Sign In / Providers → Email**, turn off *Confirm email* if you
want to sign up and start immediately. Otherwise confirm the email first.

Also set **Authentication → URL Configuration → Site URL** to your deployed URL (for example
`https://yourname.github.io/passvault/`) so confirmation links point to the right place.

### 2. Run locally

```bash
pnpm install
cp .env.example .env.local   # then paste your URL and anon key
pnpm dev
```

Open the printed localhost URL. Create an account, then create a master password.

> The anon key is meant to be public. Row-level security is what protects the rows, and the
> vault contents are encrypted anyway.

### 3. Deploy to GitHub Pages

1. Create a GitHub repository and push this folder to `main`.
2. In **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually).

The app is built with a relative base path, so it works at
`https://<user>.github.io/<repo>/` without extra configuration.

## Scripts

| Command        | What it does                              |
| -------------- | ----------------------------------------- |
| `pnpm dev`     | Start the dev server                      |
| `pnpm build`   | Type-check and build to `dist/`           |
| `pnpm preview` | Preview the production build              |
| `pnpm test`    | Run the crypto and generator tests        |
| `pnpm lint`    | Run oxlint                                |

## Project layout

```
src/
  App.tsx                  auth → setup → locked → unlocked state machine
  components/
    AuthScreen.tsx         sign in / create account
    SetupScreen.tsx        create the master password
    UnlockScreen.tsx       master password or PIN unlock
    VaultScreen.tsx        list, search, copy, edit, delete
    EntryModal.tsx         add/edit a password
    SettingsModal.tsx      change master password, PIN, lock, sign out
    PinPad.tsx             numeric keypad
  lib/
    crypto.ts              PBKDF2 + AES-GCM primitives
    vault.ts               Supabase reads/writes with version checks
    pin.ts                 device-local PIN-wrapped key
    password.ts            generator + strength meter
  hooks/
    useAutoLock.ts         idle / background auto-lock
supabase/schema.sql        database table + RLS policies
```

## Ideas for later

- Encrypted export / import for backups
- Folders or tags
- Breach and reuse checks (k-anonymity, no plaintext leaves the device)
- Biometric unlock via WebAuthn
- Password history

## License

Private project — do what you like with it.
