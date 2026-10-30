# Alpha-Centauri
Alpha Centauri group project for WPI 509 Design of Software Systems

- `frontend/`: Vite + React
- `backend/src/handlers/`: one Lambda per use case
- `backend/src/routes.ts`: maps each route to its handler
- `infra/`: AWS CDK (API Gateway, Lambdas). Lambdas connect to the existing Aurora cluster set in `infra/cdk.json`, using IAM authentication.

## Local

```bash
npm install
npm run db:up
cp backend/.env.example backend/.env
npm run dev:api   # API on :3001
npm run dev       # frontend
```

## New use case

Add `backend/src/handlers/<area>/<action>.ts`, then add a line to `routes.ts`.

## Deploy

```bash
npx -w infra cdk bootstrap   # once per AWS account
npm run deploy
```
