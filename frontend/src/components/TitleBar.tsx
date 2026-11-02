import type { ReactNode } from 'react'

interface TitleBarProps {
  title: ReactNode
  left?: ReactNode
  right?: ReactNode
}

export default function TitleBar({ title, left, right }: TitleBarProps) {
  return (
    <div className="title-bar">
      <div className="left">{left}</div>
      <div className="title">{title}</div>
      <div className="right">{right}</div>
    </div>
  )
}
