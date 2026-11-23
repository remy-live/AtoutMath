// QUI GAGNE À MULTIKART ? — la course jouée cent fois sans écran.
//
//   node tools/equilibreDuKart.mjs [courses=60] [voies=progressif] [familles=mul] [sens=resultat]
//
// Quatre joueurs : celui qui calcule juste ; celui qui se trompe une fois sur
// quatre ; celui qui ne touche à rien ; et CELUI QUI SUIT LE RIVAL DE DEVANT
// sans calculer — le seul qui doive absolument échouer, voir `avancerRivaux`.
// On lit leur réussite, leur place moyenne, et combien de fois ils gagnent.

import { Course, voieDe } from '../js/core/multiKart.js';
import { makeRng } from '../js/core/ids.js';

const N = Number(process.argv[2]) || 60;
// Le troisième argument règle les voies : 2, 3, 4 ou « progressif ».
const REGLAGES = { voies: process.argv[3] || 'progressif',
    familles: (process.argv[4] || 'mul').split(','), sens: process.argv[5] || 'resultat' };
const DT = 1 / 60;

export function jouer(graine, allure, strategie, reglages = {}) {
    const k = new Course({ graine, allure, ...reglages });
    const de = makeRng(`${graine}-joueur`);
    let vu = -1;
    k.demarrer();
    for (let t = 0; t < 400 && k.etat !== 'arrivee'; t += DT) {
        const p = k.portiqueActif;
        if (p) {
            if (strategie === 'juste') k.viser(p.voieJuste);
            else if (strategie === 'trois-quarts' && vu !== p.index && k.approche > 0.5) {
                vu = p.index;
                k.viser(de.next() < 0.75 ? p.voieJuste : (p.voieJuste + 1 + de.int(0, p.voies - 2)) % p.voies);
            } else if (strategie === 'suiveur') {
                const devant = k.rivaux.filter((r) => r.z > k.joueur.z).sort((a, b) => a.z - b.z)[0];
                if (devant) k.viser(voieDe(devant.x, p.voies));
            }
            if (k.bonus) k.utiliserBonus();
        }
        k.avancer(DT);
    }
    return k.bilan();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    for (const allure of ['ralenti', 'tranquille', 'normale', 'rapide']) {
        console.log(`\n── allure ${allure} — ${N} courses ──`);
        for (const s of ['juste', 'trois-quarts', 'inerte', 'suiveur']) {
            let reussite = 0, rang = 0, gagne = 0, temps = 0;
            for (let i = 0; i < N; i++) {
                const b = jouer(`eq${i}`, allure, s, REGLAGES);
                reussite += b.precision; rang += b.rang; temps += b.temps;
                if (b.rang === 1) gagne++;
            }
            console.log(`  ${s.padEnd(13)} réussite ${(100 * reussite / N).toFixed(0).padStart(3)} %   `
                + `place moyenne ${(rang / N).toFixed(2)}   premier ${String(gagne).padStart(3)}/${N}   `
                + `${(temps / N).toFixed(1)} s`);
        }
    }
}
