import {
  GWG_NET, RENTED_RESIDENTIAL_RELIEF, SPECULATION_FREE_LIMIT, SPECULATION_MONTHS,
  USUFRUCT_DIVISOR, VAT, lifeFactor, linearAfaRate,
} from './constants'
import { giftTaxClassI, giftTaxSplit } from './gift'
import { incomeTax, type TaxParams } from './incomeTax'
import { irrAnnualFromMonthly } from './irr'
import { openLoan, prepaymentPenalty, stepLoan, type LoanState } from './loans'
import { computePurchase, type PurchaseResult } from './purchase'
import type { CalcMode, CostKind, Inputs, Loan, PhaseKind } from './types'

export interface SimOptions {
  mode: CalcMode
  /** Haltedauer in Monaten bis zum Verkauf (überschreibt sale.years). */
  saleMonths?: number
  /** Wertentwicklung p. a. für den Verkaufspreis (Szenario). */
  saleGrowth?: number
  /** Betrachtungszeitraum in Jahren (Modus ohne Verkauf). */
  horizonYears?: number
  /** Interne Vorrechnung für die Totalüberschussprognose. */
  forceChildQuota?: boolean
  /** Ohne Familienübertragung rechnen. */
  noTransfer?: boolean
}

export type WarnLevel = 'info' | 'warn' | 'danger'
export interface Warning { level: WarnLevel; title: string; text: string }

export interface CostBreakdown {
  [key: string]: number
}

export interface YearRow {
  year: number
  idx: number
  months: number
  phases: PhaseKind[]
  rentSoll: number
  vacancyLoss: number
  rentEff: number
  savedRent: number
  opCosts: number
  costs: CostBreakdown
  capex: number
  noi: number
  interest: number
  principal: number
  debtService: number
  afaBuilding: number
  afaSpecial: number
  afaInventory: number
  erhaltung: number
  financeCosts: number
  deductibleCosts: number
  quota: number
  vv: number
  gain: number
  taxEffect: number
  taxUnlev: number
  zve: number
  estWithout: number
  estWith: number
  giftTax: number
  transferFlow: number
  gainTax: number
  cfPre: number
  cfPost: number
  cumCf: number
  balance: number
  value: number
  netEquity: number
  ekBase: number
  ekReturn: number | null
  gkReturn: number | null
  appreciation: number
}

export interface SaleResult {
  month: number
  years: number
  price: number
  agent: number
  otherCosts: number
  vfe: number
  saleCosts: number
  balance: number
  akTotal: number
  afaTaken: number
  bookValue: number
  gainPre: number
  taxableGain: number
  taxFree: boolean
  taxFreeReason: string
  tax: number
  /** Verkaufspreis − Verkaufskosten − Restschuld (vor Steuer). */
  cashAtSale: number
  netProceeds: number
  growth: number
}

export interface TransferResult {
  kind: 'gift' | 'usufruct' | 'saleToChild'
  month: number
  year: number
  value: number
  consideration: number
  entgeltShare: number
  enrichment: number
  usufructCapital: number
  usufructAnnual: number
  usufructFactor: number
  giftTax: number
  parentGain: number
  parentGainTaxable: boolean
  childCosts: number
  grestSaved: number
  newAfaBase: number
}

export interface SimResult {
  purchase: PurchaseResult
  months: number
  years: YearRow[]
  monthlyEk: number[]
  monthlyGk: number[]
  sale: SaleResult | null
  transfer: TransferResult | null
  terminalEquity: number
  irrEk: number | null
  irrGk: number | null
  stabilized: YearRow | null
  warnings: Warning[]
  childQuota: number
  childTup: number | null
  equity: number
  totalInvestment: number
  sumCf: number
  akTotal: number
}

interface Tranche {
  lot: number
  base: number
  rate: number
  method: 'linear' | 'degressive'
  startM: number
  cum: number
  residualYearStart: number
  switched: boolean
  switchAnnual: number
}

interface Lot {
  share: number
  startM: number
  ak: number
  afa: number
}

type Taxpayer = 'parents' | 'child'

const COST_LABELS: Record<string, string> = {
  hausgeld: 'Hausgeld (nicht umlagefähig)',
  reserve: 'Erhaltungsrücklage',
  umlage: 'Nebenkosten bei Leerstand',
  grundsteuer: 'Grundsteuer',
  insurance: 'Versicherungen',
  sev: 'Sondereigentumsverwaltung',
  maintenance: 'Instandhaltung',
  co2: 'CO₂-Kosten Vermieteranteil',
  bank: 'Kontoführung',
  taxAdvice: 'Steuerberatung',
  travel: 'Fahrtkosten',
  other: 'Sonstiges',
  agent: 'Vermietungsmakler',
}
export { COST_LABELS }

function childQuotaFor(pct: number): number {
  if (pct >= 66) return 1
  return Math.max(0, pct / 100)
}

export function simulate(inp: Inputs, opts: SimOptions): SimResult {
  const warnings: Warning[] = []
  const P = computePurchase(inp)
  const o = inp.object
  const r = inp.rent
  const c = inp.costs
  const pm = Math.min(12, Math.max(1, Math.round(o.purchaseMonth)))
  const py = Math.round(o.purchaseYear)
  const isSale = opts.mode === 'sale'
  const saleM = isSale
    ? Math.max(1, Math.round(opts.saleMonths ?? inp.sale.years * 12))
    : 0
  const N = isSale ? saleM : Math.max(12, Math.round((opts.horizonYears ?? inp.assumptions.horizon) * 12))
  const g = inp.assumptions.valueGrowth / 100
  const saleG = (opts.saleGrowth ?? inp.assumptions.valueGrowth) / 100

  const calYear = (m: number) => py + Math.floor((pm - 1 + m) / 12)
  const calMonth = (m: number) => ((pm - 1 + m) % 12) + 1
  const valueAt = (monthsElapsed: number) => P.price * Math.pow(1 + g, monthsElapsed / 12)

  // ---- Nutzungsphasen --------------------------------------------------
  const phaseOf: PhaseKind[] = []
  const childPctOf: number[] = []
  {
    let m = 0
    const ph = r.phases.length ? r.phases : [{ id: 'x', kind: 'rent' as PhaseKind, months: null, childPct: 100 }]
    for (const p of ph) {
      const len = p.months == null ? Infinity : Math.max(0, Math.round(p.months))
      for (let i = 0; i < len && m < Math.max(N, 360); i++, m++) {
        phaseOf[m] = p.kind
        childPctOf[m] = p.childPct
      }
      if (m >= Math.max(N, 360)) break
    }
    const last = ph[ph.length - 1]
    while (m < Math.max(N, 360)) {
      phaseOf[m] = last.kind
      childPctOf[m] = last.childPct
      m++
    }
    // Vermietung an Kind aus „Familie“: überschreibt die Phasen im Zeitraum (Leerstand bleibt)
    const f = inp.family
    if (f.enabled && f.rentToChild) {
      const from = Math.max(0, Math.round(f.rentFromYear * 12))
      const to = f.rentYears > 0 ? from + Math.round(f.rentYears * 12) : Infinity
      for (let i = from; i < Math.min(to, phaseOf.length); i++) {
        if (phaseOf[i] === 'vacant') continue
        phaseOf[i] = 'childRent'
        childPctOf[i] = f.rentPct
      }
    }
  }

  // Totalüberschussprognose für verbilligte Vermietung an Kinder (50–66 %)
  let childTup: number | null = null
  const needsTup = phaseOf.slice(0, N).some((k, i) => k === 'childRent' && childPctOf[i] >= 50 && childPctOf[i] < 66)
  let tupPositive = false
  if (needsTup && !opts.forceChildQuota) {
    const pre = simulate(inp, { mode: 'rent', horizonYears: 30, forceChildQuota: true, noTransfer: true })
    childTup = pre.childTup
    tupPositive = (childTup ?? -1) >= 0
  }
  const quotaRaw = (m: number): number => {
    const k = phaseOf[m]
    if (k === 'rent') return 1
    if (k === 'childRent') {
      const pct = childPctOf[m]
      if (opts.forceChildQuota) return 1
      if (pct >= 66) return 1
      if (pct >= 50 && tupPositive) return 1
      return childQuotaFor(pct)
    }
    if (k === 'own' || k === 'childFree') return 0
    return -1
  }
  const quotaOf: number[] = []
  for (let m = Math.max(N, 360) - 1; m >= 0; m--) {
    const q = quotaRaw(m)
    quotaOf[m] = q >= 0 ? q : (quotaOf[m + 1] ?? 1)
  }

  // ---- Anschaffungsnahe HK, AfA-Tranchen -------------------------------
  const capNear = P.nearCostsExceeded
  if (capNear) {
    warnings.push({
      level: 'danger',
      title: '15-%-Grenze überschritten',
      text: `Erhaltungsaufwand der ersten 3 Jahre (netto ${eur(P.nearCostsNet)}) übersteigt 15 % der Gebäude-Anschaffungskosten (${eur(P.nearCostsLimit)}). Die Kosten werden als anschaffungsnahe Herstellungskosten aktiviert und nur über die AfA abgeschrieben (§ 6 Abs. 1 Nr. 1a EStG).`,
    })
  } else if (P.nearCostsNet > 0.8 * P.nearCostsLimit && P.nearCostsNet > 0) {
    warnings.push({
      level: 'warn',
      title: 'Nahe an der 15-%-Grenze',
      text: `Erhaltungsaufwand der ersten 3 Jahre: netto ${eur(P.nearCostsNet)} von maximal ${eur(P.nearCostsLimit)}. Weitere Maßnahmen in den ersten 3 Jahren können die Grenze überschreiten.`,
    })
  }

  const degressive = inp.tax.afaMode === 'degressive' && o.newBuildDegressive
  const linRate = inp.tax.afaMode === 'custom' ? inp.tax.customRate : linearAfaRate(o.yearBuilt)
  if (inp.tax.afaMode === 'degressive' && !o.newBuildDegressive) {
    warnings.push({ level: 'warn', title: 'Degressive AfA nicht möglich', text: 'Die degressive AfA (§ 7 Abs. 5a EStG) gilt nur für Neubauten mit Baubeginn 01.10.2023–30.09.2029 bzw. Kauf im Fertigstellungsjahr. Es wird linear gerechnet.' })
  }
  const tranches: Tranche[] = []
  const lots: Lot[] = [{ share: 1, startM: 0, ak: P.akLand + P.akBuilding, afa: 0 }]
  const addTranche = (base: number, startM: number, lot = 0, method: 'linear' | 'degressive' = degressive ? 'degressive' : 'linear', rate = degressive ? 5 : linRate) => {
    if (base <= 0) return
    tranches.push({ lot, base, rate, method, startM, cum: 0, residualYearStart: base, switched: false, switchAnnual: 0 })
  }
  const initialHerst = inp.renovation.items.filter((i) => i.kind === 'herstellung').reduce((s, i) => s + i.amount, 0)
  const initialErh = inp.renovation.items.filter((i) => i.kind === 'erhaltung').reduce((s, i) => s + i.amount, 0)
  let subsidyLeft = P.subsidy
  const herstNet = Math.max(0, initialHerst + (capNear ? initialErh : 0) - subsidyLeft)
  subsidyLeft = Math.max(0, subsidyLeft - initialHerst - (capNear ? initialErh : 0))
  const specialBase = o.special !== 'none' ? Math.min(Math.max(0, o.specialBase), P.akBuilding + herstNet) : 0
  const normalBase = P.akBuilding + herstNet - specialBase
  addTranche(normalBase, 0)
  lots[0].ak += herstNet
  const base7b = o.sonder7b ? Math.min(normalBase, 4000 * o.area) : 0
  const purchaseYear = py

  // Inventar
  interface Inv { amount: number; startM: number; cum: number }
  const inventories: Inv[] = []
  if (P.akInventory > 0) inventories.push({ amount: P.akInventory, startM: 0, cum: 0 })

  // Erhaltungsaufwand (verteilbar) als Plan: Jahr → Betrag
  const erhPlan = new Map<number, { amount: number; quota: number; taxpayer: Taxpayer }[]>()
  const addErh = (amount: number, m: number, spread: number) => {
    const y0 = calYear(m)
    const n = Math.min(5, Math.max(1, Math.round(spread || 1)))
    for (let k = 0; k < n; k++) {
      const arr = erhPlan.get(y0 + k) ?? []
      arr.push({ amount: amount / n, quota: quotaOf[m], taxpayer: 'parents' })
      erhPlan.set(y0 + k, arr)
    }
  }
  const handleItem = (amount: number, kind: CostKind, spread: number, m: number, near: boolean) => {
    if (amount <= 0) return
    if (kind === 'erhaltung' && !(near && capNear)) addErh(amount, m, spread)
    else if (kind === 'inventar') {
      if (amount / (1 + VAT) <= GWG_NET) addErh(amount, m, 1)
      else inventories.push({ amount, startM: m, cum: 0 })
    } else if (m > 0) {
      // nachträgliche / anschaffungsnahe Herstellungskosten
      for (let li = 0; li < lots.length; li++) {
        addTranche(amount * lots[li].share, m, li)
        lots[li].ak += amount * lots[li].share
      }
    }
  }
  // Initiale Erhaltung (abzgl. verbleibendem Zuschuss)
  if (!capNear && initialErh > 0) {
    const erhNet = Math.max(0, initialErh - subsidyLeft)
    for (const it of inp.renovation.items.filter((i) => i.kind === 'erhaltung')) {
      handleItem((it.amount * erhNet) / initialErh, 'erhaltung', it.spreadYears, 0, true)
    }
  }
  for (const it of inp.renovation.items.filter((i) => i.kind === 'inventar')) handleItem(it.amount, 'inventar', 1, 0, true)

  // ---- Darlehen -------------------------------------------------------------
  let loans: LoanState[] = inp.loans.filter((l) => l.amount > 0).map(openLoan)
  const disagioYears = new Map<number, number>()
  for (const l of inp.loans) {
    const d = (l.amount * l.disagio) / 100
    if (d <= 0) continue
    if (l.disagio <= 5 && l.fixedYears >= 5) disagioYears.set(calYear(0), (disagioYears.get(calYear(0)) ?? 0) + d)
    else {
      const n = Math.max(1, Math.round(l.fixedYears))
      for (let k = 0; k < n; k++) disagioYears.set(calYear(0) + k, (disagioYears.get(calYear(0) + k) ?? 0) + d / n)
    }
  }

  // ---- Familienübertragung ---------------------------------------------------
  const fam = inp.family
  const transferKind = !opts.noTransfer && fam.enabled && fam.transfer !== 'none' ? fam.transfer : null
  const transferM = transferKind ? Math.max(1, Math.round(fam.transferYear * 12)) : -1
  let transfer: TransferResult | null = null
  let taxpayer: Taxpayer = 'parents'
  let interestDeductible = true

  const taxParams: Record<Taxpayer, (year: number) => { zve: number; p: TaxParams }> = {
    parents: (year) => ({
      zve: inp.tax.zve * Math.pow(1 + inp.tax.zveGrowth / 100, year - py),
      p: { filing: inp.tax.filing, church: inp.tax.church, index: inp.tax.indexTariff ? Math.pow(1 + inp.tax.tariffIndex / 100, Math.max(0, year - 2026)) : 1 },
    }),
    child: (year) => ({
      zve: fam.child.zve * Math.pow(1 + inp.tax.zveGrowth / 100, year - py),
      p: { filing: 'single', church: 0, index: inp.tax.indexTariff ? Math.pow(1 + inp.tax.tariffIndex / 100, Math.max(0, year - 2026)) : 1 },
    }),
  }
  const lossCarry: Record<Taxpayer, number> = { parents: 0, child: 0 }
  const lossCarryU: Record<Taxpayer, number> = { parents: 0, child: 0 }

  const taxEffectFor = (tp: Taxpayer, year: number, income: number, carry: Record<Taxpayer, number>) => {
    const { zve, p } = taxParams[tp](year)
    if (inp.tax.mode === 'marginal' && tp === 'parents') {
      // Grenzsteuersatz-Modus: Verluste werden voll verrechnet
      return { effect: (income * inp.tax.marginal) / 100, zve, without: 0, with: 0 }
    }
    let total = zve + income
    if (carry[tp] < 0 && total > 0) {
      const use = Math.min(total, -carry[tp])
      total -= use
      carry[tp] += use
    }
    if (total < 0) {
      carry[tp] += total
      total = 0
    }
    const without = incomeTax(zve, p).total
    const withT = incomeTax(total, p).total
    return { effect: withT - without, zve, without, with: withT }
  }

  // ---- Monatsschleife ------------------------------------------------------
  let rentBase = r.coldRent
  let extras = r.parking + r.furnished
  let local = r.localRent
  let costFactor = 1
  let modernAdd = 0
  const rentHist: number[] = [rentBase]
  let changeEnd = -1
  let capWarned = false
  let bremseWarned = false
  let prevPhase: PhaseKind | null = null

  if (r.mietpreisbremse && r.coldRent > r.localRent * 1.1 + 0.5 && phaseOf[0] !== 'own') {
    warnings.push({ level: 'warn', title: 'Mietpreisbremse', text: `Die Kaltmiete (${eur(r.coldRent)}) liegt mehr als 10 % über der ortsüblichen Vergleichsmiete (${eur(r.localRent)}). Bei Neuvermietung nur zulässig mit Ausnahme (Vormiete, Neubau ab 01.10.2014, umfassende Modernisierung).` })
  }

  const years: YearRow[] = []
  let yr: YearRow | null = null
  const yAcc = new Map<number, Record<Taxpayer, { vv: number; vvU: number; gain: number; gainU: number }>>()
  const monthlyEk: number[] = new Array(N + 1).fill(0)
  const monthlyGk: number[] = new Array(N + 1).fill(0)
  monthlyEk[0] = -P.equity
  monthlyGk[0] = -P.totalInvestment
  let afaTakenBuilding = 0

  const newYear = (m: number): YearRow => ({
    year: calYear(m), idx: years.length + 1, months: 0, phases: [], rentSoll: 0, vacancyLoss: 0, rentEff: 0,
    savedRent: 0, opCosts: 0, costs: {}, capex: 0, noi: 0, interest: 0, principal: 0, debtService: 0,
    afaBuilding: 0, afaSpecial: 0, afaInventory: 0, erhaltung: 0, financeCosts: 0, deductibleCosts: 0,
    quota: 0, vv: 0, gain: 0, taxEffect: 0, taxUnlev: 0, zve: 0, estWithout: 0, estWith: 0, giftTax: 0,
    transferFlow: 0, gainTax: 0, cfPre: 0, cfPost: 0, cumCf: 0, balance: 0, value: 0, netEquity: 0, ekBase: 0,
    ekReturn: null, gkReturn: null, appreciation: 0,
  })
  const acc = (y: number, tp: Taxpayer) => {
    let a = yAcc.get(y)
    if (!a) {
      a = { parents: { vv: 0, vvU: 0, gain: 0, gainU: 0 }, child: { vv: 0, vvU: 0, gain: 0, gainU: 0 } }
      yAcc.set(y, a)
    }
    return a[tp]
  }

  let sale: SaleResult | null = null

  const closeYear = (row: YearRow, lastM: number, isFinal: boolean) => {
    // Erhaltung und Disagio des Kalenderjahres
    const erh = erhPlan.get(row.year) ?? []
    for (const e of erh) {
      const d = e.amount * e.quota
      row.erhaltung += d
      acc(row.year, e.taxpayer).vv -= d
      acc(row.year, e.taxpayer).vvU -= d
    }
    const dis = disagioYears.get(row.year) ?? 0
    if (dis > 0) {
      const d = dis * (interestDeductible ? quotaOf[0] : 0)
      row.financeCosts += d
      acc(row.year, 'parents').vv -= d
    }
    if (isFinal && isSale) {
      // Beim Verkauf wird noch nicht verteilter Erhaltungsaufwand und Disagio sofort abgezogen
      for (const [yy, arr] of erhPlan) {
        if (yy <= row.year) continue
        for (const e of arr) {
          const d = e.amount * e.quota
          row.erhaltung += d
          acc(row.year, e.taxpayer).vv -= d
          acc(row.year, e.taxpayer).vvU -= d
        }
      }
      for (const [yy, dd] of disagioYears) {
        if (yy <= row.year) continue
        const d = dd * (interestDeductible ? quotaOf[0] : 0)
        row.financeCosts += d
        acc(row.year, 'parents').vv -= d
      }
    }
    const a = yAcc.get(row.year)
    let effect = 0
    let effectU = 0
    row.zve = taxParams.parents(row.year).zve
    if (a) {
      for (const tp of ['parents', 'child'] as Taxpayer[]) {
        const v = a[tp]
        if (Math.abs(v.vv) < 0.005 && Math.abs(v.gain) < 0.005 && Math.abs(v.vvU) < 0.005) continue
        const t = taxEffectFor(tp, row.year, v.vv + v.gain, lossCarry)
        const tu = taxEffectFor(tp, row.year, v.vvU + v.gainU, lossCarryU)
        effect += t.effect
        effectU += tu.effect
        if (tp === 'parents') {
          row.estWithout = t.without
          row.estWith = t.with
        }
        row.vv += v.vv
        row.gain += v.gain
      }
    }
    row.taxEffect = effect
    row.taxUnlev = effectU
    monthlyEk[lastM + 1] -= effect
    monthlyGk[lastM + 1] -= effectU
    row.cfPost = row.cfPre - effect
  }

  for (let m = 0; m < N; m++) {
    const y = calYear(m)
    if (!yr || yr.year !== y) {
      if (yr) closeYear(yr, m - 1, false)
      yr = newYear(m)
      years.push(yr)
    }
    const row = yr
    const phase = phaseOf[m]
    const q = quotaOf[m]
    const childPct = childPctOf[m]
    row.months += 1
    if (!row.phases.includes(phase)) row.phases.push(phase)

    // Jahrestag: Steigerungen
    if (m > 0 && m % 12 === 0) {
      const k = m / 12
      local *= 1 + r.localGrowth / 100
      costFactor *= 1 + c.growth / 100
      const manual = r.manual[k + 1]
      const growthF = r.model === 'index' ? 1 + inp.assumptions.inflation / 100 : 1 + r.growth / 100
      if (manual != null && manual > 0) {
        rentBase = manual
      } else if (r.model === 'vergleich') {
        const cand = rentBase * growthF
        const ref = rentHist[Math.max(0, k - 3)]
        const cap3 = ref * (r.tightMarket ? 1.15 : 1.2)
        const allowed = Math.max(rentBase, Math.min(cand, local, cap3))
        if (cand > allowed + 0.5 && !capWarned && (phase === 'rent')) {
          capWarned = true
          warnings.push({ level: 'info', title: 'Mieterhöhung begrenzt', text: `Im Jahr ${k + 1} ist die gewünschte Steigerung nicht vollständig zulässig: Begrenzung auf die ortsübliche Vergleichsmiete und die Kappungsgrenze (${r.tightMarket ? 15 : 20} % in 3 Jahren, § 558 BGB). Gerechnet wird mit der zulässigen Miete.` })
        }
        rentBase = allowed
      } else {
        rentBase *= growthF
      }
      extras *= growthF
      rentHist[k] = rentBase
      // Mieterwechsel
      if (r.tenantYears > 0 && k % Math.round(r.tenantYears) === 0 && phase === 'rent') {
        changeEnd = m + Math.round(r.changeVacancy)
        const newRent = (local * r.newLeasePct) / 100
        rentBase = r.mietpreisbremse ? Math.max(rentBase, Math.min(newRent, local * 1.1)) : Math.max(rentBase, newRent)
        if (r.mietpreisbremse && r.newLeasePct > 110 && !bremseWarned) {
          bremseWarned = true
          warnings.push({ level: 'info', title: 'Neuvermietung unter Mietpreisbremse', text: 'Bei Mieterwechsel wird die Neuvertragsmiete auf 110 % der ortsüblichen Vergleichsmiete begrenzt (§ 556d BGB).' })
        }
        const chCost = r.changeCost * costFactor
        const agent = r.changeAgentMonths * rentBase * (1 + VAT)
        row.capex += chCost
        row.costs.agent = (row.costs.agent ?? 0) + agent
        monthlyEk[m + 1] -= chCost + agent
        monthlyGk[m + 1] -= chCost + agent
        row.cfPre -= chCost + agent
        row.noi -= chCost + agent
        addErh(chCost, m, 1)
        acc(y, taxpayer).vv -= agent * q
        acc(y, taxpayer).vvU -= agent * q
        row.deductibleCosts += agent * q
      }
    }
    // Wechsel in Fremdvermietung nach Kind/Eigennutzung = neuer Mietvertrag
    if (phase === 'rent' && prevPhase && prevPhase !== 'rent' && prevPhase !== 'vacant') {
      const newRent = (local * r.newLeasePct) / 100
      rentBase = r.mietpreisbremse ? Math.min(newRent, local * 1.1) : newRent
    }
    prevPhase = phase

    // Spätere Investitionen
    for (const it of inp.renovation.later) {
      if ((Math.max(1, Math.round(it.year)) - 1) * 12 !== m || it.amount <= 0) continue
      row.capex += it.amount
      monthlyEk[m + 1] -= it.amount
      monthlyGk[m + 1] -= it.amount
      row.cfPre -= it.amount
      row.noi -= it.amount
      const near = (it.year - 1) * 12 < 36
      if (it.kind === 'erhaltung' && !(near && capNear)) {
        const n = Math.min(5, Math.max(1, Math.round(it.spreadYears || 1)))
        for (let k = 0; k < n; k++) {
          const arr = erhPlan.get(y + k) ?? []
          arr.push({ amount: it.amount / n, quota: q, taxpayer })
          erhPlan.set(y + k, arr)
        }
      } else handleItem(it.amount, it.kind === 'erhaltung' ? 'herstellung' : it.kind, it.spreadYears, m, near)
      if (it.modernisation) {
        let add = (it.amount * 0.08) / 12
        const perM2 = rentBase / Math.max(1, o.area)
        const cap = (perM2 < 7 ? 2 : 3) * o.area
        add = Math.min(add, Math.max(0, cap - modernAdd))
        modernAdd += add
      }
    }

    // Miete
    const umlage = c.umlage * costFactor
    let soll = 0
    let eff = 0
    let saved = 0
    let umlShare = 0
    if (phase === 'rent') {
      soll = rentBase + extras + modernAdd
      const inChange = m < changeEnd
      eff = inChange ? 0 : soll * (1 - r.vacancyPct / 100)
      umlShare = inChange ? 1 : r.vacancyPct / 100
    } else if (phase === 'childRent') {
      const warm = (childPct / 100) * (local + umlage)
      soll = Math.max(0, warm - umlage)
      eff = soll
    } else if (phase === 'own') {
      saved = r.ownSavedRent ? local : 0
    } else if (phase === 'vacant' || phase === 'childFree') {
      umlShare = 1
    }
    row.rentSoll += soll
    row.vacancyLoss += soll - eff
    row.rentEff += eff
    row.savedRent += saved

    // Laufende Kosten
    const letting = phase === 'rent' || phase === 'childRent'
    const costs: [string, number, boolean][] = [
      ['hausgeld', c.hausgeldNonUml * costFactor, true],
      ['reserve', c.reserve * costFactor, c.reserveDeductible],
      ['umlage', (c.grundsteuerUmlage ? umlage : Math.max(0, umlage - (c.grundsteuer * costFactor) / 12)) * umlShare, true],
      ['grundsteuer', c.grundsteuerUmlage ? 0 : (c.grundsteuer * costFactor) / 12, true],
      ['insurance', (c.insurance * costFactor) / 12, true],
      ['sev', c.sev * costFactor, true],
      ['maintenance', (c.maintenance * o.area * costFactor) / 12, true],
      ['co2', letting ? (c.co2 * costFactor) / 12 : 0, true],
      ['bank', (c.bank * costFactor) / 12, true],
      ['taxAdvice', q > 0 ? (c.taxAdvice * costFactor) / 12 : 0, true],
      ['travel', q > 0 ? (c.travel * costFactor) / 12 : 0, true],
      ['other', (c.other * costFactor) / 12, true],
    ]
    let op = 0
    let ded = 0
    for (const [key, val, deductible] of costs) {
      if (val === 0) continue
      op += val
      row.costs[key] = (row.costs[key] ?? 0) + val
      if (deductible) ded += val * q
    }
    row.opCosts += op
    row.deductibleCosts += ded

    // Darlehen
    let interest = 0
    let principal = 0
    for (const ls of loans) {
      const lm = stepLoan(ls)
      interest += lm.interest
      principal += lm.principal + lm.special
    }
    row.interest += interest
    row.principal += principal
    row.debtService += interest + principal

    // AfA
    let afaB = 0
    let afaS = 0
    let afaI = 0
    for (const t of tranches) {
      if (m < t.startM || t.cum >= t.base - 0.005) continue
      const yearsElapsed = (m - t.startM) / 12
      let monthly: number
      if (t.method === 'linear') monthly = (t.base * t.rate) / 1200
      else {
        if (calMonth(m) === 1 || m === t.startM) {
          t.residualYearStart = t.base - t.cum
          const life = 100 / 3 - yearsElapsed
          const lin = life > 0 ? t.residualYearStart / life : t.residualYearStart
          if (!t.switched && lin > t.residualYearStart * 0.05) {
            t.switched = true
            t.switchAnnual = lin
          }
        }
        monthly = t.switched ? t.switchAnnual / 12 : (t.residualYearStart * 0.05) / 12
      }
      monthly = Math.min(monthly, t.base - t.cum)
      t.cum += monthly
      const d = monthly * q
      afaB += d
      lots[t.lot].afa += d
    }
    // § 7i/§ 7h und § 7b: volle Jahresbeträge, verteilt auf die Monate im Jahr
    const yIdx = y - purchaseYear
    const monthsInYear = yIdx === 0 ? 13 - pm : 12
    if (specialBase > 0 && yIdx < 12) {
      const rate = yIdx < 8 ? 0.09 : 0.07
      const d = ((specialBase * rate) / monthsInYear) * q
      afaS += d
      lots[0].afa += d
    }
    if (base7b > 0 && yIdx < 4) {
      const d = ((base7b * 0.05) / monthsInYear) * q
      afaS += d
      lots[0].afa += d
    }
    for (const iv of inventories) {
      if (m < iv.startM || iv.cum >= iv.amount - 0.005) continue
      const monthly = Math.min(iv.amount / 120, iv.amount - iv.cum)
      iv.cum += monthly
      afaI += monthly * q
    }
    row.afaBuilding += afaB
    row.afaSpecial += afaS
    row.afaInventory += afaI
    afaTakenBuilding += afaB + afaS

    // Finanzierungskosten im Kaufmonat
    let fin = 0
    if (m === 0) fin = (P.mortgageFees + P.financeFees) * q
    row.financeCosts += fin

    // Steuerliches Ergebnis des Monats
    const intDed = interestDeductible ? interest * q : 0
    const vv = eff - ded - intDed - afaB - afaS - afaI - fin
    const a = acc(y, taxpayer)
    a.vv += vv
    a.vvU += vv + intDed + fin
    row.quota += q

    // Cashflow
    const noi = eff + saved - op
    row.noi += noi
    const cf = noi - interest - principal
    row.cfPre += cf
    monthlyEk[m + 1] += cf
    monthlyGk[m + 1] += noi

    // ---- Übertragung an Kind ---------------------------------------------
    if (m + 1 === transferM && transferKind) {
      const value = valueAt(m + 1)
      const tv = fam.taxValue > 0 ? fam.taxValue : value
      const rented = phaseOf[m + 1] === 'rent' || phaseOf[m + 1] === 'childRent'
      const relief = rented ? 1 - RENTED_RESIDENTIAL_RELIEF : 1
      const balance = loans.reduce((s, l) => s + l.balance, 0)
      const tr: TransferResult = {
        kind: transferKind, month: m + 1, year: calYear(m + 1), value, consideration: 0, entgeltShare: 0,
        enrichment: 0, usufructCapital: 0, usufructAnnual: 0, usufructFactor: 0, giftTax: 0, parentGain: 0,
        parentGainTaxable: false, childCosts: 0, grestSaved: 0, newAfaBase: 0,
      }
      tr.grestSaved = (value * inp.purchase.grest) / 100
      let flow = 0
      if (transferKind === 'usufruct') {
        const ageAt = fam.parentAge + (m + 1) / 12
        const annual = Math.min(row.noi * (12 / Math.max(1, row.months)), tv / USUFRUCT_DIVISOR)
        const factor = lifeFactor(ageAt, fam.parentSex)
        tr.usufructAnnual = Math.max(0, annual)
        tr.usufructFactor = factor
        tr.usufructCapital = Math.max(0, annual) * factor
        tr.enrichment = Math.max(0, tv * relief - tr.usufructCapital)
        tr.giftTax = giftTaxSplit(tr.enrichment, fam.donors, fam.priorGifts).tax
      } else {
        let consideration = 0
        if (transferKind === 'gift') consideration = fam.debtAssumed ? balance : 0
        else consideration = Math.min(value, Math.max(0, fam.salePrice))
        const q2 = value > 0 ? Math.min(1, consideration / value) : 0
        tr.consideration = consideration
        tr.entgeltShare = q2
        // Gewinn der Eltern auf den entgeltlichen Teil (§ 23)
        let parentGain = 0
        let taxable = false
        for (const lot of lots) {
          const part = q2 * lot.share
          if (part <= 0) continue
          const g2 = consideration * lot.share - q2 * (lot.ak - lot.afa)
          parentGain += g2
          if (m + 1 - lot.startM <= SPECULATION_MONTHS) taxable = true
        }
        const ownExempt = ownUseExempt(m + 1)
        tr.parentGain = parentGain
        tr.parentGainTaxable = taxable && !ownExempt && parentGain >= SPECULATION_FREE_LIMIT
        if (tr.parentGainTaxable) {
          acc(y, 'parents').gain += parentGain
          acc(y, 'parents').gainU += parentGain
        }
        // Schenkungsteuer auf den unentgeltlichen Teil
        const giftPart = transferKind === 'gift' ? tv * relief - (fam.debtAssumed ? balance * relief : 0) : Math.max(0, tv - consideration) * relief
        tr.enrichment = Math.max(0, giftPart)
        tr.giftTax = giftTaxSplit(tr.enrichment, fam.donors, fam.priorGifts).tax
        // Neue Lose: unentgeltlicher Teil führt fort, entgeltlicher Teil neu angeschafft
        const childCosts = transferKind === 'saleToChild' ? consideration * ((inp.purchase.notary + inp.purchase.registry) / 100) : 0
        tr.childCosts = childCosts
        if (q2 > 0) {
          for (const lot of lots) {
            lot.ak *= 1 - q2
            lot.afa *= 1 - q2
            lot.share *= 1 - q2
          }
          for (const t of tranches) {
            t.base *= 1 - q2
            t.cum *= 1 - q2
            t.residualYearStart *= 1 - q2
          }
          const newLot = lots.length
          lots.push({ share: q2, startM: m + 1, ak: consideration + childCosts, afa: 0 })
          const bShare = 1 - P.landShare
          tr.newAfaBase = (consideration + childCosts) * bShare
          addTranche(tr.newAfaBase, m + 1, newLot, 'linear', linearAfaRate(o.yearBuilt))
        }
        if (transferKind === 'gift' && !fam.debtAssumed && balance > 0) {
          interestDeductible = false
          warnings.push({ level: 'warn', title: 'Schulden bleiben bei den Eltern', text: 'Nach der Schenkung haben die Eltern keine Mieteinnahmen mehr; ihre Schuldzinsen sind dann nicht mehr abziehbar. Übliche Lösung: Kind übernimmt die Darlehen (gemischte Schenkung) oder Ablösung vor der Schenkung.' })
        }
        if (transferKind === 'saleToChild') {
          // Ablösung der Elterndarlehen, neues Darlehen des Kindes
          let vfe = 0
          for (const ls of loans) vfe += prepaymentPenalty(ls, inp.vfe.mode, inp.vfe.pct, inp.vfe.reinvestRate)
          const childLoan: Loan = {
            id: 'child', label: 'Darlehen Kind', type: 'annuity', amount: consideration, rate: fam.childLoanRate,
            repay: fam.childLoanRepay, termYears: 30, fixedYears: 30, followRate: fam.childLoanRate,
            followRepay: fam.childLoanRepay, specialRepay: 0, disagio: 0, graceYears: 0,
          }
          flow += consideration - balance - vfe - childCosts
          loans = consideration > 0 ? [openLoan(childLoan)] : []
        }
      }
      flow -= tr.giftTax
      row.giftTax += tr.giftTax
      row.transferFlow += flow
      row.cfPre += flow
      monthlyEk[m + 1] += flow
      monthlyGk[m + 1] -= tr.giftTax + tr.childCosts
      transfer = tr
      if (transferKind !== 'usufruct') taxpayer = 'child'
    }

    // Bestandswerte
    row.balance = loans.reduce((s, l) => s + l.balance, 0)
    row.value = valueAt(m + 1)
    row.netEquity = row.value - row.balance
  }

  function ownUseExempt(atM: number): boolean {
    // Eigennutzung (oder unentgeltliche Überlassung an kindergeldberechtigtes Kind) im
    // Veräußerungsjahr und den beiden Vorjahren, oder durchgehend seit Anschaffung.
    const isOwn = (m: number) => {
      const k = phaseOf[m]
      if (k === 'own') return true
      if (k === 'childFree') return fam.enabled ? calYear(m) <= fam.child.kindergeldUntil : true
      return false
    }
    const lastM = atM - 1
    if (lastM < 0) return false
    let all = true
    for (let m = 0; m <= lastM; m++) if (!isOwn(m)) { all = false; break }
    if (all) return true
    const saleYear = calYear(lastM)
    for (let m = lastM; m >= 0; m--) {
      if (!isOwn(m)) return false
      if (calYear(m) === saleYear - 2) return true
    }
    return false
  }

  // ---- Verkauf ---------------------------------------------------------------
  if (isSale && yr) {
    const row = yr
    const lastM = N - 1
    const price = inp.sale.priceMode === 'direct' && opts.saleGrowth == null
      ? inp.sale.direct
      : P.price * Math.pow(1 + saleG, N / 12)
    const agent = (price * inp.sale.agent) / 100
    const otherCosts = inp.sale.deletion + inp.sale.preparation + inp.sale.other
    let vfe = 0
    for (const ls of loans) vfe += prepaymentPenalty(ls, inp.vfe.mode, inp.vfe.pct, inp.vfe.reinvestRate)
    const saleCosts = agent + otherCosts + vfe
    const balance = loans.reduce((s, l) => s + l.balance, 0)
    const akTotal = lots.reduce((s, l) => s + l.ak, 0)
    const afaTaken = lots.reduce((s, l) => s + l.afa, 0)
    const bookValue = akTotal - afaTaken
    const gainPre = price - saleCosts - bookValue
    const exempt = ownUseExempt(N)
    let taxableGain = 0
    let taxableU = 0
    let anyInPeriod = false
    for (const lot of lots) {
      const within = N - lot.startM <= SPECULATION_MONTHS
      if (!within) continue
      anyInPeriod = true
      const gl = lot.share * (price - saleCosts) - (lot.ak - lot.afa)
      taxableGain += gl
      taxableU += gl + lot.share * vfe
    }
    let reason = ''
    let taxFree = false
    if (!anyInPeriod) { taxFree = true; reason = 'Haltedauer über 10 Jahre (§ 23 Abs. 1 Nr. 1 EStG)' }
    else if (exempt) { taxFree = true; reason = 'Eigennutzung im Verkaufsjahr und den beiden Vorjahren' }
    else if (taxableGain <= 0) { taxFree = true; reason = 'Kein Gewinn (Verlust nur mit anderen privaten Veräußerungsgewinnen verrechenbar)' }
    else if (taxableGain < SPECULATION_FREE_LIMIT) { taxFree = true; reason = `Gewinn unter der Freigrenze von ${eur(SPECULATION_FREE_LIMIT)}` }
    if (taxFree) { taxableGain = 0; taxableU = 0 }
    acc(row.year, taxpayer).gain += taxableGain
    acc(row.year, taxpayer).gainU += Math.max(0, taxableU)
    closeYear(row, lastM, true)
    // Steuer, die auf den Gewinn entfällt
    let tax = 0
    if (taxableGain > 0) {
      const { zve, p } = taxParams[taxpayer](row.year)
      if (inp.tax.mode === 'marginal' && taxpayer === 'parents') tax = (taxableGain * inp.tax.marginal) / 100
      else {
        const v = yAcc.get(row.year)![taxpayer].vv
        tax = incomeTax(Math.max(0, zve + v + taxableGain), p).total - incomeTax(Math.max(0, zve + v), p).total
      }
    }
    const netProceeds = price - saleCosts - balance
    row.gainTax = tax
    monthlyEk[lastM + 1] += netProceeds
    monthlyGk[lastM + 1] += price - agent - otherCosts
    sale = {
      month: N, years: N / 12, price, agent, otherCosts, vfe, saleCosts, balance, akTotal, afaTaken,
      bookValue, gainPre, taxableGain, taxFree, taxFreeReason: reason, tax, cashAtSale: netProceeds, netProceeds: netProceeds - tax,
      growth: saleG * 100,
    }
    if (!taxFree && N <= SPECULATION_MONTHS) {
      warnings.push({ level: 'danger', title: 'Verkauf innerhalb der Spekulationsfrist', text: `Der Verkauf nach ${fmtYears(N)} liegt innerhalb von 10 Jahren: Der Gewinn von ${eur(taxableGain)} wird mit dem persönlichen Steuersatz versteuert (${eur(tax)} Steuer). Steuerfrei frühestens 10 Jahre + 1 Tag nach dem Kaufvertrag.` })
    }
  } else if (yr) {
    closeYear(yr, N - 1, true)
  }

  // ---- Jahreskennzahlen ------------------------------------------------------
  let cum = 0
  let prevValue = P.price
  let prevNet = P.price - P.loanSum
  for (const row of years) {
    cum += row.cfPost
    row.cumCf = cum
    row.quota = row.months ? row.quota / row.months : 0
    row.appreciation = row.value - prevValue
    const app = inp.assumptions.appreciationInReturn ? row.appreciation : 0
    const base = inp.assumptions.ekBase === 'bound' && row.idx > 1 ? prevNet : P.equity
    row.ekBase = base
    const running = row.cfPost - row.transferFlow + row.gainTax
    row.ekReturn = base > 0 ? (running + row.principal + app) / base : null
    row.gkReturn = P.totalInvestment > 0 ? (row.noi - (row.taxUnlev - row.gainTax) + app) / P.totalInvestment : null
    prevValue = row.value
    prevNet = row.netEquity
  }

  // Endwert ohne Verkauf: nicht realisiertes Nettovermögen
  const lastRow = years[years.length - 1]
  const terminalEquity = lastRow ? lastRow.value - lastRow.balance : 0
  if (!isSale && lastRow) {
    monthlyEk[N] += terminalEquity
    monthlyGk[N] += lastRow.value
  }

  // Totalüberschussprognose (Vorrechnung)
  let tup: number | null = childTup
  if (opts.forceChildQuota) {
    let s = 0
    for (const row of years) {
      if (!row.phases.includes('childRent')) continue
      const wk = row.rentEff - row.vv
      s += 0.9 * row.rentEff - 1.1 * wk
    }
    tup = s
  }

  // Stabilisiertes Jahr: erstes volles Jahr ausschließlich in Vermietung
  const stabilized =
    years.find((y) => y.months === 12 && y.phases.length === 1 && (y.phases[0] === 'rent' || y.phases[0] === 'childRent') && y.transferFlow === 0 && y.capex === 0) ??
    years.find((y) => y.months === 12) ?? years[0] ?? null

  const childPhase = phaseOf.slice(0, N).findIndex((k) => k === 'childRent')
  const childQuota = childPhase >= 0 ? quotaOf[childPhase] : 1

  // Weitere Hinweise
  if (childPhase >= 0) {
    const pct = childPctOf[childPhase]
    if (pct < 50) warnings.push({ level: 'danger', title: 'Miete unter 50 % der ortsüblichen Miete', text: `Die Werbungskosten werden nur zu ${Math.round(pct)} % anerkannt (§ 21 Abs. 2 S. 1 EStG).` })
    else if (pct < 66) warnings.push({ level: tupPositive ? 'warn' : 'danger', title: 'Miete zwischen 50 und 66 %', text: tupPositive ? `Totalüberschussprognose positiv (${eur(childTup ?? 0)} über 30 Jahre): voller Werbungskostenabzug.` : `Totalüberschussprognose negativ (${eur(childTup ?? 0)}): Werbungskosten nur zu ${Math.round(pct)} % abziehbar.` })
  }
  for (const ls of inp.loans) {
    if (ls.amount > 0 && ls.fixedYears * 12 < N && ls.followRate <= ls.rate && ls.type !== 'bullet') {
      warnings.push({ level: 'info', title: `Zinsbindung ${ls.label}`, text: `Die Zinsbindung endet nach ${ls.fixedYears} Jahren. Anschlusszins ${ls.followRate} % – auch höhere Zinsen testen (Sensitivität).` })
      break
    }
  }
  const negYears = years.filter((y) => y.vv < 0).length
  if (years.length >= 10 && negYears === years.length) {
    warnings.push({ level: 'warn', title: 'Dauerhaft negative Einkünfte', text: 'In allen Jahren entsteht ein steuerlicher Verlust. Das Finanzamt kann bei fehlender Überschusserzielungsabsicht (Liebhaberei) die Verluste aberkennen – bei auf Dauer angelegter Fremdvermietung wird sie jedoch typisierend vermutet.' })
  }
  if (transfer && transfer.kind === 'gift' && transfer.entgeltShare > 0) {
    warnings.push({ level: 'info', title: 'Gemischte Schenkung', text: `Die übernommenen Schulden (${eur(transfer.consideration)}) machen ${Math.round(transfer.entgeltShare * 100)} % der Übertragung entgeltlich: Für diesen Teil gelten neue Anschaffungskosten und eine neue 10-Jahres-Frist beim Kind.` })
  }
  if (transfer && transfer.parentGainTaxable) {
    warnings.push({ level: 'danger', title: 'Übertragung innerhalb der Spekulationsfrist', text: `Der entgeltliche Teil der Übertragung ist für die Eltern ein privates Veräußerungsgeschäft: Gewinn ${eur(transfer.parentGain)}.` })
  }

  const equity = P.equity
  const sumCf = years.reduce((s, y) => s + y.cfPost, 0)
  return {
    purchase: P, months: N, years, monthlyEk, monthlyGk, sale, transfer, terminalEquity,
    irrEk: irrAnnualFromMonthly(monthlyEk), irrGk: irrAnnualFromMonthly(monthlyGk),
    stabilized, warnings, childQuota, childTup: tup, equity, totalInvestment: P.totalInvestment,
    sumCf, akTotal: lots.reduce((s, l) => s + l.ak, 0),
  }
}

/** Erbschaftsteuer, wenn die Immobilie am Ende des Zeitraums vererbt würde. */
export function inheritanceTaxAt(value: number, debt: number, rented: boolean, donors: number, prior: number): number {
  const relief = rented ? 1 - RENTED_RESIDENTIAL_RELIEF : 1
  const enrichment = Math.max(0, value * relief - debt * relief)
  return giftTaxSplit(enrichment, donors, prior).tax
}

export { giftTaxClassI }

function eur(v: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}
function fmtYears(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} Jahren und ${m} Monaten` : `${y} Jahren`
}
