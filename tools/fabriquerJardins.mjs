// LE FABRICANT DE JARDINS — il tourne ici, jamais dans le navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'adore le jeu rows garden […] on pourrait le faire en français avec
// des mots de math », puis, mis devant la mesure : « Grossir le lexique, puis le
// vrai jardin ».
//
// POURQUOI LES JARDINS SONT FABRIQUÉS D'AVANCE, et c'est la décision qui tient
// tout le reste. Un Strimko se tire en dix millisecondes, un Approxdoku en
// soixante : on les engendre devant l'élève, sans qu'il attende. Un jardin,
// MESURÉ avec les 786 mots du dépôt, demande deux secondes à quatre fleurs et
// neuf secondes à cinq — sur cette machine, qui n'est pas une tablette de
// collège. On ne fait pas attendre une classe neuf secondes devant un écran
// blanc, et on ne met pas un navigateur à chercher pendant ce temps.
//
// C'est d'ailleurs ainsi que fonctionne le jeu dont il parle : un Rows Garden
// de magazine est COMPOSÉ, puis imprimé. On compose donc une fois, ici, et
// `js/data/jardins.js` les porte tout faits.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUE LE FABRICANT GARANTIT POUR CHAQUE JARDIN :
//
//   · chaque RANGÉE se lit entièrement comme une ou deux réponses du lexique ;
//   · chaque FLEUR porte un mot de six lettres, lu dans le sens horaire à
//     partir d'un pétale qu'on ne dit pas ;
//   · les fleurs sont tirées EN PRIORITÉ du lexique mathématique — c'est le
//     principe de la pyramide : le chemin en français courant, l'ARRIVÉE en
//     maths. Une fleur est au centre du dessin, on la retient ;
//   · chaque réponse a sa définition, prise dans le lexique d'où elle vient ;
//   · les fleurs sont réparties en trois couleurs, et les définitions d'une
//     couleur sont mélangées entre elles : trouver OÙ va chaque définition fait
//     partie du jeu, c'est la signature du Rows Garden.
//
//     node tools/fabriquerJardins.mjs [--combien=30] [--forme=2x3] [--secondes=90]
//
// Sans `--ecrire`, il imprime ce qu'il a trouvé sans toucher à `js/data/`.

import { writeFileSync } from 'node:fs';
import { LEXIQUE } from '../js/core/motsCaches.js';
import { LEXIQUE_PYRAMIDE } from '../js/data/motsPyramide.js';
import { MOTS_COURANTS } from '../js/data/motsCourants.js';
import { makeRng } from '../js/core/ids.js';

// --- Les mots, et d'où ils viennent ------------------------------------------

/** mot → { def, maths } ; le lexique de cours l'emporte sur les autres. */
const DICO = new Map();
const ajouter = (mot, def, maths) => {
    const m = String(mot || '').toUpperCase();
    if (!/^[A-Z]{3,}$/.test(m)) return;
    if (DICO.has(m) && !maths) return;
    DICO.set(m, { def: String(def || '').trim(), maths: !!maths });
};
LEXIQUE.forEach(e => ajouter(e.mot, e.def, true));
MOTS_COURANTS.forEach(e => ajouter(e.mot, e.def, false));
// LA PYRAMIDE N'A PAS DE DÉFINITIONS : ses mots sont des barreaux, pas des
// réponses. On ne les prend donc QUE s'ils sont déjà définis ailleurs — une
// réponse sans indice est une case que l'élève ne peut pas trouver.
LEXIQUE_PYRAMIDE.forEach(x => {
    const m = String(typeof x === 'string' ? x : x.mot || '').toUpperCase();
    if (DICO.has(m)) return;
});

const LEX = {};
for (const m of DICO.keys()) (LEX[m.length] ||= []).push(m);
const SIX_MATHS = (LEX[6] || []).filter(m => DICO.get(m).maths);

// --- La géométrie -------------------------------------------------------------
//
// Repère axial « pointy-top » : une RANGÉE est `r` constant. L'ordre ci-dessous
// est HORAIRE en partant du pétale haut-droit — c'est le sens de lecture d'une
// fleur, et il doit être le même ici et à l'écran.
const HORAIRE = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];

// Les centres d'un pavage par sept forment un sous-réseau engendré par (1,2) et
// (3,−1) : une case est centre si (q + 3r) ≡ 0 [7].
const centre = (a, b) => [a + 3 * b, 2 * a - b];

const FORMES = {
    // Rangées 5 7 7 5 : deux rangées à UNE réponse, deux à deux (3+4).
    losange: { fleurs: 4, centres: [[0, 0], centre(1, 0), centre(0, 1), centre(1, 1)] },
    // Rangées 5 7 7 7 7 5, six fleurs — deux par couleur, le minimum pour que
    // les définitions rangées par couleur cachent quelque chose.
    '2x3': { fleurs: 6, centres: [[0, 0], centre(1, 0), centre(2, 0),
        centre(0, 1), centre(1, 1), centre(2, 1)] },
    trapeze: { fleurs: 5, centres: [[0, 0], centre(1, 0), centre(2, 0), centre(0, 1), centre(1, 1)] }
};

function jardin(centres) {
    const cases = new Map();
    const fleurs = centres.map(([q, r], i) => {
        cases.set(`${q},${r}`, { q, r });
        const petales = HORAIRE.map(([dq, dr]) => {
            const k = `${q + dq},${r + dr}`;
            cases.set(k, { q: q + dq, r: r + dr });
            return k;
        });
        return { i, centre: `${q},${r}`, petales };
    });
    const parR = new Map();
    for (const [cle, c] of cases) { if (!parR.has(c.r)) parR.set(c.r, []); parR.get(c.r).push({ cle, ...c }); }
    const rangees = [...parR.entries()].sort((a, b) => a[0] - b[0])
        .map(([r, l]) => ({ r, cles: l.sort((a, b) => a.q - b.q).map(x => x.cle) }))
        // Une rangée de moins de quatre cases ne porte pas de réponse : il
        // n'existe pas de mot de deux lettres, et un mot de trois dans une
        // rangée de trois ne laisse rien à chercher.
        .filter(x => x.cles.length >= 4);
    return { cases, fleurs, rangees };
}

// --- Le remplissage -----------------------------------------------------------

const colle = (mot, motif) => {
    for (let i = 0; i < mot.length; i++) if (motif[i] !== null && motif[i] !== mot[i]) return false;
    return true;
};
const decoupes = (n) => {
    const out = [];
    if (LEX[n]) out.push([n]);
    for (let a = 3; a <= n - 3; a++) if (LEX[a] && LEX[n - a]) out.push([a, n - a]);
    return out;
};

/**
 * LES FLEURS D'ABORD, LES RANGÉES ENSUITE — le plus contraint en premier.
 *
 * Mesuré à l'envers : en posant les rangées d'abord et en ne regardant la fleur
 * qu'une fois ses trois rangées écrites, une seule fleur sur un champ de
 * vingt-deux cases ne réussissait que 2 fois sur 15 ; posée d'abord, 14 sur 15.
 *
 * ON NE MÉLANGE PAS LA LISTE DES MOTS À CHAQUE APPEL. La première version le
 * faisait, et le système a TUÉ le processus (code 137) : la récursion est
 * profonde, et chaque niveau gardait sa copie de huit cents mots. On parcourt
 * la même liste à partir d'un décalage tiré au sort, ce qui mélange autant et
 * n'alloue rien.
 */
function remplir(j0, rng, finAvant) {
    // ON REBAT L'ORDRE DES FLEURS ET DES RANGÉES À CHAQUE MAIN.
    //
    // Sans cela, trois jardins d'affilée sortaient avec les MÊMES fleurs —
    // « NOMBRE CHANTE SOLEIL TRENTE » trois fois. Le décalage tiré au sort
    // dans la liste des mots ne suffit pas : la recherche descend toujours
    // dans le même ordre, bute aux mêmes endroits et retombe sur la même
    // première solution. C'est l'ORDRE DE VISITE qu'il faut changer, pas
    // seulement le point de départ dans la liste.
    const j = {
        ...j0,
        fleurs: rng.shuffle([...j0.fleurs]),
        rangees: rng.shuffle([...j0.rangees])
    };
    const DEC = {};
    j.rangees.forEach(rg => { DEC[rg.cles.length] ||= decoupes(rg.cles.length); });
    const lettres = new Map();
    // UN MOT NE SERT QU'UNE FOIS DANS UN JARDIN. Sans cette règle, deux fleurs
    // sortaient avec le même mot — donc deux définitions identiques dans le
    // même groupe de couleur, ce qui n'est plus une énigme mais une faute
    // d'impression. C'est aussi la règle de tous les mots croisés.
    const employes = new Set();
    let pas = 0;
    // LE TEMPS SE REGARDE PARTOUT, pas seulement dans la boucle profonde : une
    // première version ne le vérifiait que dans les rangées, et la recherche
    // continuait à moudre les fleurs pendant des minutes après l'échéance.
    const expire = () => (++pas & 255) === 0 && Date.now() > finAvant;

    const rangeeTient = (rg) => {
        const motif = rg.cles.map(c => lettres.get(c) || null);
        return DEC[rg.cles.length].some(d => {
            let i = 0;
            for (const L of d) { if (!LEX[L].some(m => colle(m, motif.slice(i, i + L)))) return false; i += L; }
            return true;
        });
    };
    const touchees = j.fleurs.map(f => j.rangees.filter(rg => rg.cles.some(c => f.petales.includes(c))));

    // ON RANGE LES RÉSULTATS PAR CLEF, PAS PAR RANG.
    //
    // `j.rangees` et `j.fleurs` viennent d'être REBATTUS : un tableau indexé
    // par la position rendrait les réponses de la rangée du haut attachées à
    // celle du bas. Le défaut ne se verrait pas ici — le jardin se remplirait
    // très bien — mais l'élève lirait des définitions qui ne correspondent à
    // rien. On indexe donc par la première case, qui ne bouge pas.
    const parRangee = new Map();

    const poserRangee = (i) => {
        if (i === j.rangees.length) return true;
        const rg = j.rangees[i];
        const options = DEC[rg.cles.length];
        const depart = rng.int(0, options.length - 1);
        for (let o = 0; o < options.length; o++) {
            if (Date.now() > finAvant) return false;
            const d = options[(depart + o) % options.length];
            const mots = [];
            const essaye = (part, pos) => {
                if (expire()) return false;
                if (part === d.length) {
                    parRangee.set(rg.cles[0], [...mots]);
                    return poserRangee(i + 1);
                }
                const L = d[part];
                const bout = rg.cles.slice(pos, pos + L).map(c => lettres.get(c) || null);
                const liste = LEX[L], n = liste.length, dep = rng.int(0, n - 1);
                for (let k = 0; k < n; k++) {
                    const mot = liste[(dep + k) % n];
                    if (employes.has(mot) || !colle(mot, bout)) continue;
                    employes.add(mot);
                    const poses = [];
                    for (let x = 0; x < L; x++) {
                        const cle = rg.cles[pos + x];
                        if (!lettres.has(cle)) { lettres.set(cle, mot[x]); poses.push(cle); }
                    }
                    mots.push(mot);
                    if (essaye(part + 1, pos + L)) return true;
                    mots.pop();
                    employes.delete(mot);
                    for (const cle of poses) lettres.delete(cle);
                    if (Date.now() > finAvant) return false;
                }
                return false;
            };
            if (essaye(0, 0)) return true;
            if (Date.now() > finAvant) return false;
        }
        return false;
    };

    const parFleur = new Map();

    const poserFleur = (k) => {
        if (k === j.fleurs.length) return poserRangee(0);
        // LES MOTS DE MATHS D'ABORD. S'il n'en reste aucun qui colle, on
        // accepte un mot du chemin : mieux vaut un jardin avec cinq fleurs de
        // maths sur six qu'un jardin qui n'existe pas.
        // LES MOTS DE MATHS D'ABORD UNE FOIS SUR DEUX, pas toujours : les
        // préférer systématiquement ramenait les dix-huit mêmes fleurs d'un
        // jardin à l'autre. On garde la préférence — l'arrivée doit être en
        // maths — mais on la relâche assez pour que les jardins diffèrent.
        const listes = rng.int(0, 3) ? [SIX_MATHS, LEX[6]] : [LEX[6]];
        for (const liste of listes) {
            const n = liste.length, dep = rng.int(0, n - 1);
            for (let i = 0; i < n; i++) {
                // L'HORLOGE SE REGARDE ICI AUSSI, ET SANS COMPTEUR.
                //
                // Le compteur `expire()` ne déclenche qu'une fois sur 256 ; entre
                // deux déclenchements, la boucle continue à vérifier des rangées,
                // et un jardin a mis 118 secondes à sortir pour un budget de 15.
                // Dans une boucle extérieure — cent quarante-sept tours par
                // niveau — regarder l'heure à chaque tour ne coûte rien et borne
                // la recherche pour de bon.
                if (Date.now() > finAvant) return false;
                const mot = liste[(dep + i) % n];
                if (employes.has(mot)) continue;
                for (let rot = 0; rot < 6; rot++) {
                    if (expire()) return false;
                    const poses = [];
                    let ok = true;
                    for (let x = 0; x < 6; x++) {
                        const cle = j.fleurs[k].petales[(x + rot) % 6];
                        const dedans = lettres.get(cle);
                        if (dedans && dedans !== mot[x]) { ok = false; break; }
                        if (!dedans) { lettres.set(cle, mot[x]); poses.push(cle); }
                    }
                    if (ok && touchees[k].every(rangeeTient)) {
                        parFleur.set(j.fleurs[k].centre, { mot, depart: rot });
                        employes.add(mot);
                        if (poserFleur(k + 1)) return true;
                        employes.delete(mot);
                    }
                    for (const cle of poses) lettres.delete(cle);
                }
            }
        }
        return false;
    };

    if (!poserFleur(0)) return null;
    return { lettres: new Map(lettres), parRangee, parFleur };
}

// --- Le jardin rendu ----------------------------------------------------------

const COULEURS = ['claire', 'moyenne', 'foncee'];

function composer(forme, nom, graine, secondes) {
    const j = jardin(FORMES[forme].centres);
    const rng = makeRng(graine);
    const r = remplir(j, rng, Date.now() + secondes * 1000);
    if (!r) return null;

    // LES COULEURS TOURNENT, elles ne sont pas tirées au sort : trois fleurs
    // voisines de la même couleur donneraient une couleur de trois définitions
    // et une autre d'une seule, et le partage ne cacherait plus rien.
    const fleurs = j.fleurs.map((f, i) => {
        const { mot, depart } = r.parFleur.get(f.centre);
        return {
            centre: f.centre,
            petales: f.petales,
            mot,
            def: DICO.get(mot).def,
            maths: DICO.get(mot).maths,
            depart,
            couleur: COULEURS[i % COULEURS.length]
        };
    });
    const rangees = j.rangees.map(rg => ({
        cles: rg.cles,
        reponses: r.parRangee.get(rg.cles[0]).map(m => ({ mot: m, def: DICO.get(m).def }))
    }));
    // LES RANGÉES REPARTENT DE HAUT EN BAS : `remplir` les a rebattues pour
    // chercher, mais un jardin se lit dans l'ordre où il se dessine.
    rangees.sort((a, b) => Number(a.cles[0].split(',')[1]) - Number(b.cles[0].split(',')[1]));

    // ON RELIT CE QU'ON VIENT D'ÉCRIRE, et l'on jette plutôt que de livrer un
    // jardin faux. Un fabricant qui ne se relit pas écrit ses défauts dans un
    // fichier de données que plus personne ne questionne ensuite.
    const lettre = (c) => r.lettres.get(c);
    for (const rg of rangees) {
        const lu = rg.cles.map(lettre).join('');
        const attendu = rg.reponses.map(x => x.mot).join('');
        if (lu !== attendu) throw new Error(`${nom} : rangée « ${lu} » ≠ « ${attendu} »`);
    }
    for (const f of fleurs) {
        const lu = Array.from({ length: 6 }, (_, k) => lettre(f.petales[(k + f.depart) % 6])).join('');
        if (lu !== f.mot) throw new Error(`${nom} : fleur « ${lu} » ≠ « ${f.mot} »`);
    }
    const tous = [...fleurs.map(f => f.mot), ...rangees.flatMap(rg => rg.reponses.map(x => x.mot))];
    if (new Set(tous).size !== tous.length) throw new Error(`${nom} : un mot sert deux fois`);

    return { id: nom, cases: [...j.cases.keys()], rangees, fleurs };
}

// --- La ligne de commande -----------------------------------------------------

const arg = (nom, defaut) => {
    const t = process.argv.find(a => a.startsWith(`--${nom}=`));
    return t ? t.slice(nom.length + 3) : defaut;
};
const combien = Number(arg('combien', 20));
const forme = arg('forme', '2x3');
const secondes = Number(arg('secondes', 90));
const mathsMini = Number(arg('mathsMini', Math.ceil((FORMES[arg('forme', '2x3')] || { fleurs: 2 }).fleurs / 2)));
const ecrire = process.argv.includes('--ecrire');

if (!FORMES[forme]) {
    console.error(`forme inconnue : ${forme} (connues : ${Object.keys(FORMES).join(', ')})`);
    process.exit(2);
}

console.log(`lexique : ${DICO.size} mots définis, dont ${SIX_MATHS.length} de six lettres en maths`);
console.log(`forme « ${forme} » : ${FORMES[forme].fleurs} fleurs — on en veut ${combien}, `
    + `${secondes} s au plus par jardin, ${mathsMini} fleur(s) de maths au moins\n`);

const jardins = [];
let essais = 0;
const t0 = Date.now();
while (jardins.length < combien && essais < combien * 4) {
    essais++;
    const t = Date.now();
    const g = composer(forme, `jardin-${String(jardins.length + 1).padStart(2, '0')}`,
        `jardin-${forme}-${essais}`, secondes);
    const ms = Date.now() - t;
    if (!g) { console.log(`  essai ${essais} : abandon après ${ms} ms`); continue; }
    // DEUX JARDINS AUX MÊMES FLEURS SONT LE MÊME JARDIN pour l'élève : il
    // reconnaît les six définitions et replace tout de mémoire.
    const signature = g.fleurs.map(f => f.mot).sort().join(' ');
    if (jardins.some(x => x.signature === signature)) {
        console.log(`  essai ${essais} : déjà vu (${signature})`);
        continue;
    }
    const enMaths = g.fleurs.filter(f => f.maths).length;
    // L'ARRIVÉE DOIT ÊTRE EN MATHS, et c'est tout l'objet du partage : le
    // chemin est en français courant, mais une fleur est au centre du dessin
    // et c'est elle qu'on retient. Un jardin dont aucune fleur n'est un mot de
    // cours est joli et n'apprend rien ; on le jette et l'on retire.
    if (enMaths < mathsMini) {
        console.log(`  essai ${essais} : ${enMaths} fleur(s) de maths seulement, on retire`);
        continue;
    }
    g.signature = signature;
    jardins.push(g);
    console.log(`  ${g.id} en ${ms} ms · fleurs ${g.fleurs.map(f => f.mot).join(' ')} `
        + `(${enMaths}/${g.fleurs.length} en maths)`);
}
console.log(`\n${jardins.length} jardin(s) en ${((Date.now() - t0) / 1000).toFixed(0)} s, `
    + `${essais} essai(s).`);

if (!ecrire) { console.log('\n(sans --ecrire, rien n\'est enregistré)'); process.exit(0); }

const entete = `// LES JARDINS, COMPOSÉS D'AVANCE.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// CE FICHIER EST ENGENDRÉ — on ne le modifie pas à la main :
//
//     node tools/fabriquerJardins.mjs --forme=${forme} --combien=${combien} --ecrire
//
// POURQUOI D'AVANCE. Mesuré avec les mots du dépôt : un jardin demande de deux
// à dix secondes à composer. On ne fait pas attendre une classe devant un écran
// blanc, et c'est ainsi que font les magazines dont Rémy parle — un Rows Garden
// est composé, puis imprimé.
//
// CHAQUE JARDIN PORTE : les cases (repère axial « q,r »), les rangées avec
// leurs réponses dans l'ordre, et les fleurs avec leur mot, le pétale par
// lequel il commence (\`depart\`, que l'élève ne voit pas) et leur couleur.
`;
const sortie = `${entete}
/** @type {Array<Object>} */
export const JARDINS = ${JSON.stringify(jardins, null, 1)};
`;
writeFileSync('js/data/jardins.js', sortie);
console.log(`\njs/data/jardins.js écrit — ${(sortie.length / 1024).toFixed(0)} Ko.`);
