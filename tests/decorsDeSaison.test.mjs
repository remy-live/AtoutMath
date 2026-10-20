// LES DÉCORS DE SAISON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 20 octobre : « ah mais oui fais tout le reste et mets aussi des thèmes
// (Noël, Halloween, Paques, Robot) ».
//
// QUATRE DÉCISIONS SONT GARDÉES ICI, et chacune se défait par distraction :
//
//   1. LE DÉCOR EST UN AXE À PART DE L'HABILLAGE. Rangé dans la liste des
//      habillages, « Noël » aurait REMPLACÉ la mise en page : l'élève qui a
//      besoin du damier — le parcours de quatorze étapes qui ne tient pas sur
//      un écran — aurait perdu Noël, et qui veut Noël aurait perdu le damier.
//      Les vingt combinaisons doivent exister.
//   2. LE DÉCOR NE MANGE PAS LE PICTOGRAMME. Remplacer 🍕 par un flocon ferait
//      joli et coûterait l'information : le picto dit la notion travaillée, et
//      c'est à ça qu'il sert.
//   3. UN PARCOURS D'AVANT CE RÉGLAGE N'IMPOSE RIEN, et son empreinte de
//      contenu ne bouge pas — c'est-à-dire que le code que ses élèves ont déjà
//      continue de marcher.
//   4. LE BLANC SE LIT SUR CHAQUE COULEUR DE DÉCOR : la gommette de rang et le
//      fanion « C'est ici ! » écrivent du blanc sur `--primary`, et un décor
//      qui le repeint pourrait le rendre illisible.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultPolicy, evaluationPolicy, resolvePolicy } from '../js/core/policy.js';
import { Shortcodes, identiteDeParcours } from '../js/core/shortcodes.js';
import { makeStep } from '../js/core/path.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const PV = lire('js/ui/pathView.js');
const CSS = lire('css/modules.css');

const ATTENDUS = ['aucun', 'noel', 'halloween', 'paques', 'robot'];

/** Le corps de `DECORS`, isolé de celui de `STYLES` et de `HABILLAGES`. */
function listeDesDecors() {
    const debut = PV.indexOf('export const DECORS = [');
    assert.notEqual(debut, -1, 'DECORS a disparu de pathView.js');
    return PV.slice(debut, PV.indexOf('];', debut));
}

// ── 1 · UN AXE À PART ───────────────────────────────────────────────────────

test('LES CINQ DÉCORS EXISTENT, ET CHACUN DIT CE QU\'IL FAIT', () => {
    const liste = listeDesDecors();
    ATTENDUS.forEach(id => assert.ok(new RegExp(`id: '${id}'`).test(liste),
        `le décor « ${id} » manque`));
    // Un nom seul ne dit pas de quoi « Robot » a l'air, et l'on ne donne pas
    // une séance à six classes pour le découvrir — c'est la raison d'être de
    // l'aperçu, et `dit` est ce que lit le menu du professeur.
    ATTENDUS.forEach(id => assert.ok(
        new RegExp(`id: '${id}'[\\s\\S]{0,160}?dit:`).test(liste),
        `« ${id} » ne dit pas ce qu'il fait`));
    // `libre` N'EST PAS UN DÉCOR : c'est l'absence d'imposition. Dans la liste,
    // il dessinerait une carte « libre » qui n'existe pas — et le professeur
    // le verrait proposé deux fois dans son menu.
    assert.ok(!/id: 'libre'/.test(liste));
});

test('ET AUCUN N\'EST UN HABILLAGE — les deux listes ne se mélangent pas', () => {
    // LA RÈGLE QUI COÛTE LE PLUS CHER À DÉFAIRE. Un décor glissé dans `STYLES`
    // devient une mise en page : `construireCarte` ne saurait pas le dessiner
    // et retomberait en silence sur la carte des mondes, donc le professeur
    // choisirait « Noël » et sa classe verrait autre chose.
    const styles = PV.slice(PV.indexOf('const STYLES = ['),
        PV.indexOf('];', PV.indexOf('const STYLES = [')));
    ATTENDUS.filter(id => id !== 'aucun').forEach(id =>
        assert.ok(!styles.includes(`'${id}'`), `« ${id} » s'est glissé dans STYLES`));
    // Et réciproquement : un habillage dans `DECORS` serait proposé comme un
    // décor et ne repeindrait rien.
    const decors = listeDesDecors();
    ['chemin', 'mondes', 'damier', 'ruban', 'classique'].forEach(id =>
        assert.ok(!decors.includes(`'${id}'`), `« ${id} » s'est glissé dans DECORS`));
});

test('LE DÉCOR SE POSE SUR LES CINQ HABILLAGES, PAS SUR UN SEUL', () => {
    // C'est tout l'intérêt de l'axe à part : les vingt combinaisons existent.
    // `construireCarte` doit donc avoir UNE seule sortie, qui passe par le
    // décor — cinq `return` directs, et quatre habillages sur cinq l'auraient
    // perdu sans que rien ne le dise.
    const corps = PV.slice(PV.indexOf('export function construireCarte'),
        PV.indexOf('\n}', PV.indexOf('export function construireCarte')));
    assert.match(corps, /return poserLeDecor\(carte, o\.decor \|\| DECOR_PAR_DEFAUT\);/);
    assert.equal((corps.match(/\breturn\b/g) || []).length, 1,
        'construireCarte a une sortie qui ne passe pas par le décor');
});

test('LES ORNEMENTS NE VONT PAS SUR LA LISTE CLASSIQUE', () => {
    // Elle se lit en toutes lettres : semer six emoji derrière un paragraphe
    // se paie en lisibilité sans rien apporter. Elle garde les COULEURS, qui
    // ne coûtent rien à personne.
    const corps = PV.slice(PV.indexOf('function poserLeDecor'),
        PV.indexOf('\n}', PV.indexOf('function poserLeDecor')));
    assert.match(corps, /classList\.contains\('path-timeline'\)/);
    // Et l'ordre compte : la classe de décor est posée AVANT ce départ, sinon
    // la liste classique perdrait aussi les couleurs.
    assert.ok(corps.indexOf('classList.add(\'decor\'')
        < corps.indexOf('classList.contains(\'path-timeline\')'),
        'la liste classique perd les couleurs en même temps que les ornements');
});

// ── 2 · LE PICTOGRAMME RESTE ────────────────────────────────────────────────

test('LE DÉCOR NE TOUCHE PAS AU PICTOGRAMME DE L\'ÉTAPE', () => {
    // Le picto dit la notion travaillée — « on reconnaît les angles ou l'heure
    // d'un coup d'œil ». Un décor qui le remplace par un flocon rend toutes
    // les étapes identiques : c'est le décor qui mange l'information.
    const corps = PV.slice(PV.indexOf('function poserLeDecor'),
        PV.indexOf('\n}', PV.indexOf('function poserLeDecor')));
    assert.ok(!/picto/i.test(corps), 'poserLeDecor touche au pictogramme');
    // Et `pictoDe` ne connaît pas les décors : il ne lit que les étiquettes de
    // l'exercice.
    const picto = PV.slice(PV.indexOf('function pictoDe'),
        PV.indexOf('\n}', PV.indexOf('function pictoDe')));
    ATTENDUS.forEach(id => assert.ok(!picto.includes(id),
        `pictoDe regarde le décor « ${id} »`));
});

test('ET L\'OR D\'UNE ÉTAPE RÉUSSIE NE BOUGE PAS NON PLUS', () => {
    // Un élève qui change de décor ne doit pas réapprendre à lire sa propre
    // carte, et « c'est fait » est l'état qui mérite le plus de rester stable.
    // Il est donc écrit en dur, et AUCUN décor ne le redéfinit.
    const fait = CSS.slice(CSS.indexOf('.world-node--done .world-node-btn {'),
        CSS.indexOf('}', CSS.indexOf('.world-node--done .world-node-btn {')));
    assert.match(fait, /#f59e0b/);
    ATTENDUS.filter(id => id !== 'aucun').forEach(id => {
        const regle = CSS.slice(CSS.indexOf(`.decor--${id} {`),
            CSS.indexOf('}', CSS.indexOf(`.decor--${id} {`)));
        assert.ok(!/world-node--done/.test(regle));
    });
});

// ── 3 · RIEN NE CHANGE POUR LES PARCOURS DÉJÀ DONNÉS ────────────────────────

test('UN PARCOURS SANS RÉGLAGE NE SE MET PAS À IMPOSER UN DÉCOR', () => {
    // `decorImpose` ne lit QUE ce qui est écrit : une valeur inconnue, vide ou
    // `libre` rend la main à l'élève. C'est ce qui rend le réglage sûr à
    // ajouter — aucun parcours existant ne se met à imposer dans le dos de son
    // auteur.
    assert.match(PV, /const v = policy && policy\.decor;/);
    assert.match(PV, /return DECORS\.some\(d => d\.id === v\) \? v : null;/);
    assert.match(PV, /return decorImpose\(policy\) \|\| getPathDecor\(\);/);
    // ET C'EST LE DÉFAUT DE TOUS LES MODES, contrairement à la présentation :
    // le décor ne change rien à ce qu'on travaille, autant le laisser à celui
    // que ça amuse.
    assert.equal(defaultPolicy().decor, 'libre');
    assert.equal(resolvePolicy({}).decor, 'libre');
    assert.equal(resolvePolicy(evaluationPolicy()).decor, 'libre');
});

test('ET L\'EMPREINTE DE CONTENU D\'UN PARCOURS NE BOUGE PAS D\'UN CARACTÈRE', () => {
    // L'EMPREINTE EST LE CODE QUE SES ÉLÈVES ONT DÉJÀ. Ajouter une clé à la
    // représentation compacte la changerait pour TOUS les parcours — et les
    // travaux rendus ne se rattacheraient plus à la séance qui les a demandés.
    // Elle ne bouge pas parce que `decor` vaut `libre` dans toutes les
    // politiques de mode : l'encodage n'émet que les ÉCARTS.
    const parcours = {
        id: 'p1', name: 'Avant les vacances', version: 2,
        policy: { ...defaultPolicy() },
        steps: [makeStep('calc-add', {}), makeStep('frac-simplifier', {})]
    };
    const sansDecor = { ...parcours, policy: { ...parcours.policy } };
    delete sansDecor.policy.decor;
    assert.equal(identiteDeParcours(parcours), identiteDeParcours(sansDecor));
    // Et un décor IMPOSÉ, lui, change bien l'empreinte : c'est un réglage de
    // la séance, donc il voyage, donc il compte.
    const avecNoel = { ...parcours, policy: { ...parcours.policy, decor: 'noel' } };
    assert.notEqual(identiteDeParcours(parcours), identiteDeParcours(avecNoel));
});

test('LE CODE ÉLÈVE EMPORTE LE DÉCOR', () => {
    // Un réglage qui ne suit pas le lien n'est pas un réglage de la séance : le
    // professeur choisirait Halloween et ses élèves verraient la carte nue.
    const parcours = {
        id: 'p1', name: 'Interro', version: 2,
        policy: { ...evaluationPolicy(), decor: 'aucun' },
        steps: [makeStep('calc-add', {}), makeStep('frac-simplifier', {})]
    };
    const relu = resolvePolicy(Shortcodes.decodePath(Shortcodes.encodePath(parcours)).policy);
    assert.equal(relu.decor, 'aucun');
    // « Sans décor » DOIT faire l'aller-retour, et c'est le cas le plus
    // fragile : c'est une imposition qui ressemble à un défaut. Sans elle,
    // l'élève garderait ses guirlandes pendant le contrôle.
    const libre = { ...parcours, policy: { ...evaluationPolicy(), decor: 'halloween' } };
    assert.equal(
        resolvePolicy(Shortcodes.decodePath(Shortcodes.encodePath(libre)).policy).decor,
        'halloween');
});

// ── 4 · LES COULEURS SONT MESURÉES ──────────────────────────────────────────

/** La luminance relative, telle que la définit WCAG. */
function luminance(hex) {
    const v = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
    const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (haut + 0.05) / (bas + 0.05);
}

test('LE BLANC SE LIT SUR LA COULEUR DE CHAQUE DÉCOR', () => {
    // La gommette de rang de l'étape en cours et le fanion « C'est ici ! »
    // écrivent du BLANC sur `--primary`. Un décor repeint ce jeton : choisir
    // la teinte à l'œil, c'est accepter de rendre le numéro d'étape illisible
    // pour quatre élèves sur cinq de la classe.
    ATTENDUS.filter(id => id !== 'aucun').forEach(id => {
        const debut = CSS.indexOf(`.decor--${id} {`);
        assert.notEqual(debut, -1, `.decor--${id} a disparu de la feuille`);
        const regle = CSS.slice(debut, CSS.indexOf('}', debut));
        const m = regle.match(/--primary:\s*(#[0-9a-fA-F]{6})/);
        assert.ok(m, `.decor--${id} ne déclare pas --primary`);
        const r = contraste(m[1], '#ffffff');
        assert.ok(r >= 4.5,
            `décor « ${id} » : blanc sur ${m[1]} donne ${r.toFixed(2)}:1, il en faut 4,5`);
    });
});

test('LA NAPPE D\'ORNEMENTS PASSE SOUS LE TRAVAIL, JAMAIS DEVANT', () => {
    // Un décor qui passe devant les pastilles n'est plus un décor. Le sentier
    // est déjà à -1 ; la nappe descend d'un cran de plus, et ne prend aucun
    // clic.
    const debut = CSS.indexOf('.decor-nappe {');
    assert.notEqual(debut, -1);
    const regle = CSS.slice(debut, CSS.indexOf('}', debut));
    assert.match(regle, /z-index:\s*-2/);
    assert.match(regle, /pointer-events:\s*none/);
});

test('ET LA NEIGE S\'ARRÊTE POUR QUI L\'A DEMANDÉ', () => {
    // `prefers-reduced-motion` n'est pas un confort : des flocons qui tombent
    // en boucle derrière un exercice déclenchent des migraines. Le décor
    // reste — c'est le MOUVEMENT qui gêne, pas la couleur.
    assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.decor--noel \.decor-nappe::before \{ animation: none; \}\s*\n\}/);
});

// ── 5 · LES DEUX CÔTÉS PARTENT DE LA MÊME LISTE ─────────────────────────────

test('LE PROFESSEUR CHOISIT DANS LA MÊME LISTE QUE L\'ÉLÈVE', () => {
    // Deux listes finiraient par offrir au professeur un décor que l'écran de
    // l'élève ne sait pas poser — le défaut qu'on vient d'éviter pour les
    // habillages, par l'autre bout.
    const CFG = lire('js/games/configUI.js');
    assert.match(CFG, /import \{ HABILLAGES, DECORS \} from '\.\.\/ui\/pathView\.js';/);
    assert.match(CFG, /\$\{DECORS\.map\(d => /);
    assert.match(CFG, /<option value="libre" \$\{p\.decor === 'libre'/);
    // Et le choix s'enregistre : un réglage qui s'affiche sans se sauver est
    // pire qu'un réglage absent.
    assert.match(CFG, /decor: \(document\.getElementById\('cfg-decor'\) \|\| \{\}\)\.value \|\| base\.decor,/);
    // L'APERÇU MONTRE LE DÉCOR AUSSI. Rémy avait demandé l'aperçu pour les
    // habillages ; un décor qu'on choisit sans le voir pose la même question.
    assert.match(CFG, /decor: quelDecor === 'libre' \? 'aucun' : quelDecor,/);
});

test('ET LES BOUTONS DE L\'ÉLÈVE SE CACHENT RANGÉE PAR RANGÉE', () => {
    // Une séance peut fixer l'habillage et laisser le décor libre — ou
    // l'inverse. Retirer les deux rangées dès que l'une est imposée enlèverait
    // à l'élève un choix qu'on lui laisse ; les laisser toutes les deux quand
    // les deux sont imposées lui ferait appuyer dix fois avant de comprendre
    // qu'on lui mente.
    const corps = PV.slice(PV.indexOf('export function barreDeStyles'),
        PV.indexOf('\n}', PV.indexOf('export function barreDeStyles')));
    assert.match(corps, /if \(!presentationImposee\(policy\)\) \{/);
    assert.match(corps, /if \(!decorImpose\(policy\)\) \{/);
    assert.match(corps, /if \(!groupes\.length\) return null;/);
});
