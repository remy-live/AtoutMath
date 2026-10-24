// LE TIROIR DE GAUCHE A DEUX CONTENUS.
//
// Rémy, après avoir vu l'explorateur de parcours en popup : « non, je voyais
// cela comme un explorateur intégré, un peu comme les exercices dans le tiroir
// de gauche ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// IL A RAISON, ET LA RAISON TIENT EN UNE PHRASE : c'est la même matière. À
// gauche vit ce qu'on PIOCHE pour construire — des exercices du catalogue, et
// des parcours qu'on a déjà faits. Une popup est faite pour une décision qu'on
// prend et qu'on quitte ; retrouver son parcours parmi cinquante est un lieu
// où l'on reste, où l'on compare, où l'on range. Ce n'est pas la même chose.
//
// ET LA POPUP COÛTAIT DEUX FOIS. Elle recouvrait le parcours en construction —
// donc impossible de comparer ce qu'on cherche à ce qu'on a sous la main — et
// elle fermait à chaque chargement, si bien qu'en essayer trois demandait de
// la rouvrir trois fois.
//
// CE MODULE NE DESSINE RIEN. Il dit seulement lequel des deux panneaux est
// devant ; c'est `builder.js` qui remplit celui des parcours, et
// `navigation.js` celui des exercices. Une bascule qui saurait aussi dessiner
// finirait par décider ce qu'elle affiche.

/** Les deux contenus, et l'ordre où ils apparaissent dans les onglets. */
export const PANNEAUX = ['exercices', 'parcours'];

/** Ce que la poignée du tiroir annonce, sur téléphone. */
const ETIQUETTES = {
    exercices: '📚 Catalogue d\'exercices',
    parcours: '📂 Mes parcours'
};

let courant = 'exercices';

/** Lequel des deux est devant. */
export function ongletDuTiroir() { return courant; }

/**
 * METTRE UN PANNEAU DEVANT.
 *
 * @param {string} nom  'exercices' ou 'parcours'
 * @param {object} [opts]
 * @param {boolean} [opts.ouvrir] - ouvrir aussi le tiroir, sur téléphone. On ne
 *   le fait que sur demande explicite : basculer d'onglet alors qu'on vient de
 *   rabattre le tiroir le rouvrirait dans le dos de l'utilisateur.
 */
export function montrerPanneau(nom, opts = {}) {
    if (!PANNEAUX.includes(nom)) return;
    courant = nom;

    PANNEAUX.forEach(p => {
        const panneau = document.getElementById(`tiroir-${p}`);
        // `hidden` et non `display:none` : la feuille de style peut alors
        // donner sa hauteur au panneau visible sans avoir à se battre avec un
        // style en ligne, et un lecteur d'écran saute le panneau caché.
        if (panneau) panneau.hidden = (p !== nom);
    });

    document.querySelectorAll('#tiroir-onglets [data-tiroir]').forEach(b => {
        const actif = b.dataset.tiroir === nom;
        b.classList.toggle('tiroir-onglet--actif', actif);
        b.setAttribute('aria-selected', actif ? 'true' : 'false');
    });

    // LA POIGNÉE DIT CE QU'ELLE OUVRE. Sur téléphone, le tiroir est rabattu et
    // seule sa poignée dépasse : si elle continue d'annoncer « Catalogue
    // d'exercices » alors qu'on vient de passer aux parcours, on la rouvre pour
    // vérifier — ce qui est précisément le geste de trop.
    const etiquette = document.querySelector('#drawer-handle .drawer-label');
    if (etiquette) etiquette.textContent = ETIQUETTES[nom];

    if (opts.ouvrir) ouvrirLeTiroir();
}

/** Déplier le tiroir quand il est en feuille coulissante (professeur, téléphone). */
export function ouvrirLeTiroir() {
    const sidebar = document.getElementById('sidebar');
    const poignee = document.getElementById('drawer-handle');
    if (!sidebar || !document.body.classList.contains('mobile-view')) return;
    sidebar.classList.add('drawer-open');
    // ON EFFACE CE QU'A LAISSÉ LA TRACTION. La poignée se tire au doigt et
    // laisse derrière elle un `transform` en ligne ; sans ce nettoyage, le
    // tiroir « ouvert » resterait exactement là où le doigt l'a posé.
    sidebar.style.transform = '';
    sidebar.style.transition = '';
    if (poignee) poignee.setAttribute('aria-expanded', 'true');
}

/**
 * Brancher les onglets. `auRendu` est appelé quand on passe aux parcours : la
 * liste se redessine à l'ouverture, faute de quoi elle montrerait l'état où on
 * l'a laissée — un parcours renommé entre-temps y garderait son ancien nom.
 */
export function initTiroirOnglets(auRendu) {
    const barre = document.getElementById('tiroir-onglets');
    if (!barre || barre.dataset.branche === '1') return;
    barre.dataset.branche = '1';
    barre.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tiroir]');
        if (!b) return;
        montrerPanneau(b.dataset.tiroir);
        if (b.dataset.tiroir === 'parcours' && typeof auRendu === 'function') auRendu();
    });
    montrerPanneau(courant);
}
