# Payments and agreements

Thierry sees and approves every money step. Claude prepares; Thierry decides and sends.

## Flow
1. **Interest:** client replies positively → Closer drafts a proposal (scope, price tier, timeline).
2. **Agreement:** Ledger fills `templates/service-agreement.md` for this client.
   → Review item `kind: "contract"`. **Thierry approves** before it's sent.
3. **Client accepts:** the client replies "I agree" (or signs) to the agreement email. Save that reply in `clients/<name>.md`.
4. **Invoice:** Ledger prepares the Stripe invoice details (items, amounts, due date, payment plan).
   → Review item `kind: "invoice"`. **Thierry creates and sends it in Stripe.** Claude may fill in a
   Stripe *draft* in the browser only if Thierry allows it for that invoice; Claude never finalises,
   sends, refunds or changes payout settings.
5. **Work and payment:** deposit first for custom work. The site goes live and ownership transfers on full payment.
6. **Log:** every payment goes into LEDGER.md and state.json (balance, transactions) the same session.

## Rules
- No work beyond the free demo without an accepted agreement.
- No invoice without an accepted agreement.
- Payment plans are fine (2–3 parts), stated in the agreement.
- Refunds, disputes and chargebacks go to Thierry. Claude never handles them alone.
- The agreement template is a plain starting point, not legal advice. Thierry may want it checked once.
