import type { Loan } from './types'

export interface LoanState {
  loan: Loan
  balance: number
  rate: number
  payment: number
  /** Monate seit Auszahlung. */
  age: number
  closed: boolean
}

export interface LoanMonth {
  interest: number
  principal: number
  special: number
}

function annuityPayment(balance: number, ratePct: number, months: number): number {
  const r = ratePct / 1200
  if (months <= 0) return balance
  if (r === 0) return balance / months
  return (balance * r) / (1 - Math.pow(1 + r, -months))
}

export function openLoan(loan: Loan): LoanState {
  const s: LoanState = { loan, balance: loan.amount, rate: loan.rate, payment: 0, age: 0, closed: loan.amount <= 0 }
  s.payment = initialPayment(s)
  return s
}

function initialPayment(s: LoanState): number {
  const l = s.loan
  switch (l.type) {
    case 'annuity':
      return (l.amount * (l.rate + l.repay)) / 1200
    case 'linear':
      return 0
    case 'bullet':
      return 0
    case 'kfw':
      return l.graceYears > 0 ? 0 : annuityPayment(l.amount, l.rate, Math.max(1, l.termYears * 12))
  }
}

/** Ein Monat Zins und Tilgung; Zahlungen am Monatsende. */
export function stepLoan(s: LoanState): LoanMonth {
  const out: LoanMonth = { interest: 0, principal: 0, special: 0 }
  if (s.closed || s.balance <= 0.005) {
    s.closed = true
    s.balance = 0
    return out
  }
  const l = s.loan
  const fixedM = Math.max(0, Math.round(l.fixedYears * 12))
  if (s.age === fixedM && fixedM > 0) {
    // Ende der Zinsbindung: Anschlusskondition
    s.rate = l.followRate
    if (l.type === 'annuity' || (l.type === 'kfw' && s.age >= l.graceYears * 12)) {
      s.payment = (s.balance * (l.followRate + l.followRepay)) / 1200
      if (l.type === 'kfw') {
        const rest = l.termYears * 12 - s.age
        if (rest > 0) s.payment = annuityPayment(s.balance, l.followRate, rest)
      }
    }
  }
  if (l.type === 'kfw' && s.age === Math.round(l.graceYears * 12) && l.graceYears > 0) {
    s.payment = annuityPayment(s.balance, s.rate, Math.max(1, (l.termYears - l.graceYears) * 12))
  }
  const interest = (s.balance * s.rate) / 1200
  let principal = 0
  switch (l.type) {
    case 'annuity':
      principal = Math.max(0, s.payment - interest)
      break
    case 'linear':
      principal = l.amount / Math.max(1, l.termYears * 12)
      break
    case 'bullet':
      principal = s.age === l.termYears * 12 - 1 ? s.balance : 0
      break
    case 'kfw':
      principal = s.age < l.graceYears * 12 ? 0 : Math.max(0, s.payment - interest)
      break
  }
  principal = Math.min(principal, s.balance)
  s.balance -= principal
  let special = 0
  if (l.specialRepay > 0 && s.age % 12 === 11 && s.balance > 0) {
    special = Math.min(s.balance, (l.amount * l.specialRepay) / 100)
    s.balance -= special
    // Rate bleibt gleich, Laufzeit verkürzt sich
  }
  out.interest = interest
  out.principal = principal
  out.special = special
  s.age += 1
  if (s.balance <= 0.005) {
    s.balance = 0
    s.closed = true
  }
  return out
}

/**
 * Vorfälligkeitsentschädigung (Schätzung): Zinsdifferenz × Restschuld × Restlaufzeit
 * der Zinsbindung, abgezinst. Nach 10 Jahren Kündigungsrecht (§ 489 BGB) → 0.
 */
export function prepaymentPenalty(
  s: LoanState,
  mode: 'auto' | 'pct',
  pct: number,
  reinvestRate: number,
): number {
  if (s.closed || s.balance <= 0) return 0
  const fixedM = s.loan.fixedYears * 12
  if (s.age >= fixedM || s.age >= 120) return 0
  if (mode === 'pct') return (s.balance * pct) / 100
  const remYears = (Math.min(fixedM, 120) - s.age) / 12
  const diff = Math.max(0, s.rate - reinvestRate) / 100
  const discount = Math.pow(1 + reinvestRate / 100, -remYears / 2)
  return s.balance * diff * remYears * discount * 0.95
}
