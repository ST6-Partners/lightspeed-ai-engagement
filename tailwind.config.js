/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Lightspeed Systems official brand palette (DD-003 v2 — aligned to brand guidelines 2026-07-21)
        // Lightspeed Blue #00AFD7 · Medium Blue #00629B · Dark Blue #041E42 · Gray #4F6068 · Relay Green #84BD00 · Orange #F89E3D
        ls: {
          blue: '#00AFD7',          // Lightspeed Blue — primary accent, active, gradients, headers
          'blue-deep': '#00629B',   // Medium Blue — solid controls needing white text (accessible)
          'blue-deeper': '#004E7C', // darker step for hover / pressed
          'blue-50': '#E6F7FB',     // Lightspeed Blue tint
          ink: '#041E42',           // Dark Blue — primary text / headings
          'ink-2': '#4F6068',       // brand Gray — secondary text
          'ink-3': '#8A969E',       // muted (derived from brand Gray)
          line: '#E3E8EB',
          surface: '#FFFFFF',
          bg: '#F4FAFC',            // faint cyan-tinted app background
          'bg-2': '#E9F3F6',
          slate: '#041E42',         // dark sidebar — brand Dark Blue
          // muted "signal, not alarm" semantics — nodded to brand Relay Green / Orange, contrast-tuned
          thrive: '#5F8C1A',        // from Relay Green #84BD00, darkened for AA text
          'thrive-bg': '#EFF6DE',
          watch: '#C77A15',         // from brand Orange #F89E3D, darkened for AA text
          'watch-bg': '#FCEFDD',
          risk: '#C2615A',
          'risk-bg': '#F8EAE8',
        },
      },
      borderRadius: { ls: '12px' },
      boxShadow: {
        ls: '0 1px 2px rgba(4,30,66,.06), 0 1px 3px rgba(4,30,66,.05)',
        'ls-2': '0 4px 12px rgba(4,30,66,.07), 0 2px 4px rgba(4,30,66,.04)',
      },
      backgroundImage: { 'ls-active': 'linear-gradient(92deg, #00629B, #00AFD7)' },
    },
  },
  plugins: [],
};
