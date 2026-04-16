# 09. Product Domains and User Roles

## Purpose

This document describes the business domains currently represented in the codebase and the main user roles that shape authorization and workflow design.

## Product Domains

### 1. Marketing and content

Includes:

- homepage and core brand pages
- about, FAQs, terms, contact
- configurable site pages and content settings

### 2. Classes

Includes:

- cooking classes
- arts and crafts classes
- class details and booking
- trainer-related class data
- class repeat requests
- class finance and settlement workflows

### 3. Group booking events

Includes:

- cooking competitions
- private classes
- birthday parties
- booking, confirmation, and payment flows
- gift add-ons
- scheduling and settlement logic

### 4. Shop and recommendations

Includes:

- categories
- products
- cart
- checkout
- promo codes
- discover-more links
- product reviews
- recommendations content

### 5. Customer account and wallet

Includes:

- profile
- settings
- notifications
- loyalty
- wallet balance, transfer, withdraw, deposit, top-up
- order history

### 6. Admin operations

Includes:

- settings
- pages and recommendations
- users and trainers
- classes and events
- finance and inventory
- payments and wallets
- WhatsApp and email operations
- notifications and backups

### 7. Worker operations

Includes:

- order handling
- sales entry
- print flows
- restock workflows

### 8. Photographer operations

Includes:

- task assignment
- task progress
- schedule access
- dashboard statistics

## User Roles

The codebase currently defines these roles:

- `ADMIN`
- `TRAINER`
- `CUSTOMER`
- `EMPLOYEE`
- `SOCIAL_MEDIA_ADMIN`
- `PHOTOGRAPHER`
- `WORKER`

## Role Guidance

### `ADMIN`

Full operational role with access to the broad admin surface.

### `SOCIAL_MEDIA_ADMIN`

Restricted admin variant with reduced access compared to full admins.

### `CUSTOMER`

Primary public-account role for bookings, orders, wallet, notifications, and profile usage.

### `TRAINER`

Trainer-related operational role, including workshop and calendar-adjacent features.

### `WORKER`

Operational role for store/order/inventory-adjacent tasks.

### `PHOTOGRAPHER`

Operational role for production-task and schedule management.

### `EMPLOYEE`

Defined in the type system and should be treated carefully when extending permissions, even if not all flows are equally visible yet.

## Authorization Design Implications

Because the platform serves multiple internal roles, new features should always answer:

- is this public, account-level, or internal?
- which roles should see the UI?
- which roles should be able to call the API?
- which data should remain hidden even from authenticated users with other roles?

## Domain Design Guidance

When adding new features:

- place code in the nearest existing domain
- avoid creating mixed-purpose modules
- keep role checks explicit
- document new internal workflows if they introduce operational complexity

## Summary

This project is organized around real business operations, not only page types. The most maintainable future path is to keep those product domains and role boundaries explicit in code, documentation, and review decisions.
