# Linear Graph

Explore a Linear team as a force-directed graph. Issues are nodes, sub-issues and relations are links, and color encodes priority, status, project or assignee. Click a node to read it in the side panel.

## Setup

1. In Linear, open **Settings → API → OAuth applications** and create an application.
   - Callback URL: `http://localhost:3000/api/auth/callback` (add your production URL later).
   - Copy the client ID and client secret.
2. Copy `.env.example` to `.env.local` and fill in `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET` and a random `SESSION_SECRET` (`openssl rand -hex 32`).
3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open http://localhost:3000, connect Linear, and pick a team.

## Deploying

Set `APP_URL` to the public URL of the deployment and add `<APP_URL>/api/auth/callback` to the OAuth application's callback URLs. Nothing else is required: there is no database, the OAuth token lives encrypted in an httpOnly cookie and is refreshed automatically.

## How it works

- `src/lib/linear.ts` talks to Linear's GraphQL API and handles OAuth token exchange and refresh.
- `src/lib/graph.ts` turns issues into nodes and links around a central team node; `src/lib/layout.ts` computes the radial cluster layout (sub-issues fan out away from the centre, so hierarchy links never cross); `src/lib/color.ts` derives the legend for each color mode.
- `src/components/graph-view.ts` owns the simulation (nodes are pulled to their layout anchors and kept apart by collision), canvas rendering, and pan/zoom/drag interaction. `graph-canvas.tsx` is the thin React wrapper.
- `src/components/explorer.tsx` holds the UI state and composes the sidebar, canvas and detail panel.
