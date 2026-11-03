import { Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import DesignerAuthPage from './pages/designer/DesignerAuthPage'
import NewRubricPage from './pages/designer/NewRubricPage'
import RubricList from './pages/designer/RubricList'
import RubricEditorPage from './pages/designer/RubricEditorPage'
import RubricViewPage from './pages/designer/RubricViewPage'
import EditorAuthPage from './pages/editor/EditorAuthPage'
import EditorDashboardPage from './pages/editor/EditorDashboardPage'
import ReadReviewPage from './pages/editor/ReadReviewPage'
import ReviewerAccessPage from './pages/reviewer/ReviewerAccessPage'
import ReviewerReviewPage from './pages/reviewer/ReviewerReviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/designer/login" element={<DesignerAuthPage />} />
      <Route path="/designer/rubric" element={<RubricList />} />
      <Route path="/designer/rubric/new" element={<NewRubricPage />} />
      <Route path="/designer/rubric/view" element={<RubricViewPage />} />
      <Route path="/designer/rubric/:rubricId" element={<RubricEditorPage />} />

      <Route path="/editor/login" element={<EditorAuthPage />} />
      <Route path="/editor/dashboard" element={<EditorDashboardPage />} />
      <Route path="/editor/review" element={<ReadReviewPage />} />

      <Route path="/review" element={<ReviewerAccessPage />} />
      <Route path="/review/rubric" element={<ReviewerReviewPage />} />

      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
