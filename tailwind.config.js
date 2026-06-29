/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Lightspeed Systems brand (DD-003) — cyan + slate
        ls: {
          blue: '#4FA9D6',          // Lightspeed Blue — accents, active, gradients, headers
          'blue-deep': '#2E89B8',   // solid controls needing white text (accessible)
          'blue-deeper': '#246F97',
          'blue-50': '#EAF4FA',     // tint
          ink: '#2E3942',
          'ink-2': '#51606A',
          'ink-3': '#8A969E',
          line: '#E3E8EB',
          surface: '#FFFFFF',
          bg: '#F6F9FA',
          'bg-2': '#EEF3F5',
          slate: '#28323A',         // dark sidebar
          // muted "signal, not alarm" semantics
          thrive: '#2E9E7B',
          'thrive-bg': '#E6F4EF',
          watch: '#C99300',
          'watch-bg': '#FBF2DC',
          risk: '#C2615A',
          'risk-bg': '#F8EAE8',
        },
      },
      borderRadius: { ls: '12px' },
      boxShadow: {
        ls: '0 1px 2px rgba(40,50,58,.06), 0 1px 3px rgba(40,50,58,.05)',
        'ls-2': '0 4px 12px rgba(40,50,58,.07), 0 2px 4px rgba(40,50,58,.04)',
      },
      backgroundImage: { 'ls-active': 'linear-gradient(92deg, #2E89B8, #4FA9D6)' },
    },
  },
  plugins: [],
};
