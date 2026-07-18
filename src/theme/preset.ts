import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

export const tighteningPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fef9e7', 100: '#fef0c7', 200: '#fde68a',
      300: '#fcd34d', 400: '#fbbf24',
      500: '#deb010', 600: '#c89a00',
      700: '#a88000', 800: '#886600', 900: '#684c00', 950: '#483200',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{zinc.50}',
          100: '{zinc.100}',
          200: '{zinc.200}',
          300: '{zinc.300}',
          400: '{zinc.400}',
          500: '{zinc.500}',
          600: '{zinc.600}',
          700: '{zinc.700}',
          800: '{zinc.800}',
          900: '{zinc.900}',
          950: '{zinc.950}',
        },
      },
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
