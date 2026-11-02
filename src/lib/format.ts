const nf = (d: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 })
const cache = new Map<string, Intl.NumberFormat>()
function fmt(key: string, make: () => Intl.NumberFormat) {
  let f = cache.get(key)
  if (!f) {
    f = make()
    cache.set(key, f)
  }
  return f
}

export function eur(v: number | null | undefined, digits = 0): string {
  if (v == null || !isFinite(v)) return '–'
  const x = Math.abs(v) < 0.5 && digits === 0 ? 0 : v
  return fmt(`eur${digits}`, () => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits })).format(x)
}

export function num(v: number | null | undefined, digits = 0): string {
  if (v == null || !isFinite(v)) return '–'
  return fmt(`n${digits}`, () => nf(digits)).format(v)
}

/** Anteil (0,05) → „5,0 %“ */
export function pct(v: number | null | undefined, digits = 1): string {
  if (v == null || !isFinite(v)) return '–'
  return `${fmt(`p${digits}`, () => new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits })).format(v * 100)} %`
}

/** Prozentwert (5) → „5 %“ */
export function pctv(v: number, digits = 2): string {
  return `${num(v, digits)} %`
}

export function parseNum(s: string): number | null {
  let t = s.trim().replace(/\s|€|%/g, '')
  if (!t) return null
  const comma = t.lastIndexOf(',')
  const dot = t.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    t = comma > dot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  } else if (comma >= 0) {
    t = t.replace(',', '.')
  } else if (dot >= 0) {
    // „1.234“ als Tausenderpunkt deuten, „1.5“ als Dezimal
    const parts = t.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) t = t.replace(/\./g, '')
  }
  const n = Number(t)
  return isFinite(n) ? n : null
}

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
