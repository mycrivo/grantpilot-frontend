# Local Development

## Runtime Requirement

- Node.js 20.x LTS (recommended for Next.js 15 + React 19 baseline).

## Setup

1. Install dependencies:
   - `npm install`
2. Create local env file from example:
   - Copy `.env.example` to `.env.local`
3. Start dev server:
   - `npm run dev`

## Required Environment Variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## Verify API Connectivity (Browser + Network Tab)

1. Open the app in browser (default: `http://localhost:3000`).
2. Open Developer Tools -> Network tab.
3. Navigate to a page that triggers API interaction once integrations are wired.
4. Confirm requests target `NEXT_PUBLIC_API_BASE_URL`.
5. Confirm request/response flow does not fail due to DNS, TLS, CORS, or 5xx upstream errors.
