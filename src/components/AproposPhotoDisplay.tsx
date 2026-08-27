import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface AproposPhoto {
  id:            string
  image_url:     string
  offset_x:      number
  offset_y:      number
  rotation:      number
  size:          number
  show_cadre:    boolean
  cadre_color:   string
  cadre_width:   number
  show_contour:  boolean
  contour_color: string
  show_fond:     boolean
  fond_color:    string
  shape:         string
  is_visible:    boolean
  sort_order:    number
  caption:       string
}

const SHAPE_RADIUS: Record<string, string> = {
  'rounded-none': '0px',
  'rounded-xl':   '12px',
  'rounded-2xl':  '16px',
  'rounded-3xl':  '24px',
  'rounded-full': '9999px',
}

export default function AproposPhotoDisplay({ photo, isAdmin, onMoved }: {
  photo:    AproposPhoto
  isAdmin?: boolean
  onMoved?: (id: string, offset_x: number, offset_y: number) => void
}) {
  const borderRadius = SHAPE_RADIUS[photo.shape] ?? '16px'

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const canDrag = !!isAdmin
  const offsetX = drag ? drag.x : (photo.offset_x || 0)
  const offsetY = drag ? drag.y : (photo.offset_y || 0)

  function onPointerDown(e: React.PointerEvent) {
    if (!canDrag) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, ox: photo.offset_x || 0, oy: photo.offset_y || 0 }
    setDrag({ x: photo.offset_x || 0, y: photo.offset_y || 0 })
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return
    const dx = e.clientX - start.current.px
    const dy = e.clientY - start.current.py
    setDrag({ x: start.current.ox + dx, y: start.current.oy + dy })
  }
  async function onPointerUp() {
    if (!start.current || !drag) { start.current = null; return }
    start.current = null
    const { x, y } = drag
    setDrag(null)
    onMoved?.(photo.id, x, y)
    await supabase.from('apropos_photos').update({ offset_x: x, offset_y: y }).eq('id', photo.id)
  }

  return (
    <div className="flex justify-center">
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`relative overflow-visible select-none ${canDrag ? 'cursor-move' : ''}`}
        style={{
          transform:  `translate(${offsetX}px, ${offsetY}px)`,
          transition: drag ? 'none' : 'transform 0.2s ease-out',
        }}>
        <div
          className="relative overflow-hidden transition-all duration-300"
          style={{
            width:           `${photo.size}px`,
            height:          `${photo.size}px`,
            maxWidth:        '100%',
            borderRadius,
            border:          photo.show_cadre ? `${photo.cadre_width}px solid ${photo.cadre_color}` : 'none',
            backgroundColor: photo.show_fond ? photo.fond_color : 'transparent',
            outline:         photo.show_contour ? `3px solid ${photo.contour_color}` : 'none',
            outlineOffset:   photo.show_contour ? '3px' : undefined,
            boxShadow:       photo.show_cadre ? `4px 4px 0px 0px ${photo.cadre_color}` : undefined,
            transform:       `rotate(${photo.rotation}deg)`,
            opacity:         (!photo.is_visible && isAdmin) ? 0.45 : 1,
          }}>
          {photo.image_url
            ? <img
                src={photo.image_url}
                alt={photo.caption || ''}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            : <div className="w-full h-full flex items-center justify-center text-5xl bg-rose-50">📷</div>
          }
          {isAdmin && !photo.is_visible && (
            <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
              <span className="text-white text-[9px] font-black bg-red-500 px-1.5 py-0.5 rounded">MASQUÉ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
