// « ÇA NE MARCHE PAS » — ce que l'élève envoie quand il est bloqué.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « penses-tu qu'il serait possible d'ajouter un bouton désactivable ou
// non qui permet à l'élève d'envoyer un bug et de prendre une photo d'écran ? »
//
// UNE VRAIE CAPTURE D'ÉCRAN N'EXISTE PAS SUR UN IPHONE, et il faut le dire
// avant tout le reste, parce que c'est ce qui décide de la forme de ce module.
// Trois chemins, et les trois se ferment :
//
//   · `navigator.mediaDevices.getDisplayMedia` — la vraie capture, celle qui
//     rend les pixels que l'oeil voit. Safari sur iOS ne l'a pas du tout. Et là
//     où elle existe (un ordinateur), elle ouvre un sélecteur de fenêtres :
//     un élève de sixième y choisirait n'importe quoi, y compris un autre
//     onglet — on lui ferait envoyer un écran qui n'est pas le sien.
//   · UNE BIBLIOTHÈQUE (html2canvas et ses pareilles). « On n'ajoute pas de
//     dépendance sans une raison qu'on peut écrire », et la raison ne tient
//     pas : 180 ko pour un dessin APPROXIMATIF, qui redessine le DOM à sa façon
//     et se trompe précisément sur ce qu'on cherche — la police, le débordement,
//     le clavier qui recouvre l'énoncé.
//   · LE SVG `foreignObject` PEINT DANS UN CANEVAS, le même tour en trente
//     lignes. Il ne charge aucune police extérieure : la capture montrerait un
//     autre texte que l'écran. Et je ne peux pas le mesurer sur l'appareil qui
//     compte — c'est Safari sur iOS qui décide, et il n'est pas ici.
//
// ALORS ON RETOURNE LA QUESTION. L'élève, lui, SAIT prendre une photo de son
// écran : deux boutons sur un iPhone, une touche sur un ordinateur. Ce que le
// logiciel ne sait pas FAIRE, il sait le RECEVOIR — `<input type="file"
// accept="image/*">` ouvre la photothèque sur un téléphone et le sélecteur de
// fichiers ailleurs, sans une ligne de dépendance. La photo est alors celle que
// l'élève a vraiment vue, clavier compris.
//
// ET CE QUI VAUT PLUS QUE LA PHOTO PART TOUT SEUL : LE CONTEXTE.
//
// Une image dit à quoi ressemblait l'écran. Le contexte, lui, le REJOUE. Le
// relevé de `js/core/ecran.js` porte l'exercice, LA GRAINE et les réglages ;
// avec eux, Rémy rouvre la question exacte de l'élève sur son propre écran, et
// il peut cliquer dedans. Le bouton « Sa question, chez moi » existe déjà dans
// le direct, et il marche pour la même raison.
//
// C'est aussi pour cela que le contexte n'est pas facultatif et que la photo
// l'est : sans photo, un signalement reste réparable ; sans contexte, « ça
// bugue en calcul » n'est pas reproductible, et ce qui n'est pas reproductible
// n'est pas corrigé.

import { ceQuOnVoit } from './ecran.js';
import { apiEleve, isActive } from './sync.js';
import { reglageSite } from './reglagesSite.js';

/**
 * COMBIEN DE SIGNES LE RÉCIT DE L'ÉLÈVE PEUT PESER.
 *
 * Miroir exact de `SIGNAL_CORPS_MAX` au serveur. Le champ compte ici pour que
 * l'élève VOIE qu'il approche de la limite ; le serveur coupe pour que la borne
 * existe même sans ce champ-là.
 */
export const CORPS_MAX = 1000;

/** Miroir de `SIGNAL_IMAGE_MAX` : ce que le serveur accepte, en octets. */
export const IMAGE_MAX = 400000;

/**
 * LE CÔTÉ LE PLUS LONG D'UNE PHOTO ENVOYÉE.
 *
 * Une capture d'iPhone 15 fait 1179 × 2556 en PNG, soit deux à quatre
 * mégaoctets — dix fois ce que le serveur accepte. Ramenée à 1280 de haut en
 * JPEG, elle en fait cent à deux cent cinquante kilo-octets, et l'on y lit
 * encore le texte d'un énoncé : c'est le seul critère qui compte, puisqu'on
 * regarde cette image pour lire ce qui est écrit dessus.
 */
const COTE_MAX = 1280;

/** Le réglage du professeur. `null` tant que le serveur n'a rien dit. */
export function signalementOuvert() {
    return reglageSite('signalement') === true;
}

/**
 * LE BOUTON A-T-IL UNE RAISON D'EXISTER SUR CET ÉCRAN ?
 *
 * DEUX CONDITIONS, ET LA SECONDE EST AUSSI IMPORTANTE QUE LA PREMIÈRE. Le
 * réglage dit si le professeur l'a ouvert ; le rattachement dit s'il y a
 * quelqu'un pour recevoir. Un AtoutMath ouvert sans classe — le mode libre, une
 * clé USB, l'Atelier — n'a personne à prévenir : le bouton y serait un bouton
 * qui ne fait rien, ce qui est pire que pas de bouton.
 */
export function peutSignaler() {
    return signalementOuvert() && isActive();
}

/**
 * CE QU'ON JOINT AU SIGNALEMENT SANS RIEN DEMANDER À L'ÉLÈVE.
 *
 * FONCTION PURE, et c'est volontaire : c'est elle que les épreuves interrogent,
 * et elle ne doit pas avoir besoin d'un navigateur pour dire ce qu'elle range.
 * L'appelant lui donne ce qu'il a lu à l'écran ; elle décide de ce qui voyage.
 *
 * CE QUI N'Y EST PAS, ET POURQUOI. Ni le prénom ni l'identifiant : le serveur
 * les connaît par le jeton, et les écrire ici les ferait voyager deux fois.
 * Ni la réponse en cours : elle part déjà au journal, et l'écran de signalement
 * n'est pas l'endroit où l'on récupère du travail.
 */
export function contexteDuSignalement(vu = {}) {
    const txt = (v, max) => {
        const s = String(v ?? '').replace(/\s+/g, ' ').trim();
        return s ? s.slice(0, max) : null;
    };
    const ctx = {
        // LE RELEVÉ D'ÉCRAN EN ENTIER, tel qu'il part déjà au battement de
        // cœur : exercice, graine, énoncé abrégé, réglages. C'est lui qui rend
        // la question reproductible, donc c'est lui qui vaut le plus ici.
        ecran: vu.ecran || null,
        // DE QUOI SAVOIR SI LE DÉFAUT DÉPEND DU THÈME. Rémy, devant une figure
        // invisible : « il faut faire attention aux contrastes selon les modes
        // si on a pris mode nuit ou non ». Sans cette ligne, il faudrait
        // redemander à l'élève, qui aura changé de thème entre-temps.
        theme: txt(vu.theme, 20) || 'clair',
        // LA TAILLE DE L'ÉCRAN, parce que la moitié des défauts d'affichage
        // n'existent qu'en dessous de 768 px — c'est la largeur qui fait passer
        // ce logiciel au doigt.
        largeur: Number.isFinite(vu.largeur) ? Math.round(vu.largeur) : null,
        hauteur: Number.isFinite(vu.hauteur) ? Math.round(vu.hauteur) : null,
        // LA VERSION RÉELLEMENT CHARGÉE, et non celle du dépôt. Un élève dont le
        // navigateur garde l'ancienne version signale un défaut déjà corrigé :
        // sans ce numéro, on le cherche pendant une heure dans du code où il
        // n'est plus.
        version: txt(vu.version, 20),
        url: txt(vu.url, 200),
        navigateur: txt(vu.navigateur, 200),
        // CE QUE LA CONSOLE A CRIÉ, s'il y a eu de quoi crier. Trois lignes : ce
        // qui compte est la PREMIÈRE erreur, celles d'après en découlent le plus
        // souvent. Un signalement n'est pas un journal de console — celui-ci
        // existe déjà, et Rémy sait l'ouvrir.
        erreurs: Array.isArray(vu.erreurs)
            ? vu.erreurs.slice(-3).map(e => txt(e, 240)).filter(Boolean)
            : []
    };
    if (!ctx.erreurs.length) delete ctx.erreurs;
    return ctx;
}

/**
 * RÉTRÉCIR UNE PHOTO AVANT DE L'ENVOYER.
 *
 * ON RÉTRÉCIT CHEZ L'ÉLÈVE, PAS AU SERVEUR, et pour une raison qui n'est pas la
 * place occupée : c'est le RÉSEAU du collège. Envoyer quatre mégaoctets depuis
 * un téléphone sur le wifi d'un établissement prend le temps qu'il faut pour
 * que l'élève croie que rien ne part et appuie une deuxième fois.
 *
 * ELLE REND `null` PLUTÔT QUE DE LEVER. Une photo illisible, un format que le
 * navigateur ne sait pas ouvrir, un canevas refusé : dans les trois cas, le
 * texte et le contexte doivent partir quand même. Perdre le signalement parce
 * que la photo n'a pas pu être lue serait perdre le plus au profit du moins.
 *
 * @param {File|Blob} fichier
 * @returns {Promise<string|null>} une URL `data:` JPEG, ou `null`
 */
export async function retrecirLaPhoto(fichier) {
    if (!fichier || !fichier.type || !fichier.type.startsWith('image/')) return null;
    let image = null;
    try {
        // `createImageBitmap` DÉCODE HORS DU FIL PRINCIPAL là où il existe, ce
        // qui évite de figer l'écran une seconde sur un téléphone. Safari le
        // connaît depuis longtemps ; le repli couvre le reste.
        image = typeof createImageBitmap === 'function'
            ? await createImageBitmap(fichier)
            : await parBalise(fichier);
    } catch (e) {
        try { image = await parBalise(fichier); } catch (e2) { return null; }
    }
    if (!image || !image.width || !image.height) return null;

    const k = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const l = Math.max(1, Math.round(image.width * k));
    const h = Math.max(1, Math.round(image.height * k));
    try {
        const cv = document.createElement('canvas');
        cv.width = l; cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) return null;
        // UN FOND BLANC SOUS LA PHOTO : un PNG transparent devient noir en JPEG,
        // et une capture d'écran de navigateur en porte souvent un coin.
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, l, h);
        ctx.drawImage(image, 0, 0, l, h);
        // ON REDESCEND LA QUALITÉ TANT QUE C'EST TROP LOURD, plutôt que de
        // refuser. Une capture très détaillée dépasse la borne à 0,72 ; à 0,5
        // elle passe, et l'on y lit toujours le texte — c'est tout ce qu'on lui
        // demande. Trois essais, pas plus : au-delà, c'est que la photo n'est
        // pas une capture d'écran.
        for (const q of [0.72, 0.55, 0.4]) {
            const url = cv.toDataURL('image/jpeg', q);
            if (url.length <= IMAGE_MAX) return url;
        }
        return null;
    } catch (e) {
        return null;
    } finally {
        if (image && typeof image.close === 'function') image.close();
    }
}

/** Le repli quand `createImageBitmap` manque : une balise, un objet URL. */
function parBalise(fichier) {
    return new Promise((ok, non) => {
        const url = URL.createObjectURL(fichier);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); ok(img); };
        img.onerror = () => { URL.revokeObjectURL(url); non(new Error('image illisible')); };
        img.src = url;
    });
}

/**
 * ENVOYER LE SIGNALEMENT.
 *
 * Rend `{ ok: true, photo }` ou `{ erreur }` — une phrase en français, comme
 * partout ailleurs dans ce dépôt : c'est un élève qui la lira, au moment précis
 * où quelque chose vient déjà de ne pas marcher.
 */
export async function envoyerSignalement({ corps, image = null, erreurs = [] } = {}) {
    const texte = String(corps || '').trim().slice(0, CORPS_MAX);
    if (!texte) return { erreur: 'Dis en un mot ce qui ne va pas.' };
    if (!isActive()) {
        return { erreur: "Tu n'es pas rattaché à une classe : personne ne recevrait ce message." };
    }
    try {
        const r = await apiEleve('/signalement', {
            corps: texte,
            // LES ERREURS VIENNENT DE L'APPELANT, ET C'EST VOULU. La capture de
            // console vit dans `js/ui/consoleLog.js` ; l'importer ici ferait
            // dépendre le noyau d'un module d'interface, et TOUTES les épreuves
            // de ce fichier tomberaient sur « document is not defined ».
            contexte: contexteDuSignalement({ ...ceQuOnRegarde(), erreurs }),
            image: image || null
        });
        return { ok: true, photo: !!(r && r.photo) };
    } catch (e) {
        // ON NE PERD PAS CE QU'IL A ÉCRIT. L'appelant garde le texte à l'écran
        // et propose de réessayer : un élève qui a tapé trois phrases pour
        // expliquer une panne ne doit pas les retaper à cause d'une seconde.
        return { erreur: "Le message n'est pas parti — le réseau, sans doute. "
            + 'Ton texte est toujours là : essaie encore dans un instant.' };
    }
}

/**
 * CE QU'ON LIT À L'ÉCRAN AU MOMENT DE L'ENVOI.
 *
 * Séparée d'`envoyerSignalement` pour que celle-ci reste lisible, et gardée
 * privée parce qu'elle a besoin d'un navigateur : c'est `contexteDuSignalement`
 * qui porte la décision, et c'est elle que les épreuves interrogent.
 */
function ceQuOnRegarde() {
    const vu = { ecran: ceQuOnVoit() };
    try {
        vu.theme = document.documentElement.getAttribute('data-theme') || 'clair';
        vu.largeur = window.innerWidth;
        vu.hauteur = window.innerHeight;
        vu.url = location.href;
        vu.navigateur = navigator.userAgent;
        vu.version = versionChargee();
    } catch (e) { /* pas de navigateur : le relevé suffit */ }
    return vu;
}

/**
 * LE NUMÉRO DE VERSION RÉELLEMENT CHARGÉ, lu sur l'adresse d'une feuille de
 * style — la même lecture que `js/ui/consoleLog.js`, et pour la même raison :
 * c'est le seul endroit où l'on trouve ce que le NAVIGATEUR a en mémoire,
 * plutôt que ce que le dépôt contient.
 */
function versionChargee() {
    const lien = [...document.querySelectorAll('link[rel=stylesheet]')]
        .map(l => (l.getAttribute('href') || '').match(/[?&]v=(\d+)/))
        .find(Boolean);
    return lien ? `v${lien[1]}` : null;
}
