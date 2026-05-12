/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',
        surface: {
          DEFAULT: '#ffffff',
          strong: '#ffffff',
          ui: '#f2f4f0',
          tint: '#f7f9f6',
          warm: '#f9f9f6',
        },
        ink: '#1b2317',
        muted: '#596853',
        soft: '#8a9984',
        line: '#e9e3cc',
        green: {
          DEFAULT: '#2a8751',
          soft: '#e4f2eb',
          dark: '#1a5e35',
        },
        coral: {
          DEFAULT: '#f5614a',
          soft: '#fef0ec',
          dark: '#c84030',
        },
        primary: {
          DEFAULT: '#12b76a',
          dark: '#0d8050',
          soft: '#ecfdf5',
        },
        accent: {
          DEFAULT: '#f5b30f',
          dark: '#a87600',
          soft: '#fff5cc',
        },
        purple: {
          DEFAULT: '#7c5cff',
          soft: '#f1edff',
        },
        disabled: '#c4ccd6',
        'danger-dark': '#96442f',
        'overlay-ink': '#3c3f45',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['24px', { lineHeight: '1.4' }],
        title: ['20px', { lineHeight: '1.4' }],
        body: ['16px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.5' }],
        '11': '11px',
        '13': '13px',
        '17': '17px',
        '22': '22px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '32px',
      },
      borderRadius: {
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '28px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(25,31,40,0.08)',
        sheet: '0 24px 72px rgba(25,31,40,0.22)',
        float: '0 8px 24px rgba(25,31,40,0.06)',
        nav: '0 8px 24px rgba(25,31,40,0.08)',
        primary: '0 12px 28px rgba(18,183,106,0.28)',
      },
      minHeight: {
        tap: '44px',
      },
    },
  },
  plugins: [],
};
