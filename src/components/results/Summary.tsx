import type { Analysis } from '../../engine/analysis'
import type { Inputs } from '../../engine/types'
import { eur, num, pct } from '../../lib/format'
import { Info, Signed } from '../ui/controls'

interface P { inp: Inputs; a: Analysis }

function Frac({ label, what, num: n, den, value, numLabel, denLabel }: {
  label: string; what: string; num: number; den: number; value: number | null; numLabel: string; denLabel: string
}) {
  return (
    <div className="frac">
      <div className="frac__head">
        <span className="frac__label">{label}</span>
        <span className="frac__value"><Signed value={value}>{pct(value, 1)}</Signed></span>
      </div>
      <p className="frac__what">{what}</p>
      <div className="frac__row"><span>{numLabel}</span><span className="num">{eur(n)}</span></div>
      <div className="frac__row frac__row--den"><span>{denLabel}</span><span className="num">{eur(den)}</span></div>
    </div>
  )
}

export function Hero({ inp, a }: P) {
  const k = a.kpis
  const st = a.sim.stabilized
  const sale = a.mode === 'sale'
  const lever = k.ekReturn != null && k.gkReturn != null ? (k.ekReturn - k.gkReturn) * 100 : null
  const leverIrr = k.irrEk != null && k.irrGk != null ? (k.irrEk - k.irrGk) * 100 : null
  const app = inp.assumptions.appreciationInReturn
  const real = a.scenarios.find((s) => s.key === 'real')
  const pess = a.scenarios.find((s) => s.key === 'pess')
  const opt = a.scenarios.find((s) => s.key === 'opt')
  const hasLoan = a.sim.purchase.loanSum > 0
  return (
    <section className={`hero hero--${a.mode}`}>
      <div className="hero__top">
        <div className="hero__kicker">{sale ? `Gewinn nach ${num(inp.sale.years, 1)} Jahren (realistisch)` : `Monatlicher Cashflow nach Steuern ${st ? `(${st.year})` : ''}`}</div>
        <div className="hero__big"><Signed value={sale ? k.profit : k.cfPostMonth}>{eur(sale ? k.profit : k.cfPostMonth)}</Signed></div>
        <div className="hero__verdict">
          {sale
            ? (pess && opt ? `Pessimistisch ${eur(wealth(pess) )}, optimistisch ${eur(wealth(opt))}` : '')
            : k.cfPostMonth >= 0
              ? 'Die Miete trägt Kosten, Kredit und Steuern.'
              : `Monatlich zuzahlen: ${eur(-k.cfPostMonth)}. Davon fließen ${eur((st?.principal ?? 0) / 12)} als Tilgung in dein Vermögen.`}
        </div>
      </div>
      <div className="hero__fracs">
        {sale && real ? (
          <>
            <div className="frac">
              <div className="frac__head"><span className="frac__label">Eigenkapitalrendite p. a. (IRR)</span><span className="frac__value"><Signed value={k.irrEk}>{pct(k.irrEk, 1)}</Signed></span></div>
              <p className="frac__what">Was dein eingesetztes Geld pro Jahr verdient: Mieten, Steuern und Verkaufserlös zusammen, mit Kredit gerechnet.</p>
              <div className="frac__row"><span>Eigenkapital eingesetzt</span><span className="num">{eur(k.equity)}</span></div>
              <div className="frac__row frac__row--den"><span>Vermögen nach Verkauf</span><span className="num">{eur(k.wealthEnd)}</span></div>
            </div>
            <div className="frac">
              <div className="frac__head"><span className="frac__label">Gesamtkapitalrendite p. a. (IRR)</span><span className="frac__value"><Signed value={k.irrGk}>{pct(k.irrGk, 1)}</Signed></span></div>
              <p className="frac__what">Was die Immobilie pro Jahr abwirft, als wäre sie ohne Kredit gekauft (nach Steuern).</p>
              <div className="frac__row"><span>Gesamtinvestition</span><span className="num">{eur(k.totalInvestment)}</span></div>
              <div className="frac__row frac__row--den"><span>Verkaufspreis</span><span className="num">{eur(a.sim.sale?.price ?? 0)}</span></div>
            </div>
          </>
        ) : st ? (
          <>
            <Frac label="Eigenkapitalrendite" value={k.ekReturn}
              what={`Was dein eingesetztes Geld im ${st.year} verdient – mit Kredit, nach Steuern; Tilgung zählt als Vermögen${app ? ', inkl. Wertsteigerung' : ''}.`}
              numLabel="Cashflow n. St. + Tilgung" num={st.cfPost - st.transferFlow + st.principal + (app ? st.appreciation : 0)} denLabel={inp.assumptions.ekBase === 'bound' ? 'Gebundenes Kapital' : 'Eigenkapital'} den={st.ekBase} />
            <Frac label="Gesamtkapitalrendite" value={k.gkReturn}
              what={`Was die Immobilie im ${st.year} selbst abwirft, als wäre sie ohne Kredit gekauft – nach Steuern${app ? ', inkl. Wertsteigerung' : ''}.`}
              numLabel="Reinertrag nach Steuern" num={st.noi - st.taxUnlev + (app ? st.appreciation : 0)} denLabel="Gesamtinvestition" den={k.totalInvestment} />
          </>
        ) : null}
      </div>
      <p className="hero__lever">
        {!hasLoan ? 'Ohne Kredit sind EK- und GK-Rendite (fast) gleich.'
          : sale
            ? leverIrr != null && `Der Kredit ${leverIrr >= 0 ? 'hebt' : 'drückt'} die EK-Rendite um ${num(Math.abs(leverIrr), 1)} Prozentpunkte ${leverIrr >= 0 ? 'über' : 'unter'} die GK-Rendite.`
            : lever != null && `Der Kredit ${lever >= 0 ? 'hebt' : 'drückt'} die EK-Rendite um ${num(Math.abs(lever), 1)} Prozentpunkte ${lever >= 0 ? 'über' : 'unter'} die GK-Rendite.`}
        {sale && st && ` Zum Vergleich, laufend ${st.year}: EK ${pct(k.ekReturn, 1)}, GK ${pct(k.gkReturn, 1)}.`}
        {!sale && ` Über ${a.sim.months / 12} Jahre (IRR, Restwert unverkauft): EK ${pct(k.irrEk, 1)}, GK ${pct(k.irrGk, 1)}.`}
      </p>
    </section>
  )
}

function wealth(s: { sim: Analysis['sim'] }) {
  return s.sim.sumCf + (s.sim.sale ? s.sim.sale.cashAtSale : s.sim.terminalEquity) - s.sim.equity
}

export function KpiGrid({ inp, a }: P) {
  const k = a.kpis
  const st = a.sim.stabilized
  const tiles: { label: string; value: string; sub?: string; sign?: number | null; info?: string }[] = [
    { label: 'Gesamtinvestition', value: eur(k.totalInvestment), sub: `Kaufpreis ${eur(inp.object.price)} + Nebenkosten + Renovierung` },
    { label: 'Eigenkapital', value: eur(k.equity), sub: `${pct(k.equityPct, 0)} der Investition` },
    { label: 'Kaufpreisfaktor', value: num(k.priceFactor, 1), sub: 'Kaufpreis ÷ Jahreskaltmiete', info: 'Unter 20 gilt meist als günstig, über 30 als teuer (stark lageabhängig).' },
    { label: 'Bruttomietrendite', value: pct(k.grossYield), sub: 'Jahreskaltmiete ÷ Kaufpreis' },
    { label: 'Nettomietrendite', value: pct(k.netYield), sub: `Reinertrag ${st?.year ?? ''} ÷ Gesamtinvestition` },
    { label: 'Kreditrate', value: eur(k.loanPaymentMonth), sub: 'pro Monat (Zins + Tilgung)' },
    { label: 'Cashflow vor Steuern', value: eur(k.cfPreMonth), sub: 'pro Monat', sign: k.cfPreMonth },
    { label: 'Cashflow nach Steuern', value: eur(k.cfPostMonth), sub: 'pro Monat', sign: k.cfPostMonth },
    { label: k.taxYear <= 0 ? 'Steuerersparnis' : 'Steuerlast', value: eur(Math.abs(k.taxYear)), sub: `pro Jahr (${st?.year ?? ''})`, sign: -k.taxYear },
    { label: 'Cash-on-Cash', value: pct(k.cashOnCash), sub: 'Cashflow n. St. ÷ Eigenkapital', sign: k.cashOnCash },
    { label: 'Schuldendienstdeckung', value: k.dscr == null ? '–' : num(k.dscr, 2), sub: 'Reinertrag ÷ Zins + Tilgung (DSCR)', info: 'Banken wünschen meist ≥ 1,1–1,2.' },
    { label: 'Break-even-Miete', value: eur(k.breakEvenRent), sub: 'Kaltmiete für Cashflow 0 nach Steuern' },
    { label: 'IRR Eigenkapital', value: pct(k.irrEk), sub: a.mode === 'sale' ? 'mit Verkauf' : 'mit unverkauftem Restwert', sign: k.irrEk },
    { label: 'IRR Gesamtkapital', value: pct(k.irrGk), sub: 'ohne Finanzierung', sign: k.irrGk },
    { label: 'Vermögensmultiplikator', value: k.multiple == null ? '–' : `${num(k.multiple, 2)}×`, sub: 'Endvermögen ÷ Eigenkapital' },
    { label: 'Vermögen am Ende', value: eur(k.wealthEnd), sub: a.mode === 'sale' ? 'Cashflows + Nettoerlös' : 'Cashflows + Wert − Schulden' },
  ]
  return (
    <div className="kpis">
      {tiles.map((t) => (
        <div className="kpi" key={t.label}>
          <div className="kpi__label">{t.label}{t.info && <Info text={t.info} />}</div>
          <div className="kpi__value num">{t.sign != null ? <Signed value={t.sign}>{t.value}</Signed> : t.value}</div>
          {t.sub && <div className="kpi__sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  )
}

export function Warnings({ a }: { a: Analysis }) {
  if (!a.sim.warnings.length) return null
  return (
    <div className="warnings">
      {a.sim.warnings.map((w, i) => (
        <div key={i} className={`warn warn--${w.level}`}>
          <strong>{w.title}</strong>
          <span>{w.text}</span>
        </div>
      ))}
    </div>
  )
}
