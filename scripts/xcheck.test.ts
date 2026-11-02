import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { simulate } from '../src/engine/simulate'
import { exampleInputs } from '../src/engine/defaults'
it('xcheck', () => {
  const i = exampleInputs()
  i.renovation.items = []; i.renovation.later = []; i.object.inventory = 0
  i.rent.phases = [{ id: 'a', kind: 'rent', months: null, childPct: 100 }]
  i.rent.vacancyPct = 0; i.rent.tenantYears = 0; i.rent.parking = 0
  i.tax.indexTariff = false; i.tax.zveGrowth = 0; i.costs.reserveDeductible = true
  i.assumptions.valueGrowth = 4
  const s = simulate(i, { mode: 'sale', saleMonths: 60 })
  writeFileSync(process.env.OUT!, JSON.stringify({ inputs: i, years: s.years.map(y => ({ year: y.year, vv: y.vv, tax: y.taxEffect, cfPost: y.cfPost, interest: y.interest, afa: y.afaBuilding })), sale: s.sale, irr: s.irrEk }))
})
