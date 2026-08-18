// ÉCRIRE LA NOTATION SOI-MÊME — la dernière marche de « segment, droite ou
// demi-droite ».
//
// POURQUOI PAS UN CLAVIER.
//
// Taper « [AB] » au clavier permet de produire la bonne notation sans jamais
// DÉCIDER : on recopie une forme vue en haut de l'écran, et le geste ne teste
// plus rien. Toute la difficulté du chapitre tient dans un choix — mur, ou
// passage ? — et un exercice qui laisse écrire une chaîne quelconque laisse
// aussi écrire « (AB] », qui n'existe pas, sans qu'on sache pourquoi c'est
// faux.
//
// Le composeur pose donc la question deux fois, une par extrémité :
//
//        ⟦ ? ⟧  A  B  ⟦ ? ⟧
//
// Deux décisions explicites, et surtout DEUX RÉPONSES SÉPARÉES : on peut dire
// « ton crochet de gauche est juste, c'est celui de droite qui ne va pas », ce
// qu'un QCM à quatre écritures ne peut jamais dire — il dit « non ».
//
// Ce module ne connaît pas le DOM : les symboles, la composition, la
// vérification et le diagnostic. L'activité qui l'affiche est ailleurs.

/** Les quatre symboles qu'on peut poser, et ce qu'ils veulent dire. */
export const SYMBOLES = [
    { s: '[', cote: 'gauche', sens: 'ferme', dit: 'le trait s\'arrête ici' },
    { s: '(', cote: 'gauche', sens: 'ouvre', dit: 'le trait continue au-delà' },
    { s: ']', cote: 'droite', sens: 'ferme', dit: 'le trait s\'arrête ici' },
    { s: ')', cote: 'droite', sens: 'ouvre', dit: 'le trait continue au-delà' }
];

export const GAUCHES = SYMBOLES.filter(x => x.cote === 'gauche').map(x => x.s);
export const DROITES = SYMBOLES.filter(x => x.cote === 'droite').map(x => x.s);

/** L'écriture obtenue en posant les deux symboles autour des deux points. */
export function composer(gauche, a, b, droite) {
    return `${gauche || '?'}${a}${b}${droite || '?'}`;
}

/**
 * Découpe une écriture en ses quatre morceaux.
 * Rend `null` pour tout ce qui n'a pas la forme attendue — on ne devine pas.
 */
export function decouper(ecriture) {
    const m = /^([[(])\s*([A-Z])\s*([A-Z])\s*([\])])$/.exec(String(ecriture || '').trim());
    return m ? { gauche: m[1], a: m[2], b: m[3], droite: m[4] } : null;
}

/**
 * CE QUI VA, CE QUI NE VA PAS, ET POURQUOI — extrémité par extrémité.
 *
 * Le diagnostic n'est pas un message d'erreur : c'est ce que le professeur
 * dirait en regardant la copie. Il nomme l'extrémité fautive, puis la règle
 * qui la gouverne — et il ne dit RIEN de celle qui est juste, pour ne pas
 * noyer la seule chose à corriger.
 */
export function diagnostic(saisie, attendu) {
    const s = decouper(saisie);
    const bon = decouper(attendu);
    if (!bon) return { juste: false, message: '' };
    if (!s) {
        return {
            juste: false, gaucheJuste: false, droiteJuste: false,
            message: 'Il manque un symbole : il en faut un de chaque côté.'
        };
    }

    // LES LETTRES COMPTENT AUTANT QUE LES SYMBOLES. [BA) n'est pas [AB) : le
    // premier point nommé est l'ORIGINE, et c'est LE piège du chapitre. Le
    // composeur les donne dans l'ordre, donc le cas ne se produit pas à
    // l'écran — mais une fonction qui répondrait « juste » à [BA) serait
    // fausse, et quelqu'un s'en servirait un jour ailleurs.
    if (s.a !== bon.a || s.b !== bon.b) {
        return {
            juste: false, gaucheJuste: false, droiteJuste: false,
            message: `Les points ne sont pas dans le bon ordre : le PREMIER nommé est l'origine, `
                + `donc ${attendu} et ${composer(bon.gauche, s.a, s.b, bon.droite)} ne désignent pas la même chose.`
        };
    }

    const gaucheJuste = s.gauche === bon.gauche;
    const droiteJuste = s.droite === bon.droite;
    if (gaucheJuste && droiteJuste) return { juste: true, gaucheJuste: true, droiteJuste: true, message: '' };

    // Le cas qui mérite d'être nommé : une extrémité juste, l'autre non. C'est
    // là que l'élève a compris la moitié de la règle, et l'exercice doit le
    // lui dire au lieu de tout invalider.
    const bout = (cote) => cote === 'gauche' ? `du côté de ${bon.a}` : `du côté de ${bon.b}`;
    const regle = (symbole, cote) => symbole === '[' || symbole === ']'
        ? `un crochet ${bout(cote)} : le trait s'y arrête`
        : `une parenthèse ${bout(cote)} : le trait continue au-delà`;

    let message;
    if (gaucheJuste !== droiteJuste) {
        const cote = gaucheJuste ? 'droite' : 'gauche';
        const attenduLa = cote === 'gauche' ? bon.gauche : bon.droite;
        message = `${gaucheJuste ? 'Le début est juste' : 'La fin est juste'}, `
            + `mais il faut ${regle(attenduLa, cote)}.`;
    } else {
        message = `Les deux extrémités sont à revoir : il faut ${regle(bon.gauche, 'gauche')}, `
            + `et ${regle(bon.droite, 'droite')}.`;
    }
    return { juste: false, gaucheJuste, droiteJuste, message };
}

/** Vrai si l'écriture composée est celle attendue. */
export function verifier(saisie, attendu) {
    return diagnostic(saisie, attendu).juste === true;
}

/**
 * Les écritures que le composeur permet de former — les quatre combinaisons.
 * Sert aux tests et à la démonstration du robot : on montre qu'« (AB] » est
 * formable, et qu'elle n'existe pourtant pas.
 */
export function toutesLesEcritures(a, b) {
    return GAUCHES.flatMap(g => DROITES.map(d => composer(g, a, b, d)));
}
