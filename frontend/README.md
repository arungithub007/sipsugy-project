# SipSugy — Frontend

Fresh sugarcane juice, ordered online. This is the frontend (tier 1) of the
SipSugy 3-tier app: **React (Vite) → Nginx**, with backend (API) and database
tiers to follow.

## What's here

- Landing page: hero, "how it's pressed" process, and the juice menu
- Client-side order tray (cart) with quantities and a running subtotal
- A mock "place order" confirmation — this is wired up to local state only
  for now. Once the backend is built, `handlePlaceOrder` in `src/App.jsx`
  will call the real order API instead.
- Custom SVG illustrations (no external image dependencies), a palette drawn
  from the cane itself (field green, jaggery brown, husk cream), and
  Fraunces / Manrope / Space Mono for type.

## Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Build for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Docker (this is the piece that plugs into the AWS deployment)

```bash
docker build -t sipsugy-frontend .
docker run -p 8080:80 sipsugy-frontend
```

Visit http://localhost:8080 — Nginx serves the built static files and
handles SPA routing (`nginx.conf`).

## Where to edit things

- **Menu items / prices** — `src/data/menu.js`
- **Copy (headline, process steps)** — `src/components/Hero.jsx`,
  `src/components/ProcessSection.jsx`
- **Colors / fonts / spacing (design tokens)** — top of `src/index.css`
- **Cart logic** — `src/context/CartContext.jsx`

## Next up

Backend (API) and database tiers — say the word and we'll build those next
and connect the "Place order" flow to a real endpoint.
