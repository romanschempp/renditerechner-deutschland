import type { StateCode } from './constants'

export type PropertyType = 'ETW' | 'EFH' | 'MFH'
export type Special = 'none' | 'denkmal' | 'sanierung'

export type CostKind = 'erhaltung' | 'herstellung' | 'inventar'

export interface CostItem {
  id: string
  label: string
  amount: number
  kind: CostKind
  /** § 82b EStDV: Verteilung von Erhaltungsaufwand auf 1–5 Jahre. */
  spreadYears: number
}

export interface LaterItem extends CostItem {
  /** Jahr ab Kauf (1 = erstes Jahr). */
  year: number
  /** Modernisierung, die auf die Miete umgelegt wird (§ 559 BGB). */
  modernisation: boolean
}

export type LoanType = 'annuity' | 'linear' | 'bullet' | 'kfw'

export interface Loan {
  id: string
  label: string
  type: LoanType
  amount: number
  /** Sollzins % p. a. */
  rate: number
  /** Anfängliche Tilgung % p. a. (Annuität, KfW nach Freijahren). */
  repay: number
  /** Laufzeit in Jahren (linear, endfällig, KfW). */
  termYears: number
  fixedYears: number
  /** Anschlusszins nach der Zinsbindung. */
  followRate: number
  /** Tilgung nach der Zinsbindung in % der Restschuld. */
  followRepay: number
  /** Sondertilgung pro Jahr in % des Ursprungsbetrags. */
  specialRepay: number
  disagio: number
  graceYears: number
}

export type PhaseKind = 'vacant' | 'rent' | 'childRent' | 'childFree' | 'own'

export interface Phase {
  id: string
  kind: PhaseKind
  /** Dauer in Monaten; null = bis zum Ende. */
  months: number | null
  /** Vermietung an Kind: Miete in % der ortsüblichen Warmmiete. */
  childPct: number
}

export type RentModel = 'index' | 'staffel' | 'vergleich'

export interface Inputs {
  object: {
    name: string
    type: PropertyType
    state: StateCode
    price: number
    /** Im Kaufpreis enthaltenes Inventar (z. B. Einbauküche). */
    inventory: number
    area: number
    yearBuilt: number
    purchaseYear: number
    /** 1–12 */
    purchaseMonth: number
    landMode: 'pct' | 'brw'
    landPct: number
    /** Bodenrichtwert €/m² */
    brw: number
    /** Grundstücksfläche bzw. anteilige Fläche (ETW: MEA × Grundstück). */
    landArea: number
    special: Special
    /** Begünstigte Kosten für § 7i/§ 7h (Teil der Renovierung/Kaufpreis). */
    specialBase: number
    /** Neubau mit Baubeginn 10/2023–09/2029: degressive AfA möglich. */
    newBuildDegressive: boolean
    /** § 7b Sonder-AfA (EH40/QNG, Baukostengrenzen). */
    sonder7b: boolean
  }
  purchase: {
    grest: number
    familyExempt: boolean
    notary: number
    registry: number
    /** Notar + Grundbuch für die Grundschuld (Finanzierungskosten, sofort WK). */
    mortgageFees: number
    agent: number
    appraisal: number
    other: number
  }
  renovation: {
    items: CostItem[]
    later: LaterItem[]
    subsidy: number
  }
  loans: Loan[]
  /** Bereitstellungszinsen und Bankgebühren (WK im ersten Jahr). */
  financeFees: number
  vfe: { mode: 'auto' | 'pct'; pct: number; reinvestRate: number }
  rent: {
    phases: Phase[]
    coldRent: number
    parking: number
    furnished: number
    /** Ortsübliche Vergleichsmiete (kalt, €/Monat). */
    localRent: number
    localGrowth: number
    model: RentModel
    growth: number
    /** Kappungsgrenze 15 % statt 20 % (angespannter Markt). */
    tightMarket: boolean
    mietpreisbremse: boolean
    /** Neuvertragsmiete bei Mieterwechsel in % der ortsüblichen Vergleichsmiete. */
    newLeasePct: number
    vacancyPct: number
    tenantYears: number
    changeVacancy: number
    changeCost: number
    changeAgentMonths: number
    manual: Record<number, number>
    /** Ersparte Miete bei Eigennutzung als Ertrag ansetzen. */
    ownSavedRent: boolean
  }
  costs: {
    /** Umlagefähige Betriebskosten €/Monat (Vorauszahlung des Mieters). */
    umlage: number
    /** Nicht umlagefähiges Hausgeld €/Monat (WEG-Verwaltung, Bank …). */
    hausgeldNonUml: number
    /** Zuführung Erhaltungsrücklage €/Monat. */
    reserve: number
    reserveDeductible: boolean
    grundsteuer: number
    grundsteuerUmlage: boolean
    insurance: number
    sev: number
    /** Eigene Instandhaltung Sondereigentum €/m² und Jahr. */
    maintenance: number
    co2: number
    bank: number
    taxAdvice: number
    travel: number
    other: number
    growth: number
  }
  tax: {
    filing: 'single' | 'joint'
    mode: 'exact' | 'marginal'
    zve: number
    zveGrowth: number
    church: 0 | 8 | 9
    marginal: number
    indexTariff: boolean
    tariffIndex: number
    afaMode: 'auto' | 'degressive' | 'custom'
    customRate: number
  }
  family: {
    enabled: boolean
    child: { name: string; age: number; kindergeldUntil: number; zve: number }
    /** Wohnung an das Kind vermieten (überschreibt die Nutzungsphasen im Zeitraum). */
    rentToChild: boolean
    /** Miete in % der ortsüblichen Warmmiete (≥ 66 % = voller Werbungskostenabzug). */
    rentPct: number
    /** Beginn in Jahren ab Kauf. */
    rentFromYear: number
    /** Dauer in Jahren; 0 = bis zum Ende. */
    rentYears: number
    transfer: 'none' | 'gift' | 'usufruct' | 'saleToChild'
    transferYear: number
    donors: 1 | 2
    priorGifts: number
    debtAssumed: boolean
    salePrice: number
    childLoanRate: number
    childLoanRepay: number
    parentAge: number
    parentSex: 'm' | 'w'
    /** Steuerwert (Bedarfswert) für die Schenkungsteuer; 0 = Verkehrswert. */
    taxValue: number
  }
  sale: {
    years: number
    priceMode: 'growth' | 'direct'
    direct: number
    pessDelta: number
    optDelta: number
    agent: number
    deletion: number
    preparation: number
    other: number
  }
  assumptions: {
    horizon: number
    valueGrowth: number
    inflation: number
    altReturn: number
    appreciationInReturn: boolean
    ekBase: 'invested' | 'bound'
  }
}

export type CalcMode = 'rent' | 'sale'
