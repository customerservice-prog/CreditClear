/**
 * Optional AI-assisted dispute body paragraphs (OpenAI or Anthropic).
 * Falls back to callers’ template text when keys are missing or a call fails.
 */
import { sanitizeText } from './validation.js'

const MAX_EXCERPT = 10_000

function buildUserPrompt({
  agencyName,
  issueLabel,
  consumerName,
  addressLine,
  extractedSnippet,
}) {
  const snippet = String(extractedSnippet || '').trim().slice(0, MAX_EXCERPT)
  return `You are helping a U.S. consumer draft ONE paragraph for a Fair Credit Reporting Act (FCRA) dispute letter to ${agencyName}.

Issue category to focus on: ${issueLabel}

Consumer name: ${consumerName}
Consumer mailing address (if provided): ${addressLine || 'Not provided'}

${snippet ? `Below is machine-extracted text from the consumer’s uploaded credit report PDF(s). Use ONLY details that clearly appear here (creditor names, approximate balances, dates, account numbers). If the excerpt is empty or unclear, write a general but still substantive dispute paragraph that names the issue type and requests verification — do not invent specific account numbers or dollar amounts.\n\n--- BEGIN REPORT EXCERPT ---\n${snippet}\n--- END REPORT EXCERPT ---\n` : 'No report text was extracted. Write a substantive paragraph that identifies the dispute topic, cites the consumer’s right to a reasonable investigation under the FCRA (mention 15 U.S.C. § 1681i as applicable), and demands deletion or correction if the information cannot be verified — without fabricating account-level facts.\n'}

Requirements:
- Single paragraph, 4–8 sentences, professional tone.
- State that the consumer disputes the accuracy/completeness of how this category of information is reported.
- Reference investigation obligations under the FCRA (Section 611 / 15 U.S.C. § 1681i) in plain language.
- Demand that ${agencyName} complete an investigation and delete or correct unverifiable information, and provide an updated credit report disclosure if required by law.
- If citing specific accounts from the excerpt, quote them cautiously ("reported as…") and remind the reader to verify against their own file.
- Do NOT claim to be a lawyer; do not include placeholder brackets like [Your Name].

Output ONLY the paragraph text, no headings or bullet points.`
}

async function openAiParagraph(prompt) {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return ''
  }

  const model = process.env.OPENAI_DISPUTE_MODEL || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content:
            'You write clear, compliant-sounding FCRA dispute paragraphs for consumers editing their own letters. You are not a lawyer. Output plain paragraph text only.',
        },
        { role: 'user', content: prompt },
      ],
      model,
      temperature: 0.35,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  return typeof text === 'string' ? text.trim() : ''
}

async function anthropicParagraph(prompt) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return ''
  }

  const model = process.env.ANTHROPIC_DISPUTE_MODEL || 'claude-3-5-haiku-20241022'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify({
      max_tokens: 900,
      messages: [{ content: prompt, role: 'user' }],
      model,
      system:
        'You write clear FCRA dispute paragraphs for consumers. Output plain paragraph text only. You are not providing legal advice.',
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Anthropic error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const block = data?.content?.[0]
  const text = block?.type === 'text' ? block.text : ''
  return typeof text === 'string' ? text.trim() : ''
}

/**
 * @param {object} opts
 * @param {string} opts.agencyName
 * @param {string} opts.issueKey
 * @param {string} opts.issueLabel
 * @param {Record<string, string>} opts.info - firstName, lastName, address, city, state, zip, email
 * @param {string} opts.extractedText
 * @param {() => string} opts.fallback - sync template paragraph
 */
export async function generateAiDisputeParagraph(opts) {
  const { agencyName, issueLabel, info, extractedText, fallback } = opts
  const consumerName = `${info?.firstName || ''} ${info?.lastName || ''}`.trim() || 'The consumer'
  const addressLine = [info?.address, [info?.city, info?.state].filter(Boolean).join(', '), info?.zip]
    .filter(Boolean)
    .join(', ')

  const prompt = buildUserPrompt({
    addressLine,
    agencyName,
    consumerName,
    extractedSnippet: extractedText,
    issueLabel,
  })

  let raw = ''
  try {
    raw = await openAiParagraph(prompt)
    if (!raw && process.env.ANTHROPIC_API_KEY) {
      raw = await anthropicParagraph(prompt)
    }
  } catch {
    raw = ''
  }

  if (!raw) {
    return fallback()
  }

  const cleaned = sanitizeText(raw, { maxLength: 6000, preserveNewlines: false })
  const oneParagraph = cleaned.replace(/\n+/g, ' ').trim()
  if (oneParagraph.length < 80) {
    return fallback()
  }

  return oneParagraph
}
