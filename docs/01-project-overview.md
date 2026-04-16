# 01. Project Overview

## Purpose

`noon` is a multi-domain web platform for Noon Oman Arts. It combines:

- a public marketing website
- class discovery and booking
- group booking and event flows
- an e-commerce shop
- customer account features
- admin operations
- worker and photographer dashboards

The codebase is not a small brochure site. It is a full operational platform with public pages, authenticated dashboards, payment-related flows, notifications, content management, and business-specific back-office tooling.

## Core Technology Stack

| Layer | Current Choice |
| --- | --- |
| Frontend framework | Next.js 16.1.1 |
| UI runtime | React 19.2.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + global CSS tokens |
| Database | PostgreSQL |
| DB driver | `pg` |
| Charts/UI utilities | `recharts`, `react-icons`, `embla-carousel`, `swiper`, `overlayscrollbars` |
| Mapping | `maplibre-gl` |
| Email | `nodemailer` |
| Image processing | `sharp` |
| Deployment mode | Docker + standalone Next.js output |

## High-Level Product Areas

### Public site

- localized routes under `/[locale]`
- content pages such as home, about, contact, FAQs, terms
- class listing and booking flows
- event booking flows
- shop catalog and product pages

### Customer area

- login and registration
- WhatsApp verification
- profile and account settings
- notifications
- orders
- wallet and loyalty features

### Admin area

- analytics and finance
- class and event management
- shop and inventory management
- trainer management
- payments and wallets
- notifications, pages, recommendations, email, WhatsApp sessions/templates

### Operational roles

- `WORKER` workflows for orders, sales, print, and restock
- `PHOTOGRAPHER` workflows for tasks and schedule
- `SOCIAL_MEDIA_ADMIN` with a reduced admin surface

## Localization Model

The application currently supports two locales:

- `en`
- `ar`

Locale is part of the route structure, and the codebase includes directional support (`ltr` and `rtl`) plus bilingual labels in many server and client components.

## Architectural Style

The project follows a pragmatic monolith style:

- one repository
- one Next.js application
- one PostgreSQL database
- multiple business domains inside the same app
- shared `lib` layer for data access and business logic

This is appropriate for the current product size, but it also means maintainers need discipline around module boundaries and documentation.

## What Makes This Codebase Important to Understand

- It contains many business domains in one app.
- It mixes public experience and internal operations.
- It depends on repository-level conventions rather than heavy framework abstraction.
- A large part of correctness depends on respecting established folder and logic boundaries.

## Primary Entry Points

- `src/app/` for routes and layouts
- `src/components/` for UI composition
- `src/lib/` for business logic and infrastructure helpers
- `src/lib/db/` for database access
- `database/` for schema, seed, and migrations
- `scripts/` for operational scripts

## Summary

This project should be treated as a production business platform, not just a frontend app. Any new development should consider public UX, admin workflows, data integrity, role-based access, bilingual output, and operational maintainability.
