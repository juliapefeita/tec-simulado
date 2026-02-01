import fitz
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "assets", "uploads", "exam.pdf")

if not os.path.exists(PDF_PATH):
    print(f"Error: PDF not found at {PDF_PATH}")
    sys.exit(1)

doc = fitz.open(PDF_PATH)
with open("debug_output.txt", "w", encoding="utf-8") as f:
    for i in range(min(5, len(doc))):
        page = doc[i]
        f.write(f"\n=== PAGE {i} ===\n")
        blocks = page.get_text("blocks")
        for b in blocks:
            if b[6] == 0: # Text block
                f.write(f"[Block] {b[4].strip()}\n")
print("Dumped to debug_output.txt")
