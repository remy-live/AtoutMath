// LES QUATRE JEUX DE CLASSE, OUVERTS DEPUIS LE CATALOGUE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//     node tools/jeuxDeClasseAuCatalogue.mjs
//
// RÉMY : « j'aimerai bien avoir les jeux plateaux dispo/demo dans les derniers
// jeux ». Ils y sont — reste à savoir ce qu'on voit quand on clique.
//
// ── CE QU'AUCUNE ÉPREUVE DE `npm test` NE PEUT DIRE ───────────────────────
//
// Les épreuves lisent la source : elles savent que l'activité est déclarée, que
// le code dicté existe, que l'entrée du catalogue est bien formée. Elles ne
// savent RIEN de la seule question qui compte ici : le terrain tient-il DANS le
// cadre du meneur ?
//
// Ces quatre écrans ont été écrits comme des VOILES PLEIN ÉCRAN, pour prendre
// l'écran de toute la classe. Posés dans un cadre, un `position: fixed` les
// ferait recouvrir l'entête et le bouton pour sortir — l'élève serait enfermé
// dans un jeu, et c'est exactement le genre de défaut qu'une lecture de source
// ne voit pas. On regarde donc : le cadre existe-t-il encore, le terrain est-il
// dedans, et reste-t-il de quoi sortir.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const JEUX = [
    { id: 'calc-plateau-nombres', nom: 'Le Plateau des Nombres', crochet: '.pdn-terrain' },
    { id: 'num-chat-perche', nom: 'Le Chat Perché', crochet: '.jv-terrain' },
    { id: 'num-la-ruee', nom: 'La Ruée', crochet: '.jv-terrain' },
    { id: 'num-pluie-nombres', nom: 'La Pluie de Nombres', crochet: '.jv-terrain' }
];

let ratés = 0;
const ok = (q, bon, d = '') => {
    if (!bon) ratés++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};
const dit = (q, d) => console.log(`  \x1b[2m·\x1b[0m ${q} \x1b[2m— ${d}\x1b[0m`);

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
try {
    console.log('\nLES QUATRE JEUX DE CLASSE, DEPUIS LE CATALOGUE');
    console.log('─'.repeat(70));
    await s.identifier();

    // ── ILS SONT DANS « LES DERNIERS EXERCICES » ──────────────────────────
    //
    // C'est la demande, mot pour mot : « dans les derniers jeux ». La fenêtre
    // se nourrit du catalogue et groupe par JOURNÉE de livraison ; les quatre
    // portent la date du jour, donc ils doivent y être tous les quatre.
    const vus = await s.page.evaluate(async (ids) => {
        const { vaguesDuCatalogue } = await import('./js/data/nouveautes.js');
        const jours = vaguesDuCatalogue();
        const dedans = [];
        for (const j of jours) {
            for (const e of j.entrees) {
                if (ids.includes(e.exo.id)) dedans.push(e.exo.id);
            }
        }
        return { dedans, jours: jours.map(j => j.date) };
    }, JEUX.map(j => j.id));
    ok('LES QUATRE SONT DANS LES DERNIERS EXERCICES',
        vus.dedans.length === 4, `${vus.dedans.length}/4 — ${vus.dedans.join(', ')} · journées ${vus.jours.join(', ')}`);

    // ── ET CHACUN S'OUVRE, DANS LE CADRE ─────────────────────────────────
    for (const jeu of JEUX) {
        console.log('');
        dit(jeu.nom, jeu.id);
        await s.ouvrirExercice(jeu.id);
        // DEUX SECONDES : les pions de l'ordinateur doivent avoir bougé, sans
        // quoi on photographie un terrain qui n'a pas commencé à vivre.
        await dormir(2200);

        await s.doitExister(jeu.crochet, `le terrain de ${jeu.nom}`);
        // LA SORTIE DU CADRE SE NOMME `#btn-close-game`, ET JE L'AVAIS INVENTÉE.
        //
        // Premier jet : `#back-btn, [data-retour], .game-back` — trois noms
        // plausibles, aucun réel. La sonde a donc annoncé « il ne reste pas de
        // quoi sortir » sur les QUATRE jeux, ce qui est exactement la réponse
        // qu'elle aurait donnée si le défaut existait. C'est la friction que
        // `doitExister` ferme, et je ne l'avais pas employé ici : on le demande
        // donc maintenant pour ce crochet-là AUSSI, et la sonde s'arrête net
        // si le bouton change de nom plutôt que d'accuser le logiciel.
        await s.doitExister('#btn-close-game', 'le bouton qui ferme l\'exercice');
        const vu = await s.page.evaluate((sel) => {
            const t = document.querySelector(sel);
            const voile = t && t.closest('[class*="-voile"]');
            const r = t ? t.getBoundingClientRect() : null;
            const sortir = voile ? voile.querySelector('[data-sortir]') : null;
            const visible = (el) => {
                if (!el) return false;
                const c = getComputedStyle(el);
                return c.display !== 'none' && c.visibility !== 'visible' ? false : c.display !== 'none';
            };
            return {
                position: voile ? getComputedStyle(voile).position : '(pas de voile)',
                largeur: r ? Math.round(r.width) : 0,
                hauteur: r ? Math.round(r.height) : 0,
                debordeADroite: r ? Math.round(r.right - window.innerWidth) : 0,
                debordeEnBas: r ? Math.round(r.bottom - window.innerHeight) : 0,
                croixDuJeu: visible(sortir),
                // CE QUI DOIT RESTER ATTEIGNABLE : le cadre du meneur porte la
                // croix qui ferme l'exercice. Un voile plein écran la
                // recouvrirait, et l'élève serait enfermé dans le jeu.
                //
                // ON NE DEMANDE PAS « EXISTE-T-IL », ON DEMANDE « QUI EST LÀ ».
                // Un bouton peut exister, mesurer 44 px, être `display: block`
                // — et un voile posé par-dessus le rend inatteignable sans que
                // rien ne le dise. `elementFromPoint` en son centre nomme celui
                // qui recevra vraiment le clic : c'est la seule mesure qui
                // réponde à la question qu'on pose.
                sortieDuCadre: (() => {
                    const b = document.getElementById('btn-close-game');
                    if (!b) return 'absent';
                    const q = b.getBoundingClientRect();
                    if (!q.width || !q.height) return 'invisible';
                    const qui = document.elementFromPoint(q.left + q.width / 2,
                        q.top + q.height / 2);
                    return (qui === b || b.contains(qui)) ? 'cliquable'
                        : `recouvert par ${qui ? qui.className || qui.tagName : 'rien'}`;
                })()
            };
        }, jeu.crochet);

        ok('le terrain est posé DANS le cadre, pas par-dessus',
            vu.position === 'static', `position: ${vu.position}`);
        ok('il ne déborde pas de la fenêtre',
            vu.debordeADroite <= 1 && vu.debordeEnBas <= 1,
            `${vu.largeur} × ${vu.hauteur} px, dépasse de ${vu.debordeADroite} à droite `
            + `et ${vu.debordeEnBas} en bas`);
        ok('la croix du cadre reste cliquable, et celle du jeu a disparu',
            vu.sortieDuCadre === 'cliquable' && !vu.croixDuJeu,
            `cadre : ${vu.sortieDuCadre} · croix du jeu : ${
                vu.croixDuJeu ? 'encore là' : 'retirée'}`);

        // ET ÇA BOUGE : les pions de l'ordinateur doivent avoir avancé. Un
        // terrain immobile a l'air juste sur une photo et ne joue pas.
        const avant = await s.page.evaluate(() => [...document.querySelectorAll(
            '.pdn-pion, .jv-pion')].map(d => d.style.left + '/' + d.style.top).join('|'));
        await dormir(1400);
        const apres = await s.page.evaluate(() => [...document.querySelectorAll(
            '.pdn-pion, .jv-pion')].map(d => d.style.left + '/' + d.style.top).join('|'));
        ok('la partie vit : les pions de l\'ordinateur ont bougé',
            !!avant && avant !== apres,
            `${avant.split('|').length} rond(s)`);

        // ON PHOTOGRAPHIE LA CARTE DU JEU, et non `#game-layer` ni `body` : la
        // sonde refuse de découper un élément aussi grand que la fenêtre, et
        // ces deux-là le sont — elle le DIT, « photo COUPÉE », plutôt que de
        // rendre une image rognée sans un mot. La carte, c'est justement ce
        // qu'on vient regarder : le terrain, le bandeau et la manette.
        await s.photo(jeu.crochet.startsWith('.pdn') ? '.pdn-carte' : '.jv-carte',
            `tools/tmp/jeu-${jeu.id}.png`);
    }

    console.log('');
    ok('FENÊTRES NATIVES ET ERREURS DE PAGE : 0',
        !s.fenetresNatives.length && !s.erreurs.length,
        `${s.fenetresNatives.length} fenêtre(s), ${s.erreurs.length} erreur(s)`);
    for (const e of s.erreurs.slice(0, 6)) dit('erreur', String(e).slice(0, 150));
} catch (e) {
    ratés++;
    console.log(`\n\x1b[31m✗ la sonde s'est arrêtée\x1b[0m — ${e.message}`);
} finally {
    await s.fermer();
}

console.log('─'.repeat(70));
console.log(ratés ? `\x1b[31m${ratés} point(s) à reprendre\x1b[0m`
                  : '\x1b[32mLES QUATRE JEUX S\'OUVRENT DEPUIS LE CATALOGUE\x1b[0m');
process.exit(ratés ? 1 : 0);
