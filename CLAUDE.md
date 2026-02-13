# CLAUDE.md - Cabo Health Nova

## Project Overview
Medical health interview application using AI for patient consultations.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API (GPT-4)
- **Audio**: Web Audio API + Whisper
- **Deployment**: Vercel

## Architecture
- Single-page application (SPA)
- Real-time voice interview with AI
- SOAP note generation from transcripts
- Multi-language support (English/Spanish)

---

## 🎨 Frontend Aesthetics & UI/UX Guidelines

### Design Philosophy: Evita "AI Slop Aesthetic"

**PROHIBIDO (Generic AI Look):**
- ❌ Inter/Roboto fonts everywhere
- ❌ Purple/blue gradients by default
- ❌ Rounded corners on everything (border-radius: 12px)
- ❌ Glass morphism effects without purpose
- ❌ Generic hero sections with stock illustrations
- ❌ Particle.js backgrounds
- ❌ Excessive drop shadows and glows
- ❌ Cookie-cutter dashboard layouts

**REQUERIDO (Professional Design):**
- ✅ Typography system with personality (Geist, Inter Display, custom fonts)
- ✅ Purposeful color palettes (brand-aligned, accessibility-first)
- ✅ Intentional spacing system (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- ✅ Micro-interactions and purposeful animations
- ✅ Context-aware component variants
- ✅ Data visualization with clear hierarchy
- ✅ Responsive design with mobile-first approach
- ✅ Dark mode that's actually designed (not just inverted colors)

### UI Component Hierarchy

**shadcn/ui Integration**
- Use shadcn MCP para instalación automática de componentes
- Customize components siguiendo design system
- Mantén components en `src/shared/components/ui/`

**Component Categories:**

Primitive components (shadcn base) → src/shared/components/ui/
Composed components (custom) → src/shared/components/
Feature-specific components → src/features/[feature]/components/

### Design System Tokens

**Colors (Semantic Naming)**
- Usar nombres semánticos: primary, success, warning, error, neutral
- NO usar nombres de color: blue500, purple400, etc.

**Typography Scale**
- Usar tokens de design system: text-display-lg, font-display
- NO usar valores arbitrarios: text-4xl font-bold

### Animation Guidelines

**Purposeful Motion**
- transition-base: 150ms ease-in-out
- transition-slow: 300ms ease-in-out
- transition-slower: 500ms ease-in-out
- NO usar duraciones arbitrarias (duration-500)

### Accessibility Requirements

**Always Include:**
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators (visible focus rings)
- ✅ Color contrast ratio ≥ 4.5:1 (WCAG AA)
- ✅ Alt text on images
- ✅ Semantic HTML (header, nav, main, footer, article, section)

### Dashboard Design Patterns

**Layout Patterns:**
- Grid-based layouts (CSS Grid preferred over flexbox for complex layouts)
- Sticky headers and sidebars
- Progressive disclosure (show details on demand)
- Empty states with clear CTAs
- Loading states with skeleton screens

### UI/UX Skill Integration

**Available via ui-ux-pro-max-skill:**
- 67 UI component styles
- 10 complete dashboard templates
- 96 professional color palettes
- 25 chart and visualization types
- 100+ design reasoning rules

### Visual QA Checklist

Antes de considerar UI completo, verificar:
- [ ] Spacing consistente (no valores arbitrarios)
- [ ] Typography scale aplicado correctamente
- [ ] Color palette semántico (no hardcoded hex)
- [ ] Responsive breakpoints tested (mobile, tablet, desktop)
- [ ] Dark mode funciona correctamente
- [ ] Animations son purposeful (no distracting)
- [ ] Accessibility: keyboard nav + ARIA labels
- [ ] Loading states y error states implementados
- [ ] No generic AI aesthetic (fonts, gradients, borders)

### Playwright MCP Integration for Visual Testing

**Viewport Testing:**
- Mobile: 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px
