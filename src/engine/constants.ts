// Rechtsstand und Tabellen. Alle Werte sind in der App überschreibbar.
export const LEGAL_DATE = 'November 2026'

export type StateCode =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH'

/** Grunderwerbsteuer in % (Stand 11/2026). */
export const STATES: Record<StateCode, { name: string; grest: number; note?: string }> = {
  BW: { name: 'Baden-Württemberg', grest: 5.0 },
  BY: { name: 'Bayern', grest: 3.5 },
  BE: { name: 'Berlin', grest: 6.0 },
  BB: { name: 'Brandenburg', grest: 6.5 },
  HB: { name: 'Bremen', grest: 5.5, note: 'seit 01.07.2025' },
  HH: { name: 'Hamburg', grest: 5.5, note: 'seit 01.01.2023' },
  HE: { name: 'Hessen', grest: 6.0 },
  MV: { name: 'Mecklenburg-Vorpommern', grest: 6.0 },
  NI: { name: 'Niedersachsen', grest: 5.0 },
  NW: { name: 'Nordrhein-Westfalen', grest: 6.5 },
  RP: { name: 'Rheinland-Pfalz', grest: 5.0 },
  SL: { name: 'Saarland', grest: 6.5 },
  SN: { name: 'Sachsen', grest: 5.5, note: 'seit 01.01.2023' },
  ST: { name: 'Sachsen-Anhalt', grest: 5.0 },
  SH: { name: 'Schleswig-Holstein', grest: 6.5 },
  TH: { name: 'Thüringen', grest: 5.0, note: 'seit 01.01.2024' },
}

/** Einkommensteuertarif § 32a EStG, Veranlagungszeitraum 2026. */
export const TARIFF_2026 = {
  year: 2026,
  basicAllowance: 12348,
  zone2End: 17799,
  zone3End: 69878,
  zone4End: 277825,
  z2a: 914.51, z2b: 1400,
  z3a: 173.10, z3b: 2397, z3c: 1034.87,
  z4c: 11135.63,
  z5c: 19470.38,
}

/** Solidaritätszuschlag: Freigrenze auf die Einkommensteuer (2026). */
export const SOLI = { rate: 0.055, freeSingle: 20350, freeJoint: 40700, mitigation: 0.119 }

/** Freigrenze private Veräußerungsgeschäfte (§ 23 Abs. 3 S. 5 EStG, ab VZ 2024). */
export const SPECULATION_FREE_LIMIT = 1000
export const SPECULATION_MONTHS = 120

/** Lineare Gebäude-AfA nach Fertigstellungsjahr (§ 7 Abs. 4 EStG). */
export function linearAfaRate(yearBuilt: number): number {
  if (yearBuilt < 1925) return 2.5
  if (yearBuilt >= 2023) return 3
  return 2
}

/** Schenkungsteuer Steuerklasse I (§ 19 ErbStG). */
export const GIFT_TAX_BRACKETS_I: { upTo: number; rate: number }[] = [
  { upTo: 75000, rate: 7 },
  { upTo: 300000, rate: 11 },
  { upTo: 600000, rate: 15 },
  { upTo: 6000000, rate: 19 },
  { upTo: 13000000, rate: 23 },
  { upTo: 26000000, rate: 27 },
  { upTo: Infinity, rate: 30 },
]
export const GIFT_ALLOWANCE_CHILD = 400000
/** § 13d ErbStG: vermietete Wohnimmobilien werden mit 90 % angesetzt. */
export const RENTED_RESIDENTIAL_RELIEF = 0.10
/** § 16 BewG: Jahreswert höchstens Steuerwert ÷ 18,6. */
export const USUFRUCT_DIVISOR = 18.6

/**
 * Vervielfältiger lebenslange Nutzung (5,5 %, Bewertungsstichtage ab 2026),
 * in 5-Jahres-Schritten von Alter 0 bis 100. Kalibriert auf die BMF-Werte für
 * Alter 0 und 65 (BMF 21.10.2025); Zwischenwerte sind eine Näherung.
 */
export const LIFE_FACTORS = {
  m: [18.402, 18.177, 18.076, 17.945, 17.774, 17.55, 17.26, 16.885, 16.402, 15.785, 15.004,
    14.033, 12.849, 11.444, 9.84, 8.096, 6.316, 4.634, 3.184, 2.056, 1.272],
  w: [18.465, 18.247, 18.169, 18.065, 17.93, 17.754, 17.523, 17.223, 16.834, 16.331, 15.685,
    14.865, 13.84, 12.583, 11.089, 9.385, 7.546, 5.7, 4.008, 2.615, 1.599],
}

export function lifeFactor(age: number, sex: 'm' | 'w'): number {
  const t = LIFE_FACTORS[sex]
  const a = Math.max(0, Math.min(100, age)) / 5
  const i = Math.floor(a)
  if (i >= t.length - 1) return t[t.length - 1]
  return t[i] + (t[i + 1] - t[i]) * (a - i)
}

/** Instandhaltungs-Richtwerte nach § 28 II. BV (fortgeschrieben, €/m² Wfl. und Jahr). */
export function maintenanceGuide(ageYears: number): number {
  if (ageYears < 22) return 10.5
  if (ageYears < 32) return 13.3
  return 17.0
}

/** CO2KostAufG: Vermieteranteil nach kg CO₂/m²·a (Wohngebäude). */
export const CO2_STEPS: { below: number; landlord: number }[] = [
  { below: 12, landlord: 0 },
  { below: 17, landlord: 10 },
  { below: 22, landlord: 20 },
  { below: 27, landlord: 30 },
  { below: 32, landlord: 40 },
  { below: 37, landlord: 50 },
  { below: 42, landlord: 60 },
  { below: 47, landlord: 70 },
  { below: 52, landlord: 80 },
  { below: Infinity, landlord: 95 },
]

export function co2LandlordShare(kgPerM2: number): number {
  return CO2_STEPS.find((s) => kgPerM2 < s.below)!.landlord
}

/** GWG-Grenze (netto) und Satz Umsatzsteuer. */
export const GWG_NET = 800
export const VAT = 0.19
