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
 * LE PASSAGE S'OUVRE.
 *
 * @param {Element} hote     la carte rendue
 * @param {number}  indexFait l'étape qui vient d'être réussie
 * @param {Function} [retracer] rend le sentier dans son état définitif
 */
export function ouvrirLaRoute(hote, indexFait, retracer) {
    if (!hote || !hote.isConnected) return;
    // ON ATTEND QUE LA CARTE SOIT VRAIMENT À L'ÉCRAN. Elle est construite dès
    // que la progression change, c'est-à-dire souvent pendant que l'onglet
    // « Parcours » est encore caché : le sentier n'a alors ni largeur ni
    // longueur, et la fête se jouait dans le vide. On laisse une seconde au
    // navigateur pour poser la mise en page, puis on abandonne — mieux vaut
    // pas d'animation qu'une carte figée dans son état d'avant.
    const pret = hote.getBoundingClientRect().width > 0
        && (hote.querySelector('.path-trail-neuf') || {}).getAttribute
        && hote.querySelector('.path-trail-neuf').getAttribute('d');
    if (!pret) {
        const essais = (ouvrirLaRoute.__essais = (ouvrirLaRoute.__essais || 0) + 1);
        if (essais < 60) { requestAnimationFrame(() => ouvrirLaRoute(hote, indexFait, retracer)); return; }
        ouvrirLaRoute.__essais = 0;
        if (retracer) retracer();
        return;
    }
    ouvrirLaRoute.__essais = 0;
    const noeuds = [...hote.querySelectorAll('.world-node')];
    const arrivee = noeuds[indexFait + 1] || noeuds[indexFait];
    if (animationsCoupees()) { if (retracer) retracer(); return; }

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
