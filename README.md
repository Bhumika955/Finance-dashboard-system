# Finance Dashboard API

A role-based finance dashboard backend built with Node.js, TypeScript, Express, and SQLite.

## Tech Stack
- Node.js + TypeScript
- Express.js
- SQLite (better-sqlite3)
- JWT Authentication
- bcryptjs

## Setup
```bash
git clone https://github.com/Bhumika955/Finance-dashboard-system
cd finance-dashboard-system
npm install
```

Create `.env` file:
```env
JWT_SECRET=mysupersecretkey123
PORT=3000
```

Run the server:
```bash
npm run dev
```

## Roles & Permissions

| Action                 | Viewer| Analyst | Admin |
|------------------------|-------|---------|-------|
| View records           | ✅    | ✅     | ✅    |
| Create records         | ❌    | ✅     | ✅    |
| Update records         | ❌    | ✅     | ✅    |
| Delete records         | ❌    | ❌     | ✅    |
| View dashboard summary | ❌    | ✅     | ✅    |
| View recent activity   | ✅    | ✅     | ✅    |
| Manage users           | ❌    | ❌     | ✅    |

## API Endpoints

### Auth
| Method | Endpoint       | Description               |
|--------|----------------|---------------------------|
| POST   | /auth/register | Register new user         |
| POST   | /auth/login    | Login and get JWT token   |
| GET    | /auth/me       | Get logged-in user profile| 

### Users (Admin only)
| Method | Endpoint         | Description             |
|--------|----------------- |-------------------------|
| GET    | /users           | Get all users           |
| GET    | /users/:id       | Get single user         |
| PATCH  | /users/:id/role  | Update user role        |
| PATCH  | /users/:id/status| Activate/deactivate user|
| DELETE | /users/:id       | Delete user             |

### Financial Records
| Method | Endpoint     | Description                   | Access         |
|--------|--------------|-------------------------------|----------------|
| GET    | /records     | Get all records (with filters)| All roles      |
| GET    | /records/:id | Get single record             | All roles      |
| POST   | /records     | Create record                 | Analyst, Admin |
| PUT    | /records/:id | Update record                 | Analyst, Admin |
| DELETE | /records/:id | Soft delete record            | Admin only     |

### Filters (GET /records)
```
?type=income
?type=expense
?category=salary
?date_from=2024-04-01&date_to=2024-04-30
?search=food
?page=1&limit=10
```

### Dashboard
|Method| Endpoint                 | Description              | Access         |
|------|--------------------------|------------------------- |----------------|
| GET  | /dashboard/summary  |Total income, expense, balance | Analyst, Admin |
| GET  | /dashboard/by-category   | Category wise totals     | Analyst, Admin |
| GET  | /dashboard/monthly-trends| Monthly breakdown        | Analyst, Admin |
| GET  | /dashboard/recent        | Last 10 transactions     | All roles      |
| GET  | /dashboard/weekly-trends | Last 4 weeks data        | Analyst, Admin |

## Authentication

All protected routes require Bearer token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Assumptions & Design Decisions

1. **Soft Delete** — Records are never permanently deleted. `deleted_at` timestamp is set instead. This preserves audit trail.

2. **JWT over Sessions** — Stateless authentication chosen for simplicity and scalability. Token expires in 24 hours.

3. **Role in Token** — User role is embedded in JWT payload to avoid database hit on every request.

4. **SQLite** — Chosen for simplicity and zero infrastructure setup. Can be replaced with PostgreSQL for production.

5. **Viewer access** — Viewers can see records and recent activity but cannot access financial summaries or create/modify data.

6. **Dashboard aggregation in DB** — All summary calculations (SUM, GROUP BY) are done at database level using SQL for efficiency, not in application code.

## Folder Structure
```
src/
├── db/
│   └── database.ts      # DB connection + schema
├── middleware/
│   ├── auth.ts          # JWT verification
│   └── rbac.ts          # Role based access control
├── routes/
│   ├── auth.ts          # Register + Login
│   ├── users.ts         # User management
│   ├── records.ts       # Financial records CRUD
│   └── dashboard.ts     # Analytics + summaries
└── index.ts             # App entry point
```