# SipSugy — Backend

Tier 2 of the SipSugy 3-tier app: **Node.js (Express) API**. Sits behind
Nginx/the frontend, and will sit in front of MySQL once the DB tier exists.

## Status: works today without a database

The DB tier hasn't been built yet, so this API runs in a **fallback mode**:

- `GET /api/menu` returns the seed menu (same items/prices as the frontend)
- `POST /api/orders` validates and prices the order **server-side** (it never
  trusts a price sent by the client), then stores it in memory
- `GET /api/orders/:id` reads back from that same in-memory store

Once `DB_HOST` etc. are set in `.env` (see `.env.example`) and the `db` tier
exists, every one of these switches to real MySQL automatically — no code
changes needed. If a DB query ever fails, it logs a warning and falls back
to seed/in-memory data rather than crashing the API.

## Endpoints

| Method | Path              | Description                                  |
|--------|-------------------|-----------------------------------------------|
| GET    | `/api/health`     | Service + DB connectivity status              |
| GET    | `/api/menu`       | List menu items                                |
| POST   | `/api/orders`     | Place an order                                 |
| GET    | `/api/orders/:id` | Look up an order by id                         |

**POST /api/orders** body:
```json
{
  "customerName": "Arun",
  "customerPhone": "9876543210",
  "items": [
    { "id": "classic-cane", "qty": 2 },
    { "id": "ginger-zing", "qty": 1 }
  ]
}
```
`price` is always looked up server-side from the menu — anything the client
sends for price is ignored, so a tampered request can't change the total.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Then try it:
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/menu
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"classic-cane","qty":2}]}'
```

## Tests

The order validation/pricing logic (`src/utils/orderCalculator.js`) has no
external dependencies, so it's covered by unit tests that run with just
Node — no packages required:

```bash
npm test
```

## Docker

```bash
docker build -t sipsugy-backend .
docker run -p 4000:4000 --env-file .env sipsugy-backend
```

Or run both frontend + backend together from the project root:
```bash
docker compose up --build
```
(frontend on :8080, backend on :4000 — see `../docker-compose.yml`)

## Project layout

```
backend/
├── src/
│   ├── server.js          entry point
│   ├── app.js             Express app, middleware, route mounting
│   ├── config/db.js       MySQL pool (inactive until DB_HOST is set)
│   ├── controllers/       menu + orders request handlers
│   ├── routes/            route definitions
│   ├── middleware/        404 + error handling
│   ├── data/menu.seed.js  fallback menu data (mirrors the frontend)
│   └── utils/             pure order calculator + async handler helper
└── test/                  unit tests for the order calculator
```

## Next up

The database tier — `orders`, `order_items`, and `menu_items` tables in
MySQL, plus an `init.sql` and a `db/` Docker setup to match. Waiting on the
go-ahead for that.
