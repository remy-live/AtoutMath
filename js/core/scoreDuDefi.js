// LE SCORE DU DÉFI EN COURS, POSÉ ICI POUR QUE LE BATTEMENT L'EMPORTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après l'avoir lancé en classe : « Le défi ca cartonne, des idées dans
// ce style ». La barre de la classe et les deux équipes demandent de connaître
// le score de TRENTE ÉLÈVES PENDANT le défi — alors que chacun n'envoyait le
// sien qu'à la fin.
//
// ── POURQUOI CE MODULE DE QUATRE LIGNES EXISTE ────────────────────────────
//
// Le score est compté dans `ui/defiUI.js`, et il doit partir dans la requête
// de `core/sync.js`. Or `defiUI` importe déjà `sync` — pour envoyer le score
// final et redemander l'état. Faire importer `defiUI` par `sync` fermerait le
// cercle, et un cycle d'imports en modules natifs ne casse pas franchement :
// il rend une moitié de module indéfinie, à l'exécution, sans un mot.
//
// ON PASSE DONC PAR UNE BOÎTE AUX LETTRES, que les deux connaissent et qui ne
// connaît personne. C'est la plus petite chose qui résout le problème, et elle
// se lit en entier.
//
// ── ET POURQUOI PAS UNE REQUÊTE À PART ────────────────────────────────────
//
// Trente ardoises qui écriraient toutes les trois secondes, c'est la
// bousculade qu'on vient de corriger (voir `api/lib/db.php`), refaite exprès.
// Le battement passe de toute façon toutes les dix secondes ; le score tient
// en quatre nombres. C'est la même décision que pour l'écran de l'élève, qui
// voyage lui aussi dans cette requête-là plutôt que dans une route à lui.

let enCours = null;

/**
 * Pose le score du moment, ou l'efface avec `null` quand le défi est fini.
 *
 * @param {{bonnes:number, total:number, ms:number, points:number}|null} score
 */
export function poserLeScoreDuDefi(score) {
    enCours = score || null;
}

/** Ce que le battement doit emporter, ou `undefined` s'il n'y a rien à dire. */
export function leScoreDuDefi() {
    return enCours || undefined;
}
