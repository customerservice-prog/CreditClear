import { jsPDF } from 'jspdf'

/** Letter-sized PDF with plain-text margins (user may further edit in a PDF reader). */
export function downloadLetterAsPdf(text: string, baseFileName: string) {
  const doc = new jsPDF({ format: 'letter', unit: 'pt' })
  const margin = 54
  const pageHeight = doc.internal.pageSize.getHeight()
  const lineHeight = 13.5
  const maxWidth = 504
  let y = margin
  const base = baseFileName.replace(/\.(txt|pdf)$/i, '')

  const pushLine = (line: string) => {
    const parts = doc.splitTextToSize(line || ' ', maxWidth)
    for (const part of parts) {
      if (y > pageHeight - margin - lineHeight) {
        doc.addPage()
        y = margin
      }
      doc.text(part, margin, y)
      y += lineHeight
    }
  }

  for (const line of text.split('\n')) {
    pushLine(line)
  }

  doc.save(`${base}.pdf`)
}
