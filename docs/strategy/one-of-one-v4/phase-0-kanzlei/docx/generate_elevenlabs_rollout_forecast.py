#!/usr/bin/env python3
"""
Generate ElevenLabs Enterprise Rollout Forecast (DOCX).
Brand: sevenlayers — accent #E8520A, dark palette.
Purpose: Resource for ElevenLabs enterprise sales to advocate for
         a lower initial tier with documented ramp toward $5k/month.
"""

import os
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# ── Brand tokens ──────────────────────────────────────────────
ACCENT       = RGBColor(0xE8, 0x52, 0x0A)
ACCENT_DARK  = RGBColor(0xCC, 0x47, 0x09)
TEXT_PRIMARY  = RGBColor(0x1A, 0x1A, 0x1A)
TEXT_SECONDARY = RGBColor(0x55, 0x55, 0x55)
TEXT_WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
BG_LIGHT     = RGBColor(0xF7, 0xF7, 0xF7)
TABLE_HEADER_BG = "E8520A"
TABLE_ALT_BG = "FDF2EC"
TABLE_BORDER = "DDDDDD"
HIGHLIGHT_BG = "E8F5E9"  # green tint for $5k milestone row

FONT_PRIMARY = "Calibri"
FONT_MONO    = "Consolas"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
LOGO_PATH = os.path.join(PROJECT_ROOT, "public", "sevenlayers-logo.png")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "07_ElevenLabs_Rollout_Forecast.docx")


# ── Helpers ───────────────────────────────────────────────────
def set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_borders(cell, color="DDDDDD", sz="4"):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)


def add_styled_table(doc, headers, rows, col_widths=None, highlight_rows=None):
    """Create a brand-styled table. highlight_rows is a set of 0-based row indices to highlight green."""
    highlight_rows = highlight_rows or set()
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(9)
        run.font.color.rgb = TEXT_WHITE
        run.font.name = FONT_PRIMARY
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        set_cell_shading(cell, TABLE_HEADER_BG)
        set_cell_borders(cell, TABLE_HEADER_BG, "6")

    for r_idx, row_data in enumerate(rows):
        for c_idx, val in enumerate(row_data):
            cell = table.rows[r_idx + 1].cells[c_idx]
            cell.text = ""
            p = cell.paragraphs[0]
            run = p.add_run(str(val))
            run.font.size = Pt(9)
            run.font.color.rgb = TEXT_PRIMARY
            run.font.name = FONT_PRIMARY
            if r_idx in highlight_rows:
                run.bold = True
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            set_cell_borders(cell, TABLE_BORDER)
            if r_idx in highlight_rows:
                set_cell_shading(cell, HIGHLIGHT_BG)
            elif r_idx % 2 == 1:
                set_cell_shading(cell, TABLE_ALT_BG)

    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)

    return table


def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = FONT_PRIMARY
        run.font.color.rgb = ACCENT if level <= 2 else TEXT_PRIMARY
    return h


def add_para(doc, text, bold=False, italic=False, size=10, color=None, align=None, space_after=Pt(6)):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.name = FONT_PRIMARY
    run.font.color.rgb = color or TEXT_PRIMARY
    if align:
        p.alignment = align
    p.paragraph_format.space_after = space_after
    return p


def add_bullet(doc, text, bold_prefix=""):
    p = doc.add_paragraph(style="List Bullet")
    if bold_prefix:
        run = p.add_run(bold_prefix)
        run.bold = True
        run.font.size = Pt(9.5)
        run.font.name = FONT_PRIMARY
        run.font.color.rgb = TEXT_PRIMARY
    run = p.add_run(text)
    run.font.size = Pt(9.5)
    run.font.name = FONT_PRIMARY
    run.font.color.rgb = TEXT_PRIMARY
    p.paragraph_format.space_after = Pt(2)
    return p


def add_accent_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    pPr = p._p.get_or_add_pPr()
    borders = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'  <w:bottom w:val="single" w:sz="6" w:space="1" w:color="{TABLE_HEADER_BG}"/>'
        f'</w:pBdr>'
    )
    pPr.append(borders)


def add_callout_box(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(9.5)
    run.font.name = FONT_PRIMARY
    run.font.color.rgb = ACCENT_DARK
    run.italic = True
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    pPr = p._p.get_or_add_pPr()
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{TABLE_ALT_BG}"/>')
    pPr.append(shading)
    borders = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="24" w:space="4" w:color="{TABLE_HEADER_BG}"/>'
        f'</w:pBdr>'
    )
    pPr.append(borders)
    return p


# ── Document builder ──────────────────────────────────────────
def build_document():
    doc = Document()

    # Page setup (A4)
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    # Default font
    style = doc.styles["Normal"]
    style.font.name = FONT_PRIMARY
    style.font.size = Pt(10)
    style.font.color.rgb = TEXT_PRIMARY
    style.paragraph_format.space_after = Pt(6)

    for level in range(1, 4):
        hs = doc.styles[f"Heading {level}"]
        hs.font.name = FONT_PRIMARY
        hs.font.color.rgb = ACCENT if level <= 2 else TEXT_PRIMARY

    # ══════════════════════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════════════════════
    if os.path.exists(LOGO_PATH):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run()
        run.add_picture(LOGO_PATH, width=Cm(5))
        p.paragraph_format.space_after = Pt(40)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run("ElevenLabs Enterprise\nRollout Forecast")
    run.font.size = Pt(28)
    run.font.color.rgb = ACCENT
    run.font.name = FONT_PRIMARY
    run.bold = True
    p.paragraph_format.space_after = Pt(12)

    add_accent_divider(doc)

    p = doc.add_paragraph()
    run = p.add_run("sevenlayers — AI Voice Platform for German Professional Services")
    run.font.size = Pt(14)
    run.font.color.rgb = TEXT_SECONDARY
    run.font.name = FONT_PRIMARY
    p.paragraph_format.space_after = Pt(24)

    add_para(doc,
        "This document provides a 12-month rollout forecast for our ElevenLabs voice platform "
        "usage, supporting our request for an initial enterprise tier with a documented ramp "
        "plan toward $5,000+/month in platform spend.",
        size=10, color=TEXT_SECONDARY)

    add_para(doc, "Confidential  |  March 2026  |  Prepared for ElevenLabs Enterprise Sales",
             size=9, color=TEXT_SECONDARY, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=Pt(4))

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 1 — Executive Summary
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "1. Executive Summary", level=1)

    add_para(doc,
        "sevenlayers is building the AI voice reception platform for German professional "
        "services. We start with law firms — a market where 59% of callers hang up on "
        "voicemail and 68% never call back. They call the next lawyer instead.")

    add_para(doc,
        "Our platform deploys a single, powerful ElevenLabs voice agent — \"Clara\" — as "
        "the 24/7 front door to each law firm. Clara handles incoming calls in fluent German: "
        "she identifies the practice area, assesses urgency, captures structured intake data, "
        "and books appointments. Behind her, our backend agent orchestration layer handles "
        "CRM entry, calendar sync, attorney notifications, compliance logging, and escalation "
        "workflows.")

    add_callout_box(doc,
        "Architecture: One ElevenLabs voice agent (Clara) per deployment. "
        "All orchestration, booking, CRM, and compliance logic runs on our Convex backend. "
        "This is a single-agent-per-customer model with high per-agent utilization.")

    add_para(doc, "What we're asking for:", bold=True)
    add_bullet(doc, " A lower initial enterprise tier tied to a documented ramp plan, "
               "acknowledging the classic go-to-market chicken-and-egg: "
               "we need enterprise-grade reliability and pricing to close our first customers, "
               "but volume only comes after those first customers are live.", bold_prefix="Ramp-up pricing:")
    add_bullet(doc, " We project crossing $5,000/month in ElevenLabs spend "
               "by Month 8–10 of our rollout.", bold_prefix="$5k/month target:")

    # ══════════════════════════════════════════════════════════
    # SECTION 2 — Product & Architecture
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "2. Product & Architecture", level=1)

    add_heading(doc, "What Clara Does on Every Call", level=2)

    add_styled_table(doc,
        ["Step", "What happens", "Where it runs"],
        [
            ["1. Answer", "Caller greeted in fluent German, call recording disclosed", "ElevenLabs voice agent"],
            ["2. Qualify", "Practice area detected (labor, family, tenancy, criminal law)", "ElevenLabs voice agent"],
            ["3. Urgency", "Time-critical situations identified (deadlines, arrests, DV)", "ElevenLabs voice agent"],
            ["4. Intake", "Structured data captured: name, contact, facts, documents", "ElevenLabs voice agent"],
            ["5. Book", "Consultation booked into attorney's calendar", "Backend orchestration"],
            ["6. Confirm", "SMS confirmation to caller, email brief to attorney", "Backend orchestration"],
            ["7. Escalate", "Emergency cases: push notification + direct transfer option", "Backend orchestration"],
            ["8. Archive", "Complete case file documented for compliance", "Backend orchestration"],
        ],
        col_widths=[2, 7.5, 4.5]
    )

    add_heading(doc, "Practice Area Templates", level=2)
    add_para(doc,
        "Clara adapts her conversation flow per practice area using pre-built intake templates. "
        "Each template is tuned for the specific urgency patterns, deadline sensitivities, "
        "and emotional dynamics of that legal domain:")

    add_bullet(doc, " — 3-week filing deadline detection, severance negotiation intake", bold_prefix="Labor law (Arbeitsrecht)")
    add_bullet(doc, " — domestic violence screening, emergency motion prioritization", bold_prefix="Family law (Familienrecht)")
    add_bullet(doc, " — defect documentation, rent reduction deadlines", bold_prefix="Tenancy law (Mietrecht)")
    add_bullet(doc, " — 24/7 emergency intake: arrest, search, summons detection", bold_prefix="Criminal law (Strafrecht)")

    add_heading(doc, "Technical Integration", level=2)
    add_bullet(doc, " ElevenLabs Conversational AI (single agent per customer deployment)", bold_prefix="Voice:")
    add_bullet(doc, " Twilio (German local numbers, inbound routing)", bold_prefix="Telephony:")
    add_bullet(doc, " Convex (real-time backend, CRM, booking engine, compliance logging)", bold_prefix="Backend:")
    add_bullet(doc, " Google Calendar, Outlook 365, RA-MICRO (German legal practice management)", bold_prefix="Integrations:")
    add_bullet(doc, " German (native quality required). English planned for Year 2.", bold_prefix="Languages:")

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 3 — Target Market & GTM
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "3. Target Market & Go-to-Market", level=1)

    add_heading(doc, "Ideal Customer Profile (Phase 0–1: Law Firms)", level=2)

    add_styled_table(doc,
        ["Attribute", "Detail"],
        [
            ["Firm size", "5–20 lawyers"],
            ["Revenue", "€1M–€5M"],
            ["Geography", "Germany (NRW, Bavaria, Berlin, Hamburg)"],
            ["Software", "RA-MICRO users (70K workplaces — market leader in German legal practice management)"],
            ["Pain point", "Missed calls = missed revenue. 59% hang up on voicemail."],
            ["Decision maker", "Managing partner (single decision-maker, 4–6 week sales cycle)"],
            ["Call volume", "20–60 inbound calls/day, avg. 3 min duration"],
        ],
        col_widths=[4, 12]
    )

    add_heading(doc, "Sales Motion", level=2)
    add_bullet(doc, " Prospect calls a live demo number and experiences Clara firsthand", bold_prefix="1. Demo call (30 min) —")
    add_bullet(doc, " Free overflow call capture to prove ROI with real data", bold_prefix="2. Call audit (2 weeks, €0) —")
    add_bullet(doc, " Full booking enabled, prove appointment conversion", bold_prefix="3. Pilot (2 weeks, €299/mo) —")
    add_bullet(doc, " Full service with dashboard, templates, compliance", bold_prefix="4. Paid conversion (€499–1,999/mo) —")

    add_heading(doc, "Launch Events", level=2)
    add_bullet(doc, " — PRIMARY LAUNCH EVENT", bold_prefix="legalXchange Munich (Apr 28–30, 2026)")
    add_bullet(doc, " — German Bar Association annual conference", bold_prefix="Deutscher Anwaltstag (Jun 8–12, 2026)")
    add_bullet(doc, "", bold_prefix="Legal Tech Day Berlin (Sep 17, 2026)")

    add_heading(doc, "Expansion Verticals (Year 2+)", level=2)

    add_styled_table(doc,
        ["Vertical", "TAM (Germany)", "Timeline"],
        [
            ["Law firms (Kanzleien)", "~5,000 firms in ICP", "Now — Year 1"],
            ["Tax advisors (Steuerberater)", "50,000+ firms", "Month 6–12"],
            ["Veterinary practices (Tierarztpraxen)", "10,000+ practices", "Month 12–18"],
            ["Staffing agencies (Zeitarbeitsfirmen)", "46,000 firms", "Year 2"],
        ],
        col_widths=[5, 4.5, 4.5]
    )

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 4 — Pricing Tiers & Unit Economics
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "4. Pricing Tiers & Unit Economics", level=1)

    add_heading(doc, "Customer Pricing", level=2)

    add_styled_table(doc,
        ["Tier", "Monthly", "Setup", "Firm size", "Numbers", "Est. minutes/mo"],
        [
            ["Basis", "€499", "€1,500", "2–5 lawyers", "1", "~1,500"],
            ["Professional", "€999", "€2,000", "5–15 lawyers", "2", "~3,500"],
            ["Premium", "€1,999", "€2,500", "15+ lawyers", "3+", "~6,000"],
        ],
        col_widths=[2.5, 2, 2, 3, 2, 3.5]
    )

    add_heading(doc, "COGS Breakdown (per customer, Professional tier)", level=2)

    add_styled_table(doc,
        ["Cost item", "Per minute", "Monthly (3,500 min)", "% of revenue"],
        [
            ["ElevenLabs voice", "$0.08", "~$290", "~29%"],
            ["LLM pass-through (expected)", "~$0.03", "~$105", "~11%"],
            ["Twilio telephony", "$0.01", "~$35", "~4%"],
            ["Total COGS", "$0.12", "~$430", "~43%"],
            ["Gross margin", "", "~$670", "~57%"],
        ],
        col_widths=[5, 3, 4, 4]
    )

    add_callout_box(doc,
        "ElevenLabs is our largest variable cost at ~29% of customer revenue today, "
        "rising to ~40% with LLM pass-through. Enterprise pricing directly impacts "
        "our ability to price competitively and acquire customers faster — "
        "which in turn drives ElevenLabs volume faster.")

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 5 — 12-Month Rollout Forecast (THE KEY TABLE)
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "5. 12-Month Rollout Forecast", level=1)

    add_para(doc,
        "The table below shows our month-by-month customer acquisition plan and the resulting "
        "ElevenLabs platform usage. The $5,000/month milestone is highlighted.",
        bold=False)

    add_styled_table(doc,
        ["Month", "Date", "New", "Total", "Mix (B / P / Pr)", "Total min/mo", "EL spend/mo"],
        [
            ["1",  "Apr 2026",  "2",  "2",   "2 / 0 / 0",   "3,000",    "$240"],
            ["2",  "May 2026",  "2",  "4",   "3 / 1 / 0",   "8,000",    "$640"],
            ["3",  "Jun 2026",  "3",  "7",   "4 / 2 / 1",   "17,500",   "$1,400"],
            ["4",  "Jul 2026",  "2",  "9",   "5 / 3 / 1",   "22,500",   "$1,800"],
            ["5",  "Aug 2026",  "3",  "12",  "6 / 4 / 2",   "32,000",   "$2,560"],
            ["6",  "Sep 2026",  "3",  "15",  "7 / 5 / 3",   "42,500",   "$3,400"],
            ["7",  "Oct 2026",  "3",  "18",  "8 / 6 / 4",   "51,000",   "$4,080"],
            ["8",  "Nov 2026",  "3",  "21",  "9 / 7 / 5",   "61,500",   "$4,920"],
            ["9",  "Dec 2026",  "2",  "23",  "9 / 8 / 6",   "68,000",   "$5,440"],
            ["10", "Jan 2027",  "3",  "26",  "10 / 9 / 7",  "78,500",   "$6,280"],
            ["11", "Feb 2027",  "3",  "29",  "10 / 11 / 8", "89,500",   "$7,160"],
            ["12", "Mar 2027",  "3",  "32",  "10 / 12 / 10","102,500",  "$8,200"],
        ],
        col_widths=[1.5, 2.2, 1.2, 1.2, 3.5, 3, 3],
        highlight_rows={8}  # Month 9 = $5,440 — first month crossing $5k
    )

    add_para(doc, "", space_after=Pt(4))
    add_callout_box(doc,
        "$5,000/month milestone reached in Month 9 (December 2026). "
        "Year 1 cumulative ElevenLabs spend: ~$46,000. "
        "Exiting Year 1 at a $8,200/month run rate ($98K annualized).")

    add_heading(doc, "Key Assumptions", level=2)
    add_bullet(doc, " Average call duration ~3 minutes, business days 20/month", bold_prefix="Call volume:")
    add_bullet(doc, " Basis ~1,500 min/mo, Professional ~3,500 min/mo, Premium ~6,000 min/mo", bold_prefix="Minutes per tier:")
    add_bullet(doc, " $0.08/min (current ElevenLabs rate)", bold_prefix="EL cost per minute:")
    add_bullet(doc, " Customers upgrade from Basis → Professional → Premium over time. "
               "Mix shifts toward higher tiers as firms see ROI.", bold_prefix="Tier migration:")
    add_bullet(doc, " <5% monthly (professional services with high switching costs)", bold_prefix="Churn:")

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 6 — Scenario Analysis
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "6. Scenario Analysis", level=1)

    add_styled_table(doc,
        ["Scenario", "Customers (M12)", "Minutes/mo (M12)", "EL spend/mo (M12)", "EL annual total", "$5k/mo reached"],
        [
            ["Conservative", "20", "55,000", "$4,400", "$28,000", "Month 10–11"],
            ["Target", "32", "102,500", "$8,200", "$46,000", "Month 9"],
            ["Stretch", "45", "145,000", "$11,600", "$68,000", "Month 7"],
        ],
        col_widths=[2.5, 2.8, 3, 3, 2.8, 2.8]
    )

    add_para(doc,
        "Even in the conservative scenario, we cross $4,400/month by Month 12 — "
        "and the pipeline from legalXchange Munich alone should push us into the target scenario.",
        size=9.5, color=TEXT_SECONDARY, italic=True)

    # ══════════════════════════════════════════════════════════
    # SECTION 7 — What We Need from ElevenLabs
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "7. What We Need from ElevenLabs", level=1)

    add_para(doc,
        "To execute this rollout, we're looking for a partnership structure that "
        "acknowledges our early stage while recognizing the committed trajectory:")

    needs = [
        ("Ramp-up pricing tier — ",
         "A lower initial commitment (Month 1–6) that scales to full enterprise pricing "
         "as we cross volume milestones. We commit to the documented ramp plan above."),
        ("Uptime SLA — ",
         "Law firms rely on Clara as their primary phone line. Downtime = missed cases = lost clients. "
         "We need production-grade reliability guarantees for a mission-critical deployment."),
        ("Priority support channel — ",
         "Faster-than-community response times for production issues. "
         "Our customers are law firms — they have zero tolerance for 'the AI is down.'"),
        ("German voice quality — ",
         "Native-quality German is non-negotiable. Callers must not detect they're speaking to AI. "
         "Any voice quality improvements or German-specific tuning directly impacts our conversion."),
        ("EU data residency documentation — ",
         "German law firms operate under §203 StGB (professional secrecy). "
         "We need clear documentation on where voice data is processed and stored for GDPR Art. 28 compliance."),
        ("Co-marketing opportunities — ",
         "We're launching at legalXchange Munich (Apr 28–30). A partner badge, case study, "
         "or co-branded content would strengthen our credibility in a trust-sensitive market."),
    ]
    for prefix, text in needs:
        add_bullet(doc, text, bold_prefix=prefix)

    # ══════════════════════════════════════════════════════════
    # SECTION 8 — What ElevenLabs Gets
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "8. What ElevenLabs Gets", level=1)

    add_bullet(doc, " First credible DACH vertical partner with deep domain expertise in regulated professional services.", bold_prefix="German market entry:")
    add_bullet(doc, " A single-agent architecture that showcases ElevenLabs' conversational AI in a high-stakes, real-world production environment.", bold_prefix="Technical showcase:")
    add_bullet(doc, " 100K+ mapped businesses across law firms, tax advisors, vet practices, and staffing agencies in DACH.", bold_prefix="Addressable market:")
    add_bullet(doc, " Projected $46K–$98K+ annually in platform usage, growing with each vertical expansion.", bold_prefix="Revenue commitment:")
    add_bullet(doc, " A ready-made case study: 'How German law firms use ElevenLabs to never miss a client call again.'", bold_prefix="Case study material:")

    # ══════════════════════════════════════════════════════════
    # SECTION 9 — Proposed Ramp Structure
    # ══════════════════════════════════════════════════════════
    doc.add_page_break()
    add_heading(doc, "9. Proposed Ramp Structure", level=1)

    add_para(doc,
        "We propose a tiered commitment that aligns our spend with customer acquisition milestones:")

    add_styled_table(doc,
        ["Phase", "Period", "Customers", "Est. EL spend/mo", "Commitment"],
        [
            ["Seed", "Month 1–3", "2–7", "$240–$1,400", "Base platform subscription"],
            ["Growth", "Month 4–6", "9–15", "$1,800–$3,400", "Volume discount tier activated"],
            ["Scale", "Month 7–9", "18–23", "$4,080–$5,440", "$5k/month milestone — full enterprise tier"],
            ["Expand", "Month 10–12", "26–32", "$6,280–$8,200", "Full enterprise pricing, expansion verticals begin"],
        ],
        col_widths=[2, 2.5, 2.5, 3.5, 5]
    )

    add_callout_box(doc,
        "We're not asking for free credits — we're asking for a pricing structure that "
        "makes it rational for us to go all-in on ElevenLabs from day one, "
        "rather than hedging with alternatives. Invest in us now, and we bring you "
        "the entire DACH professional services vertical.")

    # ══════════════════════════════════════════════════════════
    # SECTION 10 — Key Milestones & Checkpoints
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "10. Key Milestones & Review Checkpoints", level=1)

    add_styled_table(doc,
        ["Milestone", "Target date", "What it proves"],
        [
            ["First 3 paying customers", "May 2026", "Product-market fit validated, unit economics confirmed"],
            ["10 paying customers", "Jul 2026", "Repeatable sales motion, templates working across practice areas"],
            ["$3,000/mo EL spend", "Sep 2026", "Volume ramp on track, retention confirmed"],
            ["$5,000/mo EL spend", "Dec 2026", "Full enterprise commitment, expansion planning begins"],
            ["Tax advisor vertical pilot", "Q1 2027", "Multi-vertical expansion validated, TAM 10x"],
        ],
        col_widths=[4.5, 3, 8.5]
    )

    add_para(doc,
        "We're happy to provide monthly usage reports and schedule quarterly reviews "
        "to track progress against these milestones.",
        size=10)

    # ══════════════════════════════════════════════════════════
    # CONTACT / FOOTER
    # ══════════════════════════════════════════════════════════
    add_accent_divider(doc)

    add_heading(doc, "Contact", level=2)

    add_para(doc, "Remington Ramsay", bold=True, size=11)
    add_para(doc, "CEO, sevenlayers", size=10, color=TEXT_SECONDARY, space_after=Pt(2))
    add_para(doc, "remington@sevenlayers.com", size=10, color=ACCENT, space_after=Pt(2))
    add_para(doc, "sevenlayers.com", size=10, color=ACCENT, space_after=Pt(12))

    add_accent_divider(doc)

    add_para(doc,
        "Confidential. Prepared for ElevenLabs Enterprise Sales. March 2026.",
        size=8, color=TEXT_SECONDARY, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    # ── Save ──────────────────────────────────────────────────
    doc.save(OUTPUT_PATH)
    print(f"✓ Generated: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_document()
