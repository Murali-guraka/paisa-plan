# Paisa Plan — Personal Finance Management App

🌐 **Live Demo:** https://paisa-plan-rho.vercel.app

A personal finance application to track income and expenses, manage transactions, and view your financial dashboard.

## Tech Stack
- Frontend: React, Vite
- Backend: Java, Spring Boot
- Database: MySQL
- Deployment: Vercel, Render, Aiven
# Paisa Plan – Personal Finance & Budget Planner

Java (Spring Boot, Eclipse) + React (Vite) + MySQL.

## Features
- Add income and expenses, grouped by month
- Monthly budget "envelopes" per category (green → amber → red as you spend)
- Summary: left to spend, income, spent, savings rate
- REST API with validation, JPA, and a Java-stream-based summary endpoint

## 1. Database (MySQL)
Install MySQL and make sure it runs on port 3306. The database `finance_planner` is created automatically.
Optional: run `database/schema.sql` in MySQL Workbench for sample data.

## 2. Backend (Eclipse)
1. **File → Import → Maven → Existing Maven Projects** → select the `backend` folder.
2. Open `src/main/resources/application.properties` and set your MySQL password.
3. Right-click `FinanceApplication.java` → **Run As → Java Application**.
4. API is live at https://paisa-plan-rho.vercel.app (try `/api/summary?month=2026-10`).

Requires JDK 17+. In Eclipse: right-click project → Maven → Update Project if dependencies don't load.

## 3. Frontend (React)
```
cd frontend
npm install
npm run dev
```
Open https://paisa-plan-rho.vercel.app.

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/transactions?month=YYYY-MM | List a month's transactions |
| POST / PUT / DELETE | /api/transactions[/{id}] | Create, update, delete |
| GET / POST | /api/budgets | List, or set a category limit |
| DELETE | /api/budgets/{id} | Remove a budget |
| GET | /api/summary?month=YYYY-MM | Totals and spending by category |

## Ideas to extend (good for interviews)
Spring Security + JWT login, recurring transactions, CSV export, charts, unit tests with JUnit and Mockito.
