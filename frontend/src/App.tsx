import { BrowserRouter, Route, Routes } from 'react-router'
import RubricEditor from './pages/RubricEditor.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="rubric/:rubricId" element={<RubricEditor />} />
        <Route path="*" element={<p>Page not found.</p>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
