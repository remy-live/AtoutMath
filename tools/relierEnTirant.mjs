// TIRER LE TRAIT, ET LES CASES QUI BOUGENT — mesuré en tirant vraiment.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on pourrait aussi relier en appuyant et relachant entre les
// puissances de 10 et le traits se crées. et on peut faire un mode rigolo ou
// les cases bougent 🙂 »
//
// CE QUI SE MESURE ICI NE SE LIT PAS DANS LE CODE : qu'un trait apparaisse
// PENDANT le mouvement, que la carte visée s'allume avant qu'on lâche, qu'un
// trait lâché dans le vide ne compte rien, et qu'en mode rigolo les traits
// SUIVENT des cartes qui dérivent. Un « il n'y a pas d'erreur de page » ne dit
// rien de tout cela.
//
//     node tools/relierEnTirant.mjs
import { ouvrirSonde } from './sonde.mjs';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

/** Le centre d'une carte, à l'écran. */
const centre = async (s, cote, rang) => s.page.evaluate(([c, r]) => {
    const el = document.querySelector(`.pa-carte[data-cote="${c}"][data-rang="${r}"]`);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}, [cote, String(rang)]);

const etat = (s) => s.page.evaluate(() => ({
    faits: Number(document.querySelector('[data-faits]')?.textContent || -1),
    justes: document.querySelectorAll('.pa-trait--juste').length,
    encours: document.querySelectorAll('.pa-trait--encours').length,
    faux: document.querySelectorAll('.pa-trait--faux').length,
    vises: document.querySelectorAll('.pa-carte--vise').length,
    dit: document.querySelector('[data-dit]')?.textContent?.slice(0, 60)
}));

for (const [nom, largeur, hauteur] of [['écran large', 1280, 900], ['au doigt', 390, 844]]) {
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    console.log(`\n═══ ${nom} (${largeur} px) ═══`);

    // ── 1. TIRER UN TRAIT JUSTE ─────────────────────────────────────────────
    await s.ouvrirExercice('num-puissances-relier', { famille: 'puissances', paires: 6 });
    await s.doitExister('.pa-carte');
    const a = await centre(s, 'g', 0);
    const b = await centre(s, 'd', 0);
    dire(!!a && !!b, 'les deux cartes du rang 0 sont là');

    await s.page.mouse.move(a.x, a.y);
    await s.page.mouse.down();
    await s.page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
    const enRoute = await etat(s);
    dire(enRoute.encours === 1, `le trait se dessine PENDANT qu'on tire (${enRoute.encours})`);

    await s.page.mouse.move(b.x, b.y, { steps: 6 });
    const surLaCible = await etat(s);
    dire(surLaCible.vises === 1, `la carte visée s'allume avant qu'on lâche (${surLaCible.vises})`);

    await s.page.mouse.up();
    const apres = await etat(s);
    dire(apres.faits === 1, `la paire est comptée une fois (${apres.faits})`);
    dire(apres.justes === 1, `un trait vert reste (${apres.justes})`);
    dire(apres.encours === 0, 'le trait provisoire a disparu');
    dire(apres.vises === 0, 'plus aucune carte n’est « visée »');

    // ── 2. LÂCHER DANS LE VIDE NE COMPTE RIEN ───────────────────────────────
    const c = await centre(s, 'g', 1);
    await s.page.mouse.move(c.x, c.y);
    await s.page.mouse.down();
    await s.page.mouse.move(c.x + 40, c.y + 150, { steps: 6 });
    await s.page.mouse.up();
    const vide = await etat(s);
    dire(vide.faits === 1, `un trait lâché dans le vide ne compte rien (${vide.faits})`);
    dire(vide.encours === 0, 'et il ne reste pas à l’écran');

    // ── 3. LE GESTE À DEUX TOUCHES MARCHE TOUJOURS ──────────────────────────
    // « AUSSI », disait Rémy : le geste d'avant ne disparaît pas.
    const d2 = await centre(s, 'g', 2);
    const e2 = await centre(s, 'd', 2);
    await s.page.mouse.click(d2.x, d2.y);
    await s.page.mouse.click(e2.x, e2.y);
    const deux = await etat(s);
    dire(deux.faits === 2, `toucher-puis-toucher relie encore (${deux.faits})`);

    // ── 4. UNE PAIRE FAUSSE, TIRÉE ──────────────────────────────────────────
    const f1 = await centre(s, 'g', 3);
    const f2 = await centre(s, 'd', 4);
    await s.page.mouse.move(f1.x, f1.y);
    await s.page.mouse.down();
    await s.page.mouse.move(f2.x, f2.y, { steps: 8 });
    await s.page.mouse.up();
    const faux = await etat(s);
    dire(faux.faux === 1 && faux.faits === 2,
        `une paire fausse trace un trait rouge sans rien compter (${faux.faux}, ${faux.faits})`);
    dire(/./.test(faux.dit || ''), `et la phrase dit pourquoi : « ${faux.dit}… »`);

    await s.photo('.pa-cadre', `tools/tmp/relier-${largeur}.png`);

    // ── 5. LE MODE RIGOLO ───────────────────────────────────────────────────
    await s.ouvrirExercice('num-puissances-relier',
        { famille: 'puissances', paires: 6, bougent: true });
    await s.doitExister('.pa-bougent');
    const bouge = await s.page.evaluate(async () => {
        const el = document.querySelector('.pa-carte');
        const lire = () => getComputedStyle(el).transform;
        const t1 = lire();
        await new Promise(r => setTimeout(r, 420));
        const t2 = lire();
        return { t1, t2, cadences: new Set([...document.querySelectorAll('.pa-carte')]
            .map(x => getComputedStyle(x).animationDuration)).size };
    });
    dire(bouge.t1 !== bouge.t2, `une carte dérive vraiment (${bouge.t1} → ${bouge.t2})`);
    dire(bouge.cadences > 1, `les cartes n’ont pas toutes la même cadence (${bouge.cadences})`);

    // Et le trait SUIT la carte qui bouge.
    const g1 = await centre(s, 'g', 0);
    const g2 = await centre(s, 'd', 0);
    await s.page.mouse.move(g1.x, g1.y);
    await s.page.mouse.down();
    await s.page.mouse.move(g2.x, g2.y, { steps: 6 });
    await s.page.mouse.up();
    const suit = await s.page.evaluate(async () => {
        const l = document.querySelector('.pa-trait--juste');
        if (!l) return null;
        const y1 = l.getAttribute('y1');
        await new Promise(r => setTimeout(r, 450));
        return { avant: y1, apres: l.getAttribute('y1') };
    });
    dire(!!suit && suit.avant !== suit.apres,
        `le trait suit la carte qui bouge (${suit?.avant} → ${suit?.apres})`);
    const encoreEnVie = await s.page.evaluate(() => {
        const el = document.querySelector('.pa-carte--relie');
        return el ? getComputedStyle(el).animationName : null;
    });
    dire(encoreEnVie === 'pa-flotte',
        `une carte reliée continue de dériver tant que la partie dure (${encoreEnVie})`);

    // ── 6. QUAND TOUT EST RELIÉ, L'ÉCRAN SE POSE ───────────────────────────
    // C'est le moment où l'on relit le tableau de haut en bas, et on ne relit
    // pas douze cartes qui frétillent.
    for (let r = 1; r < 6; r++) {
        const p = await centre(s, 'g', r);
        const q = await centre(s, 'd', r);
        if (!p || !q) continue;
        await s.page.mouse.move(p.x, p.y);
        await s.page.mouse.down();
        await s.page.mouse.move(q.x, q.y, { steps: 5 });
        await s.page.mouse.up();
    }
    const fini = await s.page.evaluate(() => ({
        faits: Number(document.querySelector('[data-faits]')?.textContent || -1),
        animees: [...document.querySelectorAll('.pa-carte')]
            .filter(e => getComputedStyle(e).animationName !== 'none').length
    }));
    dire(fini.faits === 6, `les six paires sont reliées (${fini.faits})`);
    dire(fini.animees === 0, `et plus une seule carte ne bouge (${fini.animees})`);

    await s.photo('.pa-cadre', `tools/tmp/relier-rigolo-${largeur}.png`);

    console.log(`  erreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
    ko += s.erreurs.length + s.fenetresNatives.length;
    for (const er of s.erreurs.slice(0, 4)) console.log('   !', er);
    await s.fermer();
}

console.log(ko === 0 ? '\nTOUT PASSE.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
