#!/usr/bin/env python3
"""
Generate a professional PDF of the Vermittlungsvereinbarung.
Clean white pages, professional typography, proper legal contract formatting.
Uses Arial TTF for full Unicode support (German characters, em-dashes, bullets).
"""

import re
import os
import sys

sys.path.insert(0, "/Users/foundbrand_001/Library/Python/3.9/lib/python/site-packages")

from fpdf import FPDF

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# macOS system font paths
ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
ARIAL_ITALIC = "/System/Library/Fonts/Supplemental/Arial Italic.ttf"
ARIAL_BOLD_ITALIC = "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf"
FONT_FAMILY = "ArialUni"


class ContractPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)
        # Register Unicode TTF fonts
        self.add_font(FONT_FAMILY, "", ARIAL)
        self.add_font(FONT_FAMILY, "B", ARIAL_BOLD)
        self.add_font(FONT_FAMILY, "I", ARIAL_ITALIC)
        self.add_font(FONT_FAMILY, "BI", ARIAL_BOLD_ITALIC)

    def header(self):
        if self.page_no() > 1:
            self.set_font(FONT_FAMILY, "I", 8)
            self.set_text_color(150, 150, 150)
            self.cell(
                0,
                8,
                "Vermittlungsvereinbarung \u2014 Vound Brand UG (haftungsbeschr\u00e4nkt)",
                align="L",
            )
            self.ln(4)
            self.set_draw_color(200, 200, 200)
            self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
            self.ln(6)

    def footer(self):
        self.set_y(-20)
        self.set_font(FONT_FAMILY, "I", 8)
        self.set_text_color(150, 150, 150)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)
        self.cell(0, 8, f"Seite {self.page_no()}", align="C")


def clean_md(text):
    """Remove markdown artifacts."""
    text = text.replace("\\_", "_")
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text


def strip_bold(text):
    """Remove bold markers, return plain text."""
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text)


def parse_table(lines):
    """Parse markdown table into header + data."""
    rows = [l for l in lines if not re.match(r"^\|[\s\-:|]+\|$", l)]
    if not rows:
        return None, None

    def split(line):
        return [clean_md(c.strip()) for c in line.strip().strip("|").split("|")]

    return split(rows[0]), [split(r) for r in rows[1:]]


def add_table(pdf, header, data):
    """Render a table with dark header and alternating rows."""
    cols = len(header)
    pw = pdf.w - pdf.l_margin - pdf.r_margin
    line_h = 6

    # Proportional column widths — ensure minimum 15mm per column
    all_rows = [header] + data
    widths = []
    for c in range(cols):
        mx = max((len(strip_bold(r[c])) if c < len(r) else 1) for r in all_rows)
        widths.append(max(mx, 8))
    s = sum(widths)
    widths = [max(w / s * pw, 15) for w in widths]
    # Re-normalize to fit page
    s2 = sum(widths)
    if s2 > pw:
        widths = [w / s2 * pw for w in widths]

    # Header
    pdf.set_font(FONT_FAMILY, "B", 8.5)
    pdf.set_fill_color(45, 45, 68)
    pdf.set_text_color(255, 255, 255)
    x0 = pdf.get_x()
    y0 = pdf.get_y()

    # Compute header row height
    hdr_heights = []
    for c, txt in enumerate(header):
        w = widths[c]
        n_lines = max(1, len(pdf.multi_cell(w, line_h, strip_bold(txt), dry_run=True, output="LINES")))
        hdr_heights.append(n_lines * line_h)
    hdr_h = max(hdr_heights)

    for c, txt in enumerate(header):
        w = widths[c]
        pdf.set_xy(x0 + sum(widths[:c]), y0)
        pdf.multi_cell(w, hdr_h / max(1, len(pdf.multi_cell(w, line_h, strip_bold(txt), dry_run=True, output="LINES"))),
                       strip_bold(txt), border=1, fill=True, new_x="RIGHT", new_y="TOP")
    pdf.set_y(y0 + hdr_h)

    # Data rows
    for r_idx, row in enumerate(data):
        pdf.set_font(FONT_FAMILY, "", 8.5)
        pdf.set_text_color(51, 51, 51)
        if r_idx % 2 == 1:
            pdf.set_fill_color(245, 245, 248)
        else:
            pdf.set_fill_color(255, 255, 255)

        x0 = pdf.get_x()
        y0 = pdf.get_y()

        # Compute row height
        row_heights = []
        for c in range(cols):
            txt = strip_bold(row[c]) if c < len(row) else ""
            w = widths[c]
            n_lines = max(1, len(pdf.multi_cell(w, line_h, txt, dry_run=True, output="LINES")))
            row_heights.append(n_lines * line_h)
        row_h = max(row_heights)

        if y0 + row_h > pdf.h - 30:
            pdf.add_page()
            y0 = pdf.get_y()
            x0 = pdf.get_x()

        for c in range(cols):
            txt = strip_bold(row[c]) if c < len(row) else ""
            w = widths[c]
            pdf.set_xy(x0 + sum(widths[:c]), y0)
            cell_lines = max(1, len(pdf.multi_cell(w, line_h, txt, dry_run=True, output="LINES")))
            cell_h = row_h / cell_lines
            pdf.multi_cell(w, cell_h, txt, border=1, fill=True, new_x="RIGHT", new_y="TOP")

        pdf.set_xy(pdf.l_margin, y0 + row_h)

    pdf.set_x(pdf.l_margin)
    pdf.ln(4)


def convert_md_to_pdf(md_path, pdf_path):
    """Convert the Vermittlungsvereinbarung markdown to a professional PDF."""
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    pdf = ContractPDF()
    pdf.set_margins(25, 25, 25)
    pdf.add_page()

    lines = content.split("\n")
    i = 0
    in_code = False
    code_buf = []

    while i < len(lines):
        line = lines[i]

        # --- Code blocks ---
        if line.strip().startswith("```"):
            if in_code:
                pdf.set_font(FONT_FAMILY, "", 8.5)
                pdf.set_text_color(51, 51, 51)
                pdf.set_fill_color(240, 240, 244)
                pdf.multi_cell(0, 5, clean_md("\n".join(code_buf)), fill=True)
                pdf.ln(3)
                in_code = False
                code_buf = []
            else:
                in_code = True
                code_buf = []
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # --- Table ---
        if line.strip().startswith("|") and i + 1 < len(lines):
            tbl = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i])
                i += 1
            h, d = parse_table(tbl)
            if h and d is not None:
                add_table(pdf, h, d)
            continue

        # --- H1 ---
        if line.startswith("# "):
            pdf.set_x(pdf.l_margin)
            pdf.ln(4)
            pdf.set_font(FONT_FAMILY, "B", 20)
            pdf.set_text_color(26, 26, 46)
            pdf.multi_cell(0, 9, clean_md(line[2:].strip()))
            pdf.ln(3)
            i += 1
            continue

        # --- H2 ---
        if line.startswith("## "):
            pdf.set_x(pdf.l_margin)
            pdf.ln(6)
            pdf.set_font(FONT_FAMILY, "B", 14)
            pdf.set_text_color(45, 45, 68)
            pdf.multi_cell(0, 7, clean_md(line[3:].strip()))
            pdf.ln(2)
            i += 1
            continue

        # --- H3 ---
        if line.startswith("### "):
            pdf.set_x(pdf.l_margin)
            pdf.ln(4)
            pdf.set_font(FONT_FAMILY, "B", 11.5)
            pdf.set_text_color(61, 61, 92)
            pdf.multi_cell(0, 6, clean_md(line[4:].strip()))
            pdf.ln(2)
            i += 1
            continue

        # --- HR ---
        if line.strip() == "---":
            pdf.set_x(pdf.l_margin)
            pdf.ln(3)
            pdf.set_draw_color(200, 200, 200)
            y = pdf.get_y()
            pdf.line(pdf.l_margin + 20, y, pdf.w - pdf.r_margin - 20, y)
            pdf.ln(5)
            i += 1
            continue

        # --- VEREINBARUNG markers ---
        if "VEREINBARUNG BEGINN" in line or "VEREINBARUNG ENDE" in line:
            pdf.set_x(pdf.l_margin)
            pdf.ln(2)
            pdf.set_draw_color(45, 45, 68)
            y = pdf.get_y()
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.ln(3)
            pdf.set_font(FONT_FAMILY, "B", 9)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, line.strip().strip("-").strip(), align="C")
            pdf.ln(3)
            y = pdf.get_y()
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.ln(6)
            i += 1
            continue

        # --- Blockquote ---
        if line.strip().startswith(">"):
            pdf.set_x(pdf.l_margin)
            qlines = []
            while i < len(lines):
                t = lines[i].strip()
                if t.startswith("> "):
                    qlines.append(t[2:])
                elif t == ">":
                    qlines.append("")
                elif t == "" and qlines:
                    if i + 1 < len(lines) and lines[i + 1].strip().startswith(">"):
                        qlines.append("")
                    else:
                        break
                else:
                    break
                i += 1

            pdf.ln(2)
            y_start = pdf.get_y()
            pdf.set_x(pdf.l_margin + 8)
            pdf.set_font(FONT_FAMILY, "I", 9.5)
            pdf.set_text_color(80, 80, 80)
            qtxt = strip_bold(clean_md("\n".join(qlines)))
            pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 10, 5, qtxt)
            y_end = pdf.get_y()
            pdf.set_draw_color(45, 45, 68)
            pdf.set_line_width(0.5)
            pdf.line(pdf.l_margin + 3, y_start, pdf.l_margin + 3, y_end)
            pdf.set_line_width(0.2)
            pdf.ln(3)
            continue

        # --- Bullet ---
        if line.strip().startswith("- "):
            txt = strip_bold(clean_md(line.strip()[2:]))
            pdf.set_font(FONT_FAMILY, "", 10)
            pdf.set_text_color(51, 51, 51)
            x0 = pdf.l_margin
            pdf.set_x(x0 + 4)
            pdf.cell(5, 5, "\u2022")
            pdf.multi_cell(pdf.w - x0 - pdf.r_margin - 11, 5, txt)
            pdf.set_x(pdf.l_margin)
            i += 1
            continue

        # --- Numbered list ---
        m = re.match(r"^(\d+)\.\s+(.+)$", line.strip())
        if m:
            num, txt = m.group(1), strip_bold(clean_md(m.group(2)))
            pdf.set_font(FONT_FAMILY, "", 10)
            pdf.set_text_color(51, 51, 51)
            pdf.set_x(pdf.l_margin + 2)
            pdf.cell(8, 5, f"{num}.")
            pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 12, 5, txt)
            pdf.set_x(pdf.l_margin)
            i += 1
            continue

        # --- Italic footer ---
        s = line.strip()
        if s.startswith("*") and s.endswith("*") and not s.startswith("**"):
            pdf.set_x(pdf.l_margin)
            pdf.set_font(FONT_FAMILY, "I", 8.5)
            pdf.set_text_color(130, 130, 130)
            pdf.multi_cell(0, 4.5, clean_md(s.strip("*")))
            i += 1
            continue

        # --- &nbsp; ---
        if line.strip() == "&nbsp;":
            pdf.ln(6)
            i += 1
            continue

        # --- Signature lines ---
        if "___" in line:
            txt = clean_md(line.strip())
            pdf.set_x(pdf.l_margin)
            pdf.set_font(FONT_FAMILY, "", 10)
            pdf.set_text_color(51, 51, 51)
            pdf.ln(2)
            pdf.cell(0, 6, txt)
            pdf.ln(4)
            i += 1
            continue

        # --- Regular paragraph ---
        txt = clean_md(line.strip())
        if txt:
            pdf.set_x(pdf.l_margin)
            pdf.set_font(FONT_FAMILY, "", 10)
            pdf.set_text_color(51, 51, 51)
            pdf.multi_cell(0, 5.5, strip_bold(txt))
            pdf.ln(1)

        i += 1

    pdf.output(pdf_path)
    print(f"  \u2713 {os.path.basename(pdf_path)}")


def main():
    md = os.path.join(SCRIPT_DIR, "08_VERTRIEBSPARTNER_VEREINBARUNG.md")
    out_dir = os.path.join(SCRIPT_DIR, "docx")
    pdf = os.path.join(out_dir, "08_Vermittlungsvereinbarung.pdf")

    if not os.path.exists(md):
        print(f"  \u2717 Source not found: {md}")
        return

    os.makedirs(out_dir, exist_ok=True)
    print("Generating professional PDF...\n")
    convert_md_to_pdf(md, pdf)
    print(f"\nDone! PDF at {pdf}")


if __name__ == "__main__":
    main()
