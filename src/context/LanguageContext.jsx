import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations } from '../i18n'

function resolveTranslation(currentDict, fallbackDict, path, fallback = '') {
  if (!path) return fallback
  const keys = path.split('.')

  let result = currentDict
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key]
    } else {
      result = undefined
      break
    }
  }

  if (result !== undefined) return result

  if (fallbackDict && fallbackDict !== currentDict) {
    let fallbackResult = fallbackDict
    for (const key of keys) {
      if (fallbackResult && typeof fallbackResult === 'object' && key in fallbackResult) {
        fallbackResult = fallbackResult[key]
      } else {
        fallbackResult = undefined
        break
      }
    }
    if (fallbackResult !== undefined) return fallbackResult
  }

  return fallback !== undefined ? fallback : path
}

const defaultT = (path, fallback = '') => resolveTranslation(translations.en, translations.en, path, fallback)

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: defaultT,
  translations: translations.en,
})

const STORAGE_KEY = 'xxenta_lang'

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'nl' || stored === 'en') return stored
      } catch (e) {
        // localStorage unavailable
      }
    }
    return 'en'
  })

  const setLanguage = useCallback((lang) => {
    if (lang !== 'en' && lang !== 'nl') return
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang)
      } catch (e) {}
      document.documentElement.lang = lang
    }
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'nl' : 'en'
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch (e) {}
        document.documentElement.lang = next
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  const t = useCallback(
    (path, fallback = '') => {
      const currentDict = translations[language] || translations.en
      const fallbackDict = translations.en
      return resolveTranslation(currentDict, fallbackDict, path, fallback)
    },
    [language],
  )

  const currentTranslations = translations[language] || translations.en

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        translations: currentTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default LanguageContext
