import { Navbar } from '../components/Navbar'

interface LegalPageProps {
  body: Array<{ title: string; text: string }>
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
  subtitle: string
  title: string
}

export function LegalPage({ body, onHome, onSignIn, onStartTrial, subtitle, title }: LegalPageProps) {
  return (
    <div className="page active">
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <div className="hero" style={{ maxWidth: 900, paddingBottom: 36, textAlign: 'left' }}>
        <div className="hero-badge">
          <div className="pulse-dot"></div> Legal Information
        </div>
        <h1>
          {title.split(' ')[0]} <em>{title.split(' ').slice(1).join(' ')}</em>
        </h1>
        <p className="hero-sub" style={{ marginLeft: 0 }}>
          {subtitle}
        </p>
      </div>
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="card">
          {body.map((section) => (
            <div key={section.title} style={{ marginBottom: 22 }}>
              <div className="card-t" style={{ fontSize: 22, marginBottom: 8 }}>
                {section.title}
              </div>
              <div className="disc" style={{ marginTop: 0 }}>
                {section.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
