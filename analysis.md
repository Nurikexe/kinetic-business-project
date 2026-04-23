# KINETIC Project Analysis

## 1. What the project is

KINETIC is a two-sided coaching and training platform built around:

- a user-facing athlete app in `src/`
- a coach-facing dashboard in `coach-dashboard/`
- a shared Supabase backend for auth, data storage, chat, payments metadata, and access control

At a product level, the platform combines three businesses in one:

1. a personal training / coaching marketplace
2. a training-plan and workout-tracking product
3. an AI-assisted workout-program generation product

The current monetization logic in the codebase is centered on the coaching marketplace flow, where coaches invoice athletes and the platform keeps a commission.

## 2. Tech stack and architecture

### Frontend

- React 19
- Vite
- Tailwind CSS 4
- Framer Motion

There are two separate deployable apps:

- main athlete app
- coach dashboard

Each app has its own Vercel project and its own build/deploy path.

### Backend

- Supabase Auth for login/signup
- Supabase Postgres for application data
- Supabase Realtime for message, request, payment, and config updates

### AI layer

The main app supports AI-generated training plans. The README references:

- Google Gemma 3 via OpenRouter / Google GenAI integrations

This means part of the cost structure is likely API inference cost per user plan generation or analysis request, even though the coaching payment flow itself is independent from AI usage.

## 3. Main product modules

### A. Athlete app

The athlete-facing app supports:

- onboarding
- AI or manual training-plan creation
- gym plan management
- running plan management
- workout logging
- run session logging
- analytics
- coach discovery and hiring
- chat with coach
- payment of coaching invoices

The athlete app stores its training state mainly in `user_config`, `workouts`, and `run_sessions`.

### B. Coach dashboard

The coach-facing dashboard supports:

- coach login and profile setup
- incoming athlete request management
- chat with accepted athletes
- invoice sending
- access to paid athletes’ workout data
- editing athlete training plans

The coach dashboard becomes valuable only after a coach has paying athletes or at least accepted inbound requests.

### C. Shared coaching marketplace

The coaching marketplace is built around these database entities:

- `coaches`
- `profiles`
- `coach_requests`
- `messages`
- `payment_requests`
- `workout_access`

This is the commercial core of the project.

## 4. End-to-end coaching flow

The actual monetized workflow in the current product is:

1. A user browses available coaches.
2. The user sends a coaching request to a coach.
3. The coach accepts the request.
4. Both sides can chat.
5. The coach sends a payment request from the dashboard.
6. The athlete pays the invoice in the chat UI.
7. When the invoice status changes from `pending` to `paid`, a DB trigger inserts a `workout_access` row.
8. That access row unlocks:
   - coach visibility into athlete workouts and run sessions
   - coach ability to update the athlete’s `user_config`
9. The coach can then review and modify the client’s training plan.

This is important for unit economics because revenue recognition in the current system is tied to `payment_requests`, not to subscriptions, plans, or user signups directly.

## 5. Database tables that matter commercially

### `coaches`

Stores coach marketplace listings:

- `display_name`
- `bio`
- `specializations`
- `certifications`
- `price_per_month`
- `is_available`

This table defines supply in the marketplace.

### `coach_requests`

Represents the lead funnel from athlete to coach.

Important fields:

- `user_id`
- `coach_id`
- `status` = `pending | accepted | declined`
- `created_at`
- `updated_at`

Commercially, this is the lead pipeline table. You can use it to measure:

- lead volume
- acceptance rate
- decline rate
- lead-to-chat conversion

### `messages`

Represents chat events between athlete and coach.

Important fields:

- `request_id`
- `sender_id`
- `content`
- `message_type` = `text | payment_request`
- `payment_request_id`
- `created_at`

Commercially, this can be used to measure engagement and sales motion:

- response time
- conversation depth
- invoice timing
- invoice send rate after acceptance

### `payment_requests`

This is the revenue table.

Important fields:

- `request_id`
- `coach_id`
- `user_id`
- `amount`
- `platform_fee`
- `coach_payout`
- `description`
- `status` = `pending | paid`
- `paid_at`
- `created_at`

The table uses computed columns:

- `platform_fee = ROUND(amount * 0.15, 2)`
- `coach_payout = ROUND(amount * 0.85, 2)`

This means the platform’s take rate is fixed at 15% in the current implementation.

### `workout_access`

This table is the entitlement table.

It is created automatically on payment via DB trigger.

Important fields:

- `coach_id`
- `user_id`
- `request_id`
- `granted_at`

Commercially, this table marks the transition from unpaid relationship to paid servicing relationship.

## 6. Payment and commission logic

### Current behavior

Payments are currently simulated in the UI. There is no real Stripe, PayPal, or card processor integration in the code shown.

What exists:

- coach creates invoice in dashboard
- athlete sees invoice in chat
- athlete fills simulated card form
- app updates `payment_requests.status` to `paid`
- DB trigger grants coach access

So the system currently models payment economics correctly, but does not yet collect real money.

### Commission structure

The platform fee is hardcoded at 15%.

Formula:

- `platform_fee = gross_booking_value * 15%`
- `coach_payout = gross_booking_value * 85%`

Example:

- athlete invoice = `$200`
- platform fee = `$30`
- coach payout = `$170`

### Implications

This means KINETIC is currently designed as a marketplace take-rate business, not as:

- a flat SaaS fee for coaches
- a subscription fee for athletes
- a pure lead-generation model

It behaves like a transactional marketplace where the platform earns a percentage of coach billings.

## 7. What revenue means in this project

There are three revenue concepts you should separate:

### A. Gross Booking Value (GBV)

This is the total athlete invoice amount before commission.

Formula:

- `GBV = SUM(payment_requests.amount WHERE status = 'paid')`

This is the total economic activity flowing through the marketplace.

### B. Platform revenue

This is the platform’s retained commission.

Formula:

- `Platform Revenue = SUM(payment_requests.platform_fee WHERE status = 'paid')`

Given the current schema, this is your top-line marketplace revenue.

### C. Coach payout obligation

This is what belongs to coaches.

Formula:

- `Coach Payout = SUM(payment_requests.coach_payout WHERE status = 'paid')`

If you later add real payments, this becomes either:

- actual payout expense
- payable balance

depending on settlement timing.

## 8. Unit economics framework for this product

Below is the practical unit economics structure implied by the codebase.

### Funnel metrics

You should track:

- total users
- active users
- users who view coaches
- users who send a coach request
- requests accepted
- accepted requests with chat activity
- accepted requests with at least one invoice
- invoices paid
- paid users with ongoing repeat invoices

Core funnel formulas:

- `Request Rate = coach_requests / active users`
- `Acceptance Rate = accepted requests / total requests`
- `Invoice Rate = requests with >=1 invoice / accepted requests`
- `Payment Conversion = paid invoices / issued invoices`
- `Paid Client Conversion = unique paid users / unique requesting users`

### Revenue per paid client

Formula:

- `ARPPU = total platform revenue / number of paying users`

Or on the coach side:

- `Revenue per Active Coach = total platform revenue / number of coaches with >=1 paid invoice`

### Repeat monetization

Because coaches can send multiple invoices over time, the business can support recurring revenue behavior without true subscriptions.

Metrics:

- invoices per paid athlete
- average invoice amount
- paid athletes with repeat payments
- monthly platform revenue per retained athlete

Formulas:

- `Average Invoice Amount = SUM(paid amount) / count(paid invoices)`
- `Repeat Purchase Rate = users with >1 paid invoice / users with >=1 paid invoice`

### Gross margin view

Since payments are simulated, your true gross margin is not yet represented in code. Once real payments exist, gross margin should consider:

- payment processor fees
- refunds and chargebacks
- AI API cost
- infrastructure cost
- support cost

Suggested formula after real payments:

- `Contribution Margin = platform_fee - payment_processor_cost - AI_cost - infra_cost - support_cost`

At the moment, the schema only stores:

- gross amount
- platform commission
- coach payout

It does not store processor fees or operating cost per transaction.

## 9. What costs are visible vs invisible in the current codebase

### Visible / explicit in code

1. Coach commission split
   - 15% retained by platform
   - 85% allocated to coach

2. Hosting and backend architecture
   - Vercel for frontend deployment
   - Supabase for backend

3. AI infrastructure dependencies
   - OpenRouter / Google GenAI client dependencies are present

### Not yet modeled in data

1. Payment processor fees
   - no Stripe fee or card processing fee field

2. Refunds
   - no refund table or reversed payment state

3. Chargebacks
   - not represented

4. Sales tax / VAT
   - not represented

5. Coach settlement timing
   - no payout batch, transfer status, or payable ledger

6. CAC
   - no acquisition channel tracking in schema

7. AI cost attribution per user
   - no table storing prompt or token cost per action

For proper unit economics, those missing costs need to be added analytically, even if not yet modeled in the product DB.

## 10. Suggested business metrics to calculate now

Using the current schema, you can already calculate:

### Marketplace demand

- total athlete requests
- requests per active user
- accepted request rate
- declined request rate

### Coach productivity

- accepted clients per coach
- invoices sent per coach
- paid invoices per coach
- GBV per coach
- platform revenue per coach

### Athlete monetization

- paid athletes
- average paid invoices per athlete
- average athlete spend
- repeat athlete payment rate

### Platform monetization

- total GBV
- total platform fee revenue
- monthly platform fee revenue
- average commission dollars per paid invoice

SQL-style examples:

```sql
-- Paid GBV
SELECT COALESCE(SUM(amount), 0) AS gbv
FROM payment_requests
WHERE status = 'paid';

-- Platform revenue
SELECT COALESCE(SUM(platform_fee), 0) AS platform_revenue
FROM payment_requests
WHERE status = 'paid';

-- Coach payout obligation
SELECT COALESCE(SUM(coach_payout), 0) AS coach_payout
FROM payment_requests
WHERE status = 'paid';

-- Paid invoices count
SELECT COUNT(*) AS paid_invoices
FROM payment_requests
WHERE status = 'paid';

-- Unique paying athletes
SELECT COUNT(DISTINCT user_id) AS paying_athletes
FROM payment_requests
WHERE status = 'paid';

-- Unique monetizing coaches
SELECT COUNT(DISTINCT coach_id) AS paid_coaches
FROM payment_requests
WHERE status = 'paid';
```

## 11. Revenue model interpretation

Right now, KINETIC has a hybrid revenue opportunity:

### Current implemented revenue model

- marketplace commission on coach invoices

### Potential but not yet fully monetized

- subscription fee for athletes
- subscription fee for coaches
- premium AI plan generation
- paid community plans
- upsells for analytics, assessments, or personalized plan revisions

But in the actual code today, the only explicit monetization mechanism is:

- coach-issued invoice
- 15% platform commission

So if you are calculating current unit economics, you should anchor on `payment_requests`.

## 12. Risks and constraints in the current implementation

### 1. Simulated payments

The app currently simulates payment success in the UI instead of processing real money.

That means:

- product flow can be tested
- revenue logic can be modeled
- real collections, disputes, and settlement behavior are not yet validated

### 2. Manual invoice model

Coaches manually send invoices. There is no automatic recurring billing yet.

This creates operational friction:

- coach has to remember to invoice
- payment timing may be inconsistent
- churn may happen before next invoice

### 3. Access is invoice-triggered

Coach access is unlocked only after payment. This is strong for monetization discipline, but it also means unpaid clients produce support burden without direct revenue.

### 4. No ledger for platform costs

The system captures revenue split but not:

- payment fees
- AI variable cost
- support labor
- CAC

So unit economics are only partially visible from database data alone.

## 13. Recommended economic model for analysis

If you want a working operating model, use these layers:

### Revenue layer

- GBV
- platform take rate revenue

### Variable cost layer

- payment processor fees
- AI inference cost
- support per paid user
- infra per active user

### Acquisition layer

- paid marketing spend
- referral incentives
- sales time for coach onboarding

### Unit metrics

- LTV by athlete
- LTV by coach
- CAC by athlete
- CAC by coach
- contribution margin per paid athlete
- contribution margin per paid coach

## 14. Practical formulas for your spreadsheet

These formulas match the current business logic.

### Revenue

- `GBV = sum(paid invoice amount)`
- `Platform Revenue = GBV * 15%`
- `Coach Payout = GBV * 85%`

### Conversion

- `Request to Paid Conversion = paying athletes / users who sent requests`
- `Accepted to Paid Conversion = paying athletes / accepted requests`
- `Invoice to Paid Conversion = paid invoices / total invoices`

### User value

- `Average Athlete Spend = GBV / paying athletes`
- `Platform Revenue per Paying Athlete = platform revenue / paying athletes`
- `Platform Revenue per Paid Coach = platform revenue / paid coaches`

### Margin

- `Contribution Margin per Paid Invoice = platform_fee - processor_fee - AI_cost_allocated - support_cost_allocated`
- `Contribution Margin per Paying Athlete = total platform revenue from athlete - total variable cost from athlete`

## 15. Bottom line

KINETIC is currently best understood as a coaching marketplace with embedded training software and AI-assisted planning.

The economically relevant mechanism in the existing code is:

- athletes hire coaches
- coaches chat and send invoices
- the platform keeps 15%
- payment unlocks servicing rights and plan editing

If you want to calculate real unit economics today, the core dataset should be `payment_requests`, joined with:

- `coach_requests` for funnel conversion
- `messages` for engagement / sales behavior
- `workout_access` for paid activation
- external cost data for CAC, processor fees, and AI usage

From the current implementation, the most important truth is this:

- KINETIC is not yet monetizing via subscriptions in code
- it is monetizing via transactional coach invoices with a 15% commission model
