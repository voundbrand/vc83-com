#!/usr/bin/env python3
"""
Generate all 8 Phase 0 McKinsey-style DOCX documents (00–07).
"""
import sys
sys.path.insert(0, '/sessions/happy-practical-dirac')
from mckinsey_style import *

OUT = '/sessions/happy-practical-dirac/mnt/one-of-one-v3/phase-0-proof/docx'

COMMON_META = [
    ('Author', 'Remington Splettstoesser'),
    ('Brand', 'sevenlayers — by Vound Brand UG (haftungsbeschränkt)'),
    ('Date', 'March 2026'),
    ('Classification', 'Internal — Founder\'s Eyes Only'),
    ('Status', 'Operative — Phase 0 Tactical Playbook'),
]


# ═══════════════════════════════════════════════════════
# 00 — PHASE 0 OVERVIEW
# ═══════════════════════════════════════════════════════
def gen_00():
    doc = create_doc()
    cover_page(doc,
        'Phase 0 — Proof',
        'Executive Overview: Sign 5 SMB customers in 90 days',
        COMMON_META, doc_number='Document 00')

    navy_line(doc)
    doc.add_heading('One-Sentence Strategy', level=1)
    callout(doc, 'Mission:', 'Sign 5 SMB customers in 90 days to fund operations, generate proof data, and earn the right to sell mid-market.')

    thin_line(doc)
    doc.add_heading('Phase Gate Framework', level=1)

    doc.add_heading('Phase 0 — Proof (now → 5 customers, ~90 days)', level=2)
    make_table(doc,
        ['Dimension', 'Detail'],
        [
            ['Goal', '5 paying customers, €10-15K MRR'],
            ['Pricing', '€0 setup, €2-3K/month, month-to-month'],
            ['Motion', 'Warm network, niche-agnostic, founder does everything'],
            ['Product', 'Full 7-agent platform demo. Voice is the wedge, but the pitch is agentic flows.'],
            ['Success', '3+ customers who\'d be upset if we disappeared + real before/after data'],
            ['Fundraise', 'No.'],
        ],
        col_widths=[1.8, 4.4])
    body(doc, '')

    doc.add_heading('Phase 1 — Repeatable (5 → 15 customers, ~6 months)', level=2)
    make_table(doc,
        ['Dimension', 'Detail'],
        [
            ['Goal', 'Repeatable sales, €30-50K MRR'],
            ['Pricing', '€5-12K setup, €2-5K/month'],
            ['Motion', 'Case studies sell, inbound starts, patterns emerge'],
            ['Product', 'Platform hardens through real usage'],
            ['Success', 'New customers find us, not just us finding them'],
            ['Fundraise', 'Only if capital accelerates something already working.'],
        ],
        col_widths=[1.8, 4.4])
    body(doc, '')

    doc.add_heading('Phase 2 — Scale (15+ customers)', level=2)
    make_table(doc,
        ['Dimension', 'Detail'],
        [
            ['Goal', 'Own a category, expand verticals'],
            ['Pricing', 'v3 tiers (€12K-€195K) become real'],
            ['Motion', 'Add team, maybe raise from strength'],
            ['Success', 'Revenue funds growth OR fundraise with leverage'],
        ],
        col_widths=[1.8, 4.4])

    thin_line(doc)
    doc.add_heading('What Phase 0 IS', level=1)
    bullet(doc, 'A bootstrapped proof-of-concept phase where every customer is a data point.')
    bullet(doc, 'SMB customers who close fast and deploy faster.')
    bullet(doc, 'Cheap, fast delivery — no procurement cycles, no legal review, no committee decisions.')
    bullet(doc, 'Founder does everything: sells, configures, supports, monitors, iterates.')
    bullet(doc, 'The minimum viable business that funds the maximum viable vision.')

    doc.add_heading('What Phase 0 IS NOT', level=1)
    bullet(doc, 'The long-term strategy. This is a bridge, not a destination.')
    bullet(doc, 'Pricing we\'re proud of. €2-3K/month is intentionally below value to reduce friction.')
    bullet(doc, 'Scalable operations. Founder-led everything breaks at 10+ customers. That\'s fine — we only need 5.')
    bullet(doc, 'A pivot away from v3. The mid-market thesis stands. Phase 0 earns the right to execute it.')

    thin_line(doc)
    doc.add_heading('How Phase 0 Feeds v3', level=1)
    body(doc, 'Every SMB customer generates three things the mid-market strategy needs:')
    bullet(doc, 'Real before/after data (missed calls, response times, appointments booked, revenue recovered).', bold_prefix='Case study — ')
    bullet(doc, 'Each deployment surfaces edge cases, tunes agent behavior, and hardens the platform.', bold_prefix='Battle-tested product — ')
    bullet(doc, 'A named business owner who says "this changed how we operate." Mid-market buyers need to see people like them already using it.', bold_prefix='Testimonial — ')
    body(doc, '')
    callout(doc, 'Key insight:', 'Phase 0 customers are the proof layer that makes v3 pricing credible. Without them, the €35K-€195K pitch is a slide deck. With them, it\'s a track record.')

    thin_line(doc)
    doc.add_heading('Two Parallel Tracks', level=1)
    doc.add_heading('Track A — Full Platform via Clara/Phone Wedge', level=2)
    bullet(doc, 'Lead with Clara (Virtual Receptionist) as the entry point.')
    bullet(doc, 'Demo the full 7-agent platform. Voice answers the phone, but the pitch is the entire agentic operations layer.')
    bullet(doc, 'ICP: any business with a phone that rings and a front office to run.')

    doc.add_heading('Track B — Platform via Kai/Vacation Ops Wedge', level=2)
    bullet(doc, 'Lead with Kai (Team Operations) as the entry point.')
    bullet(doc, 'Wedge into businesses through vacation coordination, shift coverage, team communication.')
    bullet(doc, 'ICP: businesses with 10+ employees and coordination overhead.')

    body(doc, 'Both tracks share phase gates. Combined customer count and MRR determine phase transitions.')

    thin_line(doc)
    doc.add_heading('90-Day Timeline Overview', level=1)
    make_table(doc,
        ['Weeks', 'Focus', 'Target'],
        [
            ['1-2', 'Ship universal demo agent, test relentlessly', 'Demo live 24/7, tested 50+ times'],
            ['3-6', 'Warm outreach, demo calls, get in rooms', '10-15 conversations, 5-8 demo calls'],
            ['5-10', 'Run 2-3 trials at a time, founder monitors daily', '3-4 active trials'],
            ['8-13', 'Convert trials, collect proof artifacts', '5 paying customers, 2+ case studies'],
        ],
        col_widths=[1.0, 2.8, 2.4])

    thin_line(doc)
    doc.add_heading('Honest Constraints', level=1)
    bullet(doc, 'Every hour is either building or selling. There is no third category.', bold_prefix='Solo founder. ')
    bullet(doc, 'No paid ads, no SDRs, no conference booths. Network and hustle only.', bold_prefix='Zero budget. ')
    bullet(doc, 'No social proof, no case studies, no references. The demo has to carry the weight.', bold_prefix='Zero customers. ')
    bullet(doc, 'Personal runway is the only runway. Phase 0 pricing must generate cash fast.', bold_prefix='Zero revenue. ')
    bullet(doc, 'Building and selling compete for the same hours. The weekly rhythm is the constraint that makes this work.', bold_prefix='Time is the bottleneck. ')

    add_footer(doc, 'Phase 0 — Executive Overview — Confidential')
    save(doc, f'{OUT}/00_Phase_0_Overview.docx')


# ═══════════════════════════════════════════════════════
# 01 — ICP
# ═══════════════════════════════════════════════════════
def gen_01():
    doc = create_doc()
    cover_page(doc,
        'Ideal Customer Profile',
        'Phase 0 — Who to sell to, who to skip',
        COMMON_META, doc_number='Document 01')

    navy_line(doc)
    doc.add_heading('Phase 0 ICP', level=1)
    callout(doc, 'Target:', 'Any business with 3+ employees, a phone that rings, and a decision-maker reachable in one call.')
    body(doc, 'No revenue floor. No employee minimum. No vertical restriction. If they have phone-based pain and can say yes without a committee, they\'re a Phase 0 customer.')

    thin_line(doc)
    doc.add_heading('Niche-Agnostic Philosophy', level=1)
    body(doc, 'At zero customers, turning away a willing buyer because they\'re in the "wrong" vertical is insane. Take anyone with the pain. Let the data tell you which vertical to double down on in Phase 1.')
    body(doc, 'The v3 strategy identifies specific verticals (dental, trades, real estate, medical). Those are hypotheses. Phase 0 tests them by selling to whoever says yes. If 3 of 5 customers are dental practices, that\'s the vertical signal. If they\'re spread across 5 industries, that tells you something different.')
    callout(doc, 'Principle:', 'The vertical strategy crystallizes after Phase 0, not before it.')

    thin_line(doc)
    doc.add_heading('Pain Signals That Predict a Close', level=1)
    body(doc, 'Ranked by close probability — the higher on this list, the faster they buy:')

    doc.add_heading('1. "Nobody picks up our phone."', level=2)
    body(doc, 'Missed calls are visible and painful. They know they\'re losing business. Clara solves this on day one. Fastest close in the playbook.')

    doc.add_heading('2. "I still answer the phone myself."', level=2)
    body(doc, 'Owner trapped in operations. They started the business to do the work, not answer phones. Clara gives them their time back. Emotional close.')

    doc.add_heading('3. "We lose customers to competitors who respond faster."', level=2)
    body(doc, 'They\'ve lost deals because someone else picked up first. Speed-to-response is a competitive advantage they can feel. Clara + Jonas + Lina create that speed.')

    doc.add_heading('4. "Scheduling is chaos."', level=2)
    body(doc, 'Manual coordination across people, locations, or calendars. Double-bookings, missed appointments, constant back-and-forth. Maren eliminates this.')

    doc.add_heading('5. "We have no idea what happens after the first call."', level=2)
    body(doc, 'Leads come in, but follow-up is inconsistent. No system, no visibility. Lina + Nora close this gap.')

    thin_line(doc)
    doc.add_heading('What Makes a GOOD Phase 0 Customer', level=1)
    bullet(doc, 'Owner-operator or managing director who doesn\'t need board approval.', bold_prefix='Can decide in one meeting. ')
    bullet(doc, 'No RFP, no vendor review, no 6-month evaluation cycle.', bold_prefix='No procurement process. ')
    bullet(doc, 'GDPR compliance is built in, but they shouldn\'t need a legal team to evaluate a €2K/month service.', bold_prefix='No legal review. ')
    bullet(doc, 'They want the problem solved this month, not evaluated this quarter.', bold_prefix='Values speed over process. ')
    bullet(doc, 'Reachable by phone, WhatsApp, or LinkedIn. If you can\'t get them on a call within a week, move on.', bold_prefix='Accessible. ')
    bullet(doc, 'At least one of the five pain signals above is present and acknowledged.', bold_prefix='Has real pain. ')
    body(doc, '')
    blockquote(doc, 'The ideal Phase 0 customer says: "If this works, I\'ll pay you tomorrow."')

    thin_line(doc)
    doc.add_heading('Phase 0 vs. v3 Mid-Market ICP', level=1)
    make_table(doc,
        ['Phase 0', 'v3 Mid-Market'],
        [
            ['3-20 employees', '50-500 employees'],
            ['€0-5M revenue', '€5-100M revenue'],
            ['Owner decides alone', 'Buying committee involved'],
            ['Month-to-month at €2-3K', 'Annual contracts at €35K-€195K'],
            ['No procurement', 'Formal vendor evaluation'],
            ['Founder-led support', 'Customer success team'],
        ],
        col_widths=[3.1, 3.1])
    body(doc, '')
    callout(doc, 'That\'s the point.', 'Phase 0 customers are easy to close, fast to deploy, and generate proof. They are stepping stones, not the destination. Every Phase 0 customer makes the v3 customer more achievable.')

    thin_line(doc)
    doc.add_heading('Disqualification Criteria', level=1)
    body(doc, 'Disqualify only if:')
    bullet(doc, 'If their front office runs smoothly and they have no coordination overhead, the platform solves a problem they don\'t have.', bold_prefix='No phone/ops pain. ')
    bullet(doc, 'If you can\'t get the person who can say yes on a call within 7 days, the opportunity cost is too high.', bold_prefix='Decision-maker unreachable. ')
    bullet(doc, 'The 2-week trial is free. After that, it\'s €2-3K/month. If they won\'t pay after seeing it work, they\'re not a customer.', bold_prefix='Expects free indefinitely. ')
    bullet(doc, 'Phase 0 runs one universal demo agent. If they need deep custom work before they\'ll even try it, save them for Phase 1.', bold_prefix='Needs heavy customization. ')
    body(doc, '')
    body(doc, 'Everything else is a go. Weird vertical? Fine. Tiny company? Fine. Non-obvious use case? Even better — you might discover something.')

    add_footer(doc, 'Phase 0 — Ideal Customer Profile — Confidential')
    save(doc, f'{OUT}/01_Proof_Phase_ICP.docx')


# ═══════════════════════════════════════════════════════
# 02 — SALES MOTION
# ═══════════════════════════════════════════════════════
def gen_02():
    doc = create_doc()
    cover_page(doc,
        'Sales Motion',
        'Phase 0 — 90-Day Plan: Demo, Trial, Close',
        COMMON_META, doc_number='Document 02')

    navy_line(doc)
    doc.add_heading('Core Principle', level=1)
    callout(doc, 'Philosophy:', 'The product sells itself. My job is to get it in front of people and let them experience it.')
    body(doc, 'No pitch deck closes a deal. The demo call does. Every conversation is a path to "just call this number."')

    thin_line(doc)
    doc.add_heading('The Demo Call Opener', level=1)
    blockquote(doc, '"What I\'m about to show you is not a phone bot. It\'s seven AI specialists that run your front office. One answers every call. One coordinates scheduling. One qualifies leads. One handles documentation. One follows up with customers. One manages team operations. And one gives you real-time visibility. Instead of explaining it — just call this number."')
    body(doc, 'Then shut up. Let them call. Let them experience it. The product does the rest.')

    thin_line(doc)
    doc.add_heading('90-Day Plan', level=1)

    doc.add_heading('Week 1-2: Ship the Demo', level=2)
    bullet(doc, 'One universal demo agent live ("Schmitt & Partner").')
    bullet(doc, 'All 7 agents visible and functional in the demo flow.')
    bullet(doc, 'Test the demo 50+ times. Call as different personas. Break it. Fix it. Polish it.')
    bullet(doc, 'Demo number live 24/7. If someone calls at 2am, Clara answers.')
    bullet(doc, 'Prepare the 1-pager PDF: "Call this number. Ask anything."')
    callout(doc, 'Exit criteria:', 'Demo is rock-solid. You\'d bet money on it handling any reasonable call.')

    doc.add_heading('Week 3-6: Get in Rooms', level=2)
    body(doc, '10-15 warm conversations minimum. Sources:')
    bullet(doc, 'Personal network (friends, family, former colleagues who run businesses)')
    bullet(doc, 'BNI or similar networking groups')
    bullet(doc, 'LinkedIn DMs to local business owners (Berlin and DACH region)')
    bullet(doc, 'Local business events, meetups, chamber of commerce')
    body(doc, 'Every conversation ends with one of two outcomes:')
    bullet(doc, '"I\'ll set up an AI team for your business for free for 2 weeks." (if they have the pain)', bold_prefix='1. ')
    bullet(doc, '"Who do you know that\'s frustrated about missed calls?" (if they don\'t)', bold_prefix='2. ')
    callout(doc, 'Exit criteria:', '5-8 demo calls booked from warm conversations.')

    doc.add_heading('Week 5-10: Run Trials', level=2)
    bullet(doc, '2-3 trials running simultaneously. More than 3 is unsustainable as a solo founder.')
    bullet(doc, 'Week 1: Founder monitors every interaction. Daily summary to customer.')
    bullet(doc, 'Week 2: Customer gets comfortable. Founder checks in every 2 days.')
    bullet(doc, 'Direct WhatsApp support with Remington for every trial customer.')
    bullet(doc, 'Document everything: call volumes, resolution rates, edge cases, customer feedback.')
    callout(doc, 'Exit criteria:', '3-4 trials completed with clear go/no-go signal from each.')

    doc.add_heading('Week 8-13: Convert and Collect Proof', level=2)
    bullet(doc, 'Close trials at Phase 0 pricing (€2-3K/month, no setup, month-to-month).')
    bullet(doc, 'Collect proof artifacts from every customer:')
    bullet(doc, 'Before/after data (missed calls, response times, appointments)', level=1)
    bullet(doc, 'Written or video testimonial', level=1)
    bullet(doc, 'Permission to use business name and logo', level=1)
    bullet(doc, 'One-paragraph case study', level=1)
    bullet(doc, 'Begin using proof from Customer 1 to close Customer 3, 4, 5.')
    callout(doc, 'Exit criteria:', '5 paying customers. €10-15K MRR. 2+ case studies ready.')

    thin_line(doc)
    doc.add_heading('Solo Founder Weekly Rhythm', level=1)
    make_table(doc,
        ['Day', 'Activity', 'Hours'],
        [
            ['Monday', '2 outreach conversations + trial monitoring', '3-4h'],
            ['Tuesday', 'Product work (build, fix, improve) + trial check-ins', '5-6h'],
            ['Wednesday', '1-2 demo calls + trial monitoring', '3-4h'],
            ['Thursday', 'Product work (build, fix, improve)', '4-5h'],
            ['Friday', '1 LinkedIn post + admin + weekly review', '2-3h'],
        ],
        col_widths=[1.5, 3.2, 1.0])
    body(doc, '')
    body(doc, 'Totals: ~10-12 hours/week selling, ~15-20 hours/week building. These overlap — a trial check-in call that surfaces a bug is both selling and building.')

    thin_line(doc)
    doc.add_heading('Pipeline Math', level=1)
    body(doc, '15 warm conversations → 5-8 demo calls → 3-4 trials → 2-3 customers. Repeat this cycle twice in 90 days = 5 customers.')
    callout(doc, 'Important:', 'This is NOT a funnel — it\'s a hustle. There\'s no top-of-funnel content, no nurture sequence, no marketing automation. It\'s one founder having conversations and letting the product speak.')
    body(doc, '')
    make_table(doc,
        ['Stage', 'Conversion', 'Rationale'],
        [
            ['Warm conversation → demo call', '~40-50%', 'Pain is present and they\'re curious'],
            ['Demo call → trial', '~50-60%', 'The demo is genuinely impressive'],
            ['Trial → customer', '~60-70%', 'They\'ve seen it work on their business'],
        ],
        col_widths=[2.4, 1.2, 2.6])

    thin_line(doc)
    doc.add_heading('4-Phase Sales Structure', level=1)

    doc.add_heading('Phase 1: Demo', level=2)
    body(doc, 'Deliver the opener. Let them call the demo number. If on a call: screen share and walk through together. If in person: hand them your phone. Duration: 10-15 minutes.')

    doc.add_heading('Phase 2: Demo Kit', level=2)
    body(doc, 'Send the 1-pager PDF after the demo call. Include the demo number so they can call again. "What to Watch For" checklist adapted for Phase 0.')

    doc.add_heading('Phase 3: Trial', level=2)
    body(doc, '2-week free trial on their business. Founder configures their agent team. Daily summaries in Week 1, every-other-day in Week 2. WhatsApp support direct to Remington.')

    doc.add_heading('Phase 4: Close', level=2)
    body(doc, 'Trial ends. Review the data together. Use the Phase 0 close script. Sign month-to-month at Phase 0 pricing.')

    thin_line(doc)
    doc.add_heading('Phase 0 Close Script', level=1)
    body(doc, 'Anchor at v3 pricing. Offer Phase 0 pricing as exclusive early-adopter positioning.')
    blockquote(doc, '"You\'ve seen what the platform does for your business over the last two weeks. Companies will pay €35K or more to implement this — and they will, once we have the case studies to prove it. Right now, I\'m building those case studies. You\'re one of our first five customers, which means you get founder-level attention at early-adopter pricing: €2-3K per month, no setup fee, cancel anytime. The only thing I ask in return is permission to share your results — anonymized or named, your choice."')
    body(doc, '')
    bullet(doc, 'Anchor high (€35K) so €2-3K feels like a steal.')
    bullet(doc, 'Frame them as early adopters, not discount customers.')
    bullet(doc, 'The "permission to share results" ask creates reciprocity and secures the case study.')
    bullet(doc, 'Month-to-month removes risk.')

    thin_line(doc)
    doc.add_heading('Objection Handling', level=1)

    doc.add_heading('"You don\'t have any other customers."', level=2)
    blockquote(doc, '"That\'s exactly why you\'re getting this pricing. In 6 months, when we have 15 customers and case studies from every industry, this will cost 5x more. You\'re getting in early."')

    doc.add_heading('"What if you shut down?"', level=2)
    blockquote(doc, '"Month-to-month. If we disappear, you stop paying. You\'ve risked nothing except 2 weeks of your time on a free trial — and you\'ve already seen it work."')

    doc.add_heading('"I need to think about it."', level=2)
    blockquote(doc, '"Totally fair. While you think, the demo number is live 24/7. Call it again whenever you want. I\'ll check in on Thursday."')

    doc.add_heading('"Can you do it cheaper?"', level=2)
    blockquote(doc, '"€2K/month is already below what we\'ll charge in Phase 1. At this price, I\'m essentially investing my time in your business to build a case study. I can\'t go lower and sustain the level of support you\'ll get."')

    add_footer(doc, 'Phase 0 — Sales Motion — Confidential')
    save(doc, f'{OUT}/02_Proof_Phase_Sales_Motion.docx')


# ═══════════════════════════════════════════════════════
# 03 — PRICING
# ═══════════════════════════════════════════════════════
def gen_03():
    doc = create_doc()
    cover_page(doc,
        'Pricing Strategy',
        'Phase 0 — Earn the right to charge more later',
        COMMON_META, doc_number='Document 03')

    navy_line(doc)
    doc.add_heading('Pricing Philosophy', level=1)
    callout(doc, 'Principle:', 'Earn the right to charge more later. The first 5 customers buy proof, not a product.')
    body(doc, 'Phase 0 pricing is not what the platform is worth. It\'s what removes friction for customers who are taking a bet on a solo founder with zero track record. The price should make saying yes trivially easy while still creating real commitment.')

    thin_line(doc)
    doc.add_heading('Phase 0 Pricing', level=1)
    make_table(doc,
        ['', 'Detail'],
        [
            ['Tier', 'Proof Customer'],
            ['Setup', '€0'],
            ['Monthly', '€2,000-3,000/mo'],
            ['Terms', 'Month-to-month, cancel anytime'],
        ],
        col_widths=[1.5, 4.7])

    doc.add_heading('What\'s Included', level=2)
    bullet(doc, 'Full 7-agent platform (Clara, Maren, Jonas, Tobias, Lina, Kai, Nora)')
    bullet(doc, '2-week free trial before any payment')
    bullet(doc, 'Founder-led configuration and onboarding')
    bullet(doc, 'Direct WhatsApp support with Remington')
    bullet(doc, 'Daily/weekly performance summaries')
    bullet(doc, 'All platform updates and improvements during the engagement')
    bullet(doc, 'GDPR-compliant, EU-hosted infrastructure')

    doc.add_heading('What\'s NOT Included (Yet)', level=2)
    bullet(doc, 'Custom integrations beyond standard setup')
    bullet(doc, 'Multi-location deployment (one location per customer in Phase 0)')
    bullet(doc, 'Dedicated success manager (it\'s Remington for everything)')
    bullet(doc, 'SLA with guaranteed response times (best-effort, but founder-led means fast)')

    thin_line(doc)
    doc.add_heading('Framing to Customer', level=1)
    blockquote(doc, '"You\'re getting founder-level attention at early-adopter pricing. This will cost 5x more in 6 months. I\'m building case studies, and you\'re getting a product that large companies will pay €35K+ to implement."')
    body(doc, '')
    bullet(doc, 'Language matters. "Early-adopter pricing" signals exclusivity. "Discount" signals cheap.', bold_prefix='They\'re early adopters, not discount customers. ')
    bullet(doc, 'Always mention that the platform will cost €35K+ for setup alone. Makes €2-3K/month feel like a steal.', bold_prefix='Anchor at v3 pricing. ')
    bullet(doc, 'They\'re not getting less — they\'re getting more. Direct access to the person who built it.', bold_prefix='Founder-level attention is the premium. ')
    bullet(doc, 'This pricing disappears after 5 customers. No coupon codes, no negotiation — it\'s structural.', bold_prefix='Time-limited by nature. ')

    thin_line(doc)
    doc.add_heading('Price Escalation Path', level=1)

    doc.add_heading('After Customer 3', level=2)
    bullet(doc, 'New customers pay €3-5K/month.')
    bullet(doc, 'Existing customers stay at their original rate (honor the early-adopter deal).')
    bullet(doc, 'You now have proof: "3 businesses are running on this right now."')

    doc.add_heading('After Customer 5', level=2)
    bullet(doc, 'Introduce €5-10K setup fee.')
    bullet(doc, 'Monthly moves to €3-5K/month.')
    bullet(doc, 'Phase 0 is over. Phase 1 pricing reflects real market feedback.')

    doc.add_heading('Phase 1 (5-15 customers)', level=2)
    bullet(doc, 'v3 pricing tiers begin to take shape.')
    bullet(doc, 'Setup fees: €5-12K depending on complexity.')
    bullet(doc, 'Monthly: €2-5K depending on agent count and usage.')
    bullet(doc, 'Annual contracts become an option (discount for commitment).')

    doc.add_heading('Phase 2 (15+ customers)', level=2)
    bullet(doc, 'v3 tiers (€12K-€195K) become real.')
    bullet(doc, 'Pricing reflects case studies, proven ROI, and market positioning.')
    bullet(doc, 'Phase 0 customers offered upgrade path or grandfathered at reasonable rates.')

    thin_line(doc)
    doc.add_heading('What NOT to Do', level=1)

    doc.add_heading('Don\'t price at €499/month.', level=2)
    body(doc, 'That\'s SaaS commodity pricing. It attracts the wrong customer — someone comparing you to Calendly or a basic chatbot. At €499/month, you\'re a tool. At €2K/month, you\'re a service. At €35K setup, you\'re a transformation.')

    doc.add_heading('Don\'t price at €35K setup.', level=2)
    body(doc, 'You have zero proof, zero case studies, zero references. Nobody pays €35K to a solo founder they met last week. The v3 pricing is earned, not declared.')

    doc.add_heading('Don\'t do free forever.', level=2)
    body(doc, 'The 2-week trial is free. After that, €2K/month minimum. Free customers don\'t provide signal — they don\'t churn because they never committed.')

    doc.add_heading('Don\'t negotiate below €2K/month.', level=2)
    body(doc, '€2K is the floor. Below that, the unit economics don\'t work even for Phase 0, and you signal that the product isn\'t worth real money.')

    thin_line(doc)
    doc.add_heading('Revenue Scenarios', level=1)
    make_table(doc,
        ['Scenario', 'MRR', 'ARR (run rate)', 'Margin (~90%)'],
        [
            ['Conservative: 3 customers at €2K', '€6,000', '€72,000', '€5,400/mo'],
            ['Target: 5 customers at €2.5K', '€12,500', '€150,000', '€11,250/mo'],
            ['Optimistic: 5 at €3K + 2 setups at €5K', '€15,000', '€180,000 + €10K one-time', '€13,500/mo'],
        ],
        col_widths=[2.5, 1.0, 1.5, 1.2])

    thin_line(doc)
    doc.add_heading('Relationship to v3 Pricing', level=1)
    make_table(doc,
        ['v3 Tier', 'Setup', 'Monthly', 'Annual'],
        [
            ['Starter', '€12,000', '€2,500', '€30,000'],
            ['Professional', '€35,000', '€5,500', '€66,000'],
            ['Enterprise', '€95,000', '€8,500', '€102,000'],
            ['Enterprise Plus', '€195,000', '€12,000', '€144,000'],
        ],
        col_widths=[1.8, 1.3, 1.3, 1.3])
    body(doc, '')
    callout(doc, 'Path:', 'Phase 0: €0 setup, €2-3K/mo (proof) → Phase 1: €5-12K, €2-5K/mo (repeatable) → Phase 2: v3 tiers €12K-€195K (scale). Every step up is earned by the proof generated in the step before.')

    add_footer(doc, 'Phase 0 — Pricing Strategy — Confidential')
    save(doc, f'{OUT}/03_Proof_Phase_Pricing.docx')


# ═══════════════════════════════════════════════════════
# 04 — DEMO SPEC
# ═══════════════════════════════════════════════════════
def gen_04():
    doc = create_doc()
    cover_page(doc,
        'Demo Specification',
        'Phase 0 — "Schmitt & Partner" Universal Demo Agent',
        COMMON_META, doc_number='Document 04')

    navy_line(doc)
    doc.add_heading('Demo Agent: "Schmitt & Partner"', level=1)
    body(doc, 'A fictional multi-service business designed to be relatable across verticals.')

    doc.add_heading('Why "Schmitt & Partner"', level=2)
    bullet(doc, 'Generic enough to map onto any business type (dental practice, plumbing company, real estate agency, law firm, salon).')
    bullet(doc, 'Specific enough to feel real (takes service calls, books appointments, handles inquiries, coordinates a team).')
    bullet(doc, 'German name signals DACH market focus without limiting appeal.')
    bullet(doc, '"& Partner" implies a team, which makes all 7 agents feel natural.')

    doc.add_heading('Demo Business Profile', level=2)
    make_table(doc,
        ['Attribute', 'Detail'],
        [
            ['Type', 'Multi-service business with 8 employees'],
            ['Locations', 'Two (main office + satellite)'],
            ['Call volume', '30-50 calls per day'],
            ['Mix', 'New inquiries, existing customer calls, internal coordination'],
            ['Archetype', 'Typical German Mittelstand with real operational complexity'],
        ],
        col_widths=[1.8, 4.4])
    body(doc, '')
    callout(doc, 'Availability:', '24/7 on demo number. If someone calls at 2am on a Sunday, Clara answers. This is the single most impressive thing about the demo — it never sleeps, never takes a break, never has a bad day.')

    thin_line(doc)
    doc.add_heading('Demo Flow — 7 Agents', level=1)

    for agent, trigger, desc in [
        ('Clara — Virtual Receptionist', 'Call the number.', 'Clara answers warmly, identifies herself as the receptionist for Schmitt & Partner, and asks how she can help. She handles the initial greeting, determines intent, and routes accordingly.'),
        ('Maren — Appointment Coordinator', '"I\'d like to make an appointment" or "When are you available?"', 'Maren takes over scheduling. She checks availability, proposes times, confirms location, and books the appointment. She handles rescheduling and cancellation requests naturally.'),
        ('Jonas — Lead Qualification', '"I need a quote for..." or describe a service need.', 'Jonas qualifies the inquiry: what service, what scope, what timeline, what budget range. He routes the qualified lead appropriately and confirms next steps.'),
        ('Lina — Customer Follow-Up', '"What happens after I book?" or "Will someone follow up?"', 'Lina explains the follow-up process: confirmation via WhatsApp/email, reminder before the appointment, satisfaction check after the service.'),
        ('Kai — Team Operations', '"Can I speak to someone about team scheduling?"', 'Kai explains how team coordination works: shift scheduling, vacation coverage, task assignments. He demonstrates the operations layer that keeps the team running.'),
        ('Tobias — Field Documentation', '"How do you handle quotes in the field?"', 'Tobias explains how field workers capture notes, generate quotes, and document work — all through voice. Voice notes become formatted documents without manual data entry.'),
        ('Nora — Location Intelligence', '"How do I know what\'s happening across locations?"', 'Nora provides real-time visibility: call volumes, response times, conversion rates, team utilization. She demonstrates the analytics layer.'),
    ]:
        doc.add_heading(agent, level=2)
        body(doc, f'Trigger: {trigger}', italic=True, size=10, color=MEDIUM_GRAY)
        body(doc, desc)

    thin_line(doc)
    doc.add_heading('Demo Pitch', level=1)
    blockquote(doc, '"What I\'m about to show you is not a phone bot. It\'s seven AI specialists that run your front office. One answers every call. One coordinates scheduling. One qualifies leads. One handles documentation. One follows up with customers. One manages team operations. And one gives you real-time visibility. Instead of explaining it — just call this number."')
    body(doc, '')
    bullet(doc, 'Say it with conviction. You built this. You believe in it.')
    bullet(doc, 'Pause after "just call this number." Let the weight land.')
    bullet(doc, 'Don\'t oversell. The demo does the selling. Your job is to set the frame and get out of the way.')

    thin_line(doc)
    doc.add_heading('Demo Delivery (Phase 0 — Lean)', level=1)
    body(doc, 'No physical demo kits, no branded materials, no event booths. Phase 0 demo delivery is WhatsApp and PDF.')

    doc.add_heading('WhatsApp the Demo Number', level=2)
    body(doc, 'Primary delivery mechanism. After a conversation, text them the number. "Here\'s the number. Call anytime — it\'s live 24/7. Call at midnight if you want. It\'ll answer."')

    doc.add_heading('PDF 1-Pager', level=2)
    bullet(doc, 'Demo phone number (large, prominent)')
    bullet(doc, '"Call this number. Ask anything."')
    bullet(doc, '7 agents listed with one-line descriptions')
    bullet(doc, '"Built in Berlin. GDPR-first. EU-hosted."')
    bullet(doc, 'Remington\'s WhatsApp for questions')
    bullet(doc, 'Design: clean, minimal, professional. No stock photos, no fluff.')

    doc.add_heading('"What to Watch For" Checklist', level=2)
    for i, item in enumerate([
        'Listen to the greeting. Does Clara sound natural? Would your customers feel comfortable?',
        'Try to book an appointment. Is the scheduling smooth? Does Maren handle edge cases?',
        'Describe a service need. Does Jonas ask the right qualifying questions?',
        'Ask about follow-up. Does Lina\'s process feel like something your customers would appreciate?',
        'Ask about team coordination. Does Kai\'s approach match how your team actually works?',
        'Ask about field documentation. Could Tobias replace your current quote/note process?',
        'Ask about reporting. Would Nora\'s insights change how you make decisions?',
    ], 1):
        bullet(doc, item, bold_prefix=f'{i}. ')

    thin_line(doc)
    doc.add_heading('Why One Universal Demo', level=1)
    bullet(doc, 'Building vertical-specific demos before having a single customer is premature optimization.', bold_prefix='Vertical-specific demos are Phase 1. ')
    bullet(doc, 'After 5 deployments, patterns emerge. That data determines which vertical-specific demos to build.', bold_prefix='Phase 0 needs data to specialize. ')
    bullet(doc, 'Whether dental, plumbing, real estate, or law — the operational pain is the same.', bold_prefix='"Schmitt & Partner" is universally relatable. ')

    doc.add_heading('Same demo, different emphasis', level=2)
    bullet(doc, 'Dental practice worried about missed calls? Lead with Clara.')
    bullet(doc, 'Trades company drowning in scheduling? Lead with Maren.')
    bullet(doc, 'Real estate agency losing leads to slow follow-up? Lead with Lina + Jonas.')
    bullet(doc, 'Growing team struggling with coordination? Lead with Kai.')

    thin_line(doc)
    doc.add_heading('Demo Quality Standards', level=1)
    body(doc, 'Before going live with the demo number:')
    bullet(doc, 'Clara handles 50+ test calls without breaking')
    bullet(doc, 'Each agent handoff is smooth and natural')
    bullet(doc, 'German language quality is native-level (no awkward phrasing, no English leakage)')
    bullet(doc, 'Handles unexpected questions gracefully (doesn\'t hallucinate, doesn\'t freeze)')
    bullet(doc, 'Call quality is clear (no latency issues, no audio artifacts)')
    bullet(doc, 'Available 24/7 with no downtime during test period')
    bullet(doc, 'Remington has called it as 10+ different personas')
    body(doc, '')
    callout(doc, 'Standard:', 'The demo is the product in Phase 0. If the demo isn\'t exceptional, nothing else matters.')

    add_footer(doc, 'Phase 0 — Demo Specification — Confidential')
    save(doc, f'{OUT}/04_Proof_Phase_Demo.docx')


# ═══════════════════════════════════════════════════════
# 05 — PROOF TO V3 BRIDGE
# ═══════════════════════════════════════════════════════
def gen_05():
    doc = create_doc()
    cover_page(doc,
        'Proof to v3 Bridge',
        'Phase 0 — How 5 SMB customers unlock the mid-market strategy',
        COMMON_META, doc_number='Document 05')

    navy_line(doc)
    doc.add_heading('What 5 SMB Customers Produce for v3', level=1)
    body(doc, 'Every Phase 0 customer is an investment in the mid-market strategy. Here\'s exactly what 5 paying SMB customers unlock:')

    doc.add_heading('1. Case Studies with Real Data', level=2)
    body(doc, 'Before/after metrics that mid-market buyers need to see before writing a €35K check:')
    bullet(doc, 'Missed calls reduced from X% to Y%')
    bullet(doc, 'Average response time dropped from Z minutes to under 10 seconds')
    bullet(doc, 'Appointments booked per week increased by N%')
    bullet(doc, 'Lead-to-appointment conversion improved by M%')
    bullet(doc, 'Owner hours reclaimed per week')
    body(doc, 'These aren\'t projections. They\'re measurements from real businesses.')

    doc.add_heading('2. Battle-Tested Demo', level=2)
    body(doc, '5 deployments = 5 rounds of tuning. Each customer surfaces edge cases, dialect variations, industry-specific language, and operational patterns. The demo a mid-market prospect sees in Phase 1 will be dramatically better than the one the first SMB customer saw.')

    doc.add_heading('3. Objection Immunity', level=2)
    body(doc, 'The single most damaging objection in enterprise sales: "Have you done this before?"')
    blockquote(doc, '"Yes. Five businesses are running on this right now. Here are their names, their results, and their phone numbers if you want to call them."')
    body(doc, 'This is not a nice-to-have. This is table stakes for any deal above €10K.')

    doc.add_heading('4. Pricing Confidence', level=2)
    body(doc, 'Phase 0 reveals what the market actually pays for. After 5 customers:')
    bullet(doc, 'Which agents deliver the most perceived value?')
    bullet(doc, 'What\'s the willingness-to-pay range?')
    bullet(doc, 'What does the customer talk about when they describe the product to someone else?')
    bullet(doc, 'Which features do they use daily vs. which do they forget exist?')

    doc.add_heading('5. Vertical Signal', level=2)
    body(doc, 'Strategy documents hypothesize verticals. Customer data reveals them. After 5 customers:')
    bullet(doc, 'If 3 are in the same industry, you have a vertical to own.')
    bullet(doc, 'If they\'re spread across 5 industries, you have horizontal proof.')
    callout(doc, 'Principle:', 'The vertical strategy crystallizes from deployment data, not market research.')

    doc.add_heading('6. Revenue', level=2)
    body(doc, '€10-15K MRR funds continued operation while selling upmarket. It\'s not venture-scale money — it\'s enough to keep building, keep selling, and not need to raise capital from a position of desperation. Phase 0 revenue buys time. Time buys options.')

    thin_line(doc)
    doc.add_heading('Phase Gates', level=1)

    doc.add_heading('Phase 0 → Phase 1 Gate', level=2)
    body(doc, 'All criteria must be met before Phase 1 execution begins:')
    bullet(doc, 'Not just signed — retained. They renewed because the product delivers value.', bold_prefix='3+ paying customers retained 2+ months. ')
    bullet(doc, 'Written, formatted, and ready to send to prospects. At least one with the customer\'s real name and business.', bold_prefix='2+ case studies with permission to use name/logo/data. ')
    bullet(doc, 'The platform runs without Remington babysitting every interaction.', bold_prefix='Demo agent handles 90%+ of calls without intervention. ')
    bullet(doc, 'The data from 5 deployments shows a cluster.', bold_prefix='One clear vertical pattern emerged. ')
    bullet(doc, 'Enough recurring revenue to fund solo operations for the next phase.', bold_prefix='€10K+ MRR. ')

    doc.add_heading('Phase 1 → Phase 2 Gate', level=2)
    bullet(doc, 'Scale beyond what one person can manually manage.', bold_prefix='10+ paying customers. ')
    bullet(doc, 'People finding sevenlayers without Remington reaching out first.', bold_prefix='Inbound inquiries happening. ')
    bullet(doc, 'Not just "we have customers in dental" but a repeatable motion.', bold_prefix='One vertical dominates. ')
    bullet(doc, 'Revenue that funds a small team or meaningful go-to-market investment.', bold_prefix='€30K+ MRR. ')
    bullet(doc, 'A specific, defensible answer to "what would you do with €1M?"', bold_prefix='Can articulate what capital would accelerate. ')

    thin_line(doc)
    doc.add_heading('The Bridge: Phase 0 → v3', level=1)
    make_table(doc,
        ['Phase 0 Produces', 'v3 Requires', 'Connection'],
        [
            ['5 SMB case studies', 'Proof that platform works', '"Here are 5 businesses running on sevenlayers today."'],
            ['Real before/after data', 'ROI justification for €35K+', '"Average customer reduces missed calls by X%."'],
            ['Battle-tested demo', 'Flawless mid-market demo', '5 deployments = 5 rounds of hardening.'],
            ['Customer testimonials', 'Social proof for buying committee', '"Call these business owners. Ask them directly."'],
            ['Vertical signal', 'Vertical-specific go-to-market', 'Data reveals the vertical; v3 strategy owns it.'],
            ['Pricing data', 'Confident v3 tier pricing', 'Real willingness-to-pay data replaces hypotheses.'],
            ['€10-15K MRR', 'Operational funding', 'Revenue buys time to sell upmarket.'],
        ],
        col_widths=[1.8, 1.8, 2.6])

    thin_line(doc)
    doc.add_heading('The Pitch to Yourself', level=1)
    body(doc, 'Read this when Phase 0 feels slow, or when the temptation to skip to v3 pricing kicks in.', italic=True, color=MEDIUM_GRAY)
    blockquote(doc, 'The v3 strategy is right. The mid-market is where the real money is. But mid-market buyers don\'t buy from strangers with no track record. Phase 0 gives you the track record. It\'s not a distraction from the vision — it\'s the fastest path to it.')
    blockquote(doc, 'Every €2K/month SMB customer generates a case study worth €35K in mid-market credibility. Every trial that converts proves the product works. Every testimonial you collect is ammunition for the buying committee you\'ll face in Phase 1.')
    blockquote(doc, 'You\'re not undercharging. You\'re investing. The return isn\'t in the €2K/month — it\'s in the proof that makes €35K/month possible.')
    body(doc, '')
    callout(doc, 'Remember:', 'Five customers. Ninety days. Then the real strategy begins.')

    add_footer(doc, 'Phase 0 — Proof to v3 Bridge — Confidential')
    save(doc, f'{OUT}/05_Proof_to_V3_Bridge.docx')


# ═══════════════════════════════════════════════════════
# 06 — PITCH SCRIPTS
# ═══════════════════════════════════════════════════════
def gen_06():
    doc = create_doc()
    cover_page(doc,
        'Pitch Scripts',
        'Phase 0 — DM Script + BNI 45-Second Pitch',
        COMMON_META, doc_number='Document 06')

    navy_line(doc)
    doc.add_heading('Voice Philosophy', level=1)
    body(doc, 'These scripts blend four communication frameworks:')
    make_table(doc,
        ['Voice', 'Role', 'Signature Move'],
        [
            ['Alan Watts', 'Opens the door — names the paradox', '"Not because nobody wants to. Because everyone\'s busy with what the growth created."'],
            ['Jefferson Fisher', 'Every sentence is a closed door', '"You don\'t have to believe it. Just call the number."'],
            ['Alex Hormozi', 'Offer is so asymmetric it feels irrational to pass', '5 spots / free trial / 2-3K after / 35K later / cancel anytime'],
            ['David Ogilvy', 'Selects the right reader, excludes the rest', '"This isn\'t for everyone. It\'s for the right ones."'],
        ],
        col_widths=[1.4, 2.2, 2.6])

    thin_line(doc)
    doc.add_heading('Script 1: Warm Network DM', level=1)
    body(doc, 'Use for: Friends, former colleagues, personal contacts. Anyone you\'d text without an introduction.', italic=True, color=MEDIUM_GRAY)
    body(doc, 'Tone: Personal first, pitch second. This is a friend letting someone in, not a broadcast.', italic=True, color=MEDIUM_GRAY)
    body(doc, '')

    blockquote(doc, 'Ich schreib dir direkt, weil ich dich kenne.')
    blockquote(doc, 'Ich hab ein KI-Team gebaut — sieben Spezialisten, die dein Büro führen. Einer nimmt jeden Anruf an. Einer koordiniert Termine. Einer qualifiziert Anfragen. Einer fasst nach. Du musst es nicht glauben. Ruf einfach diese Nummer an und hör es dir an.')
    blockquote(doc, 'Ich suche 5 Unternehmen, die es zwei Wochen kostenlos testen. Sie testen intern: mit Mitarbeitern, Freunden, Familie. Echte Gespräche, echte Daten — kein Risiko. Danach: 2–3K im Monat, jederzeit kündbar. Kein Setup.')
    blockquote(doc, 'In 6 Monaten kostet das Zehnfache. Gerade gibt es Gründer-Zugang, weil ich Case Studies baue.')
    blockquote(doc, 'Du hast selbst ein Unternehmen oder kennst jemanden, bei dem das Telefon klingelt und keiner rangeht? Schreib mir.')
    blockquote(doc, 'Empfehlungen: 20 % Provision. Kein Spaß.')
    blockquote(doc, 'https://www.sevenlayers.io/')

    body(doc, '')
    doc.add_heading('Line-by-Line Breakdown', level=2)
    make_table(doc,
        ['Line', 'Voice', 'Purpose'],
        [
            ['"Ich schreib dir direkt, weil ich dich kenne."', 'Ogilvy', 'Selects the reader. Not spam — personal.'],
            ['"sieben Spezialisten, die dein Büro führen"', 'Hormozi', 'Value stack. Not one assistant — a team.'],
            ['"Du musst es nicht glauben. Ruf einfach an"', 'Fisher', 'Closed door. No argument — just experience it.'],
            ['"Ich suche 5 Unternehmen"', 'Hormozi', 'Scarcity. Structural, not artificial.'],
            ['"jederzeit kündbar"', 'Hormozi', 'Risk reversal. Every objection pre-handled.'],
            ['"In 6 Monaten kostet das Zehnfache"', 'Ogilvy', 'Anchoring at v3 pricing.'],
            ['"Gründer-Zugang, weil ich Case Studies baue"', 'Watts', 'Honesty as persuasion.'],
            ['"Telefon klingelt und keiner rangeht"', 'Watts', 'Names the universal paradox.'],
            ['"20 % Provision. Kein Spaß."', 'Hormozi', 'Turns every reader into a sales channel.'],
        ],
        col_widths=[2.4, 0.9, 2.9])

    body(doc, '')
    doc.add_heading('Dual CTA', level=2)
    bullet(doc, '"Ich richte dir ein KI-Team ein. Zwei Wochen kostenlos."', bold_prefix='They have the pain: ')
    bullet(doc, '"20 % Provision. Schreib mir den Namen."', bold_prefix='They don\'t, but know someone: ')

    thin_line(doc)
    doc.add_heading('Script 2: BNI 45-Second Pitch', level=1)
    body(doc, 'Use for: BNI breakfast, networking events, any structured pitch window of 30-60 seconds.', italic=True, color=MEDIUM_GRAY)
    body(doc, '')

    blockquote(doc, 'Kurze Frage an alle: Was passiert bei euch im Unternehmen, wenn das Telefon klingelt — und keiner rangeht?')
    body(doc, '(1-second pause. Let it land.)', italic=True, color=MEDIUM_GRAY, size=10)
    blockquote(doc, 'Mein Name ist Remington, sevenlayers. Wir bauen KI-Teams für Unternehmen. Sieben Spezialisten, die euer Büro führen. Einer nimmt jeden Anruf an. Einer bucht Termine. Einer qualifiziert Anfragen. Einer fasst nach — automatisch.')
    blockquote(doc, 'Das ist kein Chatbot. Das ist ein Team, das rund um die Uhr arbeitet und klingt wie ein Mensch.')
    blockquote(doc, 'Ich suche gerade fünf Unternehmen, die es zwei Wochen kostenlos testen. Intern — mit Mitarbeitern, Freunden, Familie. Echte Gespräche, echte Daten. Kein Risiko.')
    blockquote(doc, 'Wenn ihr jemanden kennt, bei dem das Telefon klingelt und keiner rangeht — stellt mir die Verbindung her. Dafür gibt es 20 Prozent Provision.')
    blockquote(doc, 'Oder noch einfacher: Ruft die Demo-Nummer auf unserer Seite an. Dann hört ihr es selbst. sevenlayers.io')

    body(doc, '')
    doc.add_heading('Timing Breakdown', level=2)
    make_table(doc,
        ['Section', 'Time', 'Purpose'],
        [
            ['Opening question', '~5 sec', 'Watts — names the pain the room lives with'],
            ['Name + positioning', '~8 sec', 'Ogilvy — clear, specific, no fluff'],
            ['7-agent value stack', '~10 sec', 'Hormozi — team, not tool'],
            ['"Kein Chatbot" reframe', '~5 sec', 'Fisher — closes the chatbot objection'],
            ['Offer (5 spots, free trial)', '~7 sec', 'Hormozi — scarcity + risk reversal'],
            ['Referral CTA + provision', '~5 sec', 'Hormozi — turns the room into sales force'],
            ['Demo CTA', '~5 sec', 'Fisher — "just call and hear it" — undeniable'],
        ],
        col_widths=[2.0, 0.8, 3.4])

    body(doc, '')
    doc.add_heading('Delivery Notes', level=2)
    bullet(doc, 'Make eye contact. Don\'t rush past it. The pause after is where the room starts nodding.', bold_prefix='Opening question: ')
    bullet(doc, 'Hold up fingers or gesture — make it visual. Seven is memorable.', bold_prefix='"Sieben Spezialisten": ')
    bullet(doc, 'Say it with conviction. This is the reframe that separates you from every other AI pitch.', bold_prefix='"Kein Chatbot": ')
    bullet(doc, 'This is the close. The best BNI pitches give people something to DO.', bold_prefix='"Ruft die Demo-Nummer an": ')

    thin_line(doc)
    doc.add_heading('Script 2b: BNI 30-Second Variant', level=1)
    body(doc, 'For events that enforce 30-second limits or when the room is restless.', italic=True, color=MEDIUM_GRAY)
    blockquote(doc, 'Mein Name ist Remington, sevenlayers. Wir bauen KI-Teams, die euer Büro führen — Anrufe annehmen, Termine buchen, Anfragen qualifizieren, nachfassen. Sieben Spezialisten, kein Chatbot.')
    blockquote(doc, 'Ich suche fünf Unternehmen, die es zwei Wochen kostenlos testen. Kein Risiko.')
    blockquote(doc, 'Ihr kennt jemanden, bei dem das Telefon klingelt und keiner rangeht? Stellt mir die Verbindung her — 20 Prozent Provision. sevenlayers.io')
    body(doc, '~65 words. ~28 seconds.', italic=True, size=10, color=MEDIUM_GRAY)

    thin_line(doc)
    doc.add_heading('Adaptation Rules', level=1)
    doc.add_heading('If someone responds with interest:', level=2)
    body(doc, 'Immediately offer the demo call: "Ich zeig dir das in 10 Minuten. Hast du kurz Zeit?" — or send the demo number.')

    doc.add_heading('If someone says "not for me, but I know someone":', level=2)
    body(doc, '"Perfekt. Schick mir den Namen oder stell mich kurz vor — WhatsApp oder LinkedIn reicht. 20 % auf den ersten Jahresvertrag."')

    doc.add_heading('If someone approaches you after the BNI pitch:', level=2)
    body(doc, 'Do NOT repeat the pitch. Hand them your phone with the demo number dialed: "Hör dir das mal an." Let the product close.')

    add_footer(doc, 'Phase 0 — Pitch Scripts — Confidential')
    save(doc, f'{OUT}/06_Pitch_Scripts.docx')


# ═══════════════════════════════════════════════════════
# 07 — REFERRAL COMMISSION
# ═══════════════════════════════════════════════════════
def gen_07():
    doc = create_doc()
    cover_page(doc,
        'Referral & Commission\nStructure',
        'Phase 0 — Turn your network into your sales team',
        COMMON_META, doc_number='Document 07')

    navy_line(doc)
    doc.add_heading('One-Sentence Strategy', level=1)
    callout(doc, 'Philosophy:', 'Your friends\' contact lists are your sales team. Pay them well enough to remember you, not so much that you can\'t eat.')

    thin_line(doc)
    doc.add_heading('The Commission Structure', level=1)
    doc.add_heading('20% of the first 3 months\' revenue. Paid as the customer pays.', level=2)

    make_table(doc,
        ['Dimension', 'Detail'],
        [
            ['Commission rate', '20% of monthly invoice'],
            ['Duration', 'First 3 months of a paying customer'],
            ['Payout timing', 'Paid after each customer payment clears'],
            ['Trigger', 'Customer signs and pays first invoice'],
            ['Cap', '3 months per referred customer, then commission stops'],
        ],
        col_widths=[1.8, 4.4])

    body(doc, '')
    doc.add_heading('Example Payouts', level=2)
    make_table(doc,
        ['Customer monthly rate', 'Month 1', 'Month 2', 'Month 3', 'Total payout'],
        [
            ['€2,000/mo', '€400', '€400', '€400', '€1,200'],
            ['€2,500/mo', '€500', '€500', '€500', '€1,500'],
            ['€3,000/mo', '€600', '€600', '€600', '€1,800'],
        ],
        col_widths=[1.8, 0.9, 0.9, 0.9, 1.0])

    body(doc, '')
    doc.add_heading('Early Churn Protection', level=2)
    body(doc, 'Commission tracks the customer, not the calendar. No advance payouts, no clawbacks needed — the structure handles it naturally.')
    make_table(doc,
        ['Scenario', 'Referrer receives'],
        [
            ['Customer pays 3+ months', 'Full commission (3 months × 20%)'],
            ['Customer churns after month 2', '2 months × 20%'],
            ['Customer churns after month 1', '1 month × 20%'],
            ['Customer never pays after trial', '€0'],
        ],
        col_widths=[2.6, 3.6])

    thin_line(doc)
    doc.add_heading('Why 20% × 3 Months', level=1)

    doc.add_heading('Why not first month only?', level=2)
    body(doc, '€400–600 for an introduction is forgettable. People won\'t actively think about who in their network needs this. The commission has to be large enough that when they\'re at dinner with a business owner friend, they remember you exist.')

    doc.add_heading('Why not 6 or 12 months?', level=2)
    body(doc, 'At 5 customers all from referrals (worst case), 20% × 12 months = €30,000+ in commission on a business doing €150K ARR with zero runway. That\'s 20% of gross revenue gone. Unsustainable at Phase 0.')

    doc.add_heading('Why not a flat fee?', level=2)
    body(doc, '"20% Provision" is a story. "€1,000 Vermittlungsprämie" is a transaction. The percentage creates the feeling that they\'re participating in something — a cut of something real. It also scales naturally: if a customer pays €3K instead of €2K, the referrer benefits too. Alignment.')

    doc.add_heading('The Math at Full Phase 0 Capacity', level=2)
    make_table(doc,
        ['Scenario', 'Customers', 'All from referrals?', 'Total commission', '% of Year 1 revenue'],
        [
            ['Conservative', '5 at €2K', 'Yes (worst case)', '€6,000', '5%'],
            ['Target', '5 at €2.5K', '3 from referrals', '€4,500', '3%'],
            ['Optimistic', '5 at €3K', '2 from referrals', '€3,600', '2%'],
        ],
        col_widths=[1.2, 1.0, 1.3, 1.2, 1.1])
    body(doc, '')
    callout(doc, 'Verdict:', 'At 2–5% of Year 1 revenue, the commission structure is cheap for what it buys: warm introductions to decision-makers you\'d never reach cold.')

    thin_line(doc)
    doc.add_heading('Two Referrer Profiles', level=1)

    doc.add_heading('Profile A: The Casual Referrer', level=2)
    blockquote(doc, '"Oh, my friend Marcus has a dental practice — he complains about missed calls all the time."')
    body(doc, 'What they do: Send you one name, maybe make an introduction via WhatsApp, then forget about it.')
    body(doc, 'Commission expectation: One referral, one payout. Low maintenance.')
    body(doc, 'How to handle:')
    bullet(doc, 'Thank them immediately when they send the name')
    bullet(doc, 'Keep them updated: "Hab mit Marcus telefoniert, Demo läuft nächste Woche"')
    bullet(doc, 'Pay fast when the customer signs — within 7 days of first customer payment')
    bullet(doc, 'Send a short message when each commission payment goes out')
    callout(doc, 'Key:', 'Fast, transparent payouts turn casual referrers into repeat referrers.')

    doc.add_heading('Profile B: The Active Seller', level=2)
    blockquote(doc, '"I know a lot of business owners. How does this work — can I sell it?"')
    body(doc, 'What they do: Actively pitch to multiple contacts. Treat this like a side hustle.')
    body(doc, 'Commission expectation: Multiple referrals, recurring payouts.')
    body(doc, 'How to handle:')
    bullet(doc, 'Give them the DM script to forward or adapt')
    bullet(doc, 'Give them the demo number so they can experience it themselves first')
    bullet(doc, 'Brief them on the three pain signals: missed calls, scheduling chaos, slow follow-up')
    bullet(doc, 'Weekly check-in if they\'re actively working leads')
    bullet(doc, 'Consider a shared WhatsApp group or simple tracker if volume warrants it')
    callout(doc, 'Key:', 'Active sellers are rare and valuable. If someone emerges in Phase 0, invest time in them — they\'re your proto-sales team.')

    thin_line(doc)
    doc.add_heading('What a Referrer Needs', level=1)
    body(doc, 'Don\'t expect referrers to pitch the product. Their job is to make the introduction. Your job is to close.')

    doc.add_heading('The minimum a referrer needs:', level=2)
    bullet(doc, 'The DM script — ready to forward', bold_prefix='1. ')
    bullet(doc, 'The demo number — so they can say "just call this"', bold_prefix='2. ')
    bullet(doc, 'One sentence: "Mein Kumpel hat ein KI-Team gebaut, das dein Büro führt. Ruf mal diese Nummer an."', bold_prefix='3. ')
    bullet(doc, 'The URL: sevenlayers.io', bold_prefix='4. ')

    doc.add_heading('What they do NOT need:', level=2)
    bullet(doc, 'Pricing details (you handle that in the demo call)')
    bullet(doc, 'Technical explanation (the demo handles that)')
    bullet(doc, 'Slide decks, PDFs, or feature lists (the product sells itself)')
    bullet(doc, 'A formal agreement (keep it casual in Phase 0)')

    thin_line(doc)
    doc.add_heading('Commission Communication', level=1)

    doc.add_heading('In the DM (simple):', level=2)
    blockquote(doc, 'Empfehlungen: 20 % Provision. Kein Spaß.')

    doc.add_heading('When someone asks "20% wovon?":', level=2)
    blockquote(doc, '"20 Prozent auf die ersten drei Monate. Bei 2.500 im Monat sind das 1.500 Euro für dich — dafür, dass du mir jemanden vorstellst. Ausgezahlt wird, sobald der Kunde zahlt."')

    doc.add_heading('When someone asks for more details:', level=2)
    blockquote(doc, '"Ganz einfach: Du stellst mich vor. Ich mache Demo, Trial, Onboarding — alles. Wenn der Kunde unterschreibt, bekommst du 20 Prozent auf die ersten drei Monatszahlungen. Kein Vertrag, kein Kleingedrucktes."')

    thin_line(doc)
    doc.add_heading('Phase Transitions', level=1)

    doc.add_heading('Phase 0 → Phase 1 (after 5 customers)', level=2)
    make_table(doc,
        ['Dimension', 'Phase 0', 'Phase 1'],
        [
            ['Commission base', 'Monthly revenue only', 'Setup fee + monthly revenue'],
            ['Rate', '20% × 3 months', '15% of setup + 10% × 3 months recurring'],
            ['Example payout', '€1,500 on €2.5K/mo customer', '€1,500 setup + €750 recurring = €2,250'],
            ['Formality', 'WhatsApp confirmation', '1-page referral agreement'],
        ],
        col_widths=[1.5, 2.0, 2.7])

    body(doc, '')
    doc.add_heading('Phase 1 → Phase 2 (after 15 customers)', level=2)
    make_table(doc,
        ['Dimension', 'Phase 1', 'Phase 2'],
        [
            ['Commission base', 'Setup + 3 months recurring', 'Setup only (or tiered by deal size)'],
            ['Rate', '15% setup + 10% × 3 months', '10–15% of setup fee'],
            ['Example payout', '€2,250 on €10K + €2.5K/mo deal', '€3,500–5,250 on a €35K setup deal'],
            ['Formality', '1-page agreement', 'Formal partner agreement with terms'],
        ],
        col_widths=[1.5, 2.0, 2.7])
    body(doc, '')
    body(doc, 'The commission percentage drops as deal size grows. A 10% referral fee on a €35K setup = €3,500 — more money per deal even at a lower rate.')

    thin_line(doc)
    doc.add_heading('Rules', level=1)
    bullet(doc, 'Within 7 days of customer payment clearing. Slow payouts kill referral motivation faster than anything.', bold_prefix='Pay fast. ')
    bullet(doc, 'Tell the referrer when the customer signed, when payment came in, and when their commission is on the way.', bold_prefix='Pay transparently. ')
    bullet(doc, '20% × 3 months is the deal. If you can\'t afford it, you can\'t afford the customer acquisition cost of doing it yourself either.', bold_prefix='Never negotiate the rate down. ')
    bullet(doc, 'If two people refer the same lead, the first introduction wins. Communicate clearly if it ever comes up.', bold_prefix='Double introductions. ')
    bullet(doc, 'If someone refers a lead you were already talking to, no commission. Handle with honesty.', bold_prefix='No commission on self-sourced leads. ')
    bullet(doc, 'The referrer makes the introduction. You do the demo, the trial, the close, and the support.', bold_prefix='Referrer ≠ salesperson. ')

    add_footer(doc, 'Phase 0 — Referral & Commission — Confidential')
    save(doc, f'{OUT}/07_Referral_Commission.docx')


# ═══════════════════════════════════════════════════════
# RUN ALL
# ═══════════════════════════════════════════════════════
if __name__ == '__main__':
    import os
    os.makedirs(OUT, exist_ok=True)
    print('Generating Phase 0 McKinsey-style documents...\n')
    gen_00()
    gen_01()
    gen_02()
    gen_03()
    gen_04()
    gen_05()
    gen_06()
    gen_07()
    print(f'\nDone! All documents saved to {OUT}/')
