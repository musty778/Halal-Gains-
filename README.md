# Halal Gains - Islamic Fitness Coaching Platform

A modern fitness coaching platform designed for Muslim coaches and clients, built with React, TypeScript, and Supabase.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Router DOM** - Client-side routing
- **Supabase** - Backend as a Service (database, auth, storage)
- **Chart.js + react-chartjs-2** - Data visualization

## Project Structure

```
src/
├── components/       # Reusable UI components (Button, Card, Layout, Navbar)
├── pages/           # Page components (Home, Coaches, MealPlans, etc.)
├── services/        # Supabase client and API helpers
├── types/           # TypeScript type definitions
├── hooks/           # Custom React hooks
├── utils/           # Helper functions and utilities
└── styles/          # Global styles and Tailwind imports
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

Dependencies are already installed! Just run:

```bash
npm run dev
```

This will start the development server at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Features

### Current Setup

- Mobile-responsive navigation with hamburger menu
- TypeScript path aliases for clean imports (@components, @pages, etc.)
- Supabase integration ready to use
- Placeholder routes for all main pages:
  - Home
  - Coaches
  - Browse Coaches
  - Meal Plans
  - Workout Plans

### Reusable Components

**Button** - Multiple variants (primary, secondary, outline, danger) and sizes
```tsx
import { Button } from '@components'

<Button variant="primary" size="md">Click Me</Button>
```

**Card** - Flexible container with optional title and hover effects
```tsx
import { Card } from '@components'

<Card title="Coach Profile" hover>
  Card content here
</Card>
```

## Supabase Configuration

The Supabase client is configured in `src/services/supabase.ts` and ready to use:

```tsx
import { supabase } from '@services/supabase'

// Example: Fetch data
const { data, error } = await supabase.from('coaches').select('*')
```

### Environment Variables

Supabase credentials are stored in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Mobile Responsiveness

The entire application is mobile-first and responsive:
- Collapsible navigation menu on mobile devices
- Responsive grid layouts using Tailwind
- Touch-friendly UI components

## Next Steps

You're all set! The project is ready for you to start building features:

1. Design and implement the database schema in Supabase
2. Build out the actual page components
3. Add authentication with Supabase Auth
4. Create forms for coaches, meal plans, and workout plans
5. Implement data visualization with Chart.js

## TypeScript Types

Core types are defined in `src/types/index.ts`:
- Coach
- Client
- MealPlan
- WorkoutPlan
- Account

Feel free to extend these as needed!
