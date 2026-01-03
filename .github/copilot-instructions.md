# GitHub Copilot Instructions — Noon (Noonoman Arts)

> This file guides GitHub Copilot contributions in this repository.
> When generating or editing code, treat these instructions as top priority and keep changes consistent with the existing codebase.

## 1) Project overview and source of truth

This repository implements the **Noon** website: marketing pages plus booking/event flows and dashboards.

**Source of truth for product requirements:** `A.md`.
If anything conflicts with `A.md`, follow `A.md`.

### What the product includes (from `A.md`)

- **Header**: Logo, Login, Cart, Search, Language switch (English/Arabic), navigation menu
  - Pages: Home, About Us, Classes, Group Booking & Events, Noon Recommends, Contact Us, My Account
  - Classes submenu:
    - Cooking classes
    - Arts & crafts classes
  - Group booking & events submenu:
    - Cooking competition
    - Private classes
    - Birthday parties

- **Footer**: Logo, location, quick links (FAQs, Terms & Conditions), contact info, social links, copyright

- **Core pages**:
  - Home
  - About
  - Classes (Cooking / Arts & Crafts)
  - Group Booking & Events (Competition / Private / Birthday)
  - Noon Recommends (products + brand partners + free recipe)
  - Butter and Butter Shop (simple shop page inside Noon)
  - Customer registration flow for class bookings
  - Dashboards (Admin / Trainer / Customer)
  - WhatsApp integration requirements

## 2) Non-negotiable product details (copy these behaviors)

This section contains details that must be implemented exactly when relevant.

### Home

- **Hero**
  - Example headline: “where cooking becomes an experience.” (text may change later)
  - Background: kitchen/class photo
  - CTA button: `Explore classes`
- **Our numbers** (example values)
  - `4500+ Students Trained`
  - `200+ Classes Conducted`
  - `100+ Corporate & Private Events`
  - `7+ Years of Experience`
- **Upcoming classes**
  - Show at least 3 sessions
  - Each card: Image, Title, Date & time, Price, `Book now`
- **Why Noon**
  - 3 points, example:
    - `Expert-Led Classes`
    - `Hands-On Learning`
    - `Community-Focused`
- **Partners**
  - Short intro text + partner logos

### About

- About Noon
- Meet the founder
  - Founder photo
  - Short quote
  - Description
- What we do
  - 4–5 bullet points
- The Noon team
  - Photo + name + job title per member
- Noon trainers
  - Trainer list (photo + name)
  - Trainer details page must include:
    - Name, photo, description/bio
    - Upcoming classes (cards with `Book now`)
    - Previous classes (cards with `More details`)
- The bigger Noon family
  - Group photo
  - Text: “Behind every class and campaign is a crew of 15+ trusted freelancers…”

### Classes (Cooking / Arts & Crafts)

- Category page layout (same pattern for both):
  - Header image + title
  - Sub-sections
    - Cooking example sub-sections: Appetizers & snacks, Main dishes, desserts & baking, mum & kid
  - Each course/session card: Image, Title, Date & time, Price, `Book now`
- Class details page must include:
  - Main photo
  - Details/specs
  - Description
  - Chef/Trainer details
  - Reviews

### Group Booking & Events — Cooking competition (step-by-step flow)

- **Step 1: Gallery + Brief + Slot selection**
  - Brief describes: welcome Arabic coffee & sweets, team draw, mystery box, cook/compete, vote, announce winner
  - Slot selection: date/time from timetable
- **Step 2: Package selection + Gift add-on**
  - Standard Competition
    - Participants: 8–40
    - Groups: 2–8
    - Dishes per group: 1–2 (depends on group size)
    - Duration: 3 hours
    - Gifts: not included (available as add-on)
    - Includes: Arabic coffee & sweets, mystery box (chicken/beef/prawns), equipment & ingredients, guided by Noon team, dessert & drinks
  - Premium Competition
    - Participants: 8–40
    - Groups: 2–8
    - Dishes per group: 2–3 (depends on group size)
    - Duration: 3 hours
    - Gifts: fabric aprons for all participants (optional extra gift for winning team)
    - Includes: same as Standard
  - Gift add-on section
    - At least 3 gift options, each: Photo, description, price
    - Scope choice: `for all participants` or `winning team`
    - CTA: `Add to booking`
- **Step 3: Booking form**
  - Full Name, Email, Phone Number, Company/Group Name, Number of Participants
  - Selected Date & Time (auto-filled)
  - Special Requests/Notes
  - Submit
- **Step 4: Confirmation popup**
  - Fixed message: “Thank you for your request! Our team will review the details and contact you shortly…”

### Group Booking & Events — Private classes (Cooking / Art & craft)

- Same step-based flow structure
- Private cooking class rules:
  - Participants: 8–32
  - Stations: 1–2 people per station (depending on participant count)
  - Duration: 2–3 hours (depending on recipe)
  - Includes: Arabic coffee & sweets, equipment & ingredients, guided by Noon team
- Booking form fields include preferred dish
- Private art & craft class: same steps; packages will be provided later

### Group Booking & Events — Birthday parties (cooking class)

- Same step-based flow
- Package rules:
  - Participants: max 16
  - Stations: 1–2 people
  - Duration: 2 hours
  - Gender: girls
  - Age: 10+
  - Includes: Arabic coffee & sweets, equipment & ingredients, guided by Noon team
  - Not included: birthday decoration & gifts, birthday cake

### Noon Recommends

- Intro with photo
  - Key message: “tested in our kitchen … used in our classes …”
- Categories (examples): Pantry essentials, Baking & Pastry Tools, Cookware, …
- Product card:
  - Image
  - Why Noon recommends it
  - Badge: `(used in our classes)`
  - CTA: `Buy from` (internal or external link)
- Brand partner section (per category):
  - Only 1–2 brand partners
  - Brand logo + link
  - Photos of products used at Noon classes
  - Why Noon recommends it
  - Free recipe by Noon using their product

### Customer registration flow (for class bookings)

- Required fields:
  - First / Middle / Last name
  - Phone number
  - Email
  - Date of birth
  - Preferred language: Arabic / English
- If user is logged in: auto-fill these fields
- Options:
  - ☐ I am attending this class
  - ☐ I am registering on behalf of someone else
- If registering for someone else:
  - Show a full set of participant fields per participant
  - No shared fields (each participant must have complete info)
  - If 2 participants selected → show 2 full sets
- Mom & Kid:
  - Age calculation required (details to be finalized)
  - Separate Terms vs normal classes
- Before payment:
  - Show Terms & Conditions + checkbox confirmation (cannot proceed unless checked)

### Admin panel (high-level requirements)

- Classes
  - Add/Edit classes
  - Store financial info per workshop (exact fields TBD)
  - Manual registration of a participant into any class
  - Manual payment method: Bank transfer / Card payment / Cash payment
  - Remove participant manually
  - Cancellation by customer (emergency cases): convert paid amount into **wallet credit** (no automatic refunds)
- Reschedule/cancel
  - Reschedule: email + WhatsApp to all participants; participants remain registered unless they request otherwise
  - Cancel: notify + add full credit to wallet equal to amount paid
- Digital Loyalty
  - Digital loyalty card linked to customer account
  - Automatically add 1 stamp/point when attending a class/workshop
  - Reward eligibility at threshold
- Timetable & scheduling system
  - Central calendar covering classes, private sessions, workshops, blocked times
  - Blocking:
    - Time range or full day
    - Internal notes
    - Visibility control: Admin only OR Admin + specific Trainers
  - Customers only see available booking slots; never see internal notes or blocked reasons
  - Color-coded event types
  - **Critical rule**: after every cooking class or private cooking session, automatically add a **3-hour cleaning block**
- Group booking & events (as “orders”)
  - Each submission is an editable order
  - Must support statuses:
    - New / In Progress / Pending Client Confirmation / Client Confirmed / Pending Payment / Completed / Cancelled
  - Search/filter by date/status/event type
  - “Pending Client Confirmation” must trigger email + WhatsApp with secure link: `Complete Your Booking`
  - Customer confirmation page includes:
    - Booking summary
    - Agreement (Terms & Conditions, Cancellation policy, Payment terms)
    - Required checkbox “I agree…” + required digital signature
    - Payment method selection:
      - Online payment (redirect; auto-update status on success)
      - Bank transfer (show bank details; optional proof upload)
  - After customer confirms: auto-add to admin timetable
  - Admin can manually create a booking without customer submission

### Trainer panel (high-level requirements)

- Ongoing workshops
  - See capacity and seats
  - Submit recipe, grocery list, photos, workshop brief (visible to admin only)
  - Highlight ingredients (photo + name + where to buy)
  - Only admin can publish the final downloadable recipe for customers
- Previous workshops
  - See stats, photos, final recipe, brief, grocery list
  - Admin notes (can include photo)
  - Customer feedback
- Suggested workshops
  - Trainer can propose (name/brief/photos/recipe/notes)
  - Admin can convert suggestion into a live workshop (date/time/seats)
- Finance
  - Earnings per workshop + per month

### Customer panel (high-level requirements)

- Upcoming bookings
- History + download PDFs (e.g., recipe)
- Loyalty summary
- Wallet & payments
- Profile

### WhatsApp expectations

- WhatsApp icon visible on all pages
- WhatsApp notifications:
  - when booking a class and submitting event form
  - participant reminders (same day)
  - trainer reminders (1 day before)
  - trainer message with workshop details when made live
  - birthday message + discount voucher

### Butter and Butter Shop

- A page inside Noon (not a separate site)
- WooCommerce-like shopping UI/UX with Butter and Butter branding
- Two categories: `Sweets` and `Raw Materials`
- Product list shows: product name + price
- Product details shows: name, description, multiple photos

## 3) Tech stack and constraints (this repository)

- Next.js `16.1.1` (App Router) under `src/app`
- React `19.x`
- TypeScript with `strict: true`
- TailwindCSS `v4` (via `@import "tailwindcss"` in `src/app/globals.css`)
- ESLint 9 + `eslint-config-next`
- `sharp` for image optimization

### Key engineering rules

- **TypeScript strict**: avoid `any`; define accurate types.
- **App Router**:
  - Server Components are default.
  - Add `"use client"` only when truly needed (state, effects, browser-only APIs).
- **Tailwind-first**: implement styling primarily with Tailwind utilities; keep custom CSS minimal.
- **Do not add dependencies without clear benefit**:
  - If a new package is necessary, explain why and update `package.json`.

## 4) Repository structure conventions

Current structure is minimal; as the project grows, follow this convention:

- `src/app/**` routes and pages (App Router)
- `src/components/**` shared UI components (Header/Footer/Buttons/Forms/...)
- `src/features/**` domain modules (classes, bookings, shop, auth, dashboards)
- `src/lib/**` helpers (date, currency, i18n helpers, API clients)
- `src/types/**` shared TypeScript types
- `src/data/**` mock data for early stages

Naming:

- Components: `PascalCase.tsx`
- `lib` files: `camelCase.ts` or `kebab-case.ts` (be consistent per folder)
- Route segments: prefer `kebab-case`

## 5) UI/UX, accessibility, and content rules

- Mobile-first responsive design
- Ensure clear focus styles (`focus-visible`) for interactive elements
- Forms must have proper labels and accessible error messages
- Use `next/link` for internal navigation
- Use `next/image` for images

## 6) Internationalization: English + Arabic (RTL)

- The project must support both English and Arabic.
- Arabic must render in **RTL**.

Preferred routing approach (choose one and stay consistent):

- `src/app/(site)/[locale]/...` (recommended), or
- `src/app/(en)/...` and `src/app/(ar)/...`

Set the `<html>` attributes correctly:

- `lang="en"`, `dir="ltr"` for English
- `lang="ar"`, `dir="rtl"` for Arabic

If adding an i18n library becomes necessary, propose options and ask before introducing a dependency.

## 7) Suggested domain types (TypeScript)

In early stages define these in `src/types/*`:

- `ClassCategory`: `Cooking` | `ArtsCrafts`
- `ClassSubCategory`: e.g. `Appetizers`, `MainDishes`, `Desserts`, `MomAndKid`, ...
- `Trainer`: `id`, `name`, `photo`, `bio`, `socialLinks?`
- `ClassSession`: `id`, `title`, `category`, `subCategory`, `datetimeStart`, `durationMinutes`, `price`, `seatsTotal`, `seatsAvailable`, `trainerId`, `image`, `description`, `reviews?`
- `BookingRequest`: `id`, `type` (Competition/Private/Birthday), `status`, `selectedSlot`, `participants`, `notes`, `pricing`, `payment`
- `Participant`: `firstName`, `middleName`, `lastName`, `dob`, `preferredLanguage`
- `WalletCredit`, `Loyalty`
- `Product` (for Noon Recommends and Butter and Butter)

Store dates as ISO strings in APIs/DB. If using `Date` in UI logic, convert explicitly.

## 8) Routing suggestions (can evolve, keep consistent)

- `/` Home
- `/about` About
- `/classes`
  - `/classes/cooking`
  - `/classes/arts-crafts`
  - `/classes/[slug]` class details
- `/group-booking-events`
  - `/group-booking-events/cooking-competition`
  - `/group-booking-events/private-classes`
  - `/group-booking-events/birthday-parties`
- `/noon-recommends`
- `/shop/butter-and-butter` (or `/butter-and-butter-shop`)
- `/contact`
- `/account` and customer sub-pages
- `/admin` and `/trainer` (prefer role-based protection)

## 9) Forms, validation, and server actions

- Prefer **Server Actions** for form submissions in App Router.
- Until a validation library is approved, implement basic validation with TypeScript and clear UI errors.
- If schema validation is required, propose `zod` (with localized error messages) and ask before adding.

Key forms:

- Group booking forms (Competition / Private / Birthday)
- Class registration (self vs someone else)
- Terms & Conditions acceptance before payment
- Digital signature for group booking confirmation

## 10) Payments, WhatsApp, and security

- Never hardcode secrets in the repo.
- Implement WhatsApp/payment integrations server-side.
- Booking/payment state must be auditable (status history when introduced).

## 11) Scheduling rule (critical)

- Timetable events include: class, workshop, private, blocked, cleaning
- After each cooking class or private cooking session, add a **3-hour cleaning block** automatically

## 12) Quality gates before shipping

- `npm run lint` passes
- `npm run build` passes
- Navigation works and routes are correct
- RTL/LTR layout remains correct
- Forms display understandable validation errors

---

Repository references:

- Requirements: `A.md`
- Tooling: `package.json`
- Config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`
