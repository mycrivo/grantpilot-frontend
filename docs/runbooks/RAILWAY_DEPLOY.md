# Railway Deployment

## Service Definition

- Service type: Node

## Build and Start Commands

- Build command: `npm install && npm run build`
- Start command: `npm run start`

## Required Environment Variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## Domain Attachment

1. Deploy this frontend as its own Railway service.
2. In Railway service settings, open Domains.
3. Attach custom domain: `grantpilot.ngoinfo.org`.
4. Configure DNS records as instructed by Railway and verify certificate issuance.

## CORS Alignment Reminder

- Backend CORS policy must allow the frontend origin (`https://grantpilot.ngoinfo.org`) for browser calls to succeed.
