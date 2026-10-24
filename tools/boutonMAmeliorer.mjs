// LE BOUTON « M'AMÉLIORER », DU BILAN DE L'ÉLÈVE AU PARCOURS DE RÉVISION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « à la fin d'un parcours, lors du bilan envoyé à l'élève, il faut
// qu'il ait sur son écran un bouton M'améliorer où tu crées un parcours de
// révision, est ce clair ? »
//
// CE QUE SEULE UNE SONDE PEUT DIRE, et qu'aucune épreuve ne dit :
//
//   · que le bouton est À L'ÉCRAN quand le bilan s'ouvre — « sur son écran »,
//     c'est-à-dire sans défiler. L'ancien, lui, vivait au bas d'une liste de
//     huit encadrés rouges, et personne ne l'avait jamais vu ;
//   · qu'il SE TAIT sur un bilan parfait ;
//   · qu'il OUVRE VRAIMENT un parcours, avec ses étapes et son nom ;
//   · qu'il tient à côté de « Terminer » sur un téléphone, sans déborder.
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

/**
 * Monte une séance de deux QCM courts et la lance.
 *
 * `maxAttemptsPerItem: 1` quand on veut des questions DÉFINITIVEMENT ratées :
 * sur un QCM à deux propositions, la mauvaise est éliminée après le premier
 * essai et il ne reste que la bonne à toucher — impossible de se tromper deux
 * fois, donc impossible de produire une question non résolue autrement.
 */
async function monterLaSeance(unSeulEssai) {
    await s.page.evaluate(async (unSeulEssai) => {
        if (window.__sondeRunner) { try { window.__sondeRunner.exit(); } catch (e) { /* rien */ } }
        document.getElementById('run-report-modal')?.remove();
        await new Promise(ok => setTimeout(ok, 300));
        const { state } = await import('./js/core/state.js');
        const { makeStep, makePath } = await import('./js/core/path.js');
        const { politiquePerso } = await import('./js/core/mesExercices.js');
        const { Runner } = await import('./js/core/runner.js');
        const pas = [
            makeStep('calc-oppose-regle', {}, { stepId: 'a1', nbItems: 2, threshold: 0 }),
            makeStep('calc-oppose-regle', {}, { stepId: 'a2', nbItems: 2, threshold: 0 })
        ];
        const politique = { ...politiquePerso() };
        if (unSeulEssai) politique.maxAttemptsPerItem = 1;
        window.__sondeRunner = new Runner({
            path: makePath('Avant les vacances', pas, politique), deviceMode: 'none'
        });
        window.__sondeRunner.start();
    }, unSeulEssai);
    await dormir(1700);
}

const repondre = (juste) => s.page.evaluate((juste) => {
    const r = window.__sondeRunner;
    const it = r && r.session && r.session.current;
    const vis = (e) => e.getBoundingClientRect().width > 0
        && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
    const choix = [...document.querySelectorAll('#game-layer [data-idx]')].filter(vis);
    if (!choix.length) return 'rien';
    const bonne = it && (it.choices || []).find(c => c.correct);
    const texte = bonne ? String(bonne.label).trim() : null;
    const estLaBonne = (b) => texte !== null && (b.textContent || '').trim() === texte;
    const cible = juste ? choix.find(estLaBonne) : choix.find(b => !estLaBonne(b));
    (cible || choix[0]).click();
    return 'touché';
}, juste);

/** Traverse la séance jusqu'au bilan, en répondant juste ou faux. */
async function traverser(juste) {
    for (let tour = 0; tour < 44; tour++) {
        const prêt = await s.page.evaluate(() => {
            if (document.getElementById('run-report-modal')) return 'bilan';
            // LA CORRECTION BLOQUANTE D'ABORD : une mauvaise réponse pose un
            // voile (`.fb-veil`) et une carte `.fb-card--blocking` dont le
            // bouton `.fb-close` dit « J'ai compris ». Tant qu'elle est là, les
            // propositions ont `pointer-events: none` — la sonde tournait à vide
            // en boucle, et « rien à toucher » ressemble exactement à un
            // logiciel bloqué.
            const compris = document.querySelector('.fb-card--blocking .fb-close');
            if (compris && compris.getBoundingClientRect().width > 0) {
                compris.click(); return 'correction';
            }
            const vis = (e) => e.getBoundingClientRect().width > 0
                && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
            if ([...document.querySelectorAll('#game-layer [data-idx]')].some(vis)) return 'question';
            // LES DEUX ÉCRANS D'ENTRE-DEUX-ÉTAPES, LUS DANS LA SOURCE : le bilan
            // d'étape (`#btn-run-next`, voir `showStepResult`) puis la carte,
            // dont le bouton est `.world-map-play` (js/ui/pathView.js).
            const suite = document.getElementById('btn-run-next');
            if (suite && suite.getBoundingClientRect().width > 0) { suite.click(); return 'suite'; }
            const jouer = document.querySelector('.world-map-play');
            if (jouer && jouer.getBoundingClientRect().width > 0) { jouer.click(); return 'carte'; }
            const b = [...document.querySelectorAll('#game-layer button')]
                .filter(x => x.getBoundingClientRect().width > 0)
                .find(x => /^(jouer|commencer|c'est parti|démarrer|suivant|continuer)/i
                    .test((x.textContent || '').trim()));
            if (b) { b.click(); return 'bouton'; }
            return 'rien';
        });
        if (process.env.SONDE_BAVARDE) console.log(`      tour ${tour} : ${prêt}`);
        if (prêt === 'bilan') return true;
        if (prêt === 'question') await repondre(juste);
        await dormir(600);
    }
    return !!await s.page.$('#run-report-modal');
}

/** Ce que le bilan montre, et OÙ. */
const lireLeBilan = () => s.page.evaluate(() => {
    const modal = document.getElementById('run-report-modal');
    if (!modal) return null;
    const panneau = modal.querySelector('.report-panel');
    const btn = modal.querySelector('[data-ameliorer]');
    const fin = modal.querySelector('#btn-report-close');
    const rb = btn ? btn.getBoundingClientRect() : null;
    const rp = panneau ? panneau.getBoundingClientRect() : null;
    return {
        present: !!btn,
        libelle: btn ? (btn.textContent || '').replace(/\s+/g, ' ').trim() : '',
        // « SUR SON ÉCRAN » : visible sans défiler, c'est-à-dire dans la
        // fenêtre, et non simplement présent dans le document.
        dansLaFenetre: !!(rb && rb.top >= 0 && rb.bottom <= window.innerHeight
            && rb.width > 0 && rb.height > 0),
        // ET RANGÉ AVEC « TERMINER », pas au fond d'une liste.
        avecTerminer: !!(btn && fin && btn.parentElement === fin.parentElement),
        // NI L'UN NI L'AUTRE NE DÉBORDE du panneau.
        deborde: !!(rb && rp && (rb.left < rp.left - 1 || rb.right > rp.right + 1)),
        pageDeborde: document.documentElement.scrollWidth > window.innerWidth + 1,
        defilement: panneau ? Math.round(panneau.scrollTop) : -1,
        ancienBouton: !!modal.querySelector('[data-replay]')
    };
});

// ── SCÈNE 1 : DES QUESTIONS RATÉES, DONC QUELQUE CHOSE À AMÉLIORER ──────────
console.log('\n\x1b[1mSCÈNE 1 — IL S\'EST TROMPÉ\x1b[0m');
await monterLaSeance(true);
dire('la séance va jusqu\'au bilan', await traverser(false));
let v = await lireLeBilan();
if (!v) { console.log('\x1b[31mpas de bilan : rien à mesurer\x1b[0m'); await s.fermer(); process.exit(1); }
dire('LE BOUTON « M\'AMÉLIORER » EST LÀ', v.present, v.libelle);
dire('et il dit combien d\'exercices il propose', /\d+\s*exercice/.test(v.libelle), v.libelle);
dire('IL EST SUR SON ÉCRAN, sans défiler', v.dansLaFenetre,
    `défilement du panneau : ${v.defilement}`);
dire('il est rangé avec « Terminer »', v.avecTerminer);
dire('et l\'ancien bouton enterré a disparu', !v.ancienBouton);
dire('rien ne déborde du panneau', !v.deborde && !v.pageDeborde);

// ── LE CLIC OUVRE UN VRAI PARCOURS ──────────────────────────────────────────
await s.page.evaluate(() => document.querySelector('[data-ameliorer]').click());
await dormir(2200);
const revision = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const r = state.activeSequenceRunner;
    return {
        monte: !!r,
        nom: r && r.path ? r.path.name : '',
        etapes: r && r.steps ? r.steps.length : 0,
        exercices: r && r.steps
            ? r.steps.map(x => `${x.exerciseId}×${x.nbItems}`).join(' · ') : '',
        // LES EXERCICES DE LA SÉANCE, ET PAS D'AUTRES : un parcours de révision
        // qui ouvre un exercice que le professeur n'a pas choisi sort de sa
        // progression. La séance ne contenait que `calc-oppose-regle`.
        horsSeance: r && r.steps
            ? r.steps.filter(x => x.exerciseId !== 'calc-oppose-regle')
                .map(x => x.exerciseId) : [],
        graines: r && r.steps ? r.steps.filter(x => x.forceSeed).length : 0,
        bilanFerme: !document.getElementById('run-report-modal'),
        essais: r && r.policy ? r.policy.maxAttemptsPerItem : null
    };
});
console.log(`   le parcours ouvert : « ${revision.nom} » — ${revision.etapes} étape(s) : ${revision.exercices}`);
dire('LE CLIC OUVRE UN PARCOURS DE RÉVISION', revision.monte && revision.etapes > 0,
    `${revision.etapes} étape(s)`);
dire('il porte le nom de la séance d\'où il sort',
    /^M’améliorer — Avant les vacances$|^M'améliorer — Avant les vacances$/.test(revision.nom),
    revision.nom);
dire('UNE ÉTAPE AU MOINS REJOUE LA QUESTION RATÉE, à l\'identique', revision.graines >= 1,
    `${revision.graines} étape(s) à graine`);
dire('IL NE SORT PAS DES EXERCICES DE LA SÉANCE', revision.horsSeance.length === 0,
    revision.horsSeance.join(' · ') || 'aucun');
dire('et la compétence faible rallonge l\'étape au lieu de la doubler',
    revision.etapes === 1 && /×4$/.test(revision.exercices), revision.exercices);
dire('et le bilan s\'est refermé derrière lui', revision.bilanFerme);
dire('la révision laisse plus de place à l\'essai qu\'un contrôle',
    revision.essais === 3, String(revision.essais));

// ── SCÈNE 2 : UN BILAN PARFAIT NE PROPOSE RIEN ──────────────────────────────
console.log('\n\x1b[1mSCÈNE 2 — IL A TOUT RÉUSSI\x1b[0m');
await monterLaSeance(false);
dire('la séance va jusqu\'au bilan', await traverser(true));
v = await lireLeBilan();
dire('SOUS UN BILAN PARFAIT, LE BOUTON SE TAIT', v && !v.present,
    v && v.present ? v.libelle : 'aucun bouton');

// ── SCÈNE 3 : AU DOIGT, SUR UN TÉLÉPHONE ────────────────────────────────────
console.log('\n\x1b[1mSCÈNE 3 — LE MÊME BILAN SUR UN TÉLÉPHONE (390 × 844)\x1b[0m');
await s.page.setViewportSize({ width: 390, height: 844 });
await dormir(400);
await monterLaSeance(true);
dire('la séance va jusqu\'au bilan', await traverser(false));
v = await lireLeBilan();
dire('le bouton est là aussi', !!(v && v.present), v ? v.libelle : '');
dire('IL NE DÉBORDE PAS, et la page ne défile pas de côté',
    !!(v && !v.deborde && !v.pageDeborde));
dire('et il reste sur l\'écran sans défiler', !!(v && v.dansLaFenetre),
    v ? `défilement ${v.defilement}` : '');

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
if (s.erreurs.length) s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
