// CE QUE L'ÉLÈVE A SOUS LES YEUX, EN UNE LIGNE QUI VOYAGE.
//
// Rémy : « on ne peut jamais vraiment voir l'écran de l'élève, juste son
// exercice, car c'est créé de façon aléatoire. »
//
// Il répond là à une question que le code lui posait depuis des semaines. Dans
// `js/ui/espaceClasses.js`, au-dessus du bouton « Son exercice, chez moi »,
// était écrit : « Un vrai miroir de son écran reste un autre métier : il
// faudrait que l'élève envoie sa question au fil de l'eau, ce qui change ce qui
// voyage sur le réseau pendant l'heure. À décider ensemble. » C'est décidé.
//
// CE QU'IL MANQUAIT N'ÉTAIT PAS LE BOUTON — il existe, et il ouvre déjà la
// bonne étape avec les bons réglages. Ce qui manquait tient en huit caractères :
// LA GRAINE. Chaque question porte la sienne (`item.seed`), `makeRng(graine)`
// est reproductible, et le meneur sait déjà rejouer une question précise
// (`forceSeed`, dont la remédiation se sert). Tout était là ; rien ne
// transportait la graine de l'élève jusqu'au professeur.
//
// CE QUI VOYAGE, ET CE QUI NE VOYAGE PAS. Le relevé porte l'exercice, la
// graine, le texte de la question et l'avancement. Il ne porte NI la réponse
// que l'élève a écrite, NI son brouillon : ces choses-là partent déjà au
// journal quand il valide, et les faire voyager deux fois, c'est se donner deux
// occasions de les perdre.
//
// ET IL NE S'EMPILE PAS. Un événement de journal par question afficherait la
// question en cours au prix d'un doublement du journal — et le direct ne lit que
// les quarante derniers événements de chaque élève : on aurait acheté la
// question d'aujourd'hui avec la moitié de l'historique. Le relevé est donc UNE
// SEULE LIGNE, écrasée à chaque fois, portée par le battement de cœur qui
// existe déjà (`/session`, toutes les dix secondes). Zéro requête de plus, zéro
// événement de plus.

/**
 * COMBIEN DE TEMPS UN RELEVÉ VAUT ENCORE QUELQUE CHOSE.
 *
 * Trois minutes, et le chiffre se déduit des rythmes en place plutôt que du
 * goût : l'élève parle toutes les dix secondes quand son onglet est devant lui,
 * mais toutes les SOIXANTE quand il est derrière — et un élève qui lit son
 * cahier a son onglet derrière. Un seuil à deux minutes ferait donc clignoter
 * l'écran de celui qui réfléchit, ce qui est pire que de ne rien montrer :
 * c'est montrer faux.
 */
export const ECRAN_FRAIS_MS = 3 * 60 * 1000;

/**
 * LA QUESTION EST COUPÉE À DEUX CENT QUARANTE SIGNES.
 *
 * Quelques énoncés en font mille (les problèmes à plusieurs phrases). Le direct
 * en montre une ligne, et le professeur qui veut le reste a le bouton pour
 * ouvrir la question elle-même. Ce qui voyage trente fois toutes les dix
 * secondes doit rester petit.
 */
const QUESTION_MAX = 240;

const texteCourt = (v) => {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    return s.length > QUESTION_MAX ? s.slice(0, QUESTION_MAX - 1) + '…' : s;
};

/** Le relevé en cours. Une seule ligne, écrasée — jamais une liste. */
let releve = null;

/**
 * FABRIQUER UN RELEVÉ PROPRE À PARTIR DE CE QU'ON LUI DONNE.
 *
 * Fonction pure, et c'est volontaire : c'est elle que les essais interrogent.
 * Elle rend `null` quand il n'y a rien à dire — sans exercice, un relevé ne
 * raconte rien, et le direct préfère « il n'est sur aucun exercice » à une
 * ligne vide qui a l'air d'une panne.
 *
 * @param {object|null} quoi
 * @param {number} [quand] instant du relevé, en millisecondes
 */
export function releveDEcran(quoi, quand = Date.now()) {
    if (!quoi || !quoi.exerciseId) return null;
    const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
    const out = {
        exerciseId: String(quoi.exerciseId),
        // LA GRAINE EST LA RAISON D'ÊTRE DE TOUT CECI. Elle peut manquer — un
        // jeu qui tire ses nombres sans la dire —, et le relevé reste utile : on
        // saura quel exercice, on ne saura pas quelle question. Le direct le
        // dira, plutôt que de faire croire à un miroir.
        graine: quoi.graine ? String(quoi.graine) : null,
        question: quoi.question ? texteCourt(quoi.question) : null,
        etape: quoi.etape ? String(quoi.etape) : null,
        // SES RÉGLAGES À LUI, et non ceux qu'on devine. La graine ne rejoue une
        // question qu'à réglages égaux — voir `reglagesQuiVoyagent`.
        reglages: reglagesQuiVoyagent(quoi.reglages),
        fait: n(quoi.fait),
        total: n(quoi.total),
        ts: quand
    };
    return out;
}

/** Est-ce encore ce qu'il a sous les yeux, ou une vieille nouvelle ? */
export function ecranFrais(ecran, maintenant = Date.now()) {
    if (!ecran || !ecran.ts) return false;
    // UN RELEVÉ VENU DU FUTUR EST FRAIS, et ce n'est pas de la complaisance :
    // l'horloge d'une tablette mal réglée avance de dix minutes, et le refuser
    // ferait disparaître l'élève de l'écran du professeur — la panne qu'on a
    // déjà payée une fois sur « en ligne » (voir `maintenant` dans le direct).
    return maintenant - ecran.ts < ECRAN_FRAIS_MS;
}

/**
 * CE QUE LE PROFESSEUR LIT D'UN COUP D'ŒIL.
 *
 * Une phrase, pas un objet : le direct affiche trente élèves, et trente objets
 * à déplier ne se lisent pas. La phrase dit la question quand on l'a, et sinon
 * elle dit qu'on ne l'a pas — jamais rien qui ressemble à une question.
 */
export function phraseDeLEcran(ecran, maintenant = Date.now()) {
    if (!ecran) return null;
    if (!ecranFrais(ecran, maintenant)) return null;
    if (ecran.question) return ecran.question;
    if (ecran.etape) return ecran.etape;
    return ecran.graine ? 'Une question sans énoncé écrit (un jeu).' : null;
}

/**
 * L'ÉLÈVE DIT CE QU'IL VOIT. Appelée par le meneur à chaque question.
 *
 * On ne réécrit pas un relevé identique : le battement de cœur enverra de toute
 * façon le dernier, et remettre l'horodatage à zéro pour la même question
 * ferait croire à un élève actif alors qu'il n'a pas bougé. C'est le seul
 * endroit où l'on compare avant d'écrire, et c'est pour cela.
 */
export function direQuOnVoit(quoi, quand = Date.now()) {
    const neuf = releveDEcran(quoi, quand);
    if (!neuf) { releve = null; return null; }
    // LES RÉGLAGES COMPTENT DANS LA COMPARAISON : le professeur peut changer un
    // palier en direct, et l'écran de l'élève change alors sans que la question
    // ni la graine bougent. Les oublier ici, c'est garder le relevé d'avant.
    const memesReglages = JSON.stringify(releve && releve.reglages)
        === JSON.stringify(neuf.reglages);
    if (releve && releve.exerciseId === neuf.exerciseId && releve.graine === neuf.graine
        && releve.question === neuf.question && releve.etape === neuf.etape
        && releve.fait === neuf.fait && memesReglages) {
        return releve;
    }
    releve = neuf;
    return releve;
}

/** Ce qu'on voit, pour l'envoyer. `null` quand on ne voit rien. */
export function ceQuOnVoit() {
    return releve;
}

/**
 * ON NE VOIT PLUS RIEN — fin d'exercice, sortie, retour au menu.
 *
 * Il faut le dire, et ne pas simplement laisser le relevé vieillir : trois
 * minutes pendant lesquelles le professeur croirait l'élève sur une question
 * qu'il a quittée, c'est trois minutes de conseil donné à côté.
 */
export function oublierLEcran() {
    releve = null;
}

/**
 * LE RELEVÉ TEL QUE LE SERVEUR LE REND — et la seule conversion d'unité.
 *
 * DEUX HORLOGES, DEUX UNITÉS, ET C'EST UNE SONDE QUI L'A TROUVÉ. Le relevé
 * fabriqué ici porte un `ts` en MILLISECONDES, parce qu'il vient de
 * `Date.now()`. L'API, elle, dit tous ses instants en SECONDES — « En secondes,
 * comme partout ailleurs dans l'API : voir `instantDe` » —, et elle a raison de
 * s'y tenir. Le même nom de champ portait donc deux unités.
 *
 * MESURÉ dans `tools/memeQuestion.mjs` : l'élève annonçait « Quelle opération
 * est prioritaire dans 5 + 8 × 3 ? » avec sa graine, le serveur la gardait, et
 * la fiche du professeur n'affichait RIEN — l'écart entre les deux unités fait
 * un relevé vieux de cinquante ans, donc périmé, donc muet. Aucun essai
 * unitaire ne pouvait le voir : les deux côtés étaient justes séparément.
 *
 * La conversion vit ici, à un seul endroit, et elle porte un nom : tout ce qui
 * arrive du serveur passe par cette fonction avant d'être jugé frais.
 */
export function ecranDuServeur(ecran) {
    if (!ecran || !ecran.ts) return null;
    return { ...ecran, ts: Number(ecran.ts) * 1000 };
}

/**
 * LES RÉGLAGES DE L'ÉLÈVE, TAILLÉS POUR LE VOYAGE.
 *
 * Rémy : « ce serait aussi vraiment cool dans le direct de pouvoir avoir le
 * même exercice avec les mêmes paramètres que l'élève ».
 *
 * CE QUI MANQUAIT AU RELEVÉ, ET POURQUOI ÇA MARCHAIT QUAND MÊME. La graine
 * rejoue une question — à réglages ÉGAUX. Le professeur, lui, reconstituait les
 * réglages en cherchant l'exercice dans SES parcours (`etapeDeLaSeance`). C'est
 * une bonne devinette, et elle tombe juste la plupart du temps : c'est bien lui
 * qui a réglé l'étape. Elle tombe à côté dès que l'élève n'est pas là où on le
 * croit — une partie du bac à sable, un exercice ouvert librement, une étape
 * modifiée depuis, ou le même exercice présent dans dix parcours avec dix
 * réglages. L'écran le disait à demi-mot : « Réglages du catalogue : cet
 * exercice n'est pas dans la séance donnée. »
 *
 * MÊME GRAINE ET AUTRES RÉGLAGES DONNENT UNE AUTRE QUESTION. Le générateur lit
 * les deux ; changer le palier, c'est changer les nombres tirés. La devinette
 * pouvait donc produire un écran qui RESSEMBLE à celui de l'élève sans être le
 * sien — et un miroir presque juste est pire qu'un miroir absent, parce qu'on
 * ne sait pas lequel on regarde.
 *
 * CE QU'ON GARDE. Les réglages sont de la configuration, pas des données
 * d'élève ; ils pèsent peu (MESURÉ sur les 216 exercices du catalogue : médiane
 * 31 signes, neuvième décile 71, maximum 125 — `geo-programme-construction`).
 * On borne quand même, parce que ce qui traverse le réseau vient d'un client :
 * seules les valeurs simples passent, et un tableau de valeurs simples ; le
 * reste est écarté sans bruit.
 */
const REGLAGES_MAX_CLEFS = 40;
const REGLAGES_MAX_SIGNES = 900;

export function reglagesQuiVoyagent(params) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return null;
    const simple = (v) => ['string', 'number', 'boolean'].includes(typeof v);
    const out = {};
    let n = 0;
    for (const [cle, v] of Object.entries(params)) {
        if (n >= REGLAGES_MAX_CLEFS) break;
        if (v === null) { out[cle] = null; n++; continue; }
        if (simple(v)) { out[cle] = v; n++; continue; }
        // UN TABLEAU DE VALEURS SIMPLES PASSE, et il le faut : beaucoup de
        // réglages sont des listes de paliers cochés — c'est exactement ce qui
        // change la question.
        if (Array.isArray(v) && v.every(simple)) { out[cle] = v.slice(0, 40); n++; }
        // Tout le reste (objets imbriqués, fonctions) est écarté sans bruit :
        // aucun `paramSchema` du catalogue n'en produit, et un relevé n'est pas
        // l'endroit où l'on découvre qu'il y en a un.
    }
    if (!Object.keys(out).length) return null;
    // ET L'ON BORNE LE TOUT. Trente élèves toutes les dix secondes : ce qui
    // voyage doit rester petit, même si quelqu'un invente un jour un réglage
    // démesuré.
    return JSON.stringify(out).length > REGLAGES_MAX_SIGNES ? null : out;
}
