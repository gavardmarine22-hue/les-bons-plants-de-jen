// ─── Types boutique ───────────────────────────────────────────────────────────

export type ShopStatus = 'active' | 'inactive' | 'stocking'

export interface ShopCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface ShopProduct {
  id: string
  name: string
  description: string
  price: number
  compare_price: number | null
  category_id: string | null
  images: string[]
  stock: number
  stock_illimite: boolean
  sur_commande: boolean
  montants_disponibles: number[] | null
  weight_g: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ShopCartItem {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  chosen_price: number | null
  created_at: string
  product: ShopProduct
}

export interface ShopPromotion {
  id: string
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  applies_to: 'all' | 'category' | 'product'
  target_id: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface ShopPromoCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  max_uses: number | null
  uses_count: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
}

export function calcPromoDiscount(subtotal: number, code: ShopPromoCode): number {
  if (subtotal < code.min_order) return 0
  if (code.discount_type === 'percentage') {
    return Math.round(subtotal * (code.discount_value / 100) * 100) / 100
  }
  return Math.min(subtotal, code.discount_value)
}

export function getActivePromoForProduct(
  product: ShopProduct,
  promotions: ShopPromotion[]
): ShopPromotion | null {
  const now = new Date()
  return promotions.find(p => {
    if (!p.is_active) return false
    if (p.start_date && new Date(p.start_date) > now) return false
    if (p.end_date   && new Date(p.end_date)   < now) return false
    if (p.applies_to === 'all') return true
    if (p.applies_to === 'product'  && p.target_id === product.id)          return true
    if (p.applies_to === 'category' && p.target_id === product.category_id) return true
    return false
  }) ?? null
}

export function getDiscountedPrice(product: ShopProduct, promotions: ShopPromotion[]): number {
  const promo = getActivePromoForProduct(product, promotions)
  if (!promo) return product.price
  if (promo.discount_type === 'percentage') {
    return Math.max(0, product.price * (1 - promo.discount_value / 100))
  }
  return Math.max(0, product.price - promo.discount_value)
}

/** Vérifie si une promotion est en solde (remise ≥ 20%) pour l'affichage */
export function isSale(promo: ShopPromotion): boolean {
  if (promo.discount_type === 'percentage' && promo.discount_value >= 20) return true
  return false
}
