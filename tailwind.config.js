/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          400: '#94A3B8',
        },
        line: '#E5E8EC',
        paper: '#FFFFFF',
        canvas: '#F6F7F9',
        brand: {
          DEFAULT: '#1D4ED8',
          dark: '#1E40AF',
          soft: '#EFF4FE',
        },
        // 파이프라인 단계 시퀀스 (기회인지→개통완료)
        stage: {
          1: '#C5DBF6',
          2: '#93B8EC',
          3: '#5C93DE',
          4: '#2E6FCC',
          5: '#14479A',
        },
        won: '#0E9F6E',
        lost: '#E02424',
        stale: '#C27803',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
}
