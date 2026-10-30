// CETTE TABLETTE A ÉTÉ PRÉPARÉE — L'EST-ELLE ENCORE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Si je mets à jour atout math et que je réinstalle ça se met bien à
// jour ». Oui pour la mise à jour. Non, avant ce fichier, pour la préparation.
//
// ── CE QUE `sw.js` RÉPARE, ET CE QU'IL NE PEUT PAS GARANTIR ────────────────
//
// `reprendreLAncien` relit les adresses de l'ancien cache et garnit le nouveau
// avec : une tablette préparée reste préparée, sans un geste. Mais ce
// remplissage demande SIX CENTS fichiers au réseau, et rien ne promet qu'il
// aille au bout — le wifi de l'école qui lâche, la tablette qu'on éteint, le
// système qui tue le worker. Il n'y a alors plus de liste à relire : la
// préparation est perdue pour de bon.
//
// ET C'EST LE DÉFAUT QUI COÛTE LE PLUS CHER, parce qu'il est SILENCIEUX.
// Mesuré (`node tools/sondeMiseAJour.mjs`) : réseau coupé après une mise à
// jour, le jeu tournait encore — depuis le cache du NAVIGATEUR, que personne
// ne contrôle et que le système vide en premier. Dix secondes plus tôt, la
// même sonde voyait « L'application n'a pas démarré ». Une tablette qui marche
// par chance a exactement l'air d'une tablette prête, et l'on ne l'apprend
// qu'en classe.
//
// ── POURQUOI UNE MARQUE, ET PAS UN SIMPLE COMPTAGE ─────────────────────────
//
// Un comptage seul ferait crier le bandeau chez RÉMY, dont les élèves sont en
// salle informatique, câblés, et n'ont jamais eu à préparer quoi que ce soit.
// On n'avertit donc que les tablettes qui ont DIT un jour « je dois marcher
// sans internet » : la préparation réussie laisse une marque, et elle seule
// autorise le bandeau.
//
// ── ET POURQUOI « LA MOITIÉ », QUI A L'AIR ARBITRAIRE ──────────────────────
//
// Parce que le compte exact bouge pour de bonnes raisons. Un dépôt qui retire
// un exercice du catalogue laisse 90 modules là où la marque en dit 91 : un
// seuil strict enverrait la maîtresse refaire vingt-cinq préparations pour
// rien, et un bandeau qui crie pour rien est un bandeau qu'on apprend à
// ignorer. Après une mise à jour qui a échoué, il en reste DEUX sur 91 — on
// est très loin de la moitié, et la mesure ne laisse aucun doute.

/** Là où la préparation laisse sa trace. Lisible par le professeur, inoffensif. */
export const CLE_MARQUE = 'atoutmath-preparee';

/** Les fichiers de `js/games/` sont-ils encore là ? C'est la seule famille qui
 *  disparaît à une mise à jour sans que l'application cesse de démarrer. */
const EST_UN_JEU = /\/js\/games\//;

/** @returns {{jeux:number}|null} la marque laissée par une préparation réussie */
export function lireLaMarque(magasin) {
    const m = magasin || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!m) return null;
    try {
        const brut = m.getItem(CLE_MARQUE);
        if (!brut) return null;
        const o = JSON.parse(brut);
        return o && typeof o.jeux === 'number' ? o : null;
    } catch (e) { return null; }
}

/** Posée par la préparation quand elle a réussi, et par elle seule. */
export function marquerLaPreparation(jeux, magasin) {
    const m = magasin || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!m || !jeux) return false;
    try {
        m.setItem(CLE_MARQUE, JSON.stringify({ jeux, quand: new Date().toISOString() }));
        return true;
    } catch (e) { return false; }
}

/** Combien de modules de jeu le service worker garde-t-il en ce moment ? */
export async function compterLesJeuxGardes() {
    if (typeof caches === 'undefined') return 0;
    try {
        let n = 0;
        for (const nom of await caches.keys()) {
            const cles = await (await caches.open(nom)).keys();
            n += cles.filter(r => EST_UN_JEU.test(r.url)).length;
        }
        return n;
    } catch (e) { return 0; }
}

/**
 * FAUT-IL AVERTIR ? Une fonction pure, parce que c'est la décision — et une
 * décision qu'on ne peut pas éprouver sans navigateur ne s'éprouve pas.
 *
 * @param {{marque:{jeux:number}|null, jeux:number, enLigne:boolean}} etat
 * @returns {{mot:string, geste:string}|null} null quand il n'y a rien à dire
 */
export function direSiCestPerdu({ marque, jeux = 0, enLigne = true } = {}) {
    // JAMAIS PRÉPARÉE : rien à dire. C'est le cas de tous les élèves de Rémy.
    if (!marque || !marque.jeux) return null;
    // ON NE CRIE PAS POUR UN EXERCICE RETIRÉ DU CATALOGUE : voir l'en-tête.
    if (jeux * 2 >= marque.jeux) return null;
    // ET PAS HORS LIGNE. Refaire la préparation demande le réseau : un bandeau
    // qui offre un bouton incapable de marcher inquiète sans rien résoudre, et
    // il tomberait au milieu d'une leçon — le seul moment où il ne faut pas.
    if (!enLigne) return null;
    // DEUX LIGNES, PAS QUATRE. Le premier jet expliquait aussi que la mise à
    // jour n'avait pas pu tout reprendre : vrai, et inutile — mesuré, le
    // bandeau faisait alors 167 px de haut et poussait « Ouvrir le parcours »
    // sous la vitre d'un téléphone de 390 px. Ce qu'il faut dire tient en un
    // fait et une conséquence ; le POURQUOI n'aide personne à agir.
    return {
        mot: `Il ne reste que ${jeux} exercices sur ${marque.jeux} en mémoire : `
            + 'sans internet, ils ne s\'ouvriront pas.',
        geste: 'Refaire la préparation'
    };
}

/**
 * POSE LE BANDEAU, s'il y a lieu. Rien si la tablette n'a jamais été préparée.
 *
 * « tu utilises des alert et prompt, on évite ! » — c'est un bandeau dans la
 * page, qu'on peut refermer, et non une fenêtre qui bloque.
 *
 * IL VA LÀ OÙ ON LE VERRA, ET TROIS MESURES ONT ÉTÉ NÉCESSAIRES POUR LE DIRE.
 *
 *   1. en tête du `body`, dans le flux : INVISIBLE. La porte d'entrée est
 *      `position: fixed; inset: 0; z-index: 9000` et le recouvrait en entier.
 *      Or une tablette d'élève montre la porte au démarrage — c'est
 *      précisément là qu'il faut qu'on le voie.
 *   2. fixé en bas de l'écran, par-dessus : 390 × 179 sur une tablette, et la
 *      sonde a nommé ce qu'il rendait inatteignable — « Ouvrir le parcours »,
 *      « Je suis le professeur », les trois onglets du bas.
 *   3. fixé en haut : rien de perdu à la porte, mais la barre du logiciel
 *      mangée — « ☰ », « Préparer », « La classe ».
 *
 * DONC : dans le FLUX, et dans la boîte de la porte quand la porte est là.
 * `.portail-boite` est l'enfant centré de la porte : y poser le bandeau en
 * premier le met au-dessus du titre, dans la colonne, sans rien recouvrir.
 * Sans porte — l'élève qui a déjà sa séance, ou le professeur — il va en tête
 * du corps et pousse la page vers le bas.
 */
export async function verifierLaPreparation(racine) {
    const ou = racine || (typeof document !== 'undefined' ? document.body : null);
    if (!ou) return null;
    const marque = lireLaMarque();
    if (!marque) return null;               // le cas de presque tout le monde
    const jeux = await compterLesJeuxGardes();
    const dit = direSiCestPerdu({
        marque, jeux,
        enLigne: typeof navigator === 'undefined' || navigator.onLine !== false
    });
    if (!dit) return null;

    const b = document.createElement('div');
    b.className = 'prepa-perdue';
    b.setAttribute('role', 'status');
    b.innerHTML = `<p class="prepa-perdue-mot"></p>
        <div class="prepa-perdue-gestes">
            <button type="button" class="btn-toggle active prepa-perdue-oui"></button>
            <button type="button" class="btn-toggle prepa-perdue-non">Plus tard</button>
        </div>`;
    b.querySelector('.prepa-perdue-mot').textContent = dit.mot;
    const oui = b.querySelector('.prepa-perdue-oui');
    oui.textContent = dit.geste;
    oui.onclick = () => {
        window.location.search = '?preparer';
    };
    b.querySelector('.prepa-perdue-non').onclick = () => b.remove();
    // `offsetParent` PLUTÔT QU'UN TEST DE CLASSE : la porte existe dans le
    // document même quand elle est effacée, et un bandeau posé dans une porte
    // fermée serait un bandeau que personne ne lit.
    const boite = document.querySelector('#portail .portail-boite');
    const hote = boite && boite.offsetParent !== null ? boite : ou;
    hote.insertBefore(b, hote.firstChild);
    return b;
}
