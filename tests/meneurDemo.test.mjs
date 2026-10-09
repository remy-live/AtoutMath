// LE MENEUR DE DÉMONSTRATION — l'échafaudage qui était recopié 674 fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/meneurDemo.js` remplace la phrase que chaque démonstration écrivait
// devant chacun de ses pas. Trois choses lui sont confiées, et ce sont les trois
// qu'on garde ici :
//
//   1. L'ATTENTE — le tour de parole, la pause de lecture, les gestes.
//   2. LA VIE — « ce jeu tourne-t-il encore ? », posée UNE fois.
//   3. LE RANGEMENT — une seule fois, même après dix pas manqués.
//
// POURQUOI CETTE ÉPREUVE EST ÉCRITE AVANT LA MIGRATION. Quatre-vingt-dix-huit
// fichiers vont se mettre à dépendre de ce fichier-ci. Un défaut dedans ne casse
// pas une démonstration : il les casse TOUTES, et de la façon la plus sournoise —
// un `vivant` ignoré ne se voit que sur l'exercice que l'élève vient de quitter.
//
// LES FAUX POINTEUR ET FAUSSE BARRE SONT MINUSCULES et ils COMPTENT leurs
// appels : c'est la seule façon de voir qu'un rangement s'est fait deux fois.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { meneurDemo } from '../js/core/meneurDemo.js';

/** Un pointeur qui note tout ce qu'on lui demande, et qui peut refuser. */
function fauxPointeur(refuse = () => false) {
    const j = { pauses: [], dits: [], vers: [], touches: [], glisses: [], bulles: 0, detruits: 0 };
    return {
        j,
        async pause(ms) { j.pauses.push(ms); return !refuse('pause'); },
        async moveTo(c, ms) { j.vers.push([c, ms]); return !refuse('moveTo'); },
        async tap(c, ms) { j.touches.push([c, ms]); return !refuse('tap'); },
        async dragFromTo(a, b, ms) { j.glisses.push([a, b, ms]); return !refuse('drag'); },
        say(t, c) { j.dits.push([t, c]); },
        hideBubble() { j.bulles++; },
        destroy() { j.detruits++; }
    };
}

/** Une barre qui note les tours et les délais, et qui peut refuser. */
function fausseBarre(refuse = () => false) {
    const j = { tours: 0, attentes: [], detruites: 0 };
    return {
        j,
        async waitTurn() { j.tours++; return !refuse('tour'); },
        async wait(ms) { j.attentes.push(ms); return !refuse('wait'); },
        destroy() { j.detruites++; }
    };
}

test('UN PAS QUI ABOUTIT REND VRAI, ET NE RANGE RIEN', async () => {
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true);

    assert.equal(await d.tour(), true);
    assert.equal(await d.pause(700), true);
    assert.equal(await d.attendre(300), true);
    assert.equal(await d.vers('elA', 200), true);
    assert.equal(await d.toucher('elB', 150), true);
    assert.equal(await d.glisser('elC', 'elD'), true);

    assert.equal(b.j.tours, 1);
    assert.deepEqual(p.j.pauses, [700]);
    assert.deepEqual(b.j.attentes, [300]);
    assert.deepEqual(p.j.vers, [['elA', 200]]);
    assert.deepEqual(p.j.touches, [['elB', 150]]);
    assert.deepEqual(p.j.glisses, [['elC', 'elD', undefined]]);

    assert.equal(p.j.detruits, 0, 'une démonstration qui se déroule ne range rien en route');
    assert.equal(b.j.detruites, 0);
    assert.equal(d.vivant, true);
});

test('LE JEU QUI S\'ARRÊTE ARRÊTE LE PAS SUIVANT, ET RANGE', async () => {
    // LE DÉFAUT QUE CE MODULE EXISTE POUR FERMER. Cinquante-deux pas sur 674 ne
    // vérifiaient RIEN : un exercice que l'élève vient de quitter continuait de
    // parler et de cliquer dans le vide pendant quelques secondes. Ici, un seul
    // endroit décide, et aucun pas ne peut l'oublier.
    const p = fauxPointeur(), b = fausseBarre();
    let tourne = true;
    const d = meneurDemo(p, b, () => tourne);

    assert.equal(await d.tour(), true);
    tourne = false;                                   // l'élève quitte l'exercice
    assert.equal(await d.pause(700), false, 'le pas suivant doit rendre faux');
    assert.equal(p.j.detruits, 1, 'et le pointeur doit être rangé');
    assert.equal(b.j.detruites, 1);
    assert.equal(d.vivant, false);
});

test('UN POINTEUR DÉTRUIT ARRÊTE AUSSI LA DÉMONSTRATION', async () => {
    // L'autre moitié de la vie : le pointeur rend `false` quand il a été
    // détruit (changement de question, fermeture de l'exercice).
    const p = fauxPointeur((quoi) => quoi === 'pause'), b = fausseBarre();
    const d = meneurDemo(p, b, () => true);

    assert.equal(await d.tour(), true);
    assert.equal(await d.pause(700), false);
    assert.equal(p.j.detruits, 1);
});

test('LA BARRE QUI REFUSE SON TOUR ARRÊTE LA DÉMONSTRATION', async () => {
    // C'est ce qui arrive quand on détruit la barre pendant qu'elle attend : le
    // professeur a fermé la fenêtre pendant une pause.
    const p = fauxPointeur(), b = fausseBarre((quoi) => quoi === 'tour');
    const d = meneurDemo(p, b, () => true);
    assert.equal(await d.tour(), false);
    assert.equal(p.j.detruits, 1);
    assert.equal(b.j.detruites, 1);
});

test('LE RANGEMENT NE SE FAIT QU\'UNE FOIS, MÊME APRÈS DIX PAS MANQUÉS', async () => {
    // AVANT, CHAQUE PAS MANQUÉ RAPPELAIT `fin()`. Deux `gate.destroy()` de suite
    // sont inoffensifs aujourd'hui ; rien ne garantissait qu'ils le resteraient,
    // et le rangement d'un appelant — remettre un champ à null, arrêter un
    // minuteur — n'a aucune raison d'être idempotent.
    const p = fauxPointeur(), b = fausseBarre();
    let ranges = 0;
    const d = meneurDemo(p, b, () => false, () => { ranges++; });

    for (let i = 0; i < 10; i++) assert.equal(await d.pause(100), false);
    assert.equal(await d.tour(), false);
    d.fin();
    d.fin();

    assert.equal(p.j.detruits, 1, 'un seul rangement du pointeur');
    assert.equal(b.j.detruites, 1, 'une seule fermeture de la barre');
    assert.equal(ranges, 1, 'et un seul rangement de l\'appelant');
});

test('« fin » REND FAUX, POUR QU\'ON PUISSE ÉCRIRE « return d.fin() »', async () => {
    // Plusieurs démonstrations rendaient `false` pour dire « je n'ai pas
    // abouti » à celle qui les appelait. Le remplacement doit garder cette
    // valeur, sinon l'appelante croit que tout s'est bien passé et continue.
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true);
    assert.equal(d.fin(), false);
    assert.equal(p.j.detruits, 1);
});

test('APRÈS LA FIN, PLUS AUCUN PAS NE REPART', async () => {
    // Une démonstration terminée ne doit pas pouvoir reprendre la parole : ses
    // minuteurs en vol appelleraient des pas sur un pointeur détruit, et c'est
    // ainsi qu'on obtient « Cannot set properties of null » dans la question
    // SUIVANTE.
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true);
    d.fin();
    assert.equal(d.vivant, false);
    assert.equal(await d.pause(100), false);
    assert.equal(await d.tour(), false);
    assert.equal(p.j.detruits, 1, 'et le rangement ne se refait toujours pas');
});

test('SEIZE DÉMONSTRATIONS CACHENT LA BULLE SANS DÉTRUIRE LE POINTEUR', async () => {
    // Elles rendent la main à une activité qui REPREND la parole juste après —
    // le corrigé, la question suivante. Détruire le pointeur lui couperait le
    // sien, et l'élève verrait la correction s'afficher sans un mot.
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true, null, { garderPointeur: true });
    d.fin();
    assert.equal(p.j.bulles, 1, 'la bulle se cache');
    assert.equal(p.j.detruits, 0, 'mais le pointeur reste en vie');
    assert.equal(b.j.detruites, 1, 'la barre, elle, s\'en va : la démonstration est finie');
});

test('SANS PRÉDICAT DE VIE, SEULE LA DESTRUCTION DU POINTEUR ARRÊTE', async () => {
    // C'est l'état des 52 pas qui ne vérifiaient rien. Le meneur l'accepte —
    // sinon la migration aurait changé le comportement de ces fichiers en même
    // temps que leur forme, et l'on n'aurait plus su ce qu'on mesurait — mais
    // la documentation dit que ce n'est jamais le bon choix.
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b);
    assert.equal(await d.tour(), true);
    assert.equal(await d.pause(100), true);
    assert.equal(d.vivant, true);
});

test('UN PAS EMPRUNTÉ PASSE PAR « puis », ET SA VALEUR COMPTE', async () => {
    // Quelques démonstrations appellent une méthode à elles qui contient
    // elle-même des pas gardés. `puis` leur donne la garde sans la recopier.
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true);

    assert.equal(await d.puis(Promise.resolve(true)), true);
    assert.equal(await d.puis(Promise.resolve(undefined)), true,
        'une méthode qui ne rend rien a réussi : seul « false » est un échec');
    assert.equal(p.j.detruits, 0);

    assert.equal(await d.puis(Promise.resolve(false)), false);
    assert.equal(p.j.detruits, 1, 'et un échec range');
});

test('CE QUE LE MENEUR DIT PASSE AU POINTEUR, TEL QUEL', async () => {
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true);
    d.dire('Le canon tire tout seul.', 'arene');
    assert.deepEqual(p.j.dits, [['Le canon tire tout seul.', 'arene']]);
    // Et `dire` se chaîne, pour ne pas alourdir un scénario.
    assert.equal(d.dire('Et voilà.'), d);
});

test('UN RANGEMENT QUI JETTE NE MASQUE PAS LA FIN', async () => {
    // Le rangement d'un appelant touche à SES champs. S'il jette — un minuteur
    // déjà arrêté, un élément déjà retiré —, la démonstration doit quand même
    // se terminer proprement : autrement l'exception remonte dans une
    // `async` que personne n'attend, et la page affiche une erreur.
    const p = fauxPointeur(), b = fausseBarre();
    const d = meneurDemo(p, b, () => true, () => { throw new Error('déjà rangé'); });
    assert.doesNotThrow(() => d.fin());
    assert.equal(p.j.detruits, 1);
    assert.equal(b.j.detruites, 1);
});

test('UN POINTEUR OU UNE BARRE ABSENTS NE FONT PAS TOMBER LA DÉMONSTRATION', async () => {
    // Les vignettes du catalogue montent des démonstrations en mode muet, où la
    // barre est inerte. Et une activité peut n'avoir pas encore de pointeur au
    // moment où elle monte son meneur.
    const d = meneurDemo(null, null, () => true);
    assert.equal(await d.tour(), true);
    assert.equal(await d.pause(100), true);
    assert.equal(await d.attendre(100), true);
    assert.equal(await d.vers('el'), true);
    assert.equal(await d.toucher('el'), true);
    assert.equal(await d.glisser('a', 'b'), true);
    assert.doesNotThrow(() => d.dire('rien'));
    assert.equal(d.fin(), false);
});

test('UN POINTEUR QUI JETTE EN SE RANGEANT N\'EMPÊCHE PAS LA BARRE DE PARTIR', async () => {
    // L'ORDRE COMPTE : si le pointeur jetait et emportait le rangement avec
    // lui, la barre Pause resterait dans l'en-tête de l'exercice suivant — et
    // comme elle met le module en pause, elle gèlerait la démonstration
    // SUIVANTE. C'est un défaut déjà vécu, documenté dans `demoPointer.js`.
    const b = fausseBarre();
    const p = { destroy() { throw new Error('déjà parti'); }, async pause() { return true; } };
    let ranges = 0;
    const d = meneurDemo(p, b, () => true, () => { ranges++; });
    assert.doesNotThrow(() => d.fin());
    assert.equal(b.j.detruites, 1, 'la barre doit partir quand même');
    assert.equal(ranges, 1, 'et le rangement de l\'appelant être fait');
});

test('UN RANGEMENT SUR MESURE EST LE SEUL À S\'EXÉCUTER', async () => {
    // Une dizaine de démonstrations rangent autrement : l'une remet `gate` à
    // null, une autre relance la question suivante, une troisième arrête son
    // propre intervalle. Leur rangement reste le code que son auteur a voulu ;
    // le meneur ne doit RIEN y ajouter, sinon il détruirait deux fois ce que
    // l'autre vient de ranger à sa façon.
    const p = fauxPointeur(), b = fausseBarre();
    let ranges = 0;
    const d = meneurDemo(p, b, () => true, () => { ranges++; }, { rangementSeul: true });

    assert.equal(await d.tour(), true);
    d.fin();
    assert.equal(ranges, 1, 'le rangement de l\'appelant se fait');
    assert.equal(p.j.detruits, 0, 'et le meneur ne touche pas au pointeur');
    assert.equal(p.j.bulles, 0);
    assert.equal(b.j.detruites, 0, 'ni à la barre');

    // Mais la garde fonctionne toujours : c'est pour elle qu'on est là.
    assert.equal(await d.pause(100), false, 'après la fin, plus un pas ne repart');
    assert.equal(ranges, 1, 'et le rangement ne se refait pas');
});
