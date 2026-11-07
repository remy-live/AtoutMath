// LE VOLET « AVANT L'EXERCICE » — ce que l'élève lit en premier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/avantLExercice.mjs
//
// RÉMY : « et pour l'atelier, je n'ai pas accès à l'explication avant l'écran
// ce que l'élève a avant l'exercice ».
//
// Il ne pouvait pas, et c'était écrit noir sur blanc : les trois volets montent
// le jeu avec `internalStudentConfig`, qui SAUTE exactement cet écran-là.
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · LE VOLET EXISTE ET EST ALLUMÉ D'OFFICE. Un réglage de volets enregistré
//     AVANT ce volet ne doit pas l'éteindre : « !!undefined » vaut faux, et la
//     réponse à sa demande serait arrivée invisible chez lui seul.
//   · IL MONTRE LA VUE DE L'ÉLÈVE, PAS CELLE DU PROFESSEUR. Le panneau filtre
//     les commandes de préparation sur `state.isTeacherMode` — dans un volet
//     d'Atelier, le professeur EST en mode professeur. Mesuré sur les 158
//     panneaux : médiane de quatre commandes, mais onze en dépassent vingt, et
//     ce sont les exercices à progression. C'est la différence entre « ce que
//     je règle » et « ce qu'il lit ».
//   · ET UN EXERCICE SANS RÉGLAGE LE DIT. Un volet resté blanc se lit comme un
//     volet cassé : on relance, on cherche, on ouvre la console.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde({ largeur: 1600, hauteur: 1000 });
await s.identifier();

// LE RÉGLAGE D'HIER, CELUI QUI NE CONNAÎT PAS LE VOLET NEUF. C'est exactement
// ce que porte le navigateur de Rémy, et c'est le seul endroit où le défaut
// pouvait se produire : chez la personne qui a demandé la fonctionnalité.
await s.page.evaluate(() => localStorage.setItem('mathbox-atelier-volets',
    JSON.stringify({ jeu: true, fiche: true, robot: true })));

await s.page.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    m.ouvrirAtelier('num-pgcd-ppcm');
});
await dormir(3500);

console.log('\nLE VOLET EXISTE, ET LE RÉGLAGE D\'HIER NE L\'ÉTEINT PAS\n' + '─'.repeat(64));
await s.doitExister('#atl-volet-avant', 'le volet « Avant l\'exercice »');
await s.doitExister('[data-volet="avant"]', 'la pastille du volet');
const volet = await s.page.evaluate(() => {
    const sec = document.getElementById('atl-volet-avant');
    const cadre = document.getElementById('atl-ecran-avant');
    const r = sec.getBoundingClientRect();
    return {
        montre: !sec.hidden && r.width > 2 && r.height > 2,
        taille: `${Math.round(r.width)}×${Math.round(r.height)}`,
        src: (cadre.getAttribute('src') || '').slice(0, 40),
        pastille: document.querySelector('[data-volet="avant"]').classList.contains('active'),
        dit: document.querySelector('[data-volet="avant"]').textContent.trim(),
        // L'ORDRE COMPTE : c'est l'écran que l'élève voit EN PREMIER.
        premier: document.querySelector('#atl-gauche > .atl-volet').id
    };
});
dire('il est à l\'écran', volet.montre, volet.taille);
dire('sa pastille est allumée et le nomme', volet.pastille && /avant/i.test(volet.dit), volet.dit);
dire('il charge bien l\'écran d\'avant', /atelier=avant/.test(volet.src), volet.src + '…');
dire('et il est le premier de la colonne', volet.premier === 'atl-volet-avant', volet.premier);

console.log('\nIL MONTRE LA VUE DE L\'ÉLÈVE, PAS CELLE DU PROFESSEUR\n' + '─'.repeat(64));
const cadre = s.page.frameLocator('#atl-ecran-avant');
let dedans = null;
for (let i = 0; i < 20 && !dedans; i++) {
    dedans = await s.page.evaluate(() => {
        const d = document.getElementById('atl-ecran-avant').contentDocument;
        const z = d && d.getElementById('student-config-content');
        if (!z || !z.children.length) return null;
        const champs = [...z.querySelectorAll('input, select, textarea')];
        return {
            commandes: champs.length,
            texte: (z.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 150),
            marches: !!z.querySelector('[data-param="marches"], .pr-marches, .marches'),
            boutons: [...d.querySelectorAll('#student-config-modal button')]
                .map(b => b.textContent.trim()).filter(Boolean).slice(0, 6)
        };
    });
    if (!dedans) await dormir(500);
}
dire('le panneau d\'avant-partie est bien là', !!dedans);
if (dedans) {
    // LE NOMBRE EST LA MESURE. Le panneau du professeur pour cet exercice-ci
    // porte la frise des marches et ses dix-sept cases ; celui de l'élève
    // porte deux commandes — combien de questions, et comment il répond.
    dire('il porte les commandes de l\'ÉLÈVE, pas les trente et une du prof',
        dedans.commandes > 0 && dedans.commandes < 12, `${dedans.commandes} commande(s)`);
    dire('et la liste des marches n\'y est pas', !dedans.marches);
    dire('il porte un bouton pour commencer',
        dedans.boutons.some(b => /commencer|jouer|c'est parti|démarrer/i.test(b)),
        dedans.boutons.join(' · '));
    console.log(gris('    « ' + dedans.texte + ' »'));
}

console.log('\nCE QUE LE RELEVÉ EN DIT\n' + '─'.repeat(64));
const releve = await s.page.evaluate(async () => {
    let copie = '';
    const vrai = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (t) => { copie = t; return Promise.resolve(); };
    document.getElementById('atl-releve').click();
    await new Promise(r => setTimeout(r, 900));
    navigator.clipboard.writeText = vrai;
    return copie;
});
dire('le relevé a une section pour lui', /## Volet « avant »/.test(releve),
    (releve.match(/## Volet [^\n]+/g) || []).join(' · '));
const bloc = releve.slice(releve.indexOf('## Volet « avant »'), releve.indexOf('## Volet « jeu »'));
dire('et il dit ce qu\'il y a à l\'écran', /à l'écran : \S/.test(bloc),
    (bloc.match(/à l'écran : [^\n]{0,90}/) || [''])[0]);

console.log('\nUN EXERCICE SANS RÉGLAGE LE DIT\n' + '─'.repeat(64));
const sansReglage = await s.page.evaluate(async () => {
    const { exercices, paramSchemaOf } = await import('./js/data/catalog.js');
    const { aApprentissage } = await import('./js/core/apprentissage.js');
    const e = exercices.find(x => x.generatorId && !(paramSchemaOf(x) || []).length
        && !aApprentissage(x));
    return e ? e.id : null;
});
if (!sansReglage) {
    console.log(gris('  (aucun exercice sans réglage au catalogue : rien à mesurer ici)'));
} else {
    await s.page.evaluate((id) => {
        const sel = document.getElementById('atl-exo');
        sel.value = id;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, sansReglage);
    await dormir(3000);
    const mot = await s.page.evaluate(() => {
        const d = document.getElementById('atl-ecran-avant').contentDocument;
        const el = d && d.querySelector('.atl-sans-avant');
        return el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '';
    });
    dire(`« ${sansReglage} » dit qu'il n'a pas d'écran d'avant`,
        /directement dans la première question/.test(mot), mot.slice(0, 110));
}

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 3).join('\n')));
console.log(ratés === 0 ? vert('\nL\'ÉCRAN D\'AVANT L\'EXERCICE SE REGARDE, ET C\'EST CELUI DE L\'ÉLÈVE.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
