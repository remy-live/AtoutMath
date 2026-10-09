// LE TAMIS DES SVG IMPORTÉS — et il doit refuser avant de laisser passer.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faudrait pouvoir importer des svg ».
//
// UN SVG EST DU CODE, pas une image. Ce qu'il importera finira dans
// `js/data/dingbats.js`, c'est-à-dire servi à chaque élève de chaque classe,
// dans la page où vit leur session. C'est la seule partie de ce travail où une
// faute ne se corrige pas en montant une version : elle se corrige en appelant
// les familles.
//
// LES ÉPREUVES COMMENCENT DONC PAR CE QU'ON REFUSE, et la liste blanche est
// faite pour qu'un tour qu'on n'avait pas prévu soit refusé plutôt qu'accepté.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    verifierSvg, nettoyerSvg, teindre, prefixerLesIds, TAILLE_MAX
} from '../js/core/svgSobre.js';

/** Un fichier SVG ordinaire, comme un éditeur en produit. */
const PROPRE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- fait avec un éditeur -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <title>une maison</title>
  <path d="M3 12 12 3l9 9v9H3z" fill="none" stroke="#111827" stroke-width="2"/>
  <circle cx="12" cy="16" r="2" fill="#111827"/>
</svg>`;

test('CE QUI EXÉCUTERAIT DU CODE EST REFUSÉ', () => {
    // LES QUATRE CHEMINS CLASSIQUES, et ils arrivent dans de vrais fichiers —
    // un export d'outil de dessin, une icône trouvée en ligne.
    assert.equal(verifierSvg('<script>alert(1)</script>').ok, false);
    assert.match(verifierSvg('<g onload="voler()"><path d="M0 0"/></g>').dit, /onload/);
    assert.match(verifierSvg('<path d="M0 0" onclick="x()"/>').dit, /onclick/);
    assert.match(verifierSvg('<a href="javascript:x()">x</a>').dit, /pas permise|javascript/);
});

test('CE QUI VA CHERCHER DEHORS EST REFUSÉ', () => {
    // UN LIEN SORTANT DIT À QUELQU'UN D'AUTRE quel élève a ouvert quelle page,
    // et quand. Un `href="#degrade"` désigne au contraire un dégradé défini
    // juste au-dessus : celui-là est permis.
    assert.match(verifierSvg('<use href="https://ailleurs.test/x.svg#a"/>').dit, /sort du dessin/);
    assert.match(verifierSvg('<use xlink:href="//ailleurs.test/x"/>').dit, /sort du dessin/);
    assert.equal(verifierSvg('<use href="#degrade"/>').ok, true);
    assert.match(verifierSvg('<rect style="fill: url(http://ailleurs.test/a)"/>').dit, /extérieur/);
    // Un `<image>` tirerait un fichier distant : la balise n'est pas dans la liste.
    assert.match(verifierSvg('<image href="#a"/>').dit, /« image » n'est pas permise/);
    assert.match(verifierSvg('<iframe/>').dit, /« iframe » n'est pas permise/);
    assert.match(verifierSvg('<foreignObject><b>x</b></foreignObject>').dit, /foreignObject/);
});

test('CE QUI EST TROP GROS EST REFUSÉ', () => {
    // Un dessin de deux cents kilo-octets collé dans `js/data/dingbats.js` rend
    // le fichier illisible et double le poids du site pour une seule énigme.
    const enorme = '<path d="' + 'M0 0'.repeat(20000) + '"/>';
    assert.ok(enorme.length > TAILLE_MAX);
    assert.match(verifierSvg(enorme).dit, /caractères/);
    assert.equal(verifierSvg('').ok, false);
    assert.equal(verifierSvg('   ').ok, false);
});

test('UN DESSIN ORDINAIRE PASSE, ET IL EN RESTE QUELQUE CHOSE', () => {
    // UN TAMIS QUI REFUSE TOUT NE SERAIT PAS UN TAMIS. L'épreuve qui donne du
    // prix à toutes les autres : un fichier réel passe, entier.
    const { contenu, vueBoite, retires } = nettoyerSvg(PROPRE, { encre: false });
    assert.deepEqual(vueBoite, [0, 0, 24, 24]);
    assert.match(contenu, /<path/);
    assert.match(contenu, /<circle/);
    // L'ENVELOPPE EST PARTIE : la nôtre portera la position, la taille et la
    // rotation. Garder la sienne les écraserait.
    assert.ok(!/<svg/.test(contenu) && !/xmlns/.test(contenu));
    // ET CE QU'ON A RETIRÉ EST DIT : Rémy doit savoir que son titre a sauté.
    assert.ok(retires.includes('titre et notes'));
    assert.ok(retires.includes('commentaires'));
    assert.equal(verifierSvg(contenu).ok, true);
});

test('CE QU\'ON RETIRE EST VRAIMENT RETIRÉ', () => {
    const vilain = `<svg viewBox="0 0 10 10">
        <script>fetch('//ailleurs.test')</script>
        <style>* { fill: url(//ailleurs.test/a) }</style>
        <rect x="0" y="0" width="10" height="10" onclick="voler()" fill="red"/>
        <animate attributeName="x" to="5"/>
    </svg>`;
    const { contenu, retires } = nettoyerSvg(vilain, { encre: false });
    assert.ok(!/script|style|onclick|animate/i.test(contenu), `il reste : ${contenu}`);
    assert.match(contenu, /<rect/);
    for (const quoi of ['scripts', 'feuilles de style', 'gestionnaires d\'événements', 'animations']) {
        assert.ok(retires.includes(quoi), `« ${quoi} » n'est pas annoncé comme retiré`);
    }
    // ET LE VERDICT FINAL EST REPASSÉ : le nettoyage ne se croit pas sur parole.
    assert.equal(verifierSvg(contenu).ok, true);
});

test('UN FICHIER QU\'ON NE SAIT PAS NETTOYER JETTE, IL NE REND PAS DU VIDE', () => {
    // RENDRE UNE CHAÎNE VIDE SERAIT LE PIRE : on croirait avoir importé un
    // dessin, et l'énigme montrerait un cadre nu — la même chose qu'un logiciel
    // cassé, encore une fois.
    assert.throws(() => nettoyerSvg('bonjour'), /pas de balise <svg>/);
    assert.throws(() => nettoyerSvg('<svg viewBox="0 0 10 10"></svg>'), /vide/);
    // SANS `viewBox` NI TAILLE, on ne peut pas mettre à l'échelle.
    assert.throws(() => nettoyerSvg('<svg><path d="M0 0"/></svg>'), /viewBox/);
    // Sans viewBox mais avec une taille, on la fabrique.
    assert.deepEqual(
        nettoyerSvg('<svg width="40" height="20"><path d="M0 0"/></svg>').vueBoite,
        [0, 0, 40, 20]);
});

test('LE DESSIN SUIT L\'ENCRE DU THÈME', () => {
    // L'APPLICATION A CINQ THÈMES. Un dessin au trait noir importé tel quel
    // DISPARAÎT sur le thème sombre — et personne ne le verra, puisqu'on compose
    // en clair. C'est le même piège que les couleurs des compositions.
    const t = teindre('<path fill="#111827" stroke="rgb(0,0,0)"/>');
    assert.match(t, /fill="currentColor"/);
    assert.match(t, /stroke="currentColor"/);
    // `none` N'EST PAS UNE COULEUR, c'est une absence de peinture : le confondre
    // remplirait de noir toutes les formes creuses du dessin.
    assert.match(teindre('<path fill="none" stroke="#000"/>'), /fill="none"/);
    // Un dégradé reste un dégradé : `url(#…)` ne se remplace pas.
    assert.match(teindre('<rect fill="url(#d)"/>'), /fill="url\(#d\)"/);
    // Et dans un style en ligne aussi.
    assert.match(teindre('<path style="fill:#333;stroke:#444"/>'), /fill: currentColor/);

    // Par défaut, `nettoyerSvg` teint : c'est le cas qui protège.
    assert.match(nettoyerSvg(PROPRE).contenu, /currentColor/);
    assert.ok(!/currentColor/.test(nettoyerSvg(PROPRE, { encre: false }).contenu));
});

test('DEUX DESSINS NE SE VOLENT PAS LEURS DÉGRADÉS', () => {
    // Deux SVG importés d'affilée portent souvent tous deux `id="a"`. Posés sur
    // la même page, le second gagne, et le premier se peint avec le dégradé du
    // second — une image qui change de couleur toute seule, sans rien dans le
    // code qui le dise.
    const un = '<defs><linearGradient id="a"><stop offset="0"/></linearGradient></defs>'
        + '<rect fill="url(#a)"/><use href="#a"/>';
    const prefixe = prefixerLesIds(un, 'dg7-');
    assert.match(prefixe, /id="dg7-a"/);
    assert.match(prefixe, /url\(#dg7-a\)/);
    assert.match(prefixe, /href="#dg7-a"/);
    // Ce qui ne porte pas cet identifiant ne bouge pas.
    assert.match(prefixerLesIds('<rect fill="url(#autre)"/>', 'dg7-'), /url\(#autre\)/);
});
