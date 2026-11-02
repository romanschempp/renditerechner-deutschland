import type { Analysis } from '../engine/analysis'
import type { State } from '../state/store'

function download(name: string, content: Blob) {
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const safe = (s: string) => s.replace(/[^\wäöüÄÖÜß-]+/g, '_').slice(0, 60) || 'objekt'

export function exportCsv(name: string, a: Analysis) {
  const n = (v: number | null) => (v == null || !isFinite(v) ? '' : v.toFixed(2).replace('.', ','))
  const cols: [string, (y: Analysis['sim']['years'][number]) => number | null][] = [
    ['Monate', (y) => y.months], ['Sollmiete', (y) => y.rentSoll], ['Leerstand/Ausfall', (y) => y.vacancyLoss],
    ['Effektive Miete', (y) => y.rentEff], ['Ersparte Miete', (y) => y.savedRent], ['Kosten Vermieter', (y) => y.opCosts],
    ['Investitionen', (y) => y.capex], ['Reinertrag', (y) => y.noi], ['Zinsen', (y) => y.interest], ['Tilgung', (y) => y.principal],
    ['AfA Gebäude', (y) => y.afaBuilding], ['AfA Sonder', (y) => y.afaSpecial], ['AfA Inventar', (y) => y.afaInventory],
    ['Erhaltungsaufwand', (y) => y.erhaltung], ['Werbungskosten laufend', (y) => y.deductibleCosts], ['Finanzierungskosten', (y) => y.financeCosts],
    ['Ergebnis V+V', (y) => y.vv], ['Veräußerungsgewinn', (y) => y.gain], ['Steuerwirkung', (y) => y.taxEffect],
    ['Übertragung', (y) => y.transferFlow], ['Cashflow vor Steuern', (y) => y.cfPre], ['Cashflow nach Steuern', (y) => y.cfPost],
    ['Kum. Cashflow', (y) => y.cumCf], ['Restschuld', (y) => y.balance], ['Immobilienwert', (y) => y.value],
    ['EK-Rendite %', (y) => (y.ekReturn == null ? null : y.ekReturn * 100)], ['GK-Rendite %', (y) => (y.gkReturn == null ? null : y.gkReturn * 100)],
  ]
  const lines = [['Jahr', ...cols.map((c) => c[0])].join(';')]
  for (const y of a.sim.years) lines.push([y.year, ...cols.map((c) => n(c[1](y)))].join(';'))
  download(`${safe(name)}-jahrestabelle.csv`, new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
}

export function exportJson(state: State) {
  download(`renditerechner-de-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
}

export async function exportPdf(name: string, el: HTMLElement) {
  const [{ jsPDF }, html2canvas] = await Promise.all([import('jspdf'), import('html2canvas').then((m) => m.default)])
  document.documentElement.classList.add('is-printing')
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      windowWidth: 1100,
    })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    const margin = 10
    const w = pw - 2 * margin
    const pxPerMm = canvas.width / w
    const pageHpx = (ph - 2 * margin - 8) * pxPerMm
    let y = 0
    let page = 1
    const total = Math.ceil(canvas.height / pageHpx)
    while (y < canvas.height) {
      const h = Math.min(pageHpx, canvas.height - y)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = h
      slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
      if (page > 1) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, w, h / pxPerMm)
      pdf.setFontSize(8)
      pdf.setTextColor(120)
      pdf.text(`${name} · Renditerechner Deutschland · erstellt am ${new Date().toLocaleDateString('de-DE')} · Seite ${page} von ${total}`, margin, ph - 5)
      y += h
      page++
    }
    pdf.save(`${safe(name)}-rendite.pdf`)
  } finally {
    document.documentElement.classList.remove('is-printing')
  }
}
