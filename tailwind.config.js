export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        // 基础色板 — 深炭灰背景系
        base: {
          DEFAULT: '#0D1117',
          50: '#F1F5F9',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#161E2E',
          900: '#0D1117',
        },
        // 导航 — 靛蓝
        nav: { DEFAULT: '#6366F1', light: '#818CF8', dark: '#4F46E5' },
        // 主操作 — 电蓝
        action: { DEFAULT: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
        // 成功/良性 — 翠绿
        pos: { DEFAULT: '#10B981', light: '#34D399', dark: '#059669' },
        // 警告/VUS — 琥珀
        warn: { DEFAULT: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
        // 危险/致病 — 玫瑰红
        neg: { DEFAULT: '#F43F5E', light: '#FB7185', dark: '#E11D48' },
        // 信息/数据 — 青色
        info: { DEFAULT: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
        // 次要 — 紫罗兰
        sec: { DEFAULT: '#8B5CF6', light: '#A78BFA', dark: '#7C3AED' },
        // 高亮 — 粉色
        hi: { DEFAULT: '#EC4899', light: '#F472B6', dark: '#DB2777' },
        // ACMG 五级分类色彩 — 从红到蓝渐变
        acmg: {
          pathogenic: '#F43F5E',
          likelyPathogenic: '#F97316',
          vus: '#F59E0B',
          likelyBenign: '#10B981',
          benign: '#3B82F6',
        },
        // 兼容旧代码的过渡映射
        navy: {
          DEFAULT: '#0D1117', 50: '#F1F5F9', 100: '#E2E8F0', 200: '#CBD5E1',
          300: '#94A3B8', 400: '#64748B', 500: '#475569', 600: '#334155',
          700: '#1E293B', 800: '#161E2E', 900: '#0D1117',
        },
        cyan: {
          DEFAULT: '#06B6D4', 50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC',
          300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2',
          700: '#0E7490', 800: '#155E75', 900: '#164E63',
        },
        helix: {
          DEFAULT: '#10B981', 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0',
          300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669',
          700: '#047857', 800: '#065F46', 900: '#064E3B',
        },
        ink: {
          DEFAULT: '#0D1117', 50: '#F1F5F9', 100: '#E2E8F0', 200: '#CBD5E1',
          300: '#94A3B8', 400: '#64748B', 500: '#475569', 600: '#334155',
          700: '#1E293B', 800: '#161E2E', 900: '#0D1117',
        },
        coral: {
          DEFAULT: '#F43F5E', 50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3',
          300: '#FDA4AF', 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48',
          700: '#BE123C', 800: '#9F1239', 900: '#881337',
        },
        amber2: {
          DEFAULT: '#F59E0B', 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A',
          300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706',
          700: '#B45309', 800: '#92400E', 900: '#78350F',
        },
        slate: { bg: '#0D1117' },
      },
      fontFamily: {
        // Manrope — 类苹果风格无衬线，用于标题
        display: ['Manrope', 'system-ui', 'sans-serif'],
        // Outfit — 现代几何无衬线，用于正文
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        // JetBrains Mono — 等宽字体，用于代码和基因数据
        mono: ['"JetBrains Mono"', 'monospace'],
        // 兼容旧代码
        serif: ['Manrope', 'system-ui', 'sans-serif'],
      },
      // 动画关键帧
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(5deg)' },
        },
        'drift': {
          '0%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(10px, -15px)' },
          '50%': { transform: 'translate(-5px, -25px)' },
          '75%': { transform: 'translate(-15px, -10px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        'drift': 'drift 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
