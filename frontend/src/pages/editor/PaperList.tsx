import { Fragment } from 'react'
import type { Assignment, Paper } from '../../types'

export default function PaperList({
  papers,
  assignments,
}: {
  papers: Paper[]
  assignments: Assignment[]
}) {
  return (
    <table className="grid-table assignment-list">
      <thead>
        <tr>
          <th className="span-4">Rubric ID</th>
          <th className="span-4">Name</th>
          <th className="span-4">State</th>
          <th className="span-3">Assignment ID</th>
          <th className="span-3">Reviewer Email</th>
          <th className="span-3">Deadline</th>
          <th className="span-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {papers.map((p, i) => (
          <Fragment key={p.paperId}>
            <tr className={i === 0 ? 'selected' : undefined}>
              <td className="span-4">{p.paperId}</td>
              <td className="span-4">{p.title}</td>
              <td className="span-4">{p.reference}</td>
            </tr>
            {assignments
              .filter((a) => a.paperId === p.paperId)
              .map((a, j) => (
                <tr
                  key={a.assignmentId}
                  className={i === 0 && j === 0 ? 'selected' : undefined}
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
