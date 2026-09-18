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

    new MutationObserver(() => {
        const maintenant = visible(couche);
        if (maintenant === ouverte) return;
        ouverte = maintenant;
        endormir(maintenant);
    }).observe(couche, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
}
