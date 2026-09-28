// QUELS RÉGLAGES SONT PROPOSÉS SANS POUVOIR RIEN FAIRE ?
//
// Rémy, après la découverte du clavier : « je préfère que tu corriges tout, je ne
// veux rien d'inutile et des réglages cohérents. »
//
// LE PROBLÈME EST STRUCTUREL, et c'est ce qui le rend intéressant. Un réglage
// déclaré par un GÉNÉRATEUR ne concerne que lui : son auteur savait ce qu'il
// écrivait. Un réglage déclaré par une ACTIVITÉ est servi à TOUS les exercices
// qui l'emploient — soixante-dix pour les bulles — et personne n'a vérifié, un
// par un, qu'il avait une prise sur chacun. C'est ainsi qu'« Autoriser le
// clavier » se proposait dans vingt et un exercices dont aucune réponse n'est
// un nombre.
//
// CET OUTIL FAIT L'INVENTAIRE, et il ne conclut rien tout seul : il dit d'où
// vient chaque réglage, à combien d'exercices il est servi, et — pour ceux dont
// on sait écrire la règle — dans lesquels il est muet. Le reste est à regarder
// à la main, et c'est écrit noir sur blanc plutôt que passé sous silence.
//
//   node tools/reglagesMuets.mjs
//   node tools/reglagesMuets.mjs --bavard

import './../tests/helpers.mjs';
import { exercices, paramSchemaOf } from '../js/data/catalog.js';
import { getGenerator, getActivity } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { formesPossibles } from '../js/core/aide.js';
import '../js/core/activities/index.js';
import { readFileSync, readdirSync } from 'node:fs';

const BAVARD = process.argv.includes('--bavard');

// --- 1. D'OÙ VIENT CHAQUE RÉGLAGE ? -------------------------------------------
//
// `paramSchemaOf` colle bout à bout les params du générateur et ceux de
// l'activité. On refait le collage en gardant la provenance.
const venuDe = new Map();      // id du réglage -> { activite: Set, generateur: Set, exos: Set }
const noter = (cle, ou, source, exoId) => {
    if (!venuDe.has(cle)) {
        venuDe.set(cle, { activite: new Set(), generateur: new Set(), exos: new Set(), label: '' });
    }
    const e = venuDe.get(cle);
    e[ou].add(source);
    e.exos.add(exoId);
    return e;
};

for (const exo of exercices) {
    // Un exercice qui pose son propre schéma le pose en entier : la provenance
    // n'est alors ni l'activité ni le générateur, c'est lui.
    if (exo.paramSchema) {
        (exo.paramSchema || []).forEach(c => {
            if (c && c.id) noter(c.id, 'generateur', 'schéma de l\'exercice', exo.id).label ||= c.label || '';
        });
        continue;
    }
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const act = exo.activityId ? getActivity(exo.activityId) : null;
    ((gen && gen.params) || []).forEach(c => {
        if (c && c.id) noter(c.id, 'generateur', exo.generatorId, exo.id).label ||= c.label || '';
    });
    ((act && act.params) || []).forEach(c => {
        if (c && c.id) noter(c.id, 'activite', exo.activityId, exo.id).label ||= c.label || '';
    });
}

const partages = [...venuDe.entries()]
    .filter(([, v]) => v.activite.size > 0)
    .sort((a, b) => b[1].exos.size - a[1].exos.size);

console.log('LES RÉGLAGES SERVIS PAR UNE ACTIVITÉ — ceux que personne ne vérifie\n');
console.log('  réglage'.padEnd(24) + 'exos  activités');
partages.forEach(([id, v]) => {
    console.log('  ' + id.padEnd(22) + String(v.exos.size).padStart(4)
        + '  ' + [...v.activite].join(', ')
        + (v.generateur.size ? `  (et ${v.generateur.size} générateur(s) le posent aussi)` : ''));
});

const propres = [...venuDe.entries()].filter(([, v]) => !v.activite.size);
console.log(`\n  (${propres.length} autres réglages sont posés par un générateur `
    + 'ou par l\'exercice lui-même : leur auteur savait ce qu\'il écrivait.)');

// --- 2. CEUX DONT ON SAIT ÉCRIRE LA RÈGLE -------------------------------------
//
// Une règle par réglage, et pas une de plus : on n'invente pas une règle pour un
// réglage qu'on n'a pas compris. `null` veut dire « à regarder à la main ».
const formes = (exo) => formesPossibles(exo,
    exo.generatorId ? getGenerator(exo.generatorId) : null, makeRng);

/** Tire quelques questions et rend ce qu'elles portent. */
function premiersItems(exo, combien = 12) {
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    if (!gen || typeof gen.generate !== 'function') return [];
    const out = [];
    for (let i = 0; i < combien; i++) {
        try {
            const it = gen.generate({ ...(exo.params || {}) },
                { rng: makeRng('rg' + i), weakTables: [], difficulty: null, index: i });
            if (it) out.push(it);
        } catch (e) { return out; }
    }
    return out;
}

const REGLES = {
    // Le pavé ne prend la main que si la réponse est un nombre (ou composable)
    // ET que la question n'y va pas d'elle-même — voir `reglageClavierAgit`.
    clavier: (exo) => formes(exo).clavier,
    // L'escalier d'aide tout entier ne veut rien dire là où l'on ne choisit
    // JAMAIS : ses quatre crans parlent de propositions.
    aide: (exo) => formes(exo).propositions,
    // La répartition est le champ caché de ce même escalier — et c'est lui qui
    // tenait l'aperçu à l'écran quand on retirait le rail.
    repartition: (exo) => formes(exo).propositions,
    // « Comment on répond » : ses crans demandent à la question de porter des
    // CANDIDATS (choisir, cliquer) et une réponse à écrire. MESURÉ sur les deux
    // exercices concernés : les douze questions tirées portent les deux.
    reponse: (exo) => premiersItems(exo).some(it => {
        const m = (it && it.meta) || {};
        const aChoisir = (Array.isArray(it.choices) && it.choices.length >= 2)
            || (Array.isArray(m.candidats) && m.candidats.length >= 2);
        const aEcrire = it.answer !== null && it.answer !== undefined && it.answer !== '';
        return aChoisir && aEcrire;
    }),
    // « Écrire au clavier dans les cases » : il n'y a rien à mesurer côté
    // questions — une grille a toujours des cases. Ce qu'il faut vérifier est
    // que QUELQU'UN LE LIT, et c'est la règle générale ci-dessous qui s'en
    // charge (`saisieActive` dans kenken, binairo et sudoku).
    saisieClavier: () => true,
    // Idem : les constructions viennent de la liste `CONSIGNES` de l'atelier,
    // donc chaque option désigne par construction une consigne qui existe.
    consigne: () => true
};

// --- LA RÈGLE QUI VAUT POUR TOUS : quelqu'un lit-il seulement ce réglage ? ----
//
// Un réglage que PERSONNE ne lit est mort partout, et aucune mesure par
// exercice ne le dirait : ses questions seraient irréprochables. On cherche donc
// son nom dans le code, hors du fichier qui le déclare.
function litParQui(id) {
    const ou = [];
    const dossiers = ['js/core/activities', 'js/core/generators', 'js/games',
        'js/core', 'js/ui'];
    for (const d of dossiers) {
        let noms = [];
        try { noms = readdirSync(d); } catch (e) { continue; }
        for (const n of noms) {
            if (!n.endsWith('.js')) continue;
            const chemin = d + '/' + n;
            let t = '';
            try { t = readFileSync(chemin, 'utf8'); } catch (e) { continue; }
            // La DÉCLARATION ne compte pas : on cherche une LECTURE.
            // LE MOT, PAS LA SOUS-CHAÎNE : « consigne » se trouvait dans
            // « consignePapier », et l'outil annonçait 147 lecteurs pour un
            // réglage qu'un seul fichier lit.
            const sansDeclaration = t.replace(new RegExp("id:\\s*'" + id + "'", 'g'), '');
            if (new RegExp('\\b' + id + '\\b').test(sansDeclaration)) ou.push(chemin);
        }
    }
    return ou;
}

console.log('\n\nCE QUE LES RÈGLES CONNUES TROUVENT\n');
let defauts = 0;
for (const [id, v] of partages) {
    const lecteurs = litParQui(id);
    if (!lecteurs.length) {
        defauts += v.exos.size;
        console.log(`  ${id.padEnd(22)} PERSONNE NE LE LIT : mort dans ses ${v.exos.size} exercices`);
        continue;
    }
    const regle = REGLES[id];
    if (!regle) {
        console.log(`  ${id.padEnd(22)} — pas de règle écrite : à regarder à la main`
            + ` (lu dans ${lecteurs.length} fichier(s))`);
        continue;
    }
    // ON N'APPLIQUE LA RÈGLE QU'AUX EXERCICES QUI TIENNENT CE RÉGLAGE DE LEUR
    // ACTIVITÉ. Piège trouvé en le faisant : `reponse` est posé par les
    // activités du cercle et de la symétrie, ET par six générateurs qui n'ont
    // rien à voir — arrondi, relatifs, pourcentages, périmètre du triangle. Le
    // nom est le même, le réglage ne l'est pas, et appliquer la règle de l'un à
    // l'autre rendait quatre fausses pistes.
    const duBonBord = (e) => {
        const act = e.activityId ? getActivity(e.activityId) : null;
        return !!act && ((act.params || []).some(c => c && c.id === id));
    };
    const muets = [...v.exos].map(x => exercices.find(e => e.id === x))
        .filter(Boolean).filter(duBonBord).filter(e => !regle(e));
    if (!muets.length) {
        console.log(`  ${id.padEnd(22)} ok — il agit dans les ${v.exos.size} exercices qui le proposent`
            + ` (lu dans ${lecteurs.length} fichier(s))`);
        continue;
    }
    defauts += muets.length;
    console.log(`  ${id.padEnd(22)} MUET dans ${muets.length} exercice(s) sur ${v.exos.size} :`);
    muets.slice(0, BAVARD ? 999 : 6).forEach(e => console.log(`      ${e.id.padEnd(28)} ${e.title}`));
    if (!BAVARD && muets.length > 6) console.log(`      … et ${muets.length - 6} autre(s) (--bavard)`);
}

// --- 3. ET LE PANNEAU LES CACHE-T-IL VRAIMENT ? --------------------------------
//
// Savoir qu'un réglage est muet ne sert à rien si le panneau continue de le
// montrer. `js/games/configUI.js` filtre son schéma à l'ouverture ; on vérifie
// ici qu'il le fait encore, parce qu'une refonte du panneau emporterait ce
// filtre sans que rien ne le dise.
const panneau = readFileSync('js/games/configUI.js', 'utf8');
const filtre = /formesPossibles\(/.test(panneau)
    && /c\.id === 'clavier'/.test(panneau)
    && /c\.id !== 'aide'/.test(panneau);

console.log('\n' + (defauts
    ? `${defauts} exercice(s) proposent un réglage qui ne peut rien y faire.`
    : 'Aucun réglage connu n\'est muet là où il est proposé.'));
console.log(filtre
    ? 'Le panneau de réglages les CACHE : le filtre est en place dans configUI.js.'
    : 'ATTENTION : le filtre a disparu de configUI.js — ils sont donc AFFICHÉS.');
// L'outil ne se plaint que si le filtre manque : la liste ci-dessus est un état
// des lieux, pas une anomalie, tant que le panneau en tient compte.
process.exit(filtre ? 0 : 1);
