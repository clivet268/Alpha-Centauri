import { Fragment } from 'react'
import type { DashboardPaper } from '../../services/journals'

interface PaperListProps {
  papers: DashboardPaper[]
  selectedPaperId?: string
  selectedAssignmentId?: string
  onSelectPaper?: (paperId: string) => void
  onSelectAssignment?: (paperId: string, assignmentId: string) => void
}

export default function PaperList({
  papers,
  selectedPaperId,
  selectedAssignmentId,
  onSelectPaper,
  onSelectAssignment,
}: PaperListProps) {
  const clickable = onSelectPaper || onSelectAssignment ? 'clickable' : ''
  const cls = (selected: boolean) =>
    [selected ? 'selected' : '', clickable].filter(Boolean).join(' ') ||
    undefined

  return (
    <table className="grid-table assignment-list">
      <thead>
        <tr>
          <th className="span-4">Paper ID</th>
          <th className="span-4">Title</th>
          <th className="span-4">Reference</th>
          <th className="span-3">Assignment ID</th>
          <th className="span-3">Reviewer Email</th>
          <th className="span-3">Deadline</th>
          <th className="span-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {papers.map((p) => (
          <Fragment key={p.paperId}>
            <tr
              className={cls(p.paperId === selectedPaperId)}
              onClick={() => onSelectPaper?.(p.paperId)}
            >
              <td className="span-4">{p.paperId}</td>
              <td className="span-4">{p.title}</td>
              <td className="span-4">{p.reference}</td>
            </tr>
            {p.assignments.map((a) => (
              <tr
                key={a.assignmentId}
                className={cls(a.assignmentId === selectedAssignmentId)}
                onClick={() =>
                  onSelectAssignment?.(p.paperId, a.assignmentId)
                }
              >
                <td className="span-3">{a.assignmentId}</td>
                <td className="span-3">{a.reviewerEmail}</td>
                <td className="span-3">{a.deadline}</td>
                <td className="span-3">{a.status}</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
