// There is no login/token system yet, so the only thing the app remembers about the
// signed-in editor is which journal they registered. Storage can throw (private mode,
// disabled cookies), so every access is guarded.
const JOURNAL_KEY = 'raser.journalId'

export function getStoredJournalId(): string | null {
  try {
    return localStorage.getItem(JOURNAL_KEY)
  } catch {
    return null
  }
}

export function setStoredJournalId(journalId: string): void {
  try {
    localStorage.setItem(JOURNAL_KEY, journalId)
  } catch {
    // Not persisted; the dashboard also accepts ?journalId=... in the URL.
  }
}

// Same scheme for designers: login returns designerId, rubric writes send it back.
const DESIGNER_KEY = 'raser.designerId'

export function getStoredDesignerId(): string | null {
  try {
    return localStorage.getItem(DESIGNER_KEY)
  } catch {
    return null
  }
}

export function setStoredDesignerId(designerId: string): void {
  try {
    localStorage.setItem(DESIGNER_KEY, designerId)
  } catch {
    // Not persisted; rubric writes will get 401 and the designer must log in again.
  }
}

export function clearStoredJournalId(): void {
  try {
    localStorage.removeItem(JOURNAL_KEY)
  } catch {
    // Nothing to clear.
  }
}

export function clearStoredDesignerId(): void {
  try {
    localStorage.removeItem(DESIGNER_KEY)
  } catch {
    // Nothing to clear.
  }
}
