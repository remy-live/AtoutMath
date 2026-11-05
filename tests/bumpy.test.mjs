// BUMPY — ce qui doit rester vrai du monde, et qu'on ne voit pas à l'œil.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « bumpy ca cassait des blocs et ca sautait en colonnes »,
// « et il y avait des pics des bonus ».
//
// ── POURQUOI CES ÉPREUVES-LÀ ───────────────────────────────────────────────
//
// Un jeu d'adresse ne se vérifie pas en le regardant : on voit une balle qui
// rebondit, et l'on en conclut qu'elle rebondit bien. La première version de
// ce jeu avait DEUX défauts qui rendaient tout injouable, et aucun des deux ne
// se voyait à l'écran — une balle qui passait sous le sol dès qu'elle
// chevauchait deux cases, et un rebond trop court pour gravir les tableaux.
//
// On garde donc les quatre règles qui FONT le jeu, et la seule question qui
// compte : les tableaux se finissent-ils ?

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { MONTEE, NIVEAUX, TUILE, coup, etatInitial, lireNiveau } from '../js/core/bumpy.js';
import { chercher } from '../tools/bumpyJouable.mjs';

/** Un tableau d'essai écrit à la main, lu comme les vrais. */
const essai = (lignes) => lireNiveau({ nom: 'essai', lignes });

test('UN REBOND NE DÉPLACE JAMAIS QUE D\'UNE COLONNE', () => {
    // C'est la règle que Rémy a corrigée en premier — « ca sautait en
    // colonnes ». Si elle lâche, le jeu redevient un jeu de plateforme : on
    // ne sait plus où l'on va retomber, donc on subit au lieu de décider.
    const n = essai([
        '##########',
        '#........#',
        '#........#',
        '#..B.....#',
        '#========#',
        '##########'
    ]);
    let e = etatInitial(n);
    for (const d of [1, 1, -1, 0, -1, 1, 1, 1]) {
        const avant = e.c;
        const r = coup(e, n, d);
        e = r.etat;
        assert.ok(Math.abs(e.c - avant) <= 1,
            `elle passe de la colonne ${avant} à ${e.c} en un seul rebond`);
    }
});

test('ON CASSE LE BLOC SUR LEQUEL ON RETOMBE, ET LUI SEUL', () => {
    const n = essai([
        '##########',
        '#........#',
        '#........#',
        '#..B.....#',
        '#========#',
        '#========#',
        '##########'
    ]);
    const compter = () => n.cases.flat().filter(t => t === TUILE.BLOC).length;
    const depart = compter();
    let e = etatInitial(n);
    assert.equal(e.r, 3, 'elle doit se poser sur la masse, pas flotter');

    const r1 = coup(e, n, 0);
    e = r1.etat;
    assert.ok(r1.faits.includes('casse'), 'rien ne s\'est cassé sous elle');
    assert.equal(compter(), depart - 1, 'plus d\'un bloc a disparu d\'un coup');
    assert.equal(n.cases[4][3], TUILE.VIDE, 'ce n\'est pas le bloc du dessous qui a sauté');

    // ET ELLE DESCEND D'UN CRAN : c'est la conséquence, et c'est elle qui fait
    // qu'on creuse. Sans cela, casser serait sans effet sur le jeu.
    const r2 = coup(e, n, 0);
    assert.equal(r2.etat.r, 4, `elle reste à la ligne ${r2.etat.r} au lieu de descendre`);
});

test('UN REBOND NE MONTE QUE DE DEUX CASES — c\'est l\'engagement du jeu', () => {
    // Deux cases : de quoi sortir d'un trou qu'on vient de faire, pas de quoi
    // sortir d'un puits de trois. C'est CE nombre qui fait que descendre
    // engage, et donc que le jeu se joue avant de creuser.
    assert.equal(MONTEE, 2);

    // Un puits de deux : elle peut encore changer de colonne.
    const peuProfond = essai([
        '##########',
        '#........#',
        '#..=.=...#',
        '#..=B=...#',
        '#..===...#',
        '##########'
    ]);
    let e = etatInitial(peuProfond);
    const sortie = coup(e, peuProfond, 1);
    assert.equal(sortie.etat.c, 5, 'à deux cases de fond, elle doit pouvoir sortir');

    // Un puits de trois : elle ne peut plus. Les parois la retiennent, et le
    // coup n'est pas perdu — elle creuse sur place.
    const profond = essai([
        '##########',
        '#..=.=...#',
        '#..=.=...#',
        '#..=B=...#',
        '#..===...#',
        '##########'
    ]);
    let f = etatInitial(profond);
    const retenue = coup(f, profond, 1);
    assert.equal(retenue.etat.c, 4, 'à trois cases de fond, elle s\'échappe quand même');
    assert.ok(retenue.faits.includes('mur'), 'et rien ne dit qu\'elle a buté');
});

test('LES PICS TUENT, AU VOL COMME À L\'ARRIVÉE', () => {
    // On tombe DEDANS, on ne se pose pas dessus : un pic solide serait une
    // plateforme qui tue au toucher, c'est-à-dire une règle à deux temps.
    const dessous = essai([
        '##########',
        '#........#',
        '#..B.....#',
        '#..=.....#',
        '#..^.....#',
        '#..=.....#',
        '##########'
    ]);
    let e = etatInitial(dessous);
    const r1 = coup(e, dessous, 0);       // elle casse le bloc de la ligne 3
    assert.ok(r1.faits.includes('casse'));
    const r2 = coup(r1.etat, dessous, 0); // elle tombe dans le pic
    assert.equal(r2.etat.mort, true, 'le pic ne l\'a pas tuée');
    assert.ok(r2.faits.includes('pic'));

    // ET LATÉRALEMENT AUSSI : un pic qu'on traverse en se décalant tue.
    const decote = essai([
        '##########',
        '#........#',
        '#..B^....#',
        '#..==....#',
        '##########'
    ]);
    const r3 = coup(etatInitial(decote), decote, 1);
    assert.equal(r3.etat.mort, true, 'elle traverse le pic sans rien sentir');
});

test('LA SORTIE SE FRANCHIT AU VOL, et un bonus ne se reprend pas', () => {
    const n = essai([
        '##########',
        '#........#',
        '#..*.....#',
        '#..B.....#',
        '#..=.....#',
        '#..E.....#',
        '#..=.....#',
        '##########'
    ]);
    let e = etatInitial(n);
    // Elle monte de deux cases : elle traverse l'étoile en montant.
    const r1 = coup(e, n, 0);
    assert.ok(r1.faits.includes('bonus'), 'l\'étoile n\'a pas été prise au vol');
    assert.equal(r1.etat.bonus, 1);
    // ON NE LA REPREND PAS : sans cela, un élève ferait du surplace pour
    // compter des points, et le jeu cesserait d'être un jeu.
    const r2 = coup(r1.etat, n, 0);
    assert.equal(r2.etat.bonus, 1, 'elle a repris la même étoile');
    // Puis elle tombe dans la porte sans avoir besoin de s'y poser.
    assert.equal(r2.etat.fini, true, `elle n'atteint pas la sortie (ligne ${r2.etat.r})`);
    assert.ok(r2.faits.includes('sortie'));
});

test('CHAQUE TABLEAU EST BIEN FORMÉ, et repose sur des pics', () => {
    NIVEAUX.forEach((def, i) => {
        const n = lireNiveau(def);
        assert.ok(def.nom, `tableau ${i + 1} sans nom`);
        assert.ok(n.depart, `tableau ${i + 1} sans départ (${TUILE.DEPART})`);
        assert.ok(n.sortie, `tableau ${i + 1} sans sortie (${TUILE.SORTIE})`);
        assert.ok(n.bonus >= 1, `tableau ${i + 1} sans bonus`);
        // TOUTES LES LIGNES DE MÊME LONGUEUR : une ligne plus courte d'un
        // caractère décale le mur de droite et ouvre le tableau sur le vide.
        const l = def.lignes[0].length;
        def.lignes.forEach((ligne, r) => assert.equal(ligne.length, l,
            `tableau ${i + 1}, ligne ${r} : ${ligne.length} cases au lieu de ${l}`));

        // LE GARDE-FOU CONTRE LE CUL-DE-SAC. Sous la masse, il faut des pics :
        // une balle qui creuserait jusqu'à un sol incassable rebondirait sur
        // place pour l'éternité, sans mourir et sans pouvoir remonter — et un
        // cul-de-sac est pire qu'une mort.
        for (let c = 0; c < n.largeur; c++) {
            // La colonne porte-t-elle des blocs ? Alors son fond doit tuer.
            const aDesBlocs = n.cases.some(ligne => ligne[c] === TUILE.BLOC);
            if (!aDesBlocs) continue;
            const basBloc = n.cases.reduce((m, ligne, r) =>
                (ligne[c] === TUILE.BLOC ? r : m), -1);
            const dessous = n.cases[basBloc + 1][c];
            // OU LA SORTIE, et c'est la seule autre issue acceptable : creuser
            // cette colonne-là fait GAGNER, ce qui n'est pas un cul-de-sac.
            assert.ok(dessous === TUILE.PIC || dessous === TUILE.SORTIE,
                `tableau ${i + 1}, colonne ${c} : sous le dernier bloc (ligne `
                + `${basBloc}) il y a « ${dessous} », ni pic ni sortie — `
                + 'une balle qui creuse cette colonne s\'y trouverait enfermée');
        }
    });
});

test('ET LES QUATRE TABLEAUX SE FINISSENT VRAIMENT', () => {
    // LA SEULE ÉPREUVE QUI DIT QUE LE JEU EST JOUABLE. Elle rejoue `coup`, le
    // vrai code, en explorant les trois décisions du joueur à chaque rebond —
    // voir `tools/bumpyJouable.mjs`. Bumpy étant discret, la recherche est
    // EXACTE : ce qu'elle ne trouve pas n'existe pas.
    NIVEAUX.forEach((def, i) => {
        const r = chercher(def);
        assert.equal(r.trouve, true,
            `tableau ${i + 1} — ${def.nom} : la sortie n'est jamais atteinte`
            + ` (${r.explores} coups essayés, ${r.morts} morts)`);
    });
});

test('et la balle se pose au départ, sans rien casser ni rien devoir', () => {
    // UN COUP GRATUIT AU DÉMARRAGE passerait inaperçu et fausserait tous les
    // chemins trouvés par le chercheur : il compterait un rebond de moins que
    // l'élève.
    NIVEAUX.forEach((def, i) => {
        const n = lireNiveau(def);
        const avant = n.cases.flat().filter(t => t === TUILE.BLOC).length;
        const e = etatInitial(n);
        assert.equal(n.cases.flat().filter(t => t === TUILE.BLOC).length, avant,
            `tableau ${i + 1} : un bloc a disparu avant le premier rebond`);
        assert.equal(e.mort, false, `tableau ${i + 1} : elle meurt en se posant`);
        assert.ok(e.r > def.lignes.findIndex(l => l.includes(TUILE.DEPART)) - 1,
            `tableau ${i + 1} : elle n'est pas tombée sur la masse`);
    });
});
