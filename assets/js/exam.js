
document.addEventListener('DOMContentLoaded', initExam);

// State
let questionsData = [];
let userAnswers = {};
let totalTime = 4 * 60 * 60;
let timerInterval;
let navigationListenerAttached = false;

const dom = {
    finishBtn: document.getElementById('finish-btn'),
    listContainer: document.getElementById('question-list'),
    timerDisplay: document.getElementById('exam-timer'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    // highlightMenu: fetched dynamically
};

// Highlight State
let currentRange = null;
let highlightMenu = null;

function initExam() {
    console.log("Exam Initializing v4.3 (Mouse Pos)...");

    // 1. Ensure Highlight Menu Exists
    ensureHighlightMenuExists();

    // 2. Load Content
    loadQuestions();
    startTimer();
    initPDF();

    if (dom.finishBtn) {
        dom.finishBtn.addEventListener('click', () => submitExam(false));
    }

    attachNavigationShortcuts();

    // Pause System
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    if (pauseBtn) pauseBtn.onclick = pauseExam;
    if (resumeBtn) resumeBtn.onclick = resumeExam;
}

let isPaused = false;

function pauseExam() {
    isPaused = true;
    clearInterval(timerInterval);
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function resumeExam() {
    isPaused = false;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    startTimer();
}

function ensureHighlightMenuExists() {
    highlightMenu = document.getElementById('highlight-menu');

    if (!highlightMenu) {
        console.log("Menu missing in HTML, injecting via JS...");
        const menuHTML = `
            <div id="highlight-menu" class="highlight-menu" style="display: none;">
                <div class="color-swatch" data-color="yellow" style="background: #fef08a;"></div>
                <div class="color-swatch" data-color="green" style="background: #bbf7d0;"></div>
                <div class="color-swatch" data-color="pink" style="background: #fbcfe8;"></div>
                <div class="color-swatch" data-color="blue" style="background: #bfdbfe;"></div>
                <div class="color-swatch" data-color="orange" style="background: #fb923c;"></div>
                <div class="color-action" data-action="remove" title="Remover" style="margin-left:4px; cursor:pointer; font-weight:bold; color:red;">X</div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', menuHTML);
        highlightMenu = document.getElementById('highlight-menu');
    }

    initHighlightEvents();
}

function initHighlightEvents() {
    if (!highlightMenu) return;

    // Detect Selection
    document.addEventListener('mouseup', (e) => {
        // Ignore clicks on the menu itself
        if (highlightMenu.contains(e.target)) return;

        // Hide first
        highlightMenu.style.display = 'none';

        // Capture Mouse Pos immediately
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Small delay to let selection finalize
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;

            const txt = selection.toString().trim();
            if (txt.length === 0) return;

            // Valid Selection!
            const range = selection.getRangeAt(0);
            currentRange = range.cloneRange();

            // Debug
            console.log("Selection valid:", txt.substring(0, 20) + "...");

            // Position Menu (Mouse Based)
            // Show slightly above the cursor
            let top = mouseY - 60;
            if (top < 10) top = mouseY + 20; // Flip if too high

            let left = mouseX - 100; // Center horiz
            if (left < 10) left = 10;
            if (left > window.innerWidth - 220) left = window.innerWidth - 220;

            highlightMenu.style.top = `${top}px`;
            highlightMenu.style.left = `${left}px`;
            highlightMenu.style.display = 'flex';
        }, 10);
    });

    // Bind Colors
    highlightMenu.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop event bubbling
            const color = swatch.getAttribute('data-color');
            console.log("Applying color:", color);
            applyHighlight(color);
        };
    });

    // Bind Remove
    const btnRemove = highlightMenu.querySelector('.color-action');
    if (btnRemove) {
        btnRemove.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Remove highlight from current selection
            if (currentRange) {
                // Restore selection to apply command
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(currentRange);

                // Use execCommand for un-highlighting (strips formatting)
                document.execCommand('unlink'); // Sometimes works for links, but for marks?
                // Better: Stripping marks manually or finding parent mark

                // Strategy: Check if selection is inside a mark, if so, unwrap.
                // Or generic "remove format"
                document.execCommand('removeFormat');

                sel.removeAllRanges();
                currentRange = null;
            }
            highlightMenu.style.display = 'none';
        };
    }
}

function applyHighlight(color) {
    if (!currentRange) {
        console.warn("No Range to highlight!");
        return;
    }
    try {
        const mark = document.createElement('mark');
        mark.className = `h-${color}`;
        mark.title = "Clique para remover";
        mark.onclick = function (e) { e.stopPropagation(); this.outerHTML = this.innerHTML; };

        // Execute highlight
        currentRange.surroundContents(mark);

        // Clear selection
        window.getSelection().removeAllRanges();
        currentRange = null; // Reset
    } catch (e) {
        console.error("Highlight Error:", e);
        // Fallback for complex selections (overlapping tags)
        // document.execCommand('hiliteColor', false, color) // Deprecated but solid backup
        // But for now, let's stick to surroundContents
        alert("Não é possível destacar seleções que cruzam múltiplos parágrafos. Tente selecionar apenas o texto de um bloco.");
    }
    highlightMenu.style.display = 'none';
}

// --- Standard Question Logic ---
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        totalTime--;
        if (totalTime <= 0) { clearInterval(timerInterval); submitExam(true); }
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    if (!dom.timerDisplay) return;
    const h = Math.floor(totalTime / 3600), m = Math.floor((totalTime % 3600) / 60), s = totalTime % 60;
    dom.timerDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function pad(n) { return n.toString().padStart(2, '0'); }

async function loadQuestions() {
    try {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode') || 'private';

        // Update Title based on mode?
        if (mode === 'challenge') {
            document.title = "Desafio Geral | Tec Simulado";
            // Maybe show a toast or banner?
        }

        const res = await fetch(`api/get_questions.php?mode=${mode}&t=` + Date.now());
        // Clear "Loading..." immediately
        if (dom.listContainer) dom.listContainer.innerHTML = '';

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            if (dom.listContainer) {
                dom.listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger-color);">Erro fatal: Resposta inválida do servidor.<br><pre>${text.substring(0, 200)}</pre></div>`;
            }
            return;
        }
        if (json.success) {
            if (Array.isArray(json.data) && json.data.length > 0) {
                questionsData = json.data;
                renderQuestionList();
                updateProgress();
            } else {
                if (dom.listContainer) {
                    dom.listContainer.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#64748b;">
                        <h3>Nenhuma questão encontrada.</h3>
                        <p>Modo: <strong>${json.debug?.mode}</strong> | UserID: <strong>${json.debug?.user_id}</strong></p>
                        <p>Tente importar um PDF novamente.</p>
                    </div>
                `;
                }
                Toast.warning(`Nenhuma questão encontrada (ID: ${json.debug?.user_id})`);
            }
        } else {
            if (dom.listContainer) {
                dom.listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger-color);">Erro ao carregar: ${json.message}</div>`;
            }
            Toast.error(json.message || "Erro desconhecido");
        }
    } catch (e) {
        console.error(e);
        if (dom.listContainer) {
            dom.listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger-color);">Erro de Conexão: ${e.message}</div>`;
        }
    }
}

function renderQuestionList() {
    if (!dom.listContainer) return;
    dom.listContainer.innerHTML = '';
    questionsData.forEach((q, i) => {
        const isLocked = (q.is_locked == 1);
        const item = document.createElement('div');
        item.className = `q-item ${isLocked ? 'locked-question' : ''}`;
        item.id = `q-item-${q.id}`;

        if (isLocked) {
            const correct = (q.locked_is_correct == 1);
            item.style.borderLeft = correct ? '5px solid var(--success-color)' : '5px solid var(--danger-color)';
        }

        const badge = isLocked ? ((q.locked_is_correct == 1) ? '✅' : '❌') : '';
        const safePageRef = Number.isFinite(Number(q.pdf_page_ref)) ? Number(q.pdf_page_ref) : 1;
        item.innerHTML = `
            <div class="q-item-header">
                <span>Questão ${i + 1} ${badge}</span>
                <span class="pdf-link" onclick="syncPdf(${safePageRef})">Ver Pág ${safePageRef} ↗</span>
            </div>
            <div class="q-options-row"></div>
        `;

        const statement = document.createElement('div');
        statement.className = 'q-statement';
        statement.textContent = q.statement || "";
        statement.style.whiteSpace = 'pre-line';
        item.insertBefore(statement, item.querySelector('.q-options-row'));

        const optsDiv = item.querySelector('.q-options-row');
        ['A', 'B', 'C', 'D', 'E'].forEach(l => {
            const key = `option_${l.toLowerCase()}`;
            const label = document.createElement('label');
            label.className = 'option-label';

            const inp = document.createElement('input');
            inp.type = 'radio'; inp.name = `q_${q.id}`; inp.value = l; inp.className = 'option-input';

            if (isLocked) {
                inp.disabled = true; label.style.cursor = 'default';
                if (q.locked_option === l) {
                    inp.checked = true;
                    label.style.border = '2px solid ' + ((q.locked_is_correct == 1) ? 'var(--success-color)' : 'var(--danger-color)');
                    label.style.background = (q.locked_is_correct == 1) ? '#f0fdf4' : '#fef2f2';
                }
            } else {
                // Check if user selected this previously
                if (userAnswers[q.id] === l) {
                    inp.checked = true;
                }
                inp.onclick = () => handleAnswer(q.id, l);
            }

            label.appendChild(inp);

            // Fix: Create elements instead of innerHTML += to preserve event listeners
            const circle = document.createElement('span');
            circle.className = 'option-circle';
            circle.textContent = l;
            label.appendChild(circle);

            const textSpan = document.createElement('span');
            textSpan.className = 'option-text';
            textSpan.textContent = q[key] || "";
            label.appendChild(textSpan);

            optsDiv.appendChild(label);
        });
        dom.listContainer.appendChild(item);
    });

    // Initialize Navigator
    renderNavigator();
}

let currentFocusIndex = -1;
function navigateToNext() {
    if (currentFocusIndex < questionsData.length - 1) {
        currentFocusIndex++;
        scrollToQuestionIndex(currentFocusIndex);
    }
}
function navigateToPrev() {
    if (currentFocusIndex > 0) {
        currentFocusIndex--;
        scrollToQuestionIndex(currentFocusIndex);
    }
}
function scrollToQuestionIndex(i) {
    const q = questionsData[i];
    if (!q) return;
    const el = document.getElementById(`q-item-${q.id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('current'));
        document.getElementById(`nav-btn-${q.id}`)?.classList.add('current');
    }
}

function attachNavigationShortcuts() {
    if (navigationListenerAttached) return;
    navigationListenerAttached = true;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            navigateToNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateToPrev();
        }
    });
}


function renderNavigator() {
    // Remove existing
    const existing = document.querySelector('.q-navigator');
    if (existing) existing.remove();

    const nav = document.createElement('div');
    nav.className = 'q-navigator';

    // Header
    nav.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-weight:700; font-size:14px; color:#334155;">Navegação</span>
            <span style="font-size:12px; color:#64748b;">${questionsData.length} Questões</span>
        </div>
        <div class="nav-grid"></div>
    `;

    const grid = nav.querySelector('.nav-grid');

    questionsData.forEach((q, i) => {
        const btn = document.createElement('div');
        btn.className = `nav-item ${userAnswers[q.id] ? 'answered' : ''}`;
        btn.textContent = i + 1;
        btn.onclick = () => {
            const el = document.getElementById(`q-item-${q.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Update "current" style
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('current'));
                btn.classList.add('current');
            }
        };
        btn.id = `nav-btn-${q.id}`;
        grid.appendChild(btn);
    });

    document.body.appendChild(nav);

    // Add Toggle Button for Mobile
    if (!document.querySelector('.toggle-nav-btn')) {
        const toggle = document.createElement('div');
        toggle.className = 'toggle-nav-btn';
        toggle.innerHTML = '☰';
        toggle.onclick = () => nav.classList.toggle('active');
        document.body.appendChild(toggle);
    }
}

function handleAnswer(qId, val) {
    userAnswers[qId] = val;
    document.getElementById(`q-item-${qId}`)?.classList.add('answered-state');

    // Update Navigator
    const navBtn = document.getElementById(`nav-btn-${qId}`);
    if (navBtn) navBtn.classList.add('answered');

    updateProgress();
}

function updateProgress() {
    const c = Object.keys(userAnswers).length, t = questionsData.length;
    if (dom.progressFill) dom.progressFill.style.width = `${(t === 0 ? 0 : c / t) * 100}%`;
    if (dom.progressText) dom.progressText.textContent = `${c} respondidas`;
}
async function submitExam(f = false) {
    if (!f && !confirm('Finalizar?')) return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'private';
    const res = await fetch('api/submit_answer.php', {
        method: 'POST',
        body: JSON.stringify({ answers: userAnswers, mode: mode })
    });
    const dat = await res.json();
    if (dat.success) renderResultPanel(dat);
}
function renderResultPanel(d) {
    if (!dom.listContainer) return;
    // 0. Force Re-render to ensure elements exist (fixes blank screen issue)
    renderQuestionList();

    // 1. Hide Controls
    if (dom.finishBtn) dom.finishBtn.style.display = 'none';
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';

    // 2. Show Summary at Top
    let mistakesHtml = '';
    if (d.details && Array.isArray(d.details)) {
        const mistakes = d.details.filter(x => !x.is_correct);
        if (mistakes.length > 0) {
            mistakesHtml = `<div style="text-align: left; background: #fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fee2e2; margin-top: 16px; max-height: 200px; overflow-y: auto;">
                <h4 style="color: var(--danger-color); margin-bottom: 8px; font-size: 14px; font-weight: 700;">Questões Incorretas:</h4>
                <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px;">
                    ${mistakes.map(m => `
                        <li style="font-size: 14px; color: #7f1d1d;">
                            <strong>Questão ${m.id}:</strong> Sua resposta <span style="text-decoration: line-through; opacity: 0.7;">(${m.user_answer})</span> ➝ 
                            <span style="color: var(--success-color); font-weight: 700;">Correta: ${m.correct_answer}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>`;
        }
    }

    const summaryHtml = `
        <div class="result-container" style="text-align:center; padding:30px; background:#fff; margin-bottom: 24px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <h2 style="font-size: 32px; color: var(--primary-color);">Resultado: +${d.score} XP</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Você acertou ${d.score} de ${d.details.length} questões respondidas.</p>
            ${mistakesHtml}
            <div style="margin-top: 24px;">
                <a href="dashboard.html" class="btn btn-primary">Voltar ao Dashboard</a>
            </div>
        </div>
    `;
    dom.listContainer.insertAdjacentHTML('afterbegin', summaryHtml);
    dom.listContainer.scrollTop = 0;

    // 3. Update Questions with Feedback
    if (d.details && Array.isArray(d.details)) {
        d.details.forEach(det => {
            const item = document.getElementById(`q-item-${det.id}`);
            if (!item) return;

            // Mark Header
            const header = item.querySelector('.q-item-header');
            if (header) {
                header.style.color = det.is_correct ? 'var(--success-color)' : 'var(--danger-color)';
                header.innerHTML = `
                    <span>Questão ${det.id} ${det.is_correct ? '✅ Acertou' : '❌ Errou'}</span>
                    <span class="pdf-link" onclick="syncPdf(${questionsData.find(q => q.id == det.id)?.pdf_page_ref || 1})">Revisar Pág ↗</span>
                `;
            }
            item.style.borderLeft = det.is_correct ? '5px solid var(--success-color)' : '5px solid var(--danger-color)';

            // Disable Inputs & Highlight
            const inputs = item.querySelectorAll('input');
            inputs.forEach(inp => inp.disabled = true);

            const labels = item.querySelectorAll('.option-label');
            labels.forEach(lbl => {
                const val = lbl.querySelector('input').value;

                // Reset styles
                lbl.style.cursor = 'default';

                // Highlight Correct Answer
                if (val === det.correct_answer) {
                    lbl.style.border = '2px solid var(--success-color)';
                    lbl.style.background = '#f0fdf4';
                }

                // Highlight User Error
                if (!det.is_correct && val === det.user_answer) {
                    lbl.style.border = '2px solid var(--danger-color)';
                    lbl.style.background = '#fef2f2';
                }
            });
        });
    }
}

let pdfDoc = null, pageNum = 1, scale = 1.0, canvas, ctx;
function initPDF() {
    canvas = document.getElementById('pdf-render');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    const url = 'assets/uploads/exam.pdf?t=' + Date.now();
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.getDocument(url).promise.then(p => { pdfDoc = p; renderPage(pageNum); });
    }
}
function renderPage(num) {
    if (!pdfDoc) return;
    pdfDoc.getPage(num).then(p => {
        var v = p.getViewport({ scale: scale }); canvas.height = v.height; canvas.width = v.width;
        p.render({ canvasContext: ctx, viewport: v });
        document.getElementById('page-num').textContent = num;
    });
}
window.prevPage = () => { if (pageNum > 1) { pageNum--; renderPage(pageNum); } };
window.nextPage = () => { if (pdfDoc && pageNum < pdfDoc.numPages) { pageNum++; renderPage(pageNum); } };
window.zoomIn = () => { scale += 0.2; renderPage(pageNum); };
window.zoomOut = () => { if (scale > 0.4) { scale -= 0.2; renderPage(pageNum); } };
window.syncPdf = (p) => { pageNum = p; renderPage(pageNum); };
