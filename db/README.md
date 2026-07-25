# SipSugy — Database

Tier 3: MySQL 8. Schema and seed data live in `init.sql`, which runs
automatically the first time the container starts with an empty data
volume (that's a MySQL image behaviour, not something we trigger manually).

## Schema

- **menu_items** — id, name, note, price, tag, is_available
- **orders** — id, customer_name, customer_phone, subtotal, status, created_at
- **order_items** — id, order_id (FK → orders), menu_item_id (FK → menu_items),
  name, price, quantity (name/price are copied at order time, so a later
  menu price change never rewrites a past order's total)

Seed data matches `frontend/src/data/menu.js` and
`backend/src/data/menu.seed.js` exactly — same ids and prices across all
three tiers.

## Run it standalone

```bash
cp .env.example .env
docker build -t sipsugy-db .
docker run -p 3306:3306 --env-file .env -v sipsugy-db-data:/var/lib/mysql sipsugy-db
```

## Run it as part of the whole app

```bash
# from the project root
docker compose up --build
```
This starts `db`, then `backend` (once MySQL reports healthy), then
`frontend`. The backend picks up `DB_HOST=db` automatically and switches
from seed/in-memory data to real MySQL — no backend code changes needed.

## Resetting data

The schema only runs against an **empty** data directory. To start fresh:
```bash
docker compose down -v   # -v also removes the db-data volume
docker compose up --build
```

## Note for RDS later

When this moves to Amazon RDS (MySQL, Multi-AZ), the container goes away
but `init.sql` doesn't — run it once against the RDS endpoint (e.g. via
`mysql -h <rds-endpoint> -u admin -p sipsugy < init.sql`) to set up the
same schema and seed data there.
