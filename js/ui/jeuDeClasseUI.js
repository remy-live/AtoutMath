// QUI REGARDE SI LE PROFESSEUR A LANCÉ UN JEU — et qui ouvre le terrain.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Fais tout ». Les quatre jeux de classe se jouaient en démonstration,
// dans un seul navigateur. Ce fichier est la moitié manquante côté élève : il
// écoute le battement de séance, et le jour où une partie est annoncée, il la
// montre, l'attend, puis l'ouvre.
//
// ── IL EST ÉCRIT SUR LE MODÈLE DU DÉFI, ET CE N'EST PAS DE LA PARESSE ──────
//
// `ui/defiUI.js` résout EXACTEMENT les mêmes quatre questions, et il les a
// résolues en classe, devant trente élèves :
//
//   1. LE PROFESSEUR NE SE LANCE PAS UN JEU À LUI-MÊME. Son navigateur garde le
//      rattachement d'un essai côté élève, et sans ce garde il verrait le
//      terrain s'ouvrir par-dessus son écran du direct, au pire moment.
//   2. UNE PARTIE NE S'OUVRE QU'UNE FOIS PAR ARDOISE. La classe porte encore
//      `jeu_fin` une minute après la fin ; sans mémoire, l'élève qui recharge
//      sa page rouvrirait la partie finie.
//   3. ON ATTEND LE DÉPART ENSEMBLE. Le serveur annonce la partie douze
//      secondes à l'avance — le temps que les trente ardoises l'apprennent à
//      leur battement de séance, qui passe toutes les dix secondes.
//   4. L'HORLOGE EST CELLE DU SERVEUR. `jeuDeClasse()` corrige déjà l'écart
//      entre les montres, comme `defiEnCours`.
//
// ── CE QU'IL N'OUVRE PAS ENCORE ───────────────────────────────────────────
//
// LES TROIS JEUX VIFS. Leur terrain se remet en place au hasard LOCAL quand on
// ramasse un jeton — trente ardoises tireraient trente terrains différents, et
// un élève courrait vers un nombre que personne d'autre ne voit. Il faut les
// rendre fonction de la graine et de l'horloge avant de les brancher ici, et
// c'est le temps d'après. En attendant, une partie d'un de ces trois jeux
// annoncée par le serveur est IGNORÉE par cet écran : mieux vaut ne rien
// ouvrir qu'ouvrir un jeu qui ne serait pas le même pour tous.

import { jeuDeClasse } from '../core/seanceDistante.js';
import { ouvrirLeLien } from '../core/jeuDistant.js';
import { monIdentifiantEleve } from '../core/sync.js';
import { state } from '../core/state.js';

/** Les jeux que cet écran sait jouer en réseau, aujourd'hui. */
const EN_RESEAU = ['plateau'];

const NOMS = {
    plateau: 'Le plateau des nombres',
    chat: 'Le chat perché',
    ruee: 'La ruée',
    pluie: 'La pluie de nombres'
};

const CLE_FAITS = 'atoutmath-jeux-joues';

let partie = null;
let attente = null;
let fil = null;

export function initJeuDeClasseUI() {
    document.addEventListener('seance_distante', () => regarder());
    document.addEventListener('role_change', () => regarder());
    regarder();
}

function regarder() {
    if (state.isTeacherMode) {
        return;
    }
    const j = jeuDeClasse();
    if (!j) {
        // LE PROFESSEUR A ARRÊTÉ. L'écran se referme de lui-même : c'est ce
        // qu'il attend quand il appuie sur « Arrêter » devant la classe.
        quitterLAttente();
        return;
    }
    if (partie || attente) return;
    if (!EN_RESEAU.includes(j.type)) return;
    if (dejaJoue(j.debut)) return;
    noter(j.debut);
    if (j.avant > 0) attendreLeDepart(j); else lancer(j);
}

/* ─────────────────── CE QU'ON MONTRE AVANT LE DÉPART ──────────────────── */

/**
 * LE COMPTE À REBOURS DE L'ANNONCE.
 *
 * ON NE L'A PAS MIS POUR FAIRE JOLI. Douze secondes sont le temps qu'il faut
 * aux trente ardoises pour apprendre la partie ; sans écran d'attente, les
 * premières servies ouvriraient un terrain vide et les élèves croiraient que
 * ça ne marche pas. Là, les trente voient le même chiffre descendre.
 */
function attendreLeDepart(j) {
    const voile = document.createElement('div');
    voile.className = 'jdc-voile';
    voile.innerHTML = `
        <div class="jdc-carte">
            <div class="jdc-quoi">${echapper(NOMS[j.type] || 'Un jeu')}</div>
            <div class="jdc-compte" data-compte>${Math.max(1, j.avant)}</div>
            <div class="jdc-aide">Tenez votre tablette à deux mains.</div>
        </div>`;
    document.body.appendChild(voile);
    const jusqua = Date.now() + j.avant * 1000;
    attente = {
        voile,
        minuteur: setInterval(() => {
            const reste = Math.ceil((jusqua - Date.now()) / 1000);
            const b = voile.querySelector('[data-compte]');
            if (b) b.textContent = String(Math.max(0, reste));
            if (reste > 0) return;
            quitterLAttente();
            // ON RELIT LE JEU AU MOMENT D'OUVRIR, et non celui d'il y a douze
            // secondes : le professeur a pu l'arrêter entre-temps, et ouvrir un
            // terrain qu'il vient de fermer serait le plus déroutant des deux.
            const neuf = jeuDeClasse();
            if (neuf && EN_RESEAU.includes(neuf.type)) lancer(neuf);
        }, 200)
    };
}

function quitterLAttente() {
    if (!attente) return;
    clearInterval(attente.minuteur);
    attente.voile.remove();
    attente = null;
}

/* ────────────────────────── OUVRIR LE TERRAIN ─────────────────────────── */

async function lancer(j) {
    const r = j.reglages || {};
    // LE MODULE EST CHARGÉ AU MOMENT OÙ IL SERT, et non au démarrage de la
    // page : un élève qui ne joue aucune partie de l'année ne doit pas
    // télécharger le plateau. C'est la règle du dépôt pour tous les jeux.
    const { ouvrirLePlateau, brancherLaSortie } = await import('./plateauUI.js');
    const monId = monIdentifiantEleve();

    // ── ON OUVRE LE FIL D'ABORD, ET LE TERRAIN À SA PREMIÈRE RÉPONSE ──────
    //
    // POURQUOI PAS L'INVERSE, QUI SERAIT PLUS SIMPLE : parce que MON ÉQUIPE
    // n'est connue que du serveur. C'est lui qui répartit les trente par
    // `equipeDeLEleve`, et une ardoise ne peut pas la deviner — elle ne sait
    // pas qui d'autre est dans la classe. Or l'équipe décide de DEUX choses
    // qu'on ne peut pas corriger après coup sans que ça se voie : le bord d'où
    // je démarre, et l'équipe à qui comptent mes prises. Ouvrir avec « Bleu »
    // par défaut, c'est donner un nombre à la mauvaise équipe pendant la
    // seconde qui suit, devant la classe.
    //
    // CE QUE ÇA COÛTE : mon premier envoi pose un rond en (0, 0) avant que le
    // terrain existe, et les vingt-neuf autres le voient dans le coin. MESURÉ
    // sur cette route : trente millisecondes. On ne le verra pas.
    const ouvrir = (monde) => {
        partie = ouvrirLePlateau({
            graine: j.graine,
            operation: r.operation === '+' ? '+' : '×',
            style: r.style,
            quoi: r.quoi || {},
            noms: !!r.noms,
            penalite: r.penalite,
            // LE TERRAIN EST TAILLÉ POUR LA CLASSE ENTIÈRE, et ce nombre vient
            // du professeur : il doit être le même sur les trente ardoises,
            // donc il ne peut pas se déduire de qui s'est déjà connecté.
            robots: Math.max(1, Math.round(Number(r.joueurs) || 24)),
            secondes: j.reste,
            lien: fil,
            monEquipe: monde.moi ? monde.moi.equipe : 0,
            monId,
            surLaFin: () => { if (fil) fil.fermer(); }
        });
        brancherLaSortie(partie, () => fermer());
        // ET ON LUI DONNE TOUT DE SUITE CE MONDE-LÀ : il porte déjà les
        // positions des autres et les nombres déjà pris. Attendre le battement
        // suivant, c'est une seconde de terrain faux.
        partie.recevoirLeMonde(monde);
    };

    fil = ouvrirLeLien({
        monEtat: () => (partie ? partie.monEtat()
            : { x: 0, y: 0, nombre: 0, points: 0, malus: 0 }),
        surLeMonde: (monde) => {
            if (!monde) return;
            // ── LE PROFESSEUR A ARRÊTÉ, OU LE TEMPS EST TOMBÉ ─────────────
            //
            // ON FERME LE FIL, ET ON LAISSE L'ÉCRAN DE FIN. J'avais d'abord
            // écrit `fermer()`, qui enlève le terrain d'un coup : l'élève
            // voyait sa partie DISPARAÎTRE sans savoir qui avait gagné, et le
            // professeur ne pouvait plus rien annoncer. `terminer()` arrête le
            // jeu et affiche le score final ; c'est l'élève qui referme.
            //
            // MESURÉ PAR `tools/plateauEnClasse.mjs` : après l'arrêt, l'écran
            // de fin était sur 0 ardoise sur 3 — le voile entier avait été
            // retiré.
            if (!monde.jeu) {
                if (fil) { fil.fermer(); fil = null; }
                if (partie) partie.terminer();
                return;
            }
            if (!partie) ouvrir(monde); else partie.recevoirLeMonde(monde);
        }
    });
}

function fermer() {
    if (fil) { fil.fermer(); fil = null; }
    if (partie) { partie.fermer(); partie = null; }
}

/* ──────────────────── CE QUE CETTE ARDOISE A DÉJÀ JOUÉ ────────────────── */

function dejaJoue(debut) {
    try {
        return (sessionStorage.getItem(CLE_FAITS) || '').split(',').includes(String(debut));
    } catch (e) { return false; }
}

function noter(debut) {
    try {
        const vus = (sessionStorage.getItem(CLE_FAITS) || '').split(',').filter(Boolean);
        vus.push(String(debut));
        sessionStorage.setItem(CLE_FAITS, vus.slice(-20).join(','));
    } catch (e) { /* navigation privée : on rejouera, et c'est moins grave */ }
}

const echapper = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
