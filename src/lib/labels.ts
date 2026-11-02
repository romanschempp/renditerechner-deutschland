import type { PhaseKind } from '../engine/types'

export const PHASE_LABELS: Record<PhaseKind, string> = {
  vacant: 'Renovierung / Leerstand',
  rent: 'Fremdvermietung',
  childRent: 'Vermietung an Kind',
  childFree: 'Unentgeltlich an Kind',
  own: 'Eigennutzung',
}
