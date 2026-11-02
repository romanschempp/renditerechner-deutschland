import { GIFT_ALLOWANCE_CHILD, GIFT_TAX_BRACKETS_I } from './constants'

/** Schenkung-/Erbschaftsteuer Steuerklasse I inkl. Härteausgleich (§ 19 Abs. 3 ErbStG). */
export function giftTaxClassI(taxable: number): number {
  const x = Math.floor(Math.max(0, taxable) / 100) * 100
  if (x <= 0) return 0
  const idx = GIFT_TAX_BRACKETS_I.findIndex((b) => x <= b.upTo)
  const rate = GIFT_TAX_BRACKETS_I[idx].rate / 100
  let tax = x * rate
  if (idx > 0) {
    const prev = GIFT_TAX_BRACKETS_I[idx - 1]
    const prevTax = prev.upTo * (prev.rate / 100)
    const excess = x - prev.upTo
    const cap = rate <= 0.3 ? 0.5 : 0.75
    tax = Math.min(tax, prevTax + excess * cap)
  }
  return Math.round(tax)
}

/** Steuer bei Aufteilung auf mehrere Schenker (je eigener Freibetrag). */
export function giftTaxSplit(enrichment: number, donors: number, priorGifts: number): {
  perDonor: number
  taxablePerDonor: number
  tax: number
} {
  const perDonor = enrichment / donors
  const taxablePerDonor = Math.max(0, perDonor + priorGifts / donors - GIFT_ALLOWANCE_CHILD)
  const taxPer = giftTaxClassI(taxablePerDonor)
  // Steuer auf frühere Schenkungen wird angerechnet (§ 14 ErbStG)
  const priorTax = giftTaxClassI(Math.max(0, priorGifts / donors - GIFT_ALLOWANCE_CHILD))
  return { perDonor, taxablePerDonor, tax: Math.max(0, taxPer - priorTax) * donors }
}
