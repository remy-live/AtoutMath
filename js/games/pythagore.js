import { regTimeout } from '../core/timers.js';
import { state } from '../core/state.js';

export function enginePythagore(canvas, isDemo, params) {
    const tables = params.tables && params.tables.length > 0 ? params.tables : [1,2,3,4,5,6,7,8,9,10];

    let row, col, product;
    if (params.forceQuestion && params.forceQuestion.row !== undefined) {
        row = params.forceQuestion.row;
        col = params.forceQuestion.col;
        product = params.forceQuestion.product;
    } else {
        col = tables[Math.floor(Math.random() * tables.length)];
        row = Math.floor(Math.random() * 10) + 1;
        product = row * col;
    }

    // Construction de la table de Pythagore complète (11x11 avec en-têtes)
    let gridHtml = '<div class="pytha-table">';
    gridHtml += '<div class="pytha-cell pytha-cell--corner">×</div>';
    for (let c = 1; c <= 10; c++) {
        const hl = c === col ? ' pytha-cell--highlight' : '';
        gridHtml += `<div class="pytha-cell pytha-cell--header${hl}">${c}</div>`;
    }
    for (let r = 1; r <= 10; r++) {
        const hlRow = r === row ? ' pytha-cell--highlight' : '';
        gridHtml += `<div class="pytha-cell pytha-cell--header${hlRow}">${r}</div>`;
        for (let c = 1; c <= 10; c++) {
            if (r === row && c === col) {
                gridHtml += '<div class="pytha-cell pytha-cell--target">?</div>';
            } else {
                gridHtml += `<div class="pytha-cell">${r * c}</div>`;
            }
        }
    }
    gridHtml += '</div>';

    // Choix de réponses : le bon résultat + des distracteurs pris dans la même colonne
    let choices = [product];
    while (choices.length < 4) {
        const fakeRow = Math.floor(Math.random() * 10) + 1;
        const fake = fakeRow * col;
        if (!choices.includes(fake)) choices.push(fake);
    }
    choices = choices.sort(() => Math.random() - 0.5);

    let choicesHtml = '<div class="bubble-container">';
    choices.forEach(c => { choicesHtml += `<div class="bubble" data-val="${c}">${c}</div>`; });
    choicesHtml += '</div>';

    canvas.innerHTML = `
        <div class="game-question pytha-question">Ligne ${row} × Colonne ${col} = ?</div>
        ${gridHtml}
        ${choicesHtml}
    `;

    if (isDemo) {
        regTimeout(() => {
            const el = canvas.querySelector(`.bubble[data-val="${product}"]`);
            if (el) {
                el.classList.add('demo-target');
                regTimeout(() => { enginePythagore(canvas, true, params); }, 800);
            }
        }, 2000);
    } else {
        canvas.querySelectorAll('.bubble').forEach(b => {
            b.onclick = () => {
                const userVal = parseInt(b.dataset.val);
                if (userVal === product) {
                    b.style.backgroundColor = "#dcfce7";
                    state.celebrate(b, 10);
                    regTimeout(() => { enginePythagore(canvas, false, params); }, 1500);
                } else {
                    b.style.background = "var(--danger)";
                    state.showFeedback(`Faux ! ${row} × ${col} = ${product}`);
                    import('../core/errorSchema.js').then(schema => {
                        state.logError(state.activeExo, schema.createErrorSnapshot({
                            input: userVal,
                            expected: product,
                            questionText: `${row} × ${col}`,
                            row, col, product
                        }));
                    });
                }
            };
        });
    }
}
