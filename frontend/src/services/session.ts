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

export function clearStoredJournalId(): void {
  try {
    localStorage.removeItem(JOURNAL_KEY)
  } catch {
    // Nothing to clear.
  }
}
