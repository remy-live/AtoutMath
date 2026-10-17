// LES OUTILS D'UN EXERCICE — un rappel, jamais une réponse.
//
// Rémy, sur Temps / Distance / Vitesse : « on pourrait avoir un bouton schéma
// et un bouton formule (mais pas valable tout le temps) ».
//
// « PAS VALABLE TOUT LE TEMPS » EST LA CLÉ, et c'est pour cela que c'est
// l'ITEM qui les déclare et non l'activité : un rappel de formule n'a de sens
// que là où il y a une formule, un schéma que là où il y a une situation à
// dessiner. Un exercice qui n'en propose pas n'affiche rien.
//
// ILS SONT GRATUITS, et c'est un choix. Un indice DIT quelque chose sur la
// question posée, et se paie donc en points ; ces outils-là remettent l'énoncé
// en image ou rappellent ce qui est écrit au tableau pour toute la classe. La
// grandeur cherchée y porte un « ? » : ils ne résolvent rien.
//
// POURQUOI CE FICHIER EXISTE. Le mécanisme est né dans le pavé numérique, et y
// est resté tant qu'il n'y avait de formules qu'à saisir. Rémy, en revue de la
// Chasse au Chiffre : « on pourrait proposer un bouton pour afficher un
// tableau de numération pour placer son nombre » — un QCM. Le besoin n'a rien
// à voir avec la façon de répondre : c'est le SUJET qui appelle un rappel, pas
// le clavier. Les deux activités partagent donc le même code plutôt que d'en
// avoir chacune une copie qui divergera.
//
// Le format déclaré par le générateur ne change pas :
//     meta.outils = [{ id, label, html }]

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const outilsDe = (item) => (item && item.meta && item.meta.outils) || [];

/** La rangée de boutons. Vide — et donc invisible — s'il n'y a pas d'outil. */
export function barreOutils(item) {
    const outils = outilsDe(item);
    if (!outils.length) return '';
    return `<div class="np-outils">${outils.map((o, i) =>
        `<button type="button" class="np-outil-btn" data-outil-i="${i}"
            aria-expanded="false">${echapper(o.label)}</button>`).join('')}</div>`;
}

/** Le panneau qui reçoit l'outil ouvert. À poser où l'on veut le voir s'ouvrir. */
export function boiteOutils(item) {
    return outilsDe(item).length ? '<div class="np-outil" data-outil hidden></div>' : '';
}

/**
 * UN OUTIL PEUT PORTER DES CASES À REMPLIR, ET ELLES NE SONT PAS LA RÉPONSE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, devant le tableau de numération de la Chasse au Chiffre : « dans cet
 * exercice, on ne peut mettre le nombre ». Le tableau disait pourtant « Pose
 * ton nombre : un chiffre par colonne » — une consigne qui commandait un geste
 * que l'écran ne permettait pas.
 *
 * DEUX CHOSES SONT NÉCESSAIRES POUR QUE CES CASES MARCHENT, et la seconde est
 * celle qu'on n'aurait pas devinée :
 *
 *   · LES FRAPPES NE DOIVENT PAS ARRIVER À L'ACTIVITÉ. `bubbles`, `numeric` et
 *     les écrans de saisie écoutent le clavier sur LEUR conteneur, dont le
 *     panneau des outils est un descendant : sans `stopPropagation`, le
 *     chiffre tapé dans le tableau irait AUSSI dans la réponse. L'élève
 *     poserait son nombre et répondrait sans le vouloir.
 *   · CE QU'IL A POSÉ DOIT SURVIVRE À LA FERMETURE DU PANNEAU. Le panneau se
 *     reconstruit à chaque ouverture ; sans mémoire, refermer le tableau pour
 *     regarder les propositions effacerait le nombre qu'on vient d'y placer —
 *     et c'est exactement ce qu'on fait avec un tableau de numération.
 *     La mémoire vit dans cette fermeture-ci, donc elle s'efface d'elle-même
 *     à la question suivante, qui rebranche tout. C'est ce qu'on veut : un
 *     nombre d'avant, resté dans les cases, serait un faux souvenir.
 */
function brancherLesCases(boite, memoire, i) {
    const cases = [...boite.querySelectorAll('[data-case-outil]')];
    if (!cases.length) return;
    const gardees = memoire.get(i) || [];
    cases.forEach((c, n) => { c.value = gardees[n] || ''; });
    const retenir = () => memoire.set(i, cases.map(c => c.value));
    cases.forEach((c, n) => {
        c.addEventListener('input', () => {
            // UN CHIFFRE, ET RIEN D'AUTRE. `maxlength` ne filtre pas ce qu'on
            // tape, il n'en limite que le nombre : sans cette ligne, une
            // lettre resterait dans la case.
            c.value = (c.value.match(/\d/) || [''])[0];
            retenir();
            // ON AVANCE TOUT SEUL quand la case est pleine : poser sept
            // chiffres en cliquant sept fois serait un travail de saisie, pas
            // de numération.
            if (c.value && cases[n + 1]) cases[n + 1].focus({ preventScroll: true });
        });
        c.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !c.value && cases[n - 1]) {
                cases[n - 1].focus({ preventScroll: true });
                cases[n - 1].value = '';
                retenir();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' && cases[n - 1]) {
                cases[n - 1].focus({ preventScroll: true }); e.preventDefault();
            } else if (e.key === 'ArrowRight' && cases[n + 1]) {
                cases[n + 1].focus({ preventScroll: true }); e.preventDefault();
            }
        });
    });
    // LA BARRIÈRE. Elle est posée sur le PANNEAU et non sur chaque case : une
    // case ajoutée demain serait protégée sans qu'on y pense.
    ['keydown', 'keyup', 'keypress'].forEach(quoi =>
        boite.addEventListener(quoi, (e) => e.stopPropagation()));
}

/** Branche les boutons sur le panneau. À rappeler après chaque rendu. */
export function brancherOutils(container, item) {
    const outils = outilsDe(item);
    const boite = container.querySelector('[data-outil]');
    if (!outils.length || !boite) return;
    let ouvert = -1;
    // Ce que l'élève a posé dans les cases de chaque outil, le temps de la
    // question. Voir `brancherLesCases`.
    const memoire = new Map();
    const montrer = (i) => {
        ouvert = i;
        // LE PANNEAU PORTE SON NOM ET SA CROIX. Sur téléphone il recouvre le
        // plateau — le bouton qui l'a ouvert est dessous, et sans cette croix
        // on ne saurait plus comment revenir à la question.
        boite.innerHTML = i < 0 ? '' : `<div class="np-outil-tete">
            <b>${echapper(outils[i].label)}</b>
            <button type="button" class="np-outil-fermer" data-outil-fermer
                aria-label="Fermer">✕</button></div>${outils[i].html}`;
        boite.hidden = i < 0;
        const croix = boite.querySelector('[data-outil-fermer]');
        if (croix) croix.onclick = () => montrer(-1);
        if (i >= 0) brancherLesCases(boite, memoire, i);
        container.querySelectorAll('[data-outil-i]').forEach(b =>
            b.setAttribute('aria-expanded', String(Number(b.dataset.outilI) === i)));
    };
    container.querySelectorAll('[data-outil-i]').forEach(btn => {
        // Le même bouton referme : deux panneaux ouverts l'un sur l'autre
        // pousseraient le pavé numérique hors de l'écran.
        btn.onclick = () => montrer(ouvert === Number(btn.dataset.outilI)
            ? -1 : Number(btn.dataset.outilI));
    });
}
