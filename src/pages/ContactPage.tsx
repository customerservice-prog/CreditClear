import { FormEvent, useState } from 'react'
import { Navbar } from '../components/Navbar'

interface ContactPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function ContactPage({ onHome, onSignIn, onStartTrial }: ContactPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const subject = encodeURIComponent(`CreditClear AI contact${name ? ` — ${name}` : ''}`)
    const body = encodeURIComponent(
      [
        name ? `Name: ${name}` : null,
        email ? `Email: ${email}` : null,
        '',
        message || '(No message provided)',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    window.location.href = `mailto:support@creditclearai.com?subject=${subject}&body=${body}`
  }

  return (
    <div className="page active">
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <div className="hero" style={{ maxWidth: 560, paddingBottom: 24 }}>
        <div className="hero-badge">
          <div className="pulse-dot"></div> Contact
        </div>
        <h1>
          Get in <em>touch</em>
        </h1>
        <p className="hero-sub">
          Questions about your account, billing, or the dispute workflow? Send us a message—we typically
          reply within one business day.
        </p>
        <div className="modal" style={{ margin: '0 auto', maxWidth: 440 }}>
          <p className="disc" style={{ fontSize: 14, marginBottom: 20, marginTop: 0, textAlign: 'left' }}>
            Prefer email directly?{' '}
            <a href="mailto:support@creditclearai.com">support@creditclearai.com</a>
          </p>
          <form onSubmit={handleSubmit}>
            <div className="ff">
              <label htmlFor="contact-name">Name (optional)</label>
              <input
                id="contact-name"
                onChange={(event) => setName(event.target.value)}
                type="text"
                value={name}
              />
            </div>
            <div className="ff">
              <label htmlFor="contact-email">Your email</label>
              <input
                id="contact-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="ff">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="How can we help?"
                required
                rows={5}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  color: 'var(--txt)',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  padding: '12px 14px',
                  resize: 'vertical',
                  width: '100%',
                }}
                value={message}
              />
            </div>
            <button className="btn-auth" type="submit">
              Open email to send
            </button>
            <p
              className="disc"
              style={{ fontSize: 12, marginBottom: 0, marginTop: 14, textAlign: 'center' }}
            >
              This opens your mail app with a pre-filled message. If nothing opens, copy{' '}
              <strong>support@creditclearai.com</strong> into your email client.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
