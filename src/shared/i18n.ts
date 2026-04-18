export const SUPPORTED_APP_LOCALES = ['en', 'fr'] as const

export type AppLocale = typeof SUPPORTED_APP_LOCALES[number]

export function normalizeAppLocale(locale: string | null | undefined): AppLocale {
  if (!locale) return 'en'

  const normalized = locale.toLowerCase()
  const exactMatch = SUPPORTED_APP_LOCALES.find((entry) => entry === normalized)
  if (exactMatch) return exactMatch

  const languageMatch = SUPPORTED_APP_LOCALES.find((entry) => normalized.startsWith(`${entry}-`))
  return languageMatch ?? 'en'
}
