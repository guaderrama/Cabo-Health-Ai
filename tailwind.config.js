/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				// Paleta de cabohealth.org. Blanco sobre primary pasa WCAG AA con holgura (9.2:1).
				primary: {
					DEFAULT: '#0A4D68',
					hover: '#082A3C',
					soft: '#E8F4F8',
					border: '#B9D3DC',
					foreground: '#FFFFFF',
				},
				brand: {
					deep: '#0A4D68', // azul petróleo (botones, enlaces)
					navy: '#082A3C', // inicio del degradado del logotipo
					sea: '#4F7785', // texto secundario de marca (4.7:1 sobre crema)
					mist: '#88B0BC', // brumas y partículas
					bronze: '#B8956A', // acento decorativo; no usar para texto
					cream: '#FAFAF7', // fondo de la app
					ice: '#F0F7FA', // fondo superior del hero
				},
				secondary: {
					DEFAULT: '#155E75',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				accent: {
					DEFAULT: '#D97706',
					foreground: 'hsl(var(--accent-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			fontFamily: {
				// Títulos con la serif de la marca; el texto corrido queda en la sans del sistema
				display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				breathing: {
					'0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
					'50%': { transform: 'scale(1.05)', opacity: '1' },
				},
				glow: {
					'0%, 100%': { opacity: '0.5', filter: 'brightness(1)' },
					'50%': { opacity: '1', filter: 'brightness(1.2)' },
				},
				ripple: {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(2)', opacity: '0' },
				},
				'wave-1': {
					'0%, 100%': { transform: 'translateY(0) rotate(0deg) scale(1)' },
					'33%': { transform: 'translateY(-10px) rotate(120deg) scale(1.05)' },
					'66%': { transform: 'translateY(10px) rotate(240deg) scale(0.95)' },
				},
				'wave-2': {
					'0%, 100%': { transform: 'translateY(0) rotate(180deg) scale(1)' },
					'33%': { transform: 'translateY(10px) rotate(300deg) scale(0.95)' },
					'66%': { transform: 'translateY(-10px) rotate(60deg) scale(1.05)' },
				},
				'wave-3': {
					'0%, 100%': { transform: 'translateY(0) rotate(90deg) scale(1)' },
					'33%': { transform: 'translateY(-15px) rotate(210deg) scale(1.08)' },
					'66%': { transform: 'translateY(15px) rotate(330deg) scale(0.92)' },
				},
				'pulse-glow': {
					'0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
					'50%': { opacity: '0.6', transform: 'scale(1.1)' },
				},
				'orb-drift': {
					'0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
					'33%': { transform: 'translate3d(4%, -3%, 0) scale(1.06)' },
					'66%': { transform: 'translate3d(-3%, 3%, 0) scale(0.96)' },
				},
				'rule-in': {
					from: { transform: 'scaleX(0)', opacity: '0' },
					to: { transform: 'scaleX(1)', opacity: '1' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				breathing: 'breathing 4s ease-in-out infinite',
				glow: 'glow 2s ease-in-out infinite',
				ripple: 'ripple 3s ease-out infinite',
				'wave-1': 'wave-1 8s ease-in-out infinite',
				'wave-2': 'wave-2 10s ease-in-out infinite',
				'wave-3': 'wave-3 12s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
				'orb-drift-a': 'orb-drift 26s ease-in-out infinite',
				'orb-drift-b': 'orb-drift 32s ease-in-out infinite reverse',
				'orb-drift-c': 'orb-drift 22s ease-in-out infinite',
				'rule-in': 'rule-in 0.9s ease-out both',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}