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
import { donnerSeance, majDeSeance, appliquerLaMaj } from './seances.js';
import { etapesFaitesDeLaSeance } from './bilanSeance.js';
import { journal } from './journal.js';
import { identiteDeParcours } from './shortcodes.js';
import { empreinte } from './empreinteParcours.js';
import { estUnParcoursSeme } from './parcoursSemes.js';
import { cheminDeLEntree } from './entreeParcours.js';

/** Ce qu'on a déjà réussi à monter : identifiant → empreinte de ce qui est parti. */
const dejaMonte = new Map();
const CLE_MONTEE = 'parcoursMontes';

/** Une empreinte courte et stable de ce qu'on enverrait. */
// L'empreinte du contenu vit dans son propre module : voir son en-tête, et
// surtout `tests/empreinteParcours.test.mjs`. Elle était ici, où rien ne
// pouvait l'éprouver — ce fichier importe `state.js`, qui veut un `document`.


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

    // UNE SEULE FORME EN BASE, ET C'EST LE PARCOURS.
    //
    // Deux écrivains visaient la même ligne avec deux formes différentes :
    // `donnerAuServeur` envoie le PARCOURS, `monterLaBibliotheque` envoie
    // l'ENVELOPPE de « Préparer ». Le dernier qui écrit gagne — et comme la
    // veille remonte toute la bibliothèque à chaque retouche, c'était presque
    // toujours l'enveloppe. L'élève recevait alors une séance à zéro exercice.
    //
    // ON DÉBALLE DONC AVANT D'ENVOYER, en gardant l'identifiant et le nom de
    // l'ENTRÉE : ce sont eux que les assignations désignent, et les renommer
    // ici détacherait les séances déjà données de leur parcours.
    const dedans = cheminDeLEntree(parcours) || parcours;
    const aEnvoyer = { ...dedans, id: parcours.id, name: parcours.name };

    const r = await auServeur('/teacher/paths', { action: 'save', path: aEnvoyer });
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
        // ON NE MONTE PAS CE QUE LE LOGICIEL SE DONNE À LUI-MÊME. Voir
        // `parcoursSemes.js` : « Parcours découverte » et « Tout sur papier »
        // naissent sur CHAQUE machine avec un identifiant neuf. Les monter, puis
        // les redescendre ailleurs, c'est fabriquer une paire de jumeaux par
        // poste — MESURÉ, cinq lignes au serveur pour trois parcours.
        if (estUnParcoursSeme(p)) continue;
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
    // CE QUI A ÉTÉ JETÉ AILLEURS S'EN VA D'ICI AUSSI.
    //
    // Sans cela, le poste de la salle garderait éternellement un parcours que
    // Rémy a mis à la corbeille depuis son Mac — et le remonterait au serveur
    // à chaque démarrage, où il resterait jeté, dans une partie de cache-cache
    // que personne ne gagne. C'est l'autre moitié de la corbeille, et elle ne
    // se voit que sur une SECONDE machine.
    let jetes = 0;
    const aLaCorbeille = new Set((r.corbeille || []).map(x => x && x.id).filter(Boolean));
    if (aLaCorbeille.size) {
        for (const p of [...(state.teacherPaths || [])]) {
            if (p && aLaCorbeille.has(p.id)) {
                state.removeTeacherPath(p.id);
                dejaMonte.delete(p.id);
                jetes++;
            }
        }
    }

    const connus = new Set((state.teacherPaths || []).map(p => p && p.id));
    let ramenes = 0;
    for (const ligne of (r.paths || [])) {
        const brut = ligne && ligne.data;
        if (!brut || typeof brut !== 'object' || !brut.id || connus.has(brut.id)) continue;
        // CE QUE LE LOGICIEL SE DONNE À LUI-MÊME NE REDESCEND PAS. Voir
        // `parcoursSemes.js`. « Tout sur papier » est même PLUS JUSTE refabriqué
        // ici que rapatrié : rapatrié, il porterait le catalogue de l'autre
        // machine. Les anciennes lignes déjà au serveur sont donc ignorées — on
        // n'y touche pas, on ne les regarde plus.
        if (estUnParcoursSeme(brut)) continue;

        // DEUX FORMES ARRIVENT D'ICI, ET LA MAUVAISE PERD SES ÉTAPES EN SILENCE.
        //
        // `monterLaBibliotheque` envoie ce qu'elle a sous la main, c'est-à-dire
        // l'ENVELOPPE rangée par `state.saveTeacherPath` : { id, name, data,
        // folderId, timestamp }, où `data` est le parcours. Le serveur la range
        // telle quelle et la rend telle quelle.
        //
        // MESURÉ : `normalizePath(enveloppe, nom)` rend DEUX étapes sur le
        // parcours et ZÉRO sur l'enveloppe. La raison est écrite dans
        // `normalizePath` : il cherche `raw.data` comme un TABLEAU d'étapes (le
        // vieux format de l'explorateur) ; ici `data` est un OBJET, donc il
        // retombe sur `raw.steps`, qui n'existe pas à ce niveau. Un parcours
        // revenait avec son nom, son identifiant, et rien dedans.
        //
        // LE DÉBALLAGE VIT DANS SON PROPRE MODULE parce que la même ligne avait
        // déjà été écrite dans `js/ui/espaceClasses.js` — et qu'elle manquait
        // ici. Voir `entreeParcours.js`.
        const dedans = cheminDeLEntree(brut) || brut;
        const parcours = normalizePath(dedans, brut.name || dedans.name || 'Parcours');

        // ON REMET L'ENVELOPPE, PARCE QUE C'EST CE QUE L'EXPLORATEUR LIT. Il
        // affiche `name`, range par `folderId` et trie par `timestamp` ; un
        // parcours nu y entrait sans dossier et sans date. On garde l'identifiant
        // de l'enveloppe du serveur, sinon le prochain démarrage le remonterait
        // sous un nom neuf et l'on aurait fabriqué le doublon qu'on évite.
        state.teacherPaths.push({
            id: brut.id,
            name: brut.name || parcours.name,
            data: parcours,
            folderId: brut.folderId || 'root',
            timestamp: brut.timestamp || Date.now()
        });
        dejaMonte.set(brut.id, empreinte(brut));
        ramenes++;
    }
    if (ramenes) state.saveTeacherPaths();
    if (jetes) await globalStore.set(CLE_MONTEE, Object.fromEntries(dejaMonte)).catch(() => {});
    return { ramenes, jetes, erreur: '' };
}

/**
 * METTRE DES PARCOURS À LA CORBEILLE — au serveur, donc pour de bon.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « supprimer en bloc, mettre dans la corbeille ».
 *
 * CE QU'ON RÉPARE ICI EST PLUS GRAVE QU'UN MANQUE. MESURÉ
 * (`tools/parcoursSupprime.mjs`) : on supprimait un parcours, on rechargeait
 * la page, IL REVENAIT. `removeTeacherPath` n'effaçait que la copie du
 * navigateur ; le serveur gardait la sienne, et `ramenerLaBibliotheque()` la
 * redescendait au démarrage suivant. Le bouton disait « définitivement ».
 *
 * ON JETTE AU SERVEUR D'ABORD, ON OUBLIE LOCALEMENT ENSUITE. L'ordre compte :
 * dans l'autre sens, une panne de réseau laisserait un parcours effacé ici et
 * vivant là-bas — c'est-à-dire exactement le défaut qu'on corrige.
 *
 * @param {string[]} ids  les identifiants d'ENVELOPPE (ceux de teacherPaths)
 */
export async function jeterALaCorbeille(ids) {
    const liste = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!liste.length) return { ok: true, combien: 0 };
    if (!enPosteDeProf()) {
        // SANS SERVEUR, ON NE PROMET PAS CE QU'ON NE PEUT PAS TENIR. Le
        // professeur qui n'est pas identifié travaille sur sa machine seule :
        // sa suppression locale EST définitive, et c'est juste.
        liste.forEach((id) => state.removeTeacherPath(id));
        return { ok: true, combien: liste.length, local: true };
    }
    const r = await auServeur('/teacher/paths', { action: 'corbeille', ids: liste });
    if (r.erreur) return r;
    liste.forEach((id) => { state.removeTeacherPath(id); dejaMonte.delete(id); });
    await globalStore.set(CLE_MONTEE, Object.fromEntries(dejaMonte)).catch(() => {});
    return { ok: true, combien: r.combien || liste.length };
}

/** Les ressortir de la corbeille : elles redescendront au prochain rapatriement. */
export async function sortirDeLaCorbeille(ids) {
    const liste = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!liste.length) return { ok: true, combien: 0 };
    if (!enPosteDeProf()) return { erreur: 'Pas identifié comme professeur.' };
    const r = await auServeur('/teacher/paths', { action: 'restaurer', ids: liste });
    if (r.erreur) return r;
    await ramenerLaBibliotheque();
    return { ok: true, combien: r.combien || liste.length };
}

/** Ce qu'il y a dans la corbeille, et depuis quand. */
export async function laCorbeille() {
    if (!enPosteDeProf()) return { parcours: [], jours: 30 };
    const r = await auServeur('/teacher/paths', { action: 'list' });
    if (r.erreur) return { parcours: [], jours: 30, erreur: r.erreur };
    return { parcours: r.corbeille || [], jours: r.joursCorbeille || 30 };
}

/**
 * COMBIEN DE FOIS CHAQUE PARCOURS A DÉJÀ ÉTÉ DONNÉ.
 *
 * Rémy : « on prévient, et on garde le bilan ». Prévenir demande de SAVOIR, et
 * l'atelier ne savait que pour le parcours ouvert — c'est-à-dire presque jamais
 * au moment d'en gérer trente. Le serveur compte la jointure et la rend avec la
 * liste : un aller-retour pour toute la fenêtre, et non un par ligne.
 *
 * ON INTERROGE À CHAQUE OUVERTURE DE LA FENÊTRE, et non une fois au démarrage :
 * Rémy donne une séance, puis vient ranger ses parcours. Un compte vieux de
 * deux heures dirait « jamais donné » de celui qu'il vient de donner.
 *
 * @returns {Promise<Map<string, number>>} par identifiant de parcours
 */
export async function combienDonne() {
    if (!enPosteDeProf()) return new Map();
    const r = await auServeur('/teacher/paths', { action: 'list' });
    const m = new Map();
    for (const ligne of (r.paths || [])) {
        if (ligne && ligne.id) m.set(ligne.id, Number(ligne.donne) || 0);
    }
    return m;
}

/** VIDER LA CORBEILLE — le seul geste qui efface vraiment, et il se demande. */
export async function viderLaCorbeille() {
    if (!enPosteDeProf()) return { erreur: 'Pas identifié comme professeur.' };
    return auServeur('/teacher/paths', { action: 'vider' });
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
        dueAt: opts.dueAt || null,
        // L'IDENTITÉ DU TRAVAIL, QUE SEUL LE NAVIGATEUR SAIT CALCULER.
        //
        // Le serveur la range telle quelle et la rendra à TOUS les élèves de
        // la séance — y compris à celui qui ouvre son poste une heure après
        // que le professeur l'a complétée. Sans elle, chacun la recalculait
        // chez lui, sur le contenu qu'il avait sous les yeux : MESURÉ, Tom
        // « path_cDPF7NX » et Emma « path_cK8LZGE » pour une même séance. Le
        // bilan filtre les travaux là-dessus ; il en perdait un des deux.
        pathIdentity: identiteDeParcours(normalizePath(parcours, parcours.name))
    });
    if (r.erreur) return r;
    return { ok: true, pathId: parcours.id };
}

/**
 * À QUI CE PARCOURS EST DONNÉ — les classes, ET les élèves nommés.
 *
 * L'écran ne peut pas cocher juste sans savoir qui l'a déjà, et cette vérité
 * est au serveur : le navigateur du professeur ne sait rien de ce qu'il a donné
 * depuis un autre poste.
 */
export async function aQuiEstDonne(parcours) {
    if (!enPosteDeProf() || !parcours || !parcours.id) return { classes: [], eleves: [] };
    const r = await auServeur('/teacher/assign', { pathId: parcours.id, action: 'list' });
    if (r.erreur) return { classes: [], eleves: [], erreur: r.erreur };
    return { classes: r.classes || [], eleves: r.eleves || [] };
}

/**
 * REPRENDRE UNE SÉANCE À UNE CLASSE.
 *
 * Le pendant de `donnerAuServeur`, et il manquait : on savait donner, on ne
 * savait pas reprendre. Décocher une classe effaçait la séance du navigateur
 * du professeur et laissait l'assignation en base — les élèves auraient
 * continué de recevoir un travail que leur professeur croit avoir repris.
 *
 * ON NE TOUCHE PAS AU TRAVAIL DÉJÀ FAIT : le journal est ailleurs. La séance
 * quitte la liste des élèves, le bilan reste lisible.
 */
export async function retirerDuServeur(parcours, classId, studentId = '') {
    if (!enPosteDeProf()) return { erreur: 'Pas identifié comme professeur.' };
    if (!parcours || !parcours.id) return { erreur: 'Il manque le parcours.' };
    if (!classId && !studentId) return { erreur: 'Il manque la classe ou l\'élève.' };
    const r = await auServeur('/teacher/assign', {
        action: 'retirer', pathId: parcours.id, classId: classId || null,
        studentId: studentId || null
    });
    if (r.erreur) return r;
    return { ok: true, retirees: r.retirees || 0 };
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
    if (!enPosteDeProf()) return;

    // ON DESCEND AVANT DE MONTER, ET IL FALLAIT LES DEUX.
    //
    // Rémy : « le parcours que j'ai créé au collège sur mon compte, je ne l'ai
    // pas sur mon mac chez moi !!!! »
    //
    // `ramenerLaBibliotheque()` porte depuis le début le commentaire « c'est ce
    // qui fait qu'un professeur retrouve ses parcours sur un ordinateur qu'il
    // n'a jamais utilisé ». Elle n'était appelée QUE par
    // `parcoursDeLaSeance(pathId)`, c'est-à-dire au moment de compléter une
    // séance déjà donnée. Personne ne l'appelait au démarrage : la moitié
    // « serveur → navigateur » du raccordement n'était branchée nulle part, et
    // la bibliothèque ne descendait donc jamais.
    //
    // DANS CET ORDRE, ET PAS L'INVERSE : si l'on monte d'abord, un poste neuf
    // envoie sa bibliothèque vide (ou ses deux parcours semés) avant d'avoir vu
    // ce que le serveur avait. Descendre d'abord, puis monter ce qui manque, est
    // le seul ordre où un poste neuf ne peut rien appauvrir.
    //
    // ON N'ÉCRASE JAMAIS UN PARCOURS LOCAL : `ramenerLaBibliotheque` saute les
    // identifiants déjà connus. Une retouche pas encore partie survit donc à un
    // démarrage, et repart à la montée qui suit.
    await ramenerLaBibliotheque();
    await monterLaBibliotheque();
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
        // LE PRÉNOM DU SERVEUR PASSE AVANT CELUI DU PROFIL LOCAL. Le profil
        // s'appelle « Mon profil » tant que personne ne l'a renommé — et sur
        // l'ordinateur de la salle, personne ne le renomme jamais.
        nom: distant.firstName || profil.name || '',
        classeNom: distant.className || '', le: Date.now()
    };
    if (JSON.stringify(liens[profil.id] || null) !== JSON.stringify(monLien)) {
        await poserLeLien(monLien);
    }

    const seances = (await lireSeances()) || [];
    const parId = new Map(seances.map(s => [s.id, s]));
    const neuves = [];
    const completees = [];
    for (const a of assignations) {
        if (!a || !a.path) continue;
        // ─────────────────────────────────────────────────────────────────
        // ON DÉBALLE L'ENVELOPPE, ET C'EST TOUTE LA SÉANCE QUI EN DÉPEND.
        //
        // Rémy, capture à l'appui : « Relatifs — 4C · 0 exercice à faire »,
        // sur une séance qui en porte seize.
        //
        // Ce que le serveur range dans `paths.data` n'est pas toujours un
        // parcours : `monterLaBibliotheque` y envoie l'ENVELOPPE de
        // « Préparer » — { id, name, data, folderId, timestamp } —, où le
        // parcours est un étage plus bas. `normalizePath` sur cette forme rend
        // ZÉRO étape, et l'élève reçoit une séance vide, avec le bon nom et la
        // bonne classe. Rien ne dit que quelque chose a manqué.
        //
        // C'est le MÊME défaut que celui qui faisait redescendre des parcours
        // vides dans la bibliothèque (v906). Il vivait ici aussi, sur le
        // chemin de l'élève, et nous n'étions pas allés le chercher.
        //
        // ON RÉPARE À LA RÉCEPTION, et non seulement à l'envoi : les parcours
        // déjà rangés en enveloppe sur son serveur ne vont pas se réécrire
        // tout seuls, et ses élèves ont cours demain.
        const chemin = cheminDeLEntree(a.path) || a.path;
        // L'identifiant de séance vient de l'assignation : deux synchros
        // successives ne doivent pas fabriquer deux séances pour un même
        // travail donné une seule fois.
        const id = 's_srv_' + String(a.assignmentId || a.pathId);

        // LA SÉANCE DÉJÀ LÀ SE COMPLÈTE, ELLE NE SE RÉÉCRIT PAS.
        //
        // Rémy : « si je me rends compte qu'une séance est trop courte ou que
        // les élèves vont trop vite, puis-je la compléter ? ».
        //
        // ON ÉCRIVAIT ICI `if (dejaLa.has(id)) continue;` — la séance de
        // l'élève était écrite UNE FOIS et jamais relue. MESURÉ sur le chemin
        // réel (`tools/seanceQuiChange.mjs`) : le professeur complétait, Tom
        // qui avait déjà la séance gardait 2 étapes même après rechargement,
        // et Emma qui ouvrait après en avait 3. Deux élèves de la même classe,
        // la même séance, un contenu différent, et rien ne le disait.
        //
        // `complementDeSeance` dit ce qu'on a le droit d'ajouter, et il est
        // STRICT : seulement des étapes EN PLUS À LA FIN, jamais sur une
        // séance close. Retirer ou rerégler une étape déjà donnée rendrait le
        // bilan menteur — et pour enlever un exercice à une classe qui bute,
        // c'est la dispense qui est faite pour ça.
        const existante = parId.get(id);
        if (existante) {
            // OÙ EN EST-IL DANS CETTE SÉANCE-LÀ ? La question décide de tout.
            //
            // ON LA POSE AU JOURNAL, et non à `state.studentPath` : celui-ci ne
            // porte que le DERNIER parcours ouvert. Un élève qui a fait cinq
            // exercices lundi puis ouvert la séance de mardi n'a plus, en
            // mémoire vive, la moindre trace de lundi — et une retouche de
            // lundi passerait pour arrivant sur une séance jamais commencée.
            //
            // LES DEUX SOURCES SE COMPLÈTENT, et l'on prend leur réunion :
            // le journal garde tout mais se compacte, `studentPath.completed`
            // ne connaît qu'un parcours mais est toujours à jour. Se tromper
            // par EXCÈS d'étapes faites est sans danger — on refuse alors une
            // retouche qu'on aurait pu accepter ; se tromper par défaut
            // réécrirait du travail réel.
            const faites = etapesFaitesDeLaSeance(existante, journal.all());
            const enCours = state.studentPath;
            if (enCours && enCours.pathId && enCours.pathId === existante.pathId) {
                for (const sid of (enCours.completed || [])) faites.add(sid);
            }
            const maj = majDeSeance(existante,
                normalizePath(chemin, a.name || chemin.name), faites);
            if (maj) {
                const retouchee = appliquerLaMaj(existante, maj);
                const i = seances.indexOf(existante);
                if (i >= 0) seances[i] = retouchee;
                parId.set(id, retouchee);
                completees.push({ seance: retouchee, ajoutees: maj.ajoutees });
            }
            continue;
        }
        const parcours = normalizePath(chemin, a.name || chemin.name);
        const s = donnerSeance({ id: classeId, nom: distant.className || '' }, parcours, {
            titre: a.name || parcours.name,
            donneeLe: Date.now()
        });
        s.id = id;
        // L'IDENTITÉ VIENT DU SERVEUR, FIGÉE QUAND LA SÉANCE A ÉTÉ DONNÉE.
        //
        // On la recalculait ici, sur le contenu reçu. Tant que le parcours ne
        // bougeait pas, tout le monde tombait sur la même — mais dès qu'on
        // COMPLÈTE une séance, celui qui l'avait déjà garde l'ancienne et
        // celui qui la reçoit après en obtient une neuve. MESURÉ : Tom
        // « path_cDPF7NX », Emma « path_cK8LZGE », même séance, même contenu.
        // Le bilan de séance filtre les travaux sur cette identité
        // (`runsDeLaSeance`) : l'un des deux en tombait, sans un mot.
        //
        // LE REPLI RESTE, et il sert vraiment : une séance donnée AVANT que la
        // colonne n'existe n'en a pas. Elle retombe alors sur l'ancien calcul,
        // qui est exactement ce qu'elle avait déjà.
        s.pathId = a.pathIdentity || identiteDeParcours(parcours);
        // L'HORAIRE DU SERVEUR DEVIENT L'OUVERTURE DE LA SÉANCE. `due_at`
        // existait en base et ne servait à rien ; c'est lui qui portera
        // « imposée de 8 h à 9 h ».
        if (a.dueAt) {
            const t = Date.parse(String(a.dueAt).replace(' ', 'T') + 'Z');
            if (!Number.isNaN(t)) s.ouvreLe = t;
        }
        seances.push(s);
        parId.set(id, s);
        neuves.push(s);
    }
    if (neuves.length || completees.length) await ecrireSeances(seances);
    // ON ANNONCE LE COMPLÉMENT, ON NE LE GLISSE PAS. Deux exercices qui
    // apparaissent au milieu de l'heure sans un mot, c'est un élève qui croit
    // avoir mal lu — ou qui croit avoir fini et s'arrête.
    if (completees.length && typeof document !== 'undefined') {
        for (const c of completees) {
            document.dispatchEvent(new CustomEvent('seance_completee', { detail: c }));
        }
    }
    return { ecrites: neuves.length, seances: neuves,
             completees: completees.length,
             ajoutees: completees.reduce((n, c) => n + c.ajoutees, 0) };
}

/** À brancher une fois : le serveur parle, on range. */
let ecoute = false;

export function ecouterLesAssignations() {
    if (ecoute || typeof document === 'undefined') return;
    ecoute = true;
    document.addEventListener('assignments_received', async (e) => {
        const r = await recevoirLesAssignations(e.detail);
        if (!r.ecrites) return;
        // ON N'ARRACHE PAS L'ÉCRAN D'UN ÉLÈVE QUI TRAVAILLE.
        //
        // `seances_updated` fait redessiner l'accueil. Or une séance peut
        // arriver À N'IMPORTE QUEL MOMENT — la synchronisation tourne toutes
        // les dix secondes —, donc y compris au milieu d'une question. Le
        // redessin emportait alors le conteneur du meneur, et l'exercice en
        // cours s'arrêtait net, sans un mot.
        //
        // Mesuré : le harnais de bout en bout, qui fait travailler un élève
        // pendant que le professeur lui donne une séance, est tombé une fois
        // sur deux — « la question n'arrive pas » — dès que ce chemin a été
        // branché. En classe, ç'aurait été un élève sur deux qui perd sa
        // question, et personne pour comprendre pourquoi.
        //
        // La séance est DÉJÀ ÉCRITE quand on arrive ici : ne pas annoncer ne
        // perd rien, cela ne fait que retarder l'affichage jusqu'au moment où
        // l'élève relève la tête.
        if (state.activeSequenceRunner) return;
        document.dispatchEvent(new CustomEvent('seances_updated'));
    });
}
