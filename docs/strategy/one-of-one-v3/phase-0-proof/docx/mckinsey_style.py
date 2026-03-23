"""
Reusable McKinsey-style DOCX builder module.
"""

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
from docx.shared import Cm

# McKinsey color palette
NAVY = RGBColor(0x00, 0x33, 0x6B)
LIGHT_BLUE = RGBColor(0x00, 0x5B, 0x96)
PALE_BLUE = RGBColor(0xD5, 0xE8, 0xF0)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BLACK = RGBColor(0x00, 0x00, 0x00)
DARK_GRAY = RGBColor(0x33, 0x33, 0x33)
MEDIUM_GRAY = RGBColor(0x66, 0x66, 0x66)
LIGHT_GRAY_RGB = RGBColor(0xF2, 0xF2, 0xF2)
ACCENT_GOLD = RGBColor(0xC4, 0x9A, 0x2A)


def create_doc():
    """Create a new Document with McKinsey styling."""
    doc = Document()
    for section in doc.sections:
        section.page_width = Inches(8.5)
        section.page_height = Inches(11)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(1.2)
        section.right_margin = Inches(1.2)

    style = doc.styles['Normal']
    style.font.name = 'Arial'
    style.font.size = Pt(10.5)
    style.font.color.rgb = DARK_GRAY
    pf = style.paragraph_format
    pf.space_before = Pt(2)
    pf.space_after = Pt(6)
    pf.line_spacing = 1.25

    for level, (size, color, bold) in {
        1: (22, NAVY, True),
        2: (14, NAVY, True),
        3: (12, LIGHT_BLUE, True),
    }.items():
        hs = doc.styles[f'Heading {level}']
        hs.font.name = 'Arial'
        hs.font.size = Pt(size)
        hs.font.color.rgb = color
        hs.font.bold = bold
        hs.paragraph_format.space_before = Pt(18 if level == 1 else 14)
        hs.paragraph_format.space_after = Pt(8 if level == 1 else 6)
        hs.paragraph_format.keep_with_next = True

    return doc


def add_line(doc, color='005B96', width=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'<w:bottom w:val="single" w:sz="{width}" w:space="1" w:color="{color}"/>'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)
    return p


def navy_line(doc, width=12):
    return add_line(doc, '00336B', width)


def thin_line(doc, width=4):
    return add_line(doc, 'CCCCCC', width)


def set_cell_shading(cell, color):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color}" w:val="clear"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}></w:tcBorders>')
    for edge, val in kwargs.items():
        element = parse_xml(
            f'<w:{edge} {nsdecls("w")} w:val="{val.get("val", "single")}" '
            f'w:sz="{val.get("sz", "4")}" w:space="0" '
            f'w:color="{val.get("color", "CCCCCC")}"/>'
        )
        tcBorders.append(element)
    tcPr.append(tcBorders)


def make_table(doc, headers, rows, col_widths=None):
    """McKinsey-style table: navy header, alternating rows, no vertical lines."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    hdr = table.rows[0]
    for i, text in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, '00336B')
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(text)
        run.bold = True
        run.font.color.rgb = WHITE
        run.font.size = Pt(10)
        run.font.name = 'Arial'
        if col_widths:
            cell.width = Inches(col_widths[i])

    for r_idx, row_data in enumerate(rows):
        row = table.rows[r_idx + 1]
        bg = 'F2F2F2' if r_idx % 2 == 0 else 'FFFFFF'
        for c_idx, text in enumerate(row_data):
            cell = row.cells[c_idx]
            set_cell_shading(cell, bg)
            p = cell.paragraphs[0]
            run = p.add_run(str(text))
            run.font.size = Pt(10)
            run.font.name = 'Arial'
            run.font.color.rgb = DARK_GRAY
            if col_widths:
                cell.width = Inches(col_widths[c_idx])

    for row in table.rows:
        for cell in row.cells:
            set_cell_border(cell,
                top={"sz": "4", "color": "CCCCCC"},
                bottom={"sz": "4", "color": "CCCCCC"},
                left={"sz": "0", "val": "none", "color": "FFFFFF"},
                right={"sz": "0", "val": "none", "color": "FFFFFF"},
            )

    tblPr = table._tbl.tblPr if table._tbl.tblPr is not None else parse_xml(f'<w:tblPr {nsdecls("w")}/>')
    cellMargin = parse_xml(
        f'<w:tblCellMar {nsdecls("w")}>'
        f'<w:top w:w="60" w:type="dxa"/>'
        f'<w:left w:w="100" w:type="dxa"/>'
        f'<w:bottom w:w="60" w:type="dxa"/>'
        f'<w:right w:w="100" w:type="dxa"/>'
        f'</w:tblCellMar>'
    )
    tblPr.append(cellMargin)
    return table


def body(doc, text, bold=False, italic=False, size=10.5, color=None, alignment=None, space_after=None):
    p = doc.add_paragraph()
    if alignment:
        p.alignment = alignment
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(size)
    run.font.color.rgb = color or DARK_GRAY
    run.bold = bold
    run.italic = italic
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    return p


def bullet(doc, text, bold_prefix=None, level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.left_indent = Inches(0.3 + level * 0.25)
    p.paragraph_format.space_after = Pt(3)
    if bold_prefix:
        run = p.add_run(bold_prefix)
        run.bold = True
        run.font.name = 'Arial'
        run.font.size = Pt(10.5)
        run.font.color.rgb = DARK_GRAY
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(10.5)
    run.font.color.rgb = DARK_GRAY
    return p


def callout(doc, title, text):
    """Blue left-border callout box."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.left_indent = Inches(0.2)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="18" w:space="8" w:color="005B96"/>'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)
    run = p.add_run(title + ' ')
    run.bold = True
    run.font.name = 'Arial'
    run.font.size = Pt(10.5)
    run.font.color.rgb = NAVY
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(10.5)
    run.font.color.rgb = DARK_GRAY
    return p


def blockquote(doc, text):
    """Styled quote block with left border and italic."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.left_indent = Inches(0.3)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="12" w:space="8" w:color="CCCCCC"/>'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.size = Pt(10.5)
    run.font.color.rgb = MEDIUM_GRAY
    run.italic = True
    return p


def cover_page(doc, title, subtitle, meta_fields, doc_number=""):
    """Generate a McKinsey-style cover page."""
    for _ in range(5):
        doc.add_paragraph()

    navy_line(doc, 18)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(24)
    p.paragraph_format.space_after = Pt(4)
    if doc_number:
        run = p.add_run(doc_number + '\n')
        run.font.name = 'Arial'
        run.font.size = Pt(12)
        run.font.color.rgb = LIGHT_BLUE
    run = p.add_run(title)
    run.font.name = 'Arial'
    run.font.size = Pt(32)
    run.font.color.rgb = NAVY
    run.bold = True

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(16)
    run = p.add_run(subtitle)
    run.font.name = 'Arial'
    run.font.size = Pt(14)
    run.font.color.rgb = LIGHT_BLUE
    run.italic = True

    add_line(doc, '005B96', 6)

    for label, value in meta_fields:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(f'{label}:  ')
        run.bold = True
        run.font.name = 'Arial'
        run.font.size = Pt(10)
        run.font.color.rgb = NAVY
        run = p.add_run(value)
        run.font.name = 'Arial'
        run.font.size = Pt(10)
        run.font.color.rgb = DARK_GRAY

    doc.add_page_break()


def add_footer(doc, footer_text):
    """Add page-numbered footer."""
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False
        p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pPr = p._p.get_or_add_pPr()
        pBdr = parse_xml(
            f'<w:pBdr {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="4" w:color="CCCCCC"/>'
            f'</w:pBdr>'
        )
        pPr.append(pBdr)
        run = p.add_run(f'{footer_text}  |  ')
        run.font.name = 'Arial'
        run.font.size = Pt(8)
        run.font.color.rgb = MEDIUM_GRAY

        fldChar1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
        run1 = p.add_run()
        run1._r.append(fldChar1)
        instrText = parse_xml(f'<w:instrText {nsdecls("w")} xml:space="preserve"> PAGE </w:instrText>')
        run2 = p.add_run()
        run2._r.append(instrText)
        fldChar2 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
        run3 = p.add_run()
        run3._r.append(fldChar2)


def save(doc, path):
    doc.save(path)
    print(f'  Saved: {path}')
