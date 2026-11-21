import { Link } from 'react-router'

interface Role {
  title: string
  description: string
  primary: { label: string; to: string }
  links: { label: string; to: string }[]
}

const ROLES: Role[] = [
  {
    title: 'Rubric Designer',
    description: 'Create, publish and manage review rubrics.',
    primary: { label: 'Open rubrics', to: '/designer/rubric' },
    links: [
      { label: 'Sign in', to: '/designer/login' },
      { label: 'Rubric view', to: '/designer/rubric/view' },
    ],
  },
  {
    title: 'Journal Editor',
    description: 'Manage issues, papers and reviewer assignments.',
    primary: { label: 'Open dashboard', to: '/editor/dashboard' },
    links: [
      { label: 'Sign in', to: '/editor/login' },
      { label: 'Read review', to: '/editor/review' },
    ],
  },
  {
    title: 'Reviewer',
    description: 'Score a paper using your RubricURL and PIN.',
    primary: { label: 'Access review', to: '/review' },
    links: [{ label: 'Reviewer review', to: '/review/rubric' }],
  },
]

export default function HomePage() {
  return (
    <main className="home">
      <header className="home-header">
        <h1>RASER</h1>
        <p>Choose your role to get started.</p>
      </header>

      <div className="home-roles">
        {ROLES.map((role) => (
          <section key={role.title} className="home-card">
            <h2>{role.title}</h2>
            <p>{role.description}</p>
            <Link className="home-primary" to={role.primary.to}>
              {role.primary.label} →
            </Link>
            <nav className="home-secondary">
              {role.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </section>
        ))}
      </div>
    </main>
  )
}
