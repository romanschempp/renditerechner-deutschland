import { STATES } from './constants'
import type { Inputs } from './types'

let seq = 0
export const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Beispiel: vermietete Bestands-ETW in Leipzig, Kauf Januar 2027. */
export function exampleInputs(): Inputs {
  return {
    object: {
      name: 'Beispiel-ETW Leipzig',
      type: 'ETW',
      state: 'SN',
      price: 240000,
      inventory: 6000,
      area: 68,
      yearBuilt: 1995,
      purchaseYear: 2027,
      purchaseMonth: 1,
      landMode: 'pct',
      landPct: 20,
      brw: 650,
      landArea: 60,
      special: 'none',
      specialBase: 0,
      newBuildDegressive: false,
      sonder7b: false,
    },
    purchase: {
      grest: STATES.SN.grest,
      familyExempt: false,
      notary: 1.5,
      registry: 0.5,
      mortgageFees: 0.5,
      agent: 3.57,
      appraisal: 0,
      other: 0,
    },
    renovation: {
      items: [
        { id: uid(), label: 'Bad und Böden', amount: 12000, kind: 'erhaltung', spreadYears: 1 },
        { id: uid(), label: 'Malerarbeiten', amount: 3000, kind: 'erhaltung', spreadYears: 1 },
      ],
      later: [
        { id: uid(), label: 'Sonderumlage Fassade', amount: 4000, kind: 'erhaltung', spreadYears: 1, year: 8, modernisation: false },
      ],
      subsidy: 0,
    },
    loans: [
      {
        id: uid(), label: 'Bankdarlehen', type: 'annuity', amount: 220000, rate: 3.6, repay: 2,
        termYears: 30, fixedYears: 10, followRate: 4.0, followRepay: 2.5, specialRepay: 0,
        disagio: 0, graceYears: 0,
      },
    ],
    financeFees: 0,
    vfe: { mode: 'auto', pct: 3, reinvestRate: 2.8 },
    rent: {
      phases: [
        { id: uid(), kind: 'vacant', months: 3, childPct: 66 },
        { id: uid(), kind: 'rent', months: null, childPct: 66 },
      ],
      coldRent: 850,
      parking: 40,
      furnished: 0,
      localRent: 830,
      localGrowth: 2,
      model: 'index',
      growth: 2,
      tightMarket: true,
      mietpreisbremse: true,
      newLeasePct: 110,
      vacancyPct: 2,
      tenantYears: 6,
      changeVacancy: 2,
      changeCost: 2500,
      changeAgentMonths: 0,
      manual: {},
      ownSavedRent: true,
    },
    costs: {
      umlage: 190,
      hausgeldNonUml: 35,
      reserve: 70,
      reserveDeductible: true,
      grundsteuer: 260,
      grundsteuerUmlage: true,
      insurance: 120,
      sev: 25,
      maintenance: 5,
      co2: 40,
      bank: 16,
      taxAdvice: 250,
      travel: 60,
      other: 50,
      growth: 2,
    },
    tax: {
      filing: 'joint',
      mode: 'exact',
      zve: 110000,
      zveGrowth: 2,
      church: 0,
      marginal: 42,
      indexTariff: true,
      tariffIndex: 2,
      afaMode: 'auto',
      customRate: 2.5,
    },
    family: {
      enabled: false,
      child: { name: 'Kind', age: 19, kindergeldUntil: 2032, zve: 0 },
      rentToChild: false,
      rentPct: 66,
      rentFromYear: 0,
      rentYears: 0,
      transfer: 'none',
      transferYear: 12,
      donors: 2,
      priorGifts: 0,
      debtAssumed: true,
      salePrice: 200000,
      childLoanRate: 4,
      childLoanRepay: 2,
      parentAge: 55,
      parentSex: 'm',
      taxValue: 0,
    },
    sale: {
      years: 11,
      priceMode: 'growth',
      direct: 300000,
      pessDelta: -2,
      optDelta: 1,
      agent: 3.57,
      deletion: 300,
      preparation: 1500,
      other: 0,
    },
    assumptions: {
      horizon: 30,
      valueGrowth: 1.5,
      inflation: 2,
      altReturn: 5,
      appreciationInReturn: false,
      ekBase: 'invested',
    },
  }
}

export function emptyInputs(): Inputs {
  const e = exampleInputs()
  e.object.name = 'Neues Objekt'
  e.renovation.items = []
  e.renovation.later = []
  return e
}
