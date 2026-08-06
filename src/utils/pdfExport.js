import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// A4 in mm, with a real printable margin — previously content was placed
// edge-to-edge (0 margin) and sliced page-by-page purely by height, which
// cut charts in half across page breaks. Instead: scale the whole report
// down (if needed) to fit within one page, inside a proper margin.
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_MM = 12

export async function exportElementAsPDF(elementId, filename) {
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Report element not found.')

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#FFFFFF',
    useCORS: true
  })

  const availWidthMm = A4_WIDTH_MM - MARGIN_MM * 2
  const availHeightMm = A4_HEIGHT_MM - MARGIN_MM * 2

  // Contain-fit: scale by whichever dimension is more constraining, so the
  // whole thing lands on a single page without cropping or stretching.
  const widthScale = availWidthMm / canvas.width
  const heightScale = availHeightMm / canvas.height
  const scale = Math.min(widthScale, heightScale)

  const drawWidthMm = canvas.width * scale
  const drawHeightMm = canvas.height * scale
  const x = MARGIN_MM + (availWidthMm - drawWidthMm) / 2
  const y = MARGIN_MM + (availHeightMm - drawHeightMm) / 2

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imgData = canvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', x, y, drawWidthMm, drawHeightMm)

  const blob = pdf.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch {
      // user cancelled the share sheet - fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
