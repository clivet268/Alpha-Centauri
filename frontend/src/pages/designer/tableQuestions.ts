import type { Rating as ApiRating, Rubric } from '../../services/rubrics'
import { RATINGS, type Question } from '../../types'

/** Maps API questions to the shape RubricTable renders. */
export function tableQuestions(rubric: Rubric): Question[] {
  return rubric.questions.map((q, position) => ({
    questionId: q.questionId,
    rubricId: rubric.rubricId,
    section: q.section as Question['section'],
    position,
    text: q.text,
    explanations: RATINGS.map(
      (rating) => q.explanations[String(rating) as ApiRating],
    ),
    updatedAt: '',
  }))
}
