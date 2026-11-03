import { Link } from 'react-router'
import TitleBar from '../components/TitleBar'

export default function HomePage() {
  return (
    <div className="page">
      <TitleBar title="RASER" />
      <div className="home-links">
        <div>
          <Link to="/designer/login">Rubric Designer Auth</Link>
          <Link to="/designer/rubrics">Rubric Designer</Link>
          <Link to="/designer/rubrics/view">Rubric View</Link>
          <Link to="/rubric">Rubric List</Link>
        </div>
        <div>
          <Link to="/editor/login">Journal Editor Auth</Link>
          <Link to="/editor/dashboard">Journal Editor Dashboard</Link>
          <Link to="/editor/review">Read Review</Link>
        </div>
        <div>
          <Link to="/review">Reviewer Access</Link>
          <Link to="/review/rubric">Reviewer Review</Link>
        </div>
      </div>
    </div>
  )
}
