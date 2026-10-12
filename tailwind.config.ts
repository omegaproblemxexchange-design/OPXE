import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#08111f',
        panel: '#0f1c2e',
        cyanish: '#4dd7ff',
        electric: '#2e7bf6',
      },
      boxShadow: {
        glow: '0 0 30px rgba(77, 215, 255, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
