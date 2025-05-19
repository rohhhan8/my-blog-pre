/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      fontFamily: {
        'playfair': ['"Playfair Display"', 'serif'],
        'inter': ['Inter', 'sans-serif'],
        'opensans': ['"Open Sans"', 'sans-serif'],
        // Keep the default overrides too
        'serif': ['"Playfair Display"', 'serif'],
        'sans': ['Inter', '"Open Sans"', 'sans-serif'],
      },
      colors: {
        // Monochromatic black and white color scheme
        'blog-bg': '#FFFFFF', // Pure white for consistent background
        'blog-text': '#000000',
        'blog-accent': '#000000', // Pure black
        'blog-accent-hover': '#333333', // Dark gray
        'blog-card': '#FFFFFF',
        'blog-card-hover': '#F5F5F5',
        'blog-border': '#E0E0E0',
        // Keep the semantic names too
        'background': '#FFFFFF',
        'text': '#000000',
        'accent': '#000000',
      },
      boxShadow: {
        'blog-card-light': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'blog-card-light-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'blog-card-dark': '0 4px 10px -1px rgba(255, 255, 255, 0.05), 0 2px 6px -1px rgba(255, 255, 255, 0.03)',
        'blog-card-dark-hover': '0 10px 15px -3px rgba(255, 255, 255, 0.1), 0 4px 6px -2px rgba(255, 255, 255, 0.05)',
        'blog-button': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'blog-nav': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.700'),
            h1: {
              fontFamily: theme('fontFamily.playfair'),
            },
            h2: {
              fontFamily: theme('fontFamily.playfair'),
            },
            h3: {
              fontFamily: theme('fontFamily.playfair'),
            },
            h4: {
              fontFamily: theme('fontFamily.playfair'),
            },
            a: {
              color: theme('colors.blog-accent'),
              '&:hover': {
                color: theme('colors.blog-accent-hover'),
              },
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
  darkMode: 'class', // Enable dark mode with class strategy
}