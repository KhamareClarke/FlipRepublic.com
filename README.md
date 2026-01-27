# FlipRepublic - Elite Luxury Marketplace

A production-ready Next.js 14+ frontend for a black & gold, ultra-premium multi-vendor resale marketplace focused on trainers, streetwear, and luxury fashion.

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- **Framer Motion** for animations
- **Lucide React** for icons

## Features

### Pages

1. **Homepage** - Cinematic hero, curated drops, featured sellers, trust pillars
2. **Marketplace** - Filterable product grid with luxury aesthetic
3. **Product Detail** - Editorial layout with authentication badges
4. **Seller Dashboard** - Revenue overview, active listings, payouts
5. **Seller Application** - Multi-step gated application form
6. **Authentication/Trust** - Verification process explanation

### Design System

- **Colors**: Pure black background with metallic gold (#D4AF37)
- **Typography**: Playfair Display (serif) for headlines, Inter (sans-serif) for body
- **Aesthetic**: Minimal, dominant, elite, modern with high negative space

## Getting Started

### Installation

```bash
npm install
```

### Environment Variables

Set the following variables in your hosting environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (defaults to `product-images`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)
- `SMTP_HOST` (defaults to `smtp.gmail.com`)
- `SMTP_PORT` (defaults to `465`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_EMAIL`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Homepage
│   ├── marketplace/        # Marketplace page
│   ├── product/[id]/       # Product detail pages
│   ├── dashboard/          # Seller dashboard
│   ├── apply/              # Seller application
│   └── trust/              # Authentication & trust
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── navigation.tsx      # Main navigation
│   ├── footer.tsx          # Footer component
│   └── product-card.tsx    # Product card component
├── lib/
│   ├── data.ts             # Mock data (easily swappable for Supabase)
│   └── utils.ts            # Utility functions
└── styles/
    └── globals.css         # Global styles
```

## Mock Data

All data is structured in `lib/data.ts` with TypeScript interfaces for:
- Products
- Sellers
- Categories
- Trust pillars

This structure is designed to be easily swapped with a Supabase backend.

## Design Principles

- **No emojis** - Professional, luxury aesthetic
- **Minimal animations** - Subtle, intentional, expensive feel
- **High contrast** - Black & gold color scheme
- **Desktop-first** - Refined for mobile
- **Premium feel** - Every interaction feels pressurised and confident

## Deployment

This project is optimized for deployment on Vercel:

```bash
vercel
```

## License

Private marketplace - All rights reserved
