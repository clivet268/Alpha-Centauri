import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../services/api.ts'
import { listRubrics, type RubricPage } from '../../services/rubrics.ts'

const PAGE_SIZE = 20

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: RubricPage }

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Could not load rubrics.'
}

function RubricList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = Number(searchParams.get('page'))
  const currentPage =
    Number.isInteger(requested) && requested >= 1 ? requested : 1
  const offset = (currentPage - 1) * PAGE_SIZE

  const [result, setResult] = useState<{ offset: number; load: Load }>()
  const load: Load =
    result?.offset === offset ? result.load : { status: 'loading' }

  useEffect(() => {
    let stale = false
    listRubrics(PAGE_SIZE, offset)
      .then((data) => {
        if (!stale) setResult({ offset, load: { status: 'loaded', data } })
      })
      .catch((err: unknown) => {
        if (!stale) {
          setResult({
            offset,
            load: { status: 'error', message: errorMessage(err) },
          })
        }
      })
    return () => {
      stale = true
    }
  }, [offset])

  if (load.status === 'loading') {
    return <p className="rubric-editor-status">Loading rubrics...</p>
  }
  if (load.status === 'error') {
    return (
      <p className="rubric-editor-status" role="alert">
        {load.message}
      </p>
    )
  }

  const { rubrics, page } = load.data
  const totalPages = Math.max(1, Math.ceil(page.totalCount / page.limit))

  return (
    <div className="rubric-list">
      <h1>Rubrics</h1>
      <button type="button" onClick={() => navigate('/')}>
        Back to Home
      </button>{' '}
      <button type="button" onClick={() => navigate('/designer/rubric/new')}>
        Create New Rubric
      </button>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Rubric ID</th>
              <th scope="col">Name</th>
              <th scope="col">State</th>
              <th scope="col">Publish Date</th>
              <th scope="col">Questions</th>
            </tr>
          </thead>
          <tbody>
            {rubrics.map((rubric) => (
              <tr key={rubric.rubricId}>
                <td>
                  <Link to={`/designer/rubric/${rubric.rubricId}`}>
                    {rubric.rubricId}
                  </Link>
                </td>
                <td>{rubric.name}</td>
                <td>
                  <span className={`state-flag ${rubric.state.toLowerCase()}`}>
                    {rubric.state}
                  </span>
                </td>
                <td>{rubric.publishDate ?? 'Not published'}</td>
                <td>{rubric.questionCount}</td>
              </tr>
            ))}
            {rubrics.length === 0 && (
              <tr>
                <td colSpan={5}>No rubrics.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setSearchParams({ page: String(currentPage - 1) })}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setSearchParams({ page: String(currentPage + 1) })}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default RubricList
