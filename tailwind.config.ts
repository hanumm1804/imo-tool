import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'fsl-orange':      'var(--fsl-orange)',
        'fsl-dark-blue':   'var(--fsl-dark-blue)',
        'fsl-mid-blue':    'var(--fsl-mid-blue)',
        'fsl-bright-blue': 'var(--fsl-bright-blue)',
        'fsl-light-blue':  'var(--fsl-light-blue)',
        'fsl-gray':        'var(--fsl-gray)',
        'status-green':    'var(--status-green)',
        'status-red':      'var(--status-red)',
        'status-amber':    'var(--status-amber)',
        'status-gray':     'var(--status-gray)',
      },
      fontFamily: {
        sans: [
          'Franklin Gothic Medium',
          'Franklin Gothic',
          'ITC Franklin Gothic',
        ],
      },
      backgroundImage: {
        'fsl-gradient': 'linear-gradient(135deg, #1E2247 0%, #113190 60%, #2844C4 100%)',
      },
    },
  },
  plugins: [typography],
}

export default config
