// LES PARCOURS SUR LE SERVEUR — le raccordement qui manquait.
//
// Rémy : « comment et où sont tous les parcours stockés ? » puis « oui
// l'automatique, mais à terme de toute façon, ce ne sera que sur le serveur ».
//
// CE QU'ON A TROUVÉ EN CHERCHANT LA RÉPONSE, ET QUI N'ÉTAIT PAS RASSURANT.
//
// Les classes, les élèves, les billets et tout le travail des élèves vivent sur
// le serveur. Les PARCOURS du professeur, eux, ne vivaient que dans IndexedDB,
// c'est-à-dire dans le navigateur de la machine où il les avait construits.
// Changer d'ordinateur, ou vider les données du navigateur, et la bibliothèque
// disparaissait. Le seul filet était un export manuel — un filet qu'il faut
// penser à tendre n'est pas un filet.
//
// Pire, et moins visible : une séance donnée depuis « Mes classes » N'ATTEIGNAIT
// JAMAIS les machines des élèves. La carte « Ma séance » lit le stockage local,
// donc celui de l'élève, qui est vide. Le seul canal qui marchait était le code
// dicté.
//
// TOUT LE SERVEUR ÉTAIT DÉJÀ ÉCRIT, ET DÉJÀ ÉPROUVÉ. Les tables `paths` et
// `assignments` existent (avec une colonne `due_at`, c'est-à-dire l'horaire que
// Rémy demandait), les routes `/teacher/paths` et `/teacher/assign` sont
// gardées et testées, et `/sync` renvoie déjà `assignments` à chaque élève.
// Rien, dans l'application, n'appelait la première ni n'écoutait la dernière :
// les tables étaient vides parce que personne ne les remplissait, et la réponse
// du serveur était reçue puis jetée.
//
// Ce module est ce raccordement, et rien d'autre. Il ne dessine aucun écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE SERVEUR EST LA SOURCE, LE NAVIGATEUR EST UN CACHE. C'est la direction que
// Rémy a tranchée, et elle décide de tous les arbitrages qui suivent :
//
//   · on monte SANS DEMANDER. Un enregistrement local part au serveur dans la
//     foulée. Les brouillons aussi — c'est le prix, et il est assumé : un
//     brouillon perdu est un brouillon perdu ;
//   · on ne monte QUE CE QUI A CHANGÉ. Sans cette précaution, chaque frappe
//     dans l'atelier enverrait toute la bibliothèque ;
//   · une panne de réseau ne perd rien : ce qui n'est pas parti est réessayé au
//     prochain changement et au prochain démarrage. L'ordre importe peu, un
//     parcours étant écrasé par sa propre version la plus récente.

import { globalStore } from './store.js';
import { state } from './state.js';
import { auServeur } from './espaceProf.js';
import { jetonProf } from './verrouProf.js';
import { getActiveProfile } from './profile.js';
import { normalizePath } from './path.js';
import { donnerSeance } from './seances.js';
import { identiteDeParcours } from './shortcodes.js';

/** Ce qu'on a déjà réussi à monter : identifiant → empreinte de ce qui est parti. */
const dejaMonte = new Map();
const CLE_MONTEE = 'parcoursMontes';

/** Une empreinte courte et stable de ce qu'on enverrait. */
function empreinte(parcours) {
    try {
        return JSON.stringify({ n: parcours.name, s: parcours.steps, p: parcours.policy });
    } catch (e) {
        return String(Math.random());
    }
}

/** Le professeur est-il identifié auprès du serveur ? */
function enPosteDeProf() {
    const j = jetonProf();
    return !!(j && j.token);
}

// ─────────────────────────────────────────── CÔTÉ PROFESSEUR : MONTER ───────

/**
 * MONTER UN PARCOURS, ET DIRE HONNÊTEMENT SI C'EST PARTI.
 *
 * @returns {Promise<{monte:boolean, erreur?:string}>}
 */
export async function monterUnParcours(parcours) {
    if (!parcours || !parcours.id || !parcours.name) {
        return { monte: false, erreur: 'Parcours sans nom : rien à monter.' };
    }
    const sceau = empreinte(parcours);
    if (dejaMonte.get(parcours.id) === sceau) return { monte: true };

    const r = await auServeur('/teacher/paths', { action: 'save', path: parcours });
    if (r.erreur) return { monte: false, erreur: r.erreur };
    dejaMonte.set(parcours.id, sceau);
    await globalStore.set(CLE_MONTEE, Object.fromEntries(dejaMonte)).catch(() => {});
    return { monte: true };
}

/**
 * TOUTE LA BIBLIOTHÈQUE, ET CE QUI RESTE À TERRE.
 *
 * On ne s'arrête pas au premier échec : un parcours illisible ne doit pas
 * empêcher les vingt autres de se mettre à l'abri.
 *
 * @returns {Promise<{montes:number, restes:number, erreur:string}>}
 */
export async function monterLaBibliotheque() {
    if (!enPosteDeProf()) return { montes: 0, restes: 0, erreur: '' };
    let montes = 0, restes = 0, erreur = '';
    for (const p of (state.teacherPaths || [])) {
        const r = await monterUnParcours(p);
        if (r.monte) montes++;
        else { restes++; erreur = erreur || r.erreur || ''; }
    }
    return { montes, restes, erreur };
}

/**
 * LA BIBLIOTHÈQUE DU SERVEUR, RAMENÉE SUR CETTE MACHINE.
 *
 * C'est ce qui fait qu'un professeur retrouve ses parcours sur un ordinateur
 * qu'il n'a jamais utilisé. On n'écrase JAMAIS un parcours local du même
 * identifiant : celui qu'on a sous la main peut contenir des retouches qui ne
 * sont pas encore parties. En cas de doute, on garde les deux et c'est le
 * professeur qui tranche — perdre son travail est pire que d'avoir un doublon.
 *
 * @returns {Promise<{ramenes:number, erreur:string}>}
 */
export async function ramenerLaBibliotheque() {
    if (!enPosteDeProf()) return { ramenes: 0, erreur: 'Pas identifié comme professeur.' };
    const r = await auServeur('/teacher/paths', { action: 'list' });
    if (r.erreur) return { ramenes: 0, erreur: r.erreur };
    const connus = new Set((state.teacherPaths || []).map(p => p.id));
    let ramenes = 0;
    for (const ligne of (r.paths || [])) {
        const p = ligne.data;
        if (!p || !p.id || connus.has(p.id)) continue;
        state.teacherPaths.push(normalizePath(p, p.name));
        dejaMonte.set(p.id, empreinte(p));
        ramenes++;
    }
    if (ramenes) state.saveTeacherPaths();
    return { ramenes, erreur: '' };
}

/**
 * DONNER UNE SÉANCE À UNE CLASSE — pour de bon, cette fois.
 *
 * Deux temps, et les deux comptent : le parcours monte (sans quoi le serveur
 * n'aurait rien à servir), puis l'assignation est écrite. L'horaire va dans
 * `due_at`, qui existait déjà en base et n'avait jamais servi.
 *
 * @param {object} parcours
 * @param {string} classId   l'identifiant SERVEUR de la classe
 * @param {object} [opts]    { dueAt, studentId }
 */
export async function donnerAuServeur(parcours, classId, opts = {}) {
    const m = await monterUnParcours(parcours);
    if (!m.monte) return { erreur: m.erreur || "Le parcours n'a pas pu être enregistré." };
    const r = await auServeur('/teacher/assign', {
        pathId: parcours.id,
        classId: classId || null,
        studentId: opts.studentId || null,
        dueAt: opts.dueAt || null
    });
    if (r.erreur) return r;
    return { ok: true, pathId: parcours.id };
}

/**
 * LA VEILLE : tout enregistrement local part au serveur.
 *
 * On écoute l'événement plutôt que de modifier `state.savePaths()` : le noyau
 * annonce déjà ses changements, et se brancher sur l'annonce évite d'ajouter
 * une dépendance au serveur dans le module qui range les parcours — celui-ci
 * doit continuer de fonctionner sans réseau, et sans rien savoir du serveur.
 *
 * ON ATTEND UN BATTEMENT. « Enregistrer » se déclenche à chaque retouche d'un
 * réglage d'étape ; sans ce délai, déplacer un curseur enverrait trente
 * requêtes. Deux secondes après la dernière retouche suffisent.
 */
let minuteur = null;
let veille = false;

export function veillerSurLaBibliotheque() {
    if (veille || typeof document === 'undefined') return;
    veille = true;
    document.addEventListener('teacherPaths_updated', () => {
        if (!enPosteDeProf()) return;
        clearTimeout(minuteur);
        minuteur = setTimeout(() => { monterLaBibliotheque(); }, 2000);
    });
}

/** À rappeler au démarrage : on remonte ce qui était resté à terre. */
export async function initParcoursServeur() {
    const garde = await globalStore.get(CLE_MONTEE, null).catch(() => null);
    if (garde && typeof garde === 'object') {
        Object.entries(garde).forEach(([k, v]) => dejaMonte.set(k, v));
    }
    veillerSurLaBibliotheque();
    if (enPosteDeProf()) monterLaBibliotheque();
}

// ──────────────────────────────────────────── CÔTÉ ÉLÈVE : RECEVOIR ─────────

/**
 * CE QUE LE SERVEUR ENVOIE, RANGÉ LÀ OÙ LES ÉCRANS SAVENT DÉJÀ LIRE.
 *
 * `/sync` renvoie `assignments` depuis toujours, et l'application déclenchait
 * déjà `assignments_received` — que personne n'écoutait. On aurait pu bâtir un
 * second chemin « séance venue du serveur » à côté de celui qui existe ; ç'eût
 * été deux fois plus de code et deux fois plus d'écrans à tenir d'accord.
 *
 * On écrit donc dans les MÊMES structures que la séance donnée localement :
 * un rattachement, et des séances. « Ma séance », la carte d'aujourd'hui,
 * l'avancement, le bilan — tout cela marche alors sans qu'on y touche.
 *
 * L'IDENTITÉ DU TRAVAIL EST CELLE DU CONTENU, la même que celle du code dicté
 * (voir `identiteDeParcours`). C'est ce qui permet à un élève entré par le code
 * et à un élève rattaché de travailler sous le même nom, donc au bilan de les
 * compter ensemble.
 *
 * @param {Array} assignations  ce que `/sync` a renvoyé
 * @returns {Promise<{ecrites:number, seances:Array}>}
 */
export async function recevoirLesAssignations(assignations) {
    if (!Array.isArray(assignations) || !assignations.length) return { ecrites: 0, seances: [] };
    const profil = getActiveProfile();
    const distant = profil && profil.remote;
    if (!distant || !distant.token) return { ecrites: 0, seances: [] };

    // ON PASSE PAR LES MÊMES PORTES QUE LE RESTE DE L'APPLICATION. Les clés de
    // rangement ('classes', 'seances', 'rattachements') ne sont écrites qu'à un
    // seul endroit chacune ; les recopier ici en ferait deux, et le jour où l'une
    // change, l'autre continue d'écrire à côté sans que rien ne le dise.
    const { lireSeances, ecrireSeances } = await import('../ui/donnerSeance.js');
    const { lireLiens, poserLeLien } = await import('../ui/maSeance.js');

    const classeId = distant.classCode || distant.classId || 'classe-serveur';
    const eleveId = distant.studentId;

    // LE RATTACHEMENT LOCAL EST LE MIROIR DU RATTACHEMENT SERVEUR. Les écrans
    // de l'élève raisonnent sur `lien` ; on le fabrique à partir de ce que le
    // serveur nous a déjà donné, plutôt que de demander à l'élève de se
    // rattacher une seconde fois à ce qui est déjà fait.
    const liens = (await lireLiens()) || {};
    // LE LIEN PORTE LE NOM, DONC ON N'A PAS BESOIN D'UNE CLASSE MIROIR. C'est
    // déjà le cas du rattachement local (`rattacher`), et pour la même raison :
    // « tu es rattaché à la 4A » doit s'afficher même quand la classe n'est pas
    // sur cet appareil — le cas de l'élève qui travaille chez lui.
    const monLien = {
        classeId, eleveId,
        nom: profil.name || '', classeNom: distant.className || '', le: Date.now()
    };
    if (JSON.stringify(liens[profil.id] || null) !== JSON.stringify(monLien)) {
        await poserLeLien(monLien);
    }

    const seances = (await lireSeances()) || [];
    const dejaLa = new Set(seances.map(s => s.id));
    const neuves = [];
    for (const a of assignations) {
        if (!a || !a.path) continue;
        // L'identifiant de séance vient de l'assignation : deux synchros
        // successives ne doivent pas fabriquer deux séances pour un même
        // travail donné une seule fois.
        const id = 's_srv_' + String(a.assignmentId || a.pathId);
        if (dejaLa.has(id)) continue;
        const parcours = normalizePath(a.path, a.name || a.path.name);
        const s = donnerSeance({ id: classeId, nom: distant.className || '' }, parcours, {
            titre: a.name || parcours.name,
            donneeLe: Date.now()
        });
        s.id = id;
        s.pathId = identiteDeParcours(parcours);
        // L'HORAIRE DU SERVEUR DEVIENT L'OUVERTURE DE LA SÉANCE. `due_at`
        // existait en base et ne servait à rien ; c'est lui qui portera
        // « imposée de 8 h à 9 h ».
        if (a.dueAt) {
            const t = Date.parse(String(a.dueAt).replace(' ', 'T') + 'Z');
            if (!Number.isNaN(t)) s.ouvreLe = t;
        }
        seances.push(s);
        neuves.push(s);
    }
    if (neuves.length) await ecrireSeances(seances);
    return { ecrites: neuves.length, seances: neuves };
}

/** À brancher une fois : le serveur parle, on range. */
let ecoute = false;

export function ecouterLesAssignations() {
    if (ecoute || typeof document === 'undefined') return;
    ecoute = true;
    document.addEventListener('assignments_received', async (e) => {
        const r = await recevoirLesAssignations(e.detail);
        if (r.ecrites) {
            // Les écrans de l'élève se redessinent sur cet événement-là.
            document.dispatchEvent(new CustomEvent('seances_updated'));
        }
    });
}
