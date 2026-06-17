
# Mad Monkey Creator Hub — CRM Overhaul Plan

Mapping every item in your brief to what we already have, what needs adjusting, and what's net-new.

---

## 1. Application flow (already built ✅)

| Brief item | Status |
|---|---|
| Application form on website | ✅ Built (`ApplyPage.tsx`) |
| Submission email to Creator Hub | ⚠️ Currently sends internal alert via `send-submission-email` — **brief says remove** |
| Admin approves/declines in dashboard | ✅ Built (`DashboardPage.tsx`, `ApplicantDetailPage.tsx`) |
| Approval email to creator | ✅ Built (`send-approval-email`) — copy needs updating to brief's new draft |
| Remove date selector on apply form | ⚠️ Apply form currently asks for `arrivalDate` — **brief says remove** (date selection moves to post-approval flow) |

**Actions:**
- Remove `arrival_date` step from `ApplyPage.tsx`.
- Disable/remove `send-submission-email` invocation (keep function, just stop calling — or delete).
- Update `send-approval-email` template to brief's exact copy, including `<HERE>` link to the new "Submit Dates" page and link to Standards & Expectations.

---

## 2. NEW: "Submit Your Dates & Requirements" flow

This is the biggest net-new piece. Triggered from `<HERE>` link in approval email.

**New page `/book/:token`** (token-based, no login needed for creator):
- Calendar date picker — **max 5 nights**, must be **≥ 2 days in future**.
- Destination dropdown — all properties **MINUS Australia**.
- Free-text "any other requests" field.

**On submit:**
- Saves to a new `creator_bookings` table linked to the applicant.
- Auto-appends date + location + free text into creator's profile log (status_log).
- Sets booking status `pending_review`.

**New DB table `creator_bookings`:**
```
id, applicant_id (fk), property, check_in, check_out, requests,
status (pending_review|approved|booked|amended|cancelled),
admin_message, booking_reference, booking_type (new|amendment),
created_at, updated_at
```
Plus GRANTs + RLS (anon insert via token, authenticated read/update).

**Property list** — new constant file with all Mad Monkey properties excluding AUS. (Need you to confirm the list — see questions below.)

---

## 3. NEW: Admin review of bookings

- New "Bookings" tab in dashboard with list view.
- For each pending booking: approve / message-back box.
- Approval → triggers **email to Customer Services** (new edge function `send-cs-booking-email`) with exact template from brief (Name, Email, Phone, Property, Dates).
- Optional: send custom message back to creator (new edge function `send-creator-message`).

**General Manager routing:** property → GM email mapping (need list — see questions).

---

## 4. NEW: Customer Services enters Cloudbeds reference

- In admin booking detail: input field "Booking Reference".
- On save → status becomes `booked` → triggers **confirmation email to creator** (new edge function `send-booking-confirmation`) using brief's exact template, including:
  - Reference code, location, check-in/out
  - GM welcome line (auto-CC the GM email for that property)
  - Deliverables block, upload link, Standards link, F&B 50% line, tag/mention requirements, promo-code reminder
  - **"Change / Amend Booking" button** linking back into the booking flow

---

## 5. NEW: Amendments / additional bookings

- "Change / Amend" link in confirmation email opens token-gated page.
- Creator picks: **Amend existing** or **Request new**.
- Same calendar + restrictions.
- Lands in dashboard with **flag**: `NEW BOOKING` or `AMENDED BOOKING` (urgent badge).
- Same review → CS → reference → confirmation cycle, using amended email template.

---

## 6. Dashboard upgrades

Current dashboard shows applicants. Brief wants a **Bookings list** view:
- All bookings across all creators
- Filters: **by month**, **by property**
- Inline creator profile info
- Report panel: **monthly bookings count + per-location bookings count** (simple aggregations + CSV export)

---

## 7. Phase 2 (deferred, scoped here for awareness)

- Per-creator follower count (re-introduce field, or scrape).
- Apify integration to pull views / likes / comments / shares / saves on @madmonkeyhostels-tagged Reels & TikToks.
- Engagement column: `(shares + saves + likes + comments) / followers`.

Phase 2 is **not built in this plan** — it'll be a separate brief once Phase 1 is live.

---

## Build order (Phase 1)

1. **DB migration** — `creator_bookings` table + property/GM mapping table + RLS/GRANTs.
2. **Apply form** — remove date step, remove internal submission email call.
3. **Approval email** — rewrite copy + insert `<HERE>` link.
4. **/book/:token page** — calendar, property dropdown, requests, submit.
5. **Admin Bookings tab** — list, filters, approve/message UI.
6. **Edge functions** — CS notification, custom message back, booking confirmation, amendment confirmation.
7. **Amendment flow** — button in confirmation email + flagged dashboard entries.
8. **Reporting** — monthly + per-location counts, CSV export.

---

## Questions before I start building

1. **Property list (minus AUS)** — can you send the full list of Mad Monkey properties to include in the dropdown, plus the GM email for each?
2. **Customer Services email** — which address should receive the "NEW CREATOR BOOKING" email?
3. **Upload link & Standards links** — what URLs go into the confirmation email's `HERE` / `Standards and Expectations` / `Our Social Media Look + Design` links?
4. **Token security** — happy with a signed URL token in the approval email (no login for creator), or do you want creators to sign in?

Once those are answered I'll execute steps 1–8 in order.
