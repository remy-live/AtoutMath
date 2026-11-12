// RANGER L'ÉCHELLE DES TAILLES — en y jouant pour de bon.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aime le fait de ranger sur une échelle de taille. On donne l'objet
// (en svg) sa valeur sous la forme de 10^... et on range. »
//
// CE QUI SE MESURE ICI NE SE LIT PAS DANS LE CODE : que les dessins SVG
// apparaissent VRAIMENT (un chemin mal écrit ne lève aucune erreur, il ne
// dessine rien — c'est un rectangle vide, et ça se voit seulement à l'œil),
// que neuf cases tiennent SANS FAIRE DÉFILER sur une tablette, et qu'une carte
// posée au mauvais endroit dise DE COMBIEN on s'est trompé.
//
//     node tools/rangerLEchelle.mjs
import { ouvrirSonde } from './sonde.mjs';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const etat = (s) => s.page.evaluate(() => ({
    faits: Number(document.querySelector('[data-faits]')?.textContent || -1),
    cases: document.querySelectorAll('.fr-trou').length,
    cartes: document.querySelectorAll('.fr-carte').length,
    posees: document.querySelectorAll('.fr-carte--posee').length,
    sur: document.querySelectorAll('.fr-pose').length,
    dit: (document.querySelector('[data-dit]')?.textContent || '').trim().slice(0, 80),
    // UN SVG QUI NE DESSINE RIEN A QUAND MÊME UNE BOÎTE : on compte donc les
    // ÉLÉMENTS GRAPHIQUES, pas les balises <svg>.
    traits: document.querySelectorAll('.fr-svg circle, .fr-svg path, .fr-svg rect, .fr-svg ellipse').length,
    etiquettes: [...document.querySelectorAll('.fr-etiq')].map(e => e.textContent.trim()),
    deborde: (() => { const e = document.querySelector('.fr-echelle');
        return e ? e.scrollHeight - e.clientHeight : -1; })(),
    // LA RÉSERVE AUSSI DOIT TENIR : une carte hors de l’écran reste
    // atteignable en faisant défiler, mais rien ne l’annonce — c’est une
    // carte qu’on ne voit pas. Vu au doigt : la cinquième sortait.
    reserveDeborde: (() => { const r = document.querySelector('.fr-reserve');
        return r ? Math.max(r.scrollWidth - r.clientWidth, r.scrollHeight - r.clientHeight) : -1; })()
}));

const centre = (s, sel) => s.page.evaluate((q) => {
    const el = document.querySelector(q);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}, sel);

for (const [nom, l, h] of [['au doigt', 390, 844], ['écran large', 1280, 900]]) {
    const s = await ouvrirSonde({ largeur: l, hauteur: h });
    await s.identifier();
    console.log(`\n═══ ${nom} (${l} × ${h}) ═══`);
    await s.ouvrirExercice('num-echelle-tailles', { monde: 'nous', objets: 5 });
    await s.doitExister('.fr-echelle');
    await s.doitExister('.fr-carte');

    const d = await etat(s);
    dire(d.cases === 9, `neuf cases sur l’échelle (${d.cases})`);
    dire(d.cartes === 5, `cinq objets à ranger (${d.cartes})`);
    dire(d.cases > d.cartes, 'plus de cases que d’objets : pas de placement par élimination');
    dire(d.traits >= d.cartes * 2, `les dessins sont tracés (${d.traits} éléments pour ${d.cartes} objets)`);
    dire(d.deborde <= 0, `l’échelle tient sans défiler (déborde de ${d.deborde} px)`);
    dire(d.reserveDeborde <= 0,
        `et les cartes sont toutes visibles (déborde de ${d.reserveDeborde} px)`);
    dire(d.etiquettes[0].startsWith('10') && d.etiquettes.length === 9,
        `les étiquettes vont de ${d.etiquettes[0]} à ${d.etiquettes[8]}`);

    // ── ON SE TROMPE EXPRÈS, et l'on regarde ce qui est DIT ────────────────
    const carte = await s.page.evaluate(() => {
        const c = document.querySelector('.fr-carte');
        return { id: c.dataset.id, expo: Number(c.dataset.expo) };
    });
    const mauvaise = carte.expo === 4 ? 3 : carte.expo + 1;
    const pc = await centre(s, '.fr-carte');
    const pm = await centre(s, `.fr-trou[data-expo="${mauvaise}"]`);
    await s.page.mouse.move(pc.x, pc.y);
    await s.page.mouse.down();
    await s.page.mouse.move(pm.x, pm.y, { steps: 8 });
    await s.page.mouse.up();
    const rate = await etat(s);
    dire(rate.faits === 0 && rate.sur === 0, `rien n’est posé sur la mauvaise case (${rate.sur})`);
    dire(/fois trop (grand|petit)/.test(rate.dit),
        `et l’on dit DE COMBIEN : « ${rate.dit} »`);

    // ── PUIS ON LA POSE AU BON ENDROIT, EN TIRANT ─────────────────────────
    const pb = await centre(s, `.fr-trou[data-expo="${carte.expo}"]`);
    await s.page.mouse.move(pc.x, pc.y);
    await s.page.mouse.down();
    await s.page.mouse.move(pb.x, pb.y, { steps: 8 });
    await s.page.mouse.up();
    const ok1 = await etat(s);
    dire(ok1.faits === 1 && ok1.sur === 1, `la carte se pose et compte (${ok1.faits})`);
    dire(ok1.posees === 1, 'la carte de la réserve passe en retrait');
    dire(ok1.dit.length > 10, `et la taille se lit : « ${ok1.dit} »`);

    // ── LE GESTE À DEUX TOUCHES MARCHE AUSSI ──────────────────────────────
    const autre = await s.page.evaluate(() => {
        const c = [...document.querySelectorAll('.fr-carte')].find(x => !x.disabled);
        return c ? { id: c.dataset.id, expo: Number(c.dataset.expo) } : null;
    });
    const pa = await centre(s, `.fr-carte[data-id="${autre.id}"]`);
    const pz = await centre(s, `.fr-trou[data-expo="${autre.expo}"]`);
    await s.page.mouse.click(pa.x, pa.y);
    await s.page.mouse.click(pz.x, pz.y);
    const ok2 = await etat(s);
    dire(ok2.faits === 2, `toucher-puis-toucher range aussi (${ok2.faits})`);

    await s.photo('.fr-cadre', `tools/tmp/echelle-${l}.png`);

    // ── ET L'ÉCHELLE SE FINIT ─────────────────────────────────────────────
    for (let i = 0; i < 6; i++) {
        const reste = await s.page.evaluate(() => {
            const c = [...document.querySelectorAll('.fr-carte')].find(x => !x.disabled);
            return c ? { id: c.dataset.id, expo: Number(c.dataset.expo) } : null;
        });
        if (!reste) break;
        const p1 = await centre(s, `.fr-carte[data-id="${reste.id}"]`);
        const p2 = await centre(s, `.fr-trou[data-expo="${reste.expo}"]`);
        await s.page.mouse.click(p1.x, p1.y);
        await s.page.mouse.click(p2.x, p2.y);
    }
    const fin = await etat(s);
    dire(fin.faits === 5, `les cinq objets sont rangés (${fin.faits})`);
    dire(/DIX FOIS/.test(fin.dit), `et l’on dit la règle à la fin : « ${fin.dit} »`);
    await s.photo('.fr-cadre', `tools/tmp/echelle-finie-${l}.png`);

    console.log(`  erreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
    ko += s.erreurs.length + s.fenetresNatives.length;
    for (const e of s.erreurs.slice(0, 4)) console.log('   !', e);
    await s.fermer();
}

console.log(ko === 0 ? '\nL’ÉCHELLE SE RANGE.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
