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

---

## Corporate Claims Validation System

### Database Tables

| Table | Purpose |
|-------|---------|
| `corporate_policies` | Company-level policy information (policy number, company name, deadlines) |
| `corporate_policy_schemes` | Scheme-level limits (hospitalization, OPD, dental, spectacles) |
| `corporate_policy_members` | Employee enrollment with balance tracking |
| `claim_exclusion_keywords` | Blacklisted keywords for claim filtering |

### Configured Corporate Policies

| Company | Policy Number | Schemes |
|---------|---------------|---------|
| Noyon Lanka (Pvt) Ltd | JSV2023-2476 | Scheme 1-4 |
| Avery Dennison Lanka (Pvt) Ltd | JSV2025-1176 | Scheme 01-06 |
| East West Properties | JSV2025-1525 | Option 1 |
| Lankem Ceylon PLC | JSV2025-1216 | Option 1-2 |

### Edge Function: `validate-corporate-claim`

**Endpoint**: `POST /functions/v1/validate-corporate-claim`

**Input (OCR Data)**:
```json
{
  "patient_name": "string",
  "company_name": "string (optional)",
  "policy_number": "string (optional)",
  "employee_nic": "string (optional)",
  "bill_date": "YYYY-MM-DD",
  "total_amount": 1500.00,
  "line_items": [
    { "name": "Panadol", "amount": 500 },
    { "name": "Vitamin C", "amount": 200 }
  ],
  "doctor_seal_detected": true,
  "claim_type": "OPD | Hospitalization | Pharmacy | Dental | Spectacles | OPD Drugs"
}
```

**Output**:
```json
{
  "status": "APPROVED | REJECTED | PARTIAL_APPROVAL | FLAGGED_FOR_REVIEW",
  "approved_amount": 1300.00,
  "rejected_reason": null,
  "flagged_items": [],
  "deducted_items": [
    { "item": "Vitamin C", "reason": "Excluded keyword: vitamin", "amount": 200 }
  ],
  "balance_info": {
    "opd_remaining": 13500,
    "hospitalization_remaining": 275000,
    "dental_remaining": 0,
    "spectacles_remaining": 30000
  },
  "validation_steps": [
    { "step": "Member Identification", "passed": true, "message": "Found member..." },
    { "step": "Submission Deadline", "passed": true, "message": "Within 90 days..." },
    { "step": "Keyword Filtering", "passed": true, "message": "Deducted Rs. 200..." },
    { "step": "Prescription Validation", "passed": true, "message": "Doctor seal detected" },
    { "step": "Balance Check", "passed": true, "message": "Sufficient balance..." },
    { "step": "Spectacle Rule", "passed": true, "message": "No spectacle items..." }
  ]
}
```

### Validation Algorithm

1. **Step 1: Member Identification** - Find member by name/NIC in corporate_policy_members
2. **Step 2: Submission Deadline** - Reject if bill_date > 90 days old
3. **Step 3: Keyword Filtering** - Deduct excluded items (shampoo, soap, cosmetics, vitamins, etc.)
4. **Step 4: Prescription Validation** - Flag if pharmacy claim without doctor seal
5. **Step 5: Balance Check** - Partial approval if exceeds remaining balance
6. **Step 6: Spectacle Rule** - Reject if claimed within 2 years

### Exclusion Keywords

| Category | Keywords |
|----------|----------|
| Cosmetic | shampoo, soap, cream*, face wash, beauty, lotion*, moisturizer, sunscreen |
| Supplement | vitamin*, supplement, tonic, nutritional supplement |
| Administrative | registration fee, service charge, surcharge, booking fee |
| Treatment | weight loss, slimming, hair fall, alopecia, acne |

*Exception conditions apply (e.g., antifungal cream, pregnancy vitamins)