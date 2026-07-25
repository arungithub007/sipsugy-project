# SipSugy — Build Log

A record of what went wrong while building the SipSugy 3-tier app, how each
issue was fixed (and why that fix works), what to double-check before this
goes anywhere near production, and a ready-to-reuse prompt for rebuilding
the same project elsewhere.

---

## 1. Errors we hit, and how we resolved them

### 1.1 Hero illustration was invisible against its own background
**What happened:** The custom SVG glass illustration's outline was drawn in
`#1F3D2B` — which is *exactly* the same color as the dark hero section's
background. The outline effectively disappeared. The leaning cane-stalk
graphic used a similar low-contrast olive green on the same dark green
background, so it was hard to see too.

**Why it happened:** The color was picked to match the brand palette
without checking it against the specific background it would sit on top
of — a foreground/background collision.

**How we found it:** Rendered the actual bundled component in headless
Chromium (via Playwright) and inspected the screenshot, rather than trusting
the code alone.

**How we resolved it:** Changed the glass outline to a light cream
(`#F6F1E0`, ~90% opacity) and the stalk to a lighter sage green with warm
gold node highlights — both now have clear contrast against the dark hero
background.

**Why this fix works:** Rendering and *looking* at the actual output catches
this class of bug (contrast, layout, spacing) that reading code never will.
Any time a color is chosen, it needs to be checked against the specific
background it will render on, not just against the palette in isolation.

---

### 1.2 Opening `index.html` directly showed a blank page
**What happened:** After the frontend was built, opening `frontend/index.html`
by double-clicking it (`file://...`) showed nothing.

**Why it happened:** Two compounding reasons:
1. `index.html` loads `/src/main.jsx` — raw JSX isn't valid browser
   JavaScript; it needs Vite's dev server to compile it on the fly.
2. Browsers block ES module (`type="module"`) imports when a page is
   opened via `file://` instead of `http://`.

**How we resolved it:** Explained that this project needs a real local
server — either `npm install && npm run dev` (Vite dev server) or the
Docker/Nginx route (`docker build` + `docker run`).

**Why this fix works:** Both routes serve the page over `http://`, and both
either compile the JSX (Vite) or serve pre-built static JS (Nginx serving
the `dist/` output) — satisfying the two blockers above.

---

### 1.3 No network access in the build sandbox → `npm install` failed
**What happened:** `npm install` for both the frontend and backend failed
with `403 Forbidden` against `registry.npmjs.org`.

**Why it happened:** The sandbox this was built in has network access
disabled for the command-line tool, so package downloads are blocked
entirely (not a project bug — an environment constraint).

**How we resolved it (workarounds used to still verify the code):**
- For the frontend: symlinked the *globally pre-installed* `react` /
  `react-dom` packages into a local `node_modules`, then used `esbuild` to
  bundle the whole app. This caught real import/syntax errors without
  needing a full `npm install`.
- For the backend: Express/MySQL2/etc. aren't installed anywhere in the
  sandbox, so instead the core business logic (order validation and
  pricing) was pulled into a dependency-free module and unit-tested with
  Node's *built-in* test runner (`node:test`) — zero installs required.
  Every other backend file was still syntax-checked with `node --check`.
- For the full request/response flow: wrote a small stand-in HTTP server
  using only Node's built-in `http` module, mimicking the real backend's
  exact JSON responses, and drove the real frontend bundle against it in
  headless Chromium — this caught real integration issues (e.g. confirming
  the live-menu fetch and order POST actually work) without needing Express
  installed at all.

**Why this matters / why it's not fully resolved:** These are solid proxies
for verification, but they are not a substitute for actually running
`npm install` for real. **You must run `npm install` yourself** in both
`frontend/` and `backend/` once you have the files locally — that's called
out in both README files.

---

### 1.4 `node --test test/` failed with `MODULE_NOT_FOUND`
**What happened:** Running Node's test runner against the `test/` directory
directly threw `Cannot find module '.../test'`.

**Why it happened:** This Node version's `--test` flag didn't resolve a
bare directory path the way expected; it needed either an explicit file
path or a glob pattern.

**How we resolved it:** Changed the `test` script in `package.json` to
`node --test "test/**/*.test.js"`, and confirmed it (`npm test` → all 6
tests passing).

**Why this fix works:** The glob pattern explicitly expands to real file
paths, which sidesteps whatever directory-resolution quirk caused the
original failure.

---

### 1.5 `esbuild` invocation error: invalid flag
**What happened:** `esbuild ... --loglevel=warning` errored with
`Invalid build flag`.

**Why it happened:** That's not a real esbuild CLI flag — a mistaken guess.

**How we resolved it:** Removed the flag; esbuild's default output was
sufficient to inspect for errors.

---

### 1.6 Background server processes vanished between commands
**What happened:** A stub server was started in the background (`node
stub-server.mjs &`) in one command; a *later, separate* command tried to
`curl` it and got `Connection refused`, even though the earlier command's
log showed it had started successfully.

**Why it happened:** Each tool invocation in this environment runs in its
own isolated shell session — background processes don't survive past the
end of the command that spawned them.

**How we resolved it:** Started the server *and* ran the tests that
depended on it within the **same** single command/session, then cleaned up
the process at the end of that same command.

**Why this fix works:** Keeping the process's entire lifecycle (start → use
→ stop) inside one shell session means it's never orphaned by a session
boundary.

---

### 1.7 Docker, MySQL, and Groovy weren't available to fully test the later stages
**What happened:** Once the project moved to Docker Compose, a MySQL schema,
and a Jenkinsfile, there was no `docker`, no MySQL server/client, and no
Groovy interpreter available in the sandbox to actually run any of it.

**How we mitigated this (not a full resolution):**
- `docker-compose.yml` was parsed with Python's `yaml` library to confirm
  it's at least syntactically valid YAML.
- The `Jenkinsfile` was checked for balanced braces/parens (Groovy syntax
  can't be fully validated without a real Groovy/Jenkins environment) and
  reviewed by hand against known-good declarative pipeline structure.
- `db/init.sql`'s column names were manually cross-checked against every
  query in the backend controllers to make sure they match exactly.

**Why this isn't fully resolved:** Static checks like these catch obvious
mistakes but can't catch everything a real run would (e.g. a Jenkins plugin
that isn't installed, a Docker networking issue, a MySQL permission error).
This is the single biggest thing to verify for real before trusting this
setup — see the measures below.

---

### 1.8 Couldn't install a SQL parser to validate `init.sql`
**What happened:** Tried to `pip install sqlparse` to sanity-check the SQL
schema file offline; failed for the same reason as 1.3 — no network access.

**How we resolved it:** Fell back to careful manual review: re-read the
schema against MySQL 8's known syntax, and checked every column referenced
by the backend's queries exists with a matching name and type.

---

## 2. Measures to take before this goes anywhere near production

1. **Actually run `docker compose up --build` for real**, on a machine with
   Docker installed. Confirm all three containers start, the healthcheck on
   `db` passes, and the backend logs show `Connected to MySQL.` (not the
   fallback warning).
2. **Run `npm install` for real** in both `frontend/` and `backend/` — this
   was never done in the build sandbox due to no network access there.
3. **Run the Jenkinsfile in a real Jenkins instance** with the Docker
   Pipeline plugin installed, to confirm the Groovy is actually valid and
   the stages behave as expected — this was only checked by hand.
4. **Replace every placeholder credential** — `changeme`, `changeme_root`,
   `REQUIRED-set-your-registry-here` — before deploying anywhere shared or
   public. Move real secrets into AWS Secrets Manager / SSM Parameter Store
   rather than `.env` files once this is on AWS.
5. **Add HTTPS.** Everything currently runs over plain HTTP; Route 53 + ACM
   (or Let's Encrypt) need to be wired in before this is public.
6. **Wire the Jenkinsfile's Deploy stage** to whatever the real target ends
   up being (EC2 + Compose, ECS, or CodeDeploy) once that infrastructure
   exists — it's currently a documented placeholder.
7. **Add real integration tests** against a real (or containerized test)
   MySQL instance, not just the in-memory fallback path.
8. **Consider automating the visual/contrast check** that caught the hero
   illustration bug (1.1) — a screenshot-diff or accessibility-contrast
   check in CI would catch this class of bug automatically next time,
   instead of relying on a one-off manual render.
9. **Add rate limiting and request-size limits** to the backend before it's
   public — right now it's a straightforward Express API with no
   throttling.
10. **Add monitoring/alerting** (CloudWatch or equivalent) once this is on
    AWS, especially around the RDS connection and order-placement error
    rates.

---

## 3. Prompt to recreate this project elsewhere

Copy everything below into a fresh conversation with an AI coding assistant
to rebuild the same project from scratch:

```
I want a website for my brand "SipSugy" — an online ordering site for fresh
sugarcane juice. Build it as a 3-tier application I can deploy on AWS:

- Tier 1: React frontend (Vite), served through Nginx, which should also
  act as a reverse proxy — forwarding /api/* requests to the backend and
  serving the built frontend for everything else.
- Tier 2: Node.js (Express) backend/API.
- Tier 3: MySQL database.

Requirements:
- A landing page with a hero section, a short "how it's made/pressed"
  process section, and a menu grid of sugarcane juice varieties with prices
  in INR (e.g. Classic, Ginger, Mint, Lemon, Masala, Pineapple mix).
- No stock photography or AI-generated images — use custom SVG
  illustrations instead so there are no external image dependencies, and
  make sure any illustration colors are checked for contrast against the
  section background they sit on.
- A client-side cart/order tray: add to order, adjust quantities, remove
  items, running subtotal, and a "place order" action.
- The backend should expose GET /api/menu, POST /api/orders, GET
  /api/orders/:id, and GET /api/health. Order pricing must always be
  recalculated server-side from the menu — never trust a price sent by the
  client.
- The backend should work even before the database exists: fall back to
  seed data / an in-memory order store if the DB isn't configured or a
  query fails, and switch to real MySQL automatically once DB_HOST etc.
  are set — no code changes needed for that switch.
- Database schema: menu_items, orders, order_items (with a foreign key from
  order_items to orders), seeded with the same menu items/prices used in
  the frontend and backend fallback data, so all three tiers agree.
- Dockerfile for each tier (frontend: multi-stage Node build → Nginx serve;
  backend: single-stage Node runtime; db: MySQL image with the schema
  auto-loaded via /docker-entrypoint-initdb.d/), plus a docker-compose.yml
  at the project root that runs all three together with a healthcheck on
  the db service gating backend startup.
- A Jenkinsfile: checkout → test each tier → build all three Docker images
  → push to a registry → a clearly-labeled placeholder deploy stage (since
  the AWS infra isn't provisioned yet), with comments on how to wire up an
  SSH+Compose, ECS, or CodeDeploy deploy once it is.

Sequencing: build and show me the frontend first. Ask before starting the
backend, and ask again before starting the database. Once you build each
piece, verify it as thoroughly as you can given your environment's limits
(e.g. render the UI and check it visually, run any unit tests that don't
need a live database, syntax-check what you can) and tell me plainly what
you could and couldn't verify.
```
