// LA BARRE DE L'ÉTAPE, QUESTION PAR QUESTION — ce qu'elle dit et ce qui est vrai.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans l'épreuve multiplier des relatifs pas à pas, quand on a fait
// 12/24 et bien la barre de progression qui est dans les barres en haut est
// pleine alors qu'elle devrait être à la moitié ».
//
// IL Y A DEUX COMPTEURS EN HAUT DE L'ÉCRAN, ET AUCUNE ÉPREUVE NE LES COMPARE :
//
//   · `#game-progress-bar` et son texte — l'avancement DANS l'exercice, nourri
//     par le meneur lui-même (`itemsResolved.size / step.nbItems`) ;
//   · les cases du fil (`.fil-pas i`) — une par étape, nourries par le
//     JOURNAL, via `avancementDuRun`.
//
// Ils répondent à la même question par deux chemins qui ne se croisent jamais,
// et c'est exactement le genre d'endroit où un écart vit des mois sans être vu.
// On les lit donc À CHAQUE RÉPONSE, côte à côte.
//
// ET ON MET UNE ÉTAPE AVANT, parce que c'est la situation de Rémy : son
// « Multiplier des Relatifs » est la deuxième marche d'une séance de treize.
// Une mesure sur un parcours d'une seule étape aurait trouvé les deux
// compteurs d'accord — `faites` vaut alors zéro, et `plan[0]` est bien l'étape
// en cours.
//
// ── DEUX SCÈNES, ET C'EST LA SECONDE QUI PORTE LE DÉFAUT ────────────────────
//
// La première traverse le parcours tout droit. La seconde REFAIT une étape —
// « Refaire pour m'améliorer », le bouton que `showStepResult` propose à qui a
// validé sans être parfait, c'est-à-dire à la moitié d'une classe. Rien ne
// disait que les deux scènes devaient donner le même résultat : il fallait les
// mesurer toutes les deux.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1200);

const COMBIEN = 24;  // « Douze marches, deux questions chacune »
const APRES = 6;     // l'étape d'après, VOLONTAIREMENT plus courte

/** Monte un parcours de trois étapes et le lance. L'étape du milieu est celle de Rémy. */
async function monterLaSeance(avant, seuil) {
    const raté = await s.page.evaluate(async ([avant, seuil, combien, apres]) => {
        if (window.__sondeRunner) { try { window.__sondeRunner.exit(); } catch (e) { /* rien */ } }
        await new Promise(ok => setTimeout(ok, 300));
        const { state } = await import('./js/core/state.js');
        const { makeStep, makePath } = await import('./js/core/path.js');
        const { politiquePerso } = await import('./js/core/mesExercices.js');
        const { Runner } = await import('./js/core/runner.js');
        const pas = [
            makeStep('calc-oppose-regle', {}, { stepId: 'p1', nbItems: avant, threshold: seuil }),
            makeStep('num-relatifs-produit', {}, { stepId: 'p2', nbItems: combien, threshold: 0 }),
            makeStep('calc-oppose-regle', {}, { stepId: 'p3', nbItems: apres, threshold: 0 })
        ];
        if (pas.some(p => !p.exerciseId)) return 'étape sans exercice';
        window.__sondeRunner = new Runner({
            path: makePath('La barre de l\'étape', pas, politiquePerso()),
            deviceMode: 'none'
        });
        state.activeSequenceRunner = window.__sondeRunner;
        window.__sondeRunner.start();
        return null;
    }, [avant, seuil, COMBIEN, APRES]);
    if (raté) { console.log(`\x1b[31m${raté}\x1b[0m`); await s.fermer(); process.exit(1); }
    await dormir(1800);
}

/** CE QUE LES DEUX COMPTEURS DISENT, À CET INSTANT. */
const lire = () => s.page.evaluate(async () => {
    const { dernierAvancement } = await import('./js/ui/filSeance.js');
    const av = dernierAvancement();
    const r = window.__sondeRunner;
    const cases = [...document.querySelectorAll('#fil-seance .fil-pas')].map(p => {
        const i = p.querySelector('i');
        return {
            ici: p.classList.contains('fil-pas--ici'),
            fait: p.classList.contains('fil-pas--fait'),
            // LE POURCENT ÉCRIT, ET LA LARGEUR RENDUE : la seconde est la
            // seule que Rémy voit, et une règle CSS peut les séparer.
            pc: i ? i.style.width : '',
            px: i ? Math.round(i.getBoundingClientRect().width) : 0,
            caisse: Math.round(p.getBoundingClientRect().width)
        };
    });
    const barre = document.getElementById('game-progress-bar');
    return {
        texte: (document.getElementById('game-progress-text') || {}).textContent || '',
        barrePc: barre ? barre.style.width : '',
        rang: r ? r.index : null,
        stepId: r && r.step ? r.step.stepId : null,
        nbItems: r && r.step ? r.step.nbItems : null,
        resolues: r && r.itemsResolved ? r.itemsResolved.size : null,
        cases,
        av: av && {
            etapes: av.etapes, faites: av.faites, fraction: Math.round(av.fraction * 100),
            questions: av.questions, prevues: av.prevues,
            enCours: av.etapeEnCours && {
                rang: av.etapeEnCours.rang, posees: av.etapeEnCours.posees,
                prevues: av.etapeEnCours.prevues, titre: av.etapeEnCours.titre
            }
        }
    };
});

/**
 * RÉPONDRE À LA QUESTION AFFICHÉE, comme un élève — juste ou faux, au choix.
 *
 * ON APPELLE `el.click()`, ET C'EST LE GESTE QUI VAUT PARTOUT. Ma première
 * version envoyait un `pointerdown` — la correction apprise sur les bulles QUI
 * MONTENT (`surAppui`, js/core/cibleQuiBouge.js) — et les propositions d'un QCM
 * n'écoutent pas cet événement : `activities/choice.js` pose un `el.onclick`.
 * La sonde a tourné vingt-huit tours sur « 0 / 2 ». Et `click()` suffit aussi
 * pour `surAppui`, qui écoute le clic au clavier (`detail === 0`) : c'est
 * exactement ce que `el.click()` fabrique.
 *
 * ON NE PREND QUE LES PROPOSITIONS ENCORE VIVANTES : après une erreur, la
 * bulle éliminée garde `pointer-events: none` et son `data-eliminated`.
 */
const repondre = (juste = true) => s.page.evaluate((juste) => {
    const r = window.__sondeRunner;
    const it = r && r.session && r.session.current;
    const vis = (e) => e.getBoundingClientRect().width > 0
        && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
    const choix = [...document.querySelectorAll('#game-layer [data-idx]')].filter(vis);
    if (!choix.length) return 'rien à toucher';
    const bonne = it && (it.choices || []).find(c => c.correct);
    const texte = bonne ? String(bonne.label).trim() : null;
    const estLaBonne = (b) => texte !== null && (b.textContent || '').trim() === texte;
    const cible = juste ? choix.find(estLaBonne) : choix.find(b => !estLaBonne(b));
    (cible || choix[0]).click();
    return cible ? (juste ? 'juste' : 'faux') : 'au hasard';
}, juste);

/**
 * ATTENDRE QU'UNE QUESTION SOIT TOUCHABLE, et pousser les écrans qui barrent.
 *
 * C'EST LE RETOUR QUI TIENT LES CLICS, PAS LE LOGICIEL QUI EST BLOQUÉ.
 * `activities/choice.js` pose `pointerEvents: none` sur toutes les
 * propositions tant que la correction est à l'écran, et c'est `result.dismissed`
 * qui la referme. Ma première version attendait 650 ms en dur et annonçait
 * « plus rien à toucher » au deuxième tour : elle mesurait son propre
 * minuteur.
 *
 * @param {boolean} refaire pousser « Refaire pour m'améliorer » s'il paraît
 */
async function attendreUneQuestion(limite = 9000, refaire = false) {
    const jusqua = Date.now() + limite;
    let refait = false;
    while (Date.now() < jusqua) {
        const quoi = await s.page.evaluate((refaire) => {
            const vis = (e) => e.getBoundingClientRect().width > 0
                && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
            if ([...document.querySelectorAll('#game-layer [data-idx]')].some(vis)) return 'question';
            // ENTRE DEUX ÉTAPES, IL Y A DEUX ÉCRANS, ET ILS SE LISENT DANS LA
            // SOURCE : le bilan d'étape (`#btn-run-next`, voir
            // `showStepResult`), puis LA CARTE — Rémy : « entre chaque
            // exercice, on revoit le parcours ». Sur la carte, c'est
            // `.world-map-play` qui relance (js/ui/pathView.js).
            const encore = document.getElementById('btn-run-refaire');
            if (refaire && encore && encore.getBoundingClientRect().width > 0) {
                encore.click(); return 'refaire';
            }
            const suite = document.getElementById('btn-run-next');
            if (suite && suite.getBoundingClientRect().width > 0) { suite.click(); return 'suite'; }
            const jouer = document.querySelector('.world-map-play');
            if (jouer && jouer.getBoundingClientRect().width > 0) { jouer.click(); return 'carte'; }
            const b = [...document.querySelectorAll('#game-layer button, .modal button')]
                .filter(x => x.getBoundingClientRect().width > 0)
                .find(x => /^(suivant|continuer|j'ai compris|ok|c'est compris|poursuivre|jouer|commencer|c'est parti|démarrer)/i
                    .test((x.textContent || '').trim()));
            if (b) { b.click(); return 'bouton'; }
            return 'rien';
        }, refaire && !refait);
        if (quoi === 'refaire') refait = true;
        if (quoi === 'question') return refait;
        await dormir(300);
    }
    return null;
}

/**
 * JOUE LA SÉANCE ET RELÈVE LES DEUX COMPTEURS À CHAQUE RÉPONSE.
 *
 * @param {object} opts `faux` : les rangs où l'on répond exprès à côté ;
 *                      `refaire` : cliquer « Refaire pour m'améliorer »
 */
async function jouer({ faux = [], refaire = false, titre = '' }) {
    console.log(`\n\x1b[1m${titre}\x1b[0m`);
    const releves = [];
    let n = 0;
    for (let tour = 0; tour < 24; tour++) {
        const etat = await attendreUneQuestion(9000, refaire);
        if (etat === null) { console.log(`   (plus rien à toucher au tour ${tour})`); break; }
        if (etat === true) refaire = false;   // une fois suffit
        const quoi = await repondre(!faux.includes(n));
        n++;
        if (quoi === 'rien à toucher') { console.log('   (plus rien à toucher)'); break; }
        await dormir(500);
        const v = await lire();
        if (!v.av) { console.log('   (plus d\'avancement : la séance est close)'); break; }
        const ici = v.cases.findIndex(c => c.ici);
        releves.push(v);
        const gras = v.stepId === 'p2' ? '\x1b[1m' : '';
        console.log(`   ${gras}${v.stepId} · en-tête ${String(v.texte).replace(/\s+/g, ' ').trim()
            } · barre ${v.barrePc || '?'} · case ${ici} ${ici >= 0 ? v.cases[ici].pc : '—'
            } · journal ${v.av.enCours ? `${v.av.enCours.posees}/${v.av.enCours.prevues}` : 'néant'
            } (« ${v.av.enCours ? v.av.enCours.titre : '—'} ») · faites ${v.av.faites}\x1b[0m`);
        // L'ÉTAPE DE RÉMY SUFFIT : on ne joue pas les vingt-quatre questions,
        // on s'arrête dès que le défaut est visible ou que la moitié est faite.
        if (v.stepId === 'p2' && v.resolues >= Math.ceil(COMBIEN / 2)) break;
    }
    return releves;
}

// ── SCÈNE 1 : TOUT DROIT ────────────────────────────────────────────────────
await monterLaSeance(2, 0);
await s.doitExister('#fil-seance .fil-pas', 'les cases du fil de la séance');
const droit = await jouer({ titre: 'SCÈNE 1 — LA SÉANCE TRAVERSÉE TOUT DROIT' });

// ── SCÈNE 2 : UNE ÉTAPE REFAITE ─────────────────────────────────────────────
//
// `threshold: 1` sur deux questions : une erreur suffit à valider l'étape sans
// la réussir parfaitement, et c'est le seul cas où « Refaire pour m'améliorer »
// paraît (voir `peutRefaire` dans runner.js).
await monterLaSeance(2, 1);
const refaite = await jouer({
    faux: [0], refaire: true,
    titre: 'SCÈNE 2 — LA MÊME, AVEC UNE ÉTAPE REFAITE POUR S\'AMÉLIORER'
});

// ── CE QUE LES RELEVÉS DISENT ───────────────────────────────────────────────
console.log('\n\x1b[1mLE VERDICT\x1b[0m');

function juger(releves, nom) {
    const sur = releves.filter(v => v.stepId === 'p2' && v.av.enCours);
    dire(`${nom} : on a bien traversé l'étape de Rémy`, sur.length >= 3,
        `${sur.length} relevé(s)`);
    if (!sur.length) return;

    const quiEstCe = sur.filter(v => v.av.enCours.rang !== v.rang);
    dire(`${nom} : LE JOURNAL DÉSIGNE L'ÉTAPE OÙ L'ÉLÈVE EST VRAIMENT`,
        quiEstCe.length === 0,
        quiEstCe.length
            ? `il joue l'étape ${quiEstCe[0].rang + 1} et le fil éclaire la ${quiEstCe[0].av.enCours.rang + 1
            } (« ${quiEstCe[0].av.enCours.titre} »)`
            : `${sur.length} relevé(s) d'accord`);

    const fauxTotal = sur.filter(v => v.av.enCours.prevues !== v.nbItems);
    dire(`${nom} : ET LE MÊME TOTAL`, fauxTotal.length === 0,
        fauxTotal.length
            ? `le fil compte sur ${fauxTotal[0].av.enCours.prevues}, l'étape en porte ${fauxTotal[0].nbItems}`
            : `${COMBIEN} de part et d'autre`);

    const ecarts = sur.filter(v => v.av.enCours.posees !== v.resolues);
    dire(`${nom} : ET LE MÊME NOMBRE DE QUESTIONS FAITES`, ecarts.length === 0,
        ecarts.length ? `${ecarts[0].av.enCours.posees} au fil, ${ecarts[0].resolues} au meneur`
            : `${sur.length} relevé(s) d'accord`);

    const pleineTrop = sur.filter(v => {
        const c = v.cases.find(x => x.ici);
        return c && parseFloat(c.pc) >= 99.5 && v.resolues < v.nbItems;
    });
    dire(`${nom} : LA CASE DU FIL N'EST PAS PLEINE AVANT LA DERNIÈRE QUESTION`,
        pleineTrop.length === 0,
        pleineTrop.length
            ? `pleine dès ${pleineTrop[0].resolues} / ${pleineTrop[0].nbItems}`
            : 'elle se remplit au rythme des questions');
}
juger(droit, 'tout droit');
juger(refaite, 'refaite');

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
if (s.erreurs.length) s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
