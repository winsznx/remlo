  
**REMLO**

*Complete Architecture & Design Specification*

**The LLM Agent Source of Truth Document**

Version 1.0  ·  March 2026  ·  Tempo × Stripe Ecosystem

# **0\. How To Use This Document (Agent Instructions)**

| CRITICAL FOR LLM AGENTS: This document is the single source of truth for building Remlo. Every section is prescriptive, not suggestive. Do not deviate from routing structures, component names, color tokens, or data schemas defined here. When a task references a component name, find it in Section 5 (Component Library). When it references a route, find it in Section 4 (Routing Architecture). Build in the task order defined in Section 11\. Do not skip sections. |
| :---- |

### **Document Sections**

| Section 0 | How to use this document (you are here) |
| :---- | :---- |
| **Section 1** | Project philosophy, tech stack, and constraints |
| **Section 2** | Competitor analysis — what we copy, improve, and discard |
| **Section 3** | Design system — typography, colors, spacing, motion, tokens |
| **Section 4** | Frontend routing — every route, role, and guard |
| **Section 5** | Component library — every reusable component with props |
| **Section 6** | Landing page — section by section, exact copy and layout |
| **Section 7** | All application pages — wireframe specs for every screen |
| **Section 8** | Backend architecture — API routes, middleware, data flow |
| **Section 9** | Blockchain & wallet layer — chain abstraction, gasless UX |
| **Section 10** | AI tooling and automation integration |
| **Section 11** | Agent task breakdown — build order and context budget rules |
| **Section 12** | GTM strategy and go-live checklist |

# **1\. Project Philosophy, Tech Stack & Constraints**

## **1.1 Product Philosophy**

Remlo is a borderless enterprise payroll and yield routing protocol. It looks and feels like a modern B2B SaaS product — not a crypto dApp. The blockchain layer is invisible to employees. The stablecoin settlement layer is invisible to non-technical employers. The UI should feel closer to Stripe's dashboard than to Uniswap.

Three design principles govern every decision:

* CLARITY FIRST: A non-crypto HR manager must complete the full employer onboarding in under 8 minutes with zero blockchain knowledge.

* TRUST THROUGH DESIGN: Enterprise B2B users equate visual polish with product reliability. Every pixel communicates credibility.

* PROGRESSIVE DISCLOSURE: Crypto features (memos, on-chain explorer links, yield contracts) are available but never forced on users who do not need them.

## **1.2 Tech Stack — Non-Negotiable**

| Layer | Technology | Version | Reason |
| :---- | :---- | :---- | :---- |
| Framework | Next.js (App Router) | 15.x | RSC, server actions, streaming, file-based routing |
| Language | TypeScript | 5.x strict | Type safety for contract ABIs, Bridge API, DB schema |
| Styling | Tailwind CSS \+ CSS Variables | 3.4+ | Utility-first, design token integration |
| UI Components | shadcn/ui (Radix primitives) | Latest | Accessible, unstyled, fully customizable |
| Blockchain | Viem \+ Wagmi | v2 | Native Tempo chain support, typed ABIs |
| Wallets | Privy SDK | Latest | Email/SMS/passkey wallets, Tempo chain 42431 |
| State | Zustand | 4.x | Lightweight global state for payroll runs |
| Server State | TanStack Query | v5 | Async data, caching, background refetch |
| Forms | React Hook Form \+ Zod | Latest | Type-safe form validation |
| Database | Supabase (PostgreSQL) | Latest | Auth, realtime, RLS, edge functions |
| File uploads | Supabase Storage | Latest | CSV uploads, payslip PDFs |
| Payments | Stripe Bridge API | Latest | Fiat on/off-ramps, Visa card issuance |
| Animation | Framer Motion | v11 | Page transitions, number counters, micro-interactions |
| Charts | Recharts | v2 | Treasury charts, yield curves, payroll history |
| Icons | Lucide React | Latest | Consistent icon system |
| Fonts | Geist (display) \+ IBM Plex Mono | CDN | See Section 3 |
| Deployment | Vercel | Latest | Edge network, preview deploys |
| Environment | Vercel env \+ .env.local | \- | See Section 8.5 for all variables |

## **1.3 Hard Constraints**

* Never use localStorage or sessionStorage in any component. All state lives in Zustand (in-memory) or Supabase (persistent).

* Never use class components. Hooks only.

* All contract ABIs must be typed via Viem's parseAbi or imported from /lib/abis/\*.ts.

* All Supabase queries must use Row Level Security (RLS) policies. Never bypass with service key on the client.

* All Bridge API calls must go through Next.js API routes. Never expose Bridge API key to the client.

* All Tempo RPC calls for write transactions must go through the wallet (Privy). Never use a server-side private key for user transactions.

* pathUSD address on Moderato testnet: 0x20c0000000000000000000000000000000000000

* TIP-403 Registry address: 0x403c000000000000000000000000000000000000

* Tempo Moderato RPC: https://rpc.moderato.tempo.xyz (Chain ID 42431\)

# **2\. Competitor Analysis — Copy, Improve, Discard**

## **2.1 Deel — The Design Benchmark**

Deel is the visual and UX benchmark for Remlo's employer-facing dashboard. It is the most polished global payroll product. Study it carefully.

| Feature | What Deel Does | What We Copy | What We Improve |
| :---- | :---- | :---- | :---- |
| Left sidebar nav | Fixed sidebar with icon+label, expandable sub-items | Exact pattern: icon, label, active state, collapse | Add real-time settlement indicators per section |
| Dashboard overview | Card grid: upcoming payments, headcount, cost by country | Card-grid layout with metric cards | Add yield earned card \+ on-chain tx count |
| Employee list | Sortable table with avatar, name, country, contract type, status | Table with status badges, country flags, search/filter | Add wallet status column \+ compliance badge |
| Payroll run flow | Multi-step wizard: select employees → review → approve → confirm | Identical 4-step wizard pattern | Show live Tempo block confirmation \+ memo hash |
| Employee portal | Simplified view: payslips, personal info, bank details | Same simplified role separation | Replace bank details with wallet \+ Visa card management |
| Mobile app nav | Bottom tab navigation for mobile | Bottom tabs on mobile breakpoint | Same but crypto-enhanced (live balance ticker) |
| Onboarding | Progressive KYC collection with Persona | Step-indicator \+ progressive disclosure | Bridge-hosted KYC link replaces Persona |

## **2.2 Request Finance — The Web3 Payroll Reference**

| Feature | What They Do | What We Copy | What We Discard |
| :---- | :---- | :---- | :---- |
| Crypto-native UX | Shows wallet addresses, chain names prominently | Nothing — this is for crypto insiders only | Wallet addresses hidden behind "View on Explorer" links |
| Batch payment | CSV upload → review table → one-click send | CSV upload pattern and review table | Replace MetaMask prompt with gasless TempoTransaction |
| Payment status | Transaction hash links to Etherscan | On-chain reference (hidden in "View details") | Prominently show 0.5s confirmation as feature |
| Multi-sig support | Gnosis Safe integration for team approvals | Approval threshold concept | Simpler: role-based approve button, not wallet multi-sig |
| Accounting export | CSV export of all payments with chain metadata | Export functionality with decoded memo fields | Also offer QuickBooks/Xero webhook |

## **2.3 Superfluid — The Streaming Reference**

| Feature | What They Do | What We Copy | What We Discard |
| :---- | :---- | :---- | :---- |
| Stream visualization | Animated balance counter ticking up per-second | Real-time balance counter in employee portal | The overall crypto-dApp aesthetic |
| Stream management | Create/pause/cancel streams with date range | VestingStream UI with start/end dates | Token wrapping complexity (native TIP-20) |
| Flow rate display | Shows $/sec, $/hr, $/day, $/month toggle | Rate display toggle in employee salary view | Requires explicit "open stream" action |

## **2.4 Stripe Dashboard — The Design North Star**

Stripe's dashboard is the gold standard for B2B fintech UX. Study these patterns:

* METRIC CARDS: Monospace numbers, subtle sparklines, clear period labels, "vs last period" comparison in muted text below.

* DATA TABLES: No borders on rows, zebra shading only on hover, sticky headers on scroll, column visibility controls.

* EMPTY STATES: Never show blank screens. Every empty state has an illustration, a 1-line explanation, and a primary CTA.

* COPY TONE: Direct, no jargon, business-confident. "Run payroll" not "Execute batch transfer." "Your employees received their pay" not "Transactions confirmed."

* STATUS INDICATORS: Three states only per entity: Pending (amber dot), Active/Completed (green dot), Failed/Blocked (red dot).

* LOADING STATES: Skeleton screens everywhere. Never spinners on full-page content.

# **3\. Design System**

## **3.1 Aesthetic Direction**

| Remlo's aesthetic: "Institutional Finance Meets Protocol Infrastructure." Think Bloomberg Terminal clarity \+ Stripe checkout polish \+ a single emerald accent that signals "money moving." Dark mode is the primary default. Every element must feel like it was designed for a CFO's laptop at 11pm. |
| :---- |

## **3.2 Color Tokens (CSS Variables — implement in globals.css)**

Define these in :root and .dark. Do NOT use hardcoded hex values in Tailwind classes. Always use var(--token-name).

| Token | Light Value | Dark Value | Usage |
| :---- | :---- | :---- | :---- |
| \--bg-base | \#FFFFFF | \#0A0F1E | Page background |
| \--bg-surface | \#F8FAFC | \#0F172A | Card, sidebar, panel backgrounds |
| \--bg-subtle | \#F1F5F9 | \#1E293B | Table row hover, input backgrounds |
| \--bg-overlay | \#FFFFFF | \#1A2744 | Modal, dropdown backgrounds |
| \--border-default | \#E2E8F0 | \#1E293B | Card borders, dividers |
| \--border-strong | \#CBD5E1 | \#334155 | Input borders, table borders |
| \--text-primary | \#0F172A | \#F1F5F9 | Headings, primary content |
| \--text-secondary | \#475569 | \#94A3B8 | Labels, metadata, secondary copy |
| \--text-muted | \#94A3B8 | \#475569 | Placeholders, disabled states |
| \--accent | \#059669 | \#34D399 | Primary actions, links, active states |
| \--accent-subtle | \#D1FAE5 | \#064E3B | Accent backgrounds, highlights |
| \--accent-foreground | \#FFFFFF | \#0A0F1E | Text on accent backgrounds |
| \--status-success | \#059669 | \#34D399 | Confirmed, active, paid |
| \--status-pending | \#D97706 | \#FBBF24 | Processing, awaiting |
| \--status-error | \#DC2626 | \#F87171 | Failed, blocked, error |
| \--status-neutral | \#64748B | \#94A3B8 | Inactive, draft |
| \--mono | \#1D4ED8 | \#60A5FA | Addresses, hashes, code |

## **3.3 Typography**

Primary display font: Geist (by Vercel). Body and UI font: Geist. Monospace for addresses and hashes: IBM Plex Mono. Load via @next/font/google or Vercel's Geist package.

| Style Name | Font | Size | Weight | Line Height | Usage |
| :---- | :---- | :---- | :---- | :---- | :---- |
| display-2xl | Geist | 4.5rem | 800 | 1.1 | Landing hero number counters |
| display-xl | Geist | 3rem | 700 | 1.15 | Landing section headlines |
| display-lg | Geist | 2.25rem | 700 | 1.2 | Page titles within app |
| heading-xl | Geist | 1.5rem | 600 | 1.3 | Card titles, section headings |
| heading-lg | Geist | 1.25rem | 600 | 1.4 | Sub-section headings |
| heading-md | Geist | 1.125rem | 600 | 1.4 | Form section labels |
| body-lg | Geist | 1rem | 400 | 1.6 | Primary body copy |
| body-md | Geist | 0.875rem | 400 | 1.6 | Secondary body, table cells |
| body-sm | Geist | 0.75rem | 400 | 1.5 | Labels, metadata, timestamps |
| label-md | Geist | 0.875rem | 500 | 1.4 | Form labels, column headers |
| label-sm | Geist | 0.75rem | 500 | 1.4 | Status badges, chip labels |
| mono-md | IBM Plex Mono | 0.875rem | 400 | 1.5 | Wallet addresses, tx hashes |
| mono-sm | IBM Plex Mono | 0.75rem | 400 | 1.5 | Abbreviated addresses |
| number-xl | Geist | 2rem | 700 | 1.2 | Dashboard metric values |
| number-lg | Geist | 1.5rem | 600 | 1.2 | Card metric values |

## **3.4 Spacing Scale**

Use Tailwind's default spacing scale. Critical: 4px base unit. Use multiples of 4 for all spacing. Never use arbitrary pixel values.

| Token | px value | Tailwind | Use case |
| :---- | :---- | :---- | :---- |
| space-1 | 4px | p-1, gap-1 | Micro-spacing within components |
| space-2 | 8px | p-2, gap-2 | Icon-label gaps, tight badges |
| space-3 | 12px | p-3, gap-3 | Button padding, small cards |
| space-4 | 16px | p-4, gap-4 | Standard card padding |
| space-6 | 24px | p-6, gap-6 | Card inner spacing, form fields |
| space-8 | 32px | p-8, gap-8 | Section separators, modal padding |
| space-12 | 48px | p-12, gap-12 | Major section spacing |
| space-16 | 64px | p-16 | Hero section padding |
| space-24 | 96px | p-24 | Landing page vertical rhythm |

## **3.5 Border Radius Scale**

* \--radius-sm: 4px — badges, chips, status dots

* \--radius-md: 8px — buttons, inputs, small cards

* \--radius-lg: 12px — standard cards, modals

* \--radius-xl: 16px — feature cards, landing sections

* \--radius-2xl: 24px — hero cards, overlay panels

* \--radius-full: 9999px — pills, avatars, toggles

## **3.6 Shadow Scale**

* shadow-xs: 0 1px 2px rgba(0,0,0,0.05) — subtle card lift

* shadow-sm: 0 2px 8px rgba(0,0,0,0.08) — standard card

* shadow-md: 0 4px 16px rgba(0,0,0,0.12) — elevated card, dropdown

* shadow-lg: 0 8px 32px rgba(0,0,0,0.16) — modal, sidebar on mobile

* shadow-accent: 0 0 24px rgba(5,150,105,0.3) — accent glow for primary CTA on landing

## **3.7 Motion Principles**

All animations use Framer Motion. Import from framer-motion. Default easing: \[0.16, 1, 0.3, 1\] (custom spring-like ease). No animation should last longer than 350ms. Page transitions use layout animations.

| Animation | Duration | Use case |
| :---- | :---- | :---- |
| fadeInUp | 240ms | Page content loading in, card appearance |
| fadeIn | 200ms | Modal backdrop, tooltip |
| slideInRight | 260ms | Drawer panels, side sheets |
| scaleIn | 200ms | Dropdown menus, popovers |
| numberCount | 1200ms | Dashboard metric counters on load |
| shimmer | 1600ms loop | Skeleton loading state shimmer |
| pulse | 2000ms loop | Live indicator dots (on-chain sync) |
| confetti | 800ms | Successful payroll run completion |

## **3.8 Iconography**

Icon library: Lucide React exclusively. Icon size standards: 14px (body text inline), 16px (default UI), 20px (navigation), 24px (feature cards on landing). Never use emoji as UI elements. Use Lucide for all status, action, and category indicators.

## **3.9 Dark Mode Implementation**

Dark mode is the DEFAULT on initial visit. Store preference in localStorage key "remlo-theme". Implement via the "dark" class on \<html\>. All color tokens must be defined in both :root and .dark in globals.css. The landing page uses dark mode exclusively. The dashboard respects user preference.

# **4\. Frontend Routing Architecture (Next.js 15 App Router)**

## **4.1 Route Groups and Role Separation**

| Next.js App Router route groups (parentheses) are used to enforce role-based layouts without affecting the URL. Each role has its own layout.tsx with role-specific navigation, auth guards, and theme variants. |
| :---- |

## **4.2 Complete Route Map**

File structure under /app/:

### **Public Routes (unauthenticated)**

| Route | File Path | Description |
| :---- | :---- | :---- |
| / | app/(public)/page.tsx | Landing page — marketing, features, pricing, demo CTA |
| /pricing | app/(public)/pricing/page.tsx | Pricing tiers for employers |
| /docs | app/(public)/docs/page.tsx | Public API and integration docs |
| /blog | app/(public)/blog/page.tsx | Blog/changelog (optional, post-hackathon) |
| /login | app/(auth)/login/page.tsx | Universal login — email/SMS/passkey via Privy |
| /register | app/(auth)/register/page.tsx | Employer registration wizard |
| /invite/\[token\] | app/(auth)/invite/\[token\]/page.tsx | Employee invite acceptance page |
| /kyc/\[token\] | app/(auth)/kyc/\[token\]/page.tsx | Bridge-hosted KYC redirect handler |

### **Employer Admin Routes (role: employer\_admin, employer\_operator)**

| Route | File Path | Description |
| :---- | :---- | :---- |
| /dashboard | app/(employer)/dashboard/page.tsx | Main overview: treasury, last run, yield, team size |
| /dashboard/team | app/(employer)/dashboard/team/page.tsx | Employee list with status, wallet, compliance |
| /dashboard/team/add | app/(employer)/dashboard/team/add/page.tsx | Add employee(s) — single form or CSV upload |
| /dashboard/team/\[id\] | app/(employer)/dashboard/team/\[id\]/page.tsx | Individual employee detail: history, stream, compliance |
| /dashboard/payroll | app/(employer)/dashboard/payroll/page.tsx | Payroll run history list |
| /dashboard/payroll/new | app/(employer)/dashboard/payroll/new/page.tsx | New payroll run wizard (4-step) |
| /dashboard/payroll/\[runId\] | app/(employer)/dashboard/payroll/\[runId\]/page.tsx | Payroll run detail: per-employee status, on-chain proof |
| /dashboard/treasury | app/(employer)/dashboard/treasury/page.tsx | Treasury: balance, deposit, yield, history |
| /dashboard/treasury/deposit | app/(employer)/dashboard/treasury/deposit/page.tsx | Fiat deposit via Bridge virtual account |
| /dashboard/cards | app/(employer)/dashboard/cards/page.tsx | Visa card program: issued cards, spend overview |
| /dashboard/compliance | app/(employer)/dashboard/compliance/page.tsx | TIP-403 policy, KYC statuses, audit log |
| /dashboard/settings | app/(employer)/dashboard/settings/page.tsx | Company settings, team roles, API keys, webhooks |
| /dashboard/settings/billing | app/(employer)/dashboard/settings/billing/page.tsx | Subscription plan, payment history |

### **Employee Routes (role: employee)**

| Route | File Path | Description |
| :---- | :---- | :---- |
| /portal | app/(employee)/portal/page.tsx | Employee home: balance, last payment, card balance |
| /portal/payments | app/(employee)/portal/payments/page.tsx | Payment history with decoded memos, amounts |
| /portal/card | app/(employee)/portal/card/page.tsx | Visa card: balance, transactions, off-ramp to bank |
| /portal/card/activate | app/(employee)/portal/card/activate/page.tsx | Card activation flow |
| /portal/wallet | app/(employee)/portal/wallet/page.tsx | Wallet info, address (for crypto-native users) |
| /portal/settings | app/(employee)/portal/settings/page.tsx | Personal info, bank account, notification prefs |
| /portal/settings/offram | app/(employee)/portal/settings/offram/page.tsx | Connect bank for off-ramp via Bridge |

### **Platform Admin Routes (role: platform\_admin) — Internal only**

| Route | File Path | Description |
| :---- | :---- | :---- |
| /admin | app/(admin)/admin/page.tsx | Platform overview: total employers, volume, yield |
| /admin/employers | app/(admin)/admin/employers/page.tsx | All employer accounts |
| /admin/compliance | app/(admin)/admin/compliance/page.tsx | Global TIP-403 policy management, flagged transfers |
| /admin/monitoring | app/(admin)/admin/monitoring/page.tsx | Contract health, Tempo RPC status, Bridge API status |

## **4.3 Auth Guards and Middleware**

Create /middleware.ts at root. Use Supabase auth \+ Privy session to determine role. Redirect rules:

* Unauthenticated user → /login (except public routes)

* employer\_admin or employer\_operator → /dashboard

* employee → /portal

* platform\_admin → /admin

* Authenticated user hitting / → redirect to role-appropriate home

## **4.4 Layout Structure**

Four layout files:

| app/(public)/layout.tsx | PublicLayout: transparent nav on scroll, footer. No auth required. |
| :---- | :---- |
| **app/(employer)/layout.tsx** | EmployerLayout: fixed left sidebar \+ top header. Auth required. |
| **app/(employee)/layout.tsx** | EmployeeLayout: top nav \+ bottom tabs on mobile. Auth required. |
| **app/(admin)/layout.tsx** | AdminLayout: minimal sidebar. Auth \+ platform\_admin role required. |

## **4.5 Loading and Error States**

Every route must have:

* loading.tsx — Skeleton screen specific to that page layout

* error.tsx — Error boundary with retry button and support contact

* not-found.tsx — 404 page with navigation home

# **5\. Component Library — Reusable Components**

| All components live in /components/. Organize by domain, not by type. Never create one-off components in page files. If a UI element appears more than once, it must be a component. Props must be fully TypeScript typed. |
| :---- |

## **5.1 Foundation Components (/components/ui/)**

These are unstyled Radix primitives wrapped with Remlo's design tokens. Generated via shadcn add \<component\>.

| Component | shadcn source | Key customizations for Remlo |
| :---- | :---- | :---- |
| Button | button | 5 variants: default(accent), outline, ghost, destructive, link. Size: sm/md/lg. Always uses \--accent token. |
| Input | input | Left icon slot, right action slot (clear button), error state with red border \+ message below. |
| Badge | badge | 5 variants: success(green), pending(amber), error(red), neutral(slate), info(blue). Always pill shape. |
| Card | card | Header with title+action, content, optional footer. Hover lift shadow. Click variant for selectable cards. |
| Dialog/Modal | dialog | Standard: 480px wide. Large: 720px. Full-screen on mobile. Always has close X in corner. |
| Sheet/Drawer | sheet | Right-side drawer for detail panels. 480px width on desktop. Full-screen on mobile. |
| Tabs | tabs | Underline style (not pill/box). Border bottom on active. Used for page sub-navigation. |
| Select | select | Always searchable for lists \> 8 items. Groups supported. |
| Dropdown | dropdown-menu | Right-click and button-triggered menus. Max 8 items before scroll. |
| Tooltip | tooltip | Delay 400ms. Max 240px wide. Always explains crypto concepts for non-crypto users. |
| Toast | sonner | Bottom-right position. success/error/loading/info variants. Auto-dismiss 4s. |
| Skeleton | skeleton | Shimmer animation via CSS. Exact-shape skeletons for every component type. |
| DataTable | table | Tanstack Table v8 integration. Sort, filter, column visibility, pagination, row select. |
| Progress | progress | Used for wizard steps and KYC progress. |
| Avatar | avatar | Fallback to initials with deterministic color based on name hash. |
| Separator | separator | Thin 1px \--border-default line. |

## **5.2 Domain Components (/components/payroll/)**

| Component | Props | Description |
| :---- | :---- | :---- |
| PayrollRunCard | run: PayrollRun, onView: fn | Compact card showing run date, amount, employee count, status badge, "View" action |
| PayrollBadge | status: RunStatus | Colored badge: "Completed" | "Processing" | "Failed" | "Draft" |
| PayrollWizard | onComplete: fn | 4-step wizard. Steps: Select Employees → Set Amounts → Review → Confirm. Wraps PayrollStep1-4. |
| PayrollStep1 | onNext: fn | Employee multi-select table with checkboxes, search, filter by department |
| PayrollStep2 | employees, onNext: fn | Amount per employee: fixed amount or import from contract. Shows total. |
| PayrollStep3 | data, onConfirm: fn | Full review table. Shows memo hash preview. Gas estimate. Yield info. |
| PayrollStep4 | txHash: string | null | Confirmation with Tempo Explorer link. Confetti animation on success. |
| BatchProgress | total, confirmed, failed | Real-time progress bar during batch execution with per-tx status |
| MemoDecoder | memo: bytes32 | Parses and displays 32-byte ISO 20022 memo as human-readable fields |

## **5.3 Domain Components (/components/treasury/)**

| Component | Props | Description |
| :---- | :---- | :---- |
| TreasuryCard | balance, yield, currency | Main balance card with animated number counter. Shows available vs locked. |
| YieldCard | apy, earned, model | Yield APY display, total earned, yield model selector (employer/split/employee). |
| DepositPanel | onClose: fn | Sheet panel: shows Bank Account Number \+ Routing (from Bridge virtual account). Copy buttons. |
| TxHistoryTable | txs: Transaction\[\] | Paginated table of all treasury movements: deposits, payroll runs, yield |
| BalanceTicker | balance, currency | Animated number that ticks up in real-time for streaming salary display |

## **5.4 Domain Components (/components/employee/)**

| Component | Props | Description |
| :---- | :---- | :---- |
| EmployeeTable | employees\[\], onSelect: fn | Full DataTable with: avatar, name, country flag, job title, wallet status badge, compliance badge, amount, stream indicator, action menu |
| EmployeeRow | employee: Employee | Single row used within EmployeeTable |
| ComplianceBadge | status: KYCStatus | Green "Verified" | Amber "Pending" | Red "Blocked". Tooltip explains what it means. |
| WalletStatus | address: string, linked: bool | Shows "Wallet Active" with green dot, or "Setup Required" with CTA button |
| EmployeeOnboard | onComplete: fn | Wizard: enter email → send invite → track KYC status → wallet creation |
| CSVUpload | onUpload: fn | Drag-and-drop CSV upload with column mapper, validation, preview table |

## **5.5 Domain Components (/components/wallet/)**

| Component | Props | Description |
| :---- | :---- | :---- |
| WalletConnect | onConnect: fn | Privy connect button for employers. Shows Privy modal with email/passkey options. |
| AddressDisplay | address: string, label: string | Truncated address (0x1234...5678) with copy-to-clipboard \+ explorer link. Uses IBM Plex Mono. |
| TxStatus | hash: string, status | Shows "Confirming..." with animated dots → "Confirmed in 0.4s" with Tempo explorer link |
| GasSponsored | \- | Small chip: "⚡ Gas-free transaction" — explains fee sponsorship to non-crypto users |
| ChainBadge | chain: string | Shows "Tempo Moderato" badge with green dot when on correct chain |

## **5.6 Domain Components (/components/card/) — Visa Card**

| Component | Props | Description |
| :---- | :---- | :---- |
| VisaCardDisplay | card: CardAccount | Stylized card UI (not a real card, just a display component). Shows last 4 digits, cardholder name, status. |
| CardActivation | card, onActivate | Activation wizard: verify identity → set PIN → activate |
| CardTransactions | transactions\[\] | Table of card spend with merchant, amount, date, category icon |
| OffRampPanel | onComplete | Sheet: select bank account, enter amount, initiate Bridge transfer to ACH/SEPA/PIX |

## **5.7 Layout Components (/components/layout/)**

| Component | Description |
| :---- | :---- |
| EmployerSidebar | Fixed 240px sidebar. Logo, nav links with icons (lucide), bottom: user avatar \+ settings. Collapsible to 64px icon-only on xl+. |
| EmployerHeader | Top 64px header. Breadcrumb left, global search center, notifications \+ user menu right. |
| EmployeeTopNav | Top 56px nav for employee portal. Logo left, page title center, notifications right. |
| BottomTabNav | Mobile-only bottom tabs for employee portal: Home, Payments, Card, Settings. |
| PageContainer | Max-width 1280px, centered, horizontal padding responsive. |
| SectionHeader | Page section: title (h1), subtitle, optional right-side action (Button). |
| EmptyState | Illustration (svg), heading, description, optional CTA button. |
| ConfirmDialog | Generic confirmation modal: title, message, confirm/cancel actions. |

# **6\. Landing Page — Section by Section Specification**

| The landing page is a standalone marketing site within the same Next.js app. Dark mode by default. Purpose: convert CFOs/HR managers into trial sign-ups in under 60 seconds. No crypto jargon above the fold. Pain → solution → proof → features → pricing → CTA. |
| :---- |

## **6.1 Navigation Bar**

Position: Fixed, top, full-width. Height: 64px. Background: \--bg-base with 0.8 opacity \+ backdrop-blur(12px). Scrolled state: adds shadow-sm.

| Logo | Remlo logotype left. Monospace font. Green dot after "Stream" — animated pulse. |
| :---- | :---- |
| **Nav links (center)** | Features | How It Works | Pricing | Docs — only on desktop (lg+) |
| **CTA (right)** | Button: "Start Free Trial" (accent variant). Link: "Sign in" (ghost variant). |
| **Mobile** | Hamburger → full-screen menu with same links \+ both CTAs stacked. |

## **6.2 Hero Section**

Background: Dark. Subtle animated mesh gradient (emerald \+ indigo, low opacity, slow motion). Center-aligned.

| Label chip | Pill chip: "⚡ Built on Tempo × Stripe Bridge" — links to Tempo website. Subtle border, small font. |
| :---- | :---- |
| **Headline (H1)** | "Pay anyone, anywhere. Settle in half a second." — Two lines, 4.5rem, 800 weight. "Half a second" in \--accent color. |
| **Subheadline** | "The global payroll platform that moves money at the speed of blockchain — with the compliance of Stripe." — 1.25rem, \--text-secondary. |
| **CTA row** | Primary: "Get Started Free" (accent button, large, shadow-accent glow). Secondary: "See how it works →" (ghost button, large). |
| **Social proof strip** | "Trusted by teams across 40+ countries" — row of 5 generic company logos (use placeholder SVGs). Muted opacity. |
| **Hero visual** | Animated dashboard mockup (screenshot or illustrated). Shows: Treasury card ticking up, employee list, "Payroll run confirmed — 0.4s" toast. Right side of viewport on desktop. Full-width below on mobile. |

## **6.3 Problem Section ("The Old Way Costs You")**

Background: \--bg-surface (slightly lighter). Section padding: 96px vertical.

| Label | "THE PROBLEM" — all caps, \--text-muted, small, spaced |
| :---- | :---- |
| **Headline** | "International payroll is bleeding your business." — 2.25rem, 700 weight |
| **Stat cards (3-col grid)** | Card 1: "$47 average cost per international wire" | Card 2: "2–5 business days to settle" | Card 3: "6.2% average FX fees on transfers" |
| **Each stat card** | Large number in \--status-error color. Short label below. 1-line explanation. Source in tiny \--text-muted. |
| **Transition copy** | "There is a better way." — centered below, italic, \--accent color, links to next section. |

## **6.4 Solution Section ("The Remlo Way")**

Background: \--bg-base. Left-right alternating feature \+ visual blocks (2-column layout).

| Section label | "THE SOLUTION" |
| :---- | :---- |
| **Section headline** | "Global payroll that feels like sending a Venmo." |
| **Feature block 1 (left text, right visual)** | Title: "Instant Settlement" | Body: "Payroll runs confirm in under 0.5 seconds on Tempo — the only blockchain built exclusively for payments." | Visual: Animated timeline showing 0s → 0.4s "Confirmed" vs traditional 1–5 days. |
| **Feature block 2 (right text, left visual)** | Title: "Gasless for Everyone" | Body: "Employees never touch crypto, buy tokens, or manage wallets. They receive an email, set a PIN, and get a Visa card. Done." | Visual: Phone screen showing employee getting paid, swiping Visa card at coffee shop. |
| **Feature block 3 (left text, right visual)** | Title: "Compliance Built In" | Body: "Every payment is screened against OFAC sanctions lists at the protocol level. You get a clean audit trail automatically." | Visual: Compliance checklist with green checkmarks: KYC verified, OFAC clear, ISO 20022 memo. |
| **Feature block 4 (right text, left visual)** | Title: "Your Treasury Earns Yield" | Body: "Idle payroll funds earn 3.5%+ APY from US Treasury reserves. Pass yield to employees or keep it — you decide." | Visual: Simple chart showing flat bank APY (0.5%) vs Remlo APY (3.7%). |

## **6.5 How It Works Section**

Background: \--bg-subtle. 4-step horizontal flow. Desktop: left-to-right with connecting lines. Mobile: vertical.

| Section headline | "From signup to first payroll in 15 minutes." |
| :---- | :---- |
| **Step 1** | Number: "01" (large, muted). Icon: Building2. Title: "Connect your company". Body: "Register, verify your business, and link your bank account through Stripe." |
| **Step 2** | Number: "02". Icon: Users. Title: "Add your team". Body: "Upload a CSV or add employees one by one. They get an email invite and set up their account." |
| **Step 3** | Number: "03". Icon: Send. Title: "Run payroll". Body: "Select employees, set amounts, click confirm. Payroll settles in under a second." |
| **Step 4** | Number: "04". Icon: CreditCard. Title: "Team gets paid". Body: "Funds hit employee wallets instantly. They spend via Visa card or off-ramp to their local bank." |
| **CTA** | Button: "Start your free trial →" centered below steps. |

## **6.6 Comparison Table Section**

Background: \--bg-base. Full-width table comparison.

| Section headline | "Remlo vs the alternatives." |
| :---- | :---- |
| **Table headers** | Feature | Remlo | Deel | Bitwage | Wire Transfer |
| **Table rows (features)** | Settlement speed | Under 1 second | 1–5 days | 1–3 days | 1–5 days  Transaction cost | \< $0.01 | $5–$25 | 1% fee | $25–$75  FX fee | 0% | 0.5–2% | 0.5% | 1–3%  Visa cards for employees | ✓ | ✗ | ✗ | ✗  Yield on treasury | 3.5%+ APY | ✗ | ✗ | ✗  Compliance built-in | On-chain | Manual | Manual | Manual  Coverage | 120+ countries | 150+ | 100+ | 200+  No crypto knowledge needed | ✓ | ✓ | ✗ | ✓ |
| **Visual cue** | Remlo column has accent background \+ checkmarks in \--status-success. Others have plain background. |

## **6.7 Testimonials / Social Proof Section**

3 quotes in card grid. Use placeholder names for hackathon. Structure each: Pull quote → name, role, company. Company logo placeholder.

## **6.8 Pricing Section**

| Section headline | "Simple, transparent pricing." |
| :---- | :---- |
| **Plan 1: Starter** | "$0/mo" — Up to 10 employees, manual payroll, basic compliance, Visa cards. CTA: "Start Free" |
| **Plan 2: Growth (highlighted)** | "$199/mo" — Up to 100 employees, scheduled payroll, yield routing, API access. CTA: "Start Free Trial" |
| **Plan 3: Enterprise** | "Custom" — Unlimited employees, custom contracts, dedicated support, SLA. CTA: "Contact Sales" |
| **Fine print** | "All plans include unlimited payroll transactions at \<$0.01 each. No hidden fees." |

## **6.9 FAQ Section**

| Q: Is Remlo safe for my employees? | A: Yes. Employee funds are custodied by Stripe Bridge, which holds full financial regulatory licenses across 170+ countries. FDIC-equivalent protections apply to USD reserves. |
| :---- | :---- |
| **Q: Do my employees need a crypto wallet?** | A: No. Employees sign up with an email address. Their wallet is created automatically in the background. They never see a seed phrase or manage tokens. |
| **Q: What currencies do you support?** | A: Payroll is denominated in USD. Employees can off-ramp to local currency bank accounts via ACH (US), SEPA (EU), SPEI (Mexico), and PIX (Brazil). |
| **Q: What happens if a transaction fails?** | A: Tempo's Simplex BFT consensus means transactions either finalize in 0.5s or are rejected immediately — no stuck pending states. Failed transactions are automatically retried or flagged with full details. |
| **Q: Is Remlo compliant with labor laws?** | A: Remlo handles the payment rails. You remain responsible for labor law compliance in each jurisdiction. We recommend structuring stablecoin payroll as an optional settlement preference for employees. |

## **6.10 Footer**

| Left col | Remlo logo \+ tagline: "Pay faster. Earn more. Settle anywhere."  © 2026 Remlo, Inc. |
| :---- | :---- |
| **Col 2: Product** | Features | Pricing | Changelog | Status |
| **Col 3: Company** | About | Blog | Careers | Press |
| **Col 4: Legal** | Privacy Policy | Terms of Service | Cookie Policy |
| **Bottom bar** | Social links (X/Twitter, LinkedIn, GitHub). Built on Tempo badge. Stripe Partner badge. |

# **7\. Application Pages — Wireframe Specifications**

## **7.1 Login Page (/login)**

| Layout | Centered card on full-screen background. Split layout on desktop: left \= brand/value prop, right \= login form. |
| :---- | :---- |
| **Left panel** | Dark background. Remlo logo. Tagline. 3 bullet points: "Pay globally", "Settle in 0.5s", "Earn yield". Small testimonial at bottom. |
| **Right panel** | White card (or \--bg-surface in dark mode). Title: "Welcome back". Subtitle: "Sign in to your account." |
| **Login options** | 1\. Email input \+ "Continue with Email" button (Privy sends magic link). 2\. "Continue with Phone" option. 3\. "Use Passkey" for returning users. |
| **Link** | "New to Remlo? Start free →" at bottom. |
| **State: OTP entry** | After email submit, shows 6-digit OTP input with 30s resend timer. |

## **7.2 Employer Dashboard Overview (/dashboard)**

| Page layout | SectionHeader ("Good morning, \[Company Name\]" \+ date). 4 metric cards top row. Two-column grid below. |
| :---- | :---- |
| **Metric card 1** | Treasury Balance. Large number. Currency label. "↑ $X deposited this month" in green below. DepositPanel trigger button. |
| **Metric card 2** | Last Payroll Run. Date, employee count, total amount. Status badge. "View details →" link. |
| **Metric card 3** | Team Size. Employee count with wallet status breakdown: X active wallets, X pending setup. "Manage team →" link. |
| **Metric card 4** | Yield Earned (This Month). APY badge. Total earned. Yield model label (e.g. "Employer keeps"). "Configure →" link. |
| **Left column (2/3 width)** | Recent Payroll Runs: last 5 PayrollRunCards. "View all →" footer link. |
| **Right column (1/3 width)** | Team Compliance Status: donut chart (verified/pending/blocked). Quick action: "Run Payroll" prominent button. |
| **Bottom row** | Treasury Activity chart: 30-day bar chart of deposits and payroll outflows. Recharts BarChart. |

## **7.3 Team Management (/dashboard/team)**

| Page header | SectionHeader: "Team" \+ employee count badge. Right: "Add Employee" button (opens add flow) \+ "Upload CSV" button. |
| :---- | :---- |
| **Filters bar** | Search input \+ Filter dropdown (department, status, wallet status) \+ Column visibility button. |
| **EmployeeTable** | Columns: \[checkbox, avatar+name, country flag+country, job title, salary, wallet status, compliance, last paid, actions\]. Sortable columns. Row click → /dashboard/team/\[id\]. |
| **Row actions dropdown** | "View Details", "Edit Salary", "Pause Payments", "Remove" — with confirm dialog for destructive actions. |
| **Empty state** | If 0 employees: Illustration of people silhouette. "Add your first team member". "Add Employee" \+ "Upload CSV" buttons. |
| **CSV upload modal** | 1\. Drag and drop zone. 2\. Column mapper (map CSV headers to fields). 3\. Preview table (first 5 rows). 4\. Validate \+ Import. Shows error rows highlighted. |

## **7.4 Employee Detail (/dashboard/team/\[id\])**

| Header | Avatar \+ name \+ job title \+ country. Right: Status badge \+ actions dropdown ("Edit", "Pause", "Remove"). |
| :---- | :---- |
| **3-tab layout** | Tab 1: Overview | Tab 2: Payment History | Tab 3: Compliance |
| **Overview tab** | Grid: Wallet (AddressDisplay \+ GasSponsored chip \+ "Funded by employer" label). Salary (current amount, frequency, stream start date). Visa Card (VisaCardDisplay or "Not issued" state with issue button). Bank Account (connected bank or "Not connected"). |
| **Payment History tab** | Table: date, amount, memo (decoded), tx hash (AddressDisplay), status badge. Pagination. |
| **Compliance tab** | KYC status \+ verification date \+ Bridge customer ID. TIP-403 policy status. Flag for manual review button (platform admin only). |

## **7.5 New Payroll Run (/dashboard/payroll/new)**

| Wizard wrapper | Progress bar at top showing 4 steps. Step labels: "1 Select" | "2 Amounts" | "3 Review" | "4 Confirm". Previous/Next navigation at bottom of each step. |
| :---- | :---- |
| **Step 1 — Select Employees** | EmployeeTable with checkboxes only. "Select All" toggle. Shows: avatar, name, last paid, current salary. Minimum 1 employee selected to proceed. |
| **Step 2 — Set Amounts** | Table of selected employees with editable amount column. Default: current salary. Options: "Use salary" | "Custom amount" per row. Total displayed at bottom prominently. |
| **Step 3 — Review** | Read-only review table. Summary card: total amount, employee count, estimated fee (\<$0.01), estimated settlement time (\< 1 second). Memo hash preview (expandable). GasSponsored chip. "Edit" links back to steps 1/2. |
| **Step 4 — Confirm** | WalletConnect if not connected. "Authorize Payroll" button (opens Privy modal if passkey). During execution: BatchProgress component. On success: TxStatus with explorer link \+ confetti \+ "View Payroll Run" button. |

## **7.6 Treasury (/dashboard/treasury)**

| Page layout | TreasuryCard (full width, prominent). Row: YieldCard \+ upcoming payroll obligations. Full-width TxHistoryTable below. |
| :---- | :---- |
| **TreasuryCard** | Available balance (large, monospace). Locked (in pending payroll). Total with both. "Deposit Funds" primary button → DepositPanel sheet. |
| **DepositPanel content** | Tab 1: Bank Transfer. Shows: Account Number, Routing Number, Bank Name (from Bridge virtual account). Copy buttons. Note: "Funds arrive in 1–3 business days". Tab 2: Crypto. Shows: Wallet address for direct stablecoin deposits. |
| **YieldCard** | Shows current APY, total earned all-time, this month, projected year-end. Yield model select. "Configure" → settings. |
| **TxHistoryTable** | Date | Type (Deposit/Payroll/Yield) | Amount | Status | Reference. Full pagination. |

## **7.7 Compliance (/dashboard/compliance)**

| Page layout | Summary cards row. TIP-403 policy panel. Employee compliance table. |
| :---- | :---- |
| **Summary cards** | 3 cards: Total Verified employees (green), Pending KYC (amber), Action Required (red). |
| **TIP-403 Policy panel** | Shows policy ID (on-chain), type (BLACKLIST), last updated. "View on Tempo Explorer" link. Count of blocked addresses. Admin-only: "Add Address to Blocklist" action. |
| **Compliance table** | Columns: employee name, KYC provider (Bridge), KYC status, verification date, policy check result, last checked. "Refresh" action per row. "Flag for Review" action. |
| **Audit log** | Expandable panel at bottom: timestamped log of all compliance events (KYC passed, policy updated, blocked transfer). |

## **7.8 Employee Portal Home (/portal)**

| Layout | Simplified single-column layout. EmployeeTopNav. Max 640px centered content on desktop. |
| :---- | :---- |
| **Greeting** | "Good morning, \[First Name\]." Subtitle: "\[Company Name\] payroll" |
| **Balance card** | Large: current wallet balance. Currency label. "Last paid: \[date\]" below. If yield-sharing enabled: "Earning X% APY" chip. Two buttons: "View Card" \+ "Send to Bank". |
| **Last Payment** | Card: amount, date, decoded memo (shows: "March 2026 Salary – Engineering"), TxStatus chip. |
| **Quick Actions** | Grid of 2–4 action tiles: "View Payments", "Manage Card", "Off-ramp to Bank", "View Wallet" (last one hidden by default unless user enabled advanced mode). |
| **If streaming salary** | BalanceTicker component showing real-time earnings ticking up. "Earning $X.XX right now". |

## **7.9 Employee Payments (/portal/payments)**

| Layout | SectionHeader: "Payment History". Filters: date range \+ search. |
| :---- | :---- |
| **Payments list** | Card per payment (not table — cards are friendlier on mobile). Each card: amount (large), date, decoded memo (e.g. "March Salary"), status badge, "View details" expandable. |
| **Expanded detail** | Shows: transaction hash (abbreviated, copy \+ explorer link), block number, settlement time ("Confirmed in 0.4s"), full memo decoded, payslip download (PDF if uploaded by employer). |

## **7.10 Employee Visa Card (/portal/card)**

| Layout | VisaCardDisplay at top (stylized card visual). Below: stats \+ recent transactions. |
| :---- | :---- |
| **Card display** | Dark card with subtle gradient. Last 4 digits. Employee name. "Virtual" label. Balance below card. |
| **Actions** | "Freeze Card" toggle \+ "View PIN" (if applicable) \+ "Report Lost" link. |
| **Transactions section** | CardTransactions table. Merchant name, amount, date, category icon (food/transport/retail/etc). |
| **Off-ramp CTA** | Persistent "Transfer to Bank" button at bottom. Opens OffRampPanel sheet. |
| **OffRampPanel** | Amount input. Connected bank account display (or "Add bank" if none). "Transfer Now" button. Bridge transfer status tracking. |

## **7.11 Employee Settings (/portal/settings)**

| Sections | 4 sections within a single-page settings layout (no nested routing): Profile, Bank Account, Notifications, Security. |
| :---- | :---- |
| **Profile** | Read-only: name, email, company, job title. Editable: preferred name, phone, address. |
| **Bank Account** | Connected bank display or "Connect Bank" CTA. Bridge bank account connection flow: select country → enter account details → verify micro-deposits. |
| **Notifications** | Toggle switches: "Email when paid", "Email when card used", "Weekly balance summary". SMS toggles if phone connected. |
| **Security** | Current sign-in method display. "Add Passkey" button (WebAuthn). "Revoke all sessions" danger zone. |

# **8\. Backend Architecture**

## **8.1 Next.js API Routes Structure**

All backend logic lives in /app/api/. These are Next.js Route Handlers (not pages/api). Use Edge Runtime for latency-sensitive routes.

| Route | Method | Auth Required | Description |
| :---- | :---- | :---- | :---- |
| /api/employers | POST | Yes | Create employer account, deploy PayrollTreasury contract |
| /api/employers/\[id\]/team | GET/POST | employer\_admin | List/add employees |
| /api/employers/\[id\]/payroll | POST | employer\_admin | Initiate payroll run — builds batch tx, returns unsigned calldata |
| /api/employers/\[id\]/treasury | GET | employer\_admin | Get treasury balance from contract \+ Bridge account |
| /api/employees | POST | employer\_admin | Register employee, create Bridge customer, send invite email |
| /api/employees/\[id\]/kyc | POST | employer\_admin | Generate Bridge KYC link for employee |
| /api/employees/\[id\]/card | POST | employer\_admin | Issue Bridge Visa card to employee |
| /api/webhooks/bridge | POST | Bridge sig | Handle Bridge transfer/KYC/card webhooks |
| /api/webhooks/tempo | POST | Internal | Handle Tempo block confirmation events |
| /api/transactions | GET | employer\_admin/employee | Query transaction history from DB \+ decode memos |
| /api/yield | GET | employer\_admin | Get yield earned from contract \+ Bridge USDB yield |
| /api/admin/\* | various | platform\_admin | Platform management endpoints |

## **8.2 Supabase Database Schema**

Full schema with RLS. All tables use UUID primary keys. created\_at and updated\_at on every table.

\-- EMPLOYERS

CREATE TABLE employers (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  owner\_user\_id TEXT NOT NULL, \-- Privy user ID

  company\_name TEXT NOT NULL,

  company\_size TEXT, \-- 1-10, 11-50, 51-200, 200+

  treasury\_contract TEXT, \-- deployed PayrollTreasury address

  bridge\_customer\_id TEXT, \-- Bridge KYB ID

  bridge\_virtual\_account\_id TEXT,

  tip403\_policy\_id BIGINT,

  subscription\_tier TEXT DEFAULT 'starter',

  active BOOLEAN DEFAULT true,

  created\_at TIMESTAMPTZ DEFAULT NOW(),

  updated\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- EMPLOYEES

CREATE TABLE employees (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  employer\_id UUID REFERENCES employers(id) ON DELETE CASCADE,

  user\_id TEXT, \-- Privy user ID (set after invite accepted)

  wallet\_address TEXT, \-- Tempo wallet address

  email TEXT NOT NULL,

  first\_name TEXT, last\_name TEXT,

  job\_title TEXT, department TEXT,

  country\_code CHAR(2),

  salary\_amount NUMERIC(18,6),

  salary\_currency TEXT DEFAULT 'USD',

  pay\_frequency TEXT DEFAULT 'monthly', \-- monthly|biweekly|weekly|stream

  employee\_id\_hash TEXT, \-- SHA-256 of employee record for on-chain memo

  bridge\_customer\_id TEXT,

  bridge\_card\_id TEXT,

  bridge\_bank\_account\_id TEXT,

  kyc\_status TEXT DEFAULT 'pending', \-- pending|approved|rejected|expired

  kyc\_verified\_at TIMESTAMPTZ,

  stream\_contract TEXT, \-- StreamVesting contract address if streaming

  active BOOLEAN DEFAULT true,

  invited\_at TIMESTAMPTZ,

  onboarded\_at TIMESTAMPTZ,

  created\_at TIMESTAMPTZ DEFAULT NOW(),

  updated\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- PAYROLL RUNS

CREATE TABLE payroll\_runs (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  employer\_id UUID REFERENCES employers(id),

  status TEXT DEFAULT 'draft', \-- draft|pending|processing|completed|failed

  total\_amount NUMERIC(18,6),

  employee\_count INTEGER,

  fee\_amount NUMERIC(18,6) DEFAULT 0,

  token\_address TEXT DEFAULT '0x20c0000000000000000000000000000000000000',

  tx\_hash TEXT,

  block\_number BIGINT,

  finalized\_at TIMESTAMPTZ,

  settlement\_time\_ms INTEGER, \-- actual settlement time

  created\_by TEXT, \-- Privy user ID

  created\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- INDIVIDUAL PAYMENT ITEMS

CREATE TABLE payment\_items (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  payroll\_run\_id UUID REFERENCES payroll\_runs(id),

  employee\_id UUID REFERENCES employees(id),

  amount NUMERIC(18,6) NOT NULL,

  memo\_bytes BYTEA, \-- 32-byte TIP-20 memo

  memo\_decoded JSONB, \-- parsed: {employer\_id, employee\_id, period, cost\_center, hash}

  status TEXT DEFAULT 'pending', \-- pending|confirmed|failed

  tx\_hash TEXT,

  created\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- COMPLIANCE EVENTS

CREATE TABLE compliance\_events (

  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

  employer\_id UUID REFERENCES employers(id),

  employee\_id UUID REFERENCES employees(id),

  event\_type TEXT, \-- kyc\_approved|kyc\_rejected|policy\_blocked|manual\_flag

  description TEXT,

  metadata JSONB,

  created\_at TIMESTAMPTZ DEFAULT NOW()

);

## **8.3 Row Level Security Policies**

* employers: owners can SELECT/UPDATE their own row. Service role can INSERT.

* employees: employer owners can SELECT/UPDATE/DELETE employees in their employer. Employees can SELECT their own row.

* payroll\_runs: employer owners can SELECT/INSERT/UPDATE. Employees cannot access.

* payment\_items: employer owners can SELECT all. Employees can SELECT WHERE employee\_id \= their own.

* compliance\_events: employer owners SELECT only. No employee access. Service role INSERT.

## **8.4 Key Business Logic (Server Actions / API Route Logic)**

### **Payroll Run Execution Logic**

1. Validate: check employer treasury balance \>= total payroll amount.

2. Validate: check all employee wallets are registered and pass TIP-403 isAuthorized check.

3. Build calldata: encode PayrollBatcher.executeBatchPayroll(recipients\[\], amounts\[\], memos\[\]) using viem.

4. Return unsigned calldata to frontend for employer wallet signature.

5. Frontend sends TempoTransaction with call batching (approve \+ execute) via Privy wallet.

6. Poll for tx confirmation via eth\_getTransactionReceipt on Tempo RPC.

7. On confirmation: update payroll\_run status to "completed", insert payment\_items, emit webhook.

### **Employee Onboarding Logic**

8. Employer adds employee (email, name, job title, salary).

9. System creates Supabase employee record with status "invited".

10. System calls Bridge POST /v0/kyc\_links → returns hosted KYC URL.

11. System sends email via Supabase Edge Function (Resend or SendGrid) with invite link.

12. Employee clicks link → /invite/\[token\] → Privy authentication (email/SMS/passkey).

13. Privy creates embedded Tempo wallet for employee.

14. System updates employee.wallet\_address and employee.user\_id.

15. Bridge KYC webhook fires → update employee.kyc\_status.

16. On kyc\_status \= "approved" → system calls Bridge POST /v0/customers/{id}/card\_accounts → issues Visa card.

## **8.5 Environment Variables**

| Variable | Location | Description |
| :---- | :---- | :---- |
| NEXT\_PUBLIC\_TEMPO\_RPC | .env.local | https://rpc.moderato.tempo.xyz |
| NEXT\_PUBLIC\_TEMPO\_CHAIN\_ID | .env.local | 42431 |
| NEXT\_PUBLIC\_PRIVY\_APP\_ID | .env.local | Privy app ID from dashboard.privy.io |
| NEXT\_PUBLIC\_SUPABASE\_URL | .env.local | Supabase project URL |
| NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY | .env.local | Supabase anon key (public) |
| SUPABASE\_SERVICE\_KEY | .env.local (server only) | Supabase service key — never expose to client |
| BRIDGE\_API\_KEY | .env.local (server only) | Bridge API key — never expose to client |
| BRIDGE\_WEBHOOK\_SECRET | .env.local (server only) | Bridge webhook signature verification key |
| NEXT\_PUBLIC\_PAYROLL\_TREASURY | .env.local | Deployed PayrollTreasury contract address |
| NEXT\_PUBLIC\_PAYROLL\_BATCHER | .env.local | Deployed PayrollBatcher contract address |
| NEXT\_PUBLIC\_EMPLOYEE\_REGISTRY | .env.local | Deployed EmployeeRegistry contract address |
| RESEND\_API\_KEY | .env.local (server only) | Email sending API key |

# **9\. Blockchain & Wallet Layer — Chain Abstraction**

## **9.1 The Chain Abstraction Principle**

| The blockchain layer must be INVISIBLE to non-crypto users. An employee should be able to receive a payment, view their balance, and swipe their Visa card without knowing that Tempo exists. The employer should be able to run payroll without understanding what a block confirmation is. Chain abstraction is not just a feature — it is the fundamental UX contract of Remlo. |
| :---- |

## **9.2 Privy Wallet Configuration**

Configure Privy to create embedded Tempo wallets for all users. Store the Privy client in /lib/privy.ts.

// lib/privy.ts

export const tempoChain \= {

  id: 42431,

  name: "Tempo Moderato",

  network: "tempo-moderato",

  nativeCurrency: { name: "USD", symbol: "USD", decimals: 6 },

  rpcUrls: { default: { http: \["https://rpc.moderato.tempo.xyz"\] } },

  blockExplorers: { default: { name: "Tempo Explorer", url: "https://explore.tempo.xyz" } }

};

// PrivyProvider config:

config={{

  defaultChain: tempoChain,

  supportedChains: \[tempoChain\],

  loginMethods: \["email", "sms", "passkey"\],

  appearance: { theme: "dark", accentColor: "\#059669" },

  embeddedWallets: {

    createOnLogin: "users-without-wallets",

    requireUserPasswordOnCreate: false

  }

}}

## **9.3 Transaction Flow (from employer perspective)**

### **Run Payroll — User sees:**

17. "Review your payroll" → sees employee list \+ amounts \+ total → "Confirm & Send" button.

18. Click "Confirm & Send" → Privy modal appears: "Authorize Payroll of $X,XXX.XX" → biometric/PIN prompt.

19. Modal closes. Screen shows: animated progress "Processing payroll..." with employee names appearing with green checkmarks.

20. "Payroll complete\! 47 employees paid in 0.4 seconds." → confetti. "View Report" button.

### **What actually happens (hidden from user):**

21. Employer wallet signs TempoTransaction Type 0x76 with call batch: \[approve(BATCHER, totalAmount), executeBatchPayroll(recipients, amounts, memos)\].

22. Fee payer field set to employer treasury sponsorship wallet — employees pay no gas.

23. 2D nonce key used so concurrent payroll agents don't block each other.

24. Simplex BFT finalizes in \~0.4-0.5s. eth\_getTransactionReceipt returns immediately.

25. PayrollBatcher emits PayrollBatchExecuted event. Backend indexes event, updates DB.

## **9.4 Gasless UX Implementation**

Employer pre-deposits a gas budget into PayrollTreasury (separate from payroll funds). For employee transactions (viewing balance, off-ramping), the platform sponsors gas via the public testnet sponsor endpoint.

// For testnet: use public fee sponsor

const SPONSOR\_URL \= "https://sponsor.moderato.tempo.xyz";

// For production: platform maintains a gas sponsorship wallet

// Employer deploys PayrollTreasury with gas budget parameter

// gasSponsored bool field in TempoTransaction envelope \= true

## **9.5 Progressive Disclosure for Crypto-Native Users**

The UI has two modes: Simple (default) and Advanced (toggled in settings). Crypto-native users can enable Advanced Mode to see:

* Full wallet addresses (not truncated) with copy and Explorer links

* Raw transaction hashes

* ISO 20022 memo fields decoded and displayed

* Block number and finality timestamp

* Contract addresses for PayrollTreasury, Batcher, Registry

* TIP-403 policy ID and on-chain compliance status

Advanced mode toggle lives in employer settings and employee portal settings. Default: OFF. This is the "progressive disclosure" pattern for chain abstraction.

## **9.6 Error States — Blockchain-Specific**

| Error Type | User-Facing Message | Technical Cause |
| :---- | :---- | :---- |
| Insufficient treasury | "Not enough funds in treasury to run payroll. Deposit $X,XXX.XX to proceed." | PayrollTreasury balance \< total payroll amount |
| Compliance blocked | "\[Employee Name\]'s payment was blocked by compliance screening. Contact support." | TIP-403 isAuthorized returned false |
| Wallet not set up | "\[Employee Name\] hasn't set up their account yet. Resend invite?" | employee.wallet\_address is null |
| Transaction failed | "Payroll could not be submitted. Please try again." | Transaction reverted on Tempo |
| Network issue | "Connection to payment network temporarily unavailable. Retrying..." | Tempo RPC timeout or 5xx error |

# **10\. AI Tooling and Automation Integration**

## **10.1 AI Features to Build (In Priority Order)**

| Feature | Priority | Implementation | Placement |
| :---- | :---- | :---- | :---- |
| Smart CSV import | P0 | Claude API — parse messy CSV headers, suggest field mappings, validate country codes | Team add → CSV upload step 2 |
| Payroll anomaly detection | P1 | Claude API — flag unusual amounts (\>2x previous), new employee first payment, blocked wallet | Payroll wizard step 3 review |
| Compliance explanation | P1 | Claude API — explain why an employee was compliance-flagged in plain English | Employee detail → compliance tab |
| Treasury optimization | P2 | Claude API — suggest optimal payroll timing to maximize yield capture | Treasury page sidebar |
| Payment memo parser | P0 | Client-side — decode 32-byte TIP-20 memo into human-readable fields | All payment history views |

## **10.2 Claude API Integration Pattern**

All AI features call the Claude API from Next.js API routes. Never from client components. Rate limit and cache responses.

// app/api/ai/parse-csv/route.ts

const response \= await fetch("https://api.anthropic.com/v1/messages", {

  method: "POST",

  headers: { "Content-Type": "application/json", "x-api-key": process.env.CLAUDE\_API\_KEY },

  body: JSON.stringify({

    model: "claude-sonnet-4-20250514",

    max\_tokens: 1024,

    system: "You are a payroll data assistant. Parse CSV headers and map to fields: email, first\_name, last\_name, job\_title, salary, country\_code.",

    messages: \[{ role: "user", content: \`CSV headers: ${headers.join(",")}. Return JSON mapping.\` }\]

  })

});

## **10.3 Automation with 2D Nonces (Payroll Agent)**

For employers who want fully automated scheduled payroll:

* Platform registers a payroll automation agent Access Key per employer via the Account Keychain precompile.

* Access Key has spending limits (max $X per execution), expiry (monthly rotation), and is scoped to the PayrollBatcher contract only.

* Supabase Edge Function (cron) runs on payroll schedule, builds and signs transactions using the agent key.

* Agent uses nonce\_key \= 1 to avoid conflicts with employer manual transactions (nonce\_key \= 0).

# **11\. LLM Agent Task Breakdown — Build Order**

| AGENT INSTRUCTION: Build in the exact order listed. Each task is atomic — complete it fully before moving to the next. After each task, verify: (1) TypeScript compiles with no errors, (2) the page/component renders without runtime errors, (3) all imports are resolved. Tasks marked \[BLOCKER\] must complete before any tasks that depend on them. |
| :---- |

## **Phase 0: Foundation (Tasks 1–5)**

| Task | Description | Files to create/modify | Depends on |
| :---- | :---- | :---- | :---- |
| T01 \[BLOCKER\] | Next.js 15 project setup with TypeScript, Tailwind, App Router | /package.json, /tsconfig.json, /tailwind.config.ts | None |
| T02 \[BLOCKER\] | Design tokens — implement all CSS variables from Section 3.2 in globals.css. Configure Geist font via next/font. Add dark mode class toggle. | /app/globals.css, /app/layout.tsx | T01 |
| T03 \[BLOCKER\] | Install and configure shadcn/ui. Run: npx shadcn@latest init. Add: button, input, card, badge, dialog, sheet, tabs, select, dropdown-menu, table, tooltip, skeleton, progress, avatar, separator, sonner. | /components/ui/\* | T02 |
| T04 \[BLOCKER\] | Supabase setup: create project, run SQL schema from Section 8.2, configure RLS from Section 8.3, add Supabase client to /lib/supabase.ts (client \+ server variants). | /lib/supabase.ts, /lib/supabase-server.ts | T01 |
| T05 \[BLOCKER\] | Privy SDK setup: install @privy-io/react-auth, configure PrivyProvider in app/layout.tsx with Tempo chain config from Section 9.2. Create /lib/privy.ts with tempoChain definition. | /lib/privy.ts, /app/layout.tsx | T01 |

## **Phase 1: Auth Layer (Tasks 6–9)**

| Task | Description | Files to create/modify | Depends on |
| :---- | :---- | :---- | :---- |
| T06 | Create auth middleware.ts for role-based routing guards as specified in Section 4.3 | /middleware.ts | T04, T05 |
| T07 | Build Login page (/login) with Privy email/SMS/passkey auth as specified in Section 7.1 | /app/(auth)/login/page.tsx | T05, T06 |
| T08 | Build invite acceptance page (/invite/\[token\]). On load: verify token in DB, redirect to Privy auth, on auth create wallet, update employee record. | /app/(auth)/invite/\[token\]/page.tsx | T07 |
| T09 | Build employer registration wizard (/register): company name, size, email. Create employer record in Supabase. Redirect to /dashboard. | /app/(auth)/register/page.tsx | T07 |

## **Phase 2: Layout Shells (Tasks 10–13)**

| Task | Description | Files to create/modify | Depends on |
| :---- | :---- | :---- | :---- |
| T10 | Build EmployerLayout: EmployerSidebar (nav links per Section 4\) \+ EmployerHeader. Responsive: sidebar collapses to icon-only at \<1280px, hidden at \<768px with hamburger. | /app/(employer)/layout.tsx, /components/layout/EmployerSidebar.tsx, /components/layout/EmployerHeader.tsx | T03, T06 |
| T11 | Build EmployeeLayout: EmployeeTopNav \+ BottomTabNav (mobile only, 4 tabs). Responsive max-640px content. | /app/(employee)/layout.tsx, /components/layout/EmployeeTopNav.tsx, /components/layout/BottomTabNav.tsx | T03, T06 |
| T12 | Build EmptyState, PageContainer, SectionHeader, ConfirmDialog layout components. | /components/layout/\*.tsx | T03 |
| T13 | Create loading.tsx and error.tsx for all major routes. Use Skeleton components. | /app/(employer)/dashboard/loading.tsx \+ error.tsx, equivalent for (employee) | T10, T11 |

## **Phase 3: Core Domain Components (Tasks 14–20)**

| Task | Description | Key components | Depends on |
| :---- | :---- | :---- | :---- |
| T14 | Build all wallet/blockchain display components: AddressDisplay, TxStatus, GasSponsored chip, ChainBadge. | /components/wallet/\*.tsx | T05 |
| T15 | Build status components: ComplianceBadge, WalletStatus, PayrollBadge. | /components/employee/ComplianceBadge.tsx, etc. | T03 |
| T16 | Build DataTable with TanStack Table v8, sort/filter/pagination, row selection. | /components/ui/DataTable.tsx | T03 |
| T17 | Build EmployeeTable with all columns from Section 7.3 spec. | /components/employee/EmployeeTable.tsx | T16 |
| T18 | Build TreasuryCard, YieldCard, DepositPanel, BalanceTicker components. | /components/treasury/\*.tsx | T03 |
| T19 | Build VisaCardDisplay, CardTransactions, OffRampPanel. | /components/card/\*.tsx | T03 |
| T20 | Build MemoDecoder utility and component. Implement 32-byte ISO 20022 parsing from Section 4 of the main build guide. | /lib/memo.ts, /components/payroll/MemoDecoder.tsx | T01 |

## **Phase 4: Backend API Routes (Tasks 21–26)**

| Task | Description | Files | Depends on |
| :---- | :---- | :---- | :---- |
| T21 \[BLOCKER\] | Deploy smart contracts to Tempo Moderato testnet using Foundry. Output: contract addresses for Treasury, Batcher, Registry. Update .env.local. | Solidity contracts from main build guide. Foundry setup. | T01 |
| T22 | Build /api/employers endpoints: POST (create employer, save to Supabase). | /app/api/employers/route.ts | T04, T21 |
| T23 | Build /api/employees endpoints: POST (create employee, trigger Bridge KYC, send invite email). | /app/api/employees/route.ts | T22 |
| T24 \[BLOCKER\] | Build /api/payroll endpoint: validates balances, builds batch tx calldata, returns to frontend. | /app/api/employers/\[id\]/payroll/route.ts | T21, T22 |
| T25 | Build /api/webhooks/bridge: verify signature, handle transfer/kyc/card events, update Supabase. | /app/api/webhooks/bridge/route.ts | T04 |
| T26 | Build /api/transactions: query payment\_items with decoded memos, paginated. | /app/api/transactions/route.ts | T04 |

## **Phase 5: Employer Dashboard Pages (Tasks 27–34)**

| Task | Description | Route | Depends on |
| :---- | :---- | :---- | :---- |
| T27 | Employer Dashboard Overview page per Section 7.2. Use mock data first, wire to API in T31. | /dashboard | T10, T18 |
| T28 | Team Management page per Section 7.3. EmployeeTable, CSV upload modal. | /dashboard/team | T17 |
| T29 | Employee Detail page per Section 7.4. 3-tab layout. | /dashboard/team/\[id\] | T28 |
| T30 | Payroll Wizard (4-step) per Section 7.5. PayrollWizard, all 4 steps including TempoTransaction execution. | /dashboard/payroll/new | T24 |
| T31 | Treasury page per Section 7.6. Wire DepositPanel to Bridge virtual account API. | /dashboard/treasury | T18, T22 |
| T32 | Compliance page per Section 7.7. TIP-403 integration. | /dashboard/compliance | T25 |
| T33 | Settings page. Company info, team role management, subscription. | /dashboard/settings | T10 |
| T34 | Wire all dashboard pages to real API data. Replace all mock data. | All dashboard pages | T22-T26 |

## **Phase 6: Employee Portal (Tasks 35–40)**

| Task | Description | Route | Depends on |
| :---- | :---- | :---- | :---- |
| T35 | Employee Portal home per Section 7.8. Balance card, last payment, quick actions. | /portal | T11, T26 |
| T36 | Payment History per Section 7.9. Card list with decoded memos. | /portal/payments | T26 |
| T37 | Visa Card page per Section 7.10. VisaCardDisplay, CardTransactions, OffRampPanel. | /portal/card | T19 |
| T38 | Employee settings per Section 7.11. Profile, bank account, notifications. | /portal/settings | T11 |
| T39 | Wire employee portal to real data from Supabase and Bridge API. | All portal pages | T35-T38 |
| T40 | Implement BalanceTicker real-time component if streaming salary enabled. | /components/treasury/BalanceTicker.tsx | T35 |

## **Phase 7: Landing Page (Tasks 41–44)**

| Task | Description | Files | Depends on |
| :---- | :---- | :---- | :---- |
| T41 | Build PublicLayout with transparent-to-solid navbar and footer per Section 6.10. | /app/(public)/layout.tsx, /components/layout/PublicNav.tsx | T02 |
| T42 | Build Hero \+ Problem \+ Solution sections per Section 6.2-6.4. Use Framer Motion for animations. | /app/(public)/page.tsx (sections 1-3) | T41 |
| T43 | Build How It Works \+ Comparison \+ Testimonials \+ Pricing \+ FAQ sections per Sections 6.5-6.9. | /app/(public)/page.tsx (sections 4-8) | T41 |
| T44 | Animation pass: staggered reveal on scroll, hero visual, number counters, mesh gradient background. | Landing page animations | T42, T43 |

## **Phase 8: Polish and Demo Prep (Tasks 45–48)**

| Task | Description | Priority |
| :---- | :---- | :---- |
| T45 | End-to-end test: register employer → add employee via CSV → deposit treasury via Bridge sandbox → run payroll → verify employee receives on Tempo → employee views payment with decoded memo. | CRITICAL |
| T46 | Mobile responsive pass: test all pages at 375px, 768px, 1280px. Fix all overflow/layout issues. | HIGH |
| T47 | Dark mode audit: verify all components render correctly in dark mode. Check all color tokens. | HIGH |
| T48 | Performance: add React.lazy for heavy components, optimize images, verify Lighthouse score \> 90\. | MEDIUM |

## **11.2 Context Budget Rules for Agent**

| AGENT RULE: If a task description references a section of this document (e.g., "per Section 7.3"), re-read that section before starting the task. Never assume — always verify the spec. If context window is approaching limit during a task, complete the current file being edited, commit the state in a summary comment at the top of the file, and stop. The next agent instance will read the summary to continue. |
| :---- |

Context management patterns:

* Each Phase should be completed in a separate agent session if context budget is a concern.

* After every task, write a 3-line summary comment in /AGENT\_PROGRESS.md: task completed, files modified, next task.

* Never write more than 200 lines of code in a single component file without extracting sub-components.

* ABIs must be in separate /lib/abis/\*.ts files. Never inline long ABI arrays in component files.

* Supabase query functions must be in /lib/queries/\*.ts files, not inline in components.

# **12\. GTM Strategy & Go-Live Checklist**

## **12.1 Hackathon Day GTM — March 19, 2026**

Demo to judges must flow: Problem → Solution → Live Demo → Architecture → Moat → Market → Ask.

### **Opening Hook (30 seconds)**

"The average CFO paid $47 to wire a salary to a contractor in the Philippines last week. It took 4 days. We just paid 47 contractors in 0.4 seconds for $0.47 total. Let me show you."

### **Live Demo Flow (3 minutes maximum)**

26. Open employer dashboard. Show treasury card with balance (pre-loaded with testnet funds).

27. Click "Run Payroll". Select 5 employees. Click through wizard to review.

28. Confirm. Show Privy auth modal (passkey on phone if possible — biometric is impressive).

29. Watch PayrollBatcher execute. Show "5 employees paid in 0.41 seconds" confirmation.

30. Switch to employee view. Show payment received with decoded memo. Show Visa card balance updated.

31. Optional: show Bridge off-ramp initiated.

### **Architecture Slide (show, not explain)**

Single diagram: Employer → Bridge (fiat deposit) → PayrollTreasury (Tempo) → PayrollBatcher → Employee Wallets → Visa Cards (Bridge) → Local Banks. Label each arrow with the technology used.

## **12.2 Post-Hackathon GTM — First 90 Days**

| Week | Activity | Target | Success Metric |
| :---- | :---- | :---- | :---- |
| 1-2 | Deploy to Tempo mainnet when available. Move Bridge to production. | Production deployment | Zero downtime deploy |
| 3-4 | Cold outreach to 20 crypto-native startups paying contractors in USDC | Design partners | 2 signed design partners |
| 5-8 | Onboard first paying employer. Run real payroll. Get testimonial. | Revenue | First $1 of revenue |
| 9-12 | Apply for Tempo ecosystem grant, Stripe partnership program, Y Combinator | Funding | At least 1 positive response |

## **12.3 Pre-Launch Checklist**

* \[ \] All environment variables set in Vercel production environment

* \[ \] Bridge API keys rotated to production (not sandbox)

* \[ \] Smart contracts deployed to Tempo mainnet (when available) and verified on Tempo Explorer

* \[ \] Supabase RLS policies audited — no data leaks between employers

* \[ \] Bridge webhook endpoint added to Bridge dashboard with correct production URL

* \[ \] Privacy Policy and Terms of Service pages live

* \[ \] Error monitoring (Sentry or Vercel monitoring) configured

* \[ \] Basic analytics (Vercel analytics or PostHog) configured

* \[ \] Test: full employer onboarding flow with real Bank of America test account

* \[ \] Test: employee invite, KYC via Bridge sandbox, wallet creation, first payment receipt

* \[ \] Load test: 50 concurrent employees in payroll batch

* \[ \] Mobile: test on iOS Safari and Android Chrome

**END OF DOCUMENT**

*Remlo Architecture Spec v1.0 · March 2026 · Confidential*