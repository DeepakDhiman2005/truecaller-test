/** @type {import('tailwindcss').Config} */
module.exports = {
    animation: {
        'fadeIn': 'fadeIn 0.6s ease-out',
        'popup': 'popup 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'slideUp': 'slideUp 0.6s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'delay-100': 'slideUp 0.6s ease-out 0.1s both',
        'delay-200': 'slideUp 0.6s ease-out 0.2s both',
        'delay-300': 'slideUp 0.6s ease-out 0.3s both',
        'delay-400': 'slideUp 0.6s ease-out 0.4s both',
    },
    keyframes: {
        fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
        },
        popup: {
            '0%': { opacity: '0', transform: 'scale(0.7) translateY(30px)' },
            '50%': { opacity: '0.8', transform: 'scale(1.02)' },
            '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pulse-slow': {
            '0%, 100%': { opacity: '1' },
            '50%': { opacity: '0.8' },
        },
        'bounce-slow': {
            '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
            '40%': { transform: 'translateY(-10px)' },
            '60%': { transform: 'translateY(-5px)' },
        },
        slideUp: {
            '0%': { opacity: '0', transform: 'translateY(20px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
        },
    },
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
        './contexts/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        screens: {
            'xs': '375px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
        },
        extend: {
            fontFamily: {
                sora: ['var(--font-sora)', 'sans-serif'],
                inter: ['var(--font-inter)', 'sans-serif'],
            },
        },
    },
    plugins: [],
}