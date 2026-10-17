/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#F7F4EE',
        cream: '#EEE9DF',
        white: '#FFFFFF',
        ink: '#25231F',
        muted: '#777168',
        clay: '#B86F52',
        olive: '#7C8065',
        panel: '#FFFFFF',
        surface: '#F0EBE3',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        floatA: {
          '0%,100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-2deg)' },
        },
        floatB: {
          '0%,100%': { transform: 'translateY(0px) rotate(2deg)' },
          '50%': { transform: 'translateY(-14px) rotate(2deg)' },
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        breathe: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.025)' },
        },
        waveBar: {
          '0%,100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease-out both',
        'fade-in': 'fadeIn 0.6s ease-out both',
        'float-a': 'floatA 6s ease-in-out infinite',
        'float-b': 'floatB 8s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        wave1: 'waveBar 0.8s ease-in-out infinite 0s',
        wave2: 'waveBar 0.8s ease-in-out infinite 0.15s',
        wave3: 'waveBar 0.8s ease-in-out infinite 0.3s',
        wave4: 'waveBar 0.8s ease-in-out infinite 0.45s',
        wave5: 'waveBar 0.8s ease-in-out infinite 0.6s',
      },
    },
  },
  plugins: [],
};
