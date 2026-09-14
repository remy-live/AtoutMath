// L'ATELIER — l'écran de mise au point, en quatre volets.
//
// Rémy : « On pourrait un super debug avec séparation de l'écran : une où on a
// l'aperçu avec option, une où on a le jeu, une où on a les options, une où le
// robot agit, et la possibilité de prendre en photo ce qui peut t'intéresser,
// et une zone pour écrire, et aussi voir où c'est rangé — si c'est un jeu ou
// non, ce que l'on compte en exercice ou en circuit total — et rangé dans
// l'ordre inverse de leur création. On peut évidemment désactiver le robot. »
//
// CE QUE L'ATELIER CHANGE, ET POURQUOI IL FALLAIT L'ÉCRIRE. Régler un exercice
// se faisait jusqu'ici en boucle : ouvrir le jeu, le fermer, rouvrir les
// réglages, relancer, fermer, ouvrir l'aperçu papier, le comparer de mémoire à
// l'écran qu'on vient de quitter. Trois allers-retours par idée, et la moitié
// des comparaisons se faisaient de tête. Ici les trois vues sont côte à côte et
// le réglage les redessine TOUTES : on voit du même coup d'œil ce qu'un
// paramètre fait à l'écran, sur la feuille, et à la démonstration du robot.
//
// CHAQUE VOLET EST UN CADRE, ET C'EST LA DÉCISION D'ARCHITECTURE.
//
// Le jeu vit dans une couche plein écran (`#game-layer`) et l'aperçu dans une
// modale : les poser dans un quart d'écran demanderait de les rendre
// redimensionnables, et l'on regarderait alors une mise en page qui n'existe
// nulle part ailleurs — donc pas celle qu'on veut vérifier. Un `<iframe>`, lui,
// EST un écran : le jeu s'y déploie exactement comme sur un appareil de cette
// taille. C'est gratuit, c'est isolé, et cela rend au passage la vraie mesure
// — « est-ce que ça déborde sur un écran de cette largeur ? ».
//
// L'atelier n'est PAS un outil d'élève : il s'ouvre depuis la palette d'auteur,
// et rien de ce qui s'y passe n'entre au journal (les cadres jouent en mode
// démonstration ou en configuration interne, sans profil).

import { exercices } from '../data/catalog.js';
import { paramSchemaOf } from '../data/catalog.js';
import { fieldHtml, readParams, wireTips } from '../games/configUI.js';
import {
    estJeuCatalogue, jeuRevu, aChangeJeu, statutRevu, aChange, calcRevu, aChangeCalc,
    lireRevue, nouvelleRevue, ficheDe, decider, consigneJeux, consigneStatuts, consigneCalc
} from '../core/revue.js';
import { STATUS, STATUS_LABELS } from '../data/status.js';
import { isGame } from '../core/gameAccess.js';
import { aUneFichePapier, getActivity, getGenerator } from '../core/registry.js';
import { journalConsole } from './consoleLog.js';
import { FORMATS, sonder, rapportEnTexte } from './controle.js';
import { piloter, piloteEnTexte } from './pilote.js';

const CLE_NOTES = 'mathbox-atelier-notes';
const CLE_EXO = 'mathbox-atelier-exo';
const CLE_ROBOT = 'mathbox-atelier-robot';
const CLE_VOLETS = 'mathbox-atelier-volets';

let panneau = null;
let exoCourant = null;
let paramsCourants = {};
let bilans = [];
let bilanPilote = null;
let controleArrete = false;
let controleEnCours = false;

/**
 * LES EXERCICES DU PLUS NEUF AU PLUS ANCIEN.
 *
 * Rémy : « rangé dans l'ordre inverse de leur création ». C'est le seul ordre
 * utile ici : on met au point ce qu'on vient d'écrire, pas le catalogue entier.
 * L'ordre du catalogue, lui, suit les domaines — parfait pour choisir un
 * exercice à donner, inutile pour retrouver celui d'hier.
 */
function catalogueRecent() {
    return exercices.slice().sort((a, b) => String(b.cree || '').localeCompare(String(a.cree || '')));
}

/**
 * LE CARNET DE REVUE — celui de l'écran « Revue du catalogue », pas un autre.
 *
 * Rémy, devant le bloc « Où c'est rangé » : « il faudrait pouvoir éditer, car
 * par exemple l'organigramme n'est pas un jeu ».
 *
 * IL A RAISON, ET LE CATALOGUE NE PEUT PAS AVOIR RAISON TOUT SEUL. « Est-ce un
 * jeu ? » se devine ici d'une règle de code — il porte un moteur d'activité et
 * aucun générateur —, et cette règle range l'organigramme des quadrilatères
 * parmi les jeux : il a bien un moteur à lui, et son contenu ne vient d'aucun
 * générateur. Mais ce n'est pas un jeu, c'est une leçon de géométrie qui se
 * construit. Aucune règle mécanique ne trouvera cela ; il faut le dire.
 *
 * ET ON LE DIT DANS LE CARNET QUI EXISTE DÉJÀ. La revue du catalogue tient
 * exactement ces décisions-là — « c'est un jeu », « c'est en test », « la
 * calculatrice est offerte » —, sait dire quand elles diffèrent du code, et en
 * sort une CONSIGNE d'une ligne à recoller dans la conversation pour que je les
 * reporte dans les descripteurs. Écrire un second carnet ici aurait donné deux
 * vérités qui se contredisent au premier oubli. L'Atelier ouvre donc le même,
 * sous la même clef, et ce qu'on décide devant l'exercice se retrouve dans le
 * tableau de la revue — et l'inverse.
 *
 * (Le catalogue reste du CODE : une case cochée dans un navigateur ne réécrit
 * pas `js/data/geometrie.js`. C'est la consigne qui fait le voyage, et c'est
 * elle que le relevé 📋 emporte.)
 */
const CLE_REVUE = 'mathbox-revue';
let revue = null;

function chargerRevue() {
    if (revue) return revue;
    let garde = null;
    try { garde = lireRevue(window.localStorage.getItem(CLE_REVUE)); } catch (e) { garde = null; }
    revue = garde || nouvelleRevue({ date: Date.now() });
    // LA VERSION VOYAGE AVEC LA CONSIGNE — « JEU v565 | pas = … ». Sans elle,
    // une consigne collée trois jours plus tard ne dit pas sur quel état du
    // catalogue la décision a été prise, et c'est justement ce qu'il faut
    // savoir pour la reporter sans se tromper d'exercice.
    revue.version = versionChargee();
    return revue;
}

/** La version affichée par la page — la même lecture que l'écran de revue. */
function versionChargee() {
    const el = document.getElementById('db-version');
    if (el && el.textContent) return el.textContent.trim();
    const lien = document.querySelector('link[href*="?v="]');
    const m = lien && lien.getAttribute('href').match(/\?v=([\w.-]+)/);
    return m ? `v${m[1]}` : '';
}

function garderRevue() {
    try { window.localStorage.setItem(CLE_REVUE, JSON.stringify(revue)); } catch (e) { /* privé */ }
}

/** La fiche de revue de l'exercice regardé, ou null tant que rien n'est décidé. */
const ficheCourante = () => ficheDe(chargerRevue(), exoCourant.id);

/** Décide, garde, et redessine — le bloc et les volets, car le statut se voit. */
function decidere(changements) {
    revue = decider(chargerRevue(), exoCourant.id, changements);
    garderRevue();
    peindreRangement();
}

/**
 * LES TROIS LIGNES QU'ON PEUT DÉCIDER. Chacune porte le même mécanisme : ce que
 * dit le CODE, ce qu'on a décidé s'il y a une décision, et le rappel qu'elles
 * diffèrent. « — » remet la ligne au silence : c'est le code qui reparle.
 */
const DECISIONS = {
    jeu: {
        options: [['', 'ce que dit le code'], ['oui', 'un JEU'], ['non', 'un EXERCICE']],
        lire: (exo, f) => (f && f.jeu === null) || !f ? '' : (f.jeu ? 'oui' : 'non'),
        ecrire: (v) => ({ jeu: v === '' ? null : v === 'oui' })
    },
    statut: {
        options: [['', 'ce que dit le code'], ['test', 'En test'], ['valide', 'Validé']],
        lire: (exo, f) => (f && f.enTest === null) || !f ? '' : (f.enTest ? 'test' : 'valide'),
        ecrire: (v) => ({ enTest: v === '' ? null : v === 'test' })
    },
    calc: {
        options: [['', 'ce que dit le code'], ['oui', 'offerte'], ['non', 'refusée']],
        lire: (exo, f) => (f && f.calc === null) || !f ? '' : (f.calc ? 'oui' : 'non'),
        ecrire: (v) => ({ calc: v === '' ? null : v === 'oui' })
    }
};

/**
 * OÙ CET EXERCICE EST RANGÉ — les deux sens du mot « jeu », et ils diffèrent.
 *
 * · `estJeuCatalogue` : il porte un moteur d'activité et AUCUN générateur, donc
 *   son contenu vient de lui-même. C'est la définition qu'emploie le
 *   constructeur de parcours, et celle qui partage le catalogue en jeux et en
 *   exercices.
 * · `isGame` : son activité se déclare AUTONOME, donc il compte dans la
 *   progression des jeux à débloquer. Un exercice peut être l'un sans l'autre,
 *   et c'est exactement ce qu'on veut voir d'un coup d'œil.
 *
 * TROIS DE CES LIGNES SE DÉCIDENT (`decision`), et le compte qui suit la
 * première la suit : décider que l'organigramme n'est pas un jeu doit le
 * retirer des jeux comptés, sinon on lit une décision et un total qui se
 * contredisent dans le même bloc.
 */
function rangement(exo) {
    const act = exo.activityId ? getActivity(exo.activityId) : null;
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const carnet = chargerRevue();
    const f = ficheDe(carnet, exo.id);
    const jeu = jeuRevu(exo, f);
    // Le compte tient compte de TOUTES les décisions du carnet, pas seulement
    // de celle-ci : c'est le catalogue tel qu'il sera une fois la consigne
    // reportée.
    const tousJeux = exercices.filter(e => jeuRevu(e, ficheDe(carnet, e.id))).length;
    const rang = catalogueRecent().findIndex(e => e.id === exo.id);
    const chemin = (exo.tags && exo.tags.chemin) || [];
    const statut = statutRevu(exo, f);
    return [
        ['Rangé comme', jeu ? 'un JEU' : 'un EXERCICE',
            { decision: 'jeu', change: aChangeJeu(exo, f), code: estJeuCatalogue(exo) ? 'un JEU' : 'un EXERCICE' }],
        ['Compté dans', jeu
            ? `les ${tousJeux} jeux du catalogue`
            : `les ${exercices.length - tousJeux} exercices du catalogue`],
        ['Jeu à débloquer', isGame(exo) ? 'oui — il compte dans la progression' : 'non'],
        ['Créé le', exo.cree || '—'],
        ['Ordre inverse', `${rang === 0 ? '1ᵉʳ' : `${rang + 1}ᵉ`} sur ${exercices.length} — du plus neuf au plus ancien`],
        ['Statut', STATUS_LABELS[statut] || statut,
            { decision: 'statut', change: aChange(exo, f),
                code: STATUS_LABELS[exo.status || STATUS.VALIDE] || exo.status }],
        ['Calculatrice', calcRevu(exo, f) ? 'offerte' : 'refusée',
            { decision: 'calc', change: aChangeCalc(exo, f), code: exo.calculatrice ? 'offerte' : 'refusée' }],
        ['Domaine', chemin.join(' › ') || '—'],
        ['Niveaux', ((exo.tags && exo.tags.niveaux) || []).join(', ') || '—'],
        ['Activité', exo.activityId || '—'],
        ['Générateur', exo.generatorId || '—'],
        ['Fiche papier', aUneFichePapier(exo)
            ? (exo.printable ? `oui — rendu « ${exo.printable} »` : 'oui — questions écrites') : 'non'],
        ['Robot', act && act.supports && act.supports.demo === false ? 'non' : 'oui'],
        ['Compétences', (exo.skills || (gen && gen.skills) || []).join(', ') || '—']
    ];
}

/** La consigne à recoller — vide tant que rien ne diffère du code. */
function consigneDuCarnet() {
    return [consigneStatuts(revue, exercices), consigneJeux(revue, exercices),
        consigneCalc(revue, exercices)].filter(Boolean).join('\n');
}

/** L'adresse d'un volet : la même page, avec ce qu'elle doit ouvrir. */
function adresse(quoi) {
    const p = new URLSearchParams();
    p.set('atelier', quoi);
    p.set('exo', exoCourant.id);
    // Les réglages voyagent en clair : ce sont des valeurs simples, et l'URL
    // lisible se copie dans un onglet à part quand on veut voir un volet en
    // grand sur un vrai écran.
    p.set('p', encodeURIComponent(JSON.stringify(paramsCourants)));
    return `${location.pathname}?${p.toString()}`;
}

const robotActif = () => {
    try { return localStorage.getItem(CLE_ROBOT) !== '0'; } catch (e) { return true; }
};

function reglerRobot(actif) {
    try { localStorage.setItem(CLE_ROBOT, actif ? '1' : '0'); } catch (e) { /* privé */ }
}

/**
 * QUELS VOLETS SONT À L'ÉCRAN — Rémy : « mets juste une fenêtre avec le mode
 * robot en route ».
 *
 * Les trois volets d'un coup, c'est la vue de comparaison ; mais on veut aussi
 * pouvoir n'en regarder qu'UN, en grand, et le plus souvent c'est celui du
 * robot qui joue. Plutôt qu'un mode « plein écran » qui s'annule tout seul, on
 * garde le choix : trois interrupteurs dans la barre du haut, et le ⤢ d'un
 * volet n'est que le raccourci « celui-là, tout seul ». Le choix survit à la
 * fermeture, parce qu'on rouvre l'Atelier pour continuer ce qu'on regardait.
 */
const VOLETS = ['jeu', 'fiche', 'robot'];
let volets = { jeu: true, fiche: true, robot: true };

function lireVolets() {
    try {
        const brut = JSON.parse(localStorage.getItem(CLE_VOLETS) || 'null');
        if (brut && VOLETS.some(v => brut[v])) {
            VOLETS.forEach(v => { volets[v] = !!brut[v]; });
        }
    } catch (e) { /* privé */ }
}

function ecrireVolets() {
    try { localStorage.setItem(CLE_VOLETS, JSON.stringify(volets)); } catch (e) { /* privé */ }
}

/** Le cadre d'un volet, pour ceux qui en ont un. */
const cadreDuVolet = (quoi) => panneau.querySelector(
    quoi === 'jeu' ? '#atl-jeu' : quoi === 'robot' ? '#atl-robot' : '#atl-fiche');

const echapper = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function assurerPanneau() {
    if (panneau) return panneau;
    panneau = document.createElement('div');
    panneau.id = 'atelier';
    panneau.className = 'atl';
    panneau.innerHTML = `
        <style>
            /* AU-DESSUS DE LA PALETTE D'AUTEUR (z-index 100000). Elle est
               fixée en bas à gauche, c'est-à-dire exactement sur le volet du
               robot : posée par-dessus l'Atelier, elle en cachait un quart. On
               ferme l'Atelier pour la retrouver — il a son propre bouton. */
            .atl {
                position: fixed; inset: 0; z-index: 100001; display: none;
                flex-direction: column; background: var(--bg-app); color: var(--text-main);
            }
            .atl--ouvert { display: flex; }
            .atl-tete {
                display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                padding: 8px 12px; border-bottom: 1px solid var(--border);
                background: var(--bg-panel); flex: 0 0 auto;
            }
            .atl-titre { font-weight: 800; font-size: .98rem; }
            .atl-select {
                flex: 1 1 240px; min-width: 180px; max-width: 520px;
                border: 1px solid var(--border); border-radius: 9px; padding: 6px 9px;
                background: var(--bg-app); color: var(--text-main); font: inherit;
                font-size: .84rem; font-weight: 600;
            }
            .atl-btn {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                border-radius: 9px; padding: 6px 11px; font: inherit; font-weight: 700;
                font-size: .8rem; cursor: pointer; min-height: 34px;
            }
            .atl-btn--fort { background: var(--primary); border-color: var(--primary); color: #fff; }
            .atl-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
            .atl-volets { display: flex; gap: 4px; align-items: center; }
            .atl-chip {
                border: 1px solid var(--border); background: var(--bg-app); color: var(--text-muted);
                border-radius: 999px; padding: 5px 11px; font: inherit; font-weight: 700;
                font-size: .76rem; cursor: pointer; min-height: 30px;
            }
            .atl-chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }
            .atl-pas {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                border-radius: 9px; padding: 6px 10px; font: inherit; font-size: .8rem;
                cursor: pointer; min-height: 34px; flex: 0 0 auto;
            }
            .atl-pas:hover { background: var(--bg-hover); }
            .atl-pas:disabled { opacity: .35; cursor: default; }

            /* TROIS VOLETS ET UN RAIL, ET CHACUN S'ÉTEINT.
               Le jeu et le robot empilés à gauche — on compare la
               démonstration à ce qu'on vient de jouer sans bouger les yeux —,
               la feuille sur toute la hauteur au milieu, parce qu'une fiche est
               haute, et les réglages à droite.
               UNE DISPOSITION SOUPLE, PLUS UNE GRILLE NOMMÉE : on choisit les
               volets qu'on veut voir, et ceux qui restent se partagent la place
               tout seuls. Avec une grille à zones il aurait fallu écrire les
               sept combinaisons à la main. */
            .atl-corps {
                flex: 1 1 auto; min-height: 0; display: flex; gap: 8px; padding: 8px;
            }
            .atl-gauche {
                flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px;
            }
            /* LES VOLETS SE PARTAGENT LEUR COLONNE, ET IL FALLAIT LE DIRE.
               Sans cette ligne, un volet prend la hauteur de son CONTENU — et
               le contenu est un cadre vide, qui ne fait rien : mesuré, le jeu
               et le robot tombaient à 181 pixels de haut pendant que la feuille
               en occupait 883. */
            .atl-gauche > .atl-volet { flex: 1 1 0; min-height: 0; }
            .atl-volet--fiche { flex: 1 1 0; min-width: 0; }
            .atl-rail {
                flex: 0 0 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
            }
            .atl-volet[hidden], .atl-gauche[hidden] { display: none; }

            .atl-volet {
                display: flex; flex-direction: column; min-height: 0; min-width: 0;
                border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
                background: var(--bg-panel);
            }
            .atl-volet-tete {
                display: flex; align-items: center; gap: 6px; padding: 4px 8px;
                border-bottom: 1px solid var(--border); font-size: .74rem; font-weight: 800;
                text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted);
                flex: 0 0 auto;
            }
            .atl-volet-tete .atl-mini {
                border: none; background: transparent; color: var(--text-muted);
                cursor: pointer; font-size: .9rem; line-height: 1; padding: 3px 5px;
                border-radius: 6px;
            }
            .atl-volet-tete .atl-mini:hover { background: var(--bg-hover); color: var(--text-main); }
            .atl-volet-tete .atl-espace { margin-left: auto; }
            .atl-cadre { flex: 1 1 auto; width: 100%; border: 0; background: #fff; min-height: 0; }
            .atl-eteint {
                flex: 1 1 auto; display: flex; align-items: center; justify-content: center;
                text-align: center; padding: 16px; font-size: .8rem; color: var(--text-muted);
            }
            /* L'ATTRIBUT « hidden » NE SUFFIT PAS quand on a écrit
               display: flex — l'un dit « ne montre pas », l'autre dit « montre
               en flex », et c'est le second qui gagne. Le message d'extinction
               s'affichait donc sous le robot allumé. */
            .atl-eteint[hidden] { display: none; }

            .atl-bloc {
                border: 1px solid var(--border); border-radius: 12px; background: var(--bg-panel);
                padding: 9px 11px; flex: 0 0 auto;
            }
            .atl-bloc-titre {
                font-size: .72rem; font-weight: 800; text-transform: uppercase;
                letter-spacing: .04em; color: var(--text-muted); margin-bottom: 7px;
            }
            .atl-rangement { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: .76rem; }
            .atl-rangement dt { color: var(--text-muted); font-weight: 600; }
            .atl-rangement dd { margin: 0; font-weight: 700; }
            /* LES LIGNES QU'ON DÉCIDE. Le menu porte la valeur ; il n'a donc
               ni bordure ni fond tant qu'on ne le touche pas, pour que le bloc
               se lise comme une liste et non comme un formulaire. */
            .atl-decide { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
            .atl-rang-select {
                border: 1px solid transparent; border-radius: 7px; padding: 1px 4px;
                background: transparent; color: var(--text-main);
                font: inherit; font-size: .76rem; font-weight: 700; cursor: pointer;
            }
            .atl-rang-select:hover, .atl-rang-select:focus {
                border-color: var(--border); background: var(--bg-app);
            }
            .atl-diff {
                font-size: .66rem; font-weight: 800; letter-spacing: .02em;
                color: #b45309; background: rgba(245, 158, 11, .16);
                border-radius: 999px; padding: 1px 7px;
            }
            /* « display: grid » bat « [hidden] », qui ne pose que
               « display: none » en feuille par défaut : sans cette ligne, le
               bloc de consigne restait à l'écran, vide, avec son bouton —
               mesuré à l'ouverture, avant même la première décision. */
            .atl-consigne { margin-top: 8px; display: grid; gap: 6px; }
            .atl-consigne[hidden] { display: none; }
            .atl-consigne-dit { font-size: .72rem; color: var(--text-muted); }
            .atl-consigne code {
                display: block; font-size: .72rem; line-height: 1.4; white-space: pre-wrap;
                word-break: break-word; background: var(--bg-app);
                border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px;
            }
            .atl-notes {
                width: 100%; min-height: 130px; resize: vertical; border: 1px solid var(--border);
                border-radius: 9px; padding: 7px 9px; font: inherit; font-size: .8rem;
                background: var(--bg-app); color: var(--text-main); line-height: 1.4;
            }
            .atl-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 7px; }
            .atl-controle { font-size: .74rem; line-height: 1.4; }
            .atl-controle-ligne { margin-bottom: 5px; }
            .atl-controle-nom { font-weight: 800; }
            .atl-controle-ok { color: var(--success); }
            .atl-controle-ko { color: var(--danger); font-weight: 600; }
            .atl-controle-attente { color: var(--text-muted); }
            .atl-controle-detail { color: var(--text-muted); padding-left: 10px; display: block; }

            /* LE CONTRÔLE SE REGARDE. Un cadre posé hors de l'écran est bridé
               par le navigateur — les jeux qui dessinent à chaque image n'y
               avancent pas, et l'on conclurait « plateau vide » sur un exercice
               qui marche. On le montre donc, à sa vraie taille, réduit par une
               mise à l'échelle qui ne change rien à la mise en page dedans. */
            .atl-controle-voile {
                position: fixed; inset: 0; z-index: 100002; display: flex;
                flex-direction: column; align-items: center; justify-content: center; gap: 10px;
                background: color-mix(in srgb, var(--bg-app) 92%, transparent);
                padding: 14px; box-sizing: border-box;
            }
            .atl-controle-voile[hidden] { display: none; }
            .atl-controle-tete { font-size: .86rem; font-weight: 700; text-align: center; }
            .atl-controle-scene {
                flex: 1 1 auto; width: 100%; min-height: 0;
                display: flex; align-items: center; justify-content: center;
            }
            /* LE BOUTON D'ARRÊT VIT HORS DU VOILE, parce qu'il sert aussi au
               pilote — qui, lui, joue dans le volet visible et n'ouvre aucun
               voile. Un seul bouton pour arrêter les deux. */
            .atl-arreter {
                position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
                z-index: 100003; box-shadow: 0 6px 20px rgba(0, 0, 0, .25);
            }
            .atl-arreter[hidden] { display: none; }
            .ctl-cadre {
                border: 8px solid var(--text-muted); border-radius: 18px; background: #fff;
                box-shadow: 0 12px 40px rgba(0, 0, 0, .28); transform-origin: center;
            }

            /* SUR UN ÉCRAN ÉTROIT, LES VOLETS S'EMPILENT. Un atelier à trois
               colonnes sur un téléphone ne montre rien du tout ; empilé, il
               reste ce qu'il est — plusieurs vues du même exercice, qu'on fait
               défiler. */
            @media (max-width: 1000px) {
                .atl-corps { flex-direction: column; overflow-y: auto; }
                .atl-gauche { flex: 0 0 auto; }
                /* Empilés, les volets ne se partagent plus une hauteur : ils
                   prennent la leur. Sans annuler le partage écrit plus haut,
                   le jeu et le robot tombaient à deux pixels. */
                .atl-volet, .atl-gauche > .atl-volet { flex: 0 0 auto; min-height: 340px; }
                /* La feuille est haute par nature : lui donner la même case
                   que le jeu, c'est n'en montrer que le titre. */
                .atl-volet--fiche { min-height: 560px; }
                .atl-rail { flex: 0 0 auto; overflow: visible; }
            }
        </style>
        <div class="atl-tete">
            <span class="atl-titre">🛠️ L'Atelier</span>
            <!-- AVANT ET APRÈS, À CÔTÉ DE LA LISTE. Rémy : « pour l'atelier,
                 mets à côté de la liste déroulante un bouton avant et après ».
                 On met au point à la chaîne — on regarde ce qu'on vient
                 d'écrire, puis l'exercice d'avant, puis le suivant —, et
                 rouvrir la liste à chaque fois pour descendre d'un cran est
                 trois gestes pour un. L'ordre est celui de la liste : du plus
                 neuf au plus ancien. -->
            <button class="atl-mini atl-pas" id="atl-avant"
                title="L'exercice précédent dans la liste" aria-label="Précédent">◀</button>
            <select class="atl-select" id="atl-exo" aria-label="Exercice"></select>
            <button class="atl-mini atl-pas" id="atl-apres"
                title="L'exercice suivant dans la liste" aria-label="Suivant">▶</button>
            <span class="atl-volets" role="group" aria-label="Les volets à l'écran">
                <button class="atl-chip" data-volet="jeu" title="Montrer ou cacher le jeu">Le jeu</button>
                <button class="atl-chip" data-volet="fiche" title="Montrer ou cacher la feuille">La feuille</button>
                <button class="atl-chip" data-volet="robot" title="Montrer ou cacher le robot">Le robot</button>
            </span>
            <button class="atl-btn" id="atl-recharger" title="Redessiner les trois volets">⟳ Tout relancer</button>
            <button class="atl-btn" id="atl-fermer" style="margin-left:auto">Fermer</button>
        </div>
        <div class="atl-corps" id="atl-corps">
            <div class="atl-gauche" id="atl-gauche">
                <section class="atl-volet atl-volet--jeu" id="atl-volet-jeu">
                    <header class="atl-volet-tete">Le jeu
                        <span class="atl-espace"></span>
                        <button class="atl-mini" data-relancer="jeu" title="Relancer ce volet">⟳</button>
                        <button class="atl-mini" data-agrandir="jeu" title="Ce volet en grand">⤢</button>
                    </header>
                    <iframe class="atl-cadre" id="atl-jeu" title="Le jeu"></iframe>
                </section>
                <section class="atl-volet atl-volet--robot" id="atl-volet-robot">
                    <header class="atl-volet-tete">Le robot
                        <span class="atl-espace"></span>
                        <button class="atl-mini" id="atl-robot-bascule" title="Allumer ou éteindre le robot">⏻</button>
                        <button class="atl-mini" data-relancer="robot" title="Relancer ce volet">⟳</button>
                        <button class="atl-mini" data-agrandir="robot" title="Ce volet en grand">⤢</button>
                    </header>
                    <iframe class="atl-cadre" id="atl-robot" title="Le robot"></iframe>
                    <div class="atl-eteint" id="atl-robot-eteint" hidden>
                        Le robot est éteint. ⏻ pour le rallumer.
                    </div>
                </section>
            </div>
            <section class="atl-volet atl-volet--fiche" id="atl-volet-fiche">
                <header class="atl-volet-tete">L'aperçu papier
                    <span class="atl-espace"></span>
                    <button class="atl-mini" data-relancer="fiche" title="Relancer ce volet">⟳</button>
                    <button class="atl-mini" data-agrandir="fiche" title="Ce volet en grand">⤢</button>
                </header>
                <iframe class="atl-cadre" id="atl-fiche" title="L'aperçu papier"></iframe>
            </section>
            <div class="atl-rail">
                <div class="atl-bloc">
                    <div class="atl-bloc-titre">Les réglages</div>
                    <div id="atl-reglages"></div>
                </div>
                <div class="atl-bloc">
                    <div class="atl-bloc-titre">Où c'est rangé</div>
                    <dl class="atl-rangement" id="atl-rangement"></dl>
                    <div class="atl-consigne" id="atl-consigne" hidden>
                        <div class="atl-consigne-dit">À recoller dans la conversation —
                            le catalogue est du code, une case cochée ici ne le récrit pas :</div>
                        <code></code>
                        <button class="atl-btn" id="atl-copier-consigne">📋 Copier la consigne</button>
                    </div>
                </div>
                <div class="atl-bloc" id="atl-bloc-controle" hidden>
                    <div class="atl-bloc-titre">Le contrôle</div>
                    <div class="atl-controle" id="atl-controle"></div>
                </div>
                <div class="atl-bloc">
                    <div class="atl-bloc-titre">Le carnet</div>
                    <textarea class="atl-notes" id="atl-notes"
                        placeholder="Ce qu'on voit, ce qu'on veut changer…"></textarea>
                    <div class="atl-actions">
                        <button class="atl-btn" id="atl-photo" title="Enregistrer l'image du volet">📷 Photo</button>
                        <button class="atl-btn atl-btn--fort" id="atl-releve"
                            title="Tout ce qu'il faut pour décrire l'état, dans le presse-papier">📋 Relevé</button>
                        <button class="atl-btn" id="atl-telecharger"
                            title="Le relevé ET les dessins des volets, dans un seul fichier"
                            >⤓ Télécharger (avec les images)</button>
                        <button class="atl-btn" id="atl-controler"
                            title="Lancer l'exercice en téléphone, tablette et ordinateur, et mesurer"
                            >🔎 Contrôler</button>
                        <button class="atl-btn" id="atl-jouer"
                            title="Le pilote joue l'exercice jusqu'au bout et dit ce qui a cassé"
                            >▶ Jouer tout seul</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="atl-controle-voile" id="atl-controle-voile" hidden>
            <div class="atl-controle-tete" id="atl-controle-dit"></div>
            <div class="atl-controle-scene" id="atl-controle-scene"></div>
        </div>
        <button class="atl-btn atl-arreter" id="atl-controle-stop" hidden>■ Arrêter</button>`;
    document.body.appendChild(panneau);

    panneau.querySelector('#atl-fermer').onclick = fermerAtelier;
    panneau.querySelector('#atl-recharger').onclick = () => rafraichir();
    panneau.querySelector('#atl-exo').onchange = (e) => choisir(e.target.value);
    panneau.querySelector('#atl-avant').onclick = () => decaler(-1);
    panneau.querySelector('#atl-apres').onclick = () => decaler(1);
    panneau.querySelectorAll('[data-relancer]').forEach(b => {
        b.onclick = () => recharger(b.dataset.relancer);
    });
    // MONTRER OU CACHER UN VOLET. Le dernier allumé ne s'éteint pas : un
    // atelier vide ne sert à rien, et c'est l'erreur qu'on fait en cliquant
    // trop vite.
    panneau.querySelectorAll('[data-volet]').forEach(b => {
        b.onclick = () => {
            const quoi = b.dataset.volet;
            if (volets[quoi] && VOLETS.filter(v => volets[v]).length === 1) return;
            volets[quoi] = !volets[quoi];
            ecrireVolets();
            majVolets();
        };
    });
    // LE ⤢ EST LE RACCOURCI « CELUI-LÀ, TOUT SEUL » — et c'est une bascule :
    // on agrandit pour regarder un détail, on revient aux trois vues du même
    // bouton, sinon on le cherche.
    panneau.querySelectorAll('[data-agrandir]').forEach(b => {
        b.onclick = () => {
            const quoi = b.dataset.agrandir;
            const seul = VOLETS.every(v => volets[v] === (v === quoi));
            VOLETS.forEach(v => { volets[v] = seul ? true : v === quoi; });
            ecrireVolets();
            majVolets();
        };
    });
    panneau.querySelector('#atl-copier-consigne').onclick = async () => {
        const { showToast } = await import('./modal.js');
        const c = consigneDuCarnet();
        if (!c) return;
        try {
            await navigator.clipboard.writeText(c);
            showToast('Consigne copiée : colle-la dans la conversation, je la reporte dans le code.',
                'success');
        } catch (e) {
            showToast('Le presse-papier a refusé : la consigne est écrite juste au-dessus, '
                + 'elle se sélectionne à la main.', 'warning');
        }
    };
    panneau.querySelector('#atl-robot-bascule').onclick = () => {
        reglerRobot(!robotActif());
        majRobot();
    };
    const notes = panneau.querySelector('#atl-notes');
    notes.oninput = () => {
        try { localStorage.setItem(CLE_NOTES, notes.value); } catch (e) { /* privé */ }
    };
    try { notes.value = localStorage.getItem(CLE_NOTES) || ''; } catch (e) { /* privé */ }
    surveillerTailles();
    panneau.querySelector('#atl-photo').onclick = photo;
    panneau.querySelector('#atl-releve').onclick = releve;
    panneau.querySelector('#atl-telecharger').onclick = telechargerReleve;
    panneau.querySelector('#atl-controler').onclick = controler;
    panneau.querySelector('#atl-jouer').onclick = jouerToutSeul;
    panneau.querySelector('#atl-controle-stop').onclick = () => { controleArrete = true; };
    return panneau;
}

/**
 * LES VOLETS À L'ÉCRAN, ET CE QU'ON RALLUME EN LES ROUVRANT.
 *
 * Un cadre caché garde son `src` : il continuerait à jouer derrière, pour
 * personne. On le vide donc en le cachant, et on le recharge en le montrant —
 * c'est aussi ce qui fait que le robot REPART du début quand on revient à lui,
 * au lieu de reprendre au milieu d'une démonstration qu'on n'a pas vue.
 */
function majVolets() {
    VOLETS.forEach(v => {
        const section = panneau.querySelector(`#atl-volet-${v}`);
        const montre = !!volets[v];
        const changement = section.hidden === montre;
        section.hidden = !montre;
        panneau.querySelector(`[data-volet="${v}"]`).classList.toggle('active', montre);
        if (!montre) { const c = cadreDuVolet(v); if (c) c.removeAttribute('src'); }
        else if (changement) recharger(v);
    });
    // La colonne de gauche disparaît quand ses deux volets sont éteints,
    // sinon elle garderait sa moitié d'écran pour ne rien montrer.
    panneau.querySelector('#atl-gauche').hidden = !volets.jeu && !volets.robot;
}

/**
 * LA FEUILLE SE REDESSINE QUAND SON VOLET CHANGE DE TAILLE — ET ELLE SEULE.
 *
 * Mesuré : la feuille chargée dans un volet de 575 pixels calcule son échelle
 * une fois pour toutes (`k = largeur disponible / largeur de la page`). En
 * éteignant les deux autres volets, son cadre passait à 1156 pixels et l'aperçu
 * restait un timbre-poste au milieu — on agrandissait pour mieux voir, et l'on
 * voyait la même chose en plus petit. Elle n'a rien à perdre à recharger : une
 * feuille n'a pas de partie en cours.
 *
 * LE JEU ET LE ROBOT, EUX, NE SE RECHARGENT PAS, et c'était un vrai défaut.
 * Rémy : « dans l'Atelier, quand on met en plein écran, ça redevient rapidement
 * en fenêtre — certainement dû au rafraîchissement. » Il avait raison :
 * agrandir un volet changeait sa taille, donc rechargeait le cadre, donc
 * relançait la partie. Mesuré : le plateau était vide 400 ms après le clic sur
 * ⤢, et revenait deux secondes plus tard, à la première question.
 *
 * Et la bonne raison de ne PAS recharger est plus forte que la mauvaise :
 * un jeu doit se remettre en page tout seul quand la place change — c'est
 * précisément ce qu'on vient vérifier dans l'Atelier. Le recharger à chaque
 * changement de taille CACHERAIT le défaut qu'on cherche.
 */
const RECHARGEABLES = ['fiche'];

function surveillerTailles() {
    if (typeof ResizeObserver !== 'function') return;
    const vues = new Map();
    let minuteur = null;
    const obs = new ResizeObserver(entrees => {
        const aRefaire = [];
        entrees.forEach(e => {
            const quoi = e.target.id.replace('atl-volet-', '');
            if (!RECHARGEABLES.includes(quoi)) return;
            const r = e.contentRect;
            const vu = vues.get(quoi);
            if (r.width < 20 || r.height < 20) return;
            if (vu && Math.abs(vu.w - r.width) < 40 && Math.abs(vu.h - r.height) < 40) return;
            vues.set(quoi, { w: r.width, h: r.height });
            if (vu) aRefaire.push(quoi);
        });
        if (!aRefaire.length) return;
        clearTimeout(minuteur);
        // Un volet qu'on vient de rallumer s'est déjà rechargé À SA NOUVELLE
        // TAILLE : le relancer une seconde fois ferait repartir la
        // démonstration du robot sous les yeux de celui qui la regarde.
        minuteur = setTimeout(() => aRefaire
            .filter(v => Date.now() - (dernierChargement[v] || 0) > 1200)
            .forEach(recharger), 350);
    });
    RECHARGEABLES.forEach(v => obs.observe(panneau.querySelector(`#atl-volet-${v}`)));
}

/** Le robot allumé montre sa démonstration ; éteint, son volet le dit. */
function majRobot() {
    // Volet fermé : rien à allumer. Le rallumer ici relancerait la
    // démonstration dans un cadre que personne ne regarde.
    if (!volets.robot) return;
    const actif = robotActif();
    const cadre = panneau.querySelector('#atl-robot');
    const eteint = panneau.querySelector('#atl-robot-eteint');
    const bouton = panneau.querySelector('#atl-robot-bascule');
    cadre.hidden = !actif;
    eteint.hidden = actif;
    bouton.classList.toggle('active', actif);
    bouton.title = actif ? 'Éteindre le robot' : 'Allumer le robot';
    if (actif) cadre.src = adresse('demo');
    else cadre.removeAttribute('src');
}

const dernierChargement = {};

function recharger(quoi) {
    if (!volets[quoi]) return;
    dernierChargement[quoi] = Date.now();
    if (quoi === 'robot') { majRobot(); return; }
    cadreDuVolet(quoi).src = adresse(quoi);
}

/** Les réglages de l'exercice, et ils redessinent LES TROIS volets. */
function peindreReglages() {
    const zone = panneau.querySelector('#atl-reglages');
    const schema = paramSchemaOf(exoCourant) || [];
    if (!schema.length) {
        zone.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted)">'
            + 'Cet exercice n\'a pas de réglage.</div>';
        return;
    }
    zone.innerHTML = schema.map(p => fieldHtml(p,
        paramsCourants[p.id] !== undefined ? paramsCourants[p.id] : p.default)).join('');
    wireTips(zone);
    const relire = () => {
        paramsCourants = { ...paramsCourants, ...readParams(zone, schema) };
        rafraichir({ garderSelection: true });
    };
    // ON POSE LES ÉCOUTEURS PAR PROPRIÉTÉ, ET C'EST UN VRAI PIÈGE ÉVITÉ.
    //
    // `addEventListener` en EMPILE un par redessin, et chacun garde le schéma
    // qu'il avait à sa naissance. Mesuré : après avoir changé d'exercice, le
    // premier écouteur relisait encore le schéma du PRÉCÉDENT, n'y trouvait
    // aucun de ses champs, rendait un objet vide — et redessinait les réglages
    // avec les anciennes valeurs, effaçant celle qu'on venait de choisir avant
    // même que l'écouteur suivant ne la lise. Le menu revenait tout seul à sa
    // position de départ, et les volets ne bougeaient pas.
    zone.onchange = relire;
    // Les boutons « Oui / Non » n'émettent rien : leur écouteur global ne fait
    // que basculer la classe. On repasse derrière lui — même remède que dans
    // l'engrenage de la fiche du parcours.
    zone.onclick = (ev) => {
        if (ev.target.closest('.cfg-on')) setTimeout(relire, 0);
    };
}

function peindreRangement() {
    const zone = panneau.querySelector('#atl-rangement');
    const f = ficheCourante();
    zone.innerHTML = rangement(exoCourant).map(([k, v, d]) => {
        if (!d) return `<dt>${echapper(k)}</dt><dd>${echapper(v)}</dd>`;
        const D = DECISIONS[d.decision];
        const choisi = D.lire(exoCourant, f);
        // LE MENU DIT LA VALEUR, PAS « CHANGER ». Une ligne qui affiche son
        // état et se change au même endroit se lit d'un coup d'œil ; un
        // crayon qui ouvre une boîte demande de retenir ce qu'on vient de
        // lire. Et « ce que dit le code » reste une option : c'est ainsi
        // qu'on retire une décision qu'on regrette.
        const opts = D.options.map(([val, mot]) =>
            `<option value="${val}"${val === choisi ? ' selected' : ''}>${
                echapper(val === '' ? `${mot} : ${d.code}` : mot)}</option>`).join('');
        return `<dt>${echapper(k)}</dt><dd class="atl-decide">
            <select class="atl-rang-select" data-decision="${d.decision}"
                title="Décidé ici, gardé dans le carnet de revue, reporté dans le code par la consigne"
                >${opts}</select>${d.change
    ? `<span class="atl-diff" title="Le code dit encore « ${echapper(d.code)} » : la consigne du relevé le dira">≠ code</span>`
    : ''}</dd>`;
    }).join('');
    zone.querySelectorAll('[data-decision]').forEach(sel => {
        sel.onchange = () => decidere(DECISIONS[sel.dataset.decision].ecrire(sel.value));
    });
    // LA CONSIGNE, SOUS LE BLOC ET SEULEMENT QUAND ELLE EXISTE. C'est elle qui
    // fait sortir la décision du navigateur : sans elle, on coche et le
    // catalogue continue de dire le contraire.
    const c = consigneDuCarnet();
    const pied = panneau.querySelector('#atl-consigne');
    pied.hidden = !c;
    pied.querySelector('code').textContent = c;
}

function peindreListe() {
    const sel = panneau.querySelector('#atl-exo');
    const liste = catalogueRecent();
    sel.innerHTML = liste.map(e =>
        `<option value="${echapper(e.id)}"${e.id === exoCourant.id ? ' selected' : ''}>${
            echapper(`${e.cree || '????-??-??'} · ${e.title}`)}</option>`).join('');
    const i = liste.findIndex(e => e.id === exoCourant.id);
    panneau.querySelector('#atl-avant').disabled = i <= 0;
    panneau.querySelector('#atl-apres').disabled = i < 0 || i >= liste.length - 1;
}

/** D'un exercice au voisin, dans l'ordre de la liste. */
function decaler(pas) {
    const liste = catalogueRecent();
    const i = liste.findIndex(e => e.id === exoCourant.id);
    const j = i + pas;
    if (i < 0 || j < 0 || j >= liste.length) return;
    choisir(liste[j].id);
}

function choisir(id) {
    const exo = exercices.find(e => e.id === id);
    if (!exo) return;
    // Le contrôle porte sur UN exercice : le garder à l'écran après en avoir
    // changé ferait lire le verdict du précédent sur le suivant.
    bilans = [];
    bilanPilote = null;
    panneau.querySelector('#atl-bloc-controle').hidden = true;
    exoCourant = exo;
    paramsCourants = { ...(exo.params || {}) };
    try { localStorage.setItem(CLE_EXO, id); } catch (e) { /* privé */ }
    rafraichir();
}

function rafraichir(opts = {}) {
    if (!opts.garderSelection) peindreListe();
    peindreReglages();
    peindreRangement();
    majVolets();
    recharger('jeu');
    recharger('fiche');
    majRobot();
}

/**
 * LA PHOTO — ce qui est vraiment capturable, et rien de plus.
 *
 * Rémy : « la possibilité de prendre en photo ce qui peut t'intéresser ». Les
 * volets sont des cadres d'une autre page : le navigateur ne laisse pas les
 * photographier, et aucune bibliothèque ne rend fidèlement du HTML en image.
 * Ce qu'on SAIT capturer exactement, ce sont les dessins — un `<svg>` ou un
 * `<canvas>` se sérialisent au pixel près —, et c'est justement ce qu'on
 * regarde ici : la feuille, le plateau, la figure. On enregistre donc l'image
 * du dessin du volet mis en grand (ou du premier qui en porte un), et l'on dit
 * franchement quand il n'y en a pas, plutôt que de rendre une photo fausse.
 */
async function photo() {
    const { showToast } = await import('./modal.js');
    // On photographie ce qui est À L'ÉCRAN : la feuille d'abord, parce que
    // c'est elle qu'on regarde le plus, puis le jeu, puis le robot.
    const ordre = ['fiche', 'jeu', 'robot'].filter(v => volets[v]);
    for (const quoi of ordre) {
        const cadre = cadreDuVolet(quoi);
        const doc = cadre && !cadre.hidden && cadre.contentDocument;
        if (!doc) continue;
        const dessin = plusGrandDessin(doc);
        if (!dessin) continue;
        const url = await enImage(dessin);
        if (!url) continue;
        const a = document.createElement('a');
        a.href = url;
        a.download = `atelier-${exoCourant.id}-${quoi}.png`;
        a.click();
        showToast(`Photo du volet « ${quoi} » enregistrée.`, 'success');
        return;
    }
    showToast('Aucun dessin à photographier dans les volets — le relevé 📋 dit tout le reste.',
        'warning');
}

/**
 * LES DESSINS DE TOUS LES VOLETS OUVERTS — un par volet, le plus grand.
 *
 * `photo()` n'en rend qu'un, le premier trouvé, parce qu'un bouton « photo »
 * rend une photo. Le relevé, lui, décrit l'état ENTIER : s'il parle des trois
 * volets, il montre les trois.
 */
async function imagesDesVolets() {
    const out = [];
    for (const quoi of ['fiche', 'jeu', 'robot']) {
        // Un volet fermé n'a rien à dire : on ne le mentionne même pas.
        if (!volets[quoi]) continue;
        const cadre = cadreDuVolet(quoi);
        const doc = cadre && !cadre.hidden && cadre.contentDocument;
        if (!doc) { out.push({ quoi, pourquoi: 'le volet est éteint' }); continue; }
        const dessin = plusGrandDessin(doc);
        // ON DIT POURQUOI IL MANQUE UNE IMAGE. Un volet ouvert dont le relevé
        // ne montre rien, sans un mot, se lit comme une panne ; c'est presque
        // toujours qu'il n'y avait rien de photographiable, ce qui est une
        // information et non un incident.
        if (!dessin) {
            out.push({ quoi, pourquoi: 'rien de dessiné à photographier — un écran '
                + 'fait de texte et de boutons est du HTML, qu\'aucune capture fidèle '
                + 'ne sait rendre ; le rapport ci-dessus en donne le contenu' });
            continue;
        }
        const url = await enImage(dessin);
        if (url) out.push({ quoi, url });
        else out.push({ quoi, pourquoi: 'le plus grand dessin du volet est vide — '
            + 'sur cet écran, ce qui porte l\'information est en HTML, et seul le '
            + 'calque des traits est un vrai dessin' });
    }
    return out;
}

/** Le plus grand `<svg>` ou `<canvas>` d'un document : c'est ce qu'on regarde. */
function plusGrandDessin(doc) {
    const candidats = [...doc.querySelectorAll('svg, canvas')]
        .map(el => ({ el, aire: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
        .filter(x => x.aire > 400)
        .sort((a, b) => b.aire - a.aire);
    return candidats.length ? candidats[0].el : null;
}

/** Au-delà, un dessin n'apprend plus rien de plus et alourdit le relevé. */
const PLUS_LARGE = 1600;

// CE QUI FAIT QU'UN TRAIT SE VOIT. Un SVG sorti de sa page perd sa feuille de
// style : `<line class="qd-lien">` n'a plus de `stroke`, et `stroke` vaut
// « none » par défaut. On recopie donc sur chaque nœud ce que le navigateur
// avait CALCULÉ pour lui. Cette liste-là, et pas « toutes les propriétés » :
// figer les 340 propriétés d'un style calculé multiplie le poids du fichier
// par vingt et fige aussi des choses fausses (des `inline-size` en pixels, des
// `transform` déjà appliquées par l'attribut).
const STYLES_A_FIGER = [
    'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
    'opacity', 'color', 'display', 'visibility', 'font-family', 'font-size',
    'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing',
    'marker-start', 'marker-mid', 'marker-end', 'paint-order'
];

/** Recopie les styles calculés de `vif` (et de sa descendance) sur `copie`. */
function figerLesStyles(vif, copie) {
    const vue = vif.ownerDocument.defaultView;
    if (!vue) return;
    const a = [vif, ...vif.querySelectorAll('*')];
    const b = [copie, ...copie.querySelectorAll('*')];
    for (let i = 0; i < a.length && i < b.length; i++) {
        const calc = vue.getComputedStyle(a[i]);
        let decl = '';
        for (const prop of STYLES_A_FIGER) {
            const v = calc.getPropertyValue(prop);
            if (v && v !== 'none' && v !== 'normal' && v !== 'auto') decl += `${prop}:${v};`;
        }
        // `stroke: none` et `display: none` DISENT quelque chose, eux : un trait
        // éteint doit rester éteint, sinon la copie montre ce que l'écran cache.
        for (const prop of ['display', 'visibility', 'stroke', 'fill']) {
            const v = calc.getPropertyValue(prop);
            if (v === 'none' || v === 'hidden') decl += `${prop}:${v};`;
        }
        if (decl) b[i].setAttribute('style', decl);
    }
}

/** Une image entièrement d'une seule couleur ne montre rien : on ne la garde pas. */
function estVide(c) {
    try {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        for (let i = 4; i < d.length; i += 4) {
            if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) return false;
        }
        return true;
    } catch (e) { return false; }
}

/** Un dessin en PNG : le canvas se lit tel quel, le SVG se rejoue. */
function enImage(el) {
    if (el.tagName.toLowerCase() === 'canvas') {
        try { return Promise.resolve(el.toDataURL('image/png')); } catch (e) { return Promise.resolve(null); }
    }
    const r = el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const copie = el.cloneNode(true);
    copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copie.setAttribute('width', w);
    copie.setAttribute('height', h);
    figerLesStyles(el, copie);
    const texte = new XMLSerializer().serializeToString(copie);
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            // Deux fois la taille : une capture d'écran sert à REGARDER un
            // détail, et un PNG à la taille de l'écran ne montre rien de plus
            // que l'écran.
            //
            // MAIS PAS PLUS DE MILLE SIX CENTS PIXELS DE LARGE. Depuis que le
            // relevé emporte ses images, son poids est celui d'un fichier qu'on
            // s'envoie, et doubler AVEUGLÉMENT n'a plus de plafond. C'est une
            // borne, pas une correction : mesuré sur l'organigramme, les trois
            // dessins des volets font 454, 259 et 511 pixels de large, donc 908,
            // 518 et 1022 une fois doublés — aucun ne l'atteint, et le relevé
            // entier pèse 158 Ko. Elle sert le jour où un dessin sera large.
            const echelle = Math.min(2, Math.max(1, PLUS_LARGE / w));
            c.width = Math.round(w * echelle); c.height = Math.round(h * echelle);
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            // MIEUX VAUT PAS D'IMAGE QU'UNE IMAGE BLANCHE. Un cadre blanc dans
            // le relevé se lit comme « l'écran était vide », ce qui est un
            // contresens : c'est la CAPTURE qui a échoué, pas l'écran. Mesuré
            // avant `figerLesStyles` : le volet « jeu » de l'organigramme
            // rendait très exactement cela, 5,8 Ko de blanc, parce que son
            // calque de flèches tenait tout son trait de la feuille de style.
            // Le figeage des styles règle ce cas-là — il en reste d'autres
            // (un dessin fait d'images externes, un calque vide), et ce
            // garde-fou coûte une lecture de pixels.
            if (estVide(c)) { resolve(null); return; }
            try { resolve(c.toDataURL('image/png')); } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texte);
    });
}


/**
 * LE CONTRÔLE — l'audit, mais ici, et sur CET exercice.
 *
 * Rémy : « peut-être as-tu une meilleure méthode pour déboguer efficacement. »
 *
 * C'est celle-ci, et elle n'a rien de malin : on n'AFFICHE pas, on MESURE. Le
 * contrôle lance l'exercice avec les réglages courants dans un téléphone, une
 * tablette et un ordinateur — trois vraies mises en page, pas trois idées de
 * mise en page —, attend que le plateau se garnisse, chronomètre, cherche ce
 * qui sort de la vitre, ramasse ce que la console a crié. Le même travail que
 * `tools/audit.mjs` fait sur les cent cinquante-deux exercices d'un coup, mais
 * sur celui qu'on a sous les yeux, avec ses réglages, sans ligne de commande.
 *
 * SIX SONDAGES : le jeu dans les trois formats, la feuille dans deux (c'est
 * une page, elle ne dépend guère de l'écran), et le robot une fois — une
 * démonstration casse là où l'exercice tient, parce qu'elle vise des cases que
 * l'élève, lui, atteint autrement.
 *
 * ET ON NE CONTRÔLE PAS CE QUI N'EXISTE PAS. La moitié du catalogue n'a pas de
 * fiche à imprimer, quelques exercices n'ont pas de démonstration : les sonder
 * quand même remontait « l'aperçu de la feuille ne se garnit pas » sur des
 * exercices parfaitement sains — mesuré, trois sur six au premier essai. Un
 * vérificateur qui crie au loup ne se lit plus.
 */
const TOURNEE = [
    { quoi: 'jeu', formats: ['telephone', 'tablette', 'ordinateur'] },
    { quoi: 'fiche', formats: ['telephone', 'ordinateur'], si: (e) => aUneFichePapier(e) },
    {
        quoi: 'demo', formats: ['ordinateur'],
        si: (e) => {
            const act = getActivity(e.activityId);
            return !(act && act.supports && act.supports.demo === false);
        }
    }
];

async function controler() {
    if (controleEnCours) return;
    controleEnCours = true;
    controleArrete = false;
    bilans = [];
    const voile = panneau.querySelector('#atl-controle-voile');
    const scene = panneau.querySelector('#atl-controle-scene');
    const dit = panneau.querySelector('#atl-controle-dit');
    voile.hidden = false;
    panneau.querySelector('#atl-controle-stop').hidden = false;
    panneau.querySelector('#atl-bloc-controle').hidden = false;
    try {
        for (const etape of TOURNEE) {
            if (etape.si && !etape.si(exoCourant)) continue;
            for (const id of etape.formats) {
                if (controleArrete) break;
                const format = FORMATS.find(f => f.id === id);
                dit.textContent = `${exoCourant.title} — ${etape.quoi} en ${format.nom.toLowerCase()}`
                    + ` (${format.l} × ${format.h})`;
                peindreControle(`${format.nom} · ${etape.quoi} — en cours…`);
                bilans.push(await sonder({
                    url: adresse(etape.quoi), format, scene, quoi: etape.quoi
                }));
                peindreControle();
            }
            if (controleArrete) break;
        }
    } finally {
        voile.hidden = true;
        panneau.querySelector('#atl-controle-stop').hidden = true;
        scene.innerHTML = '';
        controleEnCours = false;
    }
    peindreControle(controleArrete ? 'Contrôle interrompu.' : null);
    const soucis = bilans.reduce((n, b) => n + b.soucis.length, 0);
    const { showToast } = await import('./modal.js');
    showToast(soucis
        ? `Contrôle terminé : ${soucis} point${soucis > 1 ? 's' : ''} à regarder.`
        : 'Contrôle terminé : rien à signaler.', soucis ? 'warning' : 'success');
}


/**
 * LE PILOTE — l'exercice joué jusqu'au bout, sous les yeux.
 *
 * Rémy a dit oui. Le contrôle regarde le PREMIER écran ; le pilote les regarde
 * TOUS. C'est là que se trouvent les ennuis : le nombre à trois chiffres qui ne
 * tient plus dans sa case à la septième question, la correction qui déborde, le
 * bilan qui ne vient jamais.
 *
 * IL JOUE DANS LE VOLET VISIBLE, et c'est voulu : on le regarde faire. Le
 * contrôle, lui, ouvre ses propres cadres parce qu'il change de format ; ici il
 * n'y a qu'un format — celui qu'on a sous les yeux — et voir le pilote répondre
 * vaut tous les rapports. Le volet est rechargé d'abord : on part d'une partie
 * neuve, pas de celle qu'on venait de commencer à la main.
 */
async function jouerToutSeul() {
    if (controleEnCours) return;
    controleEnCours = true;
    controleArrete = false;
    bilanPilote = null;
    if (!volets.jeu) { volets.jeu = true; ecrireVolets(); majVolets(); }
    panneau.querySelector('#atl-bloc-controle').hidden = false;
    const cadre = cadreDuVolet('jeu');
    const stop = panneau.querySelector('#atl-controle-stop');
    stop.hidden = false;
    try {
        cadre.src = adresse('jeu');
        await new Promise(ok => { cadre.onload = ok; setTimeout(ok, 8000); });
        // Le temps que le plateau se pose : le pilote qui clique dans le vide
        // se croirait bloqué avant même la première question.
        await new Promise(r => setTimeout(r, 900));
        bilanPilote = await piloter(cadre, {
            max: 15,
            dire: (t) => peindreControle(`Le pilote joue — ${t}`),
            stop: () => controleArrete
        });
    } catch (e) {
        bilanPilote = { questions: 0, justes: 0, fini: false, geste: {},
            soucis: [`LANCEMENT : ${String((e && e.message) || e).slice(0, 150)}`] };
    } finally {
        controleEnCours = false;
        stop.hidden = true;
    }
    peindreControle();
    const { showToast } = await import('./modal.js');
    const n = bilanPilote.soucis.length;
    showToast(n
        ? `Le pilote a joué ${bilanPilote.questions} question(s) : ${n} point(s) à regarder.`
        : `Le pilote a joué ${bilanPilote.questions} question(s), rien à signaler.`,
        n ? 'warning' : 'success');
}

function peindreControle(enAttente) {
    const zone = panneau.querySelector('#atl-controle');
    if (!zone) return;
    const lignes = bilans.map(b => {
        const tete = `<span class="atl-controle-nom">${echapper(b.nom)} · ${echapper(b.quoi)}</span>`
            + (b.ms === null ? '' : ` <span class="atl-controle-attente">${b.ms} ms</span>`);
        if (!b.soucis.length) return `<div class="atl-controle-ligne">${tete} `
            + '<span class="atl-controle-ok">✓</span></div>';
        return `<div class="atl-controle-ligne">${tete} <span class="atl-controle-ko">`
            + `${b.soucis.length}</span>`
            + b.soucis.map(x => `<span class="atl-controle-detail">· ${echapper(x)}</span>`).join('')
            + '</div>';
    });
    if (bilanPilote) {
        const b = bilanPilote;
        lignes.push('<div class="atl-controle-ligne">'
            + `<span class="atl-controle-nom">Le pilote</span> `
            + `<span class="atl-controle-attente">${b.questions} question(s), `
            + `${b.justes} juste(s)${b.fini ? ', bilan atteint'
                : (b.limite ? ', arrêté à la limite' : '')}</span>`
            + (b.soucis.length
                ? ` <span class="atl-controle-ko">${b.soucis.length}</span>`
                    + b.soucis.map(x => `<span class="atl-controle-detail">· ${echapper(x)}</span>`).join('')
                : ' <span class="atl-controle-ok">✓</span>')
            + '</div>');
    }
    if (enAttente) lignes.push(`<div class="atl-controle-attente">${echapper(enAttente)}</div>`);
    zone.innerHTML = lignes.join('') || '<span class="atl-controle-attente">—</span>';
}

/**
 * LE RELEVÉ — l'état complet, en texte, dans le presse-papier.
 *
 * C'est le pendant de la photo, et c'est souvent lui qui sert : une image dit
 * qu'un mot déborde, le relevé dit lequel, de combien, avec quels réglages et
 * quelles erreurs de console. On y met tout ce qu'il faudrait sinon redemander.
 *
 * DEUX BOUTONS, ET IL EN MANQUAIT UN. Rémy : « il n'y a rien pour télécharger
 * le rapport ». Le presse-papier convient quand on colle tout de suite ; il ne
 * convient pas quand on veut garder le relevé, le joindre, ou en comparer deux.
 * Le repli en fichier existait, mais seulement quand la copie ÉCHOUAIT — donc
 * jamais dans un navigateur qui marche.
 */
function texteReleve() {
    const lignes = [];
    lignes.push(`# Atelier — ${exoCourant.title} (${exoCourant.id})`);
    lignes.push('');
    lignes.push('## Réglages');
    lignes.push(JSON.stringify(paramsCourants));
    lignes.push('');
    lignes.push('## Où c\'est rangé');
    rangement(exoCourant).forEach(([k, v, d]) => lignes.push(
        `- ${k} : ${v}${d && d.change ? ` (le code dit encore « ${d.code} »)` : ''}`));
    // LA CONSIGNE VOYAGE AVEC LE RELEVÉ. C'est le seul chemin par lequel une
    // décision prise dans le navigateur atteint les descripteurs.
    const consigne = consigneDuCarnet();
    if (consigne) {
        lignes.push('');
        lignes.push('## Consigne à reporter dans le code');
        lignes.push(consigne);
    }
    ['jeu', 'fiche', 'robot'].forEach(quoi => {
        const cadre = cadreDuVolet(quoi);
        lignes.push('');
        lignes.push(`## Volet « ${quoi} »`);
        if (!volets[quoi]) { lignes.push('(fermé)'); return; }
        if (!cadre || cadre.hidden || !cadre.contentDocument) { lignes.push('(éteint)'); return; }
        const d = cadre.contentDocument;
        lignes.push(`taille du cadre : ${Math.round(cadre.clientWidth)} × ${Math.round(cadre.clientHeight)}`);
        const q = d.querySelector('.game-question, .fp-apercu, #fp-apercu, #fq-apercu')
            || d.querySelector('#game-board');
        if (q) lignes.push(`à l'écran : ${(q.innerText || '').trim().slice(0, 400).replace(/\s+/g, ' ')}`);
        deborde(d).forEach(t => lignes.push(`DÉBORDE : ${t}`));
    });
    if (bilans.length) {
        lignes.push('');
        lignes.push('## Le contrôle');
        lignes.push(rapportEnTexte(bilans));
    }
    if (bilanPilote) {
        lignes.push('');
        lignes.push('## Le pilote');
        lignes.push(piloteEnTexte(bilanPilote));
    }
    const notes = panneau.querySelector('#atl-notes').value.trim();
    if (notes) { lignes.push(''); lignes.push('## Le carnet'); lignes.push(notes); }
    const journal = journalConsole().slice(-25);
    if (journal.length) {
        lignes.push('');
        lignes.push('## Console (25 dernières lignes)');
        journal.forEach(l => lignes.push(typeof l === 'string' ? l : JSON.stringify(l)));
    }
    return lignes.join('\n');
}

async function releve() {
    const texte = texteReleve();
    const { showToast } = await import('./modal.js');
    try {
        await navigator.clipboard.writeText(texte);
        showToast('Relevé copié — il n\'y a plus qu\'à le coller.', 'success');
    } catch (e) {
        enFichier(texte);
        showToast('Le presse-papier a refusé : relevé enregistré en fichier.', 'warning');
    }
}

/**
 * LE RELEVÉ TÉLÉCHARGÉ EMPORTE SES IMAGES — un seul fichier à m'envoyer.
 *
 * Rémy : « c'est possible d'inclure les images dans le carnet et de t'envoyer
 * un seul fichier sans image ? »
 *
 * C'était deux gestes et deux fichiers : ⤓ rendait le texte, 📷 rendait un PNG,
 * et il fallait penser aux deux, se souvenir lequel allait avec lequel, et me
 * les envoyer ensemble. Or le texte et l'image ne se remplacent pas — « le mot
 * déborde de 12 px » et le mot qu'on voit déborder répondent à deux questions
 * différentes —, donc ils doivent voyager ENSEMBLE.
 *
 * UNE PAGE, PAS UN TEXTE. Un `.txt` ne sait pas porter d'image ; un `.html`
 * autonome, si : les dessins y entrent en `data:image/png;base64`, il n'a
 * aucun fichier voisin à trouver, il s'ouvre d'un double-clic et il se lit
 * aussi bien comme du texte — le relevé est en tête, dans un `<pre>`, et les
 * images sont à la fin, pour que lire le fichier commence par le rapport et
 * non par trois cents lignes de base64.
 *
 * ET LES TROIS VOLETS, PAS UN. La photo rend le premier dessin trouvé, parce
 * qu'un bouton « photo » rend une photo. Le relevé décrit l'état entier : il
 * montre la feuille, le plateau et le robot, chacun nommé sous son image.
 */
async function telechargerReleve() {
    const { showToast } = await import('./modal.js');
    const texte = texteReleve();
    const images = await imagesDesVolets();
    const page = releveEnPage(texte, images);
    const nom = enFichier(page, 'html', 'text/html');
    const ko = Math.round(page.length / 1024);
    const n = images.filter(i => i.url).length;
    showToast(n
        ? `Relevé enregistré (${nom}) — ${n} image${n > 1 ? 's' : ''} dedans, ${ko} Ko. `
          + 'Un seul fichier à m\'envoyer.'
        : `Relevé enregistré (${nom}) — aucun dessin photographiable dans les volets ouverts.`,
    'success');
}

/** La page autonome : le relevé lisible, puis les dessins qui l'illustrent. */
function releveEnPage(texte, images) {
    const quand = new Date().toLocaleString('fr-FR');
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atelier — ${echapper(exoCourant.title)}</title>
<style>
 body { margin: 0 auto; padding: 24px; max-width: 1100px; background: #fbfbfd; color: #1a1a2e;
        font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; }
 h1 { font-size: 20px; margin: 0 0 4px; }
 .quand { color: #6b6b80; font-size: 13px; margin-bottom: 18px; }
 pre { white-space: pre-wrap; word-break: break-word; background: #fff; border: 1px solid #dcdce6;
       border-radius: 10px; padding: 16px; font: 13px/1.55 ui-monospace, Menlo, Consolas, monospace; }
 figure { margin: 22px 0 0; }
 figcaption { font-weight: 600; margin-bottom: 6px; }
 img { max-width: 100%; height: auto; background: #fff;
       border: 1px solid #dcdce6; border-radius: 10px; }
 .rien { color: #6b6b80; font-style: italic; margin: 0; }
</style></head><body>
<h1>Atelier — ${echapper(exoCourant.title)}</h1>
<div class="quand">${echapper(exoCourant.id)} — ${echapper(quand)}</div>
<pre>${echapper(texte)}</pre>
${images.map(i => `<figure><figcaption>Volet « ${echapper(i.quoi)} »</figcaption>
${i.url ? `<img alt="Le dessin du volet ${echapper(i.quoi)}" src="${i.url}">`
        : `<p class="rien">Pas d'image : ${echapper(i.pourquoi)}.</p>`}</figure>`).join('\n')}
</body></html>`;
}

// UN FICHIER, PAS UNE ADRESSE. `data:` passe par `encodeURIComponent`, qui
// REFUSE une moitié de caractère : mesuré sur la fiche des fonctions, le relevé
// coupait un emoji en deux au milieu d'un `slice`, et le téléchargement
// s'arrêtait sur « URI malformed ». Un blob prend le texte tel qu'il est, et
// n'a pas de limite de longueur.
function enFichier(texte, ext = 'txt', mime = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texte], { type: `${mime};charset=utf-8` }));
    // Daté : on en garde plusieurs d'affilée, avant et après un réglage.
    a.download = `atelier-${exoCourant.id}-${new Date().toISOString().slice(0, 16)
        .replace(/[:T]/g, '-')}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    return a.download;
}

/**
 * CE QUI DÉBORDE, MESURÉ DANS LE CADRE.
 *
 * Un texte rogné par sa case ne se voit pas toujours à l'œil — il se voit
 * toujours à la mesure. On compare le contenu à la boîte, et l'on rend les dix
 * pires : c'est la question qu'on se pose à chaque volet.
 */
function deborde(doc) {
    const out = [];
    // CE QUI N'EST PAS UN DÉBORDEMENT, et qu'il fallait écarter pour que la
    // liste veuille dire quelque chose :
    //  · les champs de formulaire — un `<select>` mesure la largeur de TOUTES
    //    ses options, et se signalait à chaque relevé ;
    //  · ce qui défile exprès — un aperçu de six pages a trois mille pixels de
    //    trop, c'est sa raison d'être ;
    //  · ce qui porte des enfants — on cherche le mot rogné dans sa case, pas
    //    une colonne un peu longue.
    //  · ce qui n'est pas dessiné du tout — l'en-tête du document en premier :
    //    le `<title>` se signalait à chaque relevé, dans chaque volet, alors
    //    qu'il n'a par définition aucune boîte à déborder.
    const FORMULAIRE = ['SELECT', 'INPUT', 'TEXTAREA', 'OPTION'];
    const INVISIBLE = ['HEAD', 'TITLE', 'SCRIPT', 'STYLE', 'META', 'LINK', 'BASE'];
    doc.querySelectorAll('*').forEach(el => {
        if (out.length > 40) return;
        if (FORMULAIRE.includes(el.tagName) || INVISIBLE.includes(el.tagName)) return;
        if (!el.clientWidth && !el.clientHeight) return;
        if (el.children.length > 3) return;
        const s = doc.defaultView.getComputedStyle(el);
        // Un texte volontairement limité à N lignes (la bannière repliée de
        // l'aperçu, qui a son « ▾ » pour se déplier) déborde par construction.
        if (s.webkitLineClamp && s.webkitLineClamp !== 'none') return;
        const dx = s.overflowX === 'visible' || s.overflowX === 'auto' || s.overflowX === 'scroll'
            ? 0 : el.scrollWidth - el.clientWidth;
        const dy = s.overflowY === 'visible' || s.overflowY === 'auto' || s.overflowY === 'scroll'
            ? 0 : el.scrollHeight - el.clientHeight;
        // Quatre pixels, pas deux : à deux, on remontait les arrondis de
        // jambage d'une ligne de titre à chaque relevé.
        if (dx > 4 || dy > 4) {
            const t = (el.textContent || '').trim().slice(0, 40).replace(/\s+/g, ' ');
            out.push(`${el.className || el.tagName} (+${dx}×${dy}px) « ${t} »`);
        }
    });
    return out.slice(0, 10);
}

/**
 * Ouvre l'Atelier — sur l'exercice demandé, ou sur celui qu'on regardait.
 *
 * `id` : la barre de passe s'en sert. Elle dit « il y a quelque chose à voir
 * sur celui-ci » ; sans cet argument, il faudrait le retrouver à la main dans
 * une liste de cent cinquante-deux, et l'on ouvrirait l'Atelier sur un autre
 * exercice que celui qu'on venait de regarder.
 */
export function ouvrirAtelier(id) {
    lireVolets();
    assurerPanneau();
    const demande = id ? exercices.find(e => e.id === id) : null;
    if (demande && (!exoCourant || exoCourant.id !== demande.id)) {
        exoCourant = demande;
        paramsCourants = { ...(demande.params || {}) };
        try { localStorage.setItem(CLE_EXO, demande.id); } catch (e) { /* privé */ }
    }
    if (!exoCourant) {
        let garde = null;
        try { garde = localStorage.getItem(CLE_EXO); } catch (e) { garde = null; }
        exoCourant = exercices.find(e => e.id === garde) || catalogueRecent()[0];
        paramsCourants = { ...(exoCourant.params || {}) };
    }
    panneau.classList.add('atl--ouvert');
    rafraichir();
}

export function fermerAtelier() {
    if (!panneau) return;
    panneau.classList.remove('atl--ouvert');
    // Les cadres continueraient à tourner derrière — un robot qui joue tout
    // seul dans une page fermée, c'est du travail pour rien et des sons qui
    // sortent de nulle part.
    ['#atl-jeu', '#atl-fiche', '#atl-robot'].forEach(s => {
        const c = panneau.querySelector(s);
        if (c) c.removeAttribute('src');
    });
}

export function basculerAtelier() {
    if (panneau && panneau.classList.contains('atl--ouvert')) fermerAtelier();
    else ouvrirAtelier();
}

/**
 * L'AUTRE BOUT : ce que fait la page quand elle EST un volet.
 *
 * Elle n'affiche ni la navigation ni le catalogue — juste ce qu'on lui demande,
 * en grand. Trois volets, trois ouvertures :
 *   · `jeu`   — l'exercice, réglages fournis, sans la fenêtre de configuration ;
 *   · `demo`  — le même, joué par le robot ;
 *   · `fiche` — l'aperçu papier, avec ses options.
 */
export async function ouvrirVoletAtelier(quoi, params) {
    const exo = exercices.find(e => e.id === params.get('exo'));
    if (!exo) return;
    let regles = {};
    try { regles = JSON.parse(decodeURIComponent(params.get('p') || '{}')) || {}; } catch (e) { regles = {}; }
    const complet = { ...exo, params: { ...(exo.params || {}), ...regles } };
    document.documentElement.classList.add('volet-atelier');
    // Le volet dit LEQUEL il est — l'en-tête de la page l'a déjà posé, mais
    // celui-ci s'ouvre aussi sans passer par l'URL (le contrôle en cadre).
    document.documentElement.classList.add(`volet-atelier--${quoi}`);
    // LE VOLET REND SON JOURNAL. La page mère ne peut pas atteindre le module
    // de journalisation d'un cadre — chaque document a ses propres modules, et
    // un `import()` depuis le parent rendrait la copie du PARENT, toujours
    // vide. On pose donc la lecture sur `window` : le contrôle la trouve là,
    // et il n'y a rien d'autre à faire passer.
    window.__journalAtelier = journalConsole;
    // ET SA SESSION. Le pilote a besoin de la question en cours et de sa
    // réponse ; elles vivent dans la session, que rien n'expose — et un
    // `import()` depuis la page mère rendrait SA copie du module, jamais celle
    // du cadre. On greffe donc un relais sur `next()`, ici et nulle part
    // ailleurs : ce code ne s'exécute que dans un volet de l'Atelier, jamais
    // dans l'application que voit un élève.
    // ET SON RUNNER — Rémy : « synchronise la barre de debug et l'Atelier ».
    // Même piège, même remède : la page mère ne peut pas atteindre le module
    // `core/state.js` du cadre (elle aurait le sien, toujours vide), donc le
    // volet pose la lecture sur `window`. Voir ui/cadreAtelier.js, qui la lit.
    const { state: etatDuVolet } = await import('../core/state.js');
    window.__runnerAtelier = () => etatDuVolet.activeSequenceRunner || null;
    const { ItemSession } = await import('../core/itemSession.js');
    if (!ItemSession.prototype.__relaisAtelier) {
        ItemSession.prototype.__relaisAtelier = true;
        const suivant = ItemSession.prototype.next;
        ItemSession.prototype.next = function (...args) {
            window.__sessionAtelier = this;
            return suivant.apply(this, args);
        };
    }
    if (quoi === 'fiche') {
        const { ouvrirFicheModal } = await import('./printSheet.js');
        ouvrirFicheModal(complet, complet.params);
        replierOptionsFiche();
        return;
    }
    const { openGameLayer } = await import('../games/engine.js');
    openGameLayer({ ...complet, internalStudentConfig: true }, quoi === 'demo');
}

// Les deux fenêtres d'impression n'ont ni le même identifiant ni les mêmes
// morceaux : celle des grilles règle le contenu, le nombre et le papier ; celle
// des questions y ajoute le QCM. On replie les mêmes trois questions dans les
// deux — quoi, combien, sur quel papier.
const MODALES_FICHE = [
    { modale: '#print-sheet-modal', morceaux: ['#fp-contenu', '.fp-combien', '#fp-plus'] },
    {
        modale: '#print-questions-modal',
        morceaux: ['#fq-contenu', '.fp-controles--qcm', '.fp-combien', '#fq-plus']
    }
];

/**
 * DANS L'ATELIER, LA FEUILLE PASSE DEVANT SES RÉGLAGES.
 *
 * Rémy : « pour l'aperçu, cache les options (on peut les dérouler) ». La
 * fenêtre d'impression est faite pour un écran entier : ses trois questions —
 * quoi, combien, sur quel papier — occupent le haut, et dans un volet d'atelier
 * elles mangeaient l'aperçu, c'est-à-dire la seule chose qu'on venait voir. On
 * les replie donc TOUTES dans un tiroir fermé, sans rien enlever : un clic sur
 * « Les options de la feuille » les retrouve intactes, écouteurs compris —
 * `appendChild` déplace les éléments, il ne les recrée pas.
 */
function replierOptionsFiche(reste = 60) {
    for (const { modale, morceaux } of MODALES_FICHE) {
        const modal = document.querySelector(modale);
        if (!modal) continue;
        if (modal.querySelector('#atl-options-fiche')) return;
        const els = morceaux.map(sel => modal.querySelector(sel)).filter(Boolean);
        if (!els.length) return;
        const tiroir = document.createElement('details');
        tiroir.id = 'atl-options-fiche';
        tiroir.className = 'fp-repli';
        tiroir.innerHTML = '<summary>Les options de la feuille</summary>';
        els[0].before(tiroir);
        els.forEach(el => tiroir.appendChild(el));
        return;
    }
    // LA FENÊTRE N'EST PAS TOUJOURS LÀ AU RETOUR. Un exercice sans grille
    // imprime par `printQuestions.js`, chargé en import dynamique : au moment
    // où `ouvrirFicheModal` rend la main, cette fenêtre-là n'existe pas encore.
    // On repasse image par image, une seconde au plus.
    if (reste > 0) requestAnimationFrame(() => replierOptionsFiche(reste - 1));
}
