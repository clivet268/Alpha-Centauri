export const routes = {
  'POST /rubric/create': 'rubric/create',
} as const

export type RouteKey = keyof typeof routes
