// Célébration des médailles.
//
// Une modale par badge était tenable tant qu'ils tombaient un par un. Avec
// quatre paliers dans chaque famille, une bonne séance en décroche parfois
// cinq d'un coup — et cinq modales empilées, ce n'est plus une récompense,
// c'est un péage. On REGROUPE donc ce qui arrive dans la même seconde en une
// seule annonce.

import { badgesCatalog } from '../core/gamification.js';
import { showModal } from './modal.js';

const attente = [];
let minuteur = null;

export function initGamificationUI() {
    document.addEventListener('badge_unlocked', (e) => {
        const def = badgesCatalog[e.detail];
        if (!def) return;
        attente.push(def);
        clearTimeout(minuteur);
        minuteur = setTimeout(annoncer, 260);
    });
}

function annoncer() {
    const lot = attente.splice(0, attente.length);
    if (!lot.length) return;

    confettis();

    const pluriel = lot.length > 1;
    const cartes = lot.map(b => `
        <div class="badge-won${b.medal ? ` badge-won--${b.medal}` : ''}">
            <div class="badge-won-icon">${b.icon}</div>
            <div>
                <div class="badge-won-title">${echapper(b.title)}</div>
                <div class="badge-won-desc">${echapper(b.description)}</div>
            </div>
        </div>`).join('');

    const contenu = `
        <div class="badge-modal">
            <h2 class="badge-modal-titre">${pluriel ? `${lot.length} récompenses débloquées !` : 'Badge débloqué !'}</h2>
            <div class="badge-won-list">${cartes}</div>
            <button class="badge-ok-btn">Super !</button>
        </div>`;

    const modal = showModal('', contenu, { width: '460px' });
    const ok = modal.element.querySelector('.badge-ok-btn');
    if (ok) ok.onclick = () => modal.close();
}

function confettis() {
    if (typeof confetti === 'undefined') return;
    const fin = Date.now() + 2200;
    (function image() {
        const couleurs = ['#3b82f6', '#10b981', '#f59e0b'];
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: couleurs });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: couleurs });
        if (Date.now() < fin) requestAnimationFrame(image);
    }());
}

function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
