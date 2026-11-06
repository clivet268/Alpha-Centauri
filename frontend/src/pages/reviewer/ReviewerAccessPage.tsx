import { useNavigate } from 'react-router'
import { AuthCard } from '../../components/AuthForms'
import TitleBar from '../../components/TitleBar'

export default function ReviewerAccessPage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <TitleBar
        title="Reviewer Access"
        left={
          <button type="button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        }
      />
      <div className="authspace">
        <div className="auth">
          <AuthCard
            heading="Access Rubric"
            fields={[
              { name: 'rubricUrl', placeholder: 'Enter RubricURL' },
              { name: 'pin', placeholder: 'Enter PIN', inputMode: 'numeric' },
            ]}
            submitLabel="Open Review"
            onSubmit={() => navigate('/review/rubric')}
          />
        </div>
      </div>
    </div>
  )
}
