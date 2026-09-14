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

/** Branche les boutons sur le panneau. À rappeler après chaque rendu. */
export function brancherOutils(container, item) {
    const outils = outilsDe(item);
    const boite = container.querySelector('[data-outil]');
    if (!outils.length || !boite) return;
    let ouvert = -1;
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
