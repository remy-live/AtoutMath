// LA SÉANCE PILOTÉE PAR LE PROFESSEUR — côté élève.
//
// Rémy, en une phrase : « vérouiller la partie élève pour qu'il n'ait accès
// qu'a ce que je leur donne, la possibilité d'envoyer un message
// individuellement, d'avoir un vrai contrôle sur ce qu'ils font, pouvoir
// supprimer ou autoriser le saut d'un exercice au cas où un exercice plante et
// empeche la progression. »
//
// Le serveur répond à tout cela par un seul objet — l'état de séance — qu'il
// glisse dans chaque réponse de synchronisation (voir `api/lib/seance.php`).
// Ce module le RANGE et le REND LISIBLE ; il ne dessine rien, et c'est ce qui
// permet de le tester sans navigateur.
//
// IL SURVIT AU RECHARGEMENT, et ce n'est pas un détail. La synchro répond en
// une demi-seconde au mieux ; sans mémoire, un élève qui recharge sa page verrait
// le catalogue entier pendant cette demi-seconde, ce qui est exactement ce que
// le verrou est censé empêcher. L'état est donc relu du stockage local AVANT le
// premier échange, et rafraîchi ensuite.
//
// CE QUE CE VERROU EST, ET CE QU'IL N'EST PAS. Il tient la classe sur le
// travail donné, comme une consigne au tableau. Il ne résiste pas à un élève
// qui ouvre les outils du navigateur — rien de ce qui s'exécute chez lui ne le
// peut. Ce qui est vraiment tenu, c'est le serveur : un élève écarté ne se
// rattache plus, et personne ne lit le travail d'un autre.

import { globalStore } from './store.js';
import { getActiveProfile } from './profile.js';

const CLE = 'seanceDistante';

const VIDE = {
    className: '', classCode: '',
    locked: false, notice: null, blocked: false,
    messages: [], skippable: [], removed: [],
    // LES EXERCICES OÙ LE PROFESSEUR VIENT D'ACCORDER LA CALCULATRICE — et
    // l'exercice `*`, qui veut dire « toute la séance ». Voir
    // `calculatriceAccordee`.
    calculatrice: [],
    // LE MOMENT EN COURS : la séance imposée, et le compte à rebours.
    impose: null, chrono: null,
    // Le bac à sable de ceux qui ont fini. FERMÉ est le cas particulier :
    // ouvert par défaut, une fonction qu'il faut allumer n'est pas découverte.
    bacFerme: false,
    // L'HEURE DU SERVEUR au moment où il a répondu, et l'heure qu'il était ICI
    // à cet instant. Les deux ensemble donnent l'écart entre les horloges, et
    // c'est ce qui permet d'afficher le même chiffre sur trente appareils dont
    // aucun n'est réglé pareil. Un seul des deux ne servirait à rien.
    maintenant: 0, recuA: 0
};

let etat = { ...VIDE };
let charge = false;

/**
 * Relit ce qu'on savait avant la fermeture de l'onglet.
 *
 * MAIS SEULEMENT SI CE PROFIL EST ENCORE RATTACHÉ À UNE CLASSE. Sans cette
 * condition, un verrou survivait à la classe qui l'avait posé : le professeur
 * essaie l'application sur la tablette d'un élève, se rattache à une classe
 * verrouillée, puis change de profil — et l'appareil reste verrouillé pour
 * toujours, sans serveur pour le rouvrir puisqu'il n'y a plus de jeton. Le
 * verrou appartient au rattachement ; sans rattachement, il n'existe pas.
 */
export async function initSeanceDistante() {
    if (charge) return etat;
    charge = true;
    const profil = getActiveProfile();
    if (!(profil && profil.remote && profil.remote.token)) {
        // On efface aussi ce qui restait : un état orphelin ne doit pas
        // ressusciter si l'on se rattache un jour à une autre classe.
        await globalStore.set(CLE, null).catch(() => {});
        return etat;
    }
    const garde = await globalStore.get(CLE, null);
    if (garde) {
        etat = { ...VIDE, ...garde };
        prevenir();
    }
    return etat;
}

/**
 * Le serveur vient de parler. On garde, on annonce.
 *
 * On annonce MÊME SI RIEN N'A CHANGÉ ? Non : la synchro tourne toutes les cinq
 * minutes et à chaque rafale de réponses, et redessiner la bannière à chaque
 * fois ferait clignoter une consigne que personne n'a touchée. On compare donc
 * le contenu, pas la date.
 */
export function appliquerEtat(nouveau, recuA = Math.floor(Date.now() / 1000)) {
    if (!nouveau || typeof nouveau !== 'object') return etat;
    const avant = JSON.stringify(etat);
    etat = { ...VIDE, ...nouveau, recuA };
    globalStore.set(CLE, etat).catch(() => {});
    if (JSON.stringify(etat) !== avant) prevenir();
    return etat;
}

function prevenir() {
    document.dispatchEvent(new CustomEvent('seance_distante', { detail: { ...etat } }));
}

/**
 * TOUT OUBLIER DE LA CLASSE — à la déconnexion, et nulle part ailleurs.
 *
 * LE PIÈGE EST INVISIBLE, ET IL FALLAIT CETTE FONCTION POUR LE FERMER. La
 * consigne, le verrou, la séance imposée et le compte à rebours sont gardés SUR
 * L'APPAREIL, exprès : c'est ce qui permet à un élève de continuer quand le
 * réseau tombe. Mais sans les effacer en partant, le suivant qui s'assied
 * devant la même machine se retrouve verrouillé par une classe dont il ne fait
 * pas partie, avec un compte à rebours qui n'est pas le sien — et personne ne
 * comprend pourquoi.
 *
 * On efface AUSSI la marque sur `<body>` : le verrou est une classe CSS, et une
 * classe CSS ne disparaît pas parce que l'état qui l'a posée a disparu.
 */
export async function oublierLaClasse() {
    etat = { ...VIDE };
    await globalStore.set(CLE, null).catch(() => {});
    if (typeof document !== 'undefined') {
        document.body.classList.remove('classe-verrouillee');
        document.getElementById('consigne-prof')?.remove();
        document.getElementById('indices-du-prof')?.remove();
        document.getElementById('le-moment')?.remove();
        document.getElementById('le-moment-pause')?.remove();
    }
    prevenir();
}

export function etatSeance() {
    return { ...etat };
}

export function estVerrouille() {
    return !!etat.locked;
}

export function estEcarte() {
    return !!etat.blocked;
}

export function consigneDuProf() {
    return etat.notice || '';
}

/** Le professeur a-t-il fermé le bac à sable pour cette heure ? */
export function bacFerme() { return !!etat.bacFerme; }

export function messagesNonLus() {
    return Array.isArray(etat.messages) ? etat.messages.slice() : [];
}

/**
 * LES MOTS D'UN CÔTÉ, LES INDICES DE L'AUTRE — parce qu'ils ne s'affichent pas
 * de la même façon.
 *
 * Le mot prend l'écran et se ferme d'un « J'ai lu » : c'est ce qu'il faut pour
 * « arrêtez tout, on corrige au tableau ». L'indice se pose à CÔTÉ de la
 * question : interrompre un élève pour lui souffler « regarde la retenue »
 * détruirait exactement la pensée qu'on veut aider.
 *
 * Un message sans genre est un mot — c'est ce qu'ils étaient tous avant.
 */
const genreDe = (m) => (m && m.genre === 'indice' ? 'indice' : 'mot');
export function motsNonLus() { return messagesNonLus().filter(m => genreDe(m) === 'mot'); }
export function indicesNonLus() { return messagesNonLus().filter(m => genreDe(m) === 'indice'); }

/**
 * CE QUE VOIT L'ÉLÈVE — ET LE PROFESSEUR NE VOIT RIEN DE TOUT CELA.
 *
 * Rémy : « je teste chez moi Safari pour l'élève et Chrome pour moi ; quand
 * j'envoie un mot genre Coucou, il apparaît en popup sur mon espace aussi ».
 *
 * SON NAVIGATEUR EST LES DEUX À LA FOIS, ET C'EST NORMAL. Une machine qui a
 * servi à essayer le côté élève garde son rattachement — c'est voulu, c'est
 * ce qui permet de continuer quand le réseau tombe. Elle continue donc de
 * recevoir la consigne, le verrou et les mots de la classe, même pendant que
 * son propriétaire est en mode professeur.
 *
 * ET RENVOYER À QUELQU'UN LE MOT QU'IL VIENT D'ÉCRIRE N'EST PAS QU'UNE GÊNE :
 * la fenêtre ne se ferme que par « J'ai lu », et ce bouton POSE L'ACCUSÉ DE
 * LECTURE. Le professeur, en se débarrassant de sa propre fenêtre, cochait
 * lui-même le mot comme lu — sa console lui disait alors qu'un élève l'avait
 * lu, ce qui était faux, et c'est sur cette coche qu'il décide de redire ou
 * non la consigne à voix haute.
 *
 * LA RÈGLE EST DONC ÉCRITE ICI, EN UN SEUL ENDROIT, et non répartie dans les
 * cinq affichages de l'écran. `rendre()` en faisait cinq appels indépendants ;
 * un sixième ajouté demain aurait réintroduit le défaut sans que rien ne le
 * dise. Ici, il n'y a qu'une porte, et elle est fermée d'un côté.
 *
 * ON NE JETTE RIEN, ON N'ACQUITTE RIEN : le professeur qui repasse côté élève
 * — pour montrer quelque chose à la classe — retrouve tout intact.
 *
 * @param {object} [opts] { professeur: bool }
 */
export function ceQueVoitLEleve(opts = {}) {
    if (opts.professeur) {
        return { consigne: '', verrouille: false, ecarte: false, mots: [], indices: [] };
    }
    return {
        consigne: consigneDuProf(),
        verrouille: estVerrouille(),
        ecarte: estEcarte(),
        mots: motsNonLus(),
        indices: indicesNonLus()
    };
}

/**
 * L'EXERCICE RETIRÉ DU PARCOURS. Le geste du professeur qui a constaté qu'un
 * exercice plante : il disparaît, comme s'il n'y avait jamais été. C'est plus
 * net que de le laisser en place grisé — un élève de sixième essaierait quand
 * même de cliquer dessus.
 */
/**
 * LA SÉANCE IMPOSÉE — ce que l'élève doit ouvrir sans rien choisir.
 * @returns {{pathId:string, name:string, path:object}|null}
 */
export function seanceImposee() {
    return etat.impose || null;
}

/**
 * COMBIEN DE SECONDES RESTE-T-IL, corrigé de l'écart entre les horloges.
 *
 * Le serveur envoie l'INSTANT de fin et l'heure qu'il était chez lui ; on note
 * l'heure qu'il était ici à la réception. La différence est l'écart, et il ne
 * bouge plus. Sans cette correction, une tablette réglée dix minutes en avance
 * afficherait « temps écoulé » pendant que la classe travaille encore.
 *
 * @returns {{reste:number, aZero:string}|null} `reste` en secondes, jamais négatif
 */
export function tempsRestant(maintenant = Math.floor(Date.now() / 1000)) {
    if (!etat.chrono || !etat.chrono.finAt) return null;
    // ON NE CORRIGE QUE SI LES DEUX HEURES SONT DE VRAIES HEURES.
    //
    // L'écart n'a de sens que si le serveur a bien envoyé la sienne. Sur un
    // serveur plus ancien — ou sur un état fabriqué à la main — le champ est
    // absent, et le prendre pour zéro ferait croire à un décalage de
    // cinquante-six ans : le compte à rebours afficherait alors n'importe quoi,
    // ce qui est pire que de ne rien afficher. Un milliard et demi de secondes
    // depuis 1970, c'est 2017 : en dessous, ce n'est pas une heure, c'est une
    // valeur qui traîne.
    const VRAIE_HEURE = 1.5e9;
    const ecart = (etat.maintenant > VRAIE_HEURE && etat.recuA > VRAIE_HEURE)
        ? (etat.maintenant - etat.recuA) : 0;
    const reste = etat.chrono.finAt - (maintenant + ecart);
    return { reste: Math.max(0, reste), aZero: etat.chrono.aZero || 'terminer' };
}

export function estRetire(exerciceId) {
    return !!exerciceId && etat.removed.includes(exerciceId);
}

/**
 * LE SAUT AUTORISÉ. L'exercice reste, mais un bouton « passer » apparaît :
 * l'élève qui s'y casse les dents continue son parcours, et l'étape ne compte
 * ni pour ni contre lui — elle n'a aucune tentative, donc aucun poids dans la
 * note (voir `gradeRun`, qui agrège les tentatives et non les étapes).
 */
export function peutSauter(exerciceId) {
    return !!exerciceId && etat.skippable.includes(exerciceId);
}

/**
 * LA CALCULATRICE, ACCORDÉE EN DIRECT.
 *
 * RÉMY : « pourrait-on autoriser dans les options l'utilisation de la
 * calculatrice ou le permettre en direct à un groupe ou aux élèves (on pourrait
 * sélectionner dans le direct) ».
 *
 * TROIS PORTES MÈNENT À CE BOUTON, et elles ne se remplacent pas :
 *   · l'exercice l'autorise par nature (`exo.calculatrice`, dans le catalogue) ;
 *   · le professeur l'a cochée en construisant son parcours (réglage d'étape) ;
 *   · il vient de l'accorder, en pleine heure, à la classe ou à des élèves.
 *
 * C'est la troisième que cette fonction répond. L'exercice `*` vaut pour toute
 * la séance : c'est le « vous pouvez prendre la calculatrice » qu'on dit à voix
 * haute, et qui ne se répète pas à chaque exercice.
 */
export function calculatriceAccordee(exerciceId) {
    const liste = etat.calculatrice || [];
    if (!liste.length) return false;
    return liste.includes('*') || (!!exerciceId && liste.includes(exerciceId));
}

/** Retire du parcours les étapes que le professeur a supprimées. */
export function filtrerEtapes(etapes) {
    if (!etat.removed.length || !Array.isArray(etapes)) return etapes;
    return etapes.filter(e => !estRetire(e && e.exercise && e.exercise.id));
}

/**
 * « Je l'ai lu. » On l'enlève de la liste tout de suite — l'élève a fermé le
 * message, il ne doit pas le revoir même si le serveur ne répond pas — et l'on
 * prévient le serveur en arrière-plan, pour la coche du professeur.
 */
export async function direLu(ids) {
    const liste = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!liste.length) return;
    etat = { ...etat, messages: etat.messages.filter(m => !liste.includes(m.id)) };
    globalStore.set(CLE, etat).catch(() => {});
    prevenir();
    try {
        const { apiEleve } = await import('./sync.js');
        await apiEleve('/messages/read', { ids: liste });
    } catch (err) {
        // Le message est lu chez l'élève, et c'est le principal. Le professeur
        // verra « pas encore lu » — un défaut d'affichage, pas une perte.
        console.info('[séance] accusé de lecture reporté :', err.message);
    }
}
