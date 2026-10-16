// LE MOMENT — ce que le professeur décide pour toute la classe, chez l'élève.
//
// Rémy, deux demandes qui n'en font qu'une : « est-ce qu'il ne serait pas
// possible que lorsque les élèves se connectent, j'impose la séance, comme cela
// ils n'ont rien à lancer », et « pour le compte à rebours c'est pour terminer
// la séance ou mettre en pause (pour faire un peu de cours par exemple ou pour
// parler) ».
//
// Les deux passent par le même canal — l'état de séance, que le serveur glisse
// dans chaque réponse et que l'élève redemande toutes les dix secondes. Ce
// module est ce qu'il en FAIT à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROIS RÈGLES, ET CHACUNE RÉPARE UNE FAÇON DE GÂCHER UNE HEURE DE COURS.
//
// ON N'ARRACHE JAMAIS UNE QUESTION EN COURS. La séance imposée s'ouvre quand
// l'élève n'a rien commencé ; s'il travaille déjà sur ce parcours-là, on ne
// touche à rien. Le contraire ferait perdre sa réponse à un élève au hasard,
// toutes les dix secondes, sans que personne ne comprenne.
//
// LE CHRONO S'AFFICHE EN GRAND ET NE DEMANDE RIEN. Un compte à rebours qu'il
// faut aller chercher n'est pas un compte à rebours. Il est en haut, il est
// lisible du fond de la salle, et il rougit dans la dernière minute.
//
// LA PAUSE NE FERME PAS LE TRAVAIL, elle le couvre. Rémy veut « faire un peu de
// cours ou parler » : quand il rend la main, l'élève doit retrouver sa question
// exactement où elle était. Une pause qui perd le travail en cours n'est pas
// une pause, c'est une punition.

import { state } from '../core/state.js';
import {
    etatSeance, seanceImposee, tempsRestant, classeEnPause
} from '../core/seanceDistante.js';
import { normalizePath } from '../core/path.js';
// LA MÊME DÉFINITION QUE LE NOYAU, ET NON UNE SECONDE. J'en avais écrit une
// ici, sans trier les clés : deux étapes identiques écrites dans un ordre
// différent — ce qui arrive après un simple aller-retour JSON, donc à CHAQUE
// synchronisation — passaient pour différentes, et l'ajout n'arrivait jamais.
// Trois épreuves l'ont dit d'un coup. Une règle écrite deux fois finit
// toujours par diverger ; celle-ci a divergé avant même d'être relue.
import { memeEtape } from '../core/seances.js';
import { resolvePolicy } from '../core/policy.js';
import { identiteDeParcours } from '../core/shortcodes.js';

let pose = false;
let minuteur = null;
let dernierImpose = '';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** « 07:12 » — et jamais « 432 secondes ». */
export function enMinutes(secondes) {
    const s = Math.max(0, Math.floor(secondes));
    const m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// ────────────────────────────────────────────── LA SÉANCE IMPOSÉE ───────────

/**
 * FAUT-IL OUVRIR LA SÉANCE IMPOSÉE, ET POURQUOI PAS.
 *
 * Séparé de l'ouverture elle-même parce que c'est la DÉCISION qui compte et
 * qu'elle doit pouvoir s'éprouver sans navigateur. Les trois refus sont les
 * trois façons d'arracher son travail à un élève.
 *
 * @returns {{ouvrir:boolean, pourquoi:string}}
 */
export function fautIlOuvrir(impose, parcoursCharge, enTrainDeTravailler, seanceChargee = null) {
    if (!impose || !impose.path) return { ouvrir: false, pourquoi: 'rien-impose' };
    if (enTrainDeTravailler) return { ouvrir: false, pourquoi: 'il-travaille' };
    // ── LA SÉANCE RETOUCHÉE EN PLEINE HEURE NE REPART PAS DE ZÉRO ──────────
    //
    // RÉMY : « j'ai modifié un parcours pendant une séance avec mes élèves et
    // ils travaillaient sur le parcours en modifiant le parcours (juste une
    // option), ça a remis à zéro tous les élèves ».
    //
    // CE QUI SE PASSAIT, ET POURQUOI C'ÉTAIT INÉVITABLE. L'identité d'un
    // parcours est une empreinte de son CONTENU (`identiteDeParcours`) :
    // changer une option change l'empreinte. Trois lignes plus bas, la
    // comparaison ne reconnaissait donc plus le parcours chargé, et la séance
    // était rouverte — un nouveau `PATH_ASSIGNED`, une nouvelle identité. Or
    // les étapes faites se recomptent en filtrant le journal sur cette
    // identité (`computeAssignedPath`, js/core/projections.js) : elles
    // disparaissaient toutes, d'un coup, chez toute la classe.
    //
    // ON COMPARE DONC LA SÉANCE, PAS SON CONTENU. `impose.pathId` est
    // l'identifiant de la LIGNE du parcours au serveur (`paths.id`) : il ne
    // bouge pas quand on retouche le contenu, et c'est exactement ce qu'il
    // faut ici — « est-ce la même séance ? » et non « est-ce le même texte ? ».
    //
    // CE QUE CELA COÛTE, ET POURQUOI ON LE PAIE. L'élève qui a DÉJÀ ouvert la
    // séance garde la version qu'il a ; la retouche ne l'atteint plus pendant
    // l'heure. Celui qui l'ouvre après, lui, reçoit la nouvelle — c'est le cas
    // « + un exercice », qui continue de marcher. Entre « la retouche arrive à
    // tout le monde » et « personne ne perd son travail », la règle du dépôt
    // tranche depuis le début : ON N'ARRACHE JAMAIS CE QUI EST COMMENCÉ.
    if (seanceChargee && impose.pathId && seanceChargee === impose.pathId) {
        return { ouvrir: false, pourquoi: 'meme-seance' };
    }
    // LA MÊME RÈGLE QUE POUR L'OUVERTURE, ET IL FAUT QUE CE SOIT LA MÊME :
    // `ouvrirLaSeanceImposee` range le travail sous l'identité FIGÉE par le
    // serveur quand il y en a une. Comparer ici à une empreinte recalculée
    // reviendrait à se demander « est-ce le même parcours ? » avec une autre
    // définition que celle qui a servi à l'enregistrer.
    const identite = identiteImposee(impose, normalizePath(impose.path, impose.name));
    if (parcoursCharge && parcoursCharge === identite) {
        return { ouvrir: false, pourquoi: 'deja-dessus' };
    }
    return { ouvrir: true, pourquoi: 'a-ouvrir' };
}

/**
 * LA SÉANCE IMPOSÉE A-T-ELLE SIMPLEMENT GRANDI PAR LA FIN ?
 *
 * ── LA QUESTION DE RÉMY, MOT POUR MOT ──────────────────────────────────────
 *
 * « et si je rajoute un exercice dans le parcours qui est en cours (donc hors
 * classe dans la rubrique préparer) ça le rajoute au parcours en cours sans
 * tout écraser ? »
 *
 * LA RÉPONSE ÉTAIT « OUI, MAIS PAS PAR CETTE PORTE-LÀ ». Une séance DONNÉE se
 * complète déjà — `complementDeSeance` dans `core/seances.js`, mesuré par
 * `tools/seanceQuiChange.mjs`. Une séance IMPOSÉE, non : elle passe par ici,
 * et ici on ne savait que deux choses, ouvrir ou ne rien faire. Hier elle
 * écrasait tout (« ça a remis à zéro tous les élèves ») ; depuis ce matin elle
 * ne bouge plus du tout — ce qui est mieux, et insuffisant : l'exercice ajouté
 * n'atteignait plus personne.
 *
 * ON REPREND DONC LA RÈGLE DE `majDeSeance` (core/seances.js), QUI EST LA PLUS
 * FINE DES DEUX : ce qui est protégé n'est pas tout le début du parcours,
 * c'est CE QUE L'ÉLÈVE A DÉJÀ FAIT.
 *
 *   · les étapes jusqu'à la dernière terminée doivent se retrouver
 *     IDENTIQUES, à la même place — sinon on ne touche à rien, et son bilan
 *     continuerait sans cela de désigner d'autres exercices que les siens ;
 *   · au-delà, le professeur fait ce qu'il veut : ajouter, remplacer,
 *     rerégler. Personne n'y a encore travaillé.
 *
 * ET ON COMPARE LE CONTENU, PAS `stepId` : un parcours réenregistré garde ses
 * identifiants, un parcours réimporté en refabrique, et refuser alors un ajout
 * légitime serait le genre de défaut qui se diagnostique « ça ne marche jamais
 * chez moi ».
 *
 * POURQUOI NE PAS APPELER `majDeSeance` DIRECTEMENT : elle travaille sur une
 * SÉANCE — un objet qui a une échéance, un état, une date de retrait. Une
 * séance imposée n'a rien de tout cela : elle vit le temps de l'heure, et
 * `etatSeance` n'aurait pas de quoi répondre. On garde la règle, pas l'objet.
 *
 * @returns {Array|null} les étapes complètes à charger, ou `null`
 */
export function etapesEnPlus(impose, charge) {
    if (!impose || !impose.path || !charge) return null;
    const avant = charge.steps || [];
    const apres = (normalizePath(impose.path, impose.name).steps) || [];
    if (!avant.length || !apres.length) return null;

    // JUSQU'OÙ IL EST ALLÉ : le rang de la dernière étape terminée.
    const faites = new Set(charge.completed || []);
    let garde = 0;
    for (let i = 0; i < avant.length; i++) {
        if (faites.has(avant[i] && avant[i].stepId)) garde = i + 1;
    }
    if (apres.length < garde) return null;
    for (let i = 0; i < garde; i++) {
        if (!memeEtape(avant[i], apres[i])) return null;
    }
    // RIEN N'A BOUGÉ ? RIEN À ÉCRIRE. Sans cette sortie, chaque battement
    // réécrirait la séance — trente fois par classe et par minute.
    if (apres.length === avant.length && avant.every((e, i) => memeEtape(e, apres[i]))) {
        return null;
    }
    // CE QU'IL A FAIT GARDE SES PROPRES ÉTAPES, avec leurs `stepId` : ce sont
    // eux qui rattachent son travail.
    return apres.map((e, i) => (i < garde ? avant[i] : e));
}

/**
 * CHARGE LES ÉTAPES EN PLUS, SANS CHANGER D'IDENTITÉ.
 *
 * C'EST L'IDENTITÉ QUI PORTE LE TRAVAIL FAIT. `computeAssignedPath` recompte
 * les étapes terminées en filtrant le journal sur `pathId` — l'empreinte du
 * contenu. Réécrire la séance avec une empreinte NEUVE est exactement ce qui a
 * remis la classe de Rémy à zéro. On garde donc celle qu'il avait, qui est
 * aussi celle que le serveur a figée dans `assignments.path_identity` : les
 * trois restent d'accord, et l'étape ajoutée apparaît au bout du chemin.
 */
function completerLaSeanceImposee(impose, etapes, charge) {
    const parcours = normalizePath(impose.path, impose.name);
    state.setStudentPath(etapes, {
        pathId: charge.pathId,
        name: charge.name || parcours.name || impose.name || 'Séance',
        seanceId: impose.pathId || charge.seanceId || null,
        policy: resolvePolicy(parcours.policy)
    });
}

/**
 * SOUS QUEL NOM L'ÉLÈVE RANGE LE TRAVAIL D'UNE SÉANCE IMPOSÉE.
 *
 * CELLE QUE LE SERVEUR A FIGÉE, QUAND IL EN A UNE. L'identité est une empreinte
 * du CONTENU, et la recalculer à la réception donne des valeurs différentes
 * d'un élève à l'autre dès que la séance a été complétée entre-temps —
 * « Tom path_cDPF7NX, Emma path_cK8LZGE, même séance, même contenu » (voir
 * `path_identity` dans api/lib/schema.php). Les séances DONNÉES utilisent déjà
 * celle du serveur (`parcoursServeur.js`) ; les imposées la recalculaient
 * encore, et c'est ce qui vidait l'onglet « Par séance » du professeur —
 * mesuré par `tools/bilanParSeance.mjs`.
 *
 * ON GARDE LE REPLI : une séance imposée sans avoir été donnée, ou donnée
 * avant que la colonne n'existe, n'a pas d'identité au serveur. On recalcule
 * alors, exactement comme avant.
 */
function identiteImposee(impose, parcours) {
    return (impose && impose.identite) || identiteDeParcours(parcours);
}

function ouvrirLaSeanceImposee(impose) {
    const parcours = normalizePath(impose.path, impose.name);
    const id = identiteImposee(impose, parcours);
    state.setStudentPath(parcours.steps, {
        pathId: id,
        name: parcours.name || impose.name || 'Séance',
        // DE QUELLE SÉANCE CELA VIENT — l'identifiant stable du serveur, à côté
        // de l'empreinte du contenu. Il part au journal, donc il survit au
        // rechargement de la page : sans cela, un élève dont l'onglet se
        // recharge en pleine heure retomberait dans le défaut qu'on vient de
        // corriger. Voir `fautIlOuvrir`.
        seanceId: impose.pathId || null,
        policy: resolvePolicy(parcours.policy)
    });
    dernierImpose = id;
}

// ───────────────────────────────────────────────────── LE BANDEAU ───────────

function bandeau() {
    let el = document.getElementById('le-moment');
    if (!el) {
        el = document.createElement('div');
        el.id = 'le-moment';
        el.className = 'moment';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    return el;
}

function voile(afficher, texte) {
    let el = document.getElementById('le-moment-pause');
    if (!afficher) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'le-moment-pause';
        el.className = 'moment-pause';
        document.body.appendChild(el);
    }
    el.innerHTML = `<div class="moment-pause-carte">
        <div class="moment-pause-titre">Pause</div>
        <p>${esc(texte)}</p>
        <p class="moment-pause-note">Ton travail est gardé. Il reviendra exactement où tu l'as laissé.</p>
    </div>`;
}

function dessiner() {
    // ── LA PAUSE DEMANDÉE MAINTENANT PASSE AVANT TOUT ──────────────────────
    //
    // RÉMY : « je n'ai pas réussi à mettre toute la classe en pause ». Le voile
    // n'existait que comme ISSUE d'un compte à rebours ; il est maintenant un
    // geste à part entière, et il doit couvrir l'écran même s'il n'y a aucune
    // minuterie en cours — c'est précisément le cas où il le demande.
    //
    // ET IL L'EMPORTE SUR LE COMPTE À REBOURS : quand le professeur reprend la
    // parole, il reprend la parole. Les secondes continuent de courir dessous,
    // et le bandeau revient quand il rend la main.
    const p = classeEnPause();
    const t = tempsRestant();
    const el = bandeau();
    if (p) {
        voile(true, p.mot);
        if (!t) { el.hidden = true; return; }
    }
    if (!t) {
        el.hidden = true;
        if (!p) voile(false);
        return;
    }
    el.hidden = false;
    const fini = t.reste <= 0;
    el.classList.toggle('moment--rouge', t.reste <= 60 && !fini);
    el.classList.toggle('moment--fini', fini);

    if (fini && t.aZero === 'pause') {
        el.innerHTML = '<span class="moment-chrono">Pause</span>'
            + '<span class="moment-quoi">On écoute le professeur.</span>';
        voile(true, 'Le professeur a repris la parole.');
        return;
    }
    // ON NE LÈVE PAS LE VOILE QUE LE PROFESSEUR VIENT DE POSER : sans ce
    // garde-fou, un compte à rebours qui court le rouvrirait quatre fois par
    // seconde, et la classe ne pourrait plus être mise en pause pendant une
    // minuterie — c'est-à-dire pendant l'heure.
    if (!p) voile(false);
    if (fini) {
        el.innerHTML = '<span class="moment-chrono">Temps écoulé</span>'
            + '<span class="moment-quoi">On s\'arrête là.</span>';
        return;
    }
    el.innerHTML = `<span class="moment-chrono">${enMinutes(t.reste)}</span>`
        + `<span class="moment-quoi">${t.aZero === 'pause'
            ? 'À zéro, on s\'arrête pour écouter.'
            // ON NE RAMASSE PAS DE COPIES. Rémy : « c'est noté à Zéro on ramasse
            // les copies. Ne mets pas cela, ce sont pas des copies lol ». Il a
            // raison deux fois : il n'y a pas de feuille, et surtout rien à
            // rendre — le travail de l'élève est déjà parti au serveur à chaque
            // réponse. La phrase annonçait donc un geste qui n'existe pas, et
            // elle pouvait faire croire à l'élève qu'il lui restait quelque
            // chose à faire avant la fin.
            : 'À zéro, c\'est terminé.'}</span>`;
}

// ─────────────────────────────────────────────────────── LE FIL ─────────────

/**
 * ON REGARDE CHAQUE SECONDE, MAIS ON NE DEMANDE RIEN AU SERVEUR.
 *
 * Le décompte est local : le serveur a donné l'INSTANT de fin, chaque appareil
 * sait donc tout seul combien il reste. Une requête par seconde pour afficher
 * un chiffre qu'on peut calculer serait trente requêtes par seconde pour la
 * classe, et elles n'apprendraient rien à personne.
 */
function battre() {
    dessiner();
    // EN PAUSE, ON NE TERMINE RIEN. Le professeur a pris la parole ; que le
    // compte à rebours tombe pendant qu'il parle ne doit pas clore la séance
    // sous le voile, là où l'élève ne verrait même pas son bilan.
    if (classeEnPause()) return;
    const t = tempsRestant();
    if (t && t.reste <= 0 && t.aZero === 'terminer') terminerLeTravail();
}

let dejaTermine = false;

function terminerLeTravail() {
    if (dejaTermine) return;
    dejaTermine = true;
    // ON NE FERME PAS L'ÉCRAN DE FORCE. Le meneur sait clore proprement : il
    // enregistre ce qui a été fait, puis affiche son bilan. L'arracher
    // perdrait la dernière réponse — celle qu'on est en train de taper quand
    // la sonnerie tombe, et qui est toujours celle qui compte.
    //
    // ET LE BILAN, IL FAUT LE DEMANDER. Cette phrase était écrite ici depuis
    // le début ; elle était fausse. `finish(true)` marque le parcours
    // interrompu et sort AVANT le bilan — à juste titre pour l'élève qui
    // ferme son exercice, à tort pour celui que la sonnerie arrête. Il n'a
    // rien choisi, et c'est l'instant où il a le plus besoin de savoir ce
    // qu'il a réussi. Le journal garde `aborted: true` : le parcours n'est pas
    // allé au bout, et le professeur compte les séances terminées.
    const meneur = state.activeSequenceRunner;
    if (meneur && typeof meneur.finish === 'function') {
        try {
            meneur.finish(true, {
                bilanQuandMeme: 'Le temps est écoulé. Voici ce que tu as fait '
                    + 'jusque-là — ce n\'est pas une séance ratée, c\'est une '
                    + 'séance arrêtée.'
            });
        } catch (e) { /* déjà clos */ }
    }
}

function surEtat() {
    const impose = seanceImposee();
    const charge = state.studentPath ? state.studentPath.pathId : null;
    const travaille = !!state.activeSequenceRunner;
    const seance = state.studentPath ? (state.studentPath.seanceId || null) : null;
    const d = fautIlOuvrir(impose, charge, travaille, seance);
    if (d.ouvrir) ouvrirLaSeanceImposee(impose);
    // ── LA MÊME SÉANCE, MAIS PLUS LONGUE ────────────────────────────────────
    //
    // « ça le rajoute au parcours en cours sans tout écraser ? » — oui, et
    // c'est ici que ça se passe pour une séance IMPOSÉE. Seulement quand il ne
    // travaille pas : le meneur tient son propre parcours, et le changer sous
    // lui au milieu d'une question n'ajouterait rien, cela perdrait sa réponse.
    // Il recevra l'étape de plus en revenant sur la carte, ce qui est dans la
    // minute.
    else if (d.pourquoi === 'meme-seance' && !travaille) {
        const etapes = etapesEnPlus(impose, state.studentPath);
        if (etapes) completerLaSeanceImposee(impose, etapes, state.studentPath);
    }
    // Un nouveau chrono remet le droit de terminer : sans cela, une séance
    // chronométrée le matin empêcherait celle de l'après-midi de se clore.
    const t = tempsRestant();
    if (t && t.reste > 0) dejaTermine = false;
    dessiner();
}

/** À appeler une fois, au démarrage. Ne fait rien pour un élève non rattaché. */
export function initLeMoment() {
    if (pose || typeof document === 'undefined') return;
    pose = true;
    document.addEventListener('seance_distante', surEtat);
    clearInterval(minuteur);
    minuteur = setInterval(battre, 1000);
    surEtat();
}

/** Exposé pour les essais : l'état courant, tel que l'écran le voit. */
export function etatDuMoment() {
    return { seance: etatSeance(), chrono: tempsRestant(), impose: seanceImposee() };
}
