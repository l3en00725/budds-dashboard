# Call Classification Guide

Purpose: Provide clear, unambiguous rules for classifying calls in the plumbing/HVAC context. This guide is read by the AI on every classification.

## Service Fee Acceptance Pattern (CRITICAL for Booked)

For a call to be marked as Booked, it MUST show ALL THREE:
1. **CSR explains service process/fees**: "we have a $X fee", "here's how it works", "our service charge is"
2. **Customer acknowledges or accepts**: "ok", "that's fine", "go ahead", "sounds good", "yes please"
3. **Scheduling discussion follows**: "when can you come?", "I'm available Monday", "tomorrow at 2pm"

## Booked Definition (TRUE only if ALL apply)
- Customer explicitly agrees to proceed with NEW service booking
- Clear scheduling intent: a request for technician arrival time or availability, or confirming a specific time window
- Service fee/process was discussed and customer acknowledged

Examples (Booked):
- "When can you come?" (after CSR explained fees and customer said "ok")
- "Can you come out today at 3?" (in context of new service call)
- "That price is fine; go ahead and book it."
- "Yes, send someone tomorrow morning."

## Automatic Exclusions (NEVER mark as Booked)

These call types should NEVER be marked as booked:
- **Vendor/contractor calls**: "This is [name] calling from [company name]"
- **Invoice/billing inquiries**: mentions "invoice", "bill", "receipt", "payment question", "charge"
- **Parts follow-up**: "I have the part", "part arrived", "the part is here"
- **Status checks on existing work**: "checking status", "just following up on", "what's the status of"
- **Internal employee calls**: staff coordinating with each other
- **Permit/inspection coordination**: "waiting on permits", "inspection update"

## Not Booked (FALSE in these cases)
- Contractor-to-contractor status checks, coordination, or permit/inspection updates
- Internal scheduling language without customer commitment (e.g., "we're getting our schedule", "making sure we're not over-scheduling")
- General inquiry, estimate requests without agreement to proceed
- Follow-ups where no commitment is made ("keep me posted", "let me know")
- Questions about completed work or existing invoices

Examples (Not Booked):
- "We're waiting on permits; I'll keep you updated."
- "We’re just trying to plan our schedule; let us know when you have an idea."
- "Can you send an estimate?" (no acceptance yet)
- "Just checking status on Mechanic Street."

## Pipeline Stage Guidance
- Booked: Only when the customer commits and scheduling is discussed/confirmed.
- Follow-Up: Caller asks to be updated or there's dependency (permits, parts) before scheduling.
- Inquiry: General questions or information gathering.
- Quote Needed: Explicit request for estimate prior to booking.
- Closed-Lost: Caller indicates not proceeding or going elsewhere.

## Special Handling: Contractor-to-Contractor Calls
- Treat as business coordination, typically "Follow-Up" or "Inquiry".
- Do NOT mark as booked unless there is explicit agreement to schedule a technician with time discussion.

## Language Patterns
Positive indicators for Booked:
- "send someone out", "what time can you be here?", "I’m available [time/day]", "that works for me", "go ahead", "yes please", "book it"

Negative indicators (Not Booked):
- "waiting on permits/inspection", "we’ll keep you updated", "let us know when you have an idea", "status check"

## Summary Rules
- When ambiguous, prefer NOT booked.
- Require explicit customer commitment + scheduling language for Booked.

