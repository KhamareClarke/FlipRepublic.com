import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#D4AF37",
          light: "#F4E4B0",
          dark: "#B8941F",
          50: "#FFF9E6",
          100: "#FFF3CC",
          200: "#FFE799",
          300: "#FFDB66",
          400: "#FFCF33",
          500: "#D4AF37",
          600: "#B8941F",
          700: "#8A6F17",
          800: "#5C4A0F",
          900: "#2E2508",
        },
        black: {
          DEFAULT: "#000000",
          soft: "#0A0A0A",
          lighter: "#1A1A1A",
        },
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #B8941F 0%, #D4AF37 100%)',
        'gradient-gold-radial': 'radial-gradient(circle, #D4AF37 0%, #B8941F 100%)',
        'gradient-dark': 'linear-gradient(180deg, #000000 0%, #0A0A0A 100%)',
        'gradient-luxury': 'linear-gradient(135deg, #B8941F 0%, #D4AF37 50%, #B8941F 100%)',
      },
      letterSpacing: {
        'luxury': '0.05em',
        'wider-luxury': '0.1em',
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.8s ease-out",
        "fade-in-up": "fadeInUp 0.8s ease-out",
        "scale-in": "scaleIn 0.5s ease-out",
        "shimmer": "shimmer 2.5s infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeInUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.3)" },
          "100%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
