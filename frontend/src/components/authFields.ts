export interface AuthField {
  name: string
  placeholder: string
  type?: 'text' | 'email' | 'password'
  inputMode?: 'numeric'
}

export const JOURNAL_NAME_FIELD: AuthField = {
  name: 'journalName',
  placeholder: 'Enter Journal Name',
}

export const RUBRIC_ID_FIELD: AuthField = {
  name: 'rubricId',
  placeholder: 'Enter Rubric ID',
}

export const EMAIL_FIELD: AuthField = {
  name: 'email',
  placeholder: 'Enter Email',
  type: 'email',
}

// https://stackoverflow.com/questions/34952392/simple-way-to-hash-password-client-side-right-before-submitting-form
// https://stackoverflow.com/a/64385671
// its probably fine for this project/might even be best practice -268
// nvm, prof said hash!! so we have to figure out how -268
export const PASSWORD_FIELD: AuthField = {
  name: 'password',
  placeholder: 'Enter Password',
  type: 'password',
}
