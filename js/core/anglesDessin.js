// LE DESSIN D'UN ANGLE QU'ON ESTIME — un seul, pour trois écrans.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// L'exercice « À vue d'œil » le montre, LE DÉFI DE LA CLASSE le montre aussi,
// et l'aperçu du professeur le montre une troisième fois. Trois dessins
// séparés dériveraient : un drapeau d'arc corrigé ici et pas là, et le défi
// afficherait le COMPLÉMENT de l'angle que l'exercice affiche — c'est-à-dire
// que les trente élèves estimeraient autre chose que ce qu'on leur demande.
//
// IL N'Y A DONC QU'UN DESSIN, et il vit dans le noyau.

/** La vue SVG : vingt-huit cases de large, pour tenir sur une ardoise. */
export const VUE = { largeur: 620, hauteur: 410 };

/** Le sommet, et les deux rayons du tracé. */
export const O = { x: 310, y: 205 };
export const RAYON = 168;
export const RAYON_SECTEUR = 92;

/** Un point du cercle, en degrés trigonométriques (l'axe y de SVG descend). */
export const surLeCercle = (deg, r) => ({
    x: O.x + Math.cos(deg * Math.PI / 180) * r,
    y: O.y - Math.sin(deg * Math.PI / 180) * r
});

/**
 * Le chemin d'un secteur, du départ et sur `ouverture` degrés.
 *
 * ── LES DEUX DRAPEAUX, ET POURQUOI ILS DÉPENDENT DU SIGNE ──────────────────
 *
 * `sweep-flag` VAUT ZÉRO POUR UNE OUVERTURE POSITIVE : l'axe y de SVG descend,
 * donc le sens trigonométrique s'y dessine en « négatif ». Avec 1, tous les
 * secteurs seraient le complément de celui qu'on veut — un angle de 60°
 * s'afficherait à 300°, et l'exercice entier mentirait sans qu'aucune erreur
 * ne soit levée.
 *
 * ET L'OUVERTURE PEUT ÊTRE NÉGATIVE : c'est le cas de l'écart, quand on a
 * parié trop bas. L'arc se parcourt alors dans l'autre sens, et c'est la
 * VALEUR ABSOLUE qui décide du grand arc.
 */
export function cheminSecteur(depart, ouverture, r) {
    const a = surLeCercle(depart, r);
    const b = surLeCercle(depart + ouverture, r);
    const grand = Math.abs(ouverture) > 180 ? 1 : 0;
    const sens = ouverture < 0 ? 1 : 0;
    return `M ${O.x} ${O.y} L ${a.x.toFixed(1)} ${a.y.toFixed(1)} `
        + `A ${r} ${r} 0 ${grand} ${sens} ${b.x.toFixed(1)} ${b.y.toFixed(1)} Z`;
}

/** Le papier : des POINTS, jamais un quadrillage. */
function trame() {
    let d = '';
    for (let y = 18; y < VUE.hauteur; y += 26) {
        for (let x = 18; x < VUE.largeur; x += 26) {
            d += `<circle class="ea-grain" cx="${x}" cy="${y}" r="1.2"/>`;
        }
    }
    return d;
}

const traitVers = (deg, classe, r) => {
    const p = surLeCercle(deg, r);
    return `<line class="${classe}" x1="${O.x}" y1="${O.y}" `
        + `x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"/>`;
};

/**
 * LE DESSIN ENTIER, en balises SVG — sans le `<svg>` lui-même.
 *
 * `pari` à `null` : l'angle seul, avec un point d'interrogation. UN NOMBRE :
 * le trait pointillé par-dessus, l'écart hachuré entre les deux, et la vraie
 * mesure écrite. On VOIT son erreur au lieu de la lire — cinq degrés de trop,
 * ce n'est pas « 5 », c'est cette mince part de camembert, et c'est elle qui
 * construit le repère pour la fois d'après.
 *
 * @param {{angle:number, depart:number}} meta
 * @param {number|null} pari
 */
export function dessinDeLAngle(meta, pari = null) {
    let d = trame();
    d += `<path class="ea-secteur" d="${cheminSecteur(meta.depart, meta.angle, RAYON_SECTEUR)}"/>`;
    d += `<path class="ea-arc" d="${cheminSecteur(meta.depart, meta.angle, RAYON_SECTEUR)}"/>`;
    d += traitVers(meta.depart, 'ea-cote', RAYON);
    d += traitVers(meta.depart + meta.angle, 'ea-cote', RAYON);

    if (pari !== null && pari !== undefined) {
        const ecart = pari - meta.angle;
        d += `<path class="ea-ecart" d="${
            cheminSecteur(meta.depart + meta.angle, ecart, 142)}"/>`;
        d += traitVers(meta.depart + pari, 'ea-pariCote', RAYON - 30);
        // LA PASTILLE DE L'ÉCART RESTE DANS LE CADRE. À cinq degrés les deux
        // traits se touchent presque : le nombre posé entre eux devient
        // illisible, d'où le rayon plus grand. Mais un angle qui pointe vers
        // le haut l'envoyait alors HORS de la vue, et la seule chose qu'on
        // voulait montrer était la seule qu'on ne voyait pas.
        const brut = surLeCercle(meta.depart + meta.angle + ecart / 2, RAYON + 34);
        const mi = {
            x: Math.max(36, Math.min(VUE.largeur - 36, brut.x)),
            y: Math.max(26, Math.min(VUE.hauteur - 26, brut.y))
        };
        d += `<g class="ea-bulle" transform="translate(${mi.x.toFixed(1)} ${mi.y.toFixed(1)})">
            <rect x="-30" y="-17" width="60" height="34" rx="11"/>
            <text x="0" y="7" text-anchor="middle">${Math.abs(ecart)}°</text></g>`;
        const dans = surLeCercle(meta.depart + meta.angle / 2, RAYON_SECTEUR * 0.62);
        d += `<text class="ea-vrai" x="${dans.x.toFixed(1)}" y="${
            (dans.y + 7).toFixed(1)}" text-anchor="middle">${meta.angle}°</text>`;
    } else {
        const dans = surLeCercle(meta.depart + meta.angle / 2, RAYON_SECTEUR * 0.62);
        d += `<text class="ea-mystere" x="${dans.x.toFixed(1)}" y="${
            (dans.y + 9).toFixed(1)}" text-anchor="middle">?</text>`;
    }
    d += `<circle class="ea-sommet" cx="${O.x}" cy="${O.y}" r="8.5"/>`;
    d += `<circle class="ea-sommetBlanc" cx="${O.x}" cy="${O.y}" r="3.4"/>`;
    return d;
}

/** Le barème : cent points, moins huit par degré d'écart. */
export function pointsDeLEcart(ecart) {
    return Math.max(0, 100 - 8 * Math.abs(ecart));
}

/** Ce qu'on dit à l'élève, selon l'écart. Jamais « faux ». */
export function motDeLEcart(ecart) {
    const e = Math.abs(ecart);
    if (e === 0) return 'PILE POIL ! Au degré près.';
    if (e <= 2) return 'À un cheveu près.';
    if (e <= 5) return 'Tu n\'es pas loin !';
    if (e <= 10) return 'Pas mal — affine ton repère.';
    if (e <= 20) return 'Un peu loin. Compare à l\'angle droit.';
    return 'Très loin. Regarde si l\'angle est plus ouvert ou plus fermé qu\'un droit.';
}

/** Cet item se répond-il en estimant un angle ? */
export const estUneEstimation = (item) =>
    !!(item && item.meta && typeof item.meta.angle === 'number'
        && typeof item.meta.depart === 'number');
