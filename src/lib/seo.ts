import { useEffect } from 'react'

// Met à jour le <title> et la meta description de la page courante.
// Pas de librairie externe : sur une SPA à une seule route active à la fois,
// modifier directement le DOM suffit (Google exécute le JS au crawl).
export function useSEO(title: string, description?: string) {
  useEffect(() => {
    document.title = title

    if (description) {
      let tag = document.querySelector('meta[name="description"]')
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', 'description')
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', description)
    }

    let ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', title)
    if (description) {
      let ogDesc = document.querySelector('meta[property="og:description"]')
      if (ogDesc) ogDesc.setAttribute('content', description)
    }
  }, [title, description])
}
