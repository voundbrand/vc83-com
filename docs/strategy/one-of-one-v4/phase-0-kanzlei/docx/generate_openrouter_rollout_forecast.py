#!/usr/bin/env python3
"""
Generate OpenRouter Enterprise Rollout Forecast (DOCX).
Brand: sevenlayers — accent #E8520A, dark palette.
Purpose: Resource for OpenRouter enterprise sales (Emma) to advocate for
         a lower initial tier with EU routing and documented ramp toward $5k/month.
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

# ── Brand tokens ──────────────────────────────────────────────
ACCENT       = RGBColor(0xE8, 0x52, 0x0A)
ACCENT_DARK  = RGBColor(0xCC, 0x47, 0x09)
TEXT_PRIMARY  = RGBColor(0x1A, 0x1A, 0x1A)
TEXT_SECONDARY = RGBColor(0x55, 0x55, 0x55)
TEXT_WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
TABLE_HEADER_BG = "E8520A"
TABLE_ALT_BG = "FDF2EC"
TABLE_BORDER = "DDDDDD"
HIGHLIGHT_BG = "E8F5E9"

FONT_PRIMARY = "Calibri"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
LOGO_PATH = os.path.join(PROJECT_ROOT, "public", "sevenlayers-logo.png")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "08_OpenRouter_Rollout_Forecast.docx")


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
    run = p.add_run("OpenRouter Enterprise\nRollout Forecast")
    run.font.size = Pt(28)
    run.font.color.rgb = ACCENT
    run.font.name = FONT_PRIMARY
    run.bold = True
    p.paragraph_format.space_after = Pt(12)

    add_accent_divider(doc)

    p = doc.add_paragraph()
    run = p.add_run("sevenlayers — AI Platform for German Professional Services")
    run.font.size = Pt(14)
    run.font.color.rgb = TEXT_SECONDARY
    run.font.name = FONT_PRIMARY
    p.paragraph_format.space_after = Pt(24)

    add_para(doc,
        "This document provides a 12-month rollout forecast for our OpenRouter inference "
        "usage, supporting our request for an initial enterprise tier with EU regional "
        "routing and a documented ramp plan toward $5,000+/month in platform spend.",
        size=10, color=TEXT_SECONDARY)

    add_para(doc, "Confidential  |  March 2026  |  Prepared for OpenRouter Enterprise Sales",
             size=9, color=TEXT_SECONDARY, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=Pt(4))

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 1 — Executive Summary
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "1. Executive Summary", level=1)

    add_para(doc,
        "sevenlayers is building an AI-powered platform for German professional services, "
        "starting with law firms (Kanzleien). Our platform combines a voice AI receptionist "
        "with backend AI agents that handle client intake, document structuring, appointment "
        "booking, and case preparation — all requiring LLM inference.")

    add_para(doc,
        "We are at a specific inflection point: our Germany-hosted pilot deployment is live "
        "on Hetzner (Nuremberg), configured to use eu.openrouter.ai/api/v1 as its inference "
        "endpoint. But our external launch to law firm customers is blocked pending an "
        "OpenRouter Enterprise DPA (Auftragsverarbeitungsvereinbarung / Data Processing "
        "Agreement) that confirms EU data residency.")

    add_callout_box(doc,
        "The blocker is compliance, not technology. Our staging environment is running. "
        "Our first customers are waiting. EU routing + a signed DPA is what unlocks "
        "production launch — and the volume that follows.")

    add_para(doc, "What we're asking for:", bold=True)
    add_bullet(doc, " A lower initial enterprise tier with EU regional routing enabled, "
               "tied to a documented ramp plan. Our committed spend is below $5k/month today "
               "because we're pre-launch — but the enterprise DPA is literally the gate "
               "that unlocks production volume.", bold_prefix="Ramp-up pricing:")
    add_bullet(doc, " We project crossing $5,000/month in OpenRouter inference spend "
               "by Month 8–10 of our rollout.", bold_prefix="$5k/month target:")
    add_bullet(doc, " EU regional routing via eu.openrouter.ai is a hard legal "
               "requirement for German law firms under GDPR Art. 28, BRAO §43a, "
               "and StGB §203 (professional secrecy).", bold_prefix="EU routing:")

    # ══════════════════════════════════════════════════════════
    # SECTION 2 — Why EU Routing Is Non-Negotiable
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "2. Why EU Routing Is Non-Negotiable", level=1)

    add_para(doc,
        "German law firms operate under some of the strictest data protection requirements "
        "in Europe. Three overlapping legal frameworks make EU data residency mandatory "
        "for any AI inference processing client data:")

    add_styled_table(doc,
        ["Legal framework", "Requirement", "Consequence of non-compliance"],
        [
            ["GDPR Art. 28",
             "Data processing agreements required with all processors. "
             "Transfers outside EEA require additional safeguards (SCCs, TIA).",
             "Administrative fines up to €20M or 4% of annual turnover"],
            ["BRAO §43a",
             "Attorney obligation to maintain professional secrecy. "
             "Extends to all technical service providers.",
             "Disciplinary proceedings, loss of license to practice"],
            ["StGB §203",
             "Criminal liability for disclosure of professional secrets. "
             "Covers attorneys, tax advisors, auditors.",
             "Criminal prosecution — up to 1 year imprisonment"],
        ],
        col_widths=[3.5, 6.5, 6]
    )

    add_para(doc, "")
    add_callout_box(doc,
        "For our law firm customers, using an AI service without confirmed EU data residency "
        "is not a business risk — it is a potential criminal liability. This is why we cannot "
        "launch without EU routing, regardless of how ready our technology is.")

    add_heading(doc, "Our Compliance Evidence Framework", level=2)
    add_para(doc,
        "We maintain a 12-point legal evidence matrix for every external processor. "
        "For OpenRouter, the following items are pending:")

    add_styled_table(doc,
        ["Evidence ID", "Requirement", "Status"],
        [
            ["E-LGL-001", "Signed DPA/AVV with OpenRouter", "Pending — requires enterprise tier"],
            ["E-LGL-002", "Subprocessor list and notification rights", "Pending"],
            ["E-LGL-004", "Data transfer map confirming EU residency", "Pending — requires EU routing confirmation"],
            ["E-LGL-005", "SCC/TIA for any non-adequate country transfers", "Pending — depends on routing"],
        ],
        col_widths=[2.5, 8.5, 5]
    )

    add_para(doc,
        "Our release gate policy is fail-closed: external launch remains NO_GO until all "
        "mandatory legal artifacts are complete. The OpenRouter DPA is on the critical path.",
        italic=True, size=9.5, color=TEXT_SECONDARY)

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 3 — Product & Architecture
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "3. Product & Architecture", level=1)

    add_heading(doc, "What We Build", level=2)
    add_para(doc,
        "Our platform serves as the complete AI-powered front office for law firms. "
        "It has two inference surfaces, both routed through OpenRouter:")

    add_styled_table(doc,
        ["Surface", "What it does", "Inference pattern", "Models used"],
        [
            ["Voice agent backend",
             "Powers \"Clara\" — a 24/7 AI receptionist that answers calls, "
             "qualifies practice area, assesses urgency, and books appointments",
             "Real-time conversational turns, tool calling, structured output",
             "Claude Sonnet 4, GPT-4o"],
            ["Backend AI agents",
             "Client intake structuring, case preparation, document drafting, "
             "CRM enrichment, compliance logging",
             "Multi-step agent chains, tool orchestration, RAG",
             "Claude Sonnet 4, Llama 3.3 70B"],
            ["AI chat assistant",
             "Attorney-facing chat for case research, document Q&A, "
             "and workflow automation",
             "Conversational with context windows, vision support",
             "Claude Sonnet 4, GPT-4o, Gemini 2.5"],
        ],
        col_widths=[3, 5, 4, 4]
    )

    add_heading(doc, "Deployment Architecture", level=2)

    add_styled_table(doc,
        ["Component", "Where it runs", "Data residency"],
        [
            ["Voice AI (Clara)", "ElevenLabs (EU mode)", "EU"],
            ["Telephony", "Twilio (German local numbers)", "EU"],
            ["LLM inference", "OpenRouter (eu.openrouter.ai)", "EU — hard requirement"],
            ["Application backend", "Convex (real-time database + functions)", "US (no client PII stored)"],
            ["Germany pilot (NemoClaw)", "Hetzner Nuremberg, Germany", "Germany only"],
            ["CRM / Booking", "Platform backend", "Per deployment"],
        ],
        col_widths=[4, 5.5, 5.5]
    )

    add_heading(doc, "OpenRouter Integration Details", level=2)
    add_bullet(doc, " eu.openrouter.ai/api/v1 (EU regional endpoint)", bold_prefix="Endpoint:")
    add_bullet(doc, " OpenAI-compatible completions API", bold_prefix="API format:")
    add_bullet(doc, " Multi-provider model routing with failover policy", bold_prefix="Routing:")
    add_bullet(doc, " Fallbacks disabled (allow_fallbacks: false) — EU-approved providers only", bold_prefix="Compliance controls:")
    add_bullet(doc, " data_collection: deny, zero data retention (ZDR) enabled", bold_prefix="Data policy:")
    add_bullet(doc, " Claude Sonnet 4 (primary), GPT-4o, Llama 3.3 70B (fallback)", bold_prefix="Models:")

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 4 — Target Market & GTM
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "4. Target Market & Go-to-Market", level=1)

    add_heading(doc, "Phase 0–1: German Law Firms", level=2)

    add_styled_table(doc,
        ["Attribute", "Detail"],
        [
            ["Firm size", "5–20 lawyers"],
            ["Revenue", "€1M–€5M"],
            ["Geography", "Germany (NRW, Bavaria, Berlin, Hamburg)"],
            ["Pain point", "59% of callers hang up on voicemail. Each missed call = lost revenue."],
            ["Decision maker", "Managing partner (4–6 week sales cycle)"],
            ["Compliance bar", "GDPR Art. 28, BRAO §43a, StGB §203 — all AI processors must be EU-resident"],
        ],
        col_widths=[4, 12]
    )

    add_heading(doc, "Sales Motion", level=2)
    add_bullet(doc, " Prospect calls a live demo number, hears Clara in action", bold_prefix="1. Demo call —")
    add_bullet(doc, " 2-week free overflow capture to prove ROI with data", bold_prefix="2. Call audit (€0) —")
    add_bullet(doc, " Full AI booking enabled, prove appointment conversion", bold_prefix="3. Pilot (€299/mo) —")
    add_bullet(doc, " Full platform with dashboard, templates, compliance docs", bold_prefix="4. Paid (€499–1,999/mo) —")

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
            ["Veterinary practices", "10,000+ practices", "Month 12–18"],
            ["Staffing agencies", "46,000 firms", "Year 2"],
        ],
        col_widths=[5, 4.5, 4.5]
    )

    add_callout_box(doc,
        "Every one of these verticals in Germany requires EU data residency for AI inference. "
        "Solving this once with OpenRouter Enterprise unlocks the entire DACH professional "
        "services market for us — and for OpenRouter.")

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 5 — Inference Usage Per Customer
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "5. Inference Usage Per Customer", level=1)

    add_para(doc,
        "Each law firm customer generates LLM inference across three surfaces. "
        "Below are our per-customer usage estimates based on call patterns and "
        "agent workflow complexity:")

    add_heading(doc, "Voice Agent Backend (per inbound call)", level=2)

    add_styled_table(doc,
        ["Step", "Avg tokens", "Model", "Est. cost/call"],
        [
            ["Practice area classification", "~800", "Claude Sonnet 4", "$0.005"],
            ["Urgency assessment", "~600", "Claude Sonnet 4", "$0.004"],
            ["Structured intake extraction", "~1,500", "Claude Sonnet 4", "$0.010"],
            ["Booking slot resolution", "~400", "Claude Sonnet 4", "$0.003"],
            ["Post-call summary generation", "~1,200", "Claude Sonnet 4", "$0.008"],
            ["Total per call", "~4,500", "", "$0.03"],
        ],
        col_widths=[5.5, 2.5, 3.5, 3]
    )

    add_heading(doc, "Backend AI Agents (per customer/month)", level=2)

    add_styled_table(doc,
        ["Workflow", "Frequency", "Avg tokens/run", "Monthly cost"],
        [
            ["Case intake structuring", "~400 runs", "~2,000", "$5.30"],
            ["Attorney brief generation", "~200 runs", "~3,000", "$4.00"],
            ["CRM enrichment & tagging", "~400 runs", "~800", "$2.10"],
            ["Compliance audit logging", "~600 runs", "~500", "$2.00"],
            ["Total backend agents", "", "", "~$13.40"],
        ],
        col_widths=[5, 2.5, 3, 3.5]
    )

    add_heading(doc, "AI Chat Assistant (per customer/month)", level=2)

    add_styled_table(doc,
        ["Usage", "Sessions/mo", "Avg tokens/session", "Monthly cost"],
        [
            ["Attorney chat sessions", "~80", "~6,000", "$3.20"],
            ["Document Q&A", "~40", "~8,000", "$2.10"],
            ["Total chat", "", "", "~$5.30"],
        ],
        col_widths=[5, 2.5, 3.5, 3]
    )

    add_accent_divider(doc)

    add_heading(doc, "Total Inference Cost Per Customer Per Month", level=2)

    add_styled_table(doc,
        ["Tier", "Calls/mo", "Voice inference", "Backend agents", "Chat", "Total OR spend"],
        [
            ["Basis (2–5 lawyers)", "~500", "$15", "$13", "$5", "~$33"],
            ["Professional (5–15 lawyers)", "~1,150", "$35", "$25", "$12", "~$72"],
            ["Premium (15+ lawyers)", "~2,000", "$60", "$45", "$22", "~$127"],
        ],
        col_widths=[4, 2, 2.5, 2.5, 1.5, 3]
    )

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 6 — 12-Month Rollout Forecast (THE KEY TABLE)
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "6. 12-Month Rollout Forecast", level=1)

    add_para(doc,
        "The table below shows our month-by-month customer acquisition plan and the "
        "resulting OpenRouter inference spend. The $5,000/month milestone is highlighted.")

    add_styled_table(doc,
        ["Month", "Date", "New", "Total", "Mix (B / P / Pr)", "Total tokens/mo", "OR spend/mo"],
        [
            ["1",  "Apr 2026",  "2",  "2",   "2 / 0 / 0",   "~7M",     "$240"],
            ["2",  "May 2026",  "2",  "4",   "3 / 1 / 0",   "~18M",    "$570"],
            ["3",  "Jun 2026",  "3",  "7",   "4 / 2 / 1",   "~38M",    "$1,150"],
            ["4",  "Jul 2026",  "2",  "9",   "5 / 3 / 1",   "~52M",    "$1,530"],
            ["5",  "Aug 2026",  "3",  "12",  "6 / 4 / 2",   "~76M",    "$2,220"],
            ["6",  "Sep 2026",  "3",  "15",  "7 / 5 / 3",   "~102M",   "$2,990"],
            ["7",  "Oct 2026",  "3",  "18",  "8 / 6 / 4",   "~128M",   "$3,740"],
            ["8",  "Nov 2026",  "3",  "21",  "9 / 7 / 5",   "~158M",   "$4,590"],
            ["9",  "Dec 2026",  "2",  "23",  "9 / 8 / 6",   "~180M",   "$5,220"],
            ["10", "Jan 2027",  "3",  "26",  "10 / 9 / 7",  "~210M",   "$6,080"],
            ["11", "Feb 2027",  "3",  "29",  "10 / 11 / 8", "~244M",   "$7,050"],
            ["12", "Mar 2027",  "3",  "32",  "10 / 12 / 10","~282M",   "$8,100"],
        ],
        col_widths=[1.5, 2.2, 1.2, 1.2, 3.2, 2.8, 3],
        highlight_rows={8}  # Month 9 = $5,220 — first month crossing $5k
    )

    add_para(doc, "", space_after=Pt(4))
    add_callout_box(doc,
        "$5,000/month milestone reached in Month 9 (December 2026). "
        "Year 1 cumulative OpenRouter spend: ~$43,500. "
        "Exiting Year 1 at $8,100/month run rate ($97K annualized).")

    add_heading(doc, "Key Assumptions", level=2)
    add_bullet(doc, " ~$33/mo (Basis), ~$72/mo (Professional), ~$127/mo (Premium)", bold_prefix="Inference per customer:")
    add_bullet(doc, " Claude Sonnet 4 primary (~$6.60/M tokens blended). "
               "Actual cost depends on prompt/completion ratio and model mix.", bold_prefix="Avg cost per token:")
    add_bullet(doc, " Customers upgrade Basis → Professional → Premium as call volume grows", bold_prefix="Tier migration:")
    add_bullet(doc, " <5% monthly (professional services with high switching costs)", bold_prefix="Churn:")
    add_bullet(doc, " Not included in this forecast. Voice minutes billed separately via ElevenLabs.", bold_prefix="Voice synthesis costs:")

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════
    # SECTION 7 — Scenario Analysis
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "7. Scenario Analysis", level=1)

    add_styled_table(doc,
        ["Scenario", "Customers (M12)", "Tokens/mo (M12)", "OR spend/mo (M12)", "OR annual total", "$5k/mo reached"],
        [
            ["Conservative", "20", "~160M", "$4,600", "$26,000", "Month 10–11"],
            ["Target", "32", "~282M", "$8,100", "$43,500", "Month 9"],
            ["Stretch", "45", "~400M", "$11,500", "$64,000", "Month 7"],
        ],
        col_widths=[2.5, 2.8, 2.8, 3, 2.8, 2.8]
    )

    add_para(doc,
        "Even in the conservative scenario, we reach ~$4,600/month by Month 12. "
        "The pipeline from legalXchange Munich alone should push us into the target scenario.",
        size=9.5, color=TEXT_SECONDARY, italic=True)

    add_heading(doc, "Volume Accelerators Not Included Above", level=2)
    add_bullet(doc, " Tax advisor expansion begins Month 6–12. "
               "TAM is 10x larger than law firms (50K+ firms). Even 5 early tax advisor customers "
               "would add ~$360/month in inference.", bold_prefix="Steuerberater vertical:")
    add_bullet(doc, " As we add more practice area templates "
               "(currently 4, targeting 8–12 by Year 1), average inference per customer increases ~30%.",
               bold_prefix="Template expansion:")
    add_bullet(doc, " Attorney-facing chat adoption typically grows "
               "3–4 months after deployment as attorneys build trust with the tool.",
               bold_prefix="Chat adoption curve:")

    # ══════════════════════════════════════════════════════════
    # SECTION 8 — What We Need from OpenRouter
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "8. What We Need from OpenRouter", level=1)

    needs = [
        ("EU regional routing (eu.openrouter.ai) — ",
         "This is the hard compliance gate. Without confirmed EU routing and a signed DPA, "
         "we cannot process any law firm client data through OpenRouter. Our staging environment "
         "is already configured for eu.openrouter.ai/api/v1 — we just need it activated "
         "on an enterprise plan."),
        ("Signed DPA/AVV — ",
         "A Data Processing Agreement compliant with GDPR Art. 28, with explicit clauses "
         "for professional secrecy (§203 StGB). This is a mandatory legal artifact in our "
         "12-point evidence matrix (E-LGL-001). Without it, our release gate stays NO_GO."),
        ("Ramp-up pricing — ",
         "A lower initial commitment (Month 1–6) that scales to full enterprise pricing "
         "as we cross volume milestones. We commit to the documented ramp plan."),
        ("Zero data retention (ZDR) — ",
         "Confirmation that inference data is not retained or used for model training. "
         "We configure data_collection: deny on all requests."),
        ("Subprocessor transparency — ",
         "A current list of subprocessors involved in EU-routed inference, "
         "with notification rights for changes. Required for our evidence artifact E-LGL-002."),
        ("Priority support — ",
         "Faster-than-community response for production issues. Law firms have zero tolerance "
         "for AI downtime during business hours."),
    ]
    for prefix, text in needs:
        add_bullet(doc, text, bold_prefix=prefix)

    # ══════════════════════════════════════════════════════════
    # SECTION 9 — What OpenRouter Gets
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "9. What OpenRouter Gets", level=1)

    add_bullet(doc, " First production deployment of EU-routed inference for "
               "regulated German professional services. A case study that proves OpenRouter "
               "Enterprise works for the most compliance-sensitive use cases in Europe.",
               bold_prefix="EU enterprise validation:")
    add_bullet(doc, " 100K+ mapped businesses across law firms, tax advisors, "
               "vet practices, and staffing agencies — all requiring EU-routed inference.",
               bold_prefix="DACH market access:")
    add_bullet(doc, " Multi-model routing across Claude, GPT-4o, Llama, and Gemini. "
               "Our platform showcases OpenRouter's core value: provider-agnostic model access "
               "with compliance controls.",
               bold_prefix="Multi-model showcase:")
    add_bullet(doc, " Projected $43K–$97K+ annually, growing with each vertical.",
               bold_prefix="Revenue commitment:")
    add_bullet(doc, " Every customer we onboard is locked into OpenRouter as their inference "
               "provider. We don't offer self-hosted alternatives — OpenRouter IS the inference layer.",
               bold_prefix="Platform lock-in:")

    # ══════════════════════════════════════════════════════════
    # SECTION 10 — Proposed Ramp Structure
    # ══════════════════════════════════════════════════════════
    doc.add_page_break()
    add_heading(doc, "10. Proposed Ramp Structure", level=1)

    add_para(doc,
        "We propose a tiered commitment that aligns spend with customer acquisition milestones. "
        "EU routing is required from Day 1 — that is non-negotiable for compliance.")

    add_styled_table(doc,
        ["Phase", "Period", "Customers", "Est. OR spend/mo", "Commitment"],
        [
            ["Pilot", "Month 1–3", "2–7", "$240–$1,150",
             "EU routing enabled, base enterprise subscription"],
            ["Growth", "Month 4–6", "9–15", "$1,530–$2,990",
             "Volume discount tier activated"],
            ["Scale", "Month 7–9", "18–23", "$3,740–$5,220",
             "$5k/month milestone — full enterprise tier"],
            ["Expand", "Month 10–12", "26–32", "$6,080–$8,100",
             "Full enterprise pricing, new verticals begin"],
        ],
        col_widths=[2, 2.5, 2.5, 3.5, 5.5]
    )

    add_callout_box(doc,
        "We're not asking for free inference — we're asking for EU routing access and a pricing "
        "structure that makes it rational for us to build our entire platform on OpenRouter "
        "from day one. Every customer we close is a customer OpenRouter keeps.")

    # ══════════════════════════════════════════════════════════
    # SECTION 11 — Milestones & Checkpoints
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "11. Key Milestones & Review Checkpoints", level=1)

    add_styled_table(doc,
        ["Milestone", "Target date", "What it proves"],
        [
            ["DPA signed, EU routing live", "Apr 2026",
             "Compliance gate cleared, production launch unblocked"],
            ["First 3 paying law firms", "May 2026",
             "Product-market fit, inference usage validated"],
            ["10 paying customers", "Jul 2026",
             "Repeatable sales motion, unit economics confirmed"],
            ["$3,000/mo OR spend", "Sep 2026",
             "Volume ramp on track, retention confirmed"],
            ["$5,000/mo OR spend", "Dec 2026",
             "Full enterprise commitment, expansion planning begins"],
            ["Tax advisor vertical pilot", "Q1 2027",
             "Multi-vertical expansion, TAM 10x validated"],
        ],
        col_widths=[4.5, 3, 8.5]
    )

    add_para(doc,
        "We're happy to provide monthly usage reports and schedule quarterly reviews "
        "to track progress against these milestones.")

    # ══════════════════════════════════════════════════════════
    # SECTION 12 — Current Technical Readiness
    # ══════════════════════════════════════════════════════════
    add_heading(doc, "12. Current Technical Readiness", level=1)

    add_para(doc,
        "Our staging environment is already running on OpenRouter EU infrastructure. "
        "We are not starting from zero — we are waiting for the legal gate to clear.")

    add_styled_table(doc,
        ["Component", "Status"],
        [
            ["Germany pilot server (Hetzner Nuremberg)", "Live — staging mode"],
            ["OpenRouter EU endpoint configured (eu.openrouter.ai/api/v1)", "Configured and tested"],
            ["Multi-model routing + failover", "Production-ready"],
            ["Compliance controls (ZDR, no fallbacks, EU-only providers)", "Configured"],
            ["Voice agent (Clara) integration", "Production-ready"],
            ["Backend agent orchestration", "Production-ready"],
            ["Hetzner DPA/AVV", "Signed and complete"],
            ["OpenRouter DPA/AVV", "Pending — this is the blocker"],
            ["First customer pipeline", "3–5 firms in late-stage sales"],
        ],
        col_widths=[8, 8]
    )

    # ══════════════════════════════════════════════════════════
    # CONTACT / FOOTER
    # ══════════════════════════════════════════════════════════
    add_accent_divider(doc)

    add_heading(doc, "Contact", level=2)

    add_para(doc, "Remington Ramsay", bold=True, size=11)
    add_para(doc, "CEO, sevenlayers", size=10, color=TEXT_SECONDARY, space_after=Pt(2))
    add_para(doc, "Vound Brand UG (haftungsbeschränkt)", size=9, color=TEXT_SECONDARY, space_after=Pt(2))
    add_para(doc, "remington@sevenlayers.com", size=10, color=ACCENT, space_after=Pt(2))
    add_para(doc, "sevenlayers.com", size=10, color=ACCENT, space_after=Pt(12))

    add_accent_divider(doc)

    add_para(doc,
        "Confidential. Prepared for OpenRouter Enterprise Sales. March 2026.",
        size=8, color=TEXT_SECONDARY, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    # ── Save ──────────────────────────────────────────────────
    doc.save(OUTPUT_PATH)
    print(f"✓ Generated: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_document()
