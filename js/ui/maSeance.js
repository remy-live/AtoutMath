// « TA SÉANCE DU JOUR » — le bout de la chaîne, côté élève.
//
// Le professeur écrit un parcours, l'engrenage le donne à ses classes, le bilan
// lui dit ce qui a été compris. Il manquait le maillon du milieu : que l'élève
// VOIE son travail. Sans lui, tout le reste tourne à vide — le professeur donne,
// et personne ne reçoit.
//
// CE MODULE PEINT ET BRANCHE ; toutes les décisions sont dans
// `core/rattachement.js`, testé sans navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QU'IL FAUT SAVOIR SUR LA PORTÉE, ET QUE JE NE VEUX PAS CACHER.
//
// AtoutMath n'a pas de serveur : les classes vivent dans le navigateur où le
// professeur les a créées. Le rattachement ne s'offre donc QUE là où la liste
// des classes existe — le poste du professeur, la tablette de la salle, le
// navigateur où l'on fait la démonstration à deux fenêtres. Un élève qui ouvre
// AtoutMath chez lui, sur son propre téléphone, ne voit aucune classe et n'a
// rien à rejoindre : pour lui, le chemin reste le CODE que le professeur
// dicte, qui marche déjà et n'a besoin de personne.
//
// C'est une limite du hors-ligne, pas un choix d'écran. Le jour où la synchro
// par code de classe existera, elle remplira la même table de liens et cet
// écran-ci ne bougera pas d'une ligne.
// ─────────────────────────────────────────────────────────────────────────────
//
// PAS DE MOT DE PASSE, et c'est réfléchi. Rémy l'a tranché : prénom.nom. Un
// mot de passe de sixième se perd la deuxième semaine et se redemande au
// professeur au milieu du cours. Ce qu'on protège tient en une phrase :
// personne ne doit travailler à la place d'un autre PAR ACCIDENT. Choisir son
// nom dans la liste de sa classe y suffit.

import { globalStore } from '../core/store.js';
import { state } from '../core/state.js';
import { getActiveProfileId } from '../core/profile.js';
import { hydratePath } from '../core/path.js';
import { resolvePolicy } from '../core/policy.js';
import { Shortcodes } from '../core/shortcodes.js';
import {
    candidats, suggestions, rattacher, detacher, rattachementDe, retrouver,
    maSeance, mesSeances, etatDeMaSeance
} from '../core/rattachement.js';
import { direSeance } from '../core/seances.js';
import { lireClasses, lireSeances } from './donnerSeance.js';
import { showModal, showToast, showConfirm } from './modal.js';

const CLE_LIENS = 'rattachements';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function lireLiens() {
    return (await globalStore.get(CLE_LIENS, {})) || {};
}

async function ecrireLiens(liens) {
    await globalStore.set(CLE_LIENS, liens);
    document.dispatchEvent(new CustomEvent('rattachement_updated'));
}

/**
 * L'INSTANTANÉ, ET POURQUOI IL EN FAUT UN.
 *
 * L'écran d'arrivée se dessine d'un trait, sans attendre — c'est ce qui fait
 * qu'il ne clignote pas. Or lire les classes et les séances passe par le
 * stockage, donc par une promesse. On garde donc ici le DERNIER ÉTAT CONNU :
 * `rafraichir()` le met à jour et redemande un dessin, `instantane()` le rend
 * tout de suite. Au tout premier affichage il est vide, et l'écran est
 * simplement celui d'avant les séances — puis la carte arrive.
 */
let cache = { lien: null, seance: null, etat: null, classes: [], seances: [], pret: false };

export function instantane() {
    return cache;
}

/** Le lien du profil actif — chaque profil de la tablette a le sien. */
export async function monLien() {
    return rattachementDe(await lireLiens(), getActiveProfileId());
}

/**
 * Relit tout, et redessine l'accueil si quelque chose a bougé.
 *
 * Appelé au démarrage, au changement de profil, et chaque fois que le
 * professeur donne ou retire une séance sur le même appareil — c'est le cas de
 * la démonstration à deux fenêtres, et c'est celui qu'on veut voir marcher.
 */
export async function rafraichir({ redessiner = true } = {}) {
    const [classes, seances, liens] = await Promise.all([
        lireClasses(), lireSeances(), lireLiens()
    ]);
    const lien = rattachementDe(liens, getActiveProfileId());
    const seance = maSeance(seances, lien);
    cache = {
        lien, seance, classes, seances, pret: true,
        etat: etatDeMaSeance(seance, lien, parcoursCharge())
    };
    if (redessiner) {
        const m = await import('./aujourdhui.js');
        m.rendreAujourdhui();
    }
    return cache;
}

/** Le parcours actuellement chargé chez l'élève, sous la forme du noyau. */
function parcoursCharge() {
    const a = state.studentPath;
    return (a && Array.isArray(a.steps))
        ? { id: a.pathId, completed: a.completed || [] } : null;
}

/**
 * OUVRIR SA SÉANCE — c'est-à-dire la charger comme parcours assigné.
 *
 * ON PASSE PAR LE MÊME CHEMIN QU'UN CODE DICTÉ (`setStudentPath`), et ce n'est
 * pas un raccourci d'implémentation : c'est ce qui garantit qu'une séance
 * ouverte depuis l'accueil et la même séance ouverte depuis un code donnent
 * exactement le même travail, le même barème et le même compteur. Deux chemins
 * pour un seul parcours, c'est deux comportements à tenir d'accord.
 */
export function ouvrirSeance(seance, { autoStart = true } = {}) {
    if (!seance || !seance.path) return false;
    const path = seance.path;
    const { steps, missing } = hydratePath(path);
    if (!steps.length) {
        showToast('Ce travail n\'est plus disponible sur cet appareil.', 'error');
        return false;
    }
    if (missing.length) {
        showToast(`${missing.length} activité(s) de cette séance n'existent plus.`, 'error');
    }
    state.setStudentPath(path.steps, {
        pathId: path.id,
        name: seance.titre || path.name,
        // LE CODE VOYAGE AVEC LA SÉANCE : il est déjà calculé au moment où le
        // professeur donne. On le reprend tel quel plutôt que d'en refabriquer
        // un — deux codes pour un même travail se dicteraient en classe et ne
        // se ressembleraient pas.
        code: seance.code || Shortcodes.encodePath(path),
        policy: resolvePolicy(path.policy)
    });
    import('./navigation.js').then(m => m.setTopNavMode('path'));
    if (autoStart) {
        import('../core/runner.js').then(({ Runner }) => {
            new Runner({ path, deviceMode: 'none', isStudentPath: true }).start();
        });
    }
    return true;
}

/** Ouvrir la séance du moment, telle qu'elle est dans l'instantané. */
export function ouvrirMaSeance() {
    return ouvrirSeance(cache.seance);
}

/* ══════════════════════════ REJOINDRE SA CLASSE ══════════════════════════ */

/**
 * « QUI ES-TU ? » — une saisie, et rien d'autre.
 *
 * On ne déroule PAS la liste des classes avec leurs trente noms. Deux raisons,
 * et la seconde compte plus que la première : cela ferait un mur de cent
 * cinquante lignes à faire défiler sur un téléphone ; et surtout, un élève qui
 * PARCOURT une liste finit par cliquer sur son voisin, alors qu'un élève qui
 * TAPE son nom tape le sien. On propose au fil de la frappe, comme partout
 * ailleurs dans l'application.
 */
export async function ouvrirRejoindre(apres) {
    const classes = await lireClasses();
    if (!classes.length) {
        return showModal('Rejoindre sa classe', `
            <div class="rj">
                <p class="rj-vide">Aucune classe n'est enregistrée sur cet appareil.</p>
                <p class="rj-aide">Pour recevoir le travail de ton professeur ici, demande-lui
                    le <b>code du parcours</b> : il fonctionne partout, sans rien installer.</p>
            </div>`, { width: '420px' });
    }

    const dejaLie = rattachementDe(await lireLiens(), getActiveProfileId());
    const modal = showModal('Rejoindre sa classe', `
        <div class="rj">
            ${dejaLie ? `<p class="rj-deja">Tu es rattaché à <b>${esc(dejaLie.nom)}</b>
                · ${esc(dejaLie.classeNom)}.
                <button type="button" class="rj-quitter" data-quitter>Ce n'est pas moi</button></p>` : ''}
            <label class="rj-label" for="rj-nom">Ton prénom et ton nom</label>
            <input id="rj-nom" class="rj-champ" type="text" autocomplete="off"
                   spellcheck="false" placeholder="Emma Durand" aria-describedby="rj-dit">
            <p class="rj-aide" id="rj-dit">Écris-le comme ton professeur l'a écrit —
                « Emma Durand » ou « emma.durand », les deux marchent.</p>
            <p class="rj-etat" role="status" aria-live="polite"></p>
            <div class="rj-liste" role="listbox" aria-label="Élèves proposés"></div>
        </div>`, { width: '420px' });

    const el = modal.element;
    const champ = el.querySelector('#rj-nom');
    const liste = el.querySelector('.rj-liste');
    const etat = el.querySelector('.rj-etat');

    const choisir = async (classeId, eleveId) => {
        const classe = classes.find(c => c.id === classeId);
        const eleve = classe && (classe.eleves || []).find(e => e.id === eleveId);
        if (!classe || !eleve) return;
        const liens = rattacher(await lireLiens(), getActiveProfileId(), classe, eleve);
        await ecrireLiens(liens);
        modal.close();
        showToast(`Bonjour ${eleve.nom} — tu es en ${classe.nom}.`, 'success');
        await rafraichir();
        if (apres) apres();
    };

    // LE NIVEAU NE SE RÉPÈTE PAS. « 6ᵉ A · 6e » dit deux fois la même chose et
    // se lit mal ; on ne l'ajoute que quand le nom de la classe ne le porte pas
    // déjà — « Groupe Dupont · 5e », lui, en a besoin.
    const situer = (c) => {
        const n = String(c.niveau || '').replace(/^(\d)e$/, '$1');
        return (n && !String(c.nom).includes(n)) ? `${c.nom} · ${c.niveau}` : c.nom;
    };

    const carte = (c, e) => `
        <button type="button" class="rj-choix" role="option"
                data-classe="${esc(c.id)}" data-eleve="${esc(e.id)}">
            <span class="rj-choix-nom">${esc(e.nom)}</span>
            <span class="rj-choix-classe">${esc(situer(c))}</span>
        </button>`;

    const chercher = () => {
        const saisie = champ.value;
        const exacts = candidats(classes, saisie);
        const proches = exacts.length ? [] : suggestions(classes, saisie);
        const vus = exacts.length ? exacts : proches;
        liste.innerHTML = vus.map(({ classe, eleve }) => carte(classe, eleve)).join('');
        // LES HOMONYMES : on ne choisit pas à leur place, et on le dit UNE
        // FOIS, au-dessus de la liste. Répéter l'avertissement sur chacune des
        // quatre cartes en fait un décor qu'on ne lit plus — alors que c'est le
        // seul moment de cet écran où il faut lire avant de cliquer.
        etat.textContent = !saisie.trim() ? ''
            : !vus.length ? 'Aucun élève de ce nom. Vérifie l\'orthographe avec ton professeur.'
                : exacts.length > 1
                    ? `${exacts.length} élèves portent ce nom : choisis ta classe.` : '';
        etat.classList.toggle('rj-etat--attention', exacts.length > 1);
        liste.querySelectorAll('[data-eleve]').forEach(b => {
            b.onclick = () => choisir(b.dataset.classe, b.dataset.eleve);
        });
    };

    const quitter = el.querySelector('[data-quitter]');
    if (quitter) quitter.onclick = () => { modal.close(); quitterMaClasse(); };

    champ.oninput = chercher;
    champ.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        const seul = liste.querySelectorAll('[data-eleve]');
        if (seul.length === 1) seul[0].click();
    };
    setTimeout(() => champ.focus(), 30);
    return modal;
}

/** Se détacher — on s'est trompé de nom, ou l'on prête l'appareil. */
export async function quitterMaClasse() {
    const lien = await monLien();
    if (!lien) return;
    showConfirm(`Tu ne seras plus rattaché à ${lien.nom} (${lien.classeNom}). `
        + 'Ton travail déjà fait n\'est pas effacé.', async () => {
        await ecrireLiens(detacher(await lireLiens(), getActiveProfileId()));
        showToast('Rattachement retiré.', 'success');
        await rafraichir();
    });
}

/* ═════════════════════════ LES SÉANCES PRÉCÉDENTES ═════════════════════════ */

/**
 * LES AUTRES SÉANCES, derrière un lien discret.
 *
 * Elles ne se disputent jamais l'écran avec le travail du jour — c'est toute
 * la raison d'être de « la séance du moment ». Mais un élève doit pouvoir
 * refaire un entraînement, et l'absent de mardi doit pouvoir rattraper mardi.
 */
export async function ouvrirMesSeances() {
    const { lien, seances } = await rafraichir({ redessiner: false });
    const liste = mesSeances(seances, lien);
    if (!liste.length) {
        return showModal('Mes séances', '<p class="rj-vide">Aucune séance pour l\'instant.</p>',
            { width: '420px' });
    }
    const modal = showModal('Mes séances', `
        <div class="rj">
            <div class="rj-seances">${liste.map(s => `
                <button type="button" class="rj-seance" data-seance="${esc(s.id)}">
                    <span class="rj-seance-nom">${esc(s.titre || (s.path && s.path.name) || 'Séance')}</span>
                    <span class="rj-seance-dit">${esc(direSeance(s))}
                        · ${((s.path && s.path.steps) || []).length} activité(s)</span>
                </button>`).join('')}</div>
        </div>`, { width: '440px' });
    modal.element.querySelectorAll('[data-seance]').forEach(b => {
        b.onclick = () => {
            const s = liste.find(x => x.id === b.dataset.seance);
            modal.close();
            ouvrirSeance(s);
        };
    });
    return modal;
}

/**
 * BRANCHER LE TOUT — appelé une fois au démarrage.
 *
 * On se remet à jour quand le professeur donne une séance, quand il la retire,
 * et quand on change de profil : ce sont les trois moments où l'écran d'un
 * élève doit changer sans qu'il ait rien fait.
 */
export function initMaSeance() {
    document.addEventListener('seances_updated', () => rafraichir());
    document.addEventListener('profiles_updated', () => rafraichir());
    document.addEventListener('rattachement_updated', () => { /* déjà rafraîchi */ });
    rafraichir();
}

export { retrouver };
