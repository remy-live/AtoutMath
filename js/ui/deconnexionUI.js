// SE DÉCONNECTER — le geste, et les questions qu'il faut poser avant.
//
// Rémy : « Tu sais qu'on ne peut même pas se déconnecter ».
//
// C'était vrai, et c'était un trou complet : le jeton du professeur ne
// s'effaçait que lorsque le SERVEUR le refusait. Un professeur connecté sur
// l'ordinateur de la salle informatique y restait après la sonnerie, avec ses
// classes, sa liste et les codes de ses trente élèves ouverts au suivant.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// UN BOUTON QUI N'APPARAÎT QUE S'IL MÈNE QUELQUE PART.
//
// Proposer « se déconnecter » à quelqu'un qui travaille hors ligne, sans
// classe, est une porte qui ne mène nulle part — et qui inquiète : on se
// demande de quoi on va être déconnecté, et ce qu'on va perdre. Le bouton se
// montre donc quand il y a un rattachement, et il dit de QUOI on se déconnecte.
//
// ET LES DEUX DÉCONNEXIONS NE SE RESSEMBLENT PAS.
//
// Le professeur ne perd rien : ses classes, ses listes et le travail de ses
// élèves vivent sur le serveur. On le lui dit, sans quoi il hésite à cliquer et
// reste connecté sur la machine de la salle.
//
// L'élève, lui, peut perdre du travail — le journal pousse par lots, avec
// quelques secondes de retard. On envoie d'abord, et l'on refuse de partir tant
// qu'il reste quelque chose. S'il est hors ligne et qu'on ne PEUT pas sauver,
// on chiffre la perte et on le laisse décider : l'enfermer serait pire.

import { getActiveProfile } from '../core/profile.js';
import { deconnecterEleve } from '../core/sync.js';
import { jetonProf, nomDuProf, oublierProf } from '../core/verrouProf.js';
import { peutSeDeconnecter, resteAEnvoyer, RIEN_A_PERDRE_PROF } from '../core/deconnexion.js';
import { showModal, showToast } from './modal.js';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** À quoi est-on rattaché, et sous quel nom ? */
export function quiEstLa() {
    const prof = jetonProf();
    if (prof) return { role: 'prof', nom: nomDuProf() };
    const p = getActiveProfile();
    const r = p && p.remote;
    if (r && r.token) {
        return { role: 'eleve', nom: p.name || 'Élève',
            classe: r.className || r.classCode || '' };
    }
    return { role: 'personne', nom: '' };
}

function majBouton() {
    const b = document.getElementById('btn-deconnexion');
    if (!b) return;
    const qui = quiEstLa();
    b.hidden = qui.role === 'personne';
    const mot = document.getElementById('btn-deconnexion-mot');
    if (!mot) return;
    // ON DIT DE QUOI ON SE DÉCONNECTE. « Se déconnecter » tout court laisse la
    // question ouverte sur une machine où le professeur et l'élève passent
    // l'un après l'autre — et c'est exactement la machine où l'on clique.
    mot.textContent = qui.role === 'prof'
        ? 'Quitter le mode professeur'
        : (qui.classe ? `Se déconnecter de ${qui.classe}` : 'Se déconnecter');
}

// ──────────────────────────────────────────────────── LE PROFESSEUR ─────────

function deconnecterLeProf() {
    const corps = `
        <p class="dx-mot">Vous allez quitter le mode professeur sur cet appareil.</p>
        <p class="dx-note">${esc(RIEN_A_PERDRE_PROF)}</p>
        <div class="dx-boutons">
            <button type="button" class="dx-bouton dx-bouton--sortie" data-dx-ok>Quitter</button>
            <button type="button" class="dx-bouton dx-bouton--doux" data-dx-non>Rester</button>
        </div>`;
    const f = showModal('Quitter le mode professeur', corps, { width: '440px' });
    f.element.querySelector('[data-dx-non]').onclick = () => f.close();
    f.element.querySelector('[data-dx-ok]').onclick = async () => {
        f.close();
        oublierProf();
        // On efface AUSSI ce que l'écran garde du mode professeur : la marque
        // sur `<body>` ne disparaît pas parce que le jeton a disparu.
        document.body.classList.remove('teacher-mode');
        document.dispatchEvent(new CustomEvent('prof_deconnecte'));
        showToast('Mode professeur quitté.', 'info');
        majBouton();
        // ON RECHARGE. Une demi-douzaine d'écrans gardent en mémoire des
        // classes, des parcours et une liste d'élèves ; les vider un par un,
        // c'est se donner rendez-vous avec celui qu'on aura oublié. Sur une
        // machine partagée, l'oubli est précisément ce qu'on ne peut pas se
        // permettre.
        setTimeout(() => window.location.reload(), 700);
    };
}

// ───────────────────────────────────────────────────────── L'ÉLÈVE ──────────

function corpsEleve(qui, verdict, force) {
    const dur = force || !verdict.sur;
    return `
        <p class="dx-mot">${esc(qui.classe
            ? `Tu vas te déconnecter de la classe « ${qui.classe} ».`
            : 'Tu vas te déconnecter.')}</p>
        <p class="dx-note${dur && verdict.perte ? ' dx-note--alerte' : ''}">${esc(verdict.dire)}</p>
        <label class="dx-case">
            <input type="checkbox" id="dx-effacer">
            <span>Effacer aussi mon travail sur cet appareil
                <em>— à cocher sur un ordinateur partagé, pour ne rien laisser au suivant.
                    Ton travail déjà envoyé reste chez ton professeur.</em></span>
        </label>
        <div class="dx-boutons">
            <button type="button" class="dx-bouton dx-bouton--sortie" data-dx-ok>${
                verdict.sur ? 'Se déconnecter' : (verdict.perte ? 'Partir quand même' : 'Réessayer')}</button>
            <button type="button" class="dx-bouton dx-bouton--doux" data-dx-non>Rester</button>
        </div>`;
}

async function deconnecterLEleve() {
    const qui = quiEstLa();
    const enTrain = !!(window.__atoutmathEnJeu
        || (await import('../core/state.js')).state.activeSequenceRunner);
    const verdict = peutSeDeconnecter(resteAEnvoyer(), {
        enTrainDeTravailler: enTrain,
        horsLigne: typeof navigator !== 'undefined' && navigator.onLine === false
    });

    // ON N'ARRACHE PAS UNE QUESTION EN COURS : ici, il n'y a rien à négocier.
    if (verdict.pourquoi === 'en-plein-travail') {
        showModal('Se déconnecter', `<p class="dx-mot">${esc(verdict.dire)}</p>`, { width: '420px' });
        return;
    }

    const f = showModal('Se déconnecter', corpsEleve(qui, verdict, false), { width: '470px' });
    f.element.querySelector('[data-dx-non]').onclick = () => f.close();
    f.element.querySelector('[data-dx-ok]').onclick = async () => {
        const effacerLeTravail = !!f.element.querySelector('#dx-effacer')?.checked;
        const bouton = f.element.querySelector('[data-dx-ok]');
        bouton.disabled = true;
        bouton.textContent = 'On envoie…';

        // PREMIER ESSAI SANS FORCER : `deconnecterEleve` pousse ce qui reste et
        // refuse de partir s'il reste quelque chose. C'est lui qui décide, pas
        // cet écran — la règle ne doit pas dépendre d'un bouton.
        let r = await deconnecterEleve({ effacerLeTravail });
        if (!r.parti) {
            // Il reste vraiment du travail qu'on ne peut pas envoyer. On le
            // chiffre et on redemande, une seule fois.
            const dur = peutSeDeconnecter(r.reste, { horsLigne: true });
            bouton.disabled = false;
            bouton.textContent = 'Partir quand même';
            const note = f.element.querySelector('.dx-note');
            if (note) { note.textContent = dur.dire; note.classList.add('dx-note--alerte'); }
            bouton.onclick = async () => {
                bouton.disabled = true;
                await deconnecterEleve({ force: true, effacerLeTravail });
                f.close();
                showToast('Déconnecté.', 'info');
                setTimeout(() => window.location.reload(), 700);
            };
            return;
        }
        f.close();
        showToast('Déconnecté. À bientôt !', 'info');
        majBouton();
        setTimeout(() => window.location.reload(), 700);
    };
}

// ─────────────────────────────────────────────────────────── LE FIL ─────────

let pose = false;
export function initDeconnexionUI() {
    if (pose || typeof document === 'undefined') return;
    pose = true;
    const b = document.getElementById('btn-deconnexion');
    if (b) {
        b.onclick = () => {
            const qui = quiEstLa();
            if (qui.role === 'prof') deconnecterLeProf();
            else if (qui.role === 'eleve') deconnecterLEleve();
        };
    }
    // LE BOUTON SUIT L'ÉTAT, et il faut le rafraîchir autrement que sur un
    // événement : le passage en mode professeur ne s'annonce par AUCUN
    // événement dans l'application — c'est une classe posée sur `<body>`.
    // Plutôt que d'en inventer un et d'oublier de l'émettre au troisième
    // endroit qui bascule, on relit l'état à l'ouverture du menu. C'est le seul
    // instant où la réponse compte.
    for (const ev of ['profiles_updated', 'sync_config_updated',
                      'eleve_deconnecte', 'prof_deconnecte']) {
        document.addEventListener(ev, majBouton);
    }
    const menu = b && b.closest('.nav-menu, .nav-dropdown, [role="menu"]');
    const ouvreur = menu && menu.parentElement
        && menu.parentElement.querySelector('button, [role="button"]');
    if (ouvreur) ouvreur.addEventListener('click', () => setTimeout(majBouton, 0));
    // Ceinture : le menu peut aussi s'ouvrir par un chemin qu'on n'a pas prévu.
    if (menu) new MutationObserver(majBouton).observe(menu, {
        attributes: true, attributeFilter: ['hidden', 'class', 'style']
    });
    majBouton();
}

/** Exposé pour les essais. */
export { majBouton as rafraichirBoutonDeconnexion };

/**
 * LE TITRE RAMÈNE À L'ACCUEIL.
 *
 * Rémy : « quand on clique sur AtoutMath en haut à gauche, on revient sur le
 * site ; là le titre ne fait rien sur aucune zone (même administrative) ».
 *
 * C'ÉTAIT UN `<div>`. Rien à cliquer, rien au clavier, rien pour un lecteur
 * d'écran. Or un logo en haut à gauche est le seul repère que tout le monde
 * connaît pour sortir d'un endroit où l'on s'est perdu — et « perdu » est
 * exactement ce que Rémy décrit depuis deux jours en parlant de ces écrans.
 *
 * IL FERME CE QUI EST OUVERT AVANT DE NAVIGUER. Revenir à l'accueil en laissant
 * la page des classes par-dessus ne ramène nulle part : on verrait le même
 * écran et l'on croirait que le clic n'a rien fait — ce qui était déjà le cas.
 */
export function initRetourAccueil() {
    const t = document.getElementById('btn-accueil');
    if (!t) return;
    t.onclick = async () => {
        document.dispatchEvent(new CustomEvent('fermer_la_classe'));
        document.querySelectorAll('.modal-overlay').forEach(m => {
            if (m.offsetParent !== null) m.style.display = 'none';
        });
        try {
            const { setTopNavMode } = await import('./navigation.js');
            setTopNavMode(document.body.classList.contains('teacher-mode') ? 'path' : 'grid');
        } catch (e) { /* la fermeture seule vaut déjà mieux que rien */ }
    };
}
