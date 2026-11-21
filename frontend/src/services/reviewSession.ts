// The reviewer has no account: the RubricURL token + PIN *are* the credentials. They are kept in
// sessionStorage (cleared when the tab closes, never written to disk) so a refresh on the review page
// doesn't force re-entry. Every access is guarded because storage can throw (private mode, etc.).
import type { ReviewCredentials } from './reviews.ts'

const KEY = 'raser.reviewCredentials'

export function getStoredReviewCredentials(): ReviewCredentials | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<ReviewCredentials>
    return typeof v.reviewToken === 'string' && typeof v.pin === 'string'
      ? { reviewToken: v.reviewToken, pin: v.pin }
      : null
  } catch {
    return null
  }
}

export function setStoredReviewCredentials(creds: ReviewCredentials): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(creds))
  } catch {
    // Not persisted; a refresh sends the reviewer back to the access page.
  }
}

export function clearStoredReviewCredentials(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
