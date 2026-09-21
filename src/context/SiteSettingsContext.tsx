import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface SiteSettings {
  logoUrl: string
}

const DEFAULT: SiteSettings = { logoUrl: '/images/logo.jpg' }
const LOGO_CACHE_KEY = 'site_logo_cache'

// Dernier logo connu : évite d'afficher le logo par défaut le temps de la réponse Supabase
function loadCachedLogo(): SiteSettings {
  try {
    const cached = localStorage.getItem(LOGO_CACHE_KEY)
    if (cached) return { logoUrl: cached }
  } catch { /* localStorage indisponible */ }
  return DEFAULT
}

function saveCachedLogo(url: string) {
  try { localStorage.setItem(LOGO_CACHE_KEY, url) } catch { /* ignore */ }
}

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(loadCachedLogo)

  useEffect(() => {
    // Chargement initial
    supabase.from('settings').select('key, value').eq('key', 'site_logo_url')
      .then(({ data }) => {
        if (data?.[0]?.value) {
          setSettings({ logoUrl: data[0].value })
          saveCachedLogo(data[0].value)
        }
      })

    // Mise à jour en temps réel
    const channel = supabase
      .channel('realtime-logo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.site_logo_url' },
        payload => {
          const newVal = (payload.new as { value?: string })?.value
          if (newVal) {
            setSettings({ logoUrl: newVal })
            saveCachedLogo(newVal)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
