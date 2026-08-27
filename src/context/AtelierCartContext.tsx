import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Atelier } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface PersonneSup { prenom: string; nom: string; age: string }

export interface AtelierReservationForm {
  prenom: string; nom: string; age: string
  email: string; telephone: string; paiement: string
  is_gift?: boolean
  gift_from?: string
  gift_to?: string
}

export interface AtelierCartItem {
  cartId:       string
  atelier:      Atelier
  form:         AtelierReservationForm
  nbPersonnes:  number
  personnesSup: PersonneSup[]
  total:        number
}

interface AtelierCartContextType {
  items:      AtelierCartItem[]
  itemCount:  number
  addItem:    (item: Omit<AtelierCartItem, 'cartId'>) => void
  removeItem: (cartId: string) => void
  clearItems: () => void
}

const KEY = 'atelier_cart_items'

const AtelierCartContext = createContext<AtelierCartContextType | null>(null)

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AtelierCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AtelierCartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  function addItem(item: Omit<AtelierCartItem, 'cartId'>) {
    const newItem: AtelierCartItem = { ...item, cartId: crypto.randomUUID() }
    setItems(prev => [...prev, newItem])
  }

  function removeItem(cartId: string) {
    setItems(prev => prev.filter(i => i.cartId !== cartId))
  }

  function clearItems() { setItems([]) }

  const itemCount = items.reduce((s, i) => s + i.nbPersonnes, 0)

  return (
    <AtelierCartContext.Provider value={{ items, itemCount, addItem, removeItem, clearItems }}>
      {children}
    </AtelierCartContext.Provider>
  )
}

export function useAtelierCart() {
  const ctx = useContext(AtelierCartContext)
  if (!ctx) throw new Error('useAtelierCart must be used within AtelierCartProvider')
  return ctx
}
