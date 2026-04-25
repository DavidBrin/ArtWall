# Digital Art Wall Implementation Plan

## 1. Product Summary

Digital Art Wall is a public website where any visitor can draw on a shared canvas ("the wall") and see updates from everyone else in near real time.

Core user outcomes:
- Open the site and immediately see the current shared wall.
- Draw on the wall with mouse, touch, or stylus.
- Clear the view of controls to focus on the art.
- Toggle a compact menu.
- Open a simple "About this website" dialog.
- Install the site on a phone home screen as a Progressive Web App.
- Save the current wall image locally from the installed app or browser.

Out of scope for v1:
- Accounts or sign-in
- Private rooms
- Complex moderation tooling
- Layers, shapes, text tools, undo history, or brush presets beyond a minimal brush

## 2. Non-Functional Targets

- Fast first load on mobile and desktop
- Usable without authentication
- Realtime updates with eventual consistency
- Accessible controls and dialogs
- Touch-friendly drawing interaction
- Low ongoing cost
- Simple deployment path for a beginner

## 3. Recommended Stack

### Frontend
- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Native canvas rendering (`<canvas>`) for the wall
- `next-pwa` or a lightweight manifest/service worker setup for installability

### Backend
- Next.js Route Handlers for REST endpoints
- Supabase Postgres for persistence
- Supabase Realtime for cross-client updates
- Supabase Storage optional for exported snapshots only if needed later

### Why this stack
- Vercel + Supabase both have generous free tiers.
- Next.js keeps frontend and API in one codebase.
- Supabase Realtime avoids building and hosting a custom websocket server.
- The user can deploy for free unless they want a custom domain.

## 4. Assumptions

- Anonymous public drawing is acceptable for v1.
- Small occasional vandalism risk is acceptable for a demo/public experiment.
- The wall should persist between visits.
- Realtime updates within a second or two are good enough.
- Exporting the current wall as a PNG satisfies the "save current art" goal.
- "Download to homescreen" will be implemented as installable PWA support.

## 5. Information Architecture

Single-page experience:
- `GET /`
  - Shared wall canvas
  - Two floating buttons only:
    - `Menu`
    - `About`

Menu contents:
- Install app / save to home screen prompt when supported
- Save current wall as PNG
- Clear local preview errors/state messaging if needed

About dialog contents:
- Short project description
- Note that the wall is public and shared live

## 6. UX Specifications

### Layout
- Full-viewport canvas, edge-to-edge
- Floating controls anchored safely for mobile thumb reach
- No toolbars, sidebars, or nonessential chrome

### Drawing interaction
- Pointer-based drawing using Pointer Events
- Smooth line rendering using point interpolation
- One default brush color at launch, with a subtle rotating palette or seeded visitor color only if it does not add UI clutter
- Brush thickness fixed for v1

### Realtime behavior
- Local strokes render immediately on the active client
- Completed strokes are persisted to the backend
- Remote strokes stream in via Supabase Realtime
- Clients redraw wall from canonical stroke list on initial load and on incoming events

### Install/save behavior
- Web app manifest with icons, name, standalone display mode
- Basic service worker for shell caching
- Menu item to export the current wall as PNG
- On iOS where install prompts are limited, show simple manual install guidance in the menu

## 7. Technical Design

### Canonical model
The wall is stored as an append-only collection of strokes.

Each stroke contains:
- `id`: UUID
- `points`: ordered normalized point array, where each point is relative to canvas width/height
- `color`: string
- `width`: number
- `created_at`: timestamp
- `client_id`: string for dedupe/echo handling

### Why strokes instead of image blobs
- Efficient for realtime incremental sync
- Easier to merge than image-overwrite uploads
- Allows redraw on any screen size and pixel ratio
- Keeps API design RESTful and auditable

### Rendering flow
1. Client loads the most recent stroke batch.
2. Client draws those strokes onto the canvas.
3. User draws locally in memory during pointer movement.
4. On pointer-up, client POSTs one completed stroke.
5. Supabase stores the stroke and broadcasts an insert event.
6. Other clients receive the event and render the new stroke.
7. Originating client ignores duplicate echo using `client_id` + local optimistic cache.

## 8. REST API Design

All endpoints return JSON.

### `GET /api/wall`
Purpose:
- Fetch the current canonical wall state as a list of recent strokes.

Query params:
- `limit` optional, integer, default `5000`, max `10000`
- `cursor` optional, timestamp or opaque pagination token for future use

Response `200`:
```json
{
  "strokes": [
    {
      "id": "uuid",
      "points": [[0.12, 0.44], [0.14, 0.46]],
      "color": "#111111",
      "width": 4,
      "createdAt": "2026-04-24T18:00:00.000Z",
      "clientId": "anon-123"
    }
  ],
  "nextCursor": null
}
```

### `POST /api/wall/strokes`
Purpose:
- Persist one completed stroke.

Request body:
```json
{
  "points": [[0.12, 0.44], [0.14, 0.46]],
  "color": "#111111",
  "width": 4,
  "clientId": "anon-123"
}
```

Validation:
- `points` must contain at least 2 points
- Max points per stroke cap to protect backend
- Color must match allowed hex format
- Width must be within safe min/max

Response `201`:
```json
{
  "stroke": {
    "id": "uuid",
    "points": [[0.12, 0.44], [0.14, 0.46]],
    "color": "#111111",
    "width": 4,
    "createdAt": "2026-04-24T18:00:00.000Z",
    "clientId": "anon-123"
  }
}
```

### `GET /api/health`
Purpose:
- Simple deployment smoke-test endpoint.

Response `200`:
```json
{
  "ok": true
}
```

### Future-only endpoint, not in v1
- `DELETE /api/wall/strokes`
  - Not implemented in v1 to avoid unauthenticated destructive actions.

## 9. Realtime Contract

Supabase channel:
- Listen for `INSERT` on `public.strokes`

Client event handling:
- Ignore event if stroke `client_id` and local pending signature match optimistic local stroke
- Otherwise append and draw the incoming stroke

Recovery:
- On reconnect, refetch latest wall state from `GET /api/wall`

## 10. Data Model

### Table: `strokes`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `points jsonb not null`
- `color text not null`
- `width integer not null`
- `client_id text not null`
- `created_at timestamptz not null default now()`

Indexes:
- `created_at desc`

Policies:
- Public read allowed
- Public insert allowed
- No update/delete for anonymous clients

Guardrails:
- Optional database constraint on point array size later if needed

## 11. Code Organization

```text
app/
  api/
    health/route.ts
    wall/route.ts
    wall/strokes/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  wall/
    art-wall.tsx
    canvas-surface.tsx
    floating-controls.tsx
    about-dialog.tsx
    install-sheet.tsx
lib/
  api/
    wall.ts
  canvas/
    draw-stroke.ts
    normalize-point.ts
  supabase/
    browser.ts
    server.ts
  validation/
    stroke.ts
public/
  manifest.webmanifest
  icons/
docs/
  IMPLEMENTATION_PLAN.md
  DEV_LOG.md
  DEPLOYMENT_GUIDE.md
supabase/
  migrations/
```

## 12. Web Standards and Engineering Rules

### API rules
- Use proper HTTP methods and status codes
- Validate all input on the server
- Keep response shapes stable
- Do not expose service-role secrets to the client

### Accessibility
- Buttons need visible labels or accessible names
- Dialogs need focus management and escape-close behavior
- Provide keyboard access for menu/about controls
- Ensure contrast for controls over dynamic art background

### Performance
- Throttle pointer move processing where needed
- Use device-pixel-ratio aware canvas sizing
- Batch redraw efficiently
- Avoid rerendering React tree for every point sampled

### Security
- Sanitize and validate request payloads
- Rate limiting is optional for v1, document as future improvement
- No destructive anonymous endpoint
- Store only minimal anonymous metadata

### Reliability
- Optimistic local rendering first
- Reconcile against backend truth
- Provide graceful offline state for already-cached shell

## 13. Testing Strategy

### Unit tests
- Stroke validation
- Canvas point normalization
- API request parsing helpers

### Integration tests
- `GET /api/health`
- `POST /api/wall/strokes` success and validation failures

### Manual verification
- Desktop mouse drawing
- Mobile touch drawing
- Two-browser realtime sync
- PWA install prompt / manual install guidance
- PNG export

## 14. Parallel Work Allocation

This plan is the single source of truth. All agents must work from it and report drift immediately.

### Orchestrator responsibilities
- Keep plan authoritative
- Integrate changes
- Resolve scope collisions
- Run final verification

### Worker A: Foundation + Data/API
Scope:
- Project scaffold
- Shared types
- Supabase wiring
- Route handlers
- Validation
- Migration files

Must not edit:
- UI-specific visual styling except where required for integration

### Worker B: Canvas + Realtime UX
Scope:
- Canvas rendering
- Pointer interaction
- Realtime subscription handling
- Optimistic stroke flow
- Minimal floating controls

Must not edit:
- Database schema or deployment docs unless absolutely required

### Reviewer 1: Best Practices Review
Scope:
- Code quality
- Logic errors
- Type safety
- Accessibility
- Performance regressions

Output format:
- Findings first, ordered by severity

### Reviewer 2: Plan Compliance / Hallucination Review
Scope:
- Compare implementation against this document
- Flag endpoints, files, behaviors, or claims not grounded in the plan
- Flag missing required features from the plan

### Documentation Agent
Scope:
- Maintain `docs/DEV_LOG.md`
- Record decisions, progress, ownership, and detected drift
- Note blocked items and integration checkpoints

## 15. Milestones

### Milestone 1
- Plan approved internally
- Repo scaffolded
- Docs initialized

### Milestone 2
- API and database model implemented
- Canvas UI implemented
- Realtime sync working locally in code

### Milestone 3
- PWA/install/export features implemented
- Tests and lint pass where feasible
- Deployment guide written for beginners

### Milestone 4
- Reviewer findings addressed
- Final docs updated

## 16. Deployment Strategy

Primary recommendation:
- Host app on Vercel free plan
- Host database/realtime on Supabase free plan

Estimated cost:
- Free with provider subdomains
- Usually under $10/year only if buying a custom domain

Fallback if avoiding Vercel:
- Netlify for frontend plus Supabase backend

## 17. Known Risks

- Anonymous public canvas can be spammed
- Large stroke counts could slow full redraw over time
- PWA install UX differs across browsers, especially iOS
- Free tier quotas may become limiting if traffic becomes significant

## 18. Future Improvements

- Periodic server-side wall snapshotting for faster cold loads
- Moderation/reset workflow
- Brush/color picker
- Presence indicators
- Time-lapse replay
- Region-based loading for infinite wall concept
