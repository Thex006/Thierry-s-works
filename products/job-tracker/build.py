# Builds Job-Tracker.xlsx: a quote and job tracker for small home-service businesses.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, CellIsRule
from datetime import date

F = "Arial"
NAVY, CREAM, LINE = "1F3A5F", "FFF6D5", "D9DEE5"
fill = lambda c: PatternFill("solid", fgColor=c)
TITLE = Font(name=F, bold=True, size=18, color="FFFFFF")
SUB = Font(name=F, size=11, color="FFFFFF")
H = Font(name=F, bold=True, color="FFFFFF")
N, B, GREY = Font(name=F), Font(name=F, bold=True), Font(name=F, color="6B7280")
thin = Side(style="thin", color=LINE)
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
MONEY = '$#,##0;($#,##0);"-"'
CENTER = Alignment(horizontal="center", vertical="center")
ROWS = 500  # shortcut: fixed 500 job rows, enough for a year of a small crew
TOP, LAST = 5, 5 + ROWS - 1  # first and last job row on the Jobs tab
STATUSES = [("Quote sent", "DBEAFE"), ("Booked", "EDE9FE"), ("Done", "FDE68A"),
            ("Paid", "BBF7D0"), ("Lost", "E5E7EB")]


def banner(ws, cols, title, sub):
    for r in (1, 2):
        ws.row_dimensions[r].height = 30 if r == 1 else 20
        for c in range(1, cols + 1):
            ws.cell(r, c).fill = fill(NAVY)
    ws["A1"], ws["A2"] = title, sub
    ws["A1"].font, ws["A2"].font = TITLE, SUB
    ws["A1"].alignment = ws["A2"].alignment = Alignment(vertical="center", indent=1)


def header(ws, row, names):
    for c, h in enumerate(names, 1):
        cell = ws.cell(row, c, h)
        cell.font, cell.fill, cell.alignment, cell.border = H, fill(NAVY), CENTER, BOX
    ws.row_dimensions[row].height = 22


wb = Workbook()

# --- Jobs (opens first)
j = wb.active
j.title = "Jobs"
j.sheet_view.showGridLines = False
cols = [("Date", 12), ("Customer", 22), ("Phone / email", 20), ("Service", 22), ("Price quoted", 13),
        ("Status", 13), ("Materials cost", 14), ("Date paid", 12), ("Profit", 12), ("Days to pay", 11),
        ("Notes", 32)]
banner(j, len(cols), "Job & Quote Tracker",
       "Type in the cream cells, one row per job. Pick a status. Profit and days to pay fill in by themselves.")
j["A3"] = "Red row = job done but not paid after 14 days.   Totals are on the Summary tab.   Rows 5 to 7 are examples: type over them."
j["A3"].font = GREY
header(j, 4, [c for c, _ in cols])
for c, (_, w) in enumerate(cols, 1):
    j.column_dimensions[j.cell(4, c).column_letter].width = w
j.freeze_panes = f"A{TOP}"

for r in range(TOP, LAST + 1):
    for c in range(1, 12):
        cell = j.cell(r, c)
        cell.font, cell.border = N, BOX
        if c not in (9, 10):
            cell.fill = fill(CREAM)
    j.cell(r, 1).number_format = j.cell(r, 8).number_format = "mmm d, yyyy"
    for c in (5, 7, 9):
        j.cell(r, c).number_format = MONEY
    j.cell(r, 6).alignment = j.cell(r, 10).alignment = CENTER
    j[f"I{r}"] = f'=IF(F{r}="Paid",E{r}-G{r},"")'
    j[f"J{r}"] = f'=IF(AND(A{r}<>"",H{r}<>""),H{r}-A{r},"")'

examples = [
    [date(2026, 11, 3), "J. Smith (example)", "555-0100", "Fence repair", 450, "Paid", 120, date(2026, 11, 10), None, None, "Paid by card"],
    [date(2026, 11, 12), "R. Lopez (example)", "555-0142", "Gutter cleaning", 220, "Booked", 0, None, None, None, "Friday 9am"],
    [date(2026, 11, 18), "K. Brown (example)", "555-0187", "Deck staining", 900, "Quote sent", None, None, None, None, "Call back Monday"],
]
for i, row in enumerate(examples):
    for c, v in enumerate(row, 1):
        if v is not None:
            j.cell(TOP + i, c, v)

dv = DataValidation(type="list", formula1='"' + ",".join(s for s, _ in STATUSES) + '"', allow_blank=True)
j.add_data_validation(dv)
dv.add(f"F{TOP}:F{LAST}")
area = f"A{TOP}:K{LAST}"
j.conditional_formatting.add(area, FormulaRule(
    formula=[f'AND($F{TOP}="Done",$H{TOP}="",$A{TOP}<>"",TODAY()-$A{TOP}>14)'], fill=fill("FCA5A5"), stopIfTrue=True))
for s, color in STATUSES:
    j.conditional_formatting.add(f"F{TOP}:F{LAST}", CellIsRule(operator="equal", formula=[f'"{s}"'], fill=fill(color)))

# --- Summary
m = wb.create_sheet("Summary")
m.sheet_view.showGridLines = False
banner(m, 8, "Summary", "Everything here updates by itself from the Jobs tab.")
rng = lambda col: f"Jobs!${col}${TOP}:${col}${LAST}"

cards = [("Waiting on quotes", "=C14", MONEY), ("Owed to you", "=C16", MONEY),
         ("Profit on paid jobs", f'=SUM({rng("I")})', MONEY),
         ("Quotes won", "=IFERROR((B15+B16+B17)/(B15+B16+B17+B18),0)", "0%")]
for i, (label, f, fmt) in enumerate(cards):
    col = 1 + i * 2
    for r in (4, 5, 6):
        for c in (col, col + 1):
            m.cell(r, c).fill, m.cell(r, c).border = fill("F3F4F6"), Border()
    m.merge_cells(start_row=4, start_column=col, end_row=4, end_column=col + 1)
    m.merge_cells(start_row=5, start_column=col, end_row=6, end_column=col + 1)
    m.cell(4, col, label).font = GREY
    v = m.cell(5, col, f)
    v.font, v.number_format = Font(name=F, bold=True, size=20, color=NAVY), fmt
    m.cell(4, col).alignment = v.alignment = Alignment(horizontal="center", vertical="center")

m["A8"], m["B8"] = "Average days to get paid", f'=IFERROR(AVERAGE({rng("J")}),0)'
m["A8"].font, m["B8"].font, m["B8"].number_format = B, B, '0.0" days"'

header(m, 13, ["Status", "Jobs", "Value"])
for i, (s, color) in enumerate(STATUSES, 14):
    a = m.cell(i, 1, s)
    a.font, a.fill, a.border = N, fill(color), BOX
    b = m.cell(i, 2, f'=COUNTIF({rng("F")},A{i})')
    c = m.cell(i, 3, f'=SUMIF({rng("F")},A{i},{rng("E")})')
    for x in (b, c):
        x.font, x.border = N, BOX
    c.number_format = MONEY

m["E11"], m["F11"] = "Year:", "=YEAR(TODAY())"
m["E11"].font, m["F11"].font, m["F11"].fill = B, B, fill(CREAM)
m["G11"], m["G11"].font = "type a year to see it", GREY
m.cell(13, 5).value = None
for c, h in enumerate(["Month", "Jobs paid", "Money in", "Profit"], 5):
    cell = m.cell(13, c, h)
    cell.font, cell.fill, cell.alignment, cell.border = H, fill(NAVY), CENTER, BOX
for i in range(12):
    r = 14 + i
    cond = f'{rng("F")},"Paid",{rng("H")},">="&E{r},{rng("H")},"<"&EDATE(E{r},1)'
    vals = [(f"=DATE($F$11,{i + 1},1)", "mmmm"), (f"=COUNTIFS({cond})", "0"),
            (f"=SUMIFS({rng('E')},{cond})", MONEY), (f"=SUMIFS({rng('I')},{cond})", MONEY)]
    for c, (f, fmt) in enumerate(vals, 5):
        cell = m.cell(r, c, f)
        cell.font, cell.border, cell.number_format = N, BOX, fmt
for col, w in zip("ABCDEFGH", [26, 12, 14, 12, 14, 12, 14, 14]):
    m.column_dimensions[col].width = w

# --- How to use (last)
s = wb.create_sheet("How to use")
s.sheet_view.showGridLines = False
banner(s, 1, "How to use this tracker", "For handymen, cleaners, landscapers, painters and other service businesses.")
steps = [
    "1. Every time you give a price, add a row on the Jobs tab and pick the status Quote sent.",
    "2. Change the status as the job moves: Booked, Done, then Paid (or Lost if they say no).",
    "3. When they pay, type the date paid and what you spent on materials. Profit appears by itself.",
    "4. A row turns red when the job is done but still unpaid after 14 days: time to send a reminder.",
    "5. The Summary tab shows what is waiting, what you are owed, your profit and each month's money.",
    "",
    "Only type in the cream cells. The white ones work out the numbers.",
    "Delete the three example rows (5 to 7) when you start: select them, press Delete.",
    "Other currency? Select the money columns, right click > Format Cells > Currency.",
]
for i, t in enumerate(steps, 4):
    s.cell(i, 1, t).font = N
s.column_dimensions["A"].width = 100

wb.save("Job-Tracker.xlsx")
