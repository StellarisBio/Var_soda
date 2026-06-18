import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

/**
 * 应用主题到 documentElement
 */
function applyThemeClass(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useTheme = create<ThemeState>((set) => {
  // 从 localStorage 读取，或跟随系统偏好
  const saved = localStorage.getItem('theme') as Theme | null
  const initial: Theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  // 初始化时立即应用
  applyThemeClass(initial)

  /**
   * 切换主题并触发 View Transitions 动画
   * 支持时使用圆形扩散动画（从右上角切换按钮位置扩散）
   * 不支持时直接切换（带 CSS 过渡）
   */
  function switchTheme(next: Theme) {
    localStorage.setItem('theme', next)

    // 浏览器不支持 View Transitions API — 直接切换
    if (!document.startViewTransition) {
      applyThemeClass(next)
      return
    }

    // 计算圆形动画起点（右上角主题切换按钮位置）
    const x = window.innerWidth - 48
    const y = 56
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(() => {
      applyThemeClass(next)
    })

    transition.ready.then(() => {
      const root = document.documentElement
      // 两个方向都从右上角扩散到整个页面
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]

      root.animate(
        { clipPath },
        {
          duration: 450,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    }).catch(() => {
      // 动画失败时静默处理，主题已切换
    })
  }

  return {
    theme: initial,
    toggleTheme: () =>
      set((state) => {
        const next = state.theme === 'light' ? 'dark' : 'light'
        switchTheme(next)
        return { theme: next }
      }),
    setTheme: (theme: Theme) => {
      switchTheme(theme)
      set({ theme })
    },
  }
})
