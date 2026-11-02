import type { ReactNode } from 'react'

export interface Column<T> {
  header: string
  render: (row: T) => ReactNode
}

interface ListTableProps<T> {
  className: string
  columns: Column<T>[]
  rows: T[]
  selectedRows?: number[]
}

export default function ListTable<T>({
  className,
  columns,
  rows,
  selectedRows = [],
}: ListTableProps<T>) {
  return (
    <table className={`grid-table ${className}`}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.header}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className={selectedRows.includes(i) ? 'selected' : undefined}
          >
            {columns.map((c) => (
              <td key={c.header}>{c.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
