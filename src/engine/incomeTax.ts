import { SOLI, TARIFF_2026 } from './constants'

/** Einkommensteuer nach § 32a Abs. 1 EStG (Grundtarif 2026), auf volle Euro. */
export function incomeTaxBase(zve: number): number {
  const T = TARIFF_2026
  const x = Math.floor(Math.max(0, zve))
  let tax: number
  if (x <= T.basicAllowance) tax = 0
  else if (x <= T.zone2End) {
    const y = (x - T.basicAllowance) / 10000
    tax = (T.z2a * y + T.z2b) * y
  } else if (x <= T.zone3End) {
    const z = (x - T.zone2End) / 10000
    tax = (T.z3a * z + T.z3b) * z + T.z3c
  } else if (x <= T.zone4End) tax = 0.42 * x - T.z4c
  else tax = 0.45 * x - T.z5c
  return Math.floor(tax)
}

export interface TaxParams {
  filing: 'single' | 'joint'
  church: number
  /** Faktor für fortgeschriebene Tarifeckwerte (1 = Tarif 2026). */
  index: number
}

export interface TaxResult {
  est: number
  soli: number
  church: number
  total: number
}

/** Einkommensteuer inkl. Splitting, Soli (Freigrenze, Milderungszone) und Kirchensteuer. */
export function incomeTax(zve: number, p: TaxParams): TaxResult {
  const k = p.index || 1
  const joint = p.filing === 'joint'
  const base = zve / k
  const est = (joint ? 2 * incomeTaxBase(base / 2) : incomeTaxBase(base)) * k
  const free = (joint ? SOLI.freeJoint : SOLI.freeSingle) * k
  const soli = est <= free ? 0 : Math.min(SOLI.rate * est, SOLI.mitigation * (est - free))
  const church = (est * p.church) / 100
  return { est, soli, church, total: est + soli + church }
}

/** Grenzsteuersatz (inkl. Soli und KiSt) bei gegebenem zvE, numerisch. */
export function marginalRate(zve: number, p: TaxParams): number {
  return (incomeTax(zve + 100, p).total - incomeTax(zve, p).total) / 100
}
