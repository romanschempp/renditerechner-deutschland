import { VAT } from './constants'
import type { Inputs } from './types'

export interface PurchaseResult {
  price: number
  grestBase: number
  grest: number
  notary: number
  registry: number
  agent: number
  appraisal: number
  other: number
  /** Kaufnebenkosten, die Anschaffungskosten sind. */
  acqCosts: number
  mortgageFees: number
  financeFees: number
  landShare: number
  akLand: number
  akBuilding: number
  akInventory: number
  renovationInitial: number
  subsidy: number
  /** Kaufpreis + Nebenkosten + Renovierung − Zuschüsse (ohne Finanzierungskosten). */
  totalInvestment: number
  loanSum: number
  loanPayout: number
  disagio: number
  equity: number
  /** Erhaltung der ersten 3 Jahre (netto) und Grenze nach § 6 Abs. 1 Nr. 1a EStG. */
  nearCostsNet: number
  nearCostsLimit: number
  nearCostsExceeded: boolean
}

export function landShareOf(inp: Inputs): number {
  const o = inp.object
  const base = Math.max(1, o.price - o.inventory)
  if (o.landMode === 'brw') return Math.min(0.9, Math.max(0, (o.brw * o.landArea) / base))
  return Math.min(0.9, Math.max(0, o.landPct / 100))
}

export function computePurchase(inp: Inputs): PurchaseResult {
  const o = inp.object
  const p = inp.purchase
  const price = Math.max(0, o.price)
  const inventory = Math.min(price, Math.max(0, o.inventory))
  const grestBase = price - inventory
  const grest = p.familyExempt ? 0 : (grestBase * p.grest) / 100
  const notary = (price * p.notary) / 100
  const registry = (price * p.registry) / 100
  const agent = (price * p.agent) / 100
  const appraisal = p.appraisal
  const other = p.other
  const proportional = notary + registry + agent + appraisal + other
  const acqCosts = grest + proportional
  const landShare = landShareOf(inp)
  const realty = grestBase
  const invShare = price > 0 ? inventory / price : 0
  const akInventory = inventory + proportional * invShare
  const realtyCosts = proportional * (1 - invShare) + grest
  const akLand = (realty + realtyCosts) * landShare
  const akBuilding = (realty + realtyCosts) * (1 - landShare)

  const renovationInitial = inp.renovation.items.reduce((s, i) => s + Math.max(0, i.amount), 0)
  const subsidy = Math.max(0, inp.renovation.subsidy)
  const loanSum = inp.loans.reduce((s, l) => s + Math.max(0, l.amount), 0)
  const disagio = inp.loans.reduce((s, l) => s + (Math.max(0, l.amount) * l.disagio) / 100, 0)
  const loanPayout = loanSum - disagio
  const mortgageFees = (loanSum * p.mortgageFees) / 100
  const financeFees = inp.financeFees
  const totalInvestment = price + acqCosts + renovationInitial - subsidy
  const equity = totalInvestment + mortgageFees + financeFees - loanPayout

  // Anschaffungsnahe Herstellungskosten: Erhaltung + Modernisierung in 36 Monaten, netto
  const erhInitial = inp.renovation.items
    .filter((i) => i.kind === 'erhaltung')
    .reduce((s, i) => s + i.amount, 0)
  const erhLater = inp.renovation.later
    .filter((i) => i.kind === 'erhaltung' && (i.year - 1) * 12 < 36)
    .reduce((s, i) => s + i.amount, 0)
  const nearCostsNet = (erhInitial + erhLater) / (1 + VAT)
  const nearCostsLimit = 0.15 * akBuilding
  return {
    price, grestBase, grest, notary, registry, agent, appraisal, other, acqCosts,
    mortgageFees, financeFees, landShare, akLand, akBuilding, akInventory,
    renovationInitial, subsidy, totalInvestment, loanSum, loanPayout, disagio, equity,
    nearCostsNet, nearCostsLimit, nearCostsExceeded: nearCostsNet > nearCostsLimit && nearCostsNet > 0,
  }
}
