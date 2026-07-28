// Bilan de fin de parcours.
//
// Volontairement organisé dans l'ordre où l'information est utile :
//   1. la note (si le parcours est noté) ou le taux de réussite,
//   2. le bilan par compétence — ce qui est acquis, ce qui ne l'est pas,
//   3. les questions ratées avec leur diagnostic, et de quoi les rejouer.
//
// L'ancien écran de fin affichait « Erreurs totales : 3 ». Ce n'est pas une
// information exploitable, ni pour l'élève ni pour le professeur.

import { appreciation } from '../core/grading.js';

export function showRunReport(bilan, { onClose } = {}) {
    document.getElementById('run-report-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'run-report-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="glass-panel modal-panel-md report-panel">${reportHtml(bilan)}
        <div class="modal-actions-center">
            <button id="btn-report-close" class="btn-toggle glass-btn primary active report-close-btn">Terminer</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('btn-report-close').onclick = () => {
        modal.remove();
        if (onClose) onClose();
    };

    wireReplay(modal, bilan);
    return modal;
}

/** Rendu réutilisable (fin de parcours, profil élève, tableau de bord prof). */
export function reportHtml(bilan, { compact = false } = {}) {
    const pct = Math.round(bilan.ratioPondere * 100);

    const noteBlock = bilan.note !== null
        ? `<div class="report-note">
               <div class="report-note-value">${formatNote(bilan.note)}<span class="report-note-scale">/${bilan.sur}</span></div>
               <div class="report-note-label">${labelForRule(bilan.regle)}</div>
           </div>`
        : `<div class="report-note report-note--nograde">
               <div class="report-note-value">${pct}<span class="report-note-scale">%</span></div>
               <div class="report-note-label">de réussite</div>
           </div>`;

    const stats = `
        <div class="report-stats">
            ${statTile('Questions', bilan.totalQuestions)}
            ${statTile('Réussies', bilan.totalReussies)}
            ${statTile('Du 1<sup>er</sup> coup', bilan.premierEssai)}
            ${statTile('Temps', formatDuration(bilan.tempsTotal))}
        </div>`;

    const calcul = (bilan.calcul && (bilan.afficherCalcul || compact === 'teacher'))
        ? calculHtml(bilan.calcul) : '';

    const competences = bilan.parCompetence.length ? `
        <h4 class="report-section-title">Bilan par compétence</h4>
        <ul class="report-skill-list">
            ${bilan.parCompetence.map(c => {
        const p = Math.round(c.taux * 100);
        return `<li class="report-skill">
                    <div class="report-skill-head">
                        <span class="report-skill-label">${escapeHtml(c.label)}</span>
                        <span class="report-skill-level" style="color:${c.niveau.color}">${c.niveau.label}</span>
                    </div>
                    <div class="report-skill-bar"><div style="width:${p}%; background:${c.niveau.color}"></div></div>
                    <div class="report-skill-sub">${c.reussies}/${c.questions} question${c.questions > 1 ? 's' : ''}</div>
                </li>`;
    }).join('')}
        </ul>` : '';

    const rates = bilan.aRetravailler.filter(q => !q.resolue);
    const retravailler = (!compact && rates.length) ? `
        <h4 class="report-section-title">À retravailler</h4>
        <ul class="report-miss-list">
            ${rates.slice(0, 8).map(q => `
                <li class="report-miss">
                    <div class="report-miss-q">${escapeHtml(q.questionText)}</div>
                    <div class="report-miss-a">Ta réponse : <b>${escapeHtml(q.donne)}</b> — attendu : <b>${escapeHtml(q.attendu)}</b></div>
                    ${q.diagnostic ? `<div class="report-miss-why">${escapeHtml(q.diagnostic)}</div>` : ''}
                </li>`).join('')}
        </ul>
        <button class="btn-toggle glass-btn report-replay-btn" data-replay>Rejouer ces questions</button>` : '';

    return `
        <h2 class="report-title">${bilan.mode === 'evaluation' ? 'Évaluation terminée' : 'Parcours terminé'}</h2>
        ${bilan.pathName ? `<p class="report-subtitle">${escapeHtml(bilan.pathName)}</p>` : ''}
        ${noteBlock}
        <p class="report-appreciation">${appreciation(bilan)}</p>
        ${calcul}
        ${stats}
        ${competences}
        ${retravailler}`;
}

/**
 * Détail du calcul de la note. Replié par défaut : disponible pour qui veut
 * comprendre, sans transformer le bilan en feuille de calcul.
 */
function calculHtml(c) {
    const penalites = c.penalites
        ? `<li>Chaque essai supplémentaire retire ${nb(c.penalites.retry ?? 0)} point,
             chaque indice ${nb(c.penalites.hint ?? 0)} point.</li>`
        : '';

    const tableau = c.pluriEtapes ? `
        <table class="calcul-table">
            <thead><tr><th>Activité</th><th>Points</th><th>sur</th><th>Poids</th><th>Compte pour</th></tr></thead>
            <tbody>
                ${c.lignes.map(l => `<tr>
                    <td>${escapeHtml(l.titre)}</td>
                    <td>${nb(l.credit)}</td>
                    <td>${l.questions}</td>
                    <td>×${l.poids}</td>
                    <td>${nb(l.contribution)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot><tr><td colspan="3">Total</td><td>${c.totalPoids}</td><td>${nb(c.sommeContributions)}</td></tr></tfoot>
        </table>` : `
        <p class="calcul-simple">
            ${c.lignes[0] ? `${nb(c.lignes[0].credit)} point${c.lignes[0].credit > 1 ? 's' : ''} obtenu${c.lignes[0].credit > 1 ? 's' : ''}
            sur ${c.lignes[0].questions} question${c.lignes[0].questions > 1 ? 's' : ''}.` : ''}
        </p>`;

    // Les formules sont recomposées ici à partir des nombres du bilan, pour
    // les écrire avec la virgule décimale française.
    const etape1 = c.pluriEtapes
        ? `${nb(c.sommeContributions)} ÷ ${c.totalPoids} = ${nb(c.ratioPondere)} &nbsp;(soit ${c.pourcentage} %)`
        : `${nb(c.ratioPondere)} de réussite&nbsp;(soit ${c.pourcentage} %)`;

    return `
    <details class="calcul-box">
        <summary class="calcul-summary">Comment cette note est calculée</summary>
        <div class="calcul-body">
            <ul class="calcul-regles">
                <li>${escapeHtml(c.regleLabel).replace(/(\d+[.,]\d+)/g, m => nb(parseFloat(m.replace(',', '.'))))}</li>
                ${penalites}
                ${c.pluriEtapes ? '<li>Chaque activité compte selon son poids dans le barème.</li>' : ''}
            </ul>
            ${tableau}
            <div class="calcul-formule">
                <div class="calcul-etape">${etape1}</div>
                <div class="calcul-etape">${nb(c.ratioPondere)} × ${c.sur} = ${nb(c.ratioPondere * c.sur)}</div>
                <div class="calcul-etape calcul-etape--final">
                    arrondi au ${c.arrondi === 0.5 ? 'demi-point' : `pas de ${nb(c.arrondi)}`} → ${nb(c.note)} / ${c.sur}
                </div>
            </div>
        </div>
    </details>`;
}

/** Nombre à la française : virgule décimale, pas de zéro inutile. */
function nb(value) {
    const n = Math.round(Number(value) * 100) / 100;
    return String(n).replace('.', ',');
}

// Relancer directement les questions ratées : la correction ne sert que si on
// la remet en pratique. Les graines sont conservées, donc ce sont exactement
// les mêmes questions.
function wireReplay(root, bilan) {
    const btn = root.querySelector('[data-replay]');
    if (!btn) return;
    btn.onclick = async () => {
        const { startRemediation } = await import('../core/remediation.js');
        root.remove();
        startRemediation(bilan.aRetravailler.filter(q => !q.resolue));
    };
}

function statTile(label, value) {
    return `<div class="report-stat"><div class="report-stat-value">${value}</div><div class="report-stat-label">${label}</div></div>`;
}

function labelForRule(rule) {
    if (rule === 'ratio') return 'questions résolues';
    if (rule === 'ponderee') return 'avec pénalités essais / aides';
    return 'réussite du premier coup';
}

function formatNote(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

export function formatDuration(seconds) {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return m > 0 ? `${m} min ${s.toString().padStart(2, '0')}` : `${s}s`;
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
