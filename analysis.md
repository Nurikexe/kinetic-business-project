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

In addition, the business model should be understood as having a premium AI subscription layer:

- users pay `$5` to unlock AI features

That premium AI access should be treated as a second revenue stream on top of coaching commissions.

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
- premium users pay `$5` to unlock AI-powered features

If you want to calculate real unit economics today, the core dataset should be split into two revenue buckets:

- coaching marketplace revenue from `payment_requests`
- premium subscription revenue from `$5` AI access purchases

For the marketplace side, the core dataset should be `payment_requests`, joined with:

- `coach_requests` for funnel conversion
- `messages` for engagement / sales behavior
- `workout_access` for paid activation
- external cost data for CAC, processor fees, and AI usage

From the current implementation, the most important truth is this:

- KINETIC has two intended monetization layers:
  - a `$5` premium AI subscription
  - a transactional coach invoice marketplace with a 15% commission model

## 16. Detailed unit economics model

This section is a planning model, not an observed performance report.

The codebase does not yet contain:

- a real subscription billing system for the `$5` AI tier
- real payment processor data
- observed CAC by channel
- observed subscription churn
- observed retained cohort revenue

So the right way to use this section is:

1. as a financial planning model
2. as a benchmark target framework
3. as a decision tool for whether paid acquisition makes sense

## 17. Revenue streams to model separately

You should not blend everything into one ARPU number too early. KINETIC has two very different businesses.

### Revenue stream A: `$5` AI premium subscription

This unlocks AI features for the athlete.

Economic properties:

- low price point
- potentially broad audience
- likely lower willingness to pay
- likely higher churn than coaching
- very sensitive to CAC
- potentially positive only if organic/referral acquisition is strong

### Revenue stream B: coaching marketplace commission

This is the 15% take-rate business from coach invoices.

Economic properties:

- higher revenue per paid relationship
- lower conversion volume
- more operationally intensive
- stronger retention if coach-client fit is good
- more defensible versus generic fitness apps

## 18. Core assumptions for the model

Below are reasonable planning assumptions for a first-pass model.

You should replace them with actual data once the billing system is live.

### AI premium subscription assumptions

#### Conservative

- monthly price: `$5.00`
- payment processor fee: `$0.45`
  - modeled as roughly `2.9% + $0.30`
- AI variable cost per subscriber per month: `$1.50`
- support + infra cost per subscriber per month: `$0.75`
- contribution margin per subscriber per month: `$2.30`
- monthly churn: `18%`

#### Base

- monthly price: `$5.00`
- payment processor fee: `$0.45`
- AI variable cost per subscriber per month: `$1.00`
- support + infra cost per subscriber per month: `$0.55`
- contribution margin per subscriber per month: `$3.00`
- monthly churn: `12%`

#### Aggressive

- monthly price: `$5.00`
- payment processor fee: `$0.45`
- AI variable cost per subscriber per month: `$0.60`
- support + infra cost per subscriber per month: `$0.35`
- contribution margin per subscriber per month: `$3.60`
- monthly churn: `8%`

### Coaching marketplace assumptions

The product lets coaches invoice arbitrary amounts, so platform economics depend heavily on coach pricing and retention.

#### Conservative

- average coach invoice: `$120/month`
- platform fee at 15%: `$18.00/month`
- processor cost on full payment: `$3.78/month`
- support + ops cost per paid client-month: `$3.00`
- net contribution per paid client-month: `$11.22`
- retention: `3 months`

#### Base

- average coach invoice: `$150/month`
- platform fee at 15%: `$22.50/month`
- processor cost on full payment: `$4.65/month`
- support + ops cost per paid client-month: `$3.00`
- net contribution per paid client-month: `$14.85`
- retention: `4 months`

#### Aggressive

- average coach invoice: `$200/month`
- platform fee at 15%: `$30.00/month`
- processor cost on full payment: `$6.10/month`
- support + ops cost per paid client-month: `$4.00`
- net contribution per paid client-month: `$19.90`
- retention: `6 months`

## 19. LTV model

### AI premium LTV

For subscriptions, a practical planning formula is:

- `Revenue LTV = monthly subscription revenue / monthly churn`
- `Contribution LTV = monthly contribution margin / monthly churn`

#### AI premium LTV table

| Scenario | Monthly Revenue | Monthly Contribution | Monthly Churn | Revenue LTV | Contribution LTV |
|---|---:|---:|---:|---:|---:|
| Conservative | $5.00 | $2.30 | 18% | $27.78 | $12.78 |
| Base | $5.00 | $3.00 | 12% | $41.67 | $25.00 |
| Aggressive | $5.00 | $3.60 | 8% | $62.50 | $45.00 |

### Coaching LTV

For marketplace coaching, the better formula is:

- `Revenue LTV = platform fee per month × retention months`
- `Contribution LTV = net contribution per month × retention months`

#### Coaching LTV table

| Scenario | Avg Coach Invoice | Platform Fee / Month | Net Contribution / Month | Retention | Revenue LTV | Contribution LTV |
|---|---:|---:|---:|---:|---:|---:|
| Conservative | $120 | $18.00 | $11.22 | 3 mo | $54.00 | $33.66 |
| Base | $150 | $22.50 | $14.85 | 4 mo | $90.00 | $59.40 |
| Aggressive | $200 | $30.00 | $19.90 | 6 mo | $180.00 | $119.40 |

## 20. Blended LTV logic

The best version of KINETIC is not AI-only and not marketplace-only. It is a hybrid funnel:

- a large top-of-funnel audience buys the `$5` AI premium tier
- a subset of those users later hire coaches
- some coach-led users may also pay for AI features

This creates a blended user journey.

Example blended case:

- user first becomes an AI premium subscriber
- stays subscribed for 4 months
- later converts into a coach client
- pays a coach for 4 months at `$150/month`

Blended economics for that user:

- AI revenue: `$20`
- AI contribution: around `$12`
- coaching platform revenue: `$90`
- coaching contribution: around `$59.40`
- total contribution: about `$71.40`

That kind of hybrid user is highly valuable. The problem is that you should not assume every user becomes that user.

## 21. CAC model

### General CAC formulas

- `CAC = total paid acquisition spend / number of acquired paying customers`
- `Lead CAC = ad spend / leads`
- `Paid Customer CAC = ad spend / paying customers`

### Important distinction

For KINETIC, you need at least three CACs:

1. `CAC_AI`
   - cost to acquire a paying `$5` AI subscriber
2. `CAC_CoachClient`
   - cost to acquire a paying coaching client
3. `CAC_CoachSupply`
   - cost to acquire an active coach who gets at least one paying client

These are not interchangeable.

## 22. Meta ads benchmark framing

Meta ad costs are unstable, so these should be treated as benchmark anchors rather than precise forecasts.

Recent public benchmark data shows:

- health & fitness traffic CPC around `$0.80`
- health & fitness lead CPC around `$2.64`
- health & fitness lead conversion rate around `5.63%`
- health & fitness CPL around `$52.98`

Those numbers matter because they imply:

- low-ticket fitness subscriptions are hard to profitably acquire on cold Meta traffic
- lead-gen for higher-ticket coaching can work, but only with strong funnel conversion and retention

## 23. Allowable CAC by business line

The simplest planning rule is:

- `Allowable CAC = LTV / target LTV:CAC ratio`

Recommended target ratios:

- early-stage minimum acceptable: `2:1`
- healthier paid acquisition target: `3:1`
- strong / scale-ready: `4:1+`

### AI premium allowable CAC

| Scenario | Contribution LTV | Max CAC at 2:1 | Max CAC at 3:1 | Max CAC at 4:1 |
|---|---:|---:|---:|---:|
| Conservative | $12.78 | $6.39 | $4.26 | $3.20 |
| Base | $25.00 | $12.50 | $8.33 | $6.25 |
| Aggressive | $45.00 | $22.50 | $15.00 | $11.25 |

Interpretation:

- if AI premium is only `$5/month`, cold Meta acquisition is usually dangerous
- if actual CAC lands above `$10`, AI-only acquisition likely becomes unattractive unless churn is very low
- the `$5` tier works much better as:
  - an upsell from organic users
  - a retention layer
  - a low-friction bridge into higher-LTV coaching

### Coaching allowable CAC

| Scenario | Contribution LTV | Max CAC at 2:1 | Max CAC at 3:1 | Max CAC at 4:1 |
|---|---:|---:|---:|---:|
| Conservative | $33.66 | $16.83 | $11.22 | $8.42 |
| Base | $59.40 | $29.70 | $19.80 | $14.85 |
| Aggressive | $119.40 | $59.70 | $39.80 | $29.85 |

Interpretation:

- coaching only becomes comfortably buyable on Meta if:
  - average invoice is high enough
  - retention is long enough
  - funnel from click to paid client is disciplined

## 24. Should KINETIC spend on Meta ads?

### Short answer

Yes, but carefully, and not with the same strategy for both revenue streams.

### For the `$5` AI product

Do **not** treat this as a pure cold-paid Meta subscription product at scale yet.

Reason:

- the price point is too low
- allowable CAC is narrow
- AI costs and payment fees take a meaningful share of revenue
- early churn can kill payback quickly

Best use of Meta for AI premium:

- retargeting warm users
- reactivation campaigns
- content-led acquisition into email / community / free plan
- upsell from existing users rather than direct cold paid subscription

### For coaching marketplace demand

Meta can make sense if you sell into a higher-intent, higher-AOV funnel:

- “Get matched with a coach”
- “Get a personalized plan + accountability”
- “Hybrid athlete training with real coach support”

But the economics likely do not work if coaches invoice too little.

## 25. Recommended Meta ad budget

### Phase 1: validation budget

Recommended monthly spend:

- `$1,500 to $3,000/month`

Recommended daily spend:

- `$50 to $100/day`

Why:

- enough budget to test multiple creatives and audiences
- not so much that you burn capital before knowing CAC
- appropriate for an early-stage product without hardened conversion data

Suggested allocation:

- `70%` coaching demand generation
- `20%` retargeting
- `10%` creative testing / experiments

### Phase 2: controlled scale

Only do this if:

- you have at least 20 to 30 paying conversions worth analyzing
- you know click-to-paid conversion by funnel step
- your blended payback period is acceptable

Recommended spend:

- `$3,000 to $8,000/month`

### Phase 3: scale

Only do this if:

- LTV:CAC is consistently above `3:1`
- retention is stable
- you have repeatable creative performance
- you have real billing and refund data

Recommended spend:

- `$10,000+/month`

Current product maturity suggests you should **not** start here.

## 26. Meta budget recommendation by revenue stream

### AI premium

Recommended initial spend:

- `$10 to $20/day` only for remarketing or warm audiences

Do not start with cold Meta ads at `$100/day` for the `$5` AI plan.

### Coaching demand generation

Recommended initial spend:

- `$40 to $80/day`

This is the better use of paid social because LTV is materially higher.

### Coach supply acquisition

Recommended spend:

- use lightweight paid tests only after athlete demand is proven

Reason:

- marketplace businesses fail when they subsidize both sides too early
- if athlete monetization is not stable, coach-supply CAC will be wasted

## 27. Example CAC scenarios from Meta

These are modeled examples using benchmark CPC/CPL ranges and reasonable funnel assumptions.

### AI premium funnel example

Assume:

- Meta traffic CPC: `$0.80`
- landing page visitor to paid AI subscriber conversion: `2.5%`

Then:

- `CAC = $0.80 / 2.5% = $32`

That is too high for a `$5` product in almost every scenario.

Even if conversion improves to `5%`:

- `CAC = $0.80 / 5% = $16`

That still only works in the aggressive LTV scenario.

Conclusion:

- cold Meta for the `$5` AI tier is weak unless:
  - churn is extremely low
  - there is an annual plan
  - AI tier acts as a gateway to coaching

### Coaching funnel example

Assume:

- Meta traffic CPC: `$0.80`
- click to coach request: `12%`
- request acceptance: `50%`
- accepted request to paid invoice: `30%`

Then click-to-paid conversion:

- `12% × 50% × 30% = 1.8%`

CAC:

- `$0.80 / 1.8% = $44.44`

That is:

- too high for conservative coaching economics
- too high for base economics at a `3:1` target
- workable only if:
  - retention increases
  - invoices are larger
  - conversion improves

Now assume a better funnel:

- click to request: `18%`
- acceptance: `60%`
- accepted to paid: `40%`

Then click-to-paid conversion:

- `18% × 60% × 40% = 4.32%`

CAC:

- `$0.80 / 4.32% = $18.52`

This works against base coaching economics.

Key takeaway:

- the coaching business can support Meta if the funnel is sharp
- the AI-only business usually cannot

## 28. Payback period

### Formula

- `Payback Period (months) = CAC / monthly contribution margin`

### AI premium payback

Base case:

- CAC: `$12`
- monthly contribution: `$3`
- payback: `4 months`

This is borderline for a low-priced subscription.

### Coaching payback

Base case:

- CAC: `$20`
- monthly contribution: `$14.85`
- payback: `1.35 months`

This is much better.

Conclusion:

- the marketplace side gives a much healthier path to paid acquisition
- the `$5` tier is more useful for conversion and retention than for direct paid-user acquisition

## 29. ROI formulas

### Marketing ROI

- `ROI = (gross profit from acquired users - ad spend) / ad spend`

### Example: AI premium

If:

- 100 acquired subscribers
- CAC = `$10`
- contribution LTV = `$25`

Then:

- total spend = `$1,000`
- total contribution = `$2,500`
- ROI = `($2,500 - $1,000) / $1,000 = 150%`

### Example: coaching

If:

- 20 paid coaching users
- CAC = `$25`
- contribution LTV = `$59.40`

Then:

- spend = `$500`
- contribution = `$1,188`
- ROI = `($1,188 - $500) / $500 = 137.6%`

## 30. Competitor analysis

### Competitor 1: Future

Current public pricing shows roughly:

- `$199/month`
- promotional first-month discounts or passes are common

What Future does well:

- premium remote coaching
- high accountability
- strong coach-client communication
- very clear value proposition

Why Future matters:

- it validates that remote coaching can command high monthly pricing
- it sets a high benchmark for what users will pay if human accountability is strong

How KINETIC differs:

- KINETIC is not only remote coaching
- KINETIC also includes AI planning and training software
- KINETIC can support more flexible coach pricing than a fixed premium membership

Strategic implication:

- if KINETIC coaches charge too little, the business will under-monetize relative to the market
- Future suggests premium remote coaching pricing can plausibly live around `$150 to $199+` monthly

### Competitor 2: Runna

Current public pricing shows roughly:

- `$19.99/month`
- `$119.99/year`

What Runna does well:

- focused running proposition
- strong onboarding into specific race goals
- much lower price than human coaching

Why Runna matters:

- it is a strong benchmark for the AI / plan-led running category
- it shows that software-only coaching support can command substantially more than `$5`

How KINETIC differs:

- KINETIC is broader than running
- KINETIC includes gym + hybrid athlete planning
- KINETIC also includes coach marketplace monetization

Strategic implication:

- a `$5` AI tier is intentionally inexpensive versus specialized apps like Runna
- this can help conversion, but it leaves limited room for CAC
- if AI features become valuable enough, KINETIC may eventually justify a higher premium tier than `$5`

### Competitor 3: Strava

Current U.S. public pricing shows roughly:

- `$11.99/month`
- `$79.99/year`

What Strava does well:

- retention through network effects and community
- analytics, status, and habit loops
- social graph moat

Why Strava matters:

- it is the benchmark for engagement, not coaching
- it proves consumers will pay for performance and social utility even without direct 1:1 coaching

How KINETIC differs:

- KINETIC is more outcome-oriented and coach-oriented
- Strava is a network product first
- KINETIC does not yet have Strava’s community lock-in

Strategic implication:

- KINETIC should not compete with Strava on social graph
- it should compete on results, personalization, hybrid planning, and coach conversion

### Competitor 4: Trainerize

Current public pricing starts very low for coaches and scales with business size.

What Trainerize does well:

- coach operating system
- B2B coach tooling
- client messaging, programs, payments, add-ons

Why Trainerize matters:

- it is a direct competitor to the coach-dashboard side
- it validates software demand from coaches
- it competes on coach productivity rather than athlete brand

How KINETIC differs:

- KINETIC combines coach tooling with athlete acquisition and marketplace demand
- Trainerize is more of a coach SaaS platform than a consumer marketplace

Strategic implication:

- KINETIC’s moat should be “distribution + consumer funnel + AI + coach tooling”
- if it becomes just a coach backend, it will be compared directly against mature B2B tools

## 31. Competitive positioning summary

KINETIC sits between four models:

- Future = premium remote human coaching
- Runna = focused digital plan/coaching app
- Strava = retention and analytics community
- Trainerize = coach operating system

The strongest position for KINETIC is:

- hybrid athlete specialization
- low-friction `$5` AI premium entry point
- upgrade path into human coaching
- coach marketplace monetization with 15% take rate

That positioning is stronger than trying to win as:

- a generic cheap fitness app
- a pure AI workout generator
- a generic coach SaaS clone

## 32. Strategic conclusion on pricing

### The `$5` AI premium price

Pros:

- easy to try
- strong conversion tool
- low psychological friction

Cons:

- hard to support cold paid acquisition
- limited room for processor fees and AI cost
- limited room for support and experimentation

Conclusion:

- `$5` is good as an entry or retention tier
- `$5` is weak as the only monetization engine

### The coaching commission model

Pros:

- materially higher LTV
- better supports paid acquisition
- stronger differentiation

Cons:

- more complex operationally
- needs demand and supply balance
- requires retention and trust

Conclusion:

- the coaching marketplace should be the economic engine
- the AI premium tier should be the top-of-funnel and expansion layer

## 33. Final recommendation

If the goal is healthy unit economics, the best near-term strategy is:

1. Keep the `$5` AI tier, but do not rely on cold paid acquisition to scale it.
2. Use AI as a conversion layer, retention layer, and upsell path.
3. Focus Meta acquisition on higher-LTV coaching demand.
4. Encourage coaches to invoice at meaningful price points.
5. Push toward:
   - `$150+` monthly coaching packages
   - multi-month commitments
   - higher retention
6. Hold Meta spend initially in the `$1.5k to $3k/month` range until paid conversion data is stable.
7. Scale only when:
   - coaching CAC is consistently below about `$20 to $30`
   - blended LTV:CAC is above `3:1`
   - payback is below `3 months`

## 34. Market reference links

- Future pricing: https://future.co/
- Future membership pricing help: https://faq.future.co/en/articles/12073382-membership-plans-pricing
- Runna pricing: https://www.runna.com/pricing
- Strava pricing: https://www.strava.com/pricing
- Trainerize pricing: https://www.trainerize.com/pricing/
- Meta benchmark reference: https://www.wordstream.com/blog/facebook-ads-benchmarks-2025
