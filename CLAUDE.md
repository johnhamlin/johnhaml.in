# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for John Hamlin built with Astro, React islands, TypeScript, and Tailwind CSS. Deployed to Cloudflare Pages at johnhamlin.com.

## Commands

```bash
npm run dev      # Start development server at localhost:4321
npm run build    # Production build (outputs to /dist)
npm run preview  # Preview production build locally
```

## Architecture

**Tech Stack:** Astro 5, React 18, TypeScript (strict), Tailwind CSS, Framer Motion, MDX

**Key Directories:**
- `/src/pages` - Astro pages (index.astro)
- `/src/layouts` - Astro layout components (Layout.astro)
- `/src/components/astro` - Static Astro components (Footer, SectionHeading)
- `/src/components/react` - React island components with `client:*` directives
- `/src/content/text` - MDX content (intro.mdx, about.mdx)
- `/src/data` - Static data files (projects.ts, experience.ts, skills.ts, links.ts)
- `/src/scripts` - Vanilla JS state modules (theme.ts, active-section.ts)
- `/src/hooks` - React hooks (useSectionInView, useTheme)
- `/src/styles` - Global CSS (globals.css, safe-area.css)

**State Management:**
- Theme state: Vanilla JS pub/sub in `/src/scripts/theme.ts` with localStorage persistence
- Active section: Vanilla JS pub/sub in `/src/scripts/active-section.ts`
- React hooks subscribe to these modules for reactivity

**React Islands:**
- Components use `client:load` or `client:visible` directives
- Framer Motion animations preserved as React islands
- react-vertical-timeline-component for Experience section

## Environment Variables

Optional:
- `PUBLIC_GA_ID` - Google Analytics tracking ID

## TypeScript

Uses path alias `@/*` for imports from `/src`. Run `npx tsc --noEmit` to check types.

## Deployment

Static build outputs to `/dist`. Deploy to Cloudflare Pages:
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+
