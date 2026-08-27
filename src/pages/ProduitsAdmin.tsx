import { useState, useEffect } from 'react'
import { Package, Plus, Pencil, Trash2, ChevronRight, ChevronDown, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ShopCategory, ShopProduct } from '../lib/shop'
import { formatPrice } from '../lib/shop'
import CatModal from '../components/ShopCatModal'
import ProductModal from '../components/ShopProductModal'

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center gap-3 bg-candy">
      {icon}<div>
        <h2 className="font-black text-[#1A1040] text-sm">{title}</h2>
        <p className="text-[10px] text-gray-400 font-bold">{sub}</p>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProduitsAdmin() {
  const [tab, setTab]               = useState<'categories'|'products'>('products')
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [products, setProducts]     = useState<ShopProduct[]>([])
  const [loading, setLoading]       = useState(true)
  const [searchProd, setSearchProd] = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  // Modals
  const [editCat, setEditCat]       = useState<ShopCategory | null | undefined>(undefined)
  const [editProd, setEditProd]     = useState<ShopProduct | null | undefined>(undefined)
  const [deleteCatId, setDeleteCatId] = useState<string|null>(null)
  const [deleteProdId, setDeleteProdId] = useState<string|null>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('shop_categories').select('*').order('sort_order').order('name'),
      supabase.from('shop_products').select('*').order('sort_order').order('name'),
    ])
    setCategories((cats as ShopCategory[]) || [])
    setProducts((prods as ShopProduct[]) || [])
    setLoading(false)
  }

  async function deleteCategory(id: string) {
    await supabase.from('shop_categories').delete().eq('id', id)
    setDeleteCatId(null); loadAll()
  }

  async function deleteProduct(id: string) {
    await supabase.from('shop_products').delete().eq('id', id)
    setDeleteProdId(null); loadAll()
  }

  async function toggleProductActive(p: ShopProduct) {
    await supabase.from('shop_products').update({ is_active: !p.is_active }).eq('id', p.id)
    loadAll()
  }

  // Filtre produits
  const filtered = products.filter(p => {
    const matchSearch = !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())
    const matchCat    = !filterCat  || p.category_id === filterCat
    return matchSearch && matchCat
  })

  // Arbre des catégories
  const topCats = categories.filter(c => !c.parent_id)
  const childCats = (parentId: string) => categories.filter(c => c.parent_id === parentId)

  const getCatName = (id: string | null) => {
    if (!id) return '—'
    const cat = categories.find(c => c.id === id)
    if (!cat) return '—'
    const parent = cat.parent_id ? categories.find(c => c.id === cat.parent_id) : null
    return parent ? `${parent.name} › ${cat.name}` : cat.name
  }

  return (
    <main className="flex-1 bg-candy">
      {/* HEADER */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-yellow-300" style={{ boxShadow:'3px 3px 0px 0px #fb7185' }}>
            <Package className="w-7 h-7 text-[#1A1040]"/>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">🔐 Espace administrateur</div>
            <h1 className="font-serif text-3xl font-black text-white">Produits & Catégories <span className="text-citron-400">✦</span></h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* TABS */}
        <div className="flex gap-2">
          {[{id:'products',label:'📦 Produits'},{id:'categories',label:'🗂️ Catégories'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as typeof tab)}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm border-2 transition-all ${tab===t.id ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'bg-white text-[#1A1040] border-[#1A1040] hover:bg-candy'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB : PRODUITS ═══ */}
        {tab === 'products' && (
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #c4b5fd' }}>
            <SectionHeader icon={<Package className="w-5 h-5 text-[#1A1040]"/>} title="Produits" sub="Gérez tous vos articles à la vente" />
            <div className="p-6 space-y-4">
              {/* Barre de filtre */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={searchProd} onChange={e=>setSearchProd(e.target.value)} placeholder="🔍 Rechercher un produit…"
                  className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400"/>
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                  className="border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none">
                  <option value="">Toutes les catégories</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.parent_id ? '  └ ':''}{c.name}</option>)}
                </select>
                <button onClick={()=>setEditProd(null)}
                  className="flex items-center gap-2 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl font-black border-2 border-[#1A1040] hover:bg-yellow-300 transition-all"
                  style={{ boxShadow:'2px 2px 0px 0px #1A1040' }}>
                  <Plus className="w-4 h-4"/> Nouveau
                </button>
              </div>

              {loading ? (
                <div className="text-center py-10 text-gray-400 font-black">Chargement…</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                  <p className="font-black">Aucun produit{searchProd||filterCat ? ' trouvé' : ' — créez-en un !'}</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-gray-100">
                  {filtered.map(prod => (
                    <div key={prod.id} className="flex items-center gap-4 py-4">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-xl border-2 border-gray-200 overflow-hidden shrink-0 bg-gray-50">
                        {prod.images?.[0]
                          ? <img src={prod.images[0]} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-[#1A1040] text-sm truncate">{prod.name}</div>
                        <div className="text-xs text-gray-500">{getCatName(prod.category_id)}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-black text-[#1A1040]">{formatPrice(prod.price)}</span>
                          {prod.compare_price && <span className="text-xs text-gray-400 line-through">{formatPrice(prod.compare_price)}</span>}
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full border-2 ${prod.stock > 0 ? 'border-green-400 text-green-700 bg-green-50' : 'border-red-400 text-red-700 bg-red-50'}`}>
                            {prod.stock > 0 ? `${prod.stock} en stock` : '⚠️ Rupture'}
                          </span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={()=>toggleProductActive(prod)} title={prod.is_active?'Masquer':'Afficher'}
                          className={`w-8 h-8 rounded-xl border-2 border-[#1A1040] flex items-center justify-center text-xs font-black transition-all ${prod.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {prod.is_active ? '👁' : '🙈'}
                        </button>
                        <button onClick={()=>setEditProd(prod)} className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-white hover:bg-candy flex items-center justify-center transition-all">
                          <Pencil className="w-3.5 h-3.5 text-[#1A1040]"/>
                        </button>
                        <button onClick={()=>setDeleteProdId(prod.id)} className="w-8 h-8 rounded-xl border-2 border-red-300 bg-white hover:bg-red-50 flex items-center justify-center transition-all">
                          <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB : CATÉGORIES ═══ */}
        {tab === 'categories' && (
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #ffe500' }}>
            <SectionHeader icon={<Tag className="w-5 h-5 text-[#1A1040]"/>} title="Catégories" sub="Organisez vos produits en catégories et sous-catégories" />
            <div className="p-6 space-y-4">
              <button onClick={()=>setEditCat(null)}
                className="flex items-center gap-2 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl font-black border-2 border-[#1A1040] hover:bg-yellow-300 transition-all"
                style={{ boxShadow:'2px 2px 0px 0px #1A1040' }}>
                <Plus className="w-4 h-4"/> Nouvelle catégorie
              </button>

              {loading ? (
                <div className="text-center py-10 text-gray-400 font-black">Chargement…</div>
              ) : topCats.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Tag className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                  <p className="font-black">Aucune catégorie — créez-en une !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topCats.map(cat => {
                    const children = childCats(cat.id)
                    const isExpanded = expanded.has(cat.id)
                    const prodCount = products.filter(p => p.category_id === cat.id).length
                    return (
                      <div key={cat.id} className="border-2 border-[#1A1040] rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-candy">
                          {children.length > 0 ? (
                            <button onClick={()=>setExpanded(p=>{ const n=new Set(p); n.has(cat.id)?n.delete(cat.id):n.add(cat.id); return n })}
                              className="w-6 h-6 flex items-center justify-center">
                              {isExpanded ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                            </button>
                          ) : <div className="w-6"/>}
                          <div className="flex-1">
                            <span className="font-black text-[#1A1040]">{cat.name}</span>
                            <span className="ml-2 text-xs text-gray-500 font-mono">{cat.slug}</span>
                            <span className="ml-2 text-xs text-gray-400">({prodCount} produit{prodCount!==1?'s':''})</span>
                            {children.length > 0 && <span className="ml-2 text-xs text-purple-600 font-bold">{children.length} sous-catégorie{children.length!==1?'s':''}</span>}
                          </div>
                          <button onClick={()=>setEditCat(cat)} className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-white hover:bg-white/80 flex items-center justify-center">
                            <Pencil className="w-3.5 h-3.5 text-[#1A1040]"/>
                          </button>
                          <button onClick={()=>setDeleteCatId(cat.id)} className="w-8 h-8 rounded-xl border-2 border-red-300 bg-white hover:bg-red-50 flex items-center justify-center">
                            <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                          </button>
                        </div>
                        {isExpanded && children.length > 0 && (
                          <div className="border-t-2 border-[#1A1040] divide-y divide-gray-100">
                            {children.map(child => {
                              const childProdCount = products.filter(p => p.category_id === child.id).length
                              return (
                                <div key={child.id} className="flex items-center gap-3 px-4 py-3 pl-12 bg-white">
                                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0"/>
                                  <div className="flex-1">
                                    <span className="font-bold text-[#1A1040] text-sm">{child.name}</span>
                                    <span className="ml-2 text-xs text-gray-500 font-mono">{child.slug}</span>
                                    <span className="ml-2 text-xs text-gray-400">({childProdCount} produit{childProdCount!==1?'s':''})</span>
                                  </div>
                                  <button onClick={()=>setEditCat(child)} className="w-7 h-7 rounded-lg border-2 border-[#1A1040] bg-white hover:bg-candy flex items-center justify-center">
                                    <Pencil className="w-3 h-3 text-[#1A1040]"/>
                                  </button>
                                  <button onClick={()=>setDeleteCatId(child.id)} className="w-7 h-7 rounded-lg border-2 border-red-300 bg-white hover:bg-red-50 flex items-center justify-center">
                                    <Trash2 className="w-3 h-3 text-red-500"/>
                                  </button>
                                </div>
                              )
                            })}
                            <div className="px-4 py-2 pl-12">
                              <button onClick={()=>setEditCat({ id:'', name:'', slug:'', parent_id:cat.id, sort_order:0, created_at:'' })}
                                className="text-xs font-black text-purple-600 hover:text-purple-800 flex items-center gap-1">
                                <Plus className="w-3 h-3"/> Ajouter une sous-catégorie
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal catégorie */}
      {editCat !== undefined && (
        <CatModal
          cat={editCat?.id ? editCat : null}
          categories={categories}
          onSave={() => { setEditCat(undefined); loadAll() }}
          onClose={() => setEditCat(undefined)}
        />
      )}

      {/* Modal produit */}
      {editProd !== undefined && (
        <ProductModal
          product={editProd?.id ? editProd : null}
          categories={categories}
          onSave={() => { setEditProd(undefined); loadAll() }}
          onClose={() => setEditProd(undefined)}
        />
      )}

      {/* Confirm delete catégorie */}
      {deleteCatId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] p-6 max-w-sm w-full" style={{ boxShadow:'5px 5px 0px 0px #ef4444' }}>
            <h3 className="font-black text-xl text-[#1A1040] mb-2">Supprimer la catégorie ?</h3>
            <p className="text-sm text-gray-600 mb-5">Les produits ne seront pas supprimés mais n'auront plus de catégorie.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteCatId(null)} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-gray-50">Annuler</button>
              <button onClick={()=>deleteCategory(deleteCatId)} className="flex-1 bg-red-500 text-white border-2 border-red-500 rounded-2xl py-3 font-black hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete produit */}
      {deleteProdId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] p-6 max-w-sm w-full" style={{ boxShadow:'5px 5px 0px 0px #ef4444' }}>
            <h3 className="font-black text-xl text-[#1A1040] mb-2">Supprimer le produit ?</h3>
            <p className="text-sm text-gray-600 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteProdId(null)} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-gray-50">Annuler</button>
              <button onClick={()=>deleteProduct(deleteProdId)} className="flex-1 bg-red-500 text-white border-2 border-red-500 rounded-2xl py-3 font-black hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
