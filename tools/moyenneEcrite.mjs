// LA MOYENNE ÉCRITE, SUR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour la moyenne il faudrait que l'élève écrive le calcul (avec
// parenthèses) et il faut de la moyenne pondérée ».
//
// ── POURQUOI UNE SONDE, ET PAS SEULEMENT `npm test` ───────────────────────
//
// AUCUNE ÉPREUVE DE SOURCE N'AURAIT VU LE DÉFAUT QU'ON VIENT DE CORRIGER, et
// il était pourtant énorme : l'élève recevait le pavé de CHIFFRES sous « Écris
// le CALCUL de la moyenne, avec les parenthèses ». Ni parenthèse, ni barre de
// fraction, ni « + » — la question était intapable.
//
// Le générateur, lui, disait tout : `saisieSeule`, `composable: 'litteral'`.
// Une épreuve de source l'aurait lu et serait repartie satisfaite. Mais ces
// deux mots-là n'étaient lus que par le QCM, et `don-statistiques` écrit
// `activityId: 'numpad'` — il n'emprunte jamais le QCM. Le défaut vivait dans
// l'ESPACE ENTRE deux fichiers, qui est précisément ce qu'une épreuve de source
// ne regarde pas.
//
//     « Une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure pas
//       son problème. »
//
//     node tools/moyenneEcrite.mjs            # les deux marches
//     node tools/moyenneEcrite.mjs --photos   # et les images dans tools/tmp/

import { ouvrirSonde } from './sonde.mjs';

const photos = process.argv.includes('--photos');
let echecs = 0;
const ok = (quoi, vrai, detail = '') => {
    if (!vrai) echecs++;
    console.log((vrai ? '  ok   ' : '  NON  ') + quoi + (detail ? '  — ' + detail : ''));
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 860 });
await s.identifier();

// ───────────────────────────────────── ÉCRIRE LE CALCUL ────────────────────

console.log('\n  ── Écrire le CALCUL de la moyenne ──');
let raté = await s.ouvrirExercice('don-statistiques', { marches: ['moyenne-calcul'] });
if (raté) throw new Error('moyenne-calcul : ' + raté);
await s.page.waitForTimeout(900);
// `doitExister` JETTE si le crochet ne désigne rien : un sélecteur inventé rend
// `false`, c'est-à-dire la même réponse qu'un logiciel cassé.
await s.doitExister('.game-question');

const clavier = await s.page.evaluate(() => {
    const touches = [...document.querySelectorAll('.ls-t')].map(b => b.dataset.t);
    return {
        touches,
        pave: !!document.querySelector('.numpad'),
        champ: !!document.querySelector('[data-valider]')
    };
});
ok('le clavier des expressions a pris la main', clavier.touches.length > 0 && !clavier.pave,
    clavier.pave ? 'c\'est le pavé de CHIFFRES qui s\'affiche' : `${clavier.touches.length} touches`);
for (const t of ['(', ')', '/', '+']) {
    ok(`la touche « ${t} » est là`, clavier.touches.includes(t));
}
// ET CELLE QU'ON NE VEUT PAS : « une touche offerte est une touche qu'on croit
// utile » (litteralSaisie.js). Un carré n'a rien à faire dans une moyenne, et
// il s'allumait par défaut.
ok('et la touche « ² » n\'y est pas', !clavier.touches.includes('²'),
    clavier.touches.includes('²') ? 'un carré sur une moyenne d\'âges' : '');

/** Tape une expression en appuyant sur les VRAIES touches, comme l'élève. */
async function taper(texte) {
    for (const c of texte) {
        const bouton = await s.page.$(`.ls-t[data-t="${c}"]`);
        if (!bouton) { ok(`touche manquante : ${c}`, false); return false; }
        await bouton.click();
        await s.page.waitForTimeout(40);
    }
    return true;
}

const serie = await s.page.evaluate(() => {
    const el = document.querySelector('.st-serie');
    return el ? el.textContent.replace(/[^\d;]/g, '').split(';').filter(Boolean) : [];
});
ok('la série se lit dans l\'énoncé', serie.length >= 3, serie.join(' ; '));

// ── LA FAUTE DU CHAPITRE D'ABORD : sans parenthèses, seule la dernière valeur
//    est divisée. On veut la voir REFUSÉE, et le refus doit la nommer.
if (await taper(`${serie.join('+')}/${serie.length}`)) {
    await s.page.click('[data-valider]');
    await s.page.waitForTimeout(600);
    const verdict = await s.page.evaluate(() => ({
        ko: !!document.querySelector('.ls-champ--ko, .ls-champ--presque'),
        note: (document.querySelector('.ls-note') || {}).textContent || ''
    }));
    ok('sans parenthèses, c\'est refusé', verdict.ko);
    ok('et le refus NOMME les parenthèses', /parenthès/i.test(verdict.note),
        verdict.note.slice(0, 70) || 'rien n\'est dit');
}
if (photos) await s.photo('.canvas-area', 'tools/tmp/moyenne-calcul.png');

// ───────────────────────────────────── LA MOYENNE PONDÉRÉE ─────────────────

console.log('\n  ── La moyenne pondérée ──');
raté = await s.ouvrirExercice('don-statistiques', { marches: ['moyenne-ponderee'] });
if (raté) throw new Error('moyenne-ponderee : ' + raté);
await s.page.waitForTimeout(900);
await s.doitExister('.game-question');

const tableau = await s.page.evaluate(() => {
    const t = document.querySelector('.st-coefs');
    if (!t) return null;
    const lignes = [...t.querySelectorAll('tr')].map(tr => ({
        nom: (tr.querySelector('th') || {}).textContent || '',
        cases: [...tr.querySelectorAll('td')].map(td => td.textContent)
    }));
    const r = t.getBoundingClientRect();
    // LES COLONNES SONT-ELLES VRAIMENT ALIGNÉES ? C'est tout l'intérêt du
    // tableau : la note au-dessus de SON coefficient. Deux largeurs de case
    // différentes les désapparieraient, et le tableau mentirait.
    const centres = [...t.querySelectorAll('tr')].map(tr =>
        [...tr.querySelectorAll('td')].map(td => Math.round(
            td.getBoundingClientRect().left + td.getBoundingClientRect().width / 2)));
    return { lignes, largeur: Math.round(r.width), centres,
        pave: !!document.querySelector('.numpad') };
});
ok('les notes et les coefficients sont en tableau', !!tableau,
    tableau ? '' : 'l\'énoncé est resté en ligne');
if (tableau) {
    ok('deux lignes, Note et Coefficient', tableau.lignes.length === 2
        && /Note/.test(tableau.lignes[0].nom) && /Coefficient/.test(tableau.lignes[1].nom),
        tableau.lignes.map(l => `${l.nom} ${l.cases.join(' ')}`).join(' | '));
    ok('autant de cases sur les deux lignes',
        tableau.lignes[0].cases.length === tableau.lignes[1].cases.length);
    // ── ET LES COEFFICIENTS NE SONT PAS TOUS ÉGAUX ──────────────────────
    //
    // VU À L'ÉCRAN : « Note 14 · 11 / Coefficient 1 · 1 » — une moyenne
    // ORDINAIRE habillée en tableau, où la faute du chapitre est impossible.
    const coefs = tableau.lignes[1].cases;
    ok('les coefficients pèsent vraiment', !coefs.every(c => c === coefs[0]),
        'coefficients : ' + coefs.join(' · '));
    const [haut, bas] = tableau.centres;
    ok('chaque note est au-dessus de SON coefficient',
        haut.every((x, i) => Math.abs(x - bas[i]) <= 1),
        haut.map((x, i) => `${x}/${bas[i]}`).join(' '));
    // ET CETTE QUESTION-LÀ SE TAPE EN CHIFFRES : le clavier des expressions a
    // rendu la main. Sans ce retour, il resterait pour toute la fin de la
    // séance, et l'élève taperait un nombre sur un clavier d'expressions.
    ok('le pavé de chiffres a repris la main', tableau.pave);
}
if (photos) await s.photo('.canvas-area', 'tools/tmp/moyenne-ponderee.png');

ok('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
ok('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));
await s.fermer();

console.log('\n' + '─'.repeat(64));
console.log(echecs ? `\n${echecs} POINT(S) À REVOIR.`
    : '\nLA MOYENNE S\'ÉCRIT, ET LA PONDÉRÉE PÈSE.');
process.exit(echecs ? 1 : 0);
