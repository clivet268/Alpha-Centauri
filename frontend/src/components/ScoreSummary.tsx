import type { ReactNode } from 'react'

interface ScoreSummaryProps {
  label: ReactNode
  value: ReactNode
  legend: ReactNode
}

export default function ScoreSummary({
  label,
  value,
  legend,
}: ScoreSummaryProps) {
  return (
    <div className="scoretable">
      <div>{label}</div>
      <div>{value}</div>
      <div>{legend}</div>
    </div>
  )
}
