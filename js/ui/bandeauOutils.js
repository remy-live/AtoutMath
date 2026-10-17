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
// ET ELLE PART POUR DE BON — MAIS ELLE SE RAPPELLE.
//
// Un bandeau d'aide qui revient tout seul est un bandeau qu'on apprend à
// ignorer, puis à détester : « J'ai compris » le congédie pour de bon sur ce
// poste. Restait le revers, et c'est Rémy qui l'a vu : « je mettrai
// éventuellement un petit ? à côté de nouveau parcours pour voir justement ce
// qui correspond aux icônes. »
//
// UN BANDEAU QU'ON NE PEUT PLUS RAPPELER, ON HÉSITE À LE FERMER. On le garde
// « au cas où », il traîne des mois au-dessus du travail, et l'on finit par ne
// plus le voir — ce qui est exactement l'état qu'on voulait éviter. Le « ? »
// de la barre le ramène à la demande ; c'est lui qui rend le congé sans
// regret. Ma réponse précédente — « la poubelle de la barre de debug le
// ramène » — n'en était pas une : personne ne vide sa sauvegarde locale pour
// relire une légende.

const CLEF = 'atoutmath-bandeau-outils';
const ID = 'bandeau-outils';
// LE BOUTON QUI L'APPELLE ne se nomme pas lui-même dans la liste : il n'est
// pas un outil du parcours, il est la POIGNÉE de la liste. L'y faire figurer
// donnerait une ligne « Que font ces icônes ? » à quelqu'un qui est
// précisément en train de le lire, et dont le clic ne ferait que redessiner ce
// qu'il a sous les yeux.
const POIGNEE = 'btn-aide-outils';

// MONTRÉE À LA DEMANDE : le « ? » passe outre le congé, mais il ne l'annule
// pas — on ne rouvre pas une porte en jetant sa clef.
//
// Sans cet état, la bande rappelée disparaîtrait au premier redessin : ajouter
// un exercice rappelle `poserLeBandeauDesOutils`, qui lirait le congé et la
// retirerait sous les yeux du professeur en train de s'en servir pour trouver
// un bouton.
let montreeALaDemande = false;

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
        .filter(b => b.id !== POIGNEE)
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
    if (congedie() && !montreeALaDemande) { if (ancienne) ancienne.remove(); return; }

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
    // « une fois pour toutes » était juste tant que la bande ne revenait pas.
    // Depuis le « ? », elle revient : la phrase doit valoir les deux fois.
    titre.textContent = 'Ce que font les icônes de la barre :';
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

    const pied = document.createElement('div');
    pied.className = 'bandeau-outils-pied';

    const compris = document.createElement('button');
    compris.type = 'button';
    compris.className = 'bandeau-outils-compris';
    compris.textContent = 'J\'ai compris';
    compris.onclick = () => { congedier(); montreeALaDemande = false; retirer(); };
    pied.appendChild(compris);

    // ON DIT OÙ LA RETROUVER, DANS LE BOUTON QU'ON S'APPRÊTE À FERMER. C'est le
    // seul instant où le professeur se pose la question, et le seul où la
    // réponse tient en cinq mots.
    const rappel = document.createElement('span');
    rappel.className = 'bandeau-outils-rappel';
    rappel.textContent = 'Pour la revoir : le « ? » de la barre.';
    pied.appendChild(rappel);
    bande.appendChild(pied);

    const point = document.getElementById('path-collapsible-wrapper');
    if (!point || !point.parentNode) return;
    if (ancienne) ancienne.remove();
    point.parentNode.insertBefore(bande, point);
    marquerLaPoignee(true);
}

/** Retire la bande et remet la poignée à l'état « fermé ». */
function retirer() {
    const b = document.getElementById(ID);
    if (b) b.remove();
    marquerLaPoignee(false);
}

/** `aria-expanded` sur le « ? » : il commande quelque chose, il doit le dire. */
function marquerLaPoignee(ouverte) {
    const b = document.getElementById(POIGNEE);
    if (b) b.setAttribute('aria-expanded', ouverte ? 'true' : 'false');
}

/**
 * Le « ? » de la barre : montre la légende, ou la referme si elle est là.
 *
 * Une bascule et non une ouverture : sans elle, le professeur qui clique le
 * « ? » par curiosité n'aurait plus que « J'ai compris » pour s'en défaire —
 * c'est-à-dire un congé définitif pour une question passagère.
 */
export function basculerLeBandeauDesOutils() {
    if (document.getElementById(ID)) {
        montreeALaDemande = false;
        retirer();
        return;
    }
    montreeALaDemande = true;
    poserLeBandeauDesOutils();
}
