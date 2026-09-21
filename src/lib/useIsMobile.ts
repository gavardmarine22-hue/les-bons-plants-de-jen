import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

// Vrai sous le breakpoint `md` de Tailwind (768px). La valeur initiale est lue
// synchroniquement pour éviter un premier rendu « desktop » sur mobile.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
