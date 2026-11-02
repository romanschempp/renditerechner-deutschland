import { it } from 'vitest'
import { analyse } from '../src/engine/analysis'
import { exampleInputs } from '../src/engine/defaults'
it('dump', () => {
  const a = analyse(exampleInputs(), 'sale')
  const r = (x:number)=>Math.round(x)
  console.log(JSON.stringify({kpis: Object.fromEntries(Object.entries(a.kpis).map(([k,v])=>[k, typeof v==='number'? +v.toFixed(4):v])), sale: a.sim.sale, warn: a.sim.warnings.map(w=>w.title)}, null, 1))
  for (const y of a.sim.years) console.log(y.year, y.months, y.phases.join(','), 'rent', r(y.rentEff), 'op', r(y.opCosts), 'noi', r(y.noi), 'int', r(y.interest), 'tilg', r(y.principal), 'afa', r(y.afaBuilding+y.afaInventory), 'erh', r(y.erhaltung), 'vv', r(y.vv), 'tax', r(y.taxEffect), 'cfPre', r(y.cfPre), 'cfPost', r(y.cfPost), 'ek', y.ekReturn?.toFixed(3), 'gk', y.gkReturn?.toFixed(3), 'bal', r(y.balance))
  console.log('hold', a.hold.map(h=>`${h.years}:${(h.irrEk??0).toFixed(3)}`).join(' '))
  console.log('sens', JSON.stringify(a.sensitivity))
})
