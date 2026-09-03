// LA BARRE DE PASSE — l'outil d'auteur qui ne prend pas l'écran.
//
// Rémy : « on a beaucoup d'interface de debug, qu'en penses-tu ? » puis, la
// réponse donnée : « oui, mais garder les mini-barres c'est bien aussi, je te
// laisse faire au mieux pour le debug ».
//
// IL A RAISON SUR LES DEUX POINTS, ET CE FICHIER EST LA CONSÉQUENCE DU SECOND.
// Trois écrans d'auteur se recouvraient — le banc d'essai, la revue,
// l'Atelier —, et chacun s'ouvrait EN GRAND par-dessus l'application : pour
// noter une remarque sur l'exercice qu'on regardait, il fallait le quitter. La
// barre, elle, se pose SUR le jeu qui tourne : on joue, on écrit, on avance,
// sans jamais sortir. C'est ce qui la rend utilisable pendant une passe de cent
// cinquante exercices, et c'est ce que les écrans ne savent pas faire.
//
// ELLE ÉCRIT DANS LE CARNET DE LA REVUE, ET C'EST LE CHANGEMENT DE FOND.
//
// Il y avait DEUX carnets pour la même chose : celui du banc d'essai — six
// verdicts par exercice, un rapport de trois pages — et celui de la revue —
// une décision binaire, une remarque, une consigne d'une ligne. On écrivait
// dans l'un, on relisait dans l'autre, et rien ne les reliait. Quatre des six
// critères du banc sont d'ailleurs MESURÉS depuis : le Contrôle mesure les
// débordements sur trois écrans, le Pilote joue l'exercice jusqu'au bout,
// l'audit vérifie que la feuille se garnit. Cocher à la main ce que la machine
// mesure, c'est du travail qu'on se donne.
//
// Reste ce qu'aucune machine ne rend : « il y a quelque chose à voir ici ». La
// barre écrit donc CETTE phrase-là, dans le carnet de la revue, à côté des
// décisions — un seul carnet, une seule consigne à recoller.

import { exercices } from '../data/catalog.js';
import { placer, restaurer, rendreDeplacable, isolerClavier } from './flottant.js';
import {
    lireRevue, nouvelleRevue, ficheDe, decider, versMarkdown, jourISO
} from '../core/revue.js';

const CLE_REVUE = 'mathbox-revue';
const CLE_RANG = 'mathbox-passe-rang';
const CLE_POS = 'mathbox-banc-barre-pos';

let barre = null;
let revue = null;
let debrancherGlisse = null;
let rangCourant = 0;
let minuteurNote = null;

/** L'ordre de la barre : le catalogue entier, dans son ordre à lui. */
const listeBarre = () => exercices;
const exoCourant = () => listeBarre()[rangCourant];

/** La version affichée par la page — elle voyage avec la consigne. */
function versionChargee() {
    const el = document.getElementById('db-version');
    if (el && el.textContent) return el.textContent.trim();
    const lien = document.querySelector('link[href*="?v="]');
    const m = lien && lien.getAttribute('href').match(/\?v=([\w.-]+)/);
    return m ? `v${m[1]}` : '';
}

function charger() {
    let garde = null;
    try { garde = lireRevue(window.localStorage.getItem(CLE_REVUE)); } catch (e) { garde = null; }
    revue = garde || nouvelleRevue({ date: Date.now() });
    revue.version = versionChargee();
}

function garder() {
    try { window.localStorage.setItem(CLE_REVUE, JSON.stringify(revue)); } catch (e) { /* privé */ }
}

export function basculerBarrePasse() {
    if (barre) { fermerBarre(); return; }
    charger();
    ouvrirBarre();
}

/** Ouverte ? La palette d'auteur s'en sert pour allumer son bouton. */
export const barreOuverte = () => !!barre;

function fermerBarre() {
    ecrireNote(true);
    // La fenêtre d'aperçu appartient à la barre : elle s'en va avec elle.
    apercuFlottant = false;
    fermerApercuFlottant();
    if (debrancherGlisse) { debrancherGlisse(); debrancherGlisse = null; }
    if (barre) barre.remove();
    barre = null;
}

function ouvrirBarre() {
    const suite = listeBarre();
    if (!suite.length) return;
    let repris = 0;
    try { repris = Number(window.localStorage.getItem(CLE_RANG)) || 0; } catch (e) { repris = 0; }
    rangCourant = Math.max(0, Math.min(suite.length - 1, repris));

    barre = document.createElement('div');
    barre.id = 'banc-barre';
    barre.setAttribute('role', 'toolbar');
    barre.setAttribute('aria-label', 'Barre de passe');
    barre.innerHTML = `
        <button type="button" class="bb-grip" data-grip title="Déplacer la barre"
            aria-label="Déplacer la barre de passe">⠿</button>
        <button type="button" class="bb-btn" data-prec title="Exercice précédent"
            aria-label="Exercice précédent">◀</button>
        <button type="button" class="bb-titre" data-jouer
            title="Rejouer cet exercice"><span data-nom></span><b data-compte></b></button>
        <button type="button" class="bb-btn" data-suiv title="Exercice suivant"
            aria-label="Exercice suivant">▶</button>
        <button type="button" class="bb-btn" data-fiche title="Voir la fiche à imprimer"
            aria-label="Voir la fiche à imprimer">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 9V3h12v6"/><rect x="3.5" y="9" width="17" height="7" rx="2"/>
                <path d="M6 16h12v5H6z"/></svg></button>
        <!-- L'ATELIER SUR CET EXERCICE-CI. C'est le pont qui manquait : la
             barre dit « il y a quelque chose à voir », l'Atelier montre quoi —
             le jeu, la feuille et le robot côte à côte, sur le même exercice,
             sans avoir à le retrouver dans une liste de cent cinquante-deux. -->
        <button type="button" class="bb-btn" data-atelier title="Ouvrir l'Atelier sur cet exercice"
            aria-label="Ouvrir l'Atelier sur cet exercice">⚒</button>
        <textarea class="bb-note" data-note rows="1" maxlength="2000"
            placeholder="Une remarque sur cet exercice…"
            aria-label="Remarque sur cet exercice"></textarea>
        <span class="bb-etat" data-etat aria-live="polite"></span>
        <button type="button" class="bb-btn" data-export title="Télécharger le bilan de la revue"
            aria-label="Télécharger le bilan de la revue">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/>
                <path d="M4 20h16"/></svg></button>
        <button type="button" class="bb-btn bb-btn--fermer" data-fermer title="Fermer la barre"
            aria-label="Fermer la barre">✕</button>`;
    document.body.appendChild(barre);

    // ELLE SE DÉPLACE, ET ELLE RETIENT SA PLACE. Posée en bas sur toute la
    // largeur, elle recouvrait le pavé de réponse d'un jeu sur trois.
    restaurer(barre, CLE_POS, (el) => placer(el,
        (window.innerWidth - el.offsetWidth) / 2, window.innerHeight));
    debrancherGlisse = rendreDeplacable(barre, barre.querySelector('[data-grip]'), CLE_POS);
    // ON PEUT ÉCRIRE DEDANS MÊME AU-DESSUS D'UN JEU. Sans cela, les écouteurs
    // clavier du jeu qui tourne dessous mangent les touches — et certaines
    // lettres ne s'écrivaient tout bonnement pas.
    isolerClavier(barre);

    barre.querySelector('[data-prec]').onclick = () => aller(-1);
    barre.querySelector('[data-suiv]').onclick = () => aller(1);
    barre.querySelector('[data-jouer]').onclick = () => lancerCourant();
    barre.querySelector('[data-fiche]').onclick = () => basculerApercuFlottant();
    barre.querySelector('[data-atelier]').onclick = () => ouvrirAtelierIci();
    majBoutonFiche();
    barre.querySelector('[data-export]').onclick = () => telechargerBilan();
    barre.querySelector('[data-fermer]').onclick = () => fermerBarre();

    const champ = barre.querySelector('[data-note]');
    // ON N'ATTEND PAS LA VALIDATION : il n'y en a pas. Un demi-battement après
    // la dernière frappe, la remarque est dans le carnet.
    champ.oninput = () => {
        clearTimeout(minuteurNote);
        marquerEtat('…');
        minuteurNote = setTimeout(() => ecrireNote(), 500);
    };
    champ.onblur = () => ecrireNote(true);

    peindreBarre();
}

/** On change d'exercice — la remarque en cours part au carnet AVANT. */
function aller(pas) {
    ecrireNote(true);
    const suite = listeBarre();
    rangCourant = (rangCourant + pas + suite.length) % suite.length;
    try { window.localStorage.setItem(CLE_RANG, String(rangCourant)); } catch (e) { /* privé */ }
    peindreBarre();
    suivreApercuFlottant();
    lancerCourant();
}

/**
 * On lance l'exercice comme un élève le lancerait — mais sans quitter la
 * barre : ici on ne revient sur aucune fiche de notation, on reste dedans.
 */
function lancerCourant() {
    const exo = exoCourant();
    if (!exo) return;
    import('../games/engine.js').then(m => {
        m.openGameLayer({ ...exo, internalStudentConfig: true, params: { ...(exo.params || {}) } });
    });
}

/** L'Atelier, ouvert sur l'exercice de la barre. */
function ouvrirAtelierIci() {
    const exo = exoCourant();
    if (!exo) return;
    ecrireNote(true);
    import('./atelier.js').then(m => m.ouvrirAtelier(exo.id));
}

function telechargerBilan() {
    const texte = versMarkdown(revue, exercices,
        { titre: `Revue du catalogue — ${revue.version || '?'}` });
    const blob = new Blob([texte], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `revue-${jourISO()}.md`;
    a.click();
}

function peindreBarre() {
    if (!barre) return;
    const suite = listeBarre();
    const exo = suite[rangCourant];
    barre.querySelector('[data-nom]').textContent = exo.title;
    barre.querySelector('[data-compte]').textContent = `${rangCourant + 1} / ${suite.length}`;
    const f = ficheDe(revue, exo.id);
    barre.querySelector('[data-note]').value = (f && f.remarque) || '';
    marquerEtat(f && f.remarque ? '✓' : '');
}

function marquerEtat(texte) {
    const e = barre && barre.querySelector('[data-etat]');
    if (e) e.textContent = texte;
}

/**
 * La remarque dans le carnet de la revue, SANS toucher aux décisions.
 *
 * Une remarque n'est pas une décision : elle dit qu'il y a quelque chose à
 * voir, pas que l'exercice est validé ni que c'est un jeu. `decider` ne touche
 * que ce qu'on lui donne — c'est sa règle depuis le premier jour, et c'est ce
 * qui permet d'écrire ici sans effacer ce qu'on a coché là-bas.
 */
function ecrireNote(immediat) {
    if (!barre) return;
    clearTimeout(minuteurNote);
    const exo = exoCourant();
    const champ = barre.querySelector('[data-note]');
    if (!exo || !champ) return;
    const texte = champ.value.trim();
    const f = ficheDe(revue, exo.id);
    if ((f ? f.remarque || '' : '') === texte) { if (immediat) marquerEtat(texte ? '✓' : ''); return; }
    // Rien à dire ET rien de noté : on n'ouvre pas une ligne pour du vide.
    if (!texte && !f) return;
    revue = decider(revue, exo.id, { remarque: texte });
    garder();
    marquerEtat(texte ? '✓' : '');
}

// --- L'APERÇU QUI RESTE OUVERT ----------------------------------------------
//
// Regarder cent fiches à la suite, c'était cent fois : ouvrir la modale, la
// lire, la refermer, avancer d'un exercice, rouvrir. La fiche reste donc
// OUVERTE et c'est ELLE qui suit : à chaque ◀ ▶, elle se redessine sur
// l'exercice qu'on regarde.
//
// Elle reste une MODALE — Rémy : « quand la barre de début test, la modale
// d'impression doit être comme avant en prenant une partie de l'écran ». Ce
// qui la rendait incompatible avec une passe, c'est qu'elle capture les clics ;
// c'est donc la BARRE qui passe par-dessus (voir son z-index), et la fiche
// n'a rien à changer à ce qu'elle est.
//
// Un exercice sans fiche papier ne la vide pas d'un message d'erreur : elle se
// referme, et se rouvrira au prochain exercice qui en a une. Un avertissement
// répété tous les trois exercices pendant une passe n'est plus un
// avertissement, c'est du bruit.

const IDS_FICHE = ['print-sheet-modal', 'print-questions-modal'];
let apercuFlottant = false;

function fermerApercuFlottant() {
    IDS_FICHE.forEach(i => {
        const m = document.getElementById(i);
        if (m) m.style.display = 'none';
    });
}

/** L'aperçu papier de cet exercice-ci, quand il en a un. */
function apercuFiche(id) {
    const exo = exercices.find(e => e.id === id);
    if (!exo) return;
    import('./printSheet.js').then(m => {
        import('../core/registry.js').then(({ aUneFichePapier }) => {
            if (!aUneFichePapier(exo)) { fermerApercuFlottant(); return; }
            m.ouvrirFicheModal(exo, { ...(exo.params || {}) }, null, { flottant: true });
        });
    });
}

/**
 * Ouvrir ou refermer l'aperçu qui accompagne la passe.
 *
 * L'état est PORTÉ PAR LE BOUTON de la barre, allumé tant que la fenêtre
 * suit. Sans ce témoin, un aperçu qui revient tout seul au troisième exercice
 * passe pour un bug — alors que c'est précisément ce qu'on a demandé.
 */
function basculerApercuFlottant() {
    apercuFlottant = !apercuFlottant;
    if (!apercuFlottant) fermerApercuFlottant();
    else apercuFiche(exoCourant().id);
    majBoutonFiche();
}

/** À chaque changement d'exercice, la fiche suit — tant qu'on le lui demande. */
function suivreApercuFlottant() {
    if (apercuFlottant) apercuFiche(exoCourant().id);
}

function majBoutonFiche() {
    const b = barre && barre.querySelector('[data-fiche]');
    if (!b) return;
    b.classList.toggle('bb-btn--actif', apercuFlottant);
    b.setAttribute('aria-pressed', String(apercuFlottant));
    b.title = apercuFlottant
        ? 'L\'aperçu suit les exercices — appuie pour l\'arrêter'
        : 'Garder l\'aperçu de la fiche à côté, d\'un exercice à l\'autre';
}
