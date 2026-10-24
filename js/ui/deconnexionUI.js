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
/**
 * TOUTES LES IDENTITÉS RATTACHÉES À CET APPAREIL, et il peut y en avoir DEUX.
 *
 * ── CE QUE ÇA A COÛTÉ ──────────────────────────────────────────────────────
 *
 * RÉMY : « je suis désolé, je me suis mis sur un compte élève mais je ne
 * trouve pas où me déconnecter ».
 *
 * IL N'Y AVAIT PAS À ÊTRE DÉSOLÉ : LA PORTE N'EXISTAIT PAS. `quiEstLa()` rendait
 * UNE identité, et elle rendait celle du PROFESSEUR dès qu'un jeton de
 * professeur existait. Or sur SA machine les deux existent — il est professeur,
 * et il vient d'entrer avec le billet d'un élève pour essayer. Les deux boutons
 * de sortie proposaient donc « Quitter le mode professeur », qui ne défait pas
 * le rattachement de l'élève. MESURÉ (`tools/deuxIdentites.mjs`) : deux jetons
 * présents, zéro geste pour sortir du compte élève.
 *
 * L'ORDRE EST CELUI DE LA PRIORITÉ quand on n'en montre qu'une : le professeur
 * d'abord, parce que c'est le rattachement qui donne le plus de droits sur la
 * machine qu'on quitte.
 *
 * @returns {Array<{role:string, nom:string, classe?:string}>}
 */
export function lesIdentites() {
    const out = [];
    if (jetonProf()) out.push({ role: 'prof', nom: nomDuProf() });
    const p = getActiveProfile();
    const r = p && p.remote;
    if (r && r.token) {
        out.push({ role: 'eleve', nom: p.name || 'Élève',
            classe: r.className || r.classCode || '' });
    }
    return out;
}

/** À quoi est-on rattaché EN PREMIER — l'ancienne question, pour qui n'en veut qu'une. */
export function quiEstLa() {
    return lesIdentites()[0] || { role: 'personne', nom: '' };
}

function direDeQuoi(qui) {
    // ON DIT DE QUOI ON SE DÉCONNECTE. « Se déconnecter » tout court laisse la
    // question ouverte sur une machine où le professeur et l'élève passent
    // l'un après l'autre — et c'est exactement la machine où l'on clique.
    return qui.role === 'prof'
        ? 'Quitter le mode professeur'
        : (qui.classe ? `Se déconnecter de ${qui.classe}` : 'Se déconnecter');
}

function majBouton() {
    const toutes = lesIdentites();
    const qui = toutes[0] || { role: 'personne', nom: '' };
    // L'ÉLÈVE, S'IL Y EN A UN — et il peut y en avoir un SOUS le professeur.
    const eleve = toutes.find(x => x.role === 'eleve') || null;
    const b = document.getElementById('btn-deconnexion');
    if (b) {
        b.hidden = qui.role === 'personne';
        const mot = document.getElementById('btn-deconnexion-mot');
        if (mot) mot.textContent = direDeQuoi(qui);
    }
    // LA SECONDE SORTIE DU MENU N'EXISTE QUE DANS LE CAS DOUBLE, qui est
    // justement celui qui n'avait aucune porte. Une classe entière d'élèves ne
    // verra jamais ce bouton : eux n'ont qu'une identité, et la première la
    // nomme déjà.
    const be = document.getElementById('btn-deconnexion-eleve');
    if (be) {
        be.hidden = !(eleve && toutes.length > 1);
        const mote = document.getElementById('btn-deconnexion-eleve-mot');
        if (mote && eleve) mote.textContent = direDeQuoi(eleve);
    }

    // ── ET LA MÊME SORTIE DANS « MON PROFIL » ──────────────────────────────
    //
    // RÉMY : « Dans la partie élève il n'y a pas d'endroit pour se
    // déconnecter ».
    //
    // IL Y EN AVAIT UN, ET PERSONNE NE POUVAIT LE TROUVER. La sortie vit dans
    // le menu « ⋯ » de la barre du haut — un bouton sans libellé, dont tout
    // le commentaire d'index.html dit qu'il existe POUR CACHER les outils aux
    // élèves (« quand l'élève arrive là, ça fait peur »). C'était le bon
    // rangement pour six outils d'auteur, et le mauvais pour la seule porte de
    // sortie.
    //
    // MESURÉ avant d'y toucher : sur l'écran de l'élève, `#btn-deconnexion`
    // existe, n'est pas caché, et reste invisible — son menu l'est. Rien
    // d'autre à l'écran ne nomme la déconnexion.
    //
    // ELLE SE POSE DANS « Qui travaille ? », à côté du changement de profil :
    // c'est la ligne de l'IDENTITÉ, donc l'endroit où l'on cherche « ce n'est
    // pas moi » et « je m'en vais ». Le menu garde la sienne — un professeur
    // qui connaît le menu ne doit pas la perdre.
    //
    // ET C'EST L'ÉLÈVE QU'ELLE NOMME QUAND IL Y EN A UN. « Qui travaille ? » est
    // la ligne de l'identité de l'ÉLÈVE : y proposer de quitter le mode
    // professeur serait répondre à côté — et c'est exactement ce qui enfermait
    // Rémy dans le compte de son élève.
    const p = document.getElementById('btn-sortie-profil');
    if (p) {
        const ici = eleve || qui;
        p.hidden = ici.role === 'personne';
        p.textContent = direDeQuoi(ici);
        p.dataset.role = ici.role;
    }
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
    // L'IDENTITÉ DE L'ÉLÈVE, ET NON LA PREMIÈRE. Sur la machine du professeur,
    // `quiEstLa()` rend la sienne : la fenêtre disait « Tu vas te déconnecter »
    // tout court, sans nommer la classe qu'on quitte — mesuré, et c'est
    // précisément le renseignement qui manque quand on a deux comptes.
    const qui = lesIdentites().find(x => x.role === 'eleve') || quiEstLa();
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

// ───────────────────────────── LA SORTIE DEPUIS LA PORTE CLOSE ──────────────
//
// RÉMY, après avoir demandé qu'on puisse toujours se déconnecter : « oui mais
// attention c'est le mode porte fermé donc ça doit être différent pour le
// logout ».
//
// CE QUI DIFFÈRE, ET POURQUOI. La sortie ordinaire NÉGOCIE, et elle a raison de
// le faire : elle refuse de partir au milieu d'une question (« finis d'abord »),
// elle chiffre ce qui n'est pas parti, elle propose d'effacer son travail sur un
// poste partagé. Toutes ces questions supposent qu'on puisse RESTER et
// continuer. Sur la porte close, on ne peut rien continuer : l'écran est un
// voile, et l'y retenir pour lui demander de finir une question qui n'existe pas
// est exactement l'enfermement dont il se plaint.
//
//   · ELLE NE SE REFUSE JAMAIS. On pousse ce qu'on peut, puis on part.
//   · ELLE NE PROPOSE PAS D'EFFACER LE TRAVAIL. Rémy : « la référence est ce
//     qui est sur la base de données prioritairement » — le travail de l'élève
//     est chez lui, et le profil local qui reste est ce qui lui rend son nom
//     quand il se reconnecte. Et : « si l'élève ne se déconnecte pas chez lui,
//     il peut travailler » : partir n'efface rien.
//   · ELLE DIT OÙ L'ON ATTERRIT. « j'ai besoin de tester avec un élève puis
//     revenir à mon compte prof » : c'est l'écran d'identification qu'il
//     cherche, et le dire évite d'hésiter devant le bouton.
//
// LE PORTAIL N'A QUE DEUX PORTES — rejoindre sa classe, ou saisir un code (voir
// `ui/portailUI.js`, `MODE_LIBRE` à faux) : se déconnecter ne donne donc accès à
// RIEN de plus que le voile. C'est ce qui rend ce bouton sûr sur la porte close,
// et c'est vérifié, pas supposé (`tools/sortieDuVoile.mjs`).

/**
 * L'ÉTAGE DE LA FENÊTRE, AU-DESSUS DU VOILE — et c'est la sonde qui l'a trouvé.
 *
 * MESURÉ (`tools/sortieDuVoile.mjs`) : la fenêtre s'ouvrait, on lisait son
 * texte, et son bouton « Se déconnecter » n'était PAS celui qu'on touchait.
 * `document.elementFromPoint` au centre du bouton nommait le coupable :
 * `eleve-ecarte-carte`, c'est-à-dire le voile lui-même.
 *
 * POURQUOI, ET POURQUOI ON NE L'AURAIT PAS DEVINÉ : `.modal-overlay` est à
 * `z-index: 100000` dans css/components.css, donc bien au-dessus du voile — mais
 * `showModal` repose son étage EN LIGNE (`z-index: 9999` par défaut, voir
 * ui/modal.js), et un style en ligne l'emporte sur la classe. La fenêtre
 * passait donc sous le voile, qui est à 10100 (`.eleve-ecarte`, css/ui.css).
 *
 * Le bouton aurait été VISIBLE ET MORT — l'écran dit « se déconnecter », le
 * clic ne fait rien, et l'on retourne chercher le défaut dans la déconnexion.
 */
const ETAGE_SUR_LE_VOILE = 10200;

export async function sortirDeLaPorteClose() {
    const qui = lesIdentites().find(x => x.role === 'eleve') || quiEstLa();
    const f = showModal('Se déconnecter', corpsPorteClose(qui),
        { width: '440px', zIndex: ETAGE_SUR_LE_VOILE });
    f.element.querySelector('[data-dx-non]').onclick = () => f.close();
    f.element.querySelector('[data-dx-ok]').onclick = async () => {
        const bouton = f.element.querySelector('[data-dx-ok]');
        bouton.disabled = true;
        bouton.textContent = 'On envoie…';
        // ON ENVOIE D'ABORD CE QUI RESTE, puis l'on part quoi qu'il arrive.
        // L'ordre compte : forcer tout de suite jetterait du travail qu'une
        // seconde de réseau aurait sauvé.
        const r = await deconnecterEleve({});
        if (!r.parti) await deconnecterEleve({ force: true });
        f.close();
        showToast('Déconnecté.', 'info');
        majBouton();
        setTimeout(() => window.location.reload(), 700);
    };
}

function corpsPorteClose(qui) {
    const reste = resteAEnvoyer();
    const dit = peutSeDeconnecter(reste, {}).dire;
    return `
        <p class="dx-mot">${esc(qui.classe
            ? `Tu vas te déconnecter de la classe « ${qui.classe} ».`
            : 'Tu vas te déconnecter.')}</p>
        <p class="dx-note">Tu reviendras à l'écran d'identification : c'est là qu'on
            entre son identifiant, avec ce compte ou avec un autre.</p>
        <p class="dx-note">${esc(dit)}</p>
        <div class="dx-boutons">
            <button type="button" class="dx-bouton dx-bouton--sortie" data-dx-ok>Se déconnecter</button>
            <button type="button" class="dx-bouton dx-bouton--doux" data-dx-non>Rester</button>
        </div>`;
}

// ─────────────────────────────────────────────────────────── LE FIL ─────────

let pose = false;
/**
 * LE GESTE, UNE SEULE FOIS. Deux boutons le déclenchent — celui du menu et
 * celui de « Mon profil » — et recopier le choix du rôle à deux endroits est la
 * façon connue de les voir diverger (voir docs/frictions.md).
 */
export function seDeconnecter(role = null) {
    const voulu = role || (quiEstLa().role);
    if (voulu === 'prof') deconnecterLeProf();
    else if (voulu === 'eleve') deconnecterLEleve();
}

export function initDeconnexionUI() {
    if (pose || typeof document === 'undefined') return;
    pose = true;
    const b = document.getElementById('btn-deconnexion');
    if (b) b.onclick = () => seDeconnecter();
    const be = document.getElementById('btn-deconnexion-eleve');
    if (be) be.onclick = () => seDeconnecter('eleve');
    // LA SORTIE DE « Mon profil » SORT DE CE QU'ELLE NOMME, et elle nomme
    // l'élève quand il y en a un : sans ce `dataset`, elle aurait dit « Se
    // déconnecter de 6e B » et quitté le mode professeur.
    const p = document.getElementById('btn-sortie-profil');
    if (p) p.onclick = () => seDeconnecter(p.dataset.role || null);
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
