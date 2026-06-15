import { create } from 'zustand'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: string) => string
}

export const useI18n = create<I18nState>((set, get) => ({
  lang: (localStorage.getItem('lang') as Lang) || 'zh',
  setLang: (lang: Lang) => {
    localStorage.setItem('lang', lang)
    set({ lang })
  },
  toggleLang: () => {
    const newLang = get().lang === 'zh' ? 'en' : 'zh'
    localStorage.setItem('lang', newLang)
    set({ lang: newLang })
  },
  t: (key: string) => t(key, get().lang),
}))
