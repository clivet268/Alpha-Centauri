# Alpha-Centauri
Alpha Centauri group project for WPI 509 Design of Software Systems

- `frontend/`: Vite + React
- `backend/src/handlers/`: one Lambda per use case
- `backend/src/routes.ts`: maps each route to its handler
- `infra/`: AWS CDK (API Gateway, Lambdas, Amplify site). Lambdas connect to the existing Aurora cluster set in `infra/cdk.json`, using IAM authentication.

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

Outputs `ApiUrl` and `WebUrl`. CDK builds the frontend on your machine during synth and publishes it to Amplify on deploy.

## Frontend structure

- `src/App.tsx`: URL routes for each page
- `src/pages/`: one page per original HTML mockup, plus a home page linking to all of them
- `src/pages/editor/PaperList.tsx`: dashboard table of papers and their reviewer assignments
- `src/components/TitleBar.tsx`: blue page header with optional left/right content
- `src/components/RegisterLoginPage.tsx`: shared Register + Login auth layout
- `src/components/AuthForms.tsx`: one auth card of inputs and a submit button
- `src/components/authFields.ts`: shared auth input definitions
- `src/components/RubricTable.tsx`: rubric grid in view, edit, answer or review mode
- `src/components/ScoreSummary.tsx`: score row under a rubric
- `src/components/ListTable.tsx`: dashboard list table with highlighted rows
- `src/components/Modal.tsx`: base `<dialog>` popup
- `src/components/FormModal.tsx`: popup with input fields
- `src/components/ConfirmModal.tsx`: popup with a confirm message
- `src/data/sampleData.ts`: placeholder content from the mockups
- `src/types.ts`: frontend types matching `schema.sql`
- `src/styles/app.css`: the mockups' stylesheet, ported
