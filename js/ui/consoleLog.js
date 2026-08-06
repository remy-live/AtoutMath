// Journal de console embarqué.
//
// Sur un téléphone, il n'y a pas de console : quand quelque chose casse, on ne
// dispose que d'une capture d'écran et d'un souvenir. Ce module garde en
// mémoire tout ce qui passe par `console` et toutes les erreurs non
// rattrapées, puis les rend copiables en un bouton — de quoi transmettre un
// rapport exact plutôt qu'une impression.
//
// Deux précautions :
//   - la capture est installée AVANT le reste de l'application, sinon les
//     erreurs de démarrage — les plus intéressantes — passent à côté ;
//   - le tampon est borné : un jeu qui journalise à chaque image ne doit pas
//     faire gonfler la mémoire d'un vieil iPad.

import { state } from '../core/state.js';

const MAX = 400;
const lignes = [];
let installe = false;

function pousser(niveau, args) {
    lignes.push({
        t: Date.now(),
        niveau,
        texte: args.map(formater).join(' ').slice(0, 800)
    });
    if (lignes.length > MAX) lignes.splice(0, lignes.length - MAX);
}

function formater(v) {
    if (v instanceof Error) return `${v.name}: ${v.message}\n${(v.stack || '').split('\n').slice(1, 4).join('\n')}`;
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
}

export function initConsoleCapture() {
    if (installe) return;
    installe = true;

    ['log', 'info', 'warn', 'error', 'debug'].forEach(niveau => {
        const original = console[niveau] ? console[niveau].bind(console) : null;
        console[niveau] = (...args) => {
            pousser(niveau, args);
            if (original) original(...args);
        };
    });

    window.addEventListener('error', (e) => {
        pousser('error', [`${e.message} — ${e.filename || '?'}:${e.lineno || 0}`]);
    });
    window.addEventListener('unhandledrejection', (e) => {
        pousser('error', ['Promesse rejetée :', e.reason]);
    });

    pousser('info', ['— capture de console démarrée —']);
}

export function journalConsole() {
    return lignes.slice();
}

/**
 * Un rapport complet, prêt à être collé dans un message.
 *
 * SYNCHRONE, et c'est important : la première version chargeait `state.js` en
 * import dynamique avant d'ouvrir la fenêtre. Sur téléphone, l'ouverture
 * traînait d'une demi-seconde sans rien afficher, et l'appui semblait perdu.
 */
export function rapportTexte() {
    const entete = [];
    entete.push(`MathBox — rapport de console`);
    entete.push(`Date       : ${new Date().toISOString()}`);
    entete.push(`Version CSS: ${versionChargee()}`);
    entete.push(`URL        : ${location.href}`);
    entete.push(`Écran      : ${window.innerWidth}×${window.innerHeight} (dpr ${window.devicePixelRatio})`);
    entete.push(`Navigateur : ${navigator.userAgent}`);
    entete.push(`En ligne   : ${navigator.onLine ? 'oui' : 'non'}`);

    try {
        entete.push(`Profil     : score ${state.score}, ${state.correctCount} bonnes réponses,`
            + ` ${state.errorHistory.length} erreurs au carnet`);
        const exo = state.activeExo;
        entete.push(`Exercice   : ${exo ? `${exo.id} — ${exo.title}` : '(aucun)'}`);
    } catch (e) { entete.push(`Profil     : illisible (${e.message})`); }

    const corps = lignes.map(l => {
        const h = new Date(l.t).toLocaleTimeString('fr-FR', { hour12: false });
        return `${h} [${l.niveau}] ${l.texte}`;
    });

    return entete.join('\n') + '\n\n--- journal (' + corps.length + ' lignes) ---\n' + corps.join('\n');
}

/** Le numéro de version RÉELLEMENT chargé, lu sur l'URL d'une feuille de style. */
function versionChargee() {
    const lien = [...document.querySelectorAll('link[rel=stylesheet]')]
        .map(l => (l.getAttribute('href') || '').match(/[?&]v=(\d+)/))
        .find(Boolean);
    return lien ? `v${lien[1]}` : 'inconnue';
}

/**
 * La fenêtre de console : un panneau à elle, pas la modale générique.
 *
 * La modale commune était inutilisable au doigt : sa croix de fermeture fait
 * quelques pixels dans un coin, son fond flouté coûte cher à l'affichage sur
 * iPhone, et le clic « à côté pour fermer » ne se déclenchait pas de manière
 * fiable au-dessus d'une zone de texte. Ici, la fermeture a TROIS entrées —
 * un grand bouton en bas, une croix confortable en haut, la touche Échap — et
 * le panneau occupe tout l'écran sur téléphone. Une console dont on ne sort
 * pas est pire que pas de console du tout.
 */
export function openConsoleModal() {
    fermerConsole();

    const erreurs = lignes.filter(l => l.niveau === 'error').length;
    const fond = document.createElement('div');
    fond.className = 'console-fond';
    fond.innerHTML = `
        <div class="console-panneau" role="dialog" aria-label="Console">
            <div class="console-entete">
                <span class="console-pastille ${erreurs ? 'console-pastille--ko' : 'console-pastille--ok'}">
                    ${erreurs ? `${erreurs} erreur${erreurs > 1 ? 's' : ''}` : 'aucune erreur'}
                </span>
                <span class="console-lignes">${lignes.length} lignes</span>
                <button type="button" class="console-croix" data-fermer aria-label="Fermer">✕</button>
            </div>
            <textarea class="console-zone" readonly spellcheck="false"></textarea>
            <div class="console-actions">
                <button type="button" class="console-btn" data-copier>📋 Copier</button>
                <button type="button" class="console-btn" data-vider>🗑 Vider</button>
                <button type="button" class="console-btn console-btn--primaire" data-fermer>Fermer</button>
            </div>
        </div>`;
    document.body.appendChild(fond);

    const zone = fond.querySelector('.console-zone');
    zone.value = rapportTexte();

    const fermer = () => {
        document.removeEventListener('keydown', surTouche, true);
        fond.remove();
    };
    const surTouche = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
    document.addEventListener('keydown', surTouche, true);

    fond.querySelectorAll('[data-fermer]').forEach(b => { b.onclick = fermer; });
    // Toucher le fond ferme aussi, mais seulement le FOND lui-même : un appui
    // qui commence dans le panneau ne doit pas fermer en glissant dehors.
    fond.addEventListener('pointerdown', (e) => { if (e.target === fond) fermer(); });

    fond.querySelector('[data-copier]').onclick = async (e) => {
        const btn = e.currentTarget;
        let ok = false;
        try {
            await navigator.clipboard.writeText(zone.value);
            ok = true;
        } catch (err) {
            // Sur téléphone hors HTTPS, l'API presse-papier est refusée : on
            // retombe sur la sélection, que l'utilisateur copie à la main.
            zone.focus(); zone.setSelectionRange(0, zone.value.length);
            try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
        }
        btn.textContent = ok ? '✓ Copié !' : 'Sélectionné — fais « Copier »';
        setTimeout(() => { btn.textContent = '📋 Copier'; }, 2200);
    };
    fond.querySelector('[data-vider]').onclick = () => {
        lignes.length = 0;
        zone.value = '(journal vidé)';
    };
    return { close: fermer, element: fond };
}

export function fermerConsole() {
    document.querySelectorAll('.console-fond').forEach(el => el.remove());
}
