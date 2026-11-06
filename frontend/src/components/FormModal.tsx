import { type ReactNode, useState } from 'react'
import Modal from './Modal'
import { createIssue } from '../services/issue.ts'



export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'number' | 'email' | 'date'
}

interface FormModalProps {
  open: boolean
  title: string
  fields: FieldDef[]
  submitLabel?: string
  onClose: () => void
  children?: ReactNode
}

export default function FormModal({
  open,
  title,
  fields,
  submitLabel = 'Submit',
  onClose,
  children,
}: FormModalProps) {

  const [formData, setFormData] = useState({});


  interface Issue {
    issue_id: string
  }

  async function run(): Promise<Issue | undefined> {
    if (title === "Create Issue") {
      const { issue_id } = await createIssue(  )
      return { issue_id }
    }
    return undefined;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      console.log(await run())
    } catch (error) {
      console.error(error)
    }


  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {children}
      <form onSubmit={handleSubmit}>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`field-${f.name}`} >{f.label}:</label>
            <input
              id={`field-${f.name}`}
              name={f.name}
              type={f.type ?? 'text'}
              required
              value={formData[f.name]}
              onChange={handleChange}
            />
          </div>
        ))}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">{submitLabel}</button>
        </div>
      </form>
    </Modal>
  )
}
