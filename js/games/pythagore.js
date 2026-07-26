import { renderChoiceQuestion } from '../core/choiceGame.js';

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
    let vals = [product];
    while (vals.length < 4) {
        const fakeRow = Math.floor(Math.random() * 10) + 1;
        const fake = fakeRow * col;
        if (!vals.includes(fake)) vals.push(fake);
    }
    vals = vals.sort(() => Math.random() - 0.5);
    const choices = vals.map(v => ({ val: v, label: v, correct: v === product }));

    renderChoiceQuestion(canvas, {
        isDemo,
        questionHtml: `<div class="game-question pytha-question">Ligne ${row} × Colonne ${col} = ?</div>`,
        extraHtml: gridHtml,
        choices,
        itemClass: 'bubble',
        containerClass: 'bubble-container',
        questionText: `${row} × ${col}`,
        errorContext: { row, col, product },
        replay: (nextIsDemo) => enginePythagore(canvas, nextIsDemo, params)
    });
}
