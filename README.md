# Alpha-Centauri
Alpha Centauri group project for WPI 509 Design of Software Systems

- `frontend/`: Vite + React
- `backend/src/handlers/`: one Lambda per use case
- `backend/src/routes.ts`: maps each route to its handler
- `infra/`: AWS CDK (API Gateway, Lambdas, Amplify site). Lambdas connect to the existing Aurora cluster set in `infra/cdk.json`, using IAM authentication.

## Iteration 1 use cases

| Use Cases | Assigned To | Status |
| :--- | :---: | ---: |
| Create Rubric | Ryan | ✅ Done |
| Delete Rubric | Ryan | ✅ Done |
| Register Journal | Clive | ✅ Done |
| Show Journal Dashboard | Clive | ✅ Done |
| Create Issue | AJ | ✅ Done |
| Add Paper | AJ | ✅ Done |
| Publish Rubric | Lucky | ✅ Done |
| Deprecate Rubric | Lucky | ✅ Done |

## Iteration 2 use cases

| Use Cases | Assigned To | Status |
| :--- | :---: | ---: |
| List Rubrics | Lucky | ✅ Done |
| View Rubric | Lucky | ✅ Done |
| Duplicate Rubric | Lucky | ✅ Done |
| Edit Rubric | Ryan | ✅ Done |
| Add Question | Ryan | ✅ Done |
| Delete Question | Ryan | ✅ Done |
| Edit Question | Ryan | ✅ Done |
| Access Rubric | Clive | ✅ Done |
| Update Answer | Clive | ✅ Done |

### Demo Videos

Use cases demo videos are in `demo/` directory.

### Links

- Homepage - https://dev.dkypn84dd07cn.amplifyapp.com
- API - https://tu36tsfmjd.execute-api.us-east-2.amazonaws.com/dev
- Rubric Designer View - https://dev.dkypn84dd07cn.amplifyapp.com/designer/rubric
- Journal Dashboard - https://dev.dkypn84dd07cn.amplifyapp.com/editor/dashboard
- Reviewer Access - https://dev.dkypn84dd07cn.amplifyapp.com/review

### Login Credentials

You can either register a new Rubric Designer or use the following Login credentials for existing designer:

- Email: designer1@rubric.com
- Password: password123


You can either register a new Journal or use the following Login credentials for existing journal:

- Email: editor1@journal.com
- Password: password123

### Reviwer access credentials

| RubricURL token | PIN    | State      |
| :---            | :---:  | :---       |
| rvProg000001    | 042817 | InProgress |
| rvFresh00001    | 135790 | UrlIssued  |
| rvDone000001    | 246810 | Completed  |
| rvWdrn000001    | 111111 | Withdrawn  |

## Local Setup

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
