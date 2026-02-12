/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hubble brand colors (blue theme)
        hubble: {
          50: '#e8f7f9',
          100: '#bde8ec',
          200: '#98dce3',
          300: '#62cad3',
          400: '#3ebbc6',
          500: '#2b7184',
          600: '#0f4d64',
          700: '#0c3d50',
          800: '#092d3b',
          900: '#061d27',
          950: '#030f14',
        },
        // Meteor brand colors (green/gold theme)
        meteor: {
          50: '#e8f0ed',
          100: '#c5d9d0',
          200: '#9fc1b3',
          300: '#78a996',
          400: '#52917a',
          500: '#053826',
          600: '#042d1e',
          700: '#032217',
          800: '#021610',
          900: '#010b08',
          950: '#343436',
          accent: '#9B8D6F',
          text: '#7A7A7A',
        },
        // Shared dark background colors (using Hubble dark blue base)
        dark: {
          50: '#e8f7f9',
          100: '#bde8ec',
          200: '#98dce3',
          300: '#7A7A7A',
          400: '#5a6a70',
          500: '#3d4f56',
          600: '#2b3840',
          700: '#1a2428',
          800: '#0f1a1e',
          900: '#0a1214',
          950: '#050a0c',
        },
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
        display: ['AXIS', 'Lato', 'system-ui', 'sans-serif'],
        title: ['AXIS', 'Lato', 'system-ui', 'sans-serif'],
        body: ['Lato', 'system-ui', 'sans-serif'],
        light: ['Lato Light', 'Lato', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-hubble': 'linear-gradient(135deg, #0f4d64 0%, #2b7184 50%, #62cad3 100%)',
        'gradient-meteor': 'linear-gradient(135deg, #053826 0%, #343436 50%, #9B8D6F 100%)',
        'gradient-mixed': 'linear-gradient(135deg, #0f4d64 0%, #2b7184 25%, #053826 75%, #9B8D6F 100%)',
      },
    },
  },
  plugins: [],
}
