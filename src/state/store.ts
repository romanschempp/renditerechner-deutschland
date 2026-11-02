import { useCallback, useEffect, useMemo, useState } from 'react'
import { emptyInputs, exampleInputs, uid } from '../engine/defaults'
import type { CalcMode, Inputs } from '../engine/types'

const KEY = 'renditerechner-de-v1'

export interface Obj {
  id: string
  inputs: Inputs
}

export interface State {
  version: 1
  objects: Obj[]
  currentId: string
  calc: CalcMode
}

/** Fehlende Felder (neue Versionen) aus den Standardwerten ergänzen. */
function mergeDefaults<T>(def: T, val: unknown): T {
  if (val == null) return def
  if (Array.isArray(def)) return (Array.isArray(val) ? val : def) as T
  if (typeof def === 'object' && def !== null) {
    if (typeof val !== 'object') return def
    const out: Record<string, unknown> = { ...(val as Record<string, unknown>) }
    for (const [k, v] of Object.entries(def as Record<string, unknown>)) {
      out[k] = mergeDefaults(v, (val as Record<string, unknown>)[k])
    }
    return out as T
  }
  return (typeof val === typeof def ? val : def) as T
}

function initial(): State {
  const o = { id: uid(), inputs: exampleInputs() }
  return { version: 1, objects: [o], currentId: o.id, calc: 'rent' }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial()
    const s = JSON.parse(raw) as State
    if (!s.objects?.length) return initial()
    const base = exampleInputs()
    s.objects = s.objects.map((o) => ({ id: o.id, inputs: mergeDefaults(base, o.inputs) }))
    if (!s.objects.some((o) => o.id === s.currentId)) s.currentId = s.objects[0].id
    s.calc = s.calc === 'sale' ? 'sale' : 'rent'
    return s
  } catch {
    return initial()
  }
}

export function useStore() {
  const [state, setState] = useState<State>(load)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
        setSavedAt(Date.now())
      } catch {
        /* Speicher nicht verfügbar */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [state])

  const current = useMemo(() => state.objects.find((o) => o.id === state.currentId) ?? state.objects[0], [state])

  const update = useCallback((fn: (d: Inputs) => void) => {
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) => {
        if (o.id !== s.currentId) return o
        const d = structuredClone(o.inputs)
        fn(d)
        return { ...o, inputs: d }
      }),
    }))
  }, [])

  const actions = useMemo(() => ({
    select: (id: string) => setState((s) => ({ ...s, currentId: id })),
    setCalc: (calc: CalcMode) => setState((s) => ({ ...s, calc })),
    add: () => setState((s) => {
      const o = { id: uid(), inputs: emptyInputs() }
      return { ...s, objects: [...s.objects, o], currentId: o.id }
    }),
    duplicate: () => setState((s) => {
      const cur = s.objects.find((o) => o.id === s.currentId)!
      const o = { id: uid(), inputs: { ...structuredClone(cur.inputs), object: { ...cur.inputs.object, name: `${cur.inputs.object.name} (Kopie)` } } }
      return { ...s, objects: [...s.objects, o], currentId: o.id }
    }),
    remove: () => setState((s) => {
      const rest = s.objects.filter((o) => o.id !== s.currentId)
      if (!rest.length) return initial()
      return { ...s, objects: rest, currentId: rest[0].id }
    }),
    loadExample: () => setState((s) => ({
      ...s,
      objects: s.objects.map((o) => (o.id === s.currentId ? { ...o, inputs: exampleInputs() } : o)),
    })),
    importJson: (text: string) => {
      const data = JSON.parse(text) as Partial<State> | Inputs
      const base = exampleInputs()
      const list: Inputs[] = 'objects' in data && Array.isArray(data.objects)
        ? data.objects.map((o) => o.inputs)
        : [data as Inputs]
      setState((s) => {
        const added = list.map((i) => ({ id: uid(), inputs: mergeDefaults(base, i) }))
        return { ...s, objects: [...s.objects, ...added], currentId: added[0].id }
      })
    },
  }), [])

  return { state, current, update, savedAt, ...actions }
}

export type Store = ReturnType<typeof useStore>
export type Update = Store['update']
