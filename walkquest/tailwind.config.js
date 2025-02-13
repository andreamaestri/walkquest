/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.{html,js}",
    "./static/**/*.{js,vue}",
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'bounce-spring': 'bounce-spring 2s var(--spring-regular) infinite',
        'pulse-scale': 'pulse-scale 2s var(--spring-light) infinite',
        'rotate-spring': 'rotate-spring 1s var(--spring-heavy)',
        'slide-up': 'slide-up 0.5s var(--spring-regular)',
        'morph': 'morph 8s ease-in-out infinite',
        'wiggle': 'wiggle 1s var(--spring-light) infinite',
        'scale': 'scale 0.3s var(--spring-regular)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bounce-spring': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'rotate-spring': {
          '0%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(180deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        morph: {
          '0%, 100%': { 
            'border-radius': '60% 40% 30% 70%/60% 30% 70% 40%',
            'background-position': '0% 50%'
          },
          '50%': { 
            'border-radius': '30% 60% 70% 40%/50% 60% 30% 60%',
            'background-position': '100% 50%'
          },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        scale: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-morphing': 'linear-gradient(45deg, var(--tw-gradient-stops))',
      },
      transitionTimingFunction: {
        'spring-light': 'var(--spring-light)',
        'spring-regular': 'var(--spring-regular)',
        'spring-heavy': 'var(--spring-heavy)',
      },
      transitionDuration: {
        'quick': 'var(--duration-quick)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
      },
    },
  },
  plugins: [],
}