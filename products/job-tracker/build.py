# Builds Job-Tracker.xlsx: a quote and job tracker for small home-service businesses.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from datetime import date

F = "Arial"
H = Font(name=F, bold=True, color="FFFFFF")
HF = PatternFill("solid", fgColor="1F3A5F")
IN = PatternFill("solid", fgColor="FFF6D5")
N = Font(name=F)
B = Font(name=F, bold=True)
MONEY = '$#,##0.00;($#,##0.00);-'
ROWS = 500  # shortcut: fixed 500 job rows, enough for a year of a small crew

wb = Workbook()

# --- Start here
s = wb.active
s.title = "Start here"
lines = [
    ("Job & Quote Tracker", Font(name=F, bold=True, size=16)),
    ("For handymen, cleaners, landscapers, painters and other small service businesses.", N),
    ("", N),
    ("How to use it", B),
    ("1. Go to the Jobs tab. Type only in the cream cells, one row per quote or job.", N),
    ("2. Pick a Status: Quote sent, Booked, Done, Paid or Lost.", N),
    ("3. Profit, days to pay and the warnings fill in by themselves.", N),
    ("4. The Summary tab shows totals for each status and for each month.", N),
    ("5. Row 2 is an example. Overwrite it or delete its contents.", N),
    ("", N),
    ("Rows turn red when a job is Done but unpaid for more than 14 days.", N),
    ("Change the currency: select the money columns, then Format Cells > Currency.", N),
]
for i, (t, f) in enumerate(lines, 1):
    s.cell(i, 1, t).font = f
s.column_dimensions["A"].width = 95

# --- Jobs
j = wb.create_sheet("Jobs")
heads = ["Date", "Customer", "Phone / email", "Service", "Quote", "Status",
         "Materials cost", "Paid on", "Profit", "Days to pay", "Notes"]
widths = [12, 22, 22, 22, 12, 13, 14, 12, 12, 12, 30]
for c, (h, w) in enumerate(zip(heads, widths), 1):
    cell = j.cell(1, c, h)
    cell.font, cell.fill = H, HF
    cell.alignment = Alignment(horizontal="center")
    j.column_dimensions[cell.column_letter].width = w
j.freeze_panes = "A2"

example = [date(2026, 11, 3), "Example: J. Smith", "555-0100", "Fence repair", 450,
           "Paid", 120, date(2026, 11, 10)]
for r in range(2, ROWS + 2):
    for c in (1, 2, 3, 4, 5, 6, 7, 8, 11):
        cell = j.cell(r, c)
        cell.fill, cell.font = IN, N
    j.cell(r, 1).number_format = j.cell(r, 8).number_format = "yyyy-mm-dd"
    j.cell(r, 5).number_format = j.cell(r, 7).number_format = MONEY
    j[f"I{r}"] = f'=IF(F{r}="Paid",E{r}-G{r},"")'
    j[f"I{r}"].number_format = MONEY
    j[f"J{r}"] = f'=IF(AND(A{r}<>"",H{r}<>""),H{r}-A{r},"")'
    j[f"I{r}"].font = j[f"J{r}"].font = N
for c, v in enumerate(example, 1):
    j.cell(2, c, v)

dv = DataValidation(type="list", formula1='"Quote sent,Booked,Done,Paid,Lost"', allow_blank=True)
j.add_data_validation(dv)
dv.add(f"F2:F{ROWS + 1}")
j.conditional_formatting.add(
    f"A2:K{ROWS + 1}",
    FormulaRule(formula=['AND($F2="Done",$H2="",TODAY()-$A2>14)'],
                fill=PatternFill("solid", fgColor="F8C9C4")))

# --- Summary
m = wb.create_sheet("Summary")
rng = lambda col: f"Jobs!${col}$2:${col}${ROWS + 1}"
m["A1"] = "Summary"
m["A1"].font = Font(name=F, bold=True, size=14)
for c, h in enumerate(["Status", "Jobs", "Quoted value"], 1):
    cell = m.cell(3, c, h)
    cell.font, cell.fill = H, HF
statuses = ["Quote sent", "Booked", "Done", "Paid", "Lost"]
for i, st in enumerate(statuses, 4):
    m.cell(i, 1, st).font = N
    m.cell(i, 2, f'=COUNTIF({rng("F")},A{i})').font = N
    m.cell(i, 3, f'=SUMIF({rng("F")},A{i},{rng("E")})').number_format = MONEY
m["A10"], m["B10"] = "Win rate (Booked, Done, Paid vs all decided)", "=IFERROR((B5+B6+B7)/(B5+B6+B7+B8),0)"
m["B10"].number_format = "0.0%"
m["A11"], m["B11"] = "Total profit on paid jobs", f'=SUM({rng("I")})'
m["B11"].number_format = MONEY
m["A12"], m["B12"] = "Average days to get paid", f'=IFERROR(AVERAGE({rng("J")}),0)'
m["B12"].number_format = "0.0"
m["A13"], m["B13"] = "Unpaid finished work", "=C6"
m["B13"].number_format = MONEY

m["E3"] = "Month (first day)"
for c, h in enumerate(["Month (first day)", "Jobs paid", "Revenue", "Profit"], 5):
    cell = m.cell(3, c, h)
    cell.font, cell.fill = H, HF
m["E2"], m["F2"] = "Year:", 2026
m["F2"].fill = IN
for i in range(12):
    r = 4 + i
    m.cell(r, 5, f"=DATE($F$2,{i + 1},1)").number_format = "mmm yyyy"
    nxt = f"EDATE(E{r},1)"
    cond = f'{rng("F")},"Paid",{rng("H")},">="&E{r},{rng("H")},"<"&{nxt}'
    m.cell(r, 6, f"=COUNTIFS({cond})")
    m.cell(r, 7, f"=SUMIFS({rng('E')},{cond})").number_format = MONEY
    m.cell(r, 8, f"=SUMIFS({rng('I')},{cond})").number_format = MONEY
for row in m.iter_rows(min_row=2, max_row=15):
    for cell in row:
        if not cell.fill.fgColor.rgb or cell.fill.fgColor.rgb == "00000000":
            cell.font = B if cell.column == 1 and cell.row >= 10 else N
for col, w in zip("ABCDEFGH", [42, 10, 14, 3, 18, 11, 13, 13]):
    m.column_dimensions[col].width = w

wb.save("Job-Tracker.xlsx")
