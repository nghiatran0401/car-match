# Vroom - Smart Dealership Platform

## Overview
A modern, AI-powered vehicle recommendation and dealership platform built with React, TypeScript, and TailwindCSS. This application provides smart vehicle matching, comparison tools, AI concierge chat, and seamless dealer connectivity.

## Features

### Core Functionality
- **Smart Recommendations**: AI-driven vehicle matching based on user preferences, lifestyle, and budget
- **Comparison Matrix**: Side-by-side vehicle specification comparison
- **AI Concierge Chat**: Conversational interface for vehicle inquiries and financing questions
- **Vehicle Specifications**: Detailed model pages with comprehensive specs
- **Finance Calculator**: Payment estimation tools
- **Quote System**: Lead generation and dealer connection
- **User Dashboard**: Account management and saved preferences

### Technical Highlights
- Built with React 18+ and TypeScript
- Styled with TailwindCSS and custom design system
- Responsive design (mobile-first)
- Client-side routing with React Router
- State management with React Context
- Glassmorphism UI effects
- Custom brand colors (amber/gold accents)

## Project Structure

```
/workspace
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # React Context providers (ProfileContext)
│   ├── data/           # Vehicle data and constants
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   │   ├── HomePage.tsx
│   │   ├── RecommendationsPage.tsx
│   │   ├── ConciergePage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── QuotePage.tsx
│   │   └── SpecificationsPage.tsx
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles and Tailwind config
├── public/             # Static assets
├── dist/               # Production build output
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # TailwindCSS configuration
├── vite.config.ts      # Vite build configuration
└── tsconfig.json       # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technology Stack

- **Frontend Framework**: React 18.3.1
- **Language**: TypeScript 5.5.4
- **Build Tool**: Vite 5.4.0
- **Styling**: TailwindCSS 3.4.7
- **Routing**: React Router DOM 6.26.0
- **Icons**: Lucide React 0.424.0
- **Utilities**: clsx, tailwind-merge

## Design System

### Brand Colors
- **Brand Highlight**: Amber/Gold (#ffb71a primary)
- **Brand Secondary**: Slate/Gray scale
- Custom color palette defined in Tailwind config

### Typography
- Font Family: Plus Jakarta Sans
- Weights: 300-800
- Google Fonts integration

### UI Components
- Glassmorphism effects (glass, glass-dark utilities)
- Rounded corners (2xl, 3xl, custom radii)
- Gradient backgrounds
- Shadow effects
- Smooth transitions and animations

## Current Implementation Status

### ✅ Completed
- [x] Project setup and configuration
- [x] Routing structure (6 pages)
- [x] Home page with hero section and features
- [x] Recommendations page with filtering logic
- [x] AI Concierge chat interface
- [x] Vehicle specifications page
- [x] Quote request form
- [x] Dashboard placeholder
- [x] Profile context with localStorage persistence
- [x] Vehicle data models (9 vehicles)
- [x] Responsive design
- [x] Production build successful

### 🔄 Ready for Enhancement
- [ ] Additional reusable components (buttons, cards, inputs)
- [ ] Finance calculator implementation
- [ ] Authentication system
- [ ] Backend API integration
- [ ] Database connection
- [ ] Real AI integration (Vercel AI SDK)
- [ ] Test suite
- [ ] Performance optimizations

## Deployment

The application is configured for deployment on Vercel:
- Production build available in `/dist`
- Static file hosting ready
- Client-side routing configured

## Next Steps for MVP

1. **Component Library**: Build out shadcn/ui-style component library
2. **Enhanced Forms**: Add validation to quote and contact forms
3. **Finance Calculator**: Implement payment calculation logic
4. **Image Assets**: Add official vehicle images
5. **Animations**: Add Framer Motion for smooth transitions
6. **SEO**: Add meta tags and Open Graph data
7. **Analytics**: Integrate analytics tracking
8. **Testing**: Add unit and E2E tests

## License
Private - All rights reserved