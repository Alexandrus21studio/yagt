import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', '"Noto Sans"',
          "Helvetica", "Arial", "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"',
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo",
          "Consolas", '"Liberation Mono"', "monospace",
        ],
      },
    },
  },
  plugins: [require("daisyui"), require("@tailwindcss/typography")],
  daisyui: {
    themes: [
      {
        "gh-dark": {
          "color-scheme": "dark",
          "primary": "#2f81f4",
          "primary-content": "#ffffff",
          "secondary": "#238636",
          "secondary-content": "#ffffff",
          "accent": "#58a6ff",
          "accent-content": "#ffffff",
          "neutral": "#21262d",
          "neutral-content": "#e6edf3",
          "base-100": "#0d1117",
          "base-200": "#161b22",
          "base-300": "#21262d",
          "base-content": "#e6edf3",
          "info": "#388bfd",
          "info-content": "#ffffff",
          "success": "#238636",
          "success-content": "#ffffff",
          "warning": "#9e6a03",
          "warning-content": "#ffffff",
          "error": "#da3633",
          "error-content": "#ffffff",
          "--rounded-box": "0.375rem",
          "--rounded-btn": "0.375rem",
          "--rounded-badge": "2rem",
          "--btn-focus-scale": "1",
          "--border-btn": "1px",
          "--tab-border": "2px",
        },
      },
    ],
    darkTheme: "gh-dark",
  },
};

export default config;
