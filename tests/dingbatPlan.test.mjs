// LE PLAN D'UN DINGBAT SUR LE PAPIER — ce qu'une feuille ne doit jamais faire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Faire le pdf pour … Ding Bats ». La mise en page vit dans
// `core/dingbatPlan.js`, qui est PUR : il rend des formes en millimètres, et
// c'est exactement ce qui se vérifie sous Node.
//
// CE QU'ON GARDE ICI EST CE QUI S'EST CASSÉ EN LE CONSTRUISANT, et chaque
// règle a été vue sur une feuille avant d'être écrite :
//
//   · un mot qui SORT de son bloc — « DROITE » vertical grimpait par-dessus le
//     titre du bloc, et « CERCLE » sortait des deux pentes de son triangle ;
//   · une disposition qui ne rend RIEN — une énigme muette, c'est la même
//     chose qu'un logiciel cassé ;
//   · une coordonnée qui n'est pas un nombre : jsPDF ne bronche pas, il
//     dessine ailleurs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

const { planDuDingbat, sceneDuDingbat } = await import('../js/core/dingbatPlan.js');
const { DINGBATS } = await import('../js/data/dingbats.js');
const { DISPOSITIONS } = await import('../js/core/dingbat.js');

// LA MÊME MESURE QUE LA FICHE (`mesurerDingbat` dans `ui/fiches/mots.js`) :
// une épreuve qui mesurerait autrement garderait une mise en page que
// personne n'imprime.
const mesurer = (texte, corps) => String(texte).length * corps * 0.58;
const BOITE = { x: 10, y: 20, w: 88, h: 44 };

/** La boîte qu'occupe vraiment une forme, en millimètres. */
function emprise(f) {
    if (f.t === 'mot') {
        // Le mot est centré sur (cx, cy) ; tourné, il échange ses deux côtés.
        const l = mesurer(f.texte, f.corps);
        const h = f.corps * 0.78;
        const couche = f.angle === 90 || f.angle === -90;
        const w = couche ? h : l;
        const ht = couche ? l : h;
        return { x1: f.cx - w / 2, x2: f.cx + w / 2, y1: f.cy - ht / 2, y2: f.cy + ht / 2 };
    }
    if (f.t === 'forme') return { x1: f.x, x2: f.x + f.w, y1: f.y, y2: f.y + f.h };
    if (f.t === 'point') return { x1: f.cx - f.r, x2: f.cx + f.r, y1: f.cy - f.r, y2: f.cy + f.r };
    if (f.t === 'barre') return { x1: f.cx - f.w / 2, x2: f.cx + f.w / 2, y1: f.cy, y2: f.cy };
    return { x1: Math.min(f.x1, f.x2), x2: Math.max(f.x1, f.x2),
        y1: Math.min(f.y1, f.y2), y2: Math.max(f.y1, f.y2) };
}

test('CHAQUE DISPOSITION DE LA GRAMMAIRE SAIT SE POSER SUR UNE FEUILLE', () => {
    // UNE DISPOSITION SANS BRANCHE JETTE — c'est voulu, et c'est la règle de
    // `dessiner()` : une énigme muette est pire qu'une erreur. Mais alors elle
    // ne doit JAMAIS arriver, et c'est ce qu'on vérifie : les vingt-deux
    // dispositions de `dingbat.js` ont toutes leur branche ici.
    for (const forme of Object.keys(DISPOSITIONS)) {
        const d = DINGBATS.find(x => x.forme === forme)
            || { id: 'essai', forme, mots: ['MOT', 'AUTRE', 'TROIS'], combien: 2, ou: 0,
                elements: [{ type: 'mot', texte: 'MOT', x: 10, y: 10, taille: 20 }] };
        assert.doesNotThrow(() => sceneDuDingbat(d), `« ${forme} » n'a pas de branche`);
        const plan = planDuDingbat(d, BOITE, mesurer);
        assert.ok(plan.formes.some(f => f.t === 'mot'),
            `« ${forme} » ne pose AUCUN mot : l'énigme serait muette`);
    }
});

test('AUCUN DINGBAT DU CATALOGUE NE SORT DE SON BLOC', () => {
    // MESURÉ sur la feuille avant d'être écrit ici : « DROITE » posé
    // verticalement montait par-dessus le titre de son bloc, et « CERCLE »
    // dans un triangle sortait des deux côtés. Les deux venaient d'un corps
    // calculé sans regarder la direction où le mot s'étend.
    //
    // LA TOLÉRANCE EST CELLE D'UNE TRAVERSÉE : « un mot TRAVERSE une forme DE
    // PART EN PART » déborde de la FORME — c'est l'énigme —, mais jamais du
    // bloc. On accorde donc un millimètre, pas davantage.
    const marge = 1;
    for (const d of DINGBATS) {
        const plan = planDuDingbat(d, BOITE, mesurer);
        for (const f of plan.formes) {
            for (const v of [f.cx, f.cy, f.x, f.y, f.x1, f.y1, f.x2, f.y2, f.w, f.h, f.corps]) {
                if (v !== undefined) {
                    assert.ok(Number.isFinite(v), `${d.id} : une coordonnée n'est pas un nombre`);
                }
            }
            const e = emprise(f);
            const dit = `${d.id} (${d.forme})`;
            assert.ok(e.x1 >= BOITE.x - marge, `${dit} sort par la GAUCHE de ${(BOITE.x - e.x1).toFixed(1)} mm`);
            assert.ok(e.x2 <= BOITE.x + BOITE.w + marge,
                `${dit} sort par la DROITE de ${(e.x2 - BOITE.x - BOITE.w).toFixed(1)} mm`);
            assert.ok(e.y1 >= BOITE.y - marge, `${dit} sort par le HAUT de ${(BOITE.y - e.y1).toFixed(1)} mm`);
            assert.ok(e.y2 <= BOITE.y + BOITE.h + marge,
                `${dit} sort par le BAS de ${(e.y2 - BOITE.y - BOITE.h).toFixed(1)} mm`);
        }
    }
});

test('UNE TRAVERSÉE DÉBORDE DE SA FORME, UN MOT « DANS » N\'EN SORT PAS', () => {
    // C'est la différence entre deux énigmes qui se ressemblent : « MÈTRE »
    // DANS un cercle se lit autrement que « MÈTRE » qui le TRAVERSE. Mesuré
    // sur la feuille : le mot tenait à l'intérieur dans les deux cas, et
    // « diamètre » devenait indevinable.
    const caseDe = (forme, extra = {}) => {
        const d = { id: `essai-${forme}`, forme, mots: ['MESURE'], cadre: 'cercle', ...extra };
        const plan = planDuDingbat(d, BOITE, mesurer);
        const cadre = plan.formes.find(f => f.t === 'forme');
        const mot = plan.formes.find(f => f.t === 'mot');
        return { large: mesurer(mot.texte, mot.corps), cadre };
    };
    const dedans = caseDe('dans');
    assert.ok(dedans.large < dedans.cadre.w,
        'un mot « dans » une forme en sort : ce n\'est plus la même énigme');
    const travers = caseDe('traverse');
    assert.ok(travers.large > travers.cadre.w,
        'un mot qui TRAVERSE tient à l\'intérieur : on ne peut plus lire « de part en part »');
});

test('LE MIROIR ET LES ROTATIONS VOYAGENT AVEC LE MOT', () => {
    // Le rendu ne peut retourner un mot que si le plan le lui dit : sans ce
    // drapeau, « un mot RETOURNÉ comme dans un miroir » s'imprime à l'endroit
    // et l'énigme n'a plus de réponse.
    const plan = (forme, extra = {}) => planDuDingbat(
        { id: `e-${forme}`, forme, mots: ['MOT', 'DEUX'], ...extra }, BOITE, mesurer).formes;
    assert.ok(plan('miroir').some(f => f.miroir), 'le miroir ne dit pas qu\'il est retourné');
    assert.ok(plan('demiTour').some(f => f.angle === 180), 'le demi-tour ne tourne pas');
    assert.ok(plan('tourne').some(f => f.angle === -90), 'le quart de tour ne tourne pas');
    assert.ok(plan('croisent').some(f => f.angle === -90), 'les deux mots ne se croisent pas');
    // ET LES QUATRE CÔTÉS DU « AUTOUR » PORTENT LE MOT : un seul exemplaire
    // posé à côté ne dirait rien du tout.
    assert.equal(plan('autour').filter(f => f.t === 'mot').length, 4,
        'le mot ne fait pas le TOUR de la forme');
});
