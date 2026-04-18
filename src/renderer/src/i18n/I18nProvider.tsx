import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AppLocale } from '../../../shared/i18n'
import { enMessages, type MessageKey } from './messages/en'
import { frMessages } from './messages/fr'

type MessageDictionary = Record<MessageKey, string>
type MessageParams = Record<string, string | number>

interface I18nContextValue {
  locale: AppLocale
  localePreference: AppLocale | null
  systemLocale: AppLocale
  ready: boolean
  t: (key: MessageKey, params?: MessageParams) => string
  formatNumber: (value: number) => string
  setLocalePreference: (locale: AppLocale | null) => Promise<void>
}

const dictionaries: Record<AppLocale, MessageDictionary> = {
  en: enMessages,
  fr: frMessages
}

const I18nContext = createContext<I18nContextValue | null>(null)

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

export function I18nProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [systemLocale, setSystemLocale] = useState<AppLocale>('en')
  const [localePreference, setLocalePreferenceState] = useState<AppLocale | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      window.api.app.getSystemLocale(),
      window.api.settings.getValue('locale')
    ]).then(([nextSystemLocale, nextLocalePreference]) => {
      if (cancelled) return
      setSystemLocale(nextSystemLocale)
      setLocalePreferenceState(nextLocalePreference ?? null)
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const locale = localePreference ?? systemLocale
  const dictionary = dictionaries[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = dictionary['app.title']
  }, [dictionary, locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    systemLocale,
    ready,
    t: (key, params) => interpolate(dictionary[key] ?? enMessages[key], params),
    formatNumber: (input) => new Intl.NumberFormat(locale).format(input),
    setLocalePreference: async (nextLocalePreference) => {
      setLocalePreferenceState(nextLocalePreference)
      await window.api.settings.set('locale', nextLocalePreference)
    }
  }), [dictionary, locale, localePreference, ready, systemLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
