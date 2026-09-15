# Billing Software Management — Backend

Node.js + Express + MongoDB backend for a simple retail billing application, with an automated CI/CD pipeline via GitHub Actions.

![Backend CI/CD](https://github.com/Somilgupta07/billing-software-backend/actions/workflows/ci-cd.yml/badge.svg)

> Built as part of a learning exercise focused on backend structure, database design, API design, and validation — not intended as a production-grade billing system.

---

## Features

- **Product Management** — full CRUD with SKU uniqueness and stock tracking
- **Customer Management** — full CRUD with phone number validation
- **Billing** — create bills with multiple products, automatic subtotal/discount/tax/total calculation
- **Stock Management** — inventory automatically decreases on billing; overselling is blocked at the database level, with automatic rollback if a bill fails partway through
- **Billing History** — view all past bills with full item breakdown and customer info
- **Validation & Error Handling** — consistent JSON error responses via centralized middleware, no unhandled crashes
- **Automated CI/CD pipeline** — every push is checked before it's allowed to deploy

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Dev tooling | Nodemon, dotenv |
| CI/CD | GitHub Actions → Render |

---

## Project Structure

```
backend/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # CI/CD pipeline definition
├── config/
│   └── db.js                  # MongoDB connection setup
├── models/
│   ├── Product.js              # Product schema
│   ├── Customer.js             # Customer schema
│   └── Bill.js                 # Bill schema (with item snapshots)
├── controllers/
│   ├── productController.js    # Product business logic
│   ├── customerController.js   # Customer business logic
│   └── billController.js       # Billing logic, stock deduction, calculations
├── routes/
│   ├── productRoutes.js
│   ├── customerRoutes.js
│   └── billRoutes.js
├── middleware/
│   └── errorHandler.js         # Centralized error handling + 404s
├── server.js                    # App entry point
├── package.json
├── .env.example
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### Installation

```bash
git clone https://github.com/Somilgupta07/billing-software-backend.git
cd billing-software-backend
npm install
```

### Environment setup

```bash
cp .env.example .env
```

`.env`:
```
MONGO_URI=mongodb://localhost:27017/billing_app
PORT=5000
```

If using Atlas, replace `MONGO_URI` with your Atlas connection string, and whitelist your IP (or `0.0.0.0/0` for development/shared projects) under **Network Access** in the Atlas dashboard.

### Run the server

```bash
npm run dev     # with auto-restart (nodemon)
npm start       # plain node
```

Server starts at `http://localhost:5000`.

---

## API Reference

All responses follow: `{ "success": true, "data": {}, "count": 0, "message": "" }`

### Products — `/api/products`

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/products` | `{ name, sku, price, quantity }` | Create a product |
| GET | `/api/products` | — | List all products |
| GET | `/api/products/:id` | — | Get one product |
| PUT | `/api/products/:id` | any subset of fields | Update a product |
| DELETE | `/api/products/:id` | — | Delete a product |

### Customers — `/api/customers`

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/customers` | `{ name, phone, address }` | Create a customer (`phone` must be exactly 10 digits) |
| GET | `/api/customers` | — | List all customers |
| GET | `/api/customers/:id` | — | Get one customer |
| PUT | `/api/customers/:id` | any subset of fields | Update a customer |
| DELETE | `/api/customers/:id` | — | Delete a customer |

### Bills — `/api/bills`

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/bills` | see below | Create a new bill |
| GET | `/api/bills` | — | List billing history |
| GET | `/api/bills/:id` | — | Get full bill details |

**Create bill — request body:**
```json
{
  "customerId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "items": [
    { "productId": "64a1b2c3d4e5f6a7b8c9d0e1", "quantity": 2 }
  ],
  "discountPercent": 10,
  "taxPercent": 18
}
```

**What happens server-side on bill creation:**
1. Validates customer and item selection aren't empty.
2. Confirms the customer exists.
3. For each item, atomically checks stock and decrements it (`quantity: { $gte: requested }`) — prevents overselling even under concurrent requests.
4. Rolls back any stock already deducted if a later item in the same bill fails.
5. Calculates `subtotal → discount → tax → total` on the server — client-sent totals are never trusted.
6. Stores a snapshot of each product's name/SKU/price at time of sale so historical bills remain accurate even if product details change later.

---

## Validation Rules

- All required fields are enforced on create endpoints
- Price and quantity must be non-negative numbers
- SKU must be unique
- Phone number must be exactly 10 digits
- Bill creation requires a valid customer and at least one item
- Bill creation rejects any item requesting more quantity than is in stock
- Invalid MongoDB ObjectIds return a clean `400` instead of crashing the server

---

## CI/CD Pipeline

This backend deploys through an automated two-stage pipeline instead of Render's default "deploy on every push" behavior — the deploy step only runs after the code passes a check step.

### How it works

```
git push to main
      │
      ▼
┌────────────────┐    passes    ┌──────────────┐
│ build-and-test  │ ───────────▶ │  deploy job   │ ──▶ triggers Render via
│ (npm ci + JS    │              │ (needs: build- │     deploy hook
│  syntax checks) │              │  and-test)     │
└────────────────┘              └──────────────┘
      │ fails
      ▼
   deploy job is SKIPPED — nothing goes live
```

Defined in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml):

1. **`build-and-test` job** — runs on every push and pull request targeting `main`. Installs dependencies with `npm ci` and syntax-checks every `.js` file with `node --check`. Catches broken code (bad syntax, mismatched braces, undefined references) before it goes anywhere near production.
2. **`deploy` job** — depends on `build-and-test` via `needs:`, and only runs on pushes to `main`. Calls a Render Deploy Hook URL, which tells Render to pull the latest commit and redeploy.

Render's own **Auto-Deploy** setting is turned **off** for this service, so the only way it gets redeployed is through this pipeline — not through Render listening to pushes directly.

### Required GitHub Secret

Configured under repo **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|---|---|
| `RENDER_DEPLOY_HOOK` | URL from Render → Service → Settings → Deploy Hook. Triggers a redeploy when called. |

### Verifying the pipeline

1. Push a change → check the **Actions** tab → confirm `build-and-test` runs first, then `deploy` runs only after it passes.
2. Check Render's **Events** tab → a new deploy should appear shortly after the `deploy` job completes.
3. To confirm the gate blocks bad code: introduce a syntax error, push it, and confirm `build-and-test` fails (red ✗) while `deploy` shows as **skipped** — and no new deploy appears in Render's Events tab for that push.

---

## Error Handling

All errors return a consistent JSON shape via centralized middleware:
```json
{ "success": false, "message": "Insufficient stock for \"Notebook\". Available: 3, requested: 5" }
```

Handled cases include: validation errors, duplicate keys (e.g. duplicate SKU), invalid ObjectId format, not-found resources, and unmatched routes (404).

---

## Notes

- Stock should only be modified through the billing flow or direct product updates — avoid bypassing this to keep the audit trail (bill history vs. stock) consistent.
- This project does not include authentication, as it was outside the original scope.
- Built for a group learning exercise; not intended for production billing use.
- If you fork or rename this repo, update the badge URL at the top of this file to match your new GitHub username/repo name.
