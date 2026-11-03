export const routes = {
  'POST /rubric/create': 'rubric/create',
  'POST /rubric/publish': 'rubric/publish',
  'POST /rubric/deprecate': 'rubric/deprecate',
  'GET /rubric/get': 'rubric/get',
  'GET /rubric/list': 'rubric/list',
} as const

export type RouteKey = keyof typeof routes
