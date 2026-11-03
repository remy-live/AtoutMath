// LE MODE DÉCOUVERTE — ce qu'on montre à qui arrive sans rien.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 3 novembre : « j'aimerai bien un mode démo dans l'accueil avec un
// apercu des exercices et aussi un mode qui montre et explique les
// possibilités ». Puis, devant la maquette : « les deux et pouvoir faire qqs
// exercices. »
//
// TROIS CHOSES DANS LE MÊME ÉCRAN, et elles ne répondent pas à la même
// question :
//
//   · LA VISITE répond à « qu'est-ce que ce logiciel sait faire ? ». Elle
//     s'adresse à un collègue, à un parent, à Rémy qui le présente en salle
//     des profs. Elle OUVRE LES VRAIS ÉCRANS — son choix : « on voit le
//     logiciel, pas une image de lui ».
//   · LA VITRINE répond à « à quoi ça ressemble ? ». Des cartes avec la vraie
//     figure du vrai exercice, tirée par le vrai générateur.
//   · ET L'ESSAI répond à « est-ce que c'est bien fait ? ». Trois questions,
//     pour de vrai, sans compte et sans trace.
//
// ── POURQUOI CE FICHIER NE CONNAÎT NI LE DOM NI L'ÉCRAN ────────────────────
//
// Il dit QUOI montrer et dans quel ordre. L'écran le dessine. C'est ce qui
// permet à une épreuve de vérifier, sans navigateur, que les douze exercices
// de la vitrine existent encore au catalogue — la liste vieillit, le catalogue
// bouge, et une vitrine qui renvoie vers un exercice disparu est le seul
// défaut qu'un visiteur verra de sa visite.

/**
 * LES EXERCICES DE LA VITRINE.
 *
 * RÉMY A CHOISI que ce soit moi qui compose : « une dizaine que je choisis »,
 * couvrant les domaines et les niveaux, et tenue à jour quand le catalogue
 * grandit.
 *
 * CE QUI A GUIDÉ LE CHOIX, et ce n'est pas « les plus jolis » :
 *
 *   · CHAQUE DOMAINE EST REPRÉSENTÉ — calcul, numération, fractions,
 *     géométrie, grandeurs, logique. Un visiteur doit pouvoir dire « ah, il y
 *     a aussi de la géométrie », et c'est tout l'objet d'une vitrine.
 *   · DU CM2 À LA TROISIÈME. Le logiciel sert au collège entier ; une vitrine
 *     qui ne montrerait que de la sixième ferait croire à un logiciel de
 *     sixième.
 *   · CHACUN MONTRE QUELQUE CHOSE QUE LES AUTRES NE MONTRENT PAS : une
 *     figure, un geste au doigt, une énigme, un clavier, une fiche. Deux
 *     exercices qui se jouent pareil n'apprennent rien de plus au visiteur.
 *   · ET TOUS SE JOUENT EN TROIS QUESTIONS. Un exercice qui demande dix
 *     minutes de mise en route n'est pas une démonstration.
 *
 * `pourquoi` est la phrase lue sur la carte : elle dit ce que l'exercice
 * travaille, pas ce qu'il fait faire.
 */
// LA PREMIÈRE VERSION DE CETTE LISTE DÉMENTAIT LE COMMENTAIRE CI-DESSUS :
// six exercices, tous de « Nombres et calculs », dont trois énigmes — ni
// géométrie, ni grandeurs, ni données, ni troisième. Je l'avais écrite en
// croyant couvrir, et c'est une mesure de dix lignes qui l'a dit. D'où
// l'épreuve qui garde maintenant la couverture : une vitrine se compose à la
// main, donc elle dérive, et personne ne s'en aperçoit en la relisant.
export const VITRINE = [
    { id: 'frac-lire', pourquoi: 'Une figure coloriée, une fraction à écrire — '
        + 'et des parts inégales pour finir.' },
    { id: 'geo-angles-manquants', pourquoi: 'Lire une figure et retrouver l\'angle '
        + 'qui manque, sans rapporteur.' },
    { id: 'logi-cavaliers', pourquoi: 'Échanger quatre cavaliers sur un damier 3 × 3. '
        + 'Seize coups, et c\'est le minimum.' },
    { id: 'mes-disque', pourquoi: 'Le périmètre et l\'aire d\'un disque, avec la '
        + 'figure sous les yeux.' },
    { id: 'logi-pentaminos', pourquoi: 'Des pièces de cinq cases à faire tenir dans '
        + 'un rectangle, sans trou.' },
    { id: 'don-statistiques', pourquoi: 'Lire une série, trouver la moyenne et '
        + 'l\'étendue — sur de vrais chiffres.' },
    { id: 'calc-add', pourquoi: 'Le calcul mental, avec le clavier du logiciel et '
        + 'les erreurs nommées.' },
    { id: 'num-relatifs-produit', pourquoi: 'La règle des signes, apprise par le '
        + 'signe avant le calcul.' },
    { id: 'alg-fonction-repere', pourquoi: 'Un tableau de valeurs, puis les points '
        + 'dans le repère — et la droite apparaît.' },
    { id: 'defi-trefles', pourquoi: 'Un défi qui se joue à tout âge, et qui ne '
        + 'ressemble à aucun exercice.' }
];

/**
 * LES ÉTAPES DE LA VISITE.
 *
 * Chacune OUVRE UN VRAI ÉCRAN — c'est le choix de Rémy —, avec une bulle qui
 * dit ce qu'on regarde. `ou` nomme la destination ; l'écran sait la traduire.
 *
 * L'ORDRE EST CELUI D'UNE HEURE DE COURS, et non celui des menus : on prépare,
 * on imprime ou on dicte, on regarde la classe avancer, on lit ce qui reste à
 * reprendre. Un visiteur suit une histoire, pas une arborescence.
 */
export const VISITE = [
    {
        id: 'parcours', titre: 'Un parcours',
        quoi: 'On empile des exercices, on règle le nombre de questions, et la '
            + 'séance est prête.',
        ou: 'atelier', bouton: 'Voir l\'écran'
    },
    {
        id: 'fiche', titre: 'Une fiche à imprimer',
        quoi: 'Le même exercice sur papier, avec son corrigé — et la figure, pas '
            + 'seulement le texte.',
        ou: 'fiche', bouton: 'Voir une fiche'
    },
    {
        id: 'code', titre: 'Un code dicté, ou un QR',
        quoi: 'Trois lettres à dire à voix haute, ou un carré à scanner : la classe '
            + 'est lancée en dix secondes.',
        ou: 'code', bouton: 'Voir le code'
    },
    {
        id: 'direct', titre: 'Le direct',
        quoi: 'Qui avance, qui bloque, sur quelle question — pendant l\'heure, pas '
            + 'après.',
        ou: 'direct', bouton: 'Voir le direct'
    },
    {
        id: 'bilan', titre: 'Ce que chacun sait',
        quoi: 'Par compétence et dans le temps, avec les erreurs nommées — pas une '
            + 'moyenne.',
        ou: 'bilan', bouton: 'Voir un bilan'
    },
    {
        id: 'horsligne', titre: 'Hors ligne',
        quoi: 'Une tablette préparée fonctionne sans internet, toute l\'heure.',
        ou: 'tablette', bouton: 'Comment faire'
    }
];

/**
 * LA VITRINE, VÉRIFIÉE CONTRE LE CATALOGUE.
 *
 * Rend les entrées jouables, et dit lesquelles ont disparu. On ne laisse JAMAIS
 * une carte morte à l'écran : un visiteur qui clique « Essayer » et tombe sur
 * rien n'a pas vu un exercice manquant, il a vu un logiciel cassé.
 *
 * @param {(id: string) => object|undefined} trouver  `getExerciseById`
 */
export function vitrineJouable(trouver) {
    const bonnes = [], perdues = [];
    for (const entree of VITRINE) {
        const exo = trouver(entree.id);
        if (exo) bonnes.push({ ...entree, exo });
        else perdues.push(entree.id);
    }
    return { bonnes, perdues };
}

/* LA LONGUEUR D'UN ESSAI N'EST PAS ICI : elle vit là où l'essai se joue, dans
   `js/ui/nouveautesUI.js`, et le mode découverte la lit de là. Deux écritures
   ont donné une bannière qui promettait trois questions au-dessus d'un essai
   qui en servait quatre. */

/**
 * CE QUE LA VITRINE COUVRE, pour que l'épreuve puisse le dire.
 *
 * Rend les domaines et les niveaux atteints par la sélection. On ne demande
 * pas la lune — certains domaines n'ont que quatre exercices — mais on exige
 * qu'aucun GRAND domaine ne manque et que la vitrine aille du CM2 à la
 * troisième : un visiteur qui ne verrait que de la sixième en conclurait un
 * logiciel de sixième.
 *
 * @param {(id: string) => object|undefined} trouver  `getExerciseById`
 */
export function couvertureDeLaVitrine(trouver) {
    const domaines = new Set(), niveaux = new Set();
    for (const { id } of VITRINE) {
        const exo = trouver(id);
        if (!exo || !exo.tags) continue;
        (exo.tags.chemin || []).slice(0, 1).forEach(d => domaines.add(d));
        (exo.tags.niveaux || []).forEach(n => niveaux.add(n));
    }
    return { domaines: [...domaines], niveaux: [...niveaux] };
}
