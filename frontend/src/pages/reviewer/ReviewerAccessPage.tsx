import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AuthCard } from '../../components/AuthForms'
import type { AuthField } from '../../components/authFields'
import TitleBar from '../../components/TitleBar'
import { ApiError } from '../../services/api.ts'
import { setStoredReviewCredentials } from '../../services/reviewSession.ts'
import { accessReview, parseReviewToken } from '../../services/reviews.ts'

// Served at /review (paste the RubricURL + PIN) and at /r/:reviewToken (the emailed link: only the PIN is needed).
export default function ReviewerAccessPage() {
  const navigate = useNavigate()
  const { reviewToken: tokenFromRoute } = useParams()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const fields: AuthField[] = [
    ...(tokenFromRoute ? [] : [{ name: 'rubricUrl', placeholder: 'Enter RubricURL token' }]),
    { name: 'pin', placeholder: 'Enter PIN', inputMode: 'numeric' },
  ]

  async function handleSubmit(values: Record<string, string>) {
    const reviewToken = tokenFromRoute ?? parseReviewToken(values.rubricUrl ?? '')
    if (!reviewToken) {
      setError('Enter the RubricURL from your email.')
      return
    }
    const creds = { reviewToken, pin: (values.pin ?? '').trim() }

    setBusy(true)
    setError(undefined)
    try {
      await accessReview(creds) // validates the token + PIN; the review page loads the data itself
      setStoredReviewCredentials(creds)
      navigate('/review/rubric')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

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
            fields={fields}
            submitLabel="Open Review"
            onSubmit={handleSubmit}
            error={error}
            busy={busy}
          />
        </div>
      </div>
    </div>
  )
}
