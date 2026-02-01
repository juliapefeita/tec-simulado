const fs = require('fs');
let pdf;
try {
    pdf = require('pdf-parse');
} catch (e) {
    try {
        pdf = require('./node_modules/pdf-parse');
    } catch (e2) {
        console.error('FAILED TO LOAD PDF-PARSE. Check node_modules.');
        process.exit(1);
    }
}

let dataBuffer = fs.readFileSync('assets/uploads/adequar.pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('raw_questions_utf8.txt', data.text, 'utf8');
    console.log('Extraction complete to raw_questions_utf8.txt');
});
