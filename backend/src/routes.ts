export const routes = {
  'POST /rubric/create': 'rubric/create',
  'POST /rubric/delete': 'rubric/delete',
  'POST /rubric/publish': 'rubric/publish',
  'POST /rubric/deprecate': 'rubric/deprecate',
  'POST /rubric/duplicate': 'rubric/duplicate',
  'GET /rubric/get': 'rubric/get',
  'GET /rubric/list': 'rubric/list',
  'GET /rubric/view': 'rubric/view',
  'POST /designer/register': 'designer/register',
  'POST /designer/login': 'designer/login',
  'GET /journal/dashboard': 'journal/dashboard',
  'POST /journal/register': 'journal/register',
  'POST /journal/login': 'journal/login',
  'POST /review/access': 'reviwer/access',
  'POST /review/answer': 'reviwer/answer',
  'POST /issue/create': 'issue/create',
} as const

export type RouteKey = keyof typeof routes
