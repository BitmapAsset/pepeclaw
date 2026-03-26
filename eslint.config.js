import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Three.js 3D components use Math.random() in useMemo/useRef for one-time particle init
    files: ['src/rooms/GenomeLab.tsx', 'src/rooms/DreamChamber.tsx', 'src/rooms/WarRoom.tsx'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },
])
