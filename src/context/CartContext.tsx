import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { ShopCartItem, ShopPromoCode } from '../lib/shop'
import { calcPromoDiscount } from '../lib/shop'

// ─── Session ID ────────────────────────────────────────────────────────────────
function getSessionId(): string {
  let id = localStorage.getItem('shop_session_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('shop_session_id', id) }
  return id
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CartContextType {
  cartId:       string | null
  items:        ShopCartItem[]
  itemCount:    number
  subtotal:     number
  discount:     number
  total:        number
  expiresAt:    Date | null
  appliedCode:  ShopPromoCode | null
  isOpen:       boolean
  loading:      boolean
  addItem:      (productId: string, qty?: number, chosenPrice?: number) => Promise<{ success: boolean; error?: string }>
  removeItem:   (itemId: string, qty?: number) => Promise<void>
  clearCart:    () => Promise<void>
  applyPromoCode: (code: string) => Promise<{ success: boolean; error?: string }>
  removePromoCode: () => void
  setIsOpen:    (open: boolean) => void
  refreshCart:  () => Promise<void>
}

const CartContext = createContext<CartContextType | null>(null)

// ─── Provider ──────────────────────────────────────────────────────────────────
export function CartProvider({ children }: { children: ReactNode }) {
  const [cartId,      setCartId]      = useState<string | null>(null)
  const [items,       setItems]       = useState<ShopCartItem[]>([])
  const [expiresAt,   setExpiresAt]   = useState<Date | null>(null)
  const [appliedCode, setAppliedCode] = useState<ShopPromoCode | null>(null)
  const [isOpen,      setIsOpen]      = useState(false)
  const [loading,     setLoading]     = useState(true)
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cartIdRef   = useRef<string | null>(null)

  useEffect(() => {
    initCart()
    return () => { if (expiryTimer.current) clearTimeout(expiryTimer.current) }
  }, [])

  // ── Expiry en minutes (depuis settings) ──────────────────────────────────────
  async function getExpiryMins(): Promise<number> {
    const { data } = await supabase.from('settings').select('value').eq('key', 'shop_cart_expiry').maybeSingle()
    return data?.value ? parseInt(data.value) || 30 : 30
  }

  // ── Nettoyage des paniers expirés (restauration de stock) ────────────────────
  async function cleanupExpiredCarts() {
    const now = new Date().toISOString()
    const { data: expired } = await supabase
      .from('shop_carts').select('id').lt('expires_at', now)
    if (!expired?.length) return

    for (const cart of expired) {
      const { data: expItems } = await supabase
        .from('shop_cart_items').select('product_id, quantity').eq('cart_id', cart.id)
      for (const item of expItems || []) {
        // Restauration du stock : fetch + update (légère race condition acceptable)
        const { data: prod } = await supabase.from('shop_products').select('stock').eq('id', item.product_id).maybeSingle()
        if (prod !== null && prod !== undefined)
          await supabase.from('shop_products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id)
      }
      await supabase.from('shop_carts').delete().eq('id', cart.id)
    }
  }

  // ── Init : charge ou crée le panier ──────────────────────────────────────────
  async function initCart() {
    setLoading(true)
    const sessionId = getSessionId()

    await cleanupExpiredCarts()

    const now = new Date().toISOString()
    const { data: existing } = await supabase
      .from('shop_carts').select('*')
      .eq('session_id', sessionId).gt('expires_at', now)
      .order('created_at', { ascending: false }).limit(1)

    let cart = existing?.[0] ?? null

    if (!cart) {
      const mins = await getExpiryMins()
      const exp  = new Date(Date.now() + mins * 60_000).toISOString()
      const { data: created } = await supabase
        .from('shop_carts').insert({ session_id: sessionId, expires_at: exp }).select().single()
      cart = created
    }

    if (cart) {
      setCartId(cart.id)
      cartIdRef.current = cart.id
      setExpiresAt(new Date(cart.expires_at))
      await loadItems(cart.id)
      scheduleExpiry(new Date(cart.expires_at))
    }
    setLoading(false)
  }

  async function loadItems(cId: string) {
    const { data } = await supabase
      .from('shop_cart_items').select('*, product:shop_products(*)').eq('cart_id', cId)
    setItems((data as ShopCartItem[]) || [])
  }

  function scheduleExpiry(exp: Date) {
    if (expiryTimer.current) clearTimeout(expiryTimer.current)
    const ms = exp.getTime() - Date.now()
    if (ms <= 0) return
    expiryTimer.current = setTimeout(() => { setItems([]); setCartId(null); setExpiresAt(null); initCart() }, ms)
  }

  // ── Ajouter un article ────────────────────────────────────────────────────────
  async function addItem(productId: string, qty = 1, chosenPrice?: number): Promise<{ success: boolean; error?: string }> {
    const cId = cartIdRef.current
    if (!cId) return { success: false, error: 'Panier introuvable' }

    const { data: prod } = await supabase
      .from('shop_products').select('stock, stock_illimite').eq('id', productId).maybeSingle()
    if (!prod) return { success: false, error: 'Article introuvable' }

    if (!prod.stock_illimite) {
      // Vérification + décrémentation atomique du stock (WHERE stock >= qty)
      if (prod.stock < qty) return { success: false, error: 'Stock insuffisant' }
      const { data: decremented } = await supabase
        .from('shop_products')
        .update({ stock: prod.stock - qty })
        .eq('id', productId).gte('stock', qty).select('id')
      if (!decremented?.length) return { success: false, error: 'Stock insuffisant' }
    }

    // Upsert dans cart_items — les montants différents (carte cadeau) restent des lignes distinctes
    let query = supabase.from('shop_cart_items').select('id, quantity').eq('cart_id', cId).eq('product_id', productId)
    query = chosenPrice != null ? query.eq('chosen_price', chosenPrice) : query.is('chosen_price', null)
    const { data: existing } = await query.maybeSingle()

    if (existing) {
      await supabase.from('shop_cart_items')
        .update({ quantity: existing.quantity + qty }).eq('id', existing.id)
    } else {
      await supabase.from('shop_cart_items').insert({ cart_id: cId, product_id: productId, quantity: qty, chosen_price: chosenPrice ?? null })
    }

    // Rafraîchir l'expiration
    const mins = await getExpiryMins()
    const newExp = new Date(Date.now() + mins * 60_000)
    await supabase.from('shop_carts').update({ expires_at: newExp.toISOString() }).eq('id', cId)
    setExpiresAt(newExp)
    scheduleExpiry(newExp)

    await loadItems(cId)
    return { success: true }
  }

  // ── Retirer un article ────────────────────────────────────────────────────────
  async function removeItem(itemId: string, qty = 1) {
    const cId = cartIdRef.current
    if (!cId) return
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const actualQty = Math.min(qty, item.quantity)

    // Restauration stock (sauf si stock illimité)
    const { data: prod } = await supabase.from('shop_products').select('stock, stock_illimite').eq('id', item.product_id).maybeSingle()
    if (prod && !prod.stock_illimite)
      await supabase.from('shop_products').update({ stock: prod.stock + actualQty }).eq('id', item.product_id)

    if (item.quantity <= qty) {
      await supabase.from('shop_cart_items').delete().eq('id', itemId)
    } else {
      await supabase.from('shop_cart_items')
        .update({ quantity: item.quantity - qty }).eq('id', itemId)
    }
    await loadItems(cId)
  }

  // ── Vider le panier ───────────────────────────────────────────────────────────
  async function clearCart() {
    const cId = cartIdRef.current
    if (!cId) return
    for (const item of items) {
      const { data: prod } = await supabase.from('shop_products').select('stock, stock_illimite').eq('id', item.product_id).maybeSingle()
      if (prod && !prod.stock_illimite)
        await supabase.from('shop_products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id)
    }
    await supabase.from('shop_cart_items').delete().eq('cart_id', cId)
    setItems([])
    setAppliedCode(null)
  }

  // ── Code promo ────────────────────────────────────────────────────────────────
  async function applyPromoCode(code: string): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('shop_promo_codes').select('*')
      .eq('code', code.toUpperCase().trim()).eq('is_active', true).maybeSingle()

    if (!data) return { success: false, error: 'Code invalide ou inactif' }
    if (data.start_date && data.start_date > now) return { success: false, error: 'Code pas encore actif' }
    if (data.end_date   && data.end_date   < now) return { success: false, error: 'Code expiré' }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) return { success: false, error: 'Code épuisé' }
    if (subtotal < (data.min_order ?? 0)) return { success: false, error: `Commande minimum : ${data.min_order} €` }

    setAppliedCode(data as ShopPromoCode)
    return { success: true }
  }

  function removePromoCode() { setAppliedCode(null) }

  const refreshCart = useCallback(async () => {
    if (cartIdRef.current) await loadItems(cartIdRef.current)
  }, [])

  // ── Calculs ───────────────────────────────────────────────────────────────────
  const subtotal  = items.reduce((s, i) => s + (i.chosen_price ?? i.product?.price ?? 0) * i.quantity, 0)
  const discount  = appliedCode ? calcPromoDiscount(subtotal, appliedCode) : 0
  const total     = Math.max(0, subtotal - discount)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      cartId, items, itemCount, subtotal, discount, total,
      expiresAt, appliedCode, isOpen, loading,
      addItem, removeItem, clearCart, applyPromoCode, removePromoCode,
      setIsOpen, refreshCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
