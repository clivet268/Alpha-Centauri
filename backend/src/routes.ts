export const routes = {
  'POST /rubric/create': 'rubric/create',
  'POST /rubric/publish': 'rubric/publish',
  'POST /rubric/deprecate': 'rubric/deprecate',
} as const

export type RouteKey = keyof typeof routes
