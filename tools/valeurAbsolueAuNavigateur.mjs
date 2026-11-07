// LES HUIT BARREAUX DE LA VALEUR ABSOLUE, VUS À L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille de Seconde : « j'aimerai ce style d'exercice ».
//
//     |x − 2| = 5 · |x + 4| = 1 · |x − 3| ⩽ 1,5 · |x + 2| < 4,5
//
// CE QU'UNE ÉPREUVE SANS NAVIGATEUR NE DIT PAS. `tests/valeurAbsolue.test.mjs`
// garde les mathématiques — les bons ensembles, les bons leurres. Elle ne dit
// rien de ce qui casse vraiment un exercice neuf : un axe qui ne s'affiche
// pas, deux propositions identiques, une égalité dessinée en segment.
//
// ── COMMENT CETTE SONDE VÉRIFIE SANS SE CROIRE SUR PAROLE ───────────────────
//
// Elle lit l'énoncé À L'ÉCRAN, en retrouve le centre et le rayon, et calcule
// les deux bornes DE SON CÔTÉ. Puis elle demande au logiciel laquelle des
// propositions il tient pour juste, et vérifie que ce dessin-là porte bien ces
// bornes-là. Le logiciel désigne ; la sonde contrôle. Une sonde qui lui
// demanderait aussi la réponse ne mesurerait que sa cohérence avec lui-même.
//
// ── DEUX PIÈGES DE MESURE, PAYÉS ICI ────────────────────────────────────────
//
// IL N'Y A PAS TOUJOURS QUATRE PROPOSITIONS, et ce n'est pas un défaut :
// `aide.js` en laisse DEUX à l'élève qui peine. Exiger « exactement quatre »
// reviendrait à éprouver que l'échelle d'aide ne marche pas — la leçon avait
// déjà été payée sur le QCM de l'opposé.
//
// ET DEUX PROPOSITIONS PARTAGENT SOUVENT LEURS BORNES : ]−3 ; 7[ et [−3 ; 7]
// portent les mêmes nombres et ne diffèrent que par le crochet. C'est très
// exactement ce que l'exercice travaille ; chercher « la seule qui porte −3 et
// 7 » ne pouvait donc pas marcher, et c'est pourquoi on passe par le dessin
// que le logiciel désigne.
//
//   node tools/valeurAbsolueAuNavigateur.mjs
//
import { ouvrirSonde } from '../tools/sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const BARREAUX = ['lire', 'egal', 'large', 'strict', 'plus', 'decimal', 'superieur', 'inverse'];
/** Le signe moins et la virgule de la typographie française. */
const marque = (v) => String(v).replace('.', ',').replace('-', '−');

const s = await ouvrirSonde({ largeur: 1200, hauteur: 900 });
await s.identifier();

for (const marche of BARREAUX) {
    // UN SEUL BARREAU COCHÉ À LA FOIS : c'est ainsi qu'un professeur prépare
    // une séance de remédiation, et le seul moyen de voir chaque barreau.
    await s.ouvrirExercice('sec-valeur-absolue', { marches: [marche] });
    await dormir(1300);

    const vu = await s.page.evaluate(() => {
        const g = document.getElementById('game-layer');
        // LA CLASSE DU SYSTÈME, ET NON UNE CLASSE INVENTÉE : `choice.js` rend
        // la variante « buttons » avec `prio-btn`. Mes quatre premiers
        // sélecteurs n'existaient nulle part, et la sonde annonçait ZÉRO
        // proposition sur un exercice qui en affichait quatre.
        const props = [...g.querySelectorAll('.prio-btn')];
        const juste = props.find((b) => b.dataset.val === 'ok');
        return {
            enonce: (g.querySelector('.game-question') || {}).textContent || '',
            axesEnonce: [...g.querySelectorAll('.iv-axe')]
                .filter((a) => !a.closest('.prio-btn')).length,
            propositions: props.length,
            axesDansLesChoix: props.filter((b) => b.querySelector('.iv-axe')).length,
            // DEUX PROPOSITIONS IDENTIQUES rendent la question insoluble et ne
            // lèvent aucune erreur : on compte les contenus distincts.
            distinctes: new Set(props.map((b) => (b.innerHTML || '').replace(/\s+/g, ''))).size,
            pointsDuJuste: juste ? juste.querySelectorAll('circle').length : -1,
            texteDuJuste: juste ? (juste.textContent || '').replace(/\s+/g, ' ').trim() : '',
            aUnJuste: !!juste
        };
    });

    console.log(`\n\x1b[1m${marche}\x1b[0m  « ${vu.enonce.replace(/\s+/g, ' ').trim()} »`);
    // Deux au minimum : `aide.js` décide s'il en montre deux ou quatre.
    dire('au moins deux propositions', vu.propositions >= 2, `${vu.propositions}`);
    dire('et toutes différentes',
        vu.propositions > 0 && vu.distinctes === vu.propositions,
        `${vu.distinctes} distincte(s) sur ${vu.propositions}`);
    dire('le logiciel en désigne une comme juste', vu.aUnJuste);

    if (marche === 'lire') {
        dire('on demande de LIRE, et il n\'y a rien à dessiner',
            /se lit|comment/i.test(vu.enonce) && vu.axesDansLesChoix === 0);
        dire('la bonne réponse est bien une distance',
            /^la distance entre x et /.test(vu.texteDuJuste), vu.texteDuJuste);
    } else if (marche === 'inverse') {
        dire('l\'axe est dans l\'ÉNONCÉ, et les propositions sont des conditions',
            vu.axesEnonce > 0 && vu.axesDansLesChoix === 0,
            `énoncé ${vu.axesEnonce} · choix ${vu.axesDansLesChoix}`);
        dire('la bonne réponse s\'écrit |x ± a| ⋈ r',
            /^\|x [−+] [\d,]+\| (=|⩽|<|⩾|>) [\d,]+$/.test(vu.texteDuJuste), vu.texteDuJuste);
    } else {
        dire('chaque proposition est une droite graduée',
            vu.axesDansLesChoix === vu.propositions,
            `${vu.axesDansLesChoix} sur ${vu.propositions}`);
        dire('l\'énoncé dit « représente » et porte la condition',
            /représente/i.test(vu.enonce) && /\|/.test(vu.enonce));

        // ── LE CONTRÔLE INDÉPENDANT ────────────────────────────────────────
        const calcul = await s.page.evaluate(() => {
            const t = (document.querySelector('.game-question') || {}).textContent || '';
            const m = t.match(/\|x\s*([−+-])\s*([\d,]+)\|\s*(=|⩽|<|⩾|>)\s*([\d,]+)/);
            if (!m) return null;
            const val = (x) => Number(String(x).replace(',', '.'));
            const centre = (m[1] === '+' ? -1 : 1) * val(m[2]);
            const rayon = val(m[4]);
            return { relation: m[3], g: centre - rayon, d: centre + rayon };
        });
        if (!calcul) dire('la sonde sait relire l\'énoncé', false, vu.enonce);
        else {
            const bornes = [marque(calcul.g), marque(calcul.d)];
            dire(`le dessin désigné juste porte ${bornes.join(' et ')}`,
                bornes.every((b) => vu.texteDuJuste.includes(b)), vu.texteDuJuste);
            // UNE ÉGALITÉ NE DONNE PAS UN SEGMENT : deux points, et rien entre
            // eux. C'est la faute la plus fréquente du chapitre, et elle se
            // verrait ici comme un intervalle dessiné à la place des points.
            if (calcul.relation === '=') {
                dire('et une égalité se dessine en DEUX points', vu.pointsDuJuste === 2,
                    `${vu.pointsDuJuste} point(s)`);
            } else {
                dire('et une inégalité ne se dessine pas en points', vu.pointsDuJuste === 0,
                    `${vu.pointsDuJuste} point(s)`);
            }
        }
    }

    // ON CLIQUE CE QUE LE LOGICIEL DIT JUSTE : il doit le compter juste.
    //
    // ON LIT LA CLASSE, PAS LE TEXTE DE LA PAGE. Ma première version cherchait
    // « 2 / 8 » ou « bravo » dans tout l'écran : elle passait ou tombait selon
    // le barreau sans que rien ne diffère, parce que le compteur ne bouge
    // qu'après l'animation de correction. La classe « choice--ok » est posée
    // par « activities/choice.js » sur la proposition acceptée : c'est le
    // signal, et il ne dépend d'aucun délai.
    if (vu.aUnJuste) {
        await s.page.evaluate(() => {
            [...document.querySelectorAll('#game-layer .prio-btn')]
                .find((b) => b.dataset.val === 'ok').click();
        });
        await dormir(700);
        const verdict = await s.page.evaluate(() => ({
            ok: document.querySelectorAll('#game-layer .choice--ok').length,
            ko: document.querySelectorAll('#game-layer .choice--ko').length
        }));
        dire('et le logiciel l\'accepte', verdict.ok >= 1 && verdict.ko === 0,
            `ok ${verdict.ok} · ko ${verdict.ko}`);
    }
}

await s.photo('#game-layer', 'tools/tmp/valeur-absolue.png', 8);
dire('aucune erreur de page, aucune fenêtre native',
    s.erreurs.length === 0 && s.fenetresNatives.length === 0,
    `${s.erreurs.length} / ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach((e) => console.log(gris('      ' + e)));
await s.fermer();
console.log(ratés ? rouge(`\n${ratés} raté(s).`) : vert('\nLES HUIT BARREAUX SE JOUENT.'));
process.exit(ratés ? 1 : 0);
