// LA MÉDIANE AU DOIGT, SUR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour la médiane, on peut ranger dans l'ordre croissant par drag
// drop », puis « et on peut sélectionner ou barrer des valeurs qui
// s'affichent ».
//
// ── CE QU'AUCUNE ÉPREUVE DE SOURCE NE PEUT DIRE ───────────────────────────
//
// Un glisser-déposer ne se lit pas : il se fait. `touch-action`, la capture du
// pointeur, le recalage du point de référence quand le jeton change de case —
// chacune de ces trois lignes rend un rangement IMPOSSIBLE si elle manque, et
// aucune des trois ne lève d'erreur. On fait donc le geste pour de vrai, à la
// souris (les événements de pointeur sont les mêmes), et l'on regarde l'ordre
// obtenu.
//
//     node tools/medianeAuDoigt.mjs            # impaire et paire
//     node tools/medianeAuDoigt.mjs --photos   # et les images dans tools/tmp/

import { ouvrirSonde } from './sonde.mjs';

const photos = process.argv.includes('--photos');
let echecs = 0;
const ok = (quoi, vrai, detail = '') => {
    if (!vrai) echecs++;
    console.log((vrai ? '  ok   ' : '  NON  ') + quoi + (detail ? '  — ' + detail : ''));
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

/** Les nombres affichés, de gauche à droite, et leur état. */
const lireLaRangee = () => s.page.evaluate(() => [...document.querySelectorAll('.md-jeton')]
    .map(b => ({
        v: Number(b.textContent.trim().replace(',', '.')),
        barre: b.classList.contains('md-jeton--barre'),
        bout: b.classList.contains('md-jeton--bout')
    })));

/**
 * Fait glisser le jeton du rang `de` jusqu'au rang `vers`, comme un doigt.
 *
 * ON PASSE PAR DES ÉTAPES INTERMÉDIAIRES : un seul `mouse.move` d'un bout à
 * l'autre n'émet qu'un `pointermove`, et le réordonnancement se fait voisin par
 * voisin. Un geste réel, lui, traverse toutes les cases.
 */
async function glisser(de, vers) {
    const boites = await s.page.$$('.md-jeton');
    const a = await boites[de].boundingBox();
    const b = await boites[vers].boundingBox();
    const depart = a.x + a.width / 2;
    // ON VISE LE BORD OPPOSÉ DE LA CIBLE, ET NON SON CENTRE.
    //
    // PREMIER JET : la sonde amenait le doigt au CENTRE du jeton voisin, et
    // rien ne bougeait jamais d'un cran. L'activité échange quand le pointeur
    // dépasse le MILIEU du voisin — « strictement après ». Viser le centre,
    // c'est s'arrêter pile sur la frontière : le jeton revient à sa place, et
    // la sonde accuse un logiciel sain.
    const arrivee = vers > de ? b.x + b.width - 3 : b.x + 3;
    await s.page.mouse.move(depart, a.y + a.height / 2);
    await s.page.mouse.down();
    const pas = 14;
    for (let i = 1; i <= pas; i++) {
        await s.page.mouse.move(depart + (arrivee - depart) * i / pas, a.y + a.height / 2);
        await s.page.waitForTimeout(16);
    }
    await s.page.mouse.up();
    await s.page.waitForTimeout(90);
}

/**
 * Touche le n-ième jeton. ON REDEMANDE LA POIGNÉE À CHAQUE FOIS : l'activité
 * redessine sa rangée après chaque geste, et une poignée Playwright gardée
 * d'un tour sur l'autre désigne un élément détaché — « Element is not attached
 * to the DOM », qui ressemble à un défaut du logiciel et n'en est pas un.
 */
async function toucherJeton(i) {
    await s.page.locator('.md-jeton').nth(i).click();
    await s.page.waitForTimeout(110);
}

/**
 * Range la rangée en entier, par glissers successifs — un tri par SÉLECTION :
 * on va chercher le plus petit de ce qui reste et on le ramène en tête.
 *
 * PREMIER JET, ET IL LAISSAIT LA SÉRIE EN DÉSORDRE : il cherchait la première
 * descente et emmenait le PLUS GRAND des deux vers la fin. Sur 13 · 16 · 12 ·
 * 15 · 11 · 8 · 9, il rangeait six nombres sur sept et laissait le 9 à la
 * queue, pour toujours — le 16 n'avait plus personne à dépasser. La sonde
 * accusait alors le glisser-déposer, qui marchait très bien.
 *
 * UN TRI PAR SÉLECTION NE PEUT PAS BOUCLER : à chaque tour, une place de plus
 * est définitivement juste.
 */
async function rangerTout() {
    const n = (await lireLaRangee()).length;
    for (let place = 0; place < n - 1; place++) {
        const vus = (await lireLaRangee()).map(j => j.v);
        let mini = place;
        for (let k = place + 1; k < n; k++) if (vus[k] < vus[mini]) mini = k;
        if (mini !== place) await glisser(mini, place);
    }
    return (await lireLaRangee()).map(j => j.v).every((v, k, t) => k === 0 || t[k - 1] <= v);
}

for (const [marche, nom, paire] of [
    ['mediane-desordre', 'série impaire, en désordre', false],
    ['mediane-paire', 'série paire', true]
]) {
    console.log(`\n  ── ${nom} ──`);
    const raté = await s.ouvrirExercice('don-mediane-doigt', { marches: [marche] });
    if (raté) throw new Error(marche + ' : ' + raté);
    await s.page.waitForTimeout(900);
    // `doitExister` JETTE si le crochet ne désigne rien : un sélecteur inventé
    // rend `false`, c'est-à-dire la même réponse qu'un logiciel cassé.
    await s.doitExister('.md-rangee');
    await s.doitExister('.md-jeton');

    const depart = (await lireLaRangee()).map(j => j.v);
    ok('la série s\'affiche en jetons', depart.length >= 5, depart.join(' · '));
    ok(`elle a un nombre ${paire ? 'PAIR' : 'IMPAIR'} de valeurs`,
        depart.length % 2 === (paire ? 0 : 1), `${depart.length} valeurs`);

    // ── ON REFUSE DE PASSER À LA SUITE TANT QUE CE N'EST PAS RANGÉ ──────
    //
    // Et le refus doit NOMMER la paire qui coince : « c'est faux » laisserait
    // relire sept nombres sans savoir lequel reprendre.
    const desordre = depart.some((v, k) => k < depart.length - 1 && v > depart[k + 1]);
    if (desordre) {
        await s.page.click('[data-valider]');
        await s.page.waitForTimeout(200);
        const dit = await s.page.textContent('[data-statut]');
        ok('en désordre, « C\'est rangé » est refusé', /pas encore rangé/i.test(dit || ''),
            (dit || '').slice(0, 60));
        ok('et le refus nomme les deux nombres', /plus grand que/i.test(dit || ''));
    }

    ok('le glisser range vraiment la série', await rangerTout(),
        (await lireLaRangee()).map(j => j.v).join(' · '));
    if (photos) await s.photo('.canvas-area', `tools/tmp/mediane-${marche}-range.png`);

    await s.page.click('[data-valider]');
    await s.page.waitForTimeout(250);
    let rangee = await lireLaRangee();
    const bouts = rangee.filter(j => j.bout).length;
    ok('les deux bouts se désignent', bouts === 2, `${bouts} désigné(s)`);

    // ── ON NE BARRE QUE PAR LES BOUTS ──────────────────────────────────
    await toucherJeton(Math.floor(rangee.length / 2));
    const refus = await s.page.textContent('[data-statut]');
    ok('barrer au MILIEU est refusé', /par les BOUTS/i.test(refus || ''),
        (refus || '').slice(0, 50));

    // ── ET ON BARRE DEUX PAR DEUX, PAR LES DEUX BOUTS ──────────────────
    for (let tour = 0; tour < 10; tour++) {
        rangee = await lireLaRangee();
        const vivants = rangee.filter(j => !j.barre);
        if (vivants.length <= 2) break;
        const iG = rangee.findIndex(j => !j.barre);
        const iD = rangee.length - 1 - [...rangee].reverse().findIndex(j => !j.barre);
        await toucherJeton(iG);
        await toucherJeton(iD);
    }
    rangee = await lireLaRangee();
    const vivants = rangee.filter(j => !j.barre).map(j => j.v);
    ok(`il reste ${paire ? 'DEUX' : 'UN'} nombre${paire ? 's' : ''}`,
        vivants.length === (paire ? 2 : 1), vivants.join(' et '));

    if (paire) {
        // LE MOMENT QUI COMPTE : la médiane d'une série paire n'est PAS une
        // valeur de la série. Les trois propositions sont les deux survivants
        // et leur moyenne, c'est-à-dire les deux fautes et la réponse.
        await s.doitExister('.md-prop');
        const props = await s.page.$$eval('.md-prop',
            els => els.map(e => Number(e.textContent.trim().replace(',', '.'))));
        ok('trois propositions : les deux du milieu et leur moyenne', props.length === 3,
            props.join(' · '));
        const milieu = (vivants[0] + vivants[1]) / 2;
        ok('et la moyenne des deux y est', props.includes(milieu), String(milieu));
        await s.page.locator('.md-prop').nth(props.indexOf(milieu)).click();
        await s.page.waitForTimeout(140);
    }
    if (photos) await s.photo('.canvas-area', `tools/tmp/mediane-${marche}-barre.png`);

    await s.page.click('[data-valider]');
    await s.page.waitForTimeout(900);
    const juste = await s.page.evaluate(() => !!document.querySelector('.md-rangee--ok')
        || !!document.querySelector('.feedback-correct, .fb-ok, .game-feedback--ok'));
    ok('la réponse est comptée juste', juste);
}

ok('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
ok('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));
await s.fermer();

console.log('\n' + '─'.repeat(64));
console.log(echecs ? `\n${echecs} POINT(S) À REVOIR.`
    : '\nON RANGE AU DOIGT, ON BARRE PAR LES BOUTS, ET LA MÉDIANE SORT.');
process.exit(echecs ? 1 : 0);
