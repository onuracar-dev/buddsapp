# BuddsApp

A group chat I built for my friends: invite-only workspaces, real-time messages, voice rooms, stories, and an AI bot that joins the conversation.

**Project page:** [buddsapp.onuracar.dev](https://buddsapp.onuracar.dev)
**Status:** not hosted. The code is here to read or to self-host with your own keys.

---

## What it does

| Feature | How it works |
| --- | --- |
| **Workspaces** | Invite-only spaces. You only see the members, chats and stories of the workspace you joined. |
| **Real-time chat** | Messages and typing state go over Supabase Realtime. Supports images, files, voice notes, doodles and an in-chat tic-tac-toe game. |
| **Voice rooms** | LiveKit rooms for group calls. Tokens are signed on the server. |
| **Budds AI** | A Gemini-backed bot you can call into any chat. It reads the last 15 messages and replies in character. |
| **Stories** | Story-style photo and video posts, scoped to the workspace. |
| **Admin panel** | Roles, invite codes, timed announcements and member management. |
| **PWA** | Installable on phones, built with `vite-plugin-pwa`. |

## Architecture

There's no custom backend server. The browser talks to Supabase directly. Anything that needs a secret goes through an Edge Function.

```
                         ┌──────────── Supabase ────────────┐
                         │  Auth (Google)                   │
   ┌─────────┐  queries  │  Postgres + row-level security   │
   │ Browser │──────────▶│  Realtime                        │
   │  React  │           │  Storage                         │
   │  Vite   │           │                                  │
   │  PWA    │  invoke   │  Edge Functions                  │
   └─────────┘──────────▶│   ├─ livekit-token ──── signs ───┼──▶ LiveKit Cloud
        │       + JWT    │   └─ ai-chat ───────── calls ────┼──▶ Gemini API
        │                └──────────────────────────────────┘
        │                                                          ▲
        └────────────── WebRTC audio with the signed token ────────┘
```

**Stack:** React 19, Vite, React Router, Supabase (Auth, Postgres, Realtime, Storage, Edge Functions), LiveKit, Gemini, i18next.

## Security model

The first version was written for a group of friends who trusted each other. Before publishing the code, I reviewed it as if a stranger would read the JavaScript bundle. Four things didn't hold up:

| Problem | Fix |
| --- | --- |
| The LiveKit API secret was a `VITE_` variable, so it shipped in the bundle. Anyone could mint room tokens. | Token signing moved to the `livekit-token` Edge Function. It also checks that the caller belongs to the chat. |
| The Gemini key sat in a `global_settings` row that the client read. Any signed-in user could see it. | Requests go through the `ai-chat` Edge Function. The model is fixed on the server, request size is capped, and the migration deletes the old row. |
| "Admin" meant comparing the user's email to `VITE_ADMIN_EMAIL`. A hard-coded password in the bundle could skip the invite step. | Admin is now a `role` column. A trigger blocks users from changing their own `role` or `workspace_id`. |
| The client read the `invites` table directly, so unused codes could be listed. | Invites are admin-only. Joining goes through `redeem_invite()`, a `security definer` function that validates the code, marks it used and assigns the workspace in one step. |

**Where secrets live:**

| Value | Where | Visible to the browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env` | Yes, by design. Access is enforced by RLS. |
| `VITE_LIVEKIT_URL` | `.env` | Yes. It's only the WebSocket address. |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Edge Function secrets | No |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Edge Function secrets | No |

> **Not verified yet:** the policies in `supabase/migrations/0001_rls_policies.sql` were written and reviewed, but they haven't been run against a live database.

## Project structure

```
src/
  pages/          Route-level screens (ChatRoom, Home, Admin, Login, Invite, ...)
  components/     Chat, call, story and shared UI pieces
  contexts/       Auth, theme and music player state
  hooks/          Chat list and message subscriptions
  services/       AI client (calls the ai-chat function)
  utils/          LiveKit token client, helpers
supabase/
  functions/      livekit-token, ai-chat (Deno)
  migrations/     RLS policies, trigger, redeem_invite()
  seed.sql        Demo workspace, users, invite and messages
landing/          Static project page served at buddsapp.onuracar.dev
```

## Running it yourself

You'll need free accounts on [Supabase](https://supabase.com), [LiveKit Cloud](https://livekit.io/cloud) and [Google AI Studio](https://aistudio.google.com), plus the [Supabase CLI](https://supabase.com/docs/guides/cli).

> **Heads-up:** the table schema isn't in the repo yet. `0001_rls_policies.sql` adds policies to tables it expects to already exist (`users`, `workspaces`, `chats`, `messages`, `calls`, `invites`, `stories`, `global_settings`, `app_settings`). A fresh project needs those tables first.

**1. Install**

```bash
git clone https://github.com/onuracar-dev/buddsapp
cd buddsapp
npm install
```

**2. Frontend environment.** Copy `.env.example` to `.env` and fill it in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

**3. Server secrets and functions**

```bash
supabase secrets set LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... GEMINI_API_KEY=...
supabase secrets set GEMINI_MODEL=gemini-3.5-flash   # optional, this is the default
supabase functions deploy livekit-token
supabase functions deploy ai-chat
```

**4. Database.** In the Supabase SQL editor, run `supabase/migrations/0001_rls_policies.sql`.

**5. Demo data (optional)**

1. In **Authentication → Users**, create a user with the email `demo1@example.com`.
2. Paste that user's UID into `supabase/seed.sql` as the `id` of `Demo User 1`.
3. Run `supabase/seed.sql`.

This creates a "Demo Workspace", five demo profiles, a chat with sample messages, and the invite code `00000000-0000-0000-0000-0000000000b1`.

**6. Start**

```bash
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint. Two `exhaustive-deps` warnings in `ChatRoom.jsx` are intentional: adding the dependencies would reconnect the Realtime channel on every state change. |

## Known limitations

- The table schema isn't exported to the repo yet (see above).
- RLS policies haven't been tested against a live database.
- `ChatRoom.jsx` is about 1,300 lines and should be split up.
- i18next is set up with a small English/Turkish dictionary, but most UI text is still hard-coded in Turkish.
- There are no automated tests.

## Author

Onur Acar · [onuracar.dev](https://onuracar.dev) · [GitHub](https://github.com/onuracar-dev)
