# BuddsApp

Real-time community chat platform with workspaces, voice rooms, stories, roles, file sharing, and an AI companion.

BuddsApp is a full-product React application built on Supabase, LiveKit, and Gemini. It is designed like a lightweight Discord-style workspace where users can join communities, chat in real time, share files, start voice calls, and interact with an AI assistant.

## Highlights

- Supabase Auth and workspace membership
- Real-time chat through Supabase Realtime
- LiveKit-powered voice rooms
- Stories with media upload
- Workspace invites and role-based controls
- File sharing and document previews
- Gemini-backed AI companion behavior
- PWA build through Vite
- LiveKit token signing moved to Supabase Edge Functions

## Architecture

- `src/` - React application
- `src/components/` - chat, call, story, and shared UI components
- `src/contexts/` - auth, theme, and music state
- `src/pages/` - workspace, chat, profile, invite, admin, and settings pages
- `supabase/functions/livekit-token/` - server-side LiveKit token generation

## Environment

Frontend `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_ADMIN_EMAIL=admin@example.com
VITE_EASTER_EGG_PASS=your_secret_password
```

LiveKit API credentials must be configured as Supabase Edge Function secrets, not as frontend variables:

```bash
supabase secrets set LIVEKIT_API_KEY=your_livekit_api_key
supabase secrets set LIVEKIT_API_SECRET=your_livekit_api_secret
```

## Supabase Setup

1. Enable email authentication.
2. Create the required database tables for workspaces, messages, roles, stories, and global settings.
3. Create a public `chats` storage bucket for uploaded media/files.
4. Deploy `supabase/functions/livekit-token`.
5. Store the Gemini API key in the app's expected global settings record.

## Local Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

`npm run lint` currently passes with warnings that are useful cleanup candidates.

## Recent Hardening

- Removed LiveKit API secret usage from browser code
- Added a Supabase Edge Function for LiveKit token signing
- Removed generated build/scratch artifacts from the repository
- Updated README and environment guidance to avoid leaking voice infrastructure secrets

## Author

Onur Acar - <https://github.com/onuracar-dev>
