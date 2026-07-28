// Rendu du retour immédiat en jeu (bonne réponse, erreur, indice).
//
// Les corrections et les indices ne disparaissent plus au bout d'un délai :
// ils attendent que l'élève ferme. Un temps d'affichage fixe est toujours
// faux — trop court pour qui lit lentement ou réfléchit, trop long pour qui a
// déjà compris — et surtout il apprend à attendre plutôt qu'à lire.
//
// L'émetteur reçoit une promesse résolue à la fermeture, ce qui permet à
// l'activité d'attendre avant d'enchaîner. Le contrat passe par l'événement
// `game_feedback` : `detail.dismiss()` est appelé à la fermeture, et
// `detail.handled` signale qu'un rendu a bien pris la main (sinon l'émetteur
// résout immédiatement — cas des tests et de l'aperçu).

const SUCCESS_MESSAGES = ['Bonne réponse !', 'Bravo !', 'Exact !', 'Parfait !'];

const ICON_OK = `<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_KO = `<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
const ICON_HINT = `<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`;

let current = null;

export function initGameFeedbackUI() {
    document.addEventListener('game_feedback', (e) => {
        const d = e.detail || {};
        const done = typeof d.dismiss === 'function' ? d.dismiss : () => { };

        if (d.kind === 'success') {
            d.handled = true;
            showSuccess(d, done);
            return;
        }

        const isError = d.isError || d.kind === 'error';
        const isHint = d.kind === 'hint';
        if (!isError && !isHint) return;   // message neutre : rien à bloquer

        d.handled = true;
        // Un jeu en temps réel (arcade autonome) ne peut pas s'arrêter à
        // chaque erreur : il garde l'affichage éphémère.
        if (d.blocking === false) showTransient(d, done, isHint);
        else showDismissable(d, done, isHint);
    });
}

// --- Réussite : brève, sans action requise ----------------------------------

function showSuccess(d, done) {
    const msg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
    const points = d.points
        ? `<div class="fb-points">+${d.points} points</div>` : '';

    const card = build(`
        <div class="fb-icon fb-icon--ok">${ICON_OK}</div>
        <div class="fb-title">${msg}</div>${points}`, 'fb-card--ok');

    if (d.element) {
        d.element.style.transform = 'scale(1.1)';
        setTimeout(() => { d.element.style.transform = ''; }, 200);
    }
    setTimeout(() => { close(card); done(); }, 1100);
}

// --- Erreur ou indice : attend la fermeture ---------------------------------

function showDismissable(d, done, isHint) {
    const label = isHint ? 'Indice' : 'Ce n\'est pas ça';
    const detail = d.misconception && d.misconception !== d.msg
        ? `<div class="fb-detail">${escapeHtml(d.misconception)}</div>` : '';

    const card = build(`
        <div class="fb-icon ${isHint ? 'fb-icon--hint' : 'fb-icon--ko'}">${isHint ? ICON_HINT : ICON_KO}</div>
        <div class="fb-label">${label}</div>
        <div class="fb-message">${escapeHtml(d.msg || '')}</div>
        ${detail}
        <button type="button" class="fb-close">${isHint ? 'Merci !' : 'J\'ai compris'}</button>`,
        isHint ? 'fb-card--hint' : 'fb-card--ko', true);

    const finish = () => { close(card); done(); };

    const btn = card.querySelector('.fb-close');
    btn.onclick = finish;
    // Entrée, Espace et Échap ferment aussi : l'élève au clavier ne doit pas
    // avoir à viser un bouton pour continuer.
    card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); }
    };
    btn.focus({ preventScroll: true });
}

// --- Variante éphémère, pour les jeux en temps réel -------------------------

function showTransient(d, done, isHint) {
    const card = build(`
        <div class="fb-icon ${isHint ? 'fb-icon--hint' : 'fb-icon--ko'}">${isHint ? ICON_HINT : ICON_KO}</div>
        <div class="fb-message">${escapeHtml(d.msg || '')}</div>`,
        isHint ? 'fb-card--hint' : 'fb-card--ko');
    setTimeout(() => { close(card); done(); }, 2200);
}

// --- Fabrique ---------------------------------------------------------------

function build(html, variant, blocking = false) {
    // Une seule carte à la fois : deux corrections superposées seraient
    // illisibles, et la seconde masquerait la première.
    if (current) close(current);

    // Ancré au plateau et non à la couche entière : le voile ne doit pas
    // couvrir l'en-tête, sinon l'élève ne peut plus fermer l'exercice ni
    // consulter la consigne tant qu'une correction est affichée.
    const host = document.querySelector('#game-layer .canvas-area')
        || document.getElementById('game-layer') || document.body;
    const card = document.createElement('div');
    card.className = `fb-card ${variant}${blocking ? ' fb-card--blocking' : ''}`;
    card.setAttribute('role', blocking ? 'alertdialog' : 'status');
    card.setAttribute('aria-live', 'assertive');
    if (blocking) card.tabIndex = -1;
    card.innerHTML = html;

    if (blocking) {
        const veil = document.createElement('div');
        veil.className = 'fb-veil';
        host.appendChild(veil);
        card._veil = veil;
    }

    host.appendChild(card);
    current = card;
    return card;
}

function close(card) {
    if (!card || card._closing) return;
    card._closing = true;
    if (current === card) current = null;
    card.classList.add('fb-card--leaving');
    if (card._veil) card._veil.classList.add('fb-veil--leaving');
    setTimeout(() => {
        card.remove();
        if (card._veil) card._veil.remove();
    }, 200);
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
