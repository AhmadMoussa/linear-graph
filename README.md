# Linear Graph

Explore a Linear team as an interactive graph. Every issue is a node, sub-issues and relations are links, and color encodes priority, status, project or assignee. Click a node to read it in the side panel.

**Live:** https://lineargraph.vercel.app — sign in with Linear, pick a team, explore. Read-only, no account needed.

## Features

- **Two layouts.** *Radial* hangs top-level issues off a central team hub with sub-issues fanning outward, so hierarchy links never cross. *Force* is a classic physics layout without the hub. Switching morphs one into the other.
- **Relationships.** Parent/child links, blockers (with arrowheads), related and duplicate issues, each toggleable.
- **Color modes.** Priority, status, project or assignee, with a clickable legend to hide categories. Completed issues are always green, canceled ones hollow.
- **Linear's own status icons** in the panel, the legend, and on the nodes when coloring by status — including the pie that fills as a started state sits further along the workflow.
- **Explore.** Search with fly-to, click to focus a neighbourhood, drag nodes, pan and zoom, and a detail panel with the rendered description, parent, sub-issues and relations.
- Light and dark mode. No database: the OAuth token lives encrypted in an httpOnly cookie and refreshes itself.

## Run it locally

1. In Linear, open **Settings → API → OAuth applications** and create an application with the callback URL `http://localhost:3000/api/auth/callback`.
2. Copy `.env.example` to `.env.local` and fill in:

   | Variable | Value |
   | --- | --- |
   | `LINEAR_CLIENT_ID` | from the OAuth application |
   | `LINEAR_CLIENT_SECRET` | from the OAuth application |
   | `SESSION_SECRET` | any random string, e.g. `openssl rand -hex 32` |

3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

Open http://localhost:3000, connect Linear, and pick a team.

## Deploy

The app needs a small server for the OAuth exchange, so static hosts such as GitHub Pages won't work; Vercel, Netlify or Cloudflare all do.

1. Import the repository in Vercel.
2. Add the three variables above plus `APP_URL`, set to the deployment URL (for example `https://lineargraph.vercel.app`).
3. Add `<APP_URL>/api/auth/callback` to the OAuth application's redirect URIs.

Only the person deploying registers a Linear OAuth application. Visitors just authorize it with one click and see their own workspace.

## How it works

| Path | Role |
| --- | --- |
| `src/lib/linear.ts` | Linear GraphQL client, OAuth code exchange and token refresh, paginated team fetch |
| `src/lib/session.ts` | AES-GCM encrypted session cookie |
| `src/lib/graph.ts`, `src/lib/layout.ts` | Nodes and links, and the radial cluster layout |
| `src/lib/color.ts` | Legend and colors for each color mode |
| `src/lib/status-icons.ts` | Path data for Linear's status icons, shared by SVG and canvas |
| `src/components/graph-view.ts` | d3-force simulation, canvas rendering, pan/zoom/drag |
| `src/components/explorer.tsx` | UI state; composes the sidebar, canvas and detail panel |

Built with Next.js, React, Tailwind and d3-force.
