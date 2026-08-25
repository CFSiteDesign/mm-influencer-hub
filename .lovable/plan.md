# Partner Mode for the Creator Hub

Goal: reuse the exact same backend (codes, revenue sync, commission, dashboard) but send partner-flavoured comms to anyone marked as a Partner. No structural changes.

---

## 1. Mark an application as PARTNER

- Add `Partner` to the "What best describes you?" options on the application form (alongside Content Creator, Photographer, Videographer, DJ, Other).
- Stored in the existing `creator_type` field on the applicant record, so no database change is needed.
- Admin can also flip an existing applicant to Partner from the applicant detail page (small dropdown), for records already in the system.
- Partner records show a "PARTNER" badge in the dashboard list so it's obvious at a glance.

## 2. Approval emails for Partners

Today approval sends two emails to the creator:
1. Welcome / "choose your dates" email (Creator Hub branding + booking link)
2. Code email ("Your Mad Monkey creator code")

For Partners:
- Email 1 is **not sent at all**.
- Email 2 is sent, in a partner variant.

Internal notifications (Reden, Mark, Adel, Creator Hub inbox) and the Revenue Hub code sync stay exactly as they are.

## 3. Partner variant of the code email

Same layout and design, different copy:

| Creator version | Partner version |
|---|---|
| Subject: "Your Mad Monkey creator code: CODE" | "Your Mad Monkey affiliate code: CODE" |
| "You're in with the Mad Monkey Creator Hub" | "You're in with the Mad Monkey Partner Hub" |
| "Share your code with your followers…" | "Share this code with your audience…" |
| Commission Agreement + Standards + Deliverables links | Commission Agreement only |
| "If you've already requested a stay, sit tight…" | removed |
| Footer contact: creatorhub@madmonkeyhostels.com | hayley@madmonkeyhostels.com and katrina@madmonkeyhostels.com |

Reply-to on partner emails goes to the partner contacts rather than the Creator Hub inbox. Labels like "your code" / "your creator id" become "your code" / "your partner id" wording where it reads oddly.

Implementation: one flag (`isPartner`) passed into the existing code-email function, which switches the copy blocks. One function, two copy paths, nothing duplicated.

## 4. Commission agreement PDF (across the board)

- Title becomes **Creator and Partner Commission Agreement**.
- Every instance of "creator" becomes "creator/partner" throughout the document.
- Same file name and URL so all existing emails and pages keep working, no link changes needed.

Note: the PDF is a binary file. I can either regenerate it from the current wording, or you send me the updated PDF and I drop it straight in. Confirm which you'd prefer.

---

## Technical notes

- Form: add `Partner` to `CREATOR_TYPES` in `src/pages/ApplyPage.tsx` (and the test page variant).
- Approval handlers in `src/pages/DashboardPage.tsx` and `src/pages/ApplicantDetailPage.tsx`: if `creator_type === 'Partner'`, skip the `send-creator-welcome-email-test` invoke and pass `isPartner: true` to the code email.
- `supabase/functions/send-creator-welcome-email/index.ts`: accept `isPartner`, branch subject, heading, share line, doc links, closing line, footer contact, reply-to. Log entries tagged `partner-code` vs `creator-code`.
- No migration required.
