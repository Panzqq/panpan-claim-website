/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular']
      },
      boxShadow: {
        brutal: '7px 7px 0 #111827',
        brutalSm: '4px 4px 0 #111827',
        brutalHover: '3px 3px 0 #111827'
      },
      colors: {
        ink: '#111827',
        paper: '#fff7ed',
        neon: '#9dfc50',
        pinky: '#ff6bcb',
        skyx: '#7dd3fc'
      }
    }
  },
  plugins: []
};
