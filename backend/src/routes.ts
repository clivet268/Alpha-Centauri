export const routes = {
  'POST /rubric/create': 'rubric/create',
  'POST /rubric/publish': 'rubric/publish',
  'POST /rubric/deprecate': 'rubric/deprecate',
  'GET /rubric/get': 'rubric/get',
  'GET /rubric/list': 'rubric/list',
  'GET /journal/dashboard': 'journal/dashboard',
  'POST /journal/register': 'journal/register',
  'POST /journal/login': 'journal/login',
} as const

export type RouteKey = keyof typeof routes
