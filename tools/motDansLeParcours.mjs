// UN MOT DU PROFESSEUR, DU GESTE DE RÉMY À L'ÉCRAN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le parcours ce qui serait sympa c'est de pouvoir caler un
// message entre les exercices, pour expliquer un peu. »
//
// CE QUE SEULE UNE SONDE PEUT DIRE, et qu'aucune des épreuves ne dit : que le
// bouton existe à l'écran, que la fenêtre d'écriture s'ouvre, que l'aperçu
// montre le gras, que l'étape apparaît dans la liste de l'atelier avec son
// texte — et surtout que l'élève, en traversant la séance, LIT le mot entre les
// deux exercices, puis peut le RELIRE depuis le fil.
//
// ET LA POLICE. Rémy : « il faut rester cohérent dans la police ». On mesure la
// police RENDUE sur les pixels du navigateur, pas la règle CSS : une famille
// qu'on ne sert pas retombe en silence sur un repli, et c'est exactement ce qui
// s'était produit sur les pièces du bloc Scratch.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);

// ── CÔTÉ PROFESSEUR : L'ATELIER ─────────────────────────────────────────────
console.log('\n\x1b[1mL\'ATELIER DE RÉMY\x1b[0m');
await s.page.click('#top-btn-preparer');
await dormir(1200);

// On repart d'un parcours neuf, avec un exercice, pour que le mot ait un avant
// et un après — c'est tout l'objet de la demande.
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    state.currentPath = makePath('La séance du jeudi', [], politiquePerso());
    const { addStep, renderTeacherPath } = await import('./js/ui/builder.js');
    renderTeacherPath();
    addStep('calc-add');
    addStep('calc-prio');
});
await dormir(900);

// LE TOTAL AVANT, pour le comparer APRÈS. Ma première version attendait 20 en
// dur, et les deux exercices en apportent 25 : chacun propose SON compte
// naturel (voir `questionsConseilleesDe`). La sonde annonçait un défaut qui
// n'existait pas. On mesure donc la DIFFÉRENCE, qui est la seule chose que le
// mot doit laisser intacte.
const avant = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { totalItems, totalWeight } = await import('./js/core/path.js');
    return { questions: totalItems(state.currentPath), bareme: totalWeight(state.currentPath) };
});
console.log(`   avant le mot : ${avant.questions} questions, barème sur ${avant.bareme}`);

const bouton = await s.page.$('#btn-ajouter-mot');
dire('le bouton « ajouter un message » est dans la barre', !!bouton);

// ON CLIQUE, COMME LUI. Le bouton pose l'étape ET ouvre la fenêtre d'écriture.
await s.page.click('#btn-ajouter-mot');
await dormir(900);
const fenetre = await s.page.evaluate(() => {
    const t = [...document.querySelectorAll('.modal-title, h3')]
        .map((e) => e.textContent.trim()).filter(Boolean);
    return {
        titre: t.find((x) => /mot du professeur/i.test(x)) || '',
        champTitre: !!document.getElementById('mot-titre'),
        champTexte: !!document.getElementById('mot-texte'),
        apercu: !!document.getElementById('mot-apercu')
    };
});
dire('la fenêtre d\'écriture s\'ouvre', !!fenetre.titre, fenetre.titre || '(aucun titre)');
dire('elle a un titre, un texte et un aperçu',
    fenetre.champTitre && fenetre.champTexte && fenetre.apercu, JSON.stringify(fenetre));

// ON ÉCRIT, ET L'APERÇU DOIT SUIVRE — avec le gras, et SANS la balise qu'on
// tape exprès pour voir si elle s'exécute.
await s.page.fill('#mot-titre', 'Attention au piège');
await s.page.fill('#mot-texte',
    'Ici on change de *méthode*.\n\nOn calcule la parenthèse <b>d\'abord</b>.');
await dormir(600);
const apercu = await s.page.evaluate(() => {
    const el = document.getElementById('mot-apercu');
    return { html: el.innerHTML, texte: el.textContent, paragraphes: el.querySelectorAll('p').length,
             gras: el.querySelectorAll('b').length };
});
dire('l\'aperçu fait deux paragraphes', apercu.paragraphes === 2, String(apercu.paragraphes));
dire('le gras entre étoiles s\'applique', apercu.gras === 1, String(apercu.gras));
dire('LA BALISE TAPÉE À LA MAIN NE S\'EXÉCUTE PAS',
    apercu.texte.includes('<b>d\'abord</b>') && !/<b>d&#39;abord/.test(apercu.html),
    apercu.texte.includes('<b>') ? 'affichée en texte' : 'DISPARUE — donc interprétée');

await s.page.click('#mot-ok');
await dormir(1000);

const liste = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const lignes = [...document.querySelectorAll('.path-step')].map((e) => ({
        mot: e.classList.contains('path-step--mot'),
        casse: e.classList.contains('path-step--broken'),
        texte: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    }));
    const { totalItems, totalWeight } = await import('./js/core/path.js');
    return { lignes, etapes: state.currentPath.steps.length,
             questions: totalItems(state.currentPath),
             bareme: totalWeight(state.currentPath) };
});
console.log('   la liste de l\'atelier :');
liste.lignes.forEach((l) => console.log(`     ${l.mot ? '💬' : l.casse ? '✗ ' : '  '} ${l.texte}`));
dire('le mot a sa ligne, et n\'est PAS annoncé cassé',
    liste.lignes.some((l) => l.mot) && !liste.lignes.some((l) => l.casse));
dire('la ligne porte le titre du mot',
    liste.lignes.some((l) => l.mot && /Attention au piège/.test(l.texte)));
dire('il n\'ajoute aucune question au total', liste.questions === avant.questions,
    `${avant.questions} → ${liste.questions} pour ${liste.etapes} étapes`);
dire('ET RIEN AU BARÈME — zéro ne doit pas valoir un', liste.bareme === avant.bareme,
    `${avant.bareme} → ${liste.bareme}`);

// ── CÔTÉ ÉLÈVE : LA SÉANCE ──────────────────────────────────────────────────
//
// ON DÉPLACE LE MOT AU MILIEU, parce que c'est là qu'il sert : « caler un
// message ENTRE les exercices ».
console.log('\n\x1b[1mLA SÉANCE, TRAVERSÉE\x1b[0m');
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const st = state.currentPath.steps;
    st.splice(1, 0, st.pop());             // le mot passe en deuxième
    const { Runner } = await import('./js/core/runner.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    // PAS DE `sansTrace`, ET C'EST LA DEUXIÈME ERREUR DE CETTE SONDE : le fil
    // de la séance se dessine à partir du JOURNAL (`avancementDuMoment`). Sans
    // trace, aucun run n'existe, le fil se cache — et la sonde annonçait « 0
    // case » sur un fil qui marche. Elle mesurait son propre réglage.
    state.activeSequenceRunner = new Runner({
        path: { ...state.currentPath, policy: politiquePerso() },
        deviceMode: 'none'
    });
    state.activeSequenceRunner.start();
});
await dormir(2500);

// LE PREMIER EXERCICE S'OUVRE, PAS LE MOT : il est en deuxième position.
let vu = await s.page.evaluate(() => ({
    mot: !!document.querySelector('.run-mot-texte'),
    jeu: !!document.querySelector('#game-layer, .game-wrap, canvas')
}));
dire('la séance s\'ouvre sur l\'exercice, pas sur le mot', !vu.mot);

// ON SAUTE DIRECTEMENT À L'ÉTAPE DU MOT : traverser six additions à la main
// mesurerait la patience de la sonde, pas le logiciel.
await s.page.evaluate(() => {
    const r = window.state ? null : null;
    return import('./js/core/state.js').then(({ state }) => {
        const run = state.activeSequenceRunner;
        run.index = 1;
        run.runStep();
    });
});
await dormir(1400);

const ecran = await s.page.evaluate(() => {
    const t = document.querySelector('.run-mot-texte');
    const titre = document.querySelector('.run-mot .run-screen-title');
    const btn = document.getElementById('btn-run-mot');
    const cs = t ? getComputedStyle(t) : null;
    return {
        present: !!t,
        titre: titre ? titre.textContent.trim() : '',
        texte: t ? t.textContent.replace(/\s+/g, ' ').trim() : '',
        gras: t ? t.querySelectorAll('b').length : 0,
        bouton: btn ? btn.textContent.trim() : '',
        police: cs ? cs.fontFamily : '',
        aligne: cs ? cs.textAlign : ''
    };
});
dire('L\'ÉLÈVE LIT LE MOT entre les deux exercices', ecran.present);
dire('avec son titre', /Attention au piège/.test(ecran.titre), ecran.titre);
dire('et son gras', ecran.gras === 1, String(ecran.gras));
dire('un seul bouton, et il dit ce qu\'il fait', ecran.bouton === 'J\'ai compris', ecran.bouton);
// LA POLICE RENDUE, et non la règle CSS : c'est la seule mesure qui attrape un
// repli silencieux.
dire('LA POLICE EST CELLE DU LOGICIEL', /Outfit/i.test(ecran.police), ecran.police);
dire('le paragraphe est aligné à gauche, pas centré', ecran.aligne === 'left', ecran.aligne);

// « J'AI COMPRIS » DOIT DONNER L'EXERCICE SUIVANT, pas un second écran.
await s.page.click('#btn-run-mot');
await dormir(1800);
vu = await s.page.evaluate(() => ({
    mot: !!document.querySelector('.run-mot-texte'),
    bilan: !!document.getElementById('btn-run-next'),
    titre: (document.getElementById('game-title') || {}).textContent || ''
}));
dire('« J\'ai compris » enchaîne sur l\'exercice suivant',
    !vu.mot && !vu.bilan, vu.titre.trim() || JSON.stringify(vu));

// ── LE RELIRE, DEPUIS LE FIL ────────────────────────────────────────────────
console.log('\n\x1b[1mLE RELIRE\x1b[0m');
const fil = await s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('#fil-seance .fil-pas')];
    const mot = cases.find((c) => c.classList.contains('fil-pas--mot'));
    return {
        combien: cases.length,
        laCase: !!mot,
        bouton: mot ? mot.tagName : '',
        large: mot ? Math.round(mot.getBoundingClientRect().width) : 0,
        voisine: cases[0] ? Math.round(cases[0].getBoundingClientRect().width) : 0
    };
});
dire('le mot a sa case dans le fil', fil.laCase, `${fil.combien} cases`);
dire('elle est cliquable, même pour l\'élève', fil.bouton === 'BUTTON', fil.bouton);
dire('et elle ne s\'étire pas comme un exercice', fil.large > 0 && fil.large < fil.voisine,
    `${fil.large} px contre ${fil.voisine} px`);

if (fil.laCase) {
    await s.page.click('#fil-seance .fil-pas--mot');
    await dormir(1000);
    const relu = await s.page.evaluate(() => {
        const t = [...document.querySelectorAll('.modal-title, h3')]
            .map((e) => e.textContent.trim());
        const corps = document.querySelector('.modal .run-mot-texte, .run-mot-texte');
        return { titre: t.find((x) => /Attention au piège/.test(x)) || '',
                 texte: corps ? corps.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : '' };
    });
    dire('UN CLIC LE ROUVRE', !!relu.titre && /change de méthode/.test(relu.texte),
        relu.titre || relu.texte || '(rien)');
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mLE MOT DU PROFESSEUR ARRIVE JUSQU\'À L\'ÉLÈVE, ET SE RELIT.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
