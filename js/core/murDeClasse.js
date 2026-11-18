// CE QU'UNE TUILE DU MUR DIT, ET COMMENT SON ANNEAU SE DESSINE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre, devant trois maquettes : « mets la maquette en réglage
// j'aime bien le C ».
//
// ── POURQUOI CES DEUX FONCTIONS SONT AU NOYAU ET NON DANS L'INTERFACE ─────
//
// Elles vivaient dans `js/ui/espaceClasses.js`, au milieu de six mille lignes
// qui touchent au DOM. Impossible à éprouver sous Node, donc éprouvées par une
// sonde Playwright — et une sonde ne voit QUE l'état que la classe d'essai lui
// montre. Or la classe d'essai est, par construction, celle où personne ne
// travaille : tous les anneaux à zéro, tous les élèves hors ligne. Les cinq
// états que ces fonctions distinguent — travaille, ralentit, bloqué, a fini,
// parti — n'y apparaissent jamais.
//
// J'AI PERDU UNE HEURE À ESSAYER DE FAIRE TRAVAILLER CINQ ÉLÈVES depuis une
// sonde, en pilotant leurs jeux au clavier, pour obtenir des anneaux non nuls.
// C'était le mauvais outil : ce qu'on voulait vérifier n'est pas que le jeu
// marche — il a ses propres sondes — mais que la TUILE dit la bonne chose pour
// chaque état. Sorties ici, les deux fonctions se posent les cinq questions en
// deux millisecondes, et la sonde garde ce qu'elle seule sait dire : les
// tailles en pixels, la barre collée, le réglage qui tient.
//
// Aucun DOM, aucun import d'interface : ce fichier rend des chaînes.

/**
 * L'ANNEAU DE PROGRESSION — la jauge plate, enroulée.
 *
 * POURQUOI UN ANNEAU ET PLUS UN TRAIT. Une jauge plate de cinq pixels dit
 * « plutôt vers la gauche » ou « plutôt vers la droite » ; elle ne se LIT pas
 * à deux mètres, et c'est à deux mètres qu'on regarde ce mur — Rémy est
 * debout, il marche entre les rangs.
 *
 * LE POURCENTAGE EST ÉCRIT, PAS SEULEMENT DESSINÉ : « 60 » et « 65 » font deux
 * arcs qu'aucun œil ne distingue, et c'est pourtant la différence entre
 * « il avance » et « il a presque fini ».
 *
 * EN SVG ET NON EN CSS : un dégradé conique aurait suffi à peindre l'arc, mais
 * pas à poser le nombre au centre sans un second élément positionné, ni à
 * garder le trait d'épaisseur constante quand la tuile change de taille.
 *
 * @param {number} pourcent 0 à 100 — borné ici, jamais par l'appelant
 * @param {number} [taille] côté du carré, en pixels
 */
export function anneauSvg(pourcent, taille = 54) {
    const p = Number.isFinite(pourcent) ? Math.max(0, Math.min(100, pourcent)) : 0;
    const r = (taille - 7) / 2, c = 2 * Math.PI * r;
    return `<svg class="ec-anneau" width="${taille}" height="${taille}"`
        + ` viewBox="0 0 ${taille} ${taille}" aria-hidden="true" focusable="false">`
        + `<circle class="ec-anneau-fond" cx="${taille / 2}" cy="${taille / 2}" r="${r}"/>`
        + `<circle class="ec-anneau-part" cx="${taille / 2}" cy="${taille / 2}" r="${r}"`
        + ` stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}"`
        + ` transform="rotate(-90 ${taille / 2} ${taille / 2})"/>`
        + `<text class="ec-anneau-nb" x="${taille / 2}"`
        + ` y="${(taille / 2 + taille * 0.1).toFixed(1)}" text-anchor="middle">`
        + `${Math.round(p)}</text></svg>`;
}

/**
 * CE QUE LA TUILE ÉCRIT SOUS LE NOM — deux fragments, et jamais plus.
 *
 * `enBref` rend « Étape 2 sur 4 — 3 / 6 », qui est juste et illisible à deux
 * mètres. Une tuile ne porte pas une phrase : elle porte CE QU'IL FAIT, puis
 * OÙ IL EN EST, l'un sous l'autre et chacun court.
 *
 * L'ORDRE DES CAS EST UNE DÉCISION. Un élève bloqué sur un exercice est
 * d'abord BLOQUÉ : « 3 / 8 » ne demande rien, « rien depuis 4 min » fait
 * traverser la salle. L'état qui appelle un geste passe donc devant
 * l'avancement, même quand les deux sont connus.
 *
 * @param {{etat:string, silence?:number}} v l'élève vu par `core/vigilance.js`
 * @param {object|null} av son avancement
 * @param {(s:number)=>string} depuis la mise en mots d'une durée
 * @returns {{quoi:string, ou:string}}
 */
export function quoiEtOu(v, av, depuis) {
    const quoi = (av && av.pathName) || '';
    if (v.etat === 'bloque' || v.etat === 'ralenti') {
        return { quoi, ou: 'rien depuis ' + depuis(v.silence) };
    }
    if (v.etat === 'parti') return { quoi, ou: 'hors ligne' };
    // PAS D'AVANCEMENT DU TOUT : on n'écrit pas le nom d'un exercice qu'il
    // n'a pas ouvert. « pas commencé » sous le titre d'une séance se lit
    // comme « il en est au début de celle-ci », ce qui est faux.
    if (v.etat === 'pas-commence' || !av) return { quoi: '', ou: 'pas commencé' };
    // FINI : ON ÉCRIT LA NOTE, pas « terminé ». Rémy regarde ce mur pour
    // décider s'il passe à la suite, et « 9 / 10 » décide, « terminé » non.
    if (av.etat === 'fini') return { quoi, ou: `${av.justes} / ${av.questions}` };
    const e = av.etapeEnCours;
    if (e && e.prevues) return { quoi, ou: `${e.posees} / ${e.prevues}` };
    const total = av.etapes || 1;
    return { quoi, ou: `étape ${Math.min((av.faites || 0) + 1, total)} sur ${total}` };
}
