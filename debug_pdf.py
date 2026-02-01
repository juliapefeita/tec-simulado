import fitz
import os

pdf_path = os.path.join("assets", "uploads", "exam.pdf")

if not os.path.exists(pdf_path):
    print("PDF not found")
    exit()

doc = fitz.open(pdf_path)
print(f"Pages: {len(doc)}")

for i, page in enumerate(doc):
    print(f"--- Page {i} ---")
    
    # Check Images
    imgs = page.get_images()
    print(f"Images found via get_images: {len(imgs)}")
    for img in imgs:
        xref = img[0]
        rects = page.get_image_rects(xref)
        print(f"  Img Xref {xref} -> Rects: {rects}")

    # Check Drawings
    drawings = page.get_drawings()
    print(f"Drawings: {len(drawings)}")
    if len(drawings) > 0:
        # Check first/largest
        d = sorted(drawings, key=lambda x: x['rect'].width * x['rect'].height, reverse=True)[0]
        print(f"  Largest drawing rect: {d['rect']}")

    # Check Blocks
    blocks = page.get_text("dict")["blocks"]
    img_blocks = [b for b in blocks if b['type'] == 1]
    print(f"Image Blocks (type=1): {len(img_blocks)}")
    
    if len(imgs) > 0 or len(img_blocks) > 0 or len(drawings) > 0:
        print("Found visual content.")
