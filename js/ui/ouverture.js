// LA ROUTE QUI S'OUVRE.
//
// Rémy : « ce qui serait sympa pour les jeux, c'est qu'une fois qu'on a fini
// l'exercice et qu'il a été réussi, on ait comme dans Mario — ou selon le
// design du parcours — un passage secret ou une route en pointillé qui
// s'ouvre, et le monde s'ouvre dans un effet de particule d'étoile ».
//
// C'est exactement ce qui manquait. La carte SAVAIT déjà dire où l'on en est :
// le sentier parcouru est plein et doré, la suite est en pointillé pâle. Mais
// on revenait d'un exercice réussi et la carte était simplement redessinée,
// déjà à jour — le pointillé était devenu trait sans que personne ne l'ait vu
// se faire. La récompense était là, et invisible.
//
// Alors on rejoue le passage : la carte se redessine dans l'état d'AVANT, le
// morceau de route se trace sous les yeux de l'élève, et la pastille qui vient
// de s'ouvrir éclate en étoiles.
//
// Deux règles de conduite :
//   · UNE FOIS, ET UNE SEULE. L'ouverture se consomme ; revenir sur la carte
//     ne la rejoue pas. Une fête qui se répète n'est plus une fête.
//   · JAMAIS CONTRE LE GRÉ DE L'ÉLÈVE. `prefers-reduced-motion` coupe
//     l'animation : la carte s'affiche dans son état final, sans étoiles.

/** L'étape qui vient d'être réussie, en attente d'être fêtée. */
let aFeter = null;

/** Le meneur a bouclé une étape RÉUSSIE : il y a quelque chose à montrer. */
export function noterOuverture(stepId) {
    if (stepId) aFeter = String(stepId);
}

// Le noyau annonce, l'interface écoute. `markStudentPathStepCompleted` ne
// prévient que sur une étape RÉUSSIE : une étape ratée n'ouvre rien, et n'a
// donc rien à fêter.
if (typeof document !== 'undefined') {
    document.addEventListener('path_step_opened', (e) => noterOuverture(e.detail));
}

/** La carte vient se servir — et le plat ne se ressert pas. */
export function prendreOuverture() {
    const s = aFeter;
    aFeter = null;
    return s;
}

/** Sans l'effacer : pour décider AVANT de dessiner. */
export function ouvertureEnAttente() { return aFeter; }

// --- LES JEUX BONUS ---------------------------------------------------------
//
// Un jeu de récompense ne s'ouvre pas parce qu'on est arrivé à sa pastille : il
// s'ouvre parce que le TRAVAIL qui le précède est fait, et fait assez bien.
// Il peut donc s'ouvrir loin devant, et plusieurs d'un coup. On ne peut pas le
// deviner en regardant l'étape qu'on vient de finir — il faut comparer avec ce
// qui était ouvert la dernière fois que l'élève a regardé la carte.
//
// « La dernière fois qu'il a REGARDÉ » : on ne retient l'état qu'aux rendus
// visibles. La vue se redessine dix fois derrière l'écran de jeu ; si on
// mémorisait à chacun, l'ouverture serait déjà « connue » quand l'élève arrive.

let ouvertsConnus = null;   // null = on n'a encore rien vu : on n'a rien à fêter

/**
 * Les jeux qui viennent de s'ouvrir, et l'on retient le nouvel état.
 * @param {Set<string>} ouvertsMaintenant
 * @returns {string[]} les stepId à fêter
 */
export function recompensesNouvelles(ouvertsMaintenant) {
    const connus = ouvertsConnus;
    ouvertsConnus = new Set(ouvertsMaintenant);
    // Premier coup d'œil de la séance : tout ce qui est ouvert l'était déjà
    // avant, on ne fête pas un état de départ.
    if (!connus) return [];
    return [...ouvertsMaintenant].filter(id => !connus.has(id));
}

/** L'élève a demandé qu'on bouge moins. On l'écoute. */
export function animationsCoupees() {
    return typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * UNE GERBE D'ÉTOILES, au centre d'un élément.
 *
 * Des `<span>` posés en absolu, projetés par une variable CSS et effacés à la
 * fin de leur animation : pas de boucle de rendu, pas de minuteur à annuler,
 * rien à nettoyer si la page change entre-temps.
 */
export function etoiles(cible, { nombre = 18, duree = 1100 } = {}) {
    if (!cible || !cible.isConnected || animationsCoupees()) return;
    const r = cible.getBoundingClientRect();
    if (!r.width && !r.height) return;

    const ciel = document.createElement('div');
    ciel.className = 'etoiles-ciel';
    ciel.setAttribute('aria-hidden', 'true');
    ciel.style.left = `${r.left + r.width / 2}px`;
    ciel.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(ciel);

    for (let i = 0; i < nombre; i++) {
        const e = document.createElement('span');
        e.className = 'etoile';
        // Un éventail complet, mais des distances inégales : une gerbe
        // parfaitement régulière ressemble à une horloge, pas à une étincelle.
        const angle = (i / nombre) * Math.PI * 2 + Math.random() * 0.5;
        const loin = 42 + Math.random() * 58;
        e.style.setProperty('--dx', `${Math.cos(angle) * loin}px`);
        e.style.setProperty('--dy', `${Math.sin(angle) * loin}px`);
        e.style.setProperty('--retard', `${Math.random() * 140}ms`);
        e.style.setProperty('--duree', `${duree}ms`);
        e.style.setProperty('--taille', `${7 + Math.random() * 9}px`);
        ciel.appendChild(e);
    }
    setTimeout(() => ciel.remove(), duree + 400);
}

/**
 * UN JEU BONUS APPARAÎT — et ça, ça se fête pour de bon.
 *
 * Rémy, deux fois. D'abord : « fais le plus sympa pour les jeux bonus ». Puis,
 * en voyant la carte : « les jeux récompenses apparaissent déjà, alors que ce
 * serait bien qu'ils apparaissent après. Si on a bien réussi et qu'un exercice
 * récompense arrive, alors sur la carte du monde il faut le voir réapparaître
 * avec un effet de particules ; et si c'est une présentation en ligne, il faut
 * le voir s'insérer. »
 *
 * Le jeu n'était donc pas sur la carte une seconde plus tôt : il n'y a rien à
 * déverrouiller, il y a quelque chose à FAIRE VENIR. La pastille est posée
 * réduite à rien, puis :
 *
 *   elle SURGIT en dépassant sa taille avant de se poser,
 *   quarante étoiles jaillissent en deux gerbes,
 *   et un ruban dit ce qui vient d'être gagné.
 *
 * En liste, où il n'y a pas de pastille à faire éclore, la ligne se DÉPLIE :
 * elle pousse les suivantes vers le bas, et l'on voit qu'elle s'insère.
 */
export function ouvrirLeCadeau(noeud) {
    if (!noeud || !noeud.isConnected) return;
    const cible = noeud.querySelector('.world-node-btn') || noeud;
    const enListe = noeud.classList.contains('path-timeline-step');
    if (animationsCoupees()) {
        noeud.classList.remove('world-node--gagne');
        noeud.classList.add('world-node--cadeau-ouvert');
        return;
    }

    // L'état d'attente part AVANT tout le reste : gardé pendant l'animation,
    // ses marges annulées reviendraient d'un coup au milieu du passage — et
    // surtout la ligne resterait écrasée pendant qu'on la mesure.
    noeud.classList.remove('world-node--gagne');

    // UNE LIGNE SE DÉPLIE À SA VRAIE HAUTEUR, pas à une hauteur devinée.
    // `auto` ne s'anime pas, un pixel de trop se voit, et une valeur en dur
    // casserait au premier titre sur deux lignes : on mesure la ligne rendue,
    // maintenant qu'elle a repris sa taille.
    const anime = enListe ? 'path-timeline-step--insere' : 'world-node--surgit';
    if (enListe) {
        noeud.style.setProperty('--haut', `${noeud.getBoundingClientRect().height}px`);
        // ET L'ON REND SA LIBERTÉ À LA LIGNE UNE FOIS DÉPLIÉE. L'animation
        // s'arrête sur `max-height` et `overflow: hidden` : les garder
        // rognerait le jour où le titre passe sur deux lignes.
        noeud.addEventListener('animationend', () => {
            noeud.classList.remove(anime);
            noeud.style.removeProperty('--haut');
        }, { once: true });
    }
    noeud.classList.add(anime);
    // Le temps que la ligne se fasse une place ; sur la carte, la pastille
    // éclot tout de suite — il n'y a rien à pousser.
    setTimeout(() => {
        if (!noeud.isConnected) return;
        noeud.classList.add('world-node--cadeau-ouvert');
        // Deux gerbes décalées : la seconde repart quand la première retombe,
        // et l'on voit une VRAIE explosion plutôt qu'un anneau régulier.
        etoiles(cible, { nombre: 24, duree: 1400 });
        setTimeout(() => etoiles(cible, { nombre: 16, duree: 1100 }), 180);
        ruban(cible, '🎁 Un jeu s\'ouvre !');
    }, enListe ? 380 : 260);
}

/** Le ruban qui monte au-dessus d'un jeu gagné, et s'efface. */
function ruban(cible, texte) {
    if (!cible || !cible.isConnected) return;
    const r = cible.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'ruban-gagne';
    el.textContent = texte;
    el.style.top = `${r.top}px`;
    document.body.appendChild(el);
    // ON LE RAMÈNE DANS L'ÉCRAN. Centré sur la pastille, il en dépassait dès
    // que le jeu se trouvait au bord de la carte — et c'est fréquent : les
    // pastilles vont par rangées de trois, celle de droite touche le bord.
    // On le mesure une fois posé, puis on le recale.
    // `offsetWidth` et non le rectangle : celui-ci est mesuré À TRAVERS
    // l'animation en cours, qui démarre à 60 % de la taille — on aurait recalé
    // le ruban sur une largeur qu'il n'a jamais. Et l'on prend 55 % de la
    // demi-largeur pour couvrir le rebond à 106 % au moment où il apparaît.
    const demi = el.offsetWidth * 0.55;
    const marge = 8;
    const centre = Math.max(demi + marge,
        Math.min(window.innerWidth - demi - marge, r.left + r.width / 2));
    el.style.left = `${centre}px`;
    setTimeout(() => el.remove(), 2400);
}

/**
 * LE PASSAGE S'OUVRE.
 *
 * @param {Element} hote     la carte rendue
 * @param {number}  indexFait LE RANG, DANS LA CARTE, de l'étape qu'on vient de
 *   réussir — et non son numéro d'étape : depuis que les jeux non gagnés ne
 *   sont plus dessinés, les deux diffèrent. Les constructeurs de carte le
 *   posent sur l'hôte (`__ouvertureRang`), c'est lui qu'on passe ici.
 * @param {Function} [retracer] rend le sentier dans son état définitif
 */
export function ouvrirLaRoute(hote, indexFait, retracer) {
    if (!hote || !hote.isConnected) return;
    const cadeaux = () => [...hote.querySelectorAll('.world-node--gagne')];
    // PAS DE ROUTE À TRACER, MAIS DES CADEAUX QUAND MÊME. Un jeu bonus s'ouvre
    // parce que le travail qui le précède est fait et bien fait : cela peut
    // arriver sans qu'aucune étape voisine ne vienne d'être bouclée — au retour
    // d'un bilan, par exemple. On va donc droit aux paquets.
    if (indexFait === undefined || indexFait === null) {
        cadeaux().forEach((n, k) => setTimeout(() => ouvrirLeCadeau(n), 250 + k * 700));
        return;
    }
    // ON ATTEND QUE LA CARTE SOIT VRAIMENT À L'ÉCRAN. Elle est construite dès
    // que la progression change, c'est-à-dire souvent pendant que l'onglet
    // « Parcours » est encore caché : le sentier n'a alors ni largeur ni
    // longueur, et la fête se jouait dans le vide. On laisse une seconde au
    // navigateur pour poser la mise en page, puis on abandonne — mieux vaut
    // pas d'animation qu'une carte figée dans son état d'avant.
    const trait = hote.querySelector('.path-trail-neuf');
    const pret = hote.getBoundingClientRect().width > 0 && trait && trait.getAttribute('d');
    if (!pret) {
        const essais = (ouvrirLaRoute.__essais = (ouvrirLaRoute.__essais || 0) + 1);
        if (essais < 60) { requestAnimationFrame(() => ouvrirLaRoute(hote, indexFait, retracer)); return; }
        ouvrirLaRoute.__essais = 0;
        if (retracer) retracer();
        // La route n'a pas pu se tracer, mais les cadeaux, eux, doivent
        // s'ouvrir : c'est la partie que l'élève attend.
        cadeaux().forEach((n, k) => setTimeout(() => ouvrirLeCadeau(n), 250 + k * 700));
        return;
    }
    ouvrirLaRoute.__essais = 0;
    const noeuds = [...hote.querySelectorAll('.world-node')];
    const arrivee = noeuds[indexFait + 1] || noeuds[indexFait];
    if (animationsCoupees()) {
        if (retracer) retracer();
        cadeaux().forEach(n => ouvrirLeCadeau(n));
        return;
    }

    // La pastille qu'on vient de terminer se marque d'abord : c'est d'elle que
    // part la route.
    const depart = noeuds[indexFait];
    if (depart) {
        depart.classList.add('world-node--fete');
        etoiles(depart.querySelector('.world-node-btn') || depart, { nombre: 14 });
    }

    const neuf = hote.querySelector('.path-trail-neuf');
    const finir = () => {
        if (retracer) retracer();
        if (neuf) neuf.removeAttribute('d');
        if (arrivee && arrivee !== depart) {
            arrivee.classList.add('world-node--ouvre');
            etoiles(arrivee.querySelector('.world-node-btn') || arrivee, { nombre: 22, duree: 1300 });
        }
        // ET LES JEUX QUI S'OUVRENT, un peu après : la route d'abord, le
        // cadeau ensuite. Tout ensemble, on ne verrait plus rien.
        cadeaux().forEach((n, k) => setTimeout(() => ouvrirLeCadeau(n), 520 + k * 700));
    };

    if (!neuf || !neuf.getAttribute('d')) {
        // Pas de sentier à tracer (dernière étape, ou présentation en liste) :
        // il reste la gerbe d'étoiles, qui dit déjà l'essentiel.
        setTimeout(finir, 420);
        return;
    }

    // LE TRAIT SE DESSINE. On le masque par un tiret aussi long que lui, puis
    // on fait glisser ce tiret : c'est la façon de faire « écrire » un tracé
    // SVG, et elle ne coûte qu'une transition.
    const L = neuf.getTotalLength ? neuf.getTotalLength() : 300;
    neuf.style.transition = 'none';
    neuf.style.strokeDasharray = `${L}`;
    neuf.style.strokeDashoffset = `${L}`;
    // Un rafraîchissement forcé : sans lui, le navigateur regroupe les deux
    // écritures et la transition n'a jamais lieu de départ à parcourir.
    void neuf.getBoundingClientRect();
    neuf.style.transition = `stroke-dashoffset ${Math.min(1400, 380 + L * 1.4)}ms ease-in-out`;
    neuf.style.strokeDashoffset = '0';
    neuf.addEventListener('transitionend', finir, { once: true });
    // Filet : si la transition n'arrive jamais (onglet en arrière-plan), on
    // termine quand même — la carte ne doit pas rester dans l'état d'avant.
    setTimeout(finir, 2200);
}
