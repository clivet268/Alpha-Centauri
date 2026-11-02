import type {
  Answer,
  Assignment,
  Issue,
  Paper,
  Question,
  Rating,
  Rubric,
} from '../types'

export const SAMPLE_VIEW_URL = 'https://sample-view-url.com'

const CREATED = '2026-09-01T12:00:00Z'

export const sampleRubrics: Rubric[] = [
  {
    rubricId: 'rb_8c1e',
    designerId: 'ac_designer1',
    name: 'Sample rubric',
    state: 'Published',
    publishDate: '2026-09-30',
    lowThreshold: 40,
    highThreshold: 55,
    replacementRubricId: null,
    deprecatedAt: null,
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    rubricId: 'rb_5a77',
    designerId: 'ac_designer1',
    name: 'Old rubric',
    state: 'Deprecated',
    publishDate: '2026-06-01',
    lowThreshold: 40,
    highThreshold: 55,
    replacementRubricId: 'rb_8c1e',
    deprecatedAt: '2026-09-30T12:00:00Z',
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    rubricId: 'rb_93d2',
    designerId: 'ac_designer1',
    name: 'Another Rubric',
    state: 'Unpublished',
    publishDate: null,
    lowThreshold: null,
    highThreshold: null,
    replacementRubricId: null,
    deprecatedAt: null,
    createdAt: CREATED,
    updatedAt: CREATED,
  },
]

const CITED_EXPLANATIONS = [
  'all key prior references are cited',
  'too many prior references but still relevant',
  'references included but not all relevant',
  'few references',
  'no cited references',
]

const EDIT_ME_EXPLANATIONS = ['just click these to edit them', '', '', '', '']

export const sampleQuestions: Question[] = ([1, 2, 3, 4, 5] as const).flatMap(
  (section) => [
    {
      questionId: `q_${section}a`,
      rubricId: 'rb_8c1e',
      section,
      position: 1,
      text: 'Is key relevant literature cited?',
      explanations: CITED_EXPLANATIONS,
      updatedAt: CREATED,
    },
    {
      questionId: `q_${section}b`,
      rubricId: 'rb_8c1e',
      section,
      position: 2,
      text: 'Can you click to edit me?',
      explanations: EDIT_ME_EXPLANATIONS,
      updatedAt: CREATED,
    },
  ],
)

export const sampleIssues: Issue[] = [
  { issueId: 'is_0a11', journalId: 'jr_41b2', volume: 12, number: 3 },
]

export const samplePapers: Paper[] = [
  {
    paperId: 'pp_7c90',
    issueId: 'is_0a11',
    title: 'Sample paper title',
    reference: 'https://doi.org/doi',
    withdrawnAt: null,
    closedAt: null,
  },
]

export const sampleAssignments: Assignment[] = [
  {
    assignmentId: 'as_e1d3',
    paperId: 'pp_7c90',
    reviewerEmail: 'rev1@uni.edu',
    deadline: '2026-11-01',
    status: 'Completed',
    reviewToken: 'k3j9x2m1p0qa',
    completedAt: '2026-10-28T12:00:00Z',
    totalScore: 36,
    quality: 'Moderate',
  },
  {
    assignmentId: 'as_e1d4',
    paperId: 'pp_7c90',
    reviewerEmail: 'rev2@uni.edu',
    deadline: '2026-11-01',
    status: 'InProgress',
    reviewToken: 'w8f2c7n4t6zb',
    completedAt: null,
    totalScore: null,
    quality: null,
  },
]

const RATINGS_GIVEN: Rating[] = [5, 4, 3, 5, 2, 4, 4, 3, 5, 1]

const COMMENTS = [
  'Cites the main prior work; a few recent papers are missing.',
  'Criterion clearly met.',
  'Sources are well documented.',
  'Supplier details are complete.',
  'Method is described but lacks parameter values.',
  'Could not reproduce from the text alone.',
  'Statistics are appropriate and reported with effect sizes.',
  'Bias risk discussed briefly.',
  'Reporting follows the standard checklist.',
  'Data availability statement is missing.',
]

const answersFor = (assignmentId: string, count: number): Answer[] =>
  sampleQuestions.slice(0, count).map((q, i) => ({
    assignmentId,
    questionId: q.questionId,
    rating: RATINGS_GIVEN[i],
    text: COMMENTS[i],
    savedAt: '2026-10-27T12:00:00Z',
  }))

export const completedAnswers = answersFor('as_e1d3', 10)

export const inProgressAnswers = answersFor('as_e1d4', 4)
