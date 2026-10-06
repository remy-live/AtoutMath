// « PARFOIS LE BOUTON VALIDER EST INACTIF » — sur « Enlever les parenthèses ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai un petit bug sur enlever les parenthèses, parfois le bouton
// valider est inactif ».
//
// « PARFOIS » EST LE MOT QUI DÉCIDE DE LA MESURE. Un défaut qui ne se montre
// pas à chaque question ne se trouve pas en relisant le code : il faut jouer
// l'exercice jusqu'au bout, à chaque barreau, et regarder l'état du bouton
// APRÈS CHAQUE GESTE. C'est ce que fait cette sonde.
//
// ── CE QU'ELLE REGARDE, ET POURQUOI CES TROIS CHOSES-LÀ ────────────────────
//
// Le bouton s'éteint quand le champ est vide (`btnValider.disabled =
// saisie.trim() === ''`, litteralSaisie.js) — c'est voulu, et c'est pour cela
// qu'il faut mesurer DEUX choses ensemble et non une :
//
//   · ce que le champ AFFICHE (`.ls-texte`), c'est-à-dire ce que l'élève voit ;
//   · ce que le bouton DIT (`disabled`).
//
// LE DÉFAUT EST L'ÉCART ENTRE LES DEUX : du texte à l'écran et un bouton
// éteint, ou un bouton allumé sur un champ vide. Mesurer le seul `disabled`
// aurait rendu « éteint » sur un champ vide et conclu à un défaut qui n'existe
// pas ; mesurer le seul texte n'aurait rien vu du tout.
//
// Et une troisième, qui est la cause la plus probable :
//
//   · ON TAPE AU CLAVIER PHYSIQUE, pas sur le pavé à l'écran. Rémy travaille
//     sur un ordinateur, et `litteralSaisie` écoute `container.onkeydown` : si
//     le conteneur perd le foyer — un clic ailleurs, une fenêtre qui s'ouvre et
//     se ferme, un changement d'étape —, les frappes ne vont NULLE PART. Le
//     champ reste vide, le bouton reste éteint, et rien ne le dit.
//
//   node tools/boutonValiderInactif.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1300, hauteur: 900 });
await s.identifier();

/** L'état de l'écran, tel que l'élève le voit. */
async function etat() {
    return s.page.evaluate(() => {
        const btn = document.querySelector('[data-valider]');
        const texte = document.querySelector('.ls-texte');
        const item = window.__sondeRunner && window.__sondeRunner.session
            && window.__sondeRunner.session.item;
        const actifs = document.activeElement;
        return {
            bouton: btn ? (btn.disabled ? 'éteint' : 'allumé') : 'ABSENT',
            ecrit: texte ? (texte.textContent || '') : null,
            // QUI A LE FOYER : c'est lui qui reçoit les frappes. Un `onkeydown`
            // posé sur le conteneur ne voit rien si le foyer est ailleurs.
            foyer: actifs ? (actifs.className || actifs.tagName) : '(aucun)',
            rang: [...document.querySelectorAll('.ls-ligne--active')]
                .map(l => l.dataset.etape).join(',') || '(aucune)',
            barreau: item && item.meta ? item.meta.barreau : null,
            etapes: item && item.meta && item.meta.etapes
                ? item.meta.etapes.map(e => e.montrer) : [],
            reponse: item ? String(item.reponsePapier || item.answer || '') : ''
        };
    });
}

let ecarts = 0;
const dire = (quoi, e) => {
    // L'ÉCART EST LE DÉFAUT : du texte écrit et un bouton éteint.
    const ecrit = (e.ecrit || '').trim();
    const faux = (ecrit && e.bouton === 'éteint') || (!ecrit && e.bouton === 'allumé');
    if (faux) ecarts++;
    const marque = faux ? '\x1b[31mÉCART\x1b[0m' : '\x1b[32m ok  \x1b[0m';
    console.log(`  ${marque} ${quoi.padEnd(38)} champ « ${ecrit}${' '.repeat(Math.max(0, 14 - ecrit.length))} » `
        + `bouton ${e.bouton.padEnd(7)} ligne ${String(e.rang).padEnd(8)} foyer ${e.foyer}`);
};

for (const marche of ['deuxNombres', 'dedansDabord', 'deuxParentheses']) {
    console.log(`\n── MARCHE « ${marche} » ${'─'.repeat(50 - marche.length)}`);
    await s.ouvrirExercice('calc-oppose-enlever', { marches: [marche] });
    await dormir(1200);
    await s.doitExister('[data-valider]', 'le bouton Valider de la saisie pas à pas');
    await s.doitExister('.ls-texte', 'le champ où s\'écrit la ligne');

    let e = await etat();
    console.log(`         barreau ${e.barreau} · étapes ${JSON.stringify(e.etapes)} · réponse « ${e.reponse} »`);
    dire('à l\'ouverture (champ vide)', e);

    // ON JOUE TOUTES LES LIGNES, l'une après l'autre, EN TAPANT AU CLAVIER.
    const lignes = [...e.etapes, e.reponse];
    for (let i = 0; i < lignes.length; i++) {
        const ligne = String(lignes[i]);
        // LE CLAVIER PHYSIQUE, TOUCHE À TOUCHE. `page.keyboard.type` envoie de
        // vrais `keydown` : c'est le chemin de l'élève sur un ordinateur, et
        // c'est le seul qui éprouve le foyer.
        await s.page.keyboard.type(ligne.replace(/−/g, '-'), { delay: 45 });
        await dormir(250);
        e = await etat();
        dire(`ligne ${i + 1} tapée : « ${ligne} »`, e);
        if (e.bouton === 'éteint') {
            // ON NE CLIQUE PAS UN BOUTON ÉTEINT — on dit où l'on s'est arrêté.
            console.log('         \x1b[31mle bouton est éteint alors que la ligne est écrite : on s\'arrête ici\x1b[0m');
            break;
        }
        await s.page.click('[data-valider]');
        await dormir(1100);
        // LA BANNIÈRE DE CORRECTION ARRÊTE TOUT TANT QU'ON NE LA FERME PAS.
        const ferme = await s.page.$('.fb-close');
        if (ferme) { await ferme.click(); await dormir(600); }
        e = await etat();
        dire(`après Valider de la ligne ${i + 1}`, e);
    }
}

// ── LES TROIS ÉCRANS SŒURS, QUI PORTENT LA MÊME FORME ──────────────────────
//
// Quatre activités posent un `[data-valider]` qu'elles désactivent et écoutent
// le clavier sur leur conteneur. Si le défaut tient à cette forme et non à cet
// exercice-là, les autres sont touchées — et il faut le SAVOIR, pas le supposer.
//
// MESURÉ AVANT LA CORRECTION : « L'Égalité à Compléter » tombait exactement
// comme « Enlever les parenthèses » — foyer sur BODY après « Valider », clavier
// muet. « Poser une Addition de Fractions » tenait, par chance : son foyer
// retombait sur une touche du pavé, qui est DANS le conteneur.
console.log('\n── LES ÉCRANS SŒURS, APRÈS « VALIDER » ────────────────────────────');
for (const id of ['frac-egalite', 'frac-somme-posee']) {
    await s.ouvrirExercice(id);
    await dormir(1500);
    const avant = await s.page.$('[data-valider]');
    if (!avant) { console.log(`  ${id} : pas de bouton Valider, forme différente`); continue; }
    // On remplit une case au clavier, on valide, et l'on retape : c'est le
    // geste exact qui bloquait.
    await s.page.keyboard.type('3', { delay: 60 });
    await dormir(300);
    const actif = await s.page.evaluate(() => !document.querySelector('[data-valider]').disabled);
    if (actif) {
        await s.page.click('[data-valider]');
        await dormir(1200);
        const f = await s.page.$('.fb-close');
        if (f) { await f.click(); await dormir(600); }
    }
    await s.page.keyboard.type('4', { delay: 60 });
    await dormir(300);
    const apres = await s.page.evaluate(() => {
        const btn = document.querySelector('[data-valider]');
        const dedans = document.querySelector('.canvas-area');
        return {
            foyerDedans: !!(dedans && dedans.contains(document.activeElement)),
            foyer: document.activeElement === document.body ? 'BODY'
                : (document.activeElement.className || document.activeElement.tagName),
            bouton: btn ? (btn.disabled ? 'éteint' : 'allumé') : 'ABSENT'
        };
    });
    // CE QU'ON JUGE : le foyer est-il revenu DANS l'activité ? C'est la seule
    // condition pour que la frappe suivante arrive quelque part.
    if (!apres.foyerDedans) ecarts++;
    console.log(`  ${apres.foyerDedans ? '\x1b[32m ok  \x1b[0m' : '\x1b[31mÉCART\x1b[0m'} `
        + `${id.padEnd(20)} après Valider puis une frappe : foyer ${apres.foyer}`
        + ` · bouton ${apres.bouton}`);
}

console.log('\n' + '─'.repeat(78));
console.log(ecarts
    ? `\x1b[31m${ecarts} écart(s) entre ce que le champ montre et ce que le bouton dit\x1b[0m`
    : '\x1b[32mLE BOUTON SUIT TOUJOURS LE CHAMP : allumé dès qu\'il y a du texte, éteint sinon.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.fermer();
