import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

export const tighteningPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fef9e7', 100: '#fef0c7', 200: '#fde68a',
      300: '#fcd34d', 400: '#fbbf24',
      500: '#c49700', 600: '#a87e00',
      700: '#8b6500', 800: '#6d4f00', 900: '#543b00', 950: '#3d2a00',
    },
    colorScheme: {
      dark: {
        primary: {
          50: '#3d2a00', 100: '#543b00', 200: '#6d4f00',
          300: '#8b6500', 400: '#a87e00',
          500: '#e8b830', 600: '#f0c840',
          700: '#f4d060', 800: '#f8e08a', 900: '#fcefb5', 950: '#fef9e7',
        },
      },
    },
  },
})
