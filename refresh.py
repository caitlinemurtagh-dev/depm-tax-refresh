"""Check FY2027 Q3 statements for the portfolio's directly billed accounts."""
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
from zoneinfo import ZoneInfo

SITE = Path("site/data.js")
TODAY = datetime.datetime.now(ZoneInfo("America/New_York")).date().isoformat()
KEYS = ("due", "pat", "count")

def amount(text, label):
    match = re.search(label + r"\*?\s*[:+]?\s*\$([\d,]+\.\d{2})", text, re.I)
    return float(match[1].replace(",", "")) if match else None

def read_bill(row):
    bbl = row["bbl"]
    url = ("https://a836-edms.nyc.gov/dctm-rest/repositories/dofedmspts/"
           f"StatementSearch?bbl={bbl}&stmtDate=20261114&stmtType=SOA&v={TODAY}")
    pdf = subprocess.check_output(["curl", "-fsSL", "--retry", "2", "--max-time", "25", url],
                                  stderr=subprocess.DEVNULL)
    text = subprocess.check_output(["pdftotext", "-layout", "-", "-"], input=pdf,
                                  stderr=subprocess.DEVNULL).decode()
    if f"{bbl[0]}-{bbl[1:6]}-{bbl[6:]}" not in text or "November 14, 2026" not in text:
        raise ValueError("Statement identity or period mismatch")
    due = amount(text, "amount due by January 4, 2027")
    annual = amount(text, "Annual property tax:")
    pat = amount(text, "plus non-primary residence surcharge")
    count = re.search(r"plus non-primary residence surcharge[^\n]*\n[^\n]*?\(([\d,]+) units?\)", text, re.I)
    units = int(count[1].replace(",", "")) if count else None
    if pat is None and not re.search("non.primary residence surcharge", text, re.I):
        pat, units = 0, 0
    if None in (due, annual, pat, units):
        raise ValueError("Incomplete statement")
    return dict(due=due, pat=pat, count=units, base=annual, bill=url)

def main():
    original = SITE.read_text()
    rows, end = json.JSONDecoder().raw_decode(original.removeprefix("const records="))
    history = original[len("const records=") + end:]
    eligible = [r for r in rows if not r["units"] and r["number"] != 2398 and r["bbl"] != "1007211003"]
    summary = []
    success = 0
    with concurrent.futures.ThreadPoolExecutor(5) as pool:
        jobs = {pool.submit(read_bill, row): row for row in eligible}
        for job in concurrent.futures.as_completed(jobs):
            row = jobs[job]
            try:
                result = job.result()
            except (ValueError, subprocess.SubprocessError, OSError):
                summary.append(f"- {row['number']} · Could not verify. Prior figures retained.")
                continue
            changes = [f"{k}: {row.get(k)} → {result[k]}" for k in KEYS if row.get(k) != result[k]]
            if changes:
                summary.append(f"- {row['number']} · {row['name']} · " + ", ".join(changes))
            row.update(result, note=f"FY2027 Q3 statement last verified {TODAY}.")
            success += 1
    report = f"Verified {success} of {len(eligible)} eligible portfolio entries.\n\n" + "\n".join(sorted(summary))
    print(report)
    if "GITHUB_STEP_SUMMARY" in os.environ:
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(report + "\n")
    if not success:
        raise SystemExit("No statements verified. Site unchanged.")
    SITE.write_text("const records=" + json.dumps(rows, ensure_ascii=False) + history)

if __name__ == "__main__":
    main()
