# 07. API Design and Backend Patterns

## API Surface Overview

The application exposes API handlers through `src/app/api`.

The API is organized by domain and role responsibility rather than by technical layer alone.

Main areas include:

- `public`
- `auth`
- `account`
- `admin`
- `wallet`
- `shop`
- `worker`
- `photographer`
- `notifications`
- `upload`

## Current Backend Pattern

The dominant route handler style is:

1. parse JSON or request parameters
2. sanitize raw values
3. validate required inputs
4. authenticate and authorize where needed
5. call domain logic or DB modules
6. return structured JSON
7. catch errors and return a safe failure response

This pattern is visible across public and admin endpoints.

## Public API Characteristics

Public endpoints support site features such as:

- contact form submission
- event bookings
- class bookings
- calendar access
- shop browsing helpers
- join-us flows

Public endpoints should be especially careful with:

- input sanitation
- abuse prevention
- safe error messages

## Authentication Endpoints

Auth flows include WhatsApp verification endpoints and logout behavior.

Important characteristics:

- auth is tied to the existing user/session model
- phone-based verification is part of the login/register flow
- auth-related APIs should be treated as security-sensitive code

## Admin API Characteristics

Admin routes cover a wide operational surface, including:

- settings
- users
- classes
- events
- shop
- finance
- inventory
- pages and recommendations
- email
- WhatsApp
- backups

Because admin APIs can mutate core business data, consistency matters more than speed of implementation.

## Authorization Guidance

Every non-public API should be evaluated for:

- who can call it
- which roles are allowed
- whether page-level auth also needs API-level auth

Do not rely on frontend visibility as a security mechanism.

## Response Design

The repo primarily uses JSON responses via `NextResponse.json`.

Recommended response behavior:

- return clear success or error payloads
- use appropriate status codes
- avoid leaking internal stack details
- keep payload shapes stable when possible

## Error Handling

Current backend code generally follows a pragmatic strategy:

- log internal errors with `console.error`
- return human-readable but controlled failure messages

This should remain the baseline until a centralized logging or error taxonomy is introduced.

## Backend Logic Placement

The following separation should be maintained:

- API route: HTTP parsing, authorization, response shape
- `src/lib`: reusable workflows and integration logic
- `src/lib/db`: query and persistence logic

## External Integrations

Current backend integrations include:

- Paymob for payments
- email delivery
- WhatsApp messaging/session infrastructure
- filesystem-backed uploads

Each integration should be isolated behind helpers instead of spread across route handlers.

## Security Considerations

When extending the API layer, review:

- input length limits
- enum/value whitelisting
- auth and role checks
- upload path safety
- payment callback verification
- cron/secret-protected admin endpoints

## Rule for New Endpoints

A new endpoint should not be merged unless it clearly answers:

1. who is allowed to call it
2. what it validates
3. where business logic lives
4. how failures are reported
5. what database side effects it creates
