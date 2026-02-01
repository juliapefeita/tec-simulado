const fs = require('fs');
let pdfParse;
try {
    pdfParse = require('pdf-parse');
} catch (e) {
    try { pdfParse = require('./node_modules/pdf-parse'); } catch (e2) { }
}

async function run() {
    // 1. Read PDF
    // 'assets/uploads/exam.pdf' is where upload_pdf.php saves it
    const pdfPath = 'assets/uploads/exam.pdf';

    if (!fs.existsSync(pdfPath)) {
        console.error("PDF not found at " + pdfPath);
        process.exit(1);
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    let data;
    if (pdfParse) {
        data = await pdfParse(dataBuffer);
    } else {
        // Fallback for demo or if dependency missing (shouldn't happen in prod)
        console.error("PDF Parse lib missing");
        process.exit(1);
    }

    const rawText = data.text;
    const lines = rawText.split(/\r?\n/);

    const questions = [];
    let currentQ = null;
    let currentOption = null;

    // Regex Patterns
    const qStartRegex = /^(\d+)[\.\)]\s+(.*)/; // 1. Text or 1) Text
    const optRegex = /^([a-eA-E])[\.\)]\s+(.*)/; // a) Text or A. Text

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Skip common headers/footers
        if (line.match(/^\d+\s+of\s+\d+$/)) continue; // Page numbers

        // Check for Question Start
        const qMatch = line.match(qStartRegex);
        if (qMatch) {
            // New Question Found
            // Save previous if exists
            if (currentQ) {
                questions.push(currentQ);
            }

            currentQ = {
                id: qMatch[1],
                statement: [qMatch[2]], // Start statement
                options: {},
                correct: 'A' // Default/Unknown
            };
            currentOption = null;
            continue;
        }

        // Check for Option Start
        const optMatch = line.match(optRegex);
        if (optMatch && currentQ) {
            const letter = optMatch[1].toUpperCase(); // A,B,C...
            currentOption = 'option_' + letter.toLowerCase();
            currentQ.options[currentOption] = optMatch[2];
            continue;
        }

        // Continuation
        if (currentQ) {
            if (currentOption) {
                // Continue option
                currentQ.options[currentOption] += ' ' + line;
            } else {
                // Continue statement
                currentQ.statement.push(line);
            }
        }
    }
    // Push last
    if (currentQ) questions.push(currentQ);

    // Deduplicate internally (in case PDF has repeats)
    const uniqueQuestions = [];
    const stmtSet = new Set();

    questions.forEach(q => {
        const signature = q.statement.join(' ').trim();
        if (!stmtSet.has(signature)) {
            stmtSet.add(signature);
            uniqueQuestions.push(q);
        }
    });

    if (uniqueQuestions.length === 0) {
        console.log("No questions found in PDF.");
        // Write empty file or comments
        fs.writeFileSync('import_questions.sql', "-- No questions found", 'utf8');
        return;
    }

    // SQL Generation
    // TRUNCATE to replace existing exam (clean state)
    // Internal deduplication ensures no repeats from the PDF itself.

    let sql = "TRUNCATE TABLE questions;\n";

    uniqueQuestions.forEach((q, idx) => {
        // Fallback checks
        const stmt = q.statement.join('\n').replace(/'/g, "''").trim();
        const optA = (q.options.option_a || '...').replace(/'/g, "''").trim();
        const optB = (q.options.option_b || '...').replace(/'/g, "''").trim();
        const optC = (q.options.option_c || '...').replace(/'/g, "''").trim();
        const optD = (q.options.option_d || '...').replace(/'/g, "''").trim();
        const optE = (q.options.option_e || '...').replace(/'/g, "''").trim();

        // Use INSERT (UNIQUE constraint will handle any rare race/edge case, but TRUNCATE clears the way)
        if (stmt) {
            sql += `INSERT INTO questions (statement, option_a, option_b, option_c, option_d, option_e, correct_option, pdf_page_ref) ` +
                `VALUES ('${stmt}', '${optA}', '${optB}', '${optC}', '${optD}', '${optE}', 'A', 1);\n`;
        }
    });

    fs.writeFileSync('import_questions.sql', sql, 'utf8');
    console.log(`Generated SQL for ${uniqueQuestions.length} questions.`);
}

run();
