// PENDANT UN EXERCICE, LA PAGE DERRIÈRE N'EXISTE PLUS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI A ÉTÉ MESURÉ. Un exercice ouvert, on part de zéro et l'on appuie sur
// Tab : il faut VINGT ET UNE tabulations pour atteindre la première commande de
// l'exercice. Entre les deux, on traverse le titre, le badge de rôle, quatre
// onglets, le carnet, les trois icônes de droite, le compteur d'étoiles, puis
// les boutons de l'atelier — tous invisibles, tous recouverts par la couche de
// jeu, tous parfaitement atteignables au clavier.
//
// QUI EN PAIE LE PRIX. Celui qui ne se sert pas d'une souris, et celui qui lit
// l'écran à l'oreille. Le second est le pire des deux : un lecteur d'écran ne
// voit pas qu'une couche recouvre la page, il lit ce que le document contient —
// donc la barre du haut, le catalogue et le parcours, par-dessus l'exercice qui
// vient de s'ouvrir. L'élève entend l'application au complet avant d'entendre
// sa question.
//
// `inert` DIT LES DEUX CHOSES À LA FOIS : plus de clavier, plus de lecture
// d'écran, plus de clic. C'est l'attribut fait pour ça, et il évite d'avoir à
// tenir une liste de `tabindex="-1"` à jour avec le contenu de la page.
//
// ON N'OBSERVE PAS L'ATTRIBUT, ON OBSERVE L'ÉTAT. La couche de jeu s'ouvre et
// se ferme depuis six endroits différents — le moteur, le Runner, l'aperçu,
// l'Atelier, la revue, le retour à l'accueil — en posant `style.display`.
// Brancher les six, c'est en oublier un ; et le septième, écrit demain, serait
// muet à nouveau. On regarde donc ce que la couche EST, pas qui l'a changée.
//
// DEUX EXCEPTIONS, ET CHACUNE A SA RAISON.
//
//   · LES FENÊTRES (`.modal-overlay`) ne sont pas endormies : elles s'ouvrent
//     PAR-DESSUS l'exercice — les réglages, la confirmation d'abandon — et une
//     fenêtre inerte est une fenêtre où l'on ne peut ni écrire ni cliquer
//     « Annuler ». Elles ont déjà leur propre piège au clavier (ui/fenetre.js).
//   · LA PALETTE D'AUTEUR non plus. Rémy : « dans l'Atelier, je perds ma barre
//     de debug, je l'aime bien car on peut passer les questions. » Elle sert
//     précisément PENDANT l'exercice ; l'endormir reviendrait à la retirer au
//     moment où l'on s'en sert. Elle n'est de toute façon plus allumée que
//     pour celui qui l'a demandée (core/outilsAuteur.js).

/** Ce qu'on endort : la page, et rien d'autre. */
const DERRIERE = ['#top-navbar', '#app-body', '#bottom-nav'];

// ─── LE MENU DU NAVIGATEUR NE S'OUVRE PAS PAR-DESSUS UN EXERCICE ──────────
//
// RÉMY : « pour le météorites mathématiques quand on clique hors de la zone
// (le cercle en pointillés), ca montre le menu contextuel ».
//
// CE QUE L'ÉLÈVE VIT. Sur une tablette, l'appui long est un geste ordinaire :
// on pose le doigt pour viser, on hésite une seconde, et le système ouvre son
// menu « Copier / Rechercher / Partager » par-dessus le jeu. Le temps de le
// fermer, la météorite est passée. Au clic droit, même chose sur un ordinateur.
//
// CE N'EST PAS UN DÉFAUT DES MÉTÉORITES, et c'est pour cela que le correctif
// est ici. MESURÉ avec `tools/leMenuDuNavigateur.mjs`, qui envoie un vrai
// `contextmenu` dans un coin du plateau et lit `defaultPrevented` — la seule
// chose qui décide si le menu s'ouvre :
//
//   FUITE  calc-arcade-shooter   sur « canvas-area »
//   FUITE  calc-labyrinthe       sur « laby-stats »
//   FUITE  geo-tangram           sur « tg-wrap »
//
// Trois sur trois. Corriger l'arène des Météorites aurait réparé un jeu et
// laissé les autres — et le prochain jeu écrit l'aurait porté à son tour.
//
// DEUX EXCEPTIONS, ET CHACUNE A SA RAISON.
//
//   · UN CHAMP DE SAISIE GARDE SON MENU. L'élève qui tape une réponse, une
//     rédaction ou une formule doit pouvoir copier et coller — le lui retirer
//     coûterait plus cher que le menu ne gêne.
//   · UN JEU QUI SE SERT DU CLIC DROIT N'EST PAS EMPÊCHÉ. Le Démineur pose ses
//     drapeaux ainsi (`js/games/demineur.js`), Colorier aussi. Leur propre
//     écouteur s'exécute de toute façon : deux écouteurs sur le même événement
//     tournent tous les deux, et annuler le menu n'annule pas le second.
//
// ON AVALE À LA PHASE DE REMONTÉE, pas à la capture : un jeu qui voudrait
// traiter le clic droit AVANT nous le peut encore.
const SAISIE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function avalerLeMenu(couche) {
    couche.addEventListener('contextmenu', (e) => {
        if (e.target && e.target.closest && e.target.closest(SAISIE)) return;
        e.preventDefault();
    });
}

const visible = (el) => !!el && el.style.display !== 'none'
    && getComputedStyle(el).display !== 'none';

function endormir(oui) {
    DERRIERE.forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        // `inert` est une propriété booléenne : la poser et l'enlever suffit,
        // sans avoir à se souvenir de qui l'avait mise.
        if (oui) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    });
}

/**
 * BRANCHER LA COUCHE DE JEU.
 *
 * Appelé une fois au démarrage. Si la couche n'existe pas — un volet de
 * l'Atelier, une page d'essai — on ne fait rien et l'on ne se plaint pas.
 */
export function initCoucheDeJeu() {
    const couche = document.getElementById('game-layer');
    if (!couche || document.body.dataset.coucheBranchee) return;
    document.body.dataset.coucheBranchee = '1';

    let ouverte = visible(couche);
    endormir(ouverte);
    // Une seule fois, et pour tous les jeux : voir ci-dessus. L'écouteur reste
    // posé même couche fermée — elle ne reçoit alors aucun événement.
    avalerLeMenu(couche);

    new MutationObserver(() => {
        const maintenant = visible(couche);
        if (maintenant === ouverte) return;
        ouverte = maintenant;
        endormir(maintenant);
    }).observe(couche, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
}
