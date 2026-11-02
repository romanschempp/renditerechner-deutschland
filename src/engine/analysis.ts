import { inheritanceTaxAt, simulate, type SimResult, type YearRow } from './simulate'
import type { CalcMode, Inputs, Phase } from './types'

export interface Kpis {
  totalInvestment: number
  equity: number
  equityPct: number
  loanSum: number
  ltv: number
  annualRent: number
  grossYield: number
  priceFactor: number
  netYield: number
  pricePerM2: number
  rentPerM2: number
  loanPaymentMonth: number
  opCostsYear: number
  cfPreMonth: number
  cfPostMonth: number
  taxYear: number
  cashOnCash: number | null
  dscr: number | null
  breakEvenRent: number | null
  ekReturn: number | null
  gkReturn: number | null
  irrEk: number | null
  irrGk: number | null
  multiple: number | null
  paybackYear: number | null
  wealthEnd: number
  valueEnd: number
  debtEnd: number
  profit: number
  avgNoiOnPrice: number
  avgNoiOnInvestment: number
  rentalProfit: number
  saleProfit: number
  stabYear: number | null
}

export interface ScenarioRow {
  key: 'pess' | 'real' | 'opt'
  growth: number
  sim: SimResult
}

export interface SensRow {
  label: string
  low: { ek: number | null; irr: number | null }
  high: { ek: number | null; irr: number | null }
  lowLabel: string
  highLabel: string
}

export interface HoldRow {
  years: number
  irrEk: number | null
  profit: number
  tax: number
  taxFree: boolean
}

export interface FamilyRow {
  key: string
  label: string
  description: string
  sim: SimResult
  cfMonth: number
  incomeTax: number
  saleTax: number
  giftTax: number
  wealth: number
  irrEk: number | null
}

export interface Analysis {
  mode: CalcMode
  sim: SimResult
  kpis: Kpis
  scenarios: ScenarioRow[]
  sensitivity: SensRow[]
  hold: HoldRow[]
  family: FamilyRow[]
  inheritance: { value: number; debt: number; tax: number; year: number } | null
}

export function wealthOf(s: SimResult): number {
  return s.sumCf + (s.sale ? s.sale.cashAtSale : s.terminalEquity)
}

export function kpisOf(inp: Inputs, s: SimResult, breakEvenRent: number | null): Kpis {
  const P = s.purchase
  const st: YearRow | null = s.stabilized
  const annualRent = (inp.rent.coldRent + inp.rent.parking + inp.rent.furnished) * 12
  const last = s.years[s.years.length - 1]
  const firstFull = s.years.find((y) => y.months === 12) ?? s.years[0]
  const rentalProfit = s.years.reduce((a, y) => a + y.noi - y.interest - y.taxEffect - y.giftTax + y.gainTax, 0)
  const wealthEnd = wealthOf(s)
  const profit = wealthEnd - P.equity
  // Verkaufsgewinn = Gesamtgewinn − laufender Gewinn (Preis − Kosten − Steuer − Investition − Finanzierungsnebenkosten)
  const saleProfit = profit - rentalProfit
  let payback: number | null = null
  for (const y of s.years) if (y.cumCf >= P.equity && P.equity > 0) { payback = y.idx; break }
  const avgNoi = s.years.length ? s.years.reduce((a, y) => a + y.noi, 0) / (s.months / 12) : 0
  return {
    totalInvestment: P.totalInvestment,
    equity: P.equity,
    equityPct: P.totalInvestment > 0 ? P.equity / P.totalInvestment : 0,
    loanSum: P.loanSum,
    ltv: P.price > 0 ? P.loanSum / P.price : 0,
    annualRent,
    grossYield: P.price > 0 ? annualRent / P.price : 0,
    priceFactor: annualRent > 0 ? P.price / annualRent : 0,
    netYield: st && P.totalInvestment > 0 ? st.noi / P.totalInvestment : 0,
    pricePerM2: inp.object.area > 0 ? P.price / inp.object.area : 0,
    rentPerM2: inp.object.area > 0 ? inp.rent.coldRent / inp.object.area : 0,
    loanPaymentMonth: firstFull ? firstFull.debtService / Math.max(1, firstFull.months) : 0,
    opCostsYear: st ? st.opCosts : 0,
    cfPreMonth: st ? st.cfPre / 12 : 0,
    cfPostMonth: st ? st.cfPost / 12 : 0,
    taxYear: st ? st.taxEffect : 0,
    cashOnCash: st && P.equity > 0 ? st.cfPost / P.equity : null,
    dscr: st && st.debtService > 0 ? st.noi / st.debtService : null,
    breakEvenRent,
    ekReturn: st ? st.ekReturn : null,
    gkReturn: st ? st.gkReturn : null,
    irrEk: s.irrEk,
    irrGk: s.irrGk,
    multiple: P.equity > 0 ? wealthEnd / P.equity : null,
    paybackYear: payback,
    wealthEnd,
    valueEnd: s.sale ? s.sale.price : last ? last.value : P.price,
    debtEnd: last ? last.balance : 0,
    profit,
    avgNoiOnPrice: P.price > 0 ? avgNoi / P.price : 0,
    avgNoiOnInvestment: P.totalInvestment > 0 ? avgNoi / P.totalInvestment : 0,
    rentalProfit,
    saleProfit,
    stabYear: st ? st.year : null,
  }
}

function clone(inp: Inputs): Inputs {
  return structuredClone(inp)
}

function breakEven(inp: Inputs, mode: CalcMode, base: SimResult): number | null {
  const st0 = base.stabilized
  if (!st0 || inp.rent.coldRent <= 0) return null
  const v = clone(inp)
  const delta = 100
  v.rent.coldRent += delta
  v.rent.localRent += delta
  const s1 = simulate(v, { mode })
  const st1 = s1.years.find((y) => y.year === st0.year)
  if (!st1) return null
  const slope = (st1.cfPost - st0.cfPost) / delta
  if (Math.abs(slope) < 1e-6) return null
  return inp.rent.coldRent - st0.cfPost / slope
}

function sens(inp: Inputs, mode: CalcMode, mutate: (v: Inputs, sign: 1 | -1) => void) {
  const out = (sign: 1 | -1) => {
    const v = clone(inp)
    mutate(v, sign)
    const s = simulate(v, { mode })
    return { ek: s.stabilized?.ekReturn ?? null, irr: s.irrEk }
  }
  return { low: out(-1), high: out(1) }
}

function mapPhases(phases: Phase[], fn: (p: Phase) => Phase): Phase[] {
  return phases.map((p) => fn({ ...p }))
}

export function analyse(inp: Inputs, mode: CalcMode): Analysis {
  const sim = simulate(inp, { mode })
  const be = breakEven(inp, mode, sim)
  const kpis = kpisOf(inp, sim, be)

  // Szenarien
  const scenarios: ScenarioRow[] = []
  if (mode === 'sale') {
    const years = inp.sale.years
    const realG = inp.sale.priceMode === 'direct' && years > 0 && inp.object.price > 0
      ? (Math.pow(inp.sale.direct / inp.object.price, 1 / years) - 1) * 100
      : inp.assumptions.valueGrowth
    scenarios.push({ key: 'pess', growth: realG + inp.sale.pessDelta, sim: simulate(inp, { mode, saleGrowth: realG + inp.sale.pessDelta }) })
    scenarios.push({ key: 'real', growth: realG, sim })
    scenarios.push({ key: 'opt', growth: realG + inp.sale.optDelta, sim: simulate(inp, { mode, saleGrowth: realG + inp.sale.optDelta }) })
  }

  // Sensitivität
  const sensitivity: SensRow[] = [
    { label: 'Miete', lowLabel: '−10 %', highLabel: '+10 %', ...sens(inp, mode, (v, s) => { const f = 1 + 0.1 * s; v.rent.coldRent *= f; v.rent.localRent *= f; v.rent.parking *= f }) },
    { label: 'Zins', lowLabel: '−1 Pp.', highLabel: '+1 Pp.', ...sens(inp, mode, (v, s) => { v.loans.forEach((l) => { l.rate = Math.max(0, l.rate + s); l.followRate = Math.max(0, l.followRate + s) }) }) },
    { label: 'Kaufpreis', lowLabel: '−5 %', highLabel: '+5 %', ...sens(inp, mode, (v, s) => { v.object.price *= 1 + 0.05 * s }) },
    { label: 'Wertentwicklung', lowLabel: '−1 Pp.', highLabel: '+1 Pp.', ...sens(inp, mode, (v, s) => { v.assumptions.valueGrowth += s; if (v.sale.priceMode === 'direct') v.sale.direct *= Math.pow(1 + 0.01 * s, v.sale.years) }) },
    { label: 'Mietausfall', lowLabel: '0 %', highLabel: '+5 Pp.', ...sens(inp, mode, (v, s) => { v.rent.vacancyPct = s < 0 ? 0 : v.rent.vacancyPct + 5 }) },
    { label: 'Einkommen (zvE)', lowLabel: '−30 %', highLabel: '+30 %', ...sens(inp, mode, (v, s) => { v.tax.zve *= 1 + 0.3 * s; v.tax.marginal = Math.min(47.5, Math.max(0, v.tax.marginal + 5 * s)) }) },
  ]

  // Bester Verkaufszeitpunkt
  const hold: HoldRow[] = []
  for (let y = 1; y <= 30; y++) {
    const s = simulate(inp, { mode: 'sale', saleMonths: y * 12 })
    hold.push({ years: y, irrEk: s.irrEk, profit: wealthOf(s) - s.equity, tax: s.sale?.tax ?? 0, taxFree: s.sale?.taxFree ?? true })
  }

  // Familienvarianten
  const family: FamilyRow[] = []
  let inheritance: Analysis['inheritance'] = null
  if (inp.family.enabled) {
    const pctChild = inp.rent.phases.find((p) => p.kind === 'childRent')?.childPct ?? 66
    const variant = (key: string, label: string, description: string, v: Inputs) => {
      const s = simulate(v, { mode })
      const months = s.months
      family.push({
        key, label, description, sim: s,
        cfMonth: s.sumCf / months,
        incomeTax: s.years.reduce((a, y) => a + y.taxEffect - y.gainTax, 0),
        saleTax: s.sale?.tax ?? 0,
        giftTax: s.years.reduce((a, y) => a + y.giftTax, 0),
        wealth: wealthOf(s),
        irrEk: s.irrEk,
      })
    }
    const noTransfer = (v: Inputs) => { v.family.transfer = 'none'; return v }
    const ext = clone(inp)
    ext.rent.phases = mapPhases(ext.rent.phases, (p) => (p.kind === 'childRent' || p.kind === 'childFree' ? { ...p, kind: 'rent' } : p))
    variant('extern', 'Fremdvermietung', 'Marktmiete, voller Werbungskostenabzug, 10-Jahres-Frist', noTransfer(ext))
    const cr = clone(inp)
    cr.rent.phases = mapPhases(cr.rent.phases, (p) => (p.kind === 'rent' || p.kind === 'childFree' ? { ...p, kind: 'childRent', childPct: pctChild } : p))
    variant('childRent', `Vermietung an Kind (${Math.round(pctChild)} %)`, '§ 21 Abs. 2 EStG, Fremdvergleich nötig', noTransfer(cr))
    const cf = clone(inp)
    cf.rent.phases = mapPhases(cf.rent.phases, (p) => (p.kind === 'rent' || p.kind === 'childRent' ? { ...p, kind: 'childFree' } : p))
    variant('childFree', 'Unentgeltlich an Kind', 'Keine Einnahmen und kein Abzug; gilt als Eigennutzung (§ 23)', noTransfer(cf))
    for (const t of ['gift', 'usufruct', 'saleToChild'] as const) {
      const v = clone(inp)
      v.family.transfer = t
      const labels = {
        gift: ['Schenkung an Kind', `in Jahr ${inp.family.transferYear}, ${inp.family.debtAssumed ? 'mit Schuldübernahme' : 'Schulden bleiben bei Eltern'}`],
        usufruct: ['Schenkung mit Nießbrauch', `in Jahr ${inp.family.transferYear}, Eltern behalten Mieten und AfA`],
        saleToChild: ['Verkauf an Kind', `in Jahr ${inp.family.transferYear} zu ${Math.round(inp.family.salePrice / 1000)} T€, ohne Grunderwerbsteuer`],
      }[t]
      variant(t, labels[0], labels[1], v)
      const row = family[family.length - 1]
      if (!row.sim.transfer) row.description += ' – liegt nach dem Ende des Zeitraums, daher ohne Wirkung'
    }
    const last = sim.years[sim.years.length - 1]
    if (last) {
      const rented = true
      inheritance = {
        value: sim.sale ? sim.sale.price : last.value,
        debt: last.balance,
        tax: inheritanceTaxAt(sim.sale ? 0 : last.value, last.balance, rented, inp.family.donors, inp.family.priorGifts),
        year: last.year,
      }
    }
  }

  return { mode, sim, kpis, scenarios, sensitivity, hold, family, inheritance }
}
