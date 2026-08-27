import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { POLAROID_FONTS, type HeroPolaroid } from './HeroPolaroidManager'

// Positions stored as:
//   side='left'  → offset_x = distance from left edge of container  (CSS: left: offset_x)
//   side='right' → offset_x = negative distance from right edge     (CSS: right: -offset_x)
// offset_y is always distance from top of container.
// No container-width computation in JS — the browser handles right/left natively.

export default function HeroPolaroidDisplay({ polaroid, index: _index, isAdmin, onMoved, tableName = 'hero_polaroids' }: {
  polaroid: HeroPolaroid
  index: number
  isAdmin: boolean
  onMoved: (id: string, offset_x: number, offset_y: number) => void
  tableName?: string
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  if (!polaroid.is_visible && !isAdmin) return null
  const canDrag = isAdmin && polaroid.draggable

  function onPointerDown(e: React.PointerEvent) {
    if (!canDrag) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, ox: polaroid.offset_x, oy: polaroid.offset_y }
    setDrag({ x: polaroid.offset_x, y: polaroid.offset_y })
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return
    setDrag({
      x: start.current.ox + (e.clientX - start.current.px),
      y: start.current.oy + (e.clientY - start.current.py),
    })
  }

  async function onPointerUp(e: React.PointerEvent) {
    if (!start.current) { start.current = null; return }
    const x = start.current.ox + (e.clientX - start.current.px)
    const y = start.current.oy + (e.clientY - start.current.py)
    start.current = null
    setDrag(null)
    onMoved(polaroid.id, x, y)
    await supabase.from(tableName).update({ offset_x: x, offset_y: y }).eq('id', polaroid.id)
  }

  const rawX = drag ? drag.x : polaroid.offset_x
  const rawY = drag ? drag.y : polaroid.offset_y

  // CSS positioning: left-side uses `left`, right-side uses `right`.
  // No JS computation of container width — browser handles it natively and stably.
  const posStyle: React.CSSProperties = polaroid.side === 'right'
    ? { right: `${-rawX}px`, top: `${rawY}px` }
    : { left: `${rawX}px`,  top: `${rawY}px` }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute z-20 select-none ${canDrag ? 'cursor-move' : ''} ${!polaroid.is_visible ? 'opacity-40' : ''}`}
      style={{
        ...posStyle,
        transform: `rotate(${polaroid.rotation}deg)`,
      }}>
      <div className="bg-white p-2 pb-3 border-2 border-[#1A1040] rounded-sm"
        style={{ width: `${polaroid.size}px`, boxShadow: '4px 4px 0px 0px #1A1040', filter: 'drop-shadow(2px 4px 8px rgba(0,0,0,0.15))' }}>
        <div className="w-full aspect-square bg-candy border border-gray-200 overflow-hidden">
          {polaroid.image_url
            ? <img src={polaroid.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
            : <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>}
        </div>
        {(polaroid.title || polaroid.text) && (
          <div className="pt-2 px-0.5 text-center">
            {polaroid.title && (
              <p className="font-bold leading-tight"
                style={{ fontSize: `${polaroid.title_size}px`, fontFamily: POLAROID_FONTS[polaroid.title_font] || 'sans-serif', color: polaroid.title_color }}>
                {polaroid.title}
              </p>
            )}
            {polaroid.text && (
              <p className="leading-snug"
                style={{ fontSize: `${polaroid.text_size}px`, fontFamily: POLAROID_FONTS[polaroid.text_font] || 'sans-serif', color: polaroid.text_color }}>
                {polaroid.text}
              </p>
            )}
          </div>
        )}
        {isAdmin && !polaroid.is_visible && (
          <p className="text-[9px] text-center font-black text-red-500 mt-1">MASQUÉ</p>
        )}
      </div>
    </div>
  )
}
