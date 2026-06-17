# Mad Monkey Influencer Hub — Admin CRM Overhaul

**Implementation plan generated from:** *Technical Product Brief: Mad Monkey Influencer Hub Admin CRM Overhaul*
**Repo:** `CFSiteDesign/mm-influencer-hub`
**Generated:** 2026-06-17

---

## 1. Stack & what this app is today

A Lovable-generated **Vite + React 18 + TypeScript + Tailwind + shadcn/ui** SPA, backed by **Supabase** (Postgres + Auth + Storage + Edge Functions), emails via **Resend**, deployed on **Vercel**.

- **Public** routes: `/` & `/apply` (creator application form), `/take-over` (takeover comp).
- **Admin** routes (auth-gated): `/admin` (login), `/dashboard`, `/applicants/:id`, `/codes`, `/creators/:id`.
- **DB tables:** `applicants`, `creator_codes`, `email_send_log`, `status_log`, `takeover_applicants` · **view** `approved_creators_for_discount` · **fn** `next_creator_id()`.
- **Edge functions:** `send-submission-email`, `send-approval-email`, `send-disapproval-email`, `send-creator-welcome-email`, `notify-discount-app`, `sync-creator-revenue`.

The core **apply → review → approve/decline → issue promo code → welcome email** loop already exists. The brief extends it into a full **booking lifecycle** (dates request → admin review → Customer Services → Cloudbeds reference → confirmation → amendments) plus **booking reporting** and a **Phase 2 social-metrics** layer.

---

## 2. The end-to-end flow the brief describes

```
Creator applies (form, NO date selector)
        │
        ▼
Lands in admin Dashboard for daily review  ── (NO auto-email to creatorhub)
        │  approve / decline
        ▼
APPROVED → Welcome email to creator (promo code + "Submit your dates <HERE>")
        │
        ▼
Creator opens booking page → picks dates (max 5 nights, ≥2 days out),
   destination (all properties MINUS Australia), free-text requests
        │
        ▼
Booking auto-logged to creator's profile  ── flagged for daily admin review
        │  admin reviews free-text, approves (+ optional reply message → email to creator)
        ▼
APPROVED → "NEW CREATOR BOOKING" email to Customer Services
        │
        ▼
CS manually books in Cloudbeds → gets reference code → enters it in dashboard
        │
        ▼
Reference saved → Confirmation email to creator (booking ref + deliverables),
   CC'd to the property's General Manager
        │
        ▼
Creator can Change / Amend / add New booking (same rules) → re-flags dashboard (URGENT)
```

Plus: **Dashboard** all-bookings list (filter by month + property, with profile info) and **reports** (monthly booking count, per-location booking count). **Phase 2:** follower counts + per-post engagement metrics via Apify.

---

## 3. Gap analysis — what we have vs. what the brief needs

| # | Brief requirement | Status today | Work |
|---|---|---|---|
| 1 | Remove date selector from application form | ❌ Q10 "When are you planning to arrive?" date picker exists in `ApplyPage` | **Modify** |
| 2 | Remove auto-email to creatorhub on application | ❌ `send-submission-email` fires on submit | **Remove/repurpose** |
| 3 | Admin approves/declines in dashboard (daily) | ✅ Exists (`DashboardPage`, `ApplicantDetailPage`) | Keep |
| 4 | Approval → welcome email w/ promo code + booking link | 🟡 `send-creator-welcome-email` exists but needs the brief's exact copy + `<HERE>` booking link | **Modify** |
| 5 | Creator "Submit your dates & requirements" page (calendar ≤5 nights, ≥2 days out, destination minus AUS, free text) | ❌ None | **Build new** |
| 6 | Booking auto-logged to creator profile w/ free text | 🟡 Only a single `arrival_date` on `applicants`; no bookings model | **Build new** |
| 7a | Admin daily review of booking free-text + reply message → email creator | ❌ None | **Build new** |
| 7b | Approval → "NEW CREATOR BOOKING" email to Customer Services | ❌ None | **Build new** |
| 8 | CS enters booking in Cloudbeds (manual) | n/a (external manual step) | — |
| 9 | CS enters Cloudbeds reference code into creator's log | ❌ None | **Build new** |
| 11 | Reference saved → confirmation email to creator, CC the location's GM | ❌ None; no property→GM mapping | **Build new** |
| A | Amend / change / additional booking flow (same rules, dashboard flag NEW/AMENDED = urgent, amended email) | ❌ None | **Build new** |
| D | Dashboard: all-bookings list, filter by month + property, with profile info | 🟡 Dashboard lists applicants/codes, not bookings | **Build new** |
| R | Report: # monthly bookings, # per-location bookings | ❌ None | **Build new** |
| P2 | Followers per creator; views/likes/comments (reels/TT) by @madmonkeyhostels; engagement column; Apify | ❌ None | **Build new (Phase 2)** |

---

## 4. What to build

### 4.1 Data model (new migrations)

**`bookings`** — one row per stay request (creator can have many):
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `applicant_id` | uuid fk → applicants | |
| `creator_id` | text | denormalised for fast filtering |
| `property` | text | from canonical property list (minus AUS) |
| `check_in` / `check_out` | date | |
| `nights` | int | enforced ≤ 5 (server-side too) |
| `other_requests` | text | free text |
| `type` | text | `new` \| `amended` |
| `status` | text | `submitted → approved → sent_to_cs → confirmed → declined` |
| `flag` | text | `new_booking` \| `amended_booking` (urgency in dashboard) |
| `reference_code` | text | Cloudbeds ref, entered by CS |
| `gm_email` | text | resolved from `properties` at confirmation time |
| `review_note` | text | admin's reply message to creator |
| `parent_booking_id` | uuid | for amendments |
| `created_at` / `approved_at` / `confirmed_at` | timestamptz | |

**`properties`** — canonical destinations + GM routing (source of truth for the dropdown and GM CC):
`id, country, location, region, gm_name, gm_email, is_active, excluded_from_booking (bool — true for AUS)`. Seed from the 6-country / 24-location list already in `ApplyPage` (`MAD_MONKEY_LOCATIONS`), plus AUS rows marked excluded.

**`booking_tokens`** (or reuse a token column on `applicants`) — unguessable token for the creator's magic link to the booking page (creator is **not** authenticated). The `<HERE>` link in the welcome email = `/book/<token>`.

**Phase 2 — `creator_metrics`** + `creator_posts`: followers, views, likes, comments, shares, saves, engagement_rate, post_url, scraped_at.

RLS: bookings are written **only via an edge function** (`submit-booking`) that validates the token, so anon clients never touch the table directly. Admin (authenticated) gets full read/update.

### 4.2 Edge functions

**Modify**
- `send-creator-welcome-email` → adopt the brief's exact welcome copy (2 videos cross-posted IG+TikTok, complimentary 5-night stay, promo code, 10% discount/10% commission) and inject the tokenised `<HERE>` booking link.
- `send-submission-email` → **remove the auto-send** (brief item 2). Application visibility moves entirely to the dashboard daily-review queue.

**New**
- `submit-booking` — token-validated write of a booking (also enforces ≤5 nights / ≥2 days-out server-side); writes to creator profile log; sets `flag`.
- `send-booking-reply-email` — admin's free-text reply to the creator during booking review (brief item 7).
- `send-cs-booking-email` — "NEW CREATOR BOOKING" to Customer Services (name, email, phone, property, check-in/out) on approval (brief item 7b).
- `send-booking-confirmed-email` — confirmation to creator on reference-code entry, **CC the property's GM** (resolved from `properties`); includes deliverables, 50% F&B, tagging rules, raw-clips upload link, amend button (brief item 11).
- `send-amended-booking-email` — amended-booking template clarifying dates booked/changed (brief Changes section).

### 4.3 Public / creator-facing pages (new routes)

- **`/book/:token`** → `BookingRequestPage`: shadcn calendar (range, `disabled` for <2 days out, hard cap 5 nights), destination `Select` (properties minus AUS, from `properties`), free-text field. Submits via `submit-booking`.
- **`/book/:token/amend`** (or a mode flag) → same form pre-filled, sets `type=amended`, reached from the confirmation email's "Change / Amend" button.
- Apply form: **remove** Q10 arrival-date step.

### 4.4 Admin dashboard

- **Booking review queue**: new bookings flagged `new_booking`/`amended_booking` (amended = urgent styling); admin reads free-text, **approves** with an optional reply message (→ `send-booking-reply-email`), approval → `send-cs-booking-email`.
- **Reference-code entry**: field on each booking; saving it → `send-booking-confirmed-email`.
- **All-bookings tab**: list view of every creator's bookings with **filter by month + property**, showing joined profile info (name, socials, code).
- **Reports panel**: count of bookings per month + count per location (recharts is already a dependency).

### 4.5 Phase 2 — social metrics (Apify)

- Apify actors scrape @madmonkeyhostels-tagged reels/TikToks → views, likes, comments, shares, saves; plus per-creator follower counts.
- Scheduled edge function `scrape-creator-metrics` (or Supabase cron) → `creator_metrics`.
- Dashboard columns: **followers**, **engagement** = (shares + saves + likes + comments) / followers.

---

## 5. Suggested build sequence

1. **Phase 1 — Booking lifecycle (core of the brief)**
   - `properties` + `bookings` + token migrations; seed properties (mark AUS excluded).
   - Remove apply-form date selector; disable creatorhub auto-email.
   - Update welcome email copy + booking link.
   - Booking page (`/book/:token`) + `submit-booking`.
   - Admin booking review + reply email + CS email.
   - Reference-code entry + confirmation email (GM CC).
2. **Phase 2 — Amendments & reporting**
   - Amend/new-booking flow + dashboard flags + amended email.
   - All-bookings list (month/property filters) + reports.
3. **Phase 3 — Social metrics (Apify)**
   - `creator_metrics`, scraper function, dashboard columns.

---

## 6. Decisions (confirmed 2026-06-17)

1. **AUS exclusion** — ✅ the existing 24-location list (KH, ID, LA, PH, TH, VN) is already "minus AUS". `properties` seeded from it; no AUS rows.
2. **Customer Services recipient** — ✅ `cs@madmonkeyhostels.com` (used as the "NEW CREATOR BOOKING" recipient in `send-cs-booking-email`).
3. **GM email mapping** — ⏳ to be supplied later. `properties.gm_email` is nullable; the confirmation email skips the GM CC until populated.
4. **Creator booking-page auth** — ✅ unguessable **magic-link token** (`applicants.booking_token`) in the `/book/<token>` link. Implemented.
5. **Cloudbeds** — ✅ stays **manual**; CS types the reference code into the dashboard. No Cloudbeds API.
6. **"Raw clips & stills" upload** ("upload HERE > region > hostel") — ⏳ still open: existing destination/bucket, or build an upload flow? (Affects confirmation-email copy only.)
7. **Phone number** — using the applicant's `whatsapp_number` as the phone in the CS email (only phone captured).

---

## 7. Build progress

**Slice 1 — foundation + creator booking submission (DONE, 2026-06-17)**
- ✅ Migration `20260617120000_creator_booking_lifecycle.sql`: `applicants.booking_token`, `properties` (+24 seed rows), `bookings` table (+ RLS, indexes, 5-night/date-order CHECKs).
- ✅ `types.ts` extended (`bookings`, `properties`, `booking_token`).
- ✅ Apply form: arrival-date selector removed; creatorhub auto-email (`send-submission-email`) disabled.
- ✅ Welcome email: replaced with the brief's **exact wording** (greeting → promo/commission line → "2 video outposts… complimentary five-night stay" → "select your stay dates HERE" → Standards & Expectations link → "Looking forward… Best"), wrapped in the Mad Monkey shell. Code/ID no longer printed (brief says it arrives "shortly" / separately). Token threaded through `send-approval-email`.
- ✅ `submit-booking` edge function (token validation + server-side ≤5 nights / ≥2 days enforcement).
- ✅ `BookingRequestPage` at `/book/:token` (range calendar, destination select, free text) — typecheck + build clean, route smoke-tested in preview.

**⚠️ Not yet deployed:** the migration and `submit-booking` function are written but **not applied to the remote Supabase** (`ravecomtupiyurjezwji`). The booking page therefore shows the graceful "invalid link" state in preview until they're deployed. Deploy via `supabase db push` + `supabase functions deploy submit-booking` (or the Lovable Supabase sync).

**Slice 2 — admin review, CS email, confirmation, amendments, dashboard (DONE, 2026-06-17)**
- ✅ `/bookings` admin page (`BookingsPage`): needs-review queue, message-box reply, approve, decline; awaiting-reference queue with Cloudbeds reference entry; all-bookings table filtered by **month + property**; bookings-per-month and bookings-per-location report.
- ✅ Edge functions: `send-booking-reply-email` (step 7 message box), `send-cs-booking-email` (step 7b → `cs@madmonkeyhostels.com`, AMENDED banner for urgency), `send-booking-confirmed-email` (step 11, GM CC + deliverables/F&B/tagging copy + "Change / amend booking" button).
- ✅ Reference entry resolves the property's `gm_email` and CCs the GM (skips cleanly if null).
- ✅ Amendments: confirmation email's amend button → `/book/:token?mode=amend`; creator chooses **Change a booking** (flags `amended` / urgent red) or **New booking** (`new`); dashboard shows the flag.
- ✅ Bookings surfaced on the creator profile log (`CreatorDetailPage`) + "Bookings" nav button on the dashboard.
- tsc + build clean.

**Phase 1 is now feature-complete.** Two fill-in-later inputs remain (non-blocking): the **property → GM email** mapping and the **raw-clips upload link**. Because there's no direct Supabase access (Lovable Cloud), GM emails need either a seed migration (you give me the list) or a small Properties admin screen (TBD).

**Brief Phase 2 (deferred, not started):** follower counts + views/likes/comments/engagement via Apify.
