# Outreach rules (staying out of spam)

## Sender
- Account: **kitebright.hq@gmail.com** (Gmail, "Claude Life" Chrome profile only)
- Display name: Kitebright Studio
- Two Gmail signatures:
  - **Pitch** (default for new emails, text only):
    `Thierry` / `Kitebright Studio · Websites for local businesses` / `kitebright.hq@gmail.com`
  - **Client** (pick manually once someone has replied): same text plus `life/brand/kitebright-wordmark-any@2x.png` (transparent, readable in light and dark mode).
  Never put images in first-contact emails: they raise spam scores and often show as blocked images.
- Account created 2026-11-21, so warm-up week 1 starts on the first send.

## Volume: send the max that stays out of spam
Goal: as many pitches as the account can safely handle, ramping up as it earns trust.

| Week | Max pitches/day (only if health checks pass) |
|---|---|
| 1 | 5 (plus normal activity: sign-ups, replies, a few real emails) |
| 2 | 10 |
| 3 | 20 |
| 4 | 30 |
| 5+ | +10 per week, hard cap **50/day** on this Gmail |

**Health checks before every increase** (Guard signs off):
- Bounce rate under 2% (verify addresses look valid before sending; drop any that bounce)
- Zero spam complaints, no Gmail warnings or "unusual activity" prompts
- Reply rate at least 2% (people replying = trust)
- **Inbox placement test** each week: send a normal email to Thierry's personal Gmail and an Outlook/Hotmail
  address and check it lands in the inbox, not spam or promotions

**Back off immediately** if any check fails: drop to the previous week's level, pause 2 days if it's bad,
find the cause (wording, links, list quality) and log it in LESSONS.md.

**Sending pattern:** spread across the recipient's business hours, random gaps (3–15 minutes),
never in bursts, nothing on weekends, every email individually written.

**Scaling past 50/day** later: buy a custom domain and a second inbox after the first income
(each new inbox warms up from week 1 again). More inboxes = more volume, not more per inbox.

## Writing each email
- Plain text. No images, no attachments, no HTML templates, no tracking pixels.
- One link max (the demo), on the full real domain. No link shorteners.
- Short: 60–120 words. Subject 3–6 words, lowercase-ish, no ALL CAPS, no "!!!", no "free", "guarantee", "$$$".
- First line proves it's personal: something specific and true about their business.
- Every email is written for that one recipient. No copy-pasted blasts.
- Real signature: "Thierry, Kitebright Studio" + kitebright.hq@gmail.com.
- Sender account: kitebright.hq@gmail.com (warm-up rules above apply).
- Last line: "If this isn't useful, reply 'no' and I won't email again." Honour it immediately; log it in leads.csv.
- One follow-up after 4–5 days, then stop forever.
- Say the site is **just a demo that can be made to their taste**, priced **from $50 per page (2D) or
  $85 per page (3D)**, more for bigger businesses (judge from their apparent size and revenue). Quote in their currency.
- Say the demo was **built without their real materials**: with their own photos, logo and content the
  final site will be noticeably better, so the demo is not the ceiling of what we can do.

## Two-step email flow (Thierry, 2026-11-22)
1. **First email (Thierry's template, 2026-11-23): the full offer.** Subject names the business or site
   (e.g. "Quick redesign idea for handymanincolumbus.com"). Sent as HTML by `send-approved.ps1`, so the lines
   "Classic: <url>" and "3D / interactive: <url>" become the named links "Classic demo" / "3D / interactive demo".
   This replaces "one link max" and "subject 3-6 words" above. Thierry approves each one in Review first.

       Hi there,

       I noticed <site> <one specific, true thing about their site or business>.

       I built you two quick demos of a modern site:
       Classic: <2D pages.dev link>
       3D / interactive: <3D pages.dev link>

       They're just demos, made without your real photos, logo or content. Here's how the real one would work:
       - You send me your photos, logo and service details, and I build the site with them.
       - I show it to you on a live Zoom call, or send a private preview link like the ones above.
       - We change it until it's exactly to your taste.
       - Pricing is $50 per page for the classic version and $85 per page for the 3D one. Once you're happy, there's an optional $20/month maintenance plan for updates and fixes.

       Want me to get started?

       Thierry, Kitebright Studio
       kitebright.hq@gmail.com

       If this isn't useful, reply 'no' and I won't email again.
2. **If they reply positively:** use the Review template `template-reply-interested`. They send logo, photos,
   services and wording → we build the real site with their materials → show it on a Zoom call or a preview
   link → revise until it fits their taste → pricing recap → the optional $20/month maintenance (hosting and
   uptime checks, security updates, small edits) → ask for a call time.
3. **Every reply still needs Thierry's OK** at that time. Before any send, show him the final text with both links.

## Approval order (HARD RULE)
1. Demo site → Thierry approves it in Review. 2. Pitch email → Thierry approves that exact email. 3. Then send.
- Each draft goes in Review as kind "email" with recipient, subject, full body and the demo Open link.
- Send only after he approves it. If he edits it, send his version, word for word.
- **Handyman Columbus pitch (Thierry, 2026-11-22):** once Thierry confirms in Chat that BOTH demo sites work for him,
  send the approved pitch to help@handymanincolumbus.com right away (his decision overrides the weekend/business-hours
  rule for this email). Not before that confirmation.
- Nothing goes out while you wait; switch to other work meanwhile.
Both go through the Guard gate (TEAM.md) first.

## Who we email
- Public business contact addresses only (their site, Google listing, social page). No guessed or scraped personal emails.
- EU/UK: business addresses only, a clear reason we're writing, easy opt-out.

## Later (after first income)
- Buy a custom domain (~$10/yr) and set up SPF, DKIM and DMARC. Send from it; keep Gmail for sign-ups.
