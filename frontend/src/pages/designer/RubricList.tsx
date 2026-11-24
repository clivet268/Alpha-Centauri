import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import LogoutButton from '../../components/LogoutButton.tsx'
import { ApiError } from '../../services/api.ts'
import {
  listRubrics,
  type RubricPage,
  type RubricStateFilter as StateFilter,
} from '../../services/rubrics.ts'

const PAGE_SIZE = 20

const STATE_FILTERS: StateFilter[] = [
  'Published',
  'Unpublished',
  'Deprecated',
  'All',
]

const DEFAULT_FILTER: StateFilter = 'Published'

function parseFilter(value: string | null): StateFilter {
  return STATE_FILTERS.find((f) => f === value) ?? DEFAULT_FILTER
}

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
  const stateFilter = parseFilter(searchParams.get('state'))

  const goTo = (page: number, state: StateFilter = stateFilter) =>
    setSearchParams({ page: String(page), state })

  const key = `${offset}|${stateFilter}`
  const [result, setResult] = useState<{ key: string; load: Load }>()
  const load: Load = result?.key === key ? result.load : { status: 'loading' }

  useEffect(() => {
    let stale = false
    const key = `${offset}|${stateFilter}`
    listRubrics(PAGE_SIZE, offset, stateFilter)
      .then((data) => {
        if (!stale) setResult({ key, load: { status: 'loaded', data } })
      })
      .catch((err: unknown) => {
        if (!stale) {
          setResult({
            key,
            load: { status: 'error', message: errorMessage(err) },
          })
        }
      })
    return () => {
      stale = true
    }
  }, [offset, stateFilter])

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
      </button>{' '}
      <LogoutButton role="designer" />{' '}
      <label>
        Status:{' '}
        <select
          value={stateFilter}
          onChange={(e) => goTo(1, parseFilter(e.target.value))}
        >
          {STATE_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Rubric ID</th>
              <th scope="col">Name</th>
              <th scope="col">State</th>
              <th scope="col">Publish Date</th>
              <th scope="col">Questions</th>
              <th scope="col">Actions</th>
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
                <td className="row-actions">
                  {rubric.state === 'Published' && (
                    <Link to={`/designer/rubric/${rubric.rubricId}/view`}>
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {rubrics.length === 0 && (
              <tr>
                <td colSpan={6}>
                  {stateFilter === 'All'
                    ? 'No rubrics.'
                    : `No ${stateFilter.toLowerCase()} rubrics.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => goTo(currentPage - 1)}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => goTo(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default RubricList
