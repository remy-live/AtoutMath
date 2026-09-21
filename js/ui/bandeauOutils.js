// LA BANDE QUI NOMME LES ICÔNES, UNE FOIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « bonne idée pour le bandeau ».
//
// CE QU'ON A MESURÉ. En refaisant le trajet d'un professeur neuf, du parcours
// vide jusqu'à « Donné à 1 classe » : huit boutons d'icône à l'écran, et
// AUCUN ne porte un mot (`tools/tmp/trajetSeance2.mjs`). Chacun a bien son
// infobulle — mais une infobulle demande un survol, et sur la tablette d'une
// salle de classe il n'y a pas de survol. Le professeur qui ne reconnaît pas
// un pictogramme n'a alors aucun moyen d'apprendre ce qu'il fait, sinon de
// l'essayer sur son vrai parcours.
//
// LE BANDEAU SE CONSTRUIT À PARTIR DES BOUTONS EUX-MÊMES.
//
// C'est la seule décision qui compte ici. Une légende écrite à la main serait
// juste le jour où on l'écrit, et fausse au premier bouton renommé — et cette
// semaine, deux l'ont été (« Voir son exercice », « son écran »). En lisant
// l'`aria-label` des boutons présents, la bande ne peut pas diverger : elle
// nomme ce qui est à l'écran, ou elle ne dit rien.
//
// ELLE SUIT CE QUI APPARAÎT. Sur un parcours vide, cinq outils seulement sont
// montrés — les sept autres n'ont pas de sens tant qu'il n'y a rien à tester,
// à donner ou à imprimer. La bande se refait donc à chaque rendu : au premier
// exercice ajouté, les nouveaux boutons arrivent avec leur nom. C'est
// exactement le moment où l'on en a besoin.
//
// ET ELLE PART POUR DE BON. Un bandeau d'aide qui revient est un bandeau
// qu'on apprend à ignorer, puis à détester. Un clic sur « J'ai compris » et
// l'on ne le revoit plus sur ce poste. (Pour le revoir : la poubelle « vider
// la sauvegarde locale » de la barre de debug le ramène, comme tout le reste
// des préférences du poste.)

const CLEF = 'atoutmath-bandeau-outils';
const ID = 'bandeau-outils';

/** A-t-on déjà dit « j'ai compris » ? */
function congedie() {
    try { return localStorage.getItem(CLEF) === 'vu'; } catch (e) { return false; }
}

function congedier() {
    try { localStorage.setItem(CLEF, 'vu'); } catch (e) { /* navigation privée */ }
}

/**
 * Les outils visibles de la barre, avec leur nom.
 *
 * On ne prend QUE `.toolbar-icon-btn` : ce sont les boutons dont on parle, et
 * les trois boutons d'aperçu (mobile / tablette / ordinateur) sont un réglage
 * d'affichage, pas un outil — les nommer allongerait la bande d'un tiers pour
 * une chose qu'on ne cherche jamais.
 *
 * Un bouton sans `aria-label` est SAUTÉ plutôt que baptisé « Bouton » : une
 * ligne de légende qui ne nomme rien est une ligne de bruit.
 */
function outilsNommes() {
    const barre = document.getElementById('path-header-toggle');
    if (!barre) return [];
    return [...barre.querySelectorAll('.toolbar-icon-btn')]
        .filter(b => !b.hidden && b.offsetParent !== null)
        .map(b => ({ bouton: b, nom: (b.getAttribute('aria-label') || '').trim() }))
        .filter(o => o.nom);
}

/**
 * Pose — ou retire — la bande sous la barre d'outils du constructeur.
 *
 * Appelée à chaque rendu du parcours. Sans effet une fois congédiée, et sans
 * effet hors de l'espace professeur, où la barre n'existe pas.
 */
export function poserLeBandeauDesOutils() {
    const ancienne = document.getElementById(ID);
    if (congedie()) { if (ancienne) ancienne.remove(); return; }

    const outils = outilsNommes();
    // Moins de deux outils : on est sur un écran qui n'a pas fini de se monter,
    // et une bande d'un seul mot n'apprend rien.
    if (outils.length < 2) { if (ancienne) ancienne.remove(); return; }

    const bande = document.createElement('div');
    bande.id = ID;
    bande.className = 'bandeau-outils';
    bande.setAttribute('role', 'note');

    const titre = document.createElement('p');
    titre.className = 'bandeau-outils-titre';
    titre.textContent = 'Les outils de la barre, une fois pour toutes :';
    bande.appendChild(titre);

    const liste = document.createElement('ul');
    liste.className = 'bandeau-outils-liste';
    outils.forEach(({ bouton, nom }) => {
        const li = document.createElement('li');
        li.className = 'bandeau-outils-item';
        // L'ICÔNE EST COPIÉE DU VRAI BOUTON, pas redessinée : deux dessins à
        // tenir d'accord finiraient par ne plus l'être, et la légende
        // montrerait un pictogramme qui n'est plus dans la barre.
        const svg = bouton.querySelector('svg');
        if (svg) {
            const copie = svg.cloneNode(true);
            copie.setAttribute('aria-hidden', 'true');
            li.appendChild(copie);
        }
        const mot = document.createElement('span');
        mot.textContent = nom;
        li.appendChild(mot);
        // AU DOIGT, LA LÉGENDE NE SE CLIQUE PAS — ET C'EST CE QUI LA REND
        // SUPPORTABLE SUR UN TÉLÉPHONE.
        //
        // À la souris, un clic sur la ligne fait ce que fait le bouton : la
        // légende sert de barre à qui n'a pas encore repéré où elle est. Mais
        // une ligne cliquable au doigt réclame ses 44 px, règle de la maison ;
        // MESURÉ sur 390 × 844, onze lignes à 44 px : 650 px de haut, soit les
        // trois quarts de l'écran pour une note qu'on lit une fois.
        //
        // On ne rogne pas la règle : on retire le geste. Les vrais boutons sont
        // à 44 px, JUSTE AU-DESSUS, et c'est eux qu'on veut apprendre à viser.
        // Avec les deux colonnes du téléphone, la bande retombe à 316 px —
        // chiffre mesuré, et non celui que j'avais écrit d'avance.
        const auDoigt = window.matchMedia
            && window.matchMedia('(pointer: coarse)').matches;
        if (!auDoigt) {
            li.classList.add('bandeau-outils-item--cliquable');
            li.onclick = () => bouton.click();
        }
        liste.appendChild(li);
    });
    bande.appendChild(liste);

    const compris = document.createElement('button');
    compris.type = 'button';
    compris.className = 'bandeau-outils-compris';
    compris.textContent = 'J\'ai compris';
    compris.onclick = () => { congedier(); bande.remove(); };
    bande.appendChild(compris);

    const point = document.getElementById('path-collapsible-wrapper');
    if (!point || !point.parentNode) return;
    if (ancienne) ancienne.remove();
    point.parentNode.insertBefore(bande, point);
}
