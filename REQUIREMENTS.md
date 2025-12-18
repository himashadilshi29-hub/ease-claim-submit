# Project Requirements / Dependencies

## Prerequisites
- Node.js v18+ (https://nodejs.org/)
- npm or bun package manager

## Installation Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install

# 3. Create .env file with these variables
VITE_SUPABASE_URL="https://ijegsjcetbcxuwfanesl.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="ijegsjcetbcxuwfanesl"

# 4. Run development server
npm run dev
```

## Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | UI Framework |
| react-dom | ^18.3.1 | React DOM rendering |
| react-router-dom | ^6.30.1 | Routing |
| typescript | - | Type safety |
| vite | - | Build tool |
| tailwindcss | - | CSS framework |

## UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-* | Various | Headless UI components |
| lucide-react | ^0.462.0 | Icons |
| class-variance-authority | ^0.7.1 | Component variants |
| clsx | ^2.1.1 | Class utilities |
| tailwind-merge | ^2.6.0 | Tailwind class merging |
| tailwindcss-animate | ^1.0.7 | Animations |
| framer-motion | ^12.23.26 | Advanced animations |

## Backend & Data

| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.87.1 | Supabase client (Database, Auth, Storage) |
| @tanstack/react-query | ^5.83.0 | Data fetching & caching |

## Forms & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.61.1 | Form handling |
| @hookform/resolvers | ^3.10.0 | Form validation resolvers |
| zod | ^3.25.76 | Schema validation |

## UI Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| sonner | ^1.7.4 | Toast notifications |
| recharts | ^2.15.4 | Charts & graphs |
| date-fns | ^3.6.0 | Date utilities |
| react-day-picker | ^8.10.1 | Date picker |
| cmdk | ^1.1.1 | Command menu |
| vaul | ^0.9.9 | Drawer component |
| embla-carousel-react | ^8.6.0 | Carousel |
| input-otp | ^1.4.2 | OTP input |
| react-resizable-panels | ^2.1.9 | Resizable panels |
| next-themes | ^0.3.0 | Theme switching |

## Fonts

| Package | Version | Purpose |
|---------|---------|---------|
| @fontsource/plus-jakarta-sans | ^5.2.8 | Primary font |

## Full package.json dependencies

```json
{
  "dependencies": {
    "@fontsource/plus-jakarta-sans": "^5.2.8",
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.15",
    "@radix-ui/react-navigation-menu": "^1.2.13",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-toggle": "^1.1.9",
    "@radix-ui/react-toggle-group": "^1.1.10",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@supabase/supabase-js": "^2.87.1",
    "@tanstack/react-query": "^5.83.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "^12.23.26",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.61.1",
    "react-resizable-panels": "^2.1.9",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "sonner": "^1.7.4",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.9",
    "zod": "^3.25.76"
  }
}
```

## Tech Stack Summary

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Backend**: Supabase (PostgreSQL database, Authentication, Storage, Edge Functions)
- **State Management**: TanStack React Query
- **Forms**: React Hook Form + Zod validation
