import fitz  # PyMuPDF
import re
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "assets", "uploads", "exam.pdf")
IMG_DIR = os.path.join(BASE_DIR, "assets", "uploads", "images")
SQL_OUTPUT = os.path.join(BASE_DIR, "import_questions.sql")

# Ensure image dir exists
if not os.path.exists(IMG_DIR):
    os.makedirs(IMG_DIR)

# Clear old images
for f in os.listdir(IMG_DIR):
    os.remove(os.path.join(IMG_DIR, f))

def clean_text(text):
    if not text: return ""
    return text.replace("'", "''").strip()

import argparse

def run_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner_id", help="Owner ID for private questions (or 'NULL')", default="NULL")
    args = parser.parse_args()
    
    owner_val = args.owner_id
    if owner_val != "NULL":
        # Ensure it's an integer
        try:
            int(owner_val)
        except:
            owner_val = "NULL"


    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found at {PDF_PATH}")
        return

    doc = fitz.open(PDF_PATH)
    # ... (rest of logic same until SQL) ...
    full_content = []  # List of {'y': float, 'text': str, 'type': 'text'|'img'}
    
    img_counter = 0

    print(f"Processing {len(doc)} pages...")

    for page_num, page in enumerate(doc):
        # 1. TEXT BLOCKS
        text_blocks = page.get_text("blocks")
        
        # 2. VISUAL CANDIDATES
        candidates = []
        
        # A. Images
        for img in page.get_images():
            try:
                rects = page.get_image_rects(img[0])
                for r in rects: candidates.append(r)
            except: pass

        # B. Drawings
        for p in page.get_drawings():
            candidates.append(p["rect"])

        # 3. CLUSTERING (Merge close rects)
        merged_rects = []
        if candidates:
            # Sort by y0 then x0
            candidates.sort(key=lambda r: (r.y0, r.x0))
            
            current_group = candidates[0]
            
            for i in range(1, len(candidates)):
                next_r = candidates[i]
                
                # Check intersection or closeness (e.g. 10px buffer)
                tolerance = 15
                expanded = fitz.Rect(current_group.x0 - tolerance, current_group.y0 - tolerance, 
                                     current_group.x1 + tolerance, current_group.y1 + tolerance)
                
                if expanded.intersects(next_r):
                    current_group = current_group | next_r # Union
                else:
                    merged_rects.append(current_group)
                    current_group = next_r
            
            merged_rects.append(current_group)

        # 4. RENDER VALID REGIONS
        for i, rect in enumerate(merged_rects):
            if rect.width < 30 or rect.height < 30: continue
            
            page_h = page.rect.height
            if rect.y1 < 40: continue 
            if rect.y0 > page_h - 40: continue 
            
            if rect.width / rect.height > 20: continue 
            if rect.height / rect.width > 20: continue 

            fname = f"visual_p{page_num}_{img_counter}.png"
            path = os.path.join(IMG_DIR, fname)
            
            try:
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect)
                if pix.width < 10 or pix.height < 10: continue
                
                pix.save(path)
                img_counter += 1
                
                html = f"<div style='text-align:center'><img src='assets/uploads/images/{fname}' class='question-image' style='max-width:100%; margin: 10px 0; border: 1px solid #eee;'></div>"
                
                full_content.append({
                    'y': rect.y0 + (page_num * 10000), 
                    'text': html, 
                    'type': 'img'
                })
            except Exception as e:
                print(f"Failed to render rect: {e}")

        # Add TEXT to stream
        for block in text_blocks:
            x0, y0, x1, y1, text, block_no, block_type = block
            if block_type == 0: # Text
                # Filter headers (dumb filter)
                if y1 < 30 or y0 > page.rect.height - 30: continue
                
                clean = text.strip()
                if clean:
                    full_content.append({
                        'y': y0 + (page_num * 10000), 
                        'text': text + "\n", 
                        'type': 'text'
                    })

    # Sort everything by vertical position
    full_content.sort(key=lambda x: x['y'])
    
    # 4. PARSE STREAM INTO QUESTIONS (Link-Based Strategy for TecConcursos)
    questions = []
    current_q = None
    current_opt = None 
    
    # Gabarito State
    gabarito_mode = False
    gabarito_text = ""

    # Regex definitions
    re_link = re.compile(r"tecconcursos\.com\.br/questoes/\d+", re.IGNORECASE)
    re_opt_start = re.compile(r"^\s*([a-e])[\.\)]\s+(.*)", re.IGNORECASE | re.DOTALL)

    for item in full_content:
        text = item['text']
        item_type = item['type'] # 'text' or 'img'
        
        clean_text_line = text.strip()
        
        # CHECK FOR GABARITO START
        if "gabarito" in clean_text_line.lower() and len(clean_text_line) < 50:
             gabarito_mode = True
        
        if gabarito_mode:
            gabarito_text += text + " "
            continue

        # Check for Question Delimiter
        if item_type == 'text':
            if re_link.search(text):
                if current_q:
                    questions.append(current_q)
                
                current_q = {
                    'statement': "",
                    'options': {},
                    'correct': 'A' 
                }
                current_opt = None
                continue

        if not current_q:
            continue 

        if item_type == 'img':
            if current_opt:
                current_q['options']['option_' + current_opt] += text
            else:
                current_q['statement'] += text
            continue
            
        # Text Processing
        start_opt_match = re_opt_start.match(clean_text_line)
        
        if start_opt_match:
            start_letter = start_opt_match.group(1).lower()
            current_opt = start_letter
            
            parts = re.split(r"(?:\s|^)([a-e])[\)\.]\s+", clean_text_line)
            
            idx = 0
            while idx < len(parts):
                val = parts[idx]
                if len(val) == 1 and val.lower() in 'abcde':
                    opt_letter = val.lower()
                    if idx + 1 < len(parts):
                        opt_content = parts[idx+1]
                        current_q['options']['option_' + opt_letter] = opt_content + "\n"
                        current_opt = opt_letter 
                        idx += 2
                    else:
                        idx += 1
                else:
                    idx += 1
            
            continue

        if current_q:
            if current_opt:
                key = 'option_' + current_opt
                if key not in current_q['options']:
                    current_q['options'][key] = ""
                current_q['options'][key] += text
            else:
                current_q['statement'] += text

    if current_q:
        questions.append(current_q)

    # 5. PROCESS GABARITO
    print(f"Parsing Gabarito...")
    re_ans = re.compile(r"(\d+)[\.\)]?\s*([a-eA-E])")
    answers = re_ans.findall(gabarito_text)
    
    ans_map = {}
    for num, letter in answers:
        ans_map[int(num)] = letter.upper()
        
    print(f"Found {len(ans_map)} answers in Gabarito.")
    
    for i, q in enumerate(questions):
        q_num = i + 1
        if q_num in ans_map:
            q['correct'] = ans_map[q_num]
        else:
            print(f"Warning: No answer found for Q{q_num}")

    # 6. GENERATE SQL
    print(f"Extracted {len(questions)} questions.")
    print(f"Imported {img_counter} images.")
    
    with open(SQL_OUTPUT, "w", encoding="utf-8") as f:
        # NOTE: TRUNCATE removed. Handled by PHP logic.
        f.write("-- SQL Generated by Parser\n") 
        
        seen_stmts = set()
        
        for q in questions:
            stmt = clean_text(q['statement'])
            
            if stmt in seen_stmts: continue
            seen_stmts.add(stmt)
            
            opt_a = clean_text(q['options'].get('option_a', ''))
            opt_b = clean_text(q['options'].get('option_b', ''))
            opt_c = clean_text(q['options'].get('option_c', ''))
            opt_d = clean_text(q['options'].get('option_d', ''))
            opt_e = clean_text(q['options'].get('option_e', ''))
            correct = q['correct'] 
            
            if stmt and opt_a:
                # Use owner_val (NULL or integer) unquoted if NULL, quoted if not? 
                # Better: always insert strictly. 
                # If owner_val is "NULL", write NULL. If "123", write 123.
                
                sql = f"INSERT IGNORE INTO questions (statement, option_a, option_b, option_c, option_d, option_e, correct_option, pdf_page_ref, owner_id) VALUES ('{stmt}', '{opt_a}', '{opt_b}', '{opt_c}', '{opt_d}', '{opt_e}', '{correct}', 1, {owner_val});\n"
                f.write(sql)

    print("SQL Generated successfully.")

if __name__ == "__main__":
    run_parser()
