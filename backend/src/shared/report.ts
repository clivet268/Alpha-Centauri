// Quality classification and the ASCII review report. Shared by /review/access (completed reviews)
// and the future /review/complete, which must produce the same text.

export type Quality = 'High' | 'Moderate' | 'Low'

/** SCR-03..05: total >= high = High, total < low = Low, otherwise Moderate. */
export function classifyQuality(total: number, lowThreshold: number, highThreshold: number): Quality {
  if (total >= highThreshold) return 'High'
  if (total < lowThreshold) return 'Low'
  return 'Moderate'
}

export interface ReportInput {
  paperTitle: string
  paperReference: string
  journalName: string
  volume: number
  number: number
  rubricName: string
  lowThreshold: number | null
  highThreshold: number | null
  completedAt: Date
  totalScore: number
  quality: Quality
  /** In display order (section, then position). */
  questions: { questionId: string; section: number; text: string }[]
  answers: { questionId: string; rating: number; text: string }[]
}

export function buildReport(r: ReportInput): string {
  const byQ = new Map(r.answers.map((a) => [a.questionId, a]))
  const rule = '='.repeat(72)
  const lines = [
    rule,
    'PEER REVIEW REPORT',
    rule,
    `Paper:      ${r.paperTitle}`,
    `Reference:  ${r.paperReference}`,
    `Journal:    ${r.journalName}, Vol. ${r.volume}, No. ${r.number}`,
    `Rubric:     ${r.rubricName} (high >= ${r.highThreshold}, low < ${r.lowThreshold})`,
    `Completed:  ${r.completedAt.toISOString()}`,
    `Score:      ${r.totalScore}`,
    `Quality:    ${r.quality}`,
    rule,
  ]
  r.questions.forEach((q, i) => {
    const a = byQ.get(q.questionId)
    lines.push(
      `Q${i + 1} [Section ${q.section}] ${q.text}`,
      `    Rating: ${a ? `${a.rating}/5` : 'n/a'}`,
      `    Comment: ${a ? a.text : ''}`,
      '',
    )
  })
  return lines.join('\n')
}
