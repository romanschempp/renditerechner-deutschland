/** Interner Zinsfuß einer Reihe periodischer Zahlungen (pro Periode). */
export function irr(flows: number[]): number | null {
  if (!flows.some((f) => f > 0) || !flows.some((f) => f < 0)) return null
  const npv = (r: number) => {
    let v = 0
    let d = 1
    for (const f of flows) {
      v += f / d
      d *= 1 + r
    }
    return v
  }
  // Bei langen Reihen läuft der Barwert für r → −1 über; −30 % pro Periode reicht aus
  let lo = flows.length > 60 ? -0.3 : -0.99
  let hi = 1
  let flo = npv(lo)
  let fhi = npv(hi)
  if (flo * fhi > 0) {
    // weiter oben suchen
    for (let i = 0; i < 6 && flo * fhi > 0; i++) {
      hi *= 2
      fhi = npv(hi)
    }
    if (flo * fhi > 0) return null
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (Math.abs(fm) < 1e-7) return mid
    if (flo * fm < 0) {
      hi = mid
      fhi = fm
    } else {
      lo = mid
      flo = fm
    }
  }
  return (lo + hi) / 2
}

/** Monatliche Zahlungsreihe → effektive Jahresrendite. */
export function irrAnnualFromMonthly(flows: number[]): number | null {
  const r = irr(flows)
  return r == null ? null : Math.pow(1 + r, 12) - 1
}
