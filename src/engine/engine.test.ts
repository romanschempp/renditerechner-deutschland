import { describe, expect, it } from 'vitest'
import { analyse, wealthOf } from './analysis'
import { exampleInputs } from './defaults'
import { giftTaxClassI, giftTaxSplit } from './gift'
import { incomeTax, incomeTaxBase } from './incomeTax'
import { irr } from './irr'
import { openLoan, stepLoan } from './loans'
import { computePurchase } from './purchase'
import { simulate } from './simulate'
import type { Inputs } from './types'

const p0 = { filing: 'single' as const, church: 0, index: 1 }

function plain(): Inputs {
  const i = exampleInputs()
  i.renovation.items = []
  i.renovation.later = []
  i.rent.phases = [{ id: 'a', kind: 'rent', months: null, childPct: 100 }]
  i.rent.vacancyPct = 0
  i.rent.tenantYears = 0
  i.tax.indexTariff = false
  i.tax.zveGrowth = 0
  return i
}

describe('Einkommensteuer 2026', () => {
  it('Grundfreibetrag und Zonen', () => {
    expect(incomeTaxBase(12348)).toBe(0)
    expect(incomeTaxBase(30000)).toBe(4217)
    expect(incomeTaxBase(100000)).toBe(30864)
    expect(incomeTaxBase(300000)).toBe(115529)
  })
  it('Tarif ist an den Zonengrenzen stetig', () => {
    for (const x of [12348, 17799, 69878, 277825]) {
      expect(Math.abs(incomeTaxBase(x + 1) - incomeTaxBase(x))).toBeLessThanOrEqual(1)
    }
  })
  it('Splitting verdoppelt den Grundtarif auf das halbe Einkommen', () => {
    expect(incomeTax(80000, { ...p0, filing: 'joint' }).est).toBe(2 * incomeTaxBase(40000))
  })
  it('Soli: Freigrenze und Milderungszone', () => {
    expect(incomeTax(70000, p0).soli).toBe(0)
    const high = incomeTax(200000, p0)
    expect(high.soli).toBeCloseTo(high.est * 0.055, 0)
    const mid = incomeTax(76000, p0)
    expect(mid.soli).toBeGreaterThan(0)
    expect(mid.soli).toBeLessThan(mid.est * 0.055)
  })
})

describe('Darlehen', () => {
  it('Annuität: Restschuld nach 12 Monaten wie Bankformel', () => {
    const s = openLoan({ id: 'l', label: 'x', type: 'annuity', amount: 200000, rate: 3, repay: 2, termYears: 30, fixedYears: 10, followRate: 3, followRepay: 2, specialRepay: 0, disagio: 0, graceYears: 0 })
    for (let i = 0; i < 12; i++) stepLoan(s)
    const r = 0.03 / 12
    const A = (200000 * 0.05) / 12
    const expected = 200000 * Math.pow(1 + r, 12) - (A * (Math.pow(1 + r, 12) - 1)) / r
    expect(s.balance).toBeCloseTo(expected, 4)
  })
})

describe('Hilfsfunktionen', () => {
  it('IRR', () => {
    expect(irr([-100, 110])).toBeCloseTo(0.1, 6)
    expect(irr([-1000, 100, 100, 1100])).toBeCloseTo(0.1, 6)
  })
  it('Schenkungsteuer mit Härteausgleich', () => {
    expect(giftTaxClassI(500000)).toBe(75000)
    expect(giftTaxClassI(300100)).toBe(33050)
    expect(giftTaxSplit(700000, 2, 0).tax).toBe(0)
    expect(giftTaxSplit(1000000, 1, 0).tax).toBe(90000)
  })
})

describe('Kauf', () => {
  it('Grunderwerbsteuer ohne Inventar, Aufteilung Boden/Gebäude', () => {
    const i = plain()
    const P = computePurchase(i)
    expect(P.grest).toBeCloseTo((240000 - 6000) * 0.055, 6)
    expect(P.akLand + P.akBuilding + P.akInventory).toBeCloseTo(240000 + P.acqCosts, 6)
    expect(P.akLand / (P.akLand + P.akBuilding)).toBeCloseTo(0.2, 6)
  })
  it('Familienbefreiung: keine Grunderwerbsteuer', () => {
    const i = plain()
    i.purchase.familyExempt = true
    expect(computePurchase(i).grest).toBe(0)
  })
})

describe('Simulation', () => {
  it('Gebäude-AfA 2 % im vollen Jahr', () => {
    const i = plain()
    const s = simulate(i, { mode: 'rent' })
    const P = s.purchase
    expect(s.years[0].afaBuilding).toBeCloseTo(P.akBuilding * 0.02, 4)
  })
  it('Zahlungsreihe ist konsistent mit dem Vermögen', () => {
    for (const mode of ['rent', 'sale'] as const) {
      const s = simulate(exampleInputs(), { mode })
      const sum = s.monthlyEk.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(wealthOf(s) - s.equity, 2)
    }
  })
  it('§ 23: steuerpflichtig nach 5 Jahren, steuerfrei nach 11 Jahren', () => {
    const i = plain()
    i.assumptions.valueGrowth = 4
    const s5 = simulate(i, { mode: 'sale', saleMonths: 60 })
    expect(s5.sale!.taxFree).toBe(false)
    expect(s5.sale!.tax).toBeGreaterThan(0)
    const s10 = simulate(i, { mode: 'sale', saleMonths: 120 })
    expect(s10.sale!.taxFree).toBe(false)
    const s11 = simulate(i, { mode: 'sale', saleMonths: 121 })
    expect(s11.sale!.taxFree).toBe(true)
  })
  it('§ 23: AfA erhöht den Veräußerungsgewinn', () => {
    const i = plain()
    i.assumptions.valueGrowth = 3
    const s = simulate(i, { mode: 'sale', saleMonths: 60 })
    const sale = s.sale!
    expect(sale.taxableGain).toBeCloseTo(sale.price - sale.saleCosts - (sale.akTotal - sale.afaTaken), 2)
    expect(sale.afaTaken).toBeGreaterThan(0)
  })
  it('Eigennutzung in den letzten Jahren macht den Verkauf steuerfrei', () => {
    const i = plain()
    i.assumptions.valueGrowth = 4
    i.rent.phases = [
      { id: 'a', kind: 'rent', months: 24, childPct: 100 },
      { id: 'b', kind: 'own', months: null, childPct: 100 },
    ]
    const s = simulate(i, { mode: 'sale', saleMonths: 60 })
    expect(s.sale!.taxFree).toBe(true)
  })
  it('§ 21 Abs. 2: Abzugsquote bei Vermietung an Kind', () => {
    const i = plain()
    i.rent.phases = [{ id: 'a', kind: 'childRent', months: null, childPct: 40 }]
    expect(simulate(i, { mode: 'rent' }).childQuota).toBeCloseTo(0.4, 6)
    i.rent.phases[0].childPct = 70
    expect(simulate(i, { mode: 'rent' }).childQuota).toBe(1)
  })
  it('Vermietung an Kind aus „Familie“ entspricht der Phase childRent', () => {
    const a = plain()
    a.family.enabled = true
    a.family.rentToChild = true
    a.family.rentPct = 66
    const b = plain()
    b.family.enabled = true
    b.rent.phases = [{ id: 'a', kind: 'childRent', months: null, childPct: 66 }]
    const sa = simulate(a, { mode: 'rent' })
    const sb = simulate(b, { mode: 'rent' })
    expect(sa.sumCf).toBeCloseTo(sb.sumCf, 6)
    expect(sa.childQuota).toBe(1)
    // Zeitraum: erst ab Jahr 2, für 3 Jahre
    a.family.rentFromYear = 2
    a.family.rentYears = 3
    const sc = simulate(a, { mode: 'rent' })
    expect(sc.years[0].phases).toEqual(['rent'])
    expect(sc.years[3].phases).toContain('childRent')
    expect(sc.years[6].phases).toEqual(['rent'])
  })
  it('Unentgeltliche Überlassung: keine Steuerwirkung', () => {
    const i = plain()
    i.rent.phases = [{ id: 'a', kind: 'childFree', months: null, childPct: 0 }]
    const s = simulate(i, { mode: 'rent' })
    expect(s.years.every((y) => Math.abs(y.vv) < 1e-6)).toBe(true)
  })
  it('15-%-Grenze aktiviert Renovierung als AfA', () => {
    const i = plain()
    i.renovation.items = [{ id: 'r', label: 'Kernsanierung', amount: 60000, kind: 'erhaltung', spreadYears: 1 }]
    const s = simulate(i, { mode: 'rent' })
    expect(s.purchase.nearCostsExceeded).toBe(true)
    expect(s.years[0].erhaltung).toBe(0)
    expect(s.warnings.some((w) => w.title.includes('15'))).toBe(true)
    i.renovation.items[0].amount = 10000
    const s2 = simulate(i, { mode: 'rent' })
    expect(s2.years[0].erhaltung).toBeCloseTo(10000, 4)
  })
  it('Schenkung mit Schuldübernahme ist teilentgeltlich', () => {
    const i = exampleInputs()
    i.family.enabled = true
    i.family.transfer = 'gift'
    i.family.transferYear = 12
    const s = simulate(i, { mode: 'rent' })
    expect(s.transfer).not.toBeNull()
    expect(s.transfer!.entgeltShare).toBeGreaterThan(0)
    expect(s.transfer!.giftTax).toBe(0)
  })
  it('Analyse läuft für beide Modi', () => {
    const i = exampleInputs()
    i.family.enabled = true
    for (const mode of ['rent', 'sale'] as const) {
      const a = analyse(i, mode)
      expect(a.kpis.irrEk).not.toBeNull()
      expect(a.hold.length).toBe(30)
      expect(a.family.length).toBe(6)
    }
  })
})
