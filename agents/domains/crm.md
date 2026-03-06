# Domain: CRM (Customer Relationship Management)
# CodeBakers V4 | agents/domains/crm.md

**App Type:** CRM / Sales Pipeline / Contact Management

**Auto-loaded when:** project-profile.md contains `domain: crm`

---

## Domain-Specific Expectations

### Core Entities

**Contact/Lead:**
- Full name, email, phone, company
- Status: cold lead, warm lead, qualified, customer, churned
- Source: referral, inbound, outbound, event
- Owner: assigned sales rep
- Tags/labels for categorization
- Activity timeline (calls, emails, meetings, notes)

**Company/Account:**
- Company name, industry, size, website
- Primary contact + additional contacts
- Deal value (ARR/MRR if subscription)
- Status: prospect, customer, churned
- Hierarchy: parent company relationships

**Deal/Opportunity:**
- Title, value, close date (expected)
- Stage: discovery, demo, proposal, negotiation, closed-won, closed-lost
- Probability: 10% → 90% (increases with stage)
- Products/services attached
- Associated contacts + company

**Activity:**
- Type: call, email, meeting, note, task
- Date/time, duration
- Related to: contact, company, deal
- Outcome: completed, cancelled, rescheduled
- Next action: follow-up task auto-created

---

### UX Patterns

**Pipeline View (Kanban):**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Discovery  │    Demo     │  Proposal   │ Negotiation │
│   $45K      │   $120K     │    $80K     │    $200K    │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ □ Acme Inc  │ □ TechCo    │ □ StartupX  │ □ BigCorp   │
│   $15K      │   $50K      │   $30K      │   $150K     │
│             │             │             │             │
│ □ SmallBiz  │ □ MedCorp   │ □ LocalCo   │ □ EntCorp   │
│   $5K       │   $70K      │   $25K      │   $50K      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- Drag-and-drop between stages
- Column totals (sum of deal values)
- Color coding by probability or age
- Click to expand deal details (modal or side panel)

**List View:**
- Filterable by: owner, stage, date range, deal size
- Sortable by: value, close date, last activity, name
- Bulk actions: assign owner, change stage, delete
- Export to CSV

**Activity Timeline:**
```
Today
  10:00 AM - Call with John (Acme Inc) - 15 min
           → Discussed pricing, sending proposal
  2:30 PM  - Demo scheduled (TechCo) - 30 min

Yesterday
  9:00 AM  - Email sent to SmallBiz re: follow-up
  3:00 PM  - Meeting notes added (MedCorp deal)
```

---

### Mutation Patterns

**Create Deal:**
1. Require: title, company, value, stage
2. Auto-set: created date, owner (current user), probability (from stage)
3. Create first activity: "Deal created"
4. Add to pipeline view immediately (optimistic)

**Move Deal Stage:**
1. Update stage + probability
2. Log activity: "Stage changed from X to Y"
3. If moved to Closed-Won → trigger celebration UI + update company status
4. If moved to Closed-Lost → prompt for loss reason

**Log Activity:**
1. Create activity record
2. Update "last activity" timestamp on contact/company/deal
3. If activity has next-action → create task with due date
4. Update activity timeline in real-time

**Assign Owner:**
1. Update owner field
2. Notify new owner (email + in-app notification)
3. Log activity: "Owner changed from X to Y"
4. Remove from old owner's queue, add to new owner's queue

---

### Reporting Expectations

**Sales Dashboard:**
- Revenue this month (actual vs. target)
- Win rate % (closed-won / total closed)
- Average deal size
- Sales cycle length (days from first contact to close)
- Top performers (by revenue, by deal count)
- Pipeline velocity (deals moving through stages)

**Filters:**
- Date range: this week, this month, this quarter, custom
- Team: individual rep, team, all
- Product: by product line or category
- Region: if applicable

**Visualizations:**
- Bar chart: revenue by month
- Pie chart: deals by stage
- Line chart: pipeline trend over time
- Funnel: conversion rate by stage

---

### Security & Permissions

**Role-Based Access:**
- **Admin:** Full access, can see all deals, manage users
- **Manager:** See team's deals, reassign ownership, view reports
- **Sales Rep:** See own deals + shared deals, can't see other reps' deals
- **Read-Only:** View-only access (for executives, analysts)

**Data Isolation:**
- Filter deals by `owner_id` for non-admin users
- Filter companies by `team_id` if multi-tenant
- Redact sensitive fields (SSN, financial details) for certain roles

---

## CodeBakers Integration

**Auto-add to FLOWS.md when domain=crm:**
- View pipeline (Kanban + list views)
- Create deal (with required fields, validation)
- Move deal through stages (drag-and-drop + manual)
- Log activity (call, email, meeting, note)
- Search contacts/companies (full-text + filters)
- Generate reports (dashboard with filters)
- Assign ownership (with notifications)

**Automatic decisions:**
- Pipeline uses drag-and-drop (not dropdowns)
- Activity timeline shows most recent first
- Deal values shown in currency format ($1,234.56)
- Close date picker suggests: 30 days, 60 days, 90 days from today
- Probability auto-updates when stage changes

**Don't ask about:**
- "Should deals have stages?" (yes, core CRM concept)
- "Should activities be logged?" (yes, essential for sales tracking)
- "Should there be a pipeline view?" (yes, standard CRM UX)

**Do ask about:**
- Industry-specific fields (real estate: property address, insurance: policy number)
- Integration requirements (email sync, calendar sync, accounting)
- Custom stages beyond standard pipeline
- Commission tracking and payout logic

---

*CodeBakers V4 | Domain: CRM | agents/domains/crm.md*
