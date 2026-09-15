// LA VIGILANCE — qui a besoin qu'on vienne, et dans quel ordre.
//
// Rémy : « un système "d'alarme si un élève est inactif" ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// UNE ALARME QUI SONNE AU MAUVAIS MOMENT SE FAIT COUPER, ET PLUS RIEN NE SONNE.
//
// C'est la seule chose qui compte dans ce fichier. Un tableau de bord qui
// signale trente élèves à la fois est un tableau de bord qu'on éteint le
// premier jour — et le jour où il aurait eu raison, il sera déjà éteint. Tout
// ce qui suit est donc une liste de refus : les moments où l'on NE signale PAS,
// alors même que l'élève ne répond plus.
//
// ON NE SIGNALE PAS PENDANT UNE PAUSE. Quand Rémy met la classe en pause pour
// expliquer quelque chose au tableau, personne ne répond — c'est le but. Sans
// ce refus, la pause allumerait trente alarmes d'un coup, exactement au moment
// où il parle et ne peut pas les lire. Il éteindrait la fonction le jour même.
//
// ON NE SIGNALE PAS CELUI QUI N'A PAS COMMENCÉ. Il n'est pas bloqué, il n'a
// rien ouvert — c'est un autre problème, et il se voit déjà ailleurs (« 3 pas
// commencé », en rouge, en haut du direct). Le mêler aux blocages noierait les
// vrais.
//
// ON NE SIGNALE PAS CELUI QUI A FINI. Son silence est la conclusion normale de
// son travail. C'est même la réponse inverse : il lui faut quelque chose à
// faire, et c'est le bac à sable.
//
// ON NE SIGNALE PAS CELUI QUI EST PARTI. Un élève hors ligne depuis six minutes
// n'est pas bloqué sur sa question : sa tablette est en veille, ou il est aux
// toilettes. Le dire « bloqué » enverrait le professeur vers une chaise vide.
//
// ET ON NE SIGNALE PAS TROP TÔT. Une division posée, une construction, un
// problème à lire deux fois : trois minutes de silence sont du travail, pas un
// blocage. Le seuil par défaut est à CINQ minutes, et l'on distingue celui qui
// ralentit de celui qui a décroché — les deux n'appellent pas le même geste.

/** En secondes. Choisis pour une heure de cours, pas pour un tableau de bord. */
export const SEUILS = {
    /** Au-delà, il ralentit : on garde un œil. */
    ralenti: 5 * 60,
    /** Au-delà, il a décroché : on y va. */
    bloque: 10 * 60,
    /** Au-delà, il n'est plus là — c'est le seuil de présence du serveur. */
    parti: 90
};

/**
 * DEPUIS COMBIEN DE TEMPS CET ÉLÈVE N'A PLUS RIEN FAIT.
 *
 * `quand` est l'instant du dernier événement portant un exercice — la dernière
 * réponse, donc. En millisecondes, comme tout le journal ; `maintenant` est en
 * secondes, comme l'heure du serveur. La conversion se fait ICI, une fois,
 * plutôt que dans chaque écran qui s'en sert.
 */
export function silenceDe(eleve, maintenant) {
    if (!eleve || !eleve.quand || !maintenant) return 0;
    return Math.max(0, maintenant - Math.round(eleve.quand / 1000));
}

/**
 * CE QU'IL FAUT PENSER DE CET ÉLÈVE, EN UN MOT.
 *
 * @param {object} eleve   une ligne du direct : { vu, quand, avancement, ecarte }
 * @param {number} maintenant  l'heure du SERVEUR, en secondes
 * @param {object} [contexte]  { enPause:boolean, seuils:{} }
 * @returns {{etat:string, silence:number, pourquoi:string}}
 *   etat : 'ok' | 'ralenti' | 'bloque' | 'fini' | 'parti' | 'pas-commence' | 'ecarte'
 */
export function vigilanceDe(eleve, maintenant, contexte = {}) {
    const seuils = { ...SEUILS, ...(contexte.seuils || {}) };
    const silence = silenceDe(eleve, maintenant);
    const dire = (etat, pourquoi) => ({ etat, silence, pourquoi });

    if (!eleve) return dire('pas-commence', 'personne');
    if (eleve.ecarte) return dire('ecarte', 'mis de côté par le professeur');

    const av = eleve.avancement || null;
    if (av && av.etat === 'fini') return dire('fini', 'il a terminé sa séance');
    if (!av) return dire('pas-commence', 'il n\'a rien ouvert');

    // LA PAUSE D'ABORD, avant tout calcul de silence : c'est le refus qui sauve
    // la fonction. Trente alarmes pendant que le professeur parle au tableau, et
    // il éteint tout le même jour.
    if (contexte.enPause) return dire('ok', 'la classe est en pause');

    const absent = !eleve.vu || (maintenant - eleve.vu) > seuils.parti;
    if (absent) return dire('parti', 'il n\'est plus en ligne');

    if (silence >= seuils.bloque) return dire('bloque', 'plus rien depuis longtemps');
    if (silence >= seuils.ralenti) return dire('ralenti', 'il ralentit');
    return dire('ok', '');
}

/** Ceux qui appellent un geste, et eux seuls. */
const APPELLE = new Set(['bloque', 'ralenti']);

/** Du plus urgent au moins urgent — et c'est l'ordre où l'on va les voir. */
const RANG = { bloque: 0, ralenti: 1, parti: 2, 'pas-commence': 3, ok: 4, fini: 5, ecarte: 6 };

/**
 * QUI A BESOIN QU'ON VIENNE, DANS L'ORDRE.
 *
 * ON NE REND QUE CEUX QUI APPELLENT UN GESTE. Rendre les trente avec leur état
 * ferait une liste qu'il faut trier de l'œil — c'est le travail qu'on essaie
 * justement d'épargner au professeur qui marche dans les rangs.
 *
 * Le tri met le plus silencieux en premier à l'intérieur d'un même état : entre
 * deux élèves bloqués, celui qui l'est depuis douze minutes passe avant celui
 * qui l'est depuis dix.
 */
export function lesAlarmes(eleves, maintenant, contexte = {}) {
    return (eleves || [])
        .map(e => ({ ...vigilanceDe(e, maintenant, contexte), eleve: e }))
        .filter(v => APPELLE.has(v.etat))
        .sort((a, b) => (RANG[a.etat] - RANG[b.etat]) || (b.silence - a.silence));
}

/** L'ordre d'affichage du mur : ceux qui vont mal en premier. */
export function trierPourLeMur(eleves, maintenant, contexte = {}) {
    return (eleves || [])
        .map(e => ({ ...vigilanceDe(e, maintenant, contexte), eleve: e }))
        .sort((a, b) => (RANG[a.etat] - RANG[b.etat])
            || (b.silence - a.silence)
            || String(a.eleve.prenom || '').localeCompare(String(b.eleve.prenom || ''), 'fr'));
}

/**
 * LA PHRASE DE L'ALARME.
 *
 * Elle nomme les élèves. « 3 élèves sont arrêtés » oblige à chercher lesquels
 * dans trente lignes — et pendant qu'on cherche, on ne va voir personne.
 */
export function direLesAlarmes(alarmes) {
    const liste = alarmes || [];
    if (!liste.length) return '';

    // ON NE MÉLANGE PAS LES DEUX ÉTATS DANS LA MÊME PHRASE.
    //
    // « Maryam, Noé — certains n'ont plus rien fait depuis 13 min » est exact
    // et inutilisable : le professeur ne sait pas s'il doit se lever pour l'un,
    // pour l'autre, ou pour les deux. Or ce sont deux gestes différents — on va
    // voir celui qui est arrêté, on garde un œil sur celui qui ralentit.
    const bloques = liste.filter(a => a.etat === 'bloque');
    const lents = liste.filter(a => a.etat === 'ralenti');
    const bouts = [];
    if (bloques.length) {
        bouts.push(`${nommer(bloques)} ${bloques.length > 1 ? 'n\'ont' : 'n\'a'} plus rien fait `
            + `depuis ${Math.floor(bloques[0].silence / 60)} min.`);
    }
    if (lents.length) {
        bouts.push(`${nommer(lents)} ${lents.length > 1 ? 'ralentissent' : 'ralentit'}.`);
    }
    return bouts.join(' ');
}

/** « Amel, Bilal et 2 autres » — quatre noms au plus, le reste en nombre. */
function nommer(alarmes) {
    const noms = alarmes.slice(0, 4).map(a => a.eleve.prenom || '?');
    const reste = alarmes.length - noms.length;
    if (reste > 0) return noms.join(', ') + ` et ${reste} autre${reste > 1 ? 's' : ''}`;
    if (noms.length === 1) return noms[0];
    return noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1];
}
