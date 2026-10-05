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

  await sharePDF(pdf, filename)
}

async function sharePDF(pdf, filename) {
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

// Multi-page export. Renders each direct child of the element that has the
// `pdf-block` class as its own image and lays them out top-to-bottom on A4
// pages, starting a new page whenever the next block would not fit — so
// charts and entries are never cut in half. A block marked
// data-keep-next="1" (a heading) is never left stranded at the page bottom.
// A single block taller than a page (a huge unbroken text) is sliced.
export async function exportBlocksAsPDF(elementId, filename) {
  const root = document.getElementById(elementId)
  if (!root) throw new Error('Report element not found.')
  const blocks = Array.from(root.querySelectorAll(':scope > .pdf-block'))
  if (!blocks.length) throw new Error('Nothing to export.')

  const contentW = A4_WIDTH_MM - MARGIN_MM * 2
  const pageBottom = A4_HEIGHT_MM - MARGIN_MM - 4 // room for page number
  const pageH = pageBottom - MARGIN_MM
  const GAP = 3

  const items = []
  for (const el of blocks) {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true })
    const mmPerPx = contentW / canvas.width
    items.push({
      canvas,
      mmPerPx,
      h: canvas.height * mmPerPx,
      keep: el.getAttribute('data-keep-next') === '1'
    })
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = MARGIN_MM
  let pageCount = 1

  const newPage = () => { pdf.addPage(); pageCount += 1; y = MARGIN_MM }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    let need = it.h
    if (it.keep && items[i + 1]) need += GAP + Math.min(items[i + 1].h, pageH - it.h)
    if (y > MARGIN_MM && y + need > pageBottom) newPage()

    if (it.h <= pageBottom - y + 0.01) {
      pdf.addImage(it.canvas.toDataURL('image/png'), 'PNG', MARGIN_MM, y, contentW, it.h)
      y += it.h + GAP
    } else {
      // Oversized block: slice by height across pages.
      let srcY = 0
      while (srcY < it.canvas.height) {
        const availMm = pageBottom - y
        const slicePx = Math.min(it.canvas.height - srcY, Math.floor(availMm / it.mmPerPx))
        if (slicePx <= 0) { newPage(); continue }
        const slice = document.createElement('canvas')
        slice.width = it.canvas.width
        slice.height = slicePx
        slice.getContext('2d').drawImage(it.canvas, 0, srcY, it.canvas.width, slicePx, 0, 0, it.canvas.width, slicePx)
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', MARGIN_MM, y, contentW, slicePx * it.mmPerPx)
        srcY += slicePx
        y += slicePx * it.mmPerPx + GAP
        if (srcY < it.canvas.height) newPage()
      }
    }
  }

  if (pageCount > 1) {
    pdf.setFontSize(8)
    pdf.setTextColor(120)
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p)
      pdf.text(`Page ${p} of ${pageCount}`, A4_WIDTH_MM / 2, A4_HEIGHT_MM - 8, { align: 'center' })
    }
  }

  await sharePDF(pdf, filename)
}
