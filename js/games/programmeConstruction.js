// LE PROGRAMME DE CONSTRUCTION — l'écran.
//
// Rémy : « j'aimerais bien un exercice où on a un tracé (points, segments,
// cercle) et il faut faire le programme de construction. »
//
// DEUX FIGURES CÔTE À CÔTE, ET C'EST TOUT LE DISPOSITIF. À gauche, celle qu'on
// doit obtenir ; à droite, celle que le programme de l'élève produit VRAIMENT,
// redessinée à chaque bloc posé. On ne dit pas « juste » ou « faux » à la fin :
// on montre, en continu, l'écart entre ce qu'il a écrit et ce qu'il visait.
// C'est ce qui distingue un programme d'un questionnaire — un programme, ça
// s'exécute, et l'on voit ce qu'il fait.
//
// LES POINTS DE DÉPART SONT DÉJÀ POSÉS DES DEUX CÔTÉS. Sans eux, la figure de
// l'élève serait juste et ne coïnciderait avec aucune autre ; avec eux, la
// comparaison est exacte et l'exercice devient « construis À PARTIR DE CECI »,
// qui est la vraie tâche.
//
// L'ÉLÈVE TAPE, ET IL RÉDIGE. Rémy : « il n'y a pas de rédaction […] je veux
// qu'il tape et qu'il rédige ». La première version faisait choisir des blocs
// dans des menus déroulants : la phrase était donnée, l'élève ne posait que les
// lettres. On écrit maintenant dans une zone de texte, une phrase par ligne, et
// c'est `lireInstruction` qui lit — tolérante sur la langue (place, pose,
// trace, dessine ; avec ou sans accents ni crochets), exigeante sur l'objet.
//
// ET L'ÉNONCÉ NE DIT PLUS LA MÉTHODE. Rémy encore : « tu donnes les réponses
// dans l'énoncé ». C'était vrai — « trace [AB], place son milieu, puis trace le
// cercle… » était le programme écrit au-dessus de la case où on le demandait.
// La consigne est désormais la même partout : « écris le programme qui
// construit cette figure ». Ce qu'il faut savoir se lit sur le dessin.
//
// LES MODÈLES DE PHRASES INSÈRENT, ILS NE REMPLISSENT PAS. Rémy : « au départ,
// on peut faire glisser des vignettes, l'élève écrit les lettres ». Un bouton
// pose donc « Trace le segment [ ] » dans la zone, curseur entre les crochets :
// c'est un tremplin, pas une réponse — et il se retire d'un réglage.

import { BaseGame } from '../core/BaseGame.js';
import {
    MONDE, OPERATIONS, FAMILLES, ORDRE_FAMILLES,
    NIVEAUX, preparerNiveau, niveauxDisponibles, operationsDe,
    executer, comparer, cleObjet, nomObjet, couperAuMonde, couperDemiDroite, lireProgramme,
    ordreDeLaBanque
} from '../core/programmeConstruction.js';
import { branches, descendre, remonter, phraseEnCours, phraseFinie, verbeDe } from '../core/arbrePhrase.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const COMPETENCE = 'geo.construction.programme';

const enAttribut = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- LE CODAGE DE LA FIGURE -------------------------------------------------
//
// Rémy, deux fois dans la même passe : « n'oublie pas de coder s'il y a une
// médiatrice », « là il faut coder ».
//
// UN CODAGE N'EST PAS UNE DÉCORATION, C'EST LA MOITIÉ DE L'ÉNONCÉ. Un trait qui
// traverse un segment ne dit pas qu'il le coupe en son milieu ni qu'il lui est
// perpendiculaire ; deux droites qui se croisent à l'écran ne se croisent pas
// forcément à angle droit ; deux droites qui semblent parallèles peuvent se
// couper trois mètres plus loin. C'est même la première chose qu'on apprend en
// géométrie : ce qui n'est pas codé n'est pas su. Une figure de modèle qui ne
// code pas ses propriétés demande donc de les DEVINER — et l'élève qui les
// devine juste a eu de la chance.
//
// Le codage est calculé par l'opération qui trace (`codage` dans core/
// programmeConstruction.js), pas ici : c'est elle qui sait où est le pied de la
// perpendiculaire et quel segment la médiatrice partage. L'écran ne fait que le
// dessiner.

const f3 = (v) => Number(v).toFixed(3);

/** Le vecteur unitaire de a vers b — ou null si les deux points se confondent. */
function unite(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy);
    return n < 1e-9 ? null : { x: dx / n, y: dy / n };
}

/** Le petit carré de l'angle droit, posé au sommet entre deux directions. */
function angleDroitSvg(sommet, u, v, cote = 3.4) {
    const nu = unite({ x: 0, y: 0 }, u), nv = unite({ x: 0, y: 0 }, v);
    if (!nu || !nv) return '';
    const p1 = { x: sommet.x + nu.x * cote, y: sommet.y + nu.y * cote };
    const p2 = { x: p1.x + nv.x * cote, y: p1.y + nv.y * cote };
    const p3 = { x: sommet.x + nv.x * cote, y: sommet.y + nv.y * cote };
    return `<path class="pc-code" d="M ${f3(p1.x)} ${f3(p1.y)} L ${f3(p2.x)} ${f3(p2.y)}
        L ${f3(p3.x)} ${f3(p3.y)}"/>`;
}

/** Un trait en travers, au milieu de [ab] : la marque des longueurs égales. */
function tiretSvg(a, b, demi = 2) {
    const u = unite(a, b);
    if (!u) return '';
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const n = { x: -u.y, y: u.x };
    return `<path class="pc-code" d="M ${f3(m.x - n.x * demi)} ${f3(m.y - n.y * demi)}
        L ${f3(m.x + n.x * demi)} ${f3(m.y + n.y * demi)}"/>`;
}

/** Le chevron du parallélisme, posé au milieu du tracé visible d'une droite. */
function chevronSvg(a, b) {
    const bouts = couperAuMonde(a, b);
    if (!bouts) return '';
    const u = unite(bouts[0], bouts[1]);
    if (!u) return '';
    const m = { x: (bouts[0].x + bouts[1].x) / 2, y: (bouts[0].y + bouts[1].y) / 2 };
    const n = { x: -u.y, y: u.x };
    const c = 1.9;
    const pointe = { x: m.x + u.x * c, y: m.y + u.y * c };
    const g = { x: m.x - u.x * c + n.x * c, y: m.y - u.y * c + n.y * c };
    const d = { x: m.x - u.x * c - n.x * c, y: m.y - u.y * c - n.y * c };
    return `<path class="pc-code" d="M ${f3(g.x)} ${f3(g.y)} L ${f3(pointe.x)} ${f3(pointe.y)}
        L ${f3(d.x)} ${f3(d.y)}"/>`;
}

/** Ce qu'un objet fait écrire sur la figure, s'il porte un codage. */
function codageSvg(o) {
    const c = o && o.codage;
    if (!c) return '';
    if (c.type === 'angleDroit') return angleDroitSvg(c.sommet, c.u, c.v);
    if (c.type === 'mediatrice') {
        // Les deux moitiés égales ET l'angle droit : la définition complète.
        return tiretSvg(c.a, c.m) + tiretSvg(c.m, c.b)
            + angleDroitSvg(c.m, { x: c.b.x - c.a.x, y: c.b.y - c.a.y },
                { x: -(c.b.y - c.a.y), y: c.b.x - c.a.x });
    }
    if (c.type === 'paralleles') return chevronSvg(o.a, o.b) + chevronSvg(c.autre.a, c.autre.b);
    return '';
}

/** Le dessin d'une figure : les tracés, puis les points par-dessus. */
function figureSvg(objets, points, { classe = '', aides = [] } = {}) {
    const cles = new Set(aides.map(cleObjet));
    let out = '';
    let codes = '';
    (objets || []).forEach(o => {
        const aide = cles.has(cleObjet(o)) ? ' pc-trait--aide' : '';
        if (o.genre === 'cercle') {
            out += `<circle class="pc-trait${aide}" cx="${o.c.x.toFixed(3)}" cy="${o.c.y.toFixed(3)}"
                r="${o.r.toFixed(3)}" fill="none"/>`;
            return;
        }
        const bouts = o.genre === 'droite' ? couperAuMonde(o.a, o.b)
            : (o.genre === 'demidroite' ? couperDemiDroite(o.a, o.b) : [o.a, o.b]);
        if (!bouts) return;
        out += `<line class="pc-trait${aide}" x1="${bouts[0].x.toFixed(3)}" y1="${bouts[0].y.toFixed(3)}"
            x2="${bouts[1].x.toFixed(3)}" y2="${bouts[1].y.toFixed(3)}"/>`;
        // Le codage passe APRÈS tous les traits : un petit carré d'angle droit
        // barré par la droite suivante ne se lit plus.
        if (!aide) codes += codageSvg(o);
    });
    out += codes;
    // UN POINT SE MARQUE D'UNE CROIX, PAS D'UNE PASTILLE.
    //
    // Rémy : « les points sont des croix ». C'est la convention du collège, et
    // elle a une raison : un gros disque cache l'endroit qu'il désigne, alors
    // que le point est exactement le CROISEMENT des deux traits — on peut y
    // poser la pointe du compas. Une pastille dit « quelque part par ici », une
    // croix dit « ici ».
    Object.entries(points || {}).forEach(([nom, p]) => {
        const c = 1.3;
        out += `<path class="pc-croix" d="M ${(p.x - c).toFixed(3)} ${(p.y - c).toFixed(3)}
            L ${(p.x + c).toFixed(3)} ${(p.y + c).toFixed(3)}
            M ${(p.x - c).toFixed(3)} ${(p.y + c).toFixed(3)}
            L ${(p.x + c).toFixed(3)} ${(p.y - c).toFixed(3)}"/>`;
        out += `<text class="pc-nom" x="${(p.x + 2).toFixed(3)}" y="${(p.y - 1.8).toFixed(3)}"
            >${enAttribut(nom)}</text>`;
    });
    return `<svg class="pc-svg ${classe}" viewBox="0 0 ${MONDE.w} ${MONDE.h}"
        preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

// --- CE QUE LE ROBOT DIT, ET CE QU'IL MONTRE --------------------------------
//
// Rémy, capture de l'aperçu à l'appui : « En cliquant sur le texte du robot il
// n'y a que du texte, il faut que le robot montre et explique ».
//
// Il avait raison au pied de la lettre : l'aperçu écrivait le programme modèle
// d'un trait, sans flèche, sans bulle, et sur la figure 1 — « Place un point A »
// — c'était fini en neuf dixièmes de seconde. Mesuré : zéro bulle, zéro
// pointeur, une seule ligne posée. Le professeur qui ouvrait l'aperçu pour voir
// à quoi ressemble l'exercice voyait passer une ligne de texte.
//
// UNE DÉMONSTRATION DE PROGRAMME DE CONSTRUCTION A TROIS TEMPS, et ce sont ceux
// de l'exercice lui-même :
//
//   · le POURQUOI se lit sur la figure à obtenir — c'est là qu'on voit qu'il
//     manque un côté, et c'est la seule chose qui s'apprend ici ;
//   · le GESTE se fait sur la commande — la carte qu'on pose, ou les mots qu'on
//     enchaîne dans l'arbre ;
//   · le RÉSULTAT se lit sur la figure de droite, qui vient de changer.
//
// Le robot fait donc l'aller-retour gauche → commande → droite à chaque phrase.
// Sans le troisième temps on regarde une liste de phrases ; avec lui, on voit
// un programme S'EXÉCUTER, et c'est tout le sujet de l'exercice.
//
// LES PHRASES SONT ÉCRITES POUR ÊTRE ENTENDUES DEUX FOIS. La deuxième fois
// qu'une opération revient — les trois côtés d'un triangle — le robot abrège :
// répéter mot pour mot ce qu'on vient de dire fait décrocher, et la troisième
// occurrence n'apprend rien de plus que la première.
export const DIT = {
    points: {
        avant: (a) => 'Un programme dit d\'abord d\'où il part. '
            + (a.length === 1
                ? `Le point ${a[0]} n'est déduit de rien : je le place.`
                : `Les points ${liste(a)} ne sont déduits de rien : je les place, `
                  + 'et tout le reste s\'appuiera sur eux.'),
        apres: (a) => (a.length === 1 ? 'La croix est là' : 'Les croix sont là')
            + '. Un point se marque d\'une croix, jamais d\'un rond : c\'est le '
            + 'croisement des deux traits qui EST le point.'
    },
    segment: {
        avant: (a, n) => n === 0
            ? `Sur la figure à obtenir, ${a[0]} et ${a[1]} sont reliés par un trait `
              + `qui s'arrête aux deux bouts : c'est le segment [${a[0]}${a[1]}].`
            : `Même chose pour [${a[0]}${a[1]}].`,
        apres: (a, n) => n === 0
            ? `Le voilà. Les crochets de [${a[0]}${a[1]}] disent que le trait `
              + `s'arrête à ${a[0]} et à ${a[1]} — ni avant, ni après.`
            : null
    },
    droite: {
        avant: (a, n) => n === 0
            ? `Ce trait-là ne s'arrête pas : il sort de la figure des deux côtés. `
              + `C'est la droite (${a[0]}${a[1]}), avec des parenthèses.`
            : `Et la droite (${a[0]}${a[1]}).`,
        apres: (a, n) => n === 0
            ? 'Elle traverse tout le cadre. Une droite n\'a pas de bout : on n\'en '
              + 'dessine que le morceau qui tient sur la feuille.'
            : null
    },
    demiDroite: {
        avant: (a) => `Ce trait part de ${a[0]} et ne revient pas : c'est la `
            + `demi-droite [${a[0]}${a[1]}). Le crochet est du côté de l'origine, `
            + 'la parenthèse du côté qui continue.',
        apres: (a) => `${a[0]} est le seul bout. La notation le dit toute seule, `
            + 'sans qu\'on ait besoin de regarder le dessin.'
    },
    cercle: {
        avant: (a, n) => n === 0
            ? `Un cercle se donne par son centre et par ce qu'il touche. Celui-ci `
              + `est centré en ${a[0]} et passe par ${a[1]}.`
            : `Et le cercle de centre ${a[0]} passant par ${a[1]}.`,
        apres: (a, n) => n === 0
            ? 'Je n\'ai pas eu à mesurer le rayon : dire par où il passe suffit à '
              + 'le définir, et c\'est exactement ce que fait le compas.'
            : null
    },
    milieu: {
        avant: (a) => `Ce point-là n'est pas donné : il se construit. C'est le `
            + `milieu de [${a[0]}${a[1]}], et il reçoit une lettre pour que les `
            + 'phrases suivantes puissent le nommer.',
        apres: () => 'Il porte maintenant un nom, et je peux m\'en servir comme '
            + 'de n\'importe quel autre point.'
    },
    mediatrice: {
        avant: (a) => `La médiatrice de [${a[0]}${a[1]}] : la droite qui coupe le `
            + 'segment en son milieu et à angle droit. Une seule phrase la donne '
            + 'en entier.',
        apres: () => 'Le codage rouge est venu tout seul : les deux tirets pour le '
            + 'milieu, le petit carré pour l\'angle droit. Ce qui n\'est pas codé '
            + 'n\'est pas su.'
    },
    perpendiculaire: {
        avant: (a) => `Il faut dire deux choses, pas une : perpendiculaire à quoi — `
            + `(${a[0]}${a[1]}) — et passant par où — ${a[2]}. Sans le point, il y `
            + 'en aurait une infinité.',
        apres: () => 'Le petit carré rouge marque l\'angle droit. Deux droites qui '
            + 'se croisent à l\'écran ne se croisent pas forcément à angle droit : '
            + 'c\'est le codage qui le dit.'
    },
    parallele: {
        avant: (a) => `Même chose ici : parallèle à (${a[0]}${a[1]}), et passant `
            + `par ${a[2]}. Par un point il ne passe qu'une seule parallèle.`,
        apres: () => 'Les chevrons rouges vont par paire : un seul ne dirait rien, '
            + 'c\'est la paire qui affirme que les deux droites sont parallèles.'
    },
    intersection: {
        avant: () => 'Ce point-là est au croisement de deux tracés que j\'ai déjà '
            + 'faits. Je ne le place pas où je veux : je le nomme là où il tombe.',
        apres: () => 'Deux cercles se coupent en deux points, et je les obtiens tous '
            + 'les deux. C\'est ce que dit un énoncé honnête : « l\'un des deux ».'
    }
};

/**
 * Le rang, DANS LE PLAN, de la figure que l'aperçu démontre.
 *
 * Pure, et à part de la classe, pour être vérifiable sans navigateur : c'est
 * elle qui garantit qu'un aperçu ne retombera jamais sur « Place un point A ».
 */
export function figureDeDemonstration(plan) {
    const riche = plan.findIndex(i => (NIVEAUX[i].modele || []).length >= 3);
    return riche >= 0 ? riche : Math.max(0, plan.length - 1);
}

/** « A, B et C » — la liste des lettres comme on l'écrit dans une phrase. */
function liste(a) {
    return a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`;
}

export class ProgrammeConstruction extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'programme-construction');
        const familles = Array.isArray(this.params.familles) && this.params.familles.length
            ? this.params.familles : ORDRE_FAMILLES;
        this.famillesActives = familles;
        // LES NIVEAUX SUIVENT LES RÉGLAGES : décocher les cercles ne doit pas
        // proposer une figure dont la construction en réclame.
        this.plan = niveauxDisponibles(familles);
        if (!this.plan.length) this.plan = niveauxDisponibles(ORDRE_FAMILLES);
        const depuis = Math.max(0, Math.min(NIVEAUX.length - 1, (this.params.depuis | 0)));
        const debut = this.plan.findIndex(i => i >= depuis);
        this.rang = debut < 0 ? 0 : debut;
        // LE COMPTE PART D'OÙ L'ON COMMENCE, pas du début du plan. « Commencer
        // au niveau 4 » avec « 3 figures à composer » doit donner trois figures
        // composées puis la rédaction — pas la rédaction d'emblée sous prétexte
        // qu'on entre au rang 3.
        this.premier = this.rang;
        // LE CHEMIN DANS L'ARBRE : le verbe choisi, l'objet, et les points
        // déjà désignés. Vide entre deux phrases.
        this.chemin = null;
        // ON ASSEMBLE AVANT D'ÉCRIRE — Rémy : « on pourrait commencer par du
        // drag drop pour que l'élève voit bien les formulations ».
        //
        // Rédiger demande deux choses en même temps : trouver la SUITE des
        // tracés, et l'écrire dans la langue du chapitre. Un élève qui bute sur
        // la seconde ne peut pas montrer qu'il sait la première, et la page
        // reste blanche. Les premières figures se composent donc en posant des
        // phrases toutes faites ; on les aura lues dix fois avant d'avoir à les
        // taper. Voir `banqueDePhrases` dans le noyau.
        this.aAssembler = Math.max(0, Math.min(20, Number(this.params.assembler ?? 3)));
        this.texte = '';
        this.fini = false;
    }

    /** Cette figure-ci se compose-t-elle, ou s'écrit-elle ? */
    get enAssemblage() { return (this.rang - this.premier) < this.aAssembler; }

    get niveau() { return preparerNiveau(this.plan[this.rang]); }

    render() {
        this.container.innerHTML = `
            <style>
                .pc-wrap {
                    display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
                    padding: 8px 10px 10px; box-sizing: border-box; color: var(--text-main);
                    overflow-y: auto; min-height: 0; container-type: inline-size;
                }
                .pc-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.4cqw, 14px); line-height: 1.35; max-width: 720px;
                    margin: 0 auto;
                }
                .pc-consigne b { color: var(--text-main); }
                /* LES DEUX FIGURES RESTENT CÔTE À CÔTE, MÊME SUR UN TÉLÉPHONE.
                   Rémy : « sur portable les dessins prennent trop de place, il
                   faudrait pouvoir tout voir. » Mesuré sur un écran de
                   393 × 852 : empilées, les deux cadres prenaient 481 pixels
                   des 766 du plateau — soit les deux tiers — et la barre des
                   phrases commençait à 853, c'est-à-dire SOUS l'écran. On
                   n'écrivait donc pas le programme, on faisait défiler.

                   Et les mettre côte à côte n'est pas un pis-aller : l'exercice
                   consiste à COMPARER ce qu'on voulait et ce qu'on a tracé.
                   Deux dessins l'un sous l'autre se comparent en faisant deux
                   fois l'aller-retour ; côte à côte, d'un coup d'œil. On ne les
                   empile plus qu'en dessous de 330 pixels, où une colonne ne
                   tiendrait plus une figure lisible. */
                .pc-figures { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 0 0 auto; }
                @container (max-width: 330px) { .pc-figures { grid-template-columns: 1fr; } }
                .pc-cadre {
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 12px;
                    background: var(--card-bg, #fff); padding: 6px; position: relative;
                    /* Le cadre devient sa propre référence de largeur : c'est
                       lui qui doit dire au dessin sa hauteur, pas la fenêtre. */
                    container-type: inline-size;
                }
                .pc-cadre--but { border-style: dashed; }
                .pc-cadre--ok { border-color: var(--success); }
                /* L'ÉTIQUETTE TIENT SUR UNE LIGNE, quelle que soit la largeur du
                   cadre. « Ce que ton programme trace » passait à deux lignes
                   dans un cadre de 162 pixels — mesuré : 150 px de texte pour
                   152 de place — et la seconde ligne retombait DANS le dessin.
                   Elle rétrécit plutôt que de se replier : une étiquette est un
                   nom, pas une phrase. */
                .pc-etiq {
                    position: absolute; top: -9px; left: 10px; padding: 0 6px;
                    font-size: min(11px, 6cqw); white-space: nowrap;
                    font-weight: 700; background: var(--card-bg, #fff); color: var(--text-muted);
                }
                /* LA HAUTEUR SUIT LA LARGEUR DU CADRE, et plus la fenêtre.
                   Le monde du dessin fait 100 sur 70 : un cadre de 155 pixels
                   de large n'a besoin que de 108 de haut, et une hauteur de
                   222 posée en « vh » lui donnait deux fois le nécessaire — du
                   blanc au-dessus et au-dessous de la figure, pris sur la place
                   du programme. Le plafond en « vh » reste, pour qu'un grand
                   écran ne fabrique pas un dessin d'un demi-mètre. */
                .pc-svg {
                    width: 100%; display: block;
                    height: min(clamp(90px, 26vh, 250px), 70cqw);
                }
                .pc-trait { stroke: var(--primary); stroke-width: 0.5; fill: none; stroke-linecap: round; }
                .pc-trait--aide { stroke: var(--text-muted); stroke-width: 0.3; opacity: .55; }
                /* LE CODAGE — angle droit, tirets d'égalité, chevrons du
                   parallélisme. En ROUGE et un peu plus fin que le tracé : il
                   se lit d'un coup d'oeil sans qu'on le prenne pour un trait
                   de la figure. C'est la couleur qu'on prend au tableau. */
                .pc-code {
                    stroke: var(--danger); stroke-width: 0.55; fill: none;
                    stroke-linecap: round; stroke-linejoin: round;
                }
                /* UN POINT SE MARQUE D'UNE CROIX — Rémy : « les points sont des
                   croix ». Le point est le CROISEMENT des deux traits ; une
                   pastille cacherait justement l'endroit qu'elle désigne. */
                .pc-croix {
                    stroke: var(--text-main); stroke-width: 0.45; fill: none; stroke-linecap: round;
                }
                .pc-nom { fill: var(--text-main); font-size: 4px; font-weight: 700;
                    font-family: inherit; }
                /* LA ZONE D'ÉCRITURE ET SES REMARQUES SONT CÔTE À CÔTE : la
                   remarque d'une ligne se lit en face de la ligne, pas en bas
                   d'une liste. */
                .pc-redaction { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                /* Un display de grille BAT l'attribut « hidden », et c'est la
                   règle qu'on oublie : les deux modes — écrire et composer — se
                   cachent l'un l'autre par cet attribut, et les deux restaient
                   à l'écran l'un au-dessus de l'autre. */
                .pc-redaction[hidden] { display: none; }
                @container (max-width: 560px) { .pc-redaction { grid-template-columns: 1fr; } }
                /* --- L'ARBRE DES PHRASES -------------------------------------
                   Rémy : « on pourrait cliquer sur trace ou place, un arbre
                   s'ouvre avec les mots possibles et ainsi de suite ». La
                   phrase en cours est en haut, GRANDE : c'est elle qu'on lit,
                   les boutons ne sont que la façon de l'écrire. */
                .pc-arbre {
                    display: flex; flex-direction: column; gap: 8px;
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 10px;
                    background: var(--card-bg, #fff); padding: 10px; min-height: 120px;
                }
                .pc-arbre-phrase {
                    font-size: clamp(14px, 2.9cqw, 19px); font-weight: 700; line-height: 1.4;
                    text-align: center; min-height: 1.4em; color: var(--text-main);
                }
                .pc-arbre-phrase--vide { color: var(--text-muted); font-weight: 500;
                    font-size: clamp(11px, 2.2cqw, 13.5px); }
                .pc-arbre-titre {
                    text-align: center; color: var(--text-muted); font-weight: 600;
                    font-size: clamp(11px, 2.1cqw, 13px);
                }
                .pc-arbre-mots { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
                .pc-mot {
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 10px;
                    cursor: pointer; background: var(--card-bg, #fff); color: var(--text-main);
                    font: inherit; font-weight: 600; padding: 7px 12px;
                    font-size: clamp(12px, 2.3cqw, 15px); line-height: 1.3;
                }
                .pc-mot:hover { border-color: var(--primary); color: var(--primary); }
                /* UNE LETTRE EST UNE CIBLE CARRÉE : « A » dans un bouton taillé
                   pour « le cercle de centre » se cherche du doigt. */
                .pc-mot--lettre { min-width: 44px; text-align: center; font-weight: 800; }
                .pc-mot--fait { border-color: var(--success); color: var(--success); font-weight: 800; }
                .pc-arbre-outils { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
                .pc-retour {
                    border: 0; background: transparent; color: var(--text-muted); cursor: pointer;
                    font: inherit; font-size: clamp(11px, 2.1cqw, 13px); padding: 4px 8px;
                }
                .pc-retour:hover { color: var(--text-main); }
                .pc-lignes { display: flex; flex-direction: column; gap: 0; font-size: clamp(10px, 2cqw, 12.5px); }
                .pc-l { display: flex; gap: 6px; line-height: 1.55;
                    font-size: clamp(12px, 2.3cqw, 15px); min-height: 1.55em; }
                .pc-l small { font-size: .82em; line-height: 1.55; }
                .pc-l--ok { color: var(--success); }
                .pc-l--ko { color: var(--danger); }
                .pc-l--note { color: var(--primary); }
                /* --- LA COMPOSITION PAR PHRASES ------------------------------
                   Deux colonnes comme la rédaction : à gauche ce qu'on a posé,
                   à droite la banque. On garde exactement la même géométrie que
                   le mode écriture, pour que passer de l'un à l'autre ne
                   déplace rien à l'écran. */
                .pc-pose {
                    display: flex; flex-direction: column; gap: 4px; min-height: 120px;
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 10px;
                    background: var(--card-bg, #fff); padding: 8px;
                }
                .pc-pose--vide {
                    align-items: center; justify-content: center; text-align: center;
                    border-style: dashed; color: var(--text-muted);
                    font-size: clamp(11px, 2.2cqw, 13px);
                }
                .pc-posee {
                    display: flex; align-items: center; gap: 8px; text-align: left;
                    border: 0; border-radius: 8px; cursor: pointer; font: inherit;
                    background: color-mix(in srgb, var(--primary) 9%, transparent);
                    color: var(--text-main); padding: 5px 8px;
                    font-size: clamp(12px, 2.3cqw, 15px); line-height: 1.4;
                }
                .pc-posee-n {
                    flex: 0 0 auto; min-width: 1.5em; text-align: right;
                    color: var(--text-muted); font-weight: 700; font-size: .85em;
                }
                .pc-posee-t { flex: 1 1 auto; }
                /* LA CROIX EST TOUJOURS LÀ, pas seulement au survol : au doigt,
                   il n'y a pas de survol, et une commande qu'on ne voit pas
                   n'existe pas. */
                .pc-posee-x { flex: 0 0 auto; color: var(--text-muted); font-weight: 700; }
                .pc-posee:hover .pc-posee-x { color: var(--danger); }
                .pc-banque { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
                .pc-carte {
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 10px;
                    cursor: pointer; background: var(--card-bg, #fff); color: var(--text-main);
                    font: inherit; padding: 6px 10px; font-size: clamp(11px, 2.2cqw, 14px);
                    line-height: 1.35; text-align: left;
                }
                .pc-carte:hover { border-color: var(--primary); color: var(--primary); }
                .pc-carte--posee { opacity: .38; cursor: default; }
                .pc-carte--posee:hover { border-color: var(--border-color, #d7dae3); color: var(--text-main); }
                .pc-modeles { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
                .pc-ajout {
                    border: 1.5px dashed var(--primary); border-radius: 10px; cursor: pointer;
                    background: transparent; color: var(--primary); font: inherit; font-weight: 600;
                    padding: 5px 9px; font-size: clamp(11px, 2.1cqw, 13px);
                }
                .pc-barre { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
                .pc-btn {
                    border: 0; border-radius: 10px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 14px; background: var(--primary); color: #fff;
                }
                .pc-btn--doux { background: transparent; color: var(--text-muted);
                    border: 1.5px solid var(--border-color, #d7dae3); }
                .pc-note { text-align: center; min-height: 1.3em; font-size: clamp(11px, 2.2cqw, 14px); }
                .pc-note--ok { color: var(--success); font-weight: 700; }
                .pc-note--ko { color: var(--danger); font-weight: 600; }
                .pc-note--info { color: var(--primary); font-weight: 600; }
            </style>
            <div class="pc-wrap" lang="fr">
                <div class="pc-consigne" data-consigne></div>
                <div class="pc-figures">
                    <div class="pc-cadre pc-cadre--but"><span class="pc-etiq">La figure à obtenir</span>
                        <div data-but></div></div>
                    <div class="pc-cadre" data-cadre-moi><span class="pc-etiq">Ce que ton programme trace</span>
                        <div data-moi></div></div>
                </div>
                <div class="pc-redaction" data-redaction>
                    <div class="pc-pose" data-ecrit></div>
                    <div class="pc-arbre" data-arbre></div>
                </div>
                <div class="pc-redaction" data-composition hidden>
                    <div class="pc-pose" data-pose></div>
                    <div class="pc-banque" data-banque></div>
                </div>
                <div class="pc-note" data-note></div>
                <div class="pc-barre" data-barre></div>
            </div>`;
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.butEl = this.container.querySelector('[data-but]');
        this.moiEl = this.container.querySelector('[data-moi]');
        this.cadreMoiEl = this.container.querySelector('[data-cadre-moi]');
        this.ecritEl = this.container.querySelector('[data-ecrit]');
        this.arbreEl = this.container.querySelector('[data-arbre]');
        this.redactionEl = this.container.querySelector('[data-redaction]');
        this.compositionEl = this.container.querySelector('[data-composition]');
        this.poseEl = this.container.querySelector('[data-pose]');
        this.banqueEl = this.container.querySelector('[data-banque]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.barreEl = this.container.querySelector('[data-barre]');

        this.dessinerBarre();
        this.dessiner();
    }

    startGameLoop() { /* rien à animer : l'exercice avance à la frappe */ }

    dessiner() {
        const niv = this.niveau;
        const lu = lireProgramme(this.texte, niv.atlas);
        const r = executer(lu.instructions, niv.atlas);
        this.dernier = { lu, r };

        // LE TITRE DU NIVEAU NE S'AFFICHE PLUS, ET C'ÉTAIT LA RÉPONSE.
        //
        // Rémy : « j'ai l'impression que tu donnes la réponse parfois dans le
        // programme à gauche ». C'était au-dessus, pas à gauche, mais il avait
        // vu juste : la consigne annonçait « Figure 10 sur 13 — UN SEGMENT ET
        // SA MÉDIATRICE », c'est-à-dire exactement ce qu'il fallait trouver en
        // regardant la figure. Il ne restait qu'à traduire une phrase française
        // en deux blocs.
        //
        // Le titre reste où il sert : dans le plan d'étapes de la barre
        // d'auteur, qui n'est pas montrée à l'élève.
        this.consigneEl.innerHTML = `<b>Figure ${this.rang + 1} sur ${this.plan.length}.</b> `
            + `${enAttribut(niv.dit)}`;
        // LA CIBLE MONTRE LES POINTS DONNÉS ET LES TRACÉS EXIGÉS, jamais les
        // traits de construction : les afficher donnerait la méthode.
        this.butEl.innerHTML = figureSvg(niv.attendus, niv.donnes);
        this.moiEl.innerHTML = figureSvg(r.objets, r.points, {
            aides: r.objets.filter(o => !niv.attendus.some(a => cleObjet(a) === cleObjet(o)))
        });

        // DEUX FAÇONS DE COMPOSER LE MÊME PROGRAMME, et une seule à l'écran.
        // Le texte reste la vérité dans les deux cas : composer, c'est écrire
        // une ligne de plus. Tout ce qui suit — la lecture, la figure, la
        // vérification — ne sait même pas laquelle des deux a servi.
        const compose = this.enAssemblage;
        this.redactionEl.hidden = compose;
        this.compositionEl.hidden = !compose;
        if (compose) this.dessinerComposition(niv);
        else this.dessinerArbre(niv, lu, r);
    }

    /**
     * Les phrases posées, et celles qu'on peut encore poser.
     *
     * ON NE DIT PAS « À DROITE ». Sous 560 pixels la grille passe à une seule
     * colonne et la banque tombe SOUS la zone d'écriture : sur le téléphone de
     * l'élève, « choisis les phrases à droite » désignait le vide. « Dans la
     * liste » est vrai dans les deux dispositions.
     */
    dessinerComposition(niv) {
        const lignes = this.texte.split('\n').filter(l => l.trim());
        this.poseEl.className = `pc-pose${lignes.length ? '' : ' pc-pose--vide'}`;
        this.poseEl.innerHTML = lignes.length
            ? lignes.map((l, i) => `<button type="button" class="pc-posee" data-retirer="${i}"
                    title="Retirer cette phrase">
                    <span class="pc-posee-n">${i + 1}.</span>
                    <span class="pc-posee-t">${enAttribut(l)}</span>
                    <span class="pc-posee-x" aria-hidden="true">✕</span>
                </button>`).join('')
            : '<span>Ton programme s\'écrit ici. Choisis les phrases dans la '
                + 'liste, dans l\'ordre où il faut les faire.</span>';

        // UNE PHRASE DÉJÀ POSÉE RESTE VISIBLE, ÉTEINTE. La retirer de la banque
        // ferait bouger toutes les autres sous le doigt à chaque clic, et
        // surtout on ne verrait plus ce qu'on a choisi parmi ce qu'on avait.
        this.banqueEl.innerHTML = ordreDeLaBanque(niv).map(({ p }) => {
            const posee = lignes.includes(p);
            return `<button type="button" class="pc-carte${posee ? ' pc-carte--posee' : ''}"
                data-poser="${enAttribut(p)}" ${posee ? 'disabled' : ''}>${enAttribut(p)}</button>`;
        }).join('');

        if (this.isDemo) return;
        this.poseEl.querySelectorAll('[data-retirer]').forEach(b => {
            b.onclick = () => {
                const i = Number(b.dataset.retirer);
                this.texte = lignes.filter((_, k) => k !== i).join('\n');
                this.note('');
                this.dessiner();
            };
        });
        this.banqueEl.querySelectorAll('[data-poser]').forEach(b => {
            b.onclick = () => {
                this.texte = (this.texte ? `${this.texte}\n` : '') + b.dataset.poser;
                this.note('');
                this.dessiner();
            };
        });
    }

    /**
     * L'ARBRE DES PHRASES, ET CE QU'ON A DÉJÀ POSÉ.
     *
     * À gauche les phrases écrites, avec ce que chacune a tracé ; à droite le
     * mot suivant. Une phrase se compose de haut en bas — le verbe, l'objet,
     * les points — et à chaque cran l'écran ne montre QUE ce qui peut suivre.
     * C'est ce que Rémy demandait : « on pourrait cliquer sur trace ou place,
     * un arbre s'ouvre avec les mots possibles et ainsi de suite. »
     */
    dessinerArbre(niv, lu, r) {
        const lignes = this.texte.split('\n').filter(l => l.trim());

        // LES PHRASES POSÉES PORTENT LEUR RÉSULTAT. « → M » en face de « Place
        // le milieu de [AB] » dit que le point s'appelle M, et c'est ce nom-là
        // qu'on retrouvera dans la liste des points de la phrase suivante.
        this.ecritEl.className = `pc-pose${lignes.length ? '' : ' pc-pose--vide'}`;
        this.ecritEl.innerHTML = lignes.length
            ? lignes.map((l, i) => {
                const etat = (r.lignes || [])[i] || {};
                const nes = etat.noms && etat.noms.length
                    ? ` <small>→ ${enAttribut(etat.noms.join(', '))}</small>` : '';
                return `<button type="button" class="pc-posee" data-retirer="${i}"
                        title="Retirer cette phrase">
                        <span class="pc-posee-n">${i + 1}.</span>
                        <span class="pc-posee-t">${enAttribut(l)}${nes}</span>
                        <span class="pc-posee-x" aria-hidden="true">✕</span>
                    </button>`;
            }).join('')
            : '<span>Ton programme s\'écrit ici, phrase après phrase. '
                + 'Choisis les mots dans la liste.</span>';

        const chemin = this.chemin || null;
        const b = branches(chemin, {
            operations: operationsDe(this.famillesActives),
            points: r.points, objets: r.objets, lettres: niv.exiges
        });
        const phrase = phraseEnCours(chemin);
        const finie = phraseFinie(chemin);
        const classeLettre = (b.genre === 'lettres' || b.genre === 'point') ? ' pc-mot--lettre' : '';

        this.arbreEl.innerHTML = `
            <div class="pc-arbre-phrase${phrase ? '' : ' pc-arbre-phrase--vide'}">
                ${phrase ? enAttribut(phrase) : 'La phrase que tu composes s\'écrira ici.'}
            </div>
            <div class="pc-arbre-titre">${enAttribut(b.titre)}</div>
            <div class="pc-arbre-mots">
                ${b.choix.map(c => `<button type="button" class="pc-mot${classeLettre}"
                    data-mot="${enAttribut(c.valeur)}">${enAttribut(c.mot)}</button>`).join('')}
                ${(b.fini && finie) ? `<button type="button" class="pc-mot pc-mot--fait"
                    data-poser-phrase>✓ Ajouter cette phrase</button>` : ''}
            </div>
            <div class="pc-arbre-outils">
                ${chemin && chemin.verbe
        ? '<button type="button" class="pc-retour" data-reculer>← Revenir en arrière</button>' : ''}
            </div>`;

        if (this.isDemo) return;
        this.ecritEl.querySelectorAll('[data-retirer]').forEach(x => {
            x.onclick = () => {
                const i = Number(x.dataset.retirer);
                this.texte = lignes.filter((_, k) => k !== i).join('\n');
                this.chemin = null;
                this.note('');
                this.dessiner();
            };
        });
        this.arbreEl.querySelectorAll('[data-mot]').forEach(x => {
            x.onclick = () => {
                this.chemin = descendre(this.chemin, x.dataset.mot);
                // UNE PHRASE SANS TROU S'AJOUTE TOUTE SEULE. « Trace le segment
                // [AB] » est finie dès la deuxième lettre : demander en plus de
                // confirmer ferait un clic de cérémonie à chaque phrase. Seule
                // « Place des points », qui n'a pas de longueur fixe, garde son
                // bouton de fin.
                const p2 = phraseFinie(this.chemin);
                if (p2 && OPERATIONS[this.chemin.op].id !== 'points') this.poserPhrase(p2);
                else { this.note(''); this.dessiner(); }
            };
        });
        const fin2 = this.arbreEl.querySelector('[data-poser-phrase]');
        if (fin2) fin2.onclick = () => this.poserPhrase(phraseFinie(this.chemin));
        const rec = this.arbreEl.querySelector('[data-reculer]');
        if (rec) rec.onclick = () => { this.chemin = remonter(this.chemin); this.note(''); this.dessiner(); };
    }

    /** La phrase composée rejoint le programme, et l'arbre repart de zéro. */
    poserPhrase(phrase) {
        if (!phrase) return;
        this.texte = (this.texte ? `${this.texte}\n` : '') + phrase;
        this.chemin = null;
        this.note('');
        this.dessiner();
    }

    dessinerBarre() {
        this.barreEl.innerHTML = `
            <button type="button" class="pc-btn" data-verifier>✓ Vérifier ma figure</button>
            <button type="button" class="pc-btn pc-btn--doux" data-vider>↺ Tout effacer</button>`;
        if (this.isDemo) return;
        this.barreEl.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.barreEl.querySelector('[data-vider]').onclick = () => {
            this.texte = '';
            this.chemin = null;
            this.note('');
            this.cadreMoiEl.classList.remove('pc-cadre--ok');
            this.dessiner();
        };
    }

    /**
     * ON EXÉCUTE, PUIS ON COMPARE LES FIGURES.
     *
     * Le refus ne dit jamais « faux » tout court : il nomme ce qui MANQUE au
     * dessin. « Il manque le segment [BC] » se corrige ; « raté » se subit.
     */
    verifier() {
        if (this.fini) return;
        const niv = this.niveau;
        const lu = lireProgramme(this.texte, niv.atlas);
        const mauvaise = lu.lignes.find(l => !l.vide && !l.ok);
        if (mauvaise) { this.note(mauvaise.dit, 'ko'); return; }
        if (!lu.instructions.length) {
            this.note('Ton programme est vide : il ne trace rien.', 'info');
            return;
        }
        const r = executer(lu.instructions, niv.atlas);
        if (r.erreur) { this.note(r.erreur.dit, 'ko'); return; }

        const c = comparer(r.objets, niv.attendus, r.points, niv.exiges);
        if (!c.ok) {
            const quoi = c.sansPoint.length
                ? `${c.sansPoint.length > 1 ? 'les points' : 'le point'} ${c.sansPoint.join(', ')}`
                : c.manquants.map(o => nomObjet(o, niv.points)).join(', ');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Programme de construction — ${niv.titre}`,
                input: this.texte.replace(/\n/g, ' ; ').slice(0, 300),
                expected: niv.attendus.map(o => nomObjet(o, niv.points)).join(', '),
                partiel: true, silencieux: true
            });
            this.note(`Il manque ${quoi} sur ta figure. Compare les deux dessins.`, 'ko');
            return;
        }
        this.cadreMoiEl.classList.add('pc-cadre--ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Programme de construction — ${niv.titre}`,
            expected: niv.titre, given: `${lu.instructions.length} phrases`, points: 8, partiel: true
        });
        const enTrop = c.enTrop.length;
        this.note(enTrop
            ? `C'est la bonne figure — et tes ${enTrop} trait${enTrop > 1 ? 's' : ''} de `
                + 'construction ont le droit de rester.'
            : 'C\'est exactement la figure demandée.', 'ok');
        this.suivant();
    }

    suivant() {
        // LA DERNIÈRE FIGURE APPELAIT UNE MÉTHODE QUI N'EXISTE PAS. Trouvé en
        // jouant le dernier niveau : « this.gagner is not a function » dans la
        // console, et la partie restait ouverte sans que rien ne le dise. La
        // fin de partie a un nom, et c'est celui du socle commun.
        if (this.rang + 1 >= this.plan.length) {
            this.fini = true;
            return this.terminerPartie({
                gagne: true, concept: COMPETENCE,
                quoi: 'Écrire un programme de construction',
                obtenu: `${this.plan.length} figures`, points: 20
            });
        }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.texte = '';
            this.chemin = null;
            this.cadreMoiEl.classList.remove('pc-cadre--ok');
            this.dessiner();
        }, 1600);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pc-note' + (ton ? ` pc-note--${ton}` : '');
    }

    /**
     * LA FIGURE QUE LE ROBOT MONTRE — pas forcément la première.
     *
     * L'aperçu partait du rang de départ de l'exercice, c'est-à-dire de « Un
     * point » : un programme d'UNE phrase, « Place un point A ». Il n'y avait
     * rien à démontrer, et rien ne se passait à l'écran.
     *
     * On cherche donc, dans le plan tel que les réglages l'ont laissé, la
     * première figure dont le programme compte au moins trois phrases : c'est
     * le minimum pour qu'on voie une SUITE de tracés, et donc un programme. Si
     * les réglages n'en laissent aucune — tout décoché sauf les points —, on
     * prend la dernière disponible, qui est la plus riche des restantes.
     */
    rangDeDemonstration() { return figureDeDemonstration(this.plan); }

    /**
     * LE ROBOT MONTRE ET EXPLIQUE — voir le bloc DIT plus haut pour le pourquoi.
     *
     * Trois temps par phrase : la raison sur la figure à obtenir, le geste sur
     * la commande, le résultat sur la figure qui vient de changer. Le geste
     * suit le mode dans lequel l'élève travaillera vraiment — poser des cartes,
     * ou descendre l'arbre des mots —, parce qu'un aperçu qui montre un écran
     * que l'élève ne verra pas ne sert à rien.
     */
    async runDemoSequence() {
        this.rang = this.rangDeDemonstration();
        // `premier` suit le rang : l'aperçu doit montrer le mode que l'élève
        // rencontre EN PREMIER, et c'est `rang - premier` qui en décide.
        this.premier = this.rang;
        this.texte = '';
        this.chemin = null;
        this.dessiner();

        const cursor = createDemoCursor();
        const gate = createDemoGate(this.container);
        this.demoCursor = cursor;
        // LA BULLE NE RECOUVRE JAMAIS LES DEUX FIGURES. Tout ce que le robot dit
        // parle d'elles ; une explication posée dessus cacherait précisément ce
        // qu'elle demande de regarder.
        cursor.protegerZone([this.container.querySelector('.pc-figures')]);

        const niv = this.niveau;
        const butEl = this.container.querySelector('.pc-cadre--but');

        if (!await gate.waitTurn()) return;
        cursor.say('À gauche, la figure à obtenir. Tout ce qu\'il faut savoir est '
            + 'dessiné dessus : les lettres des points, les traits, et le codage '
            + 'en rouge.', butEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;

        if (!await gate.waitTurn()) return;
        cursor.say('À droite, ce que mon programme trace vraiment. Elle est vide : '
            + 'je n\'ai encore rien posé. C\'est elle qui dira si j\'ai juste, pas moi.',
        this.cadreMoiEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;

        const jusque = [];
        const vus = {};
        for (const ins of niv.modeleResolu) {
            if (!this.isRunning || cursor.destroyed) return;
            const avant = executer(jusque, niv.atlas);
            const args = OPERATIONS[ins.op].prend.map((sorte, i) => {
                if (sorte !== 'objet') return ins.args[i];
                const o = avant.objets.find(x => cleObjet(x) === ins.args[i]);
                return o ? nomObjet(o, avant.points) : '…';
            });
            const valeurs = ins.op === 'points' ? ins.args : args;
            const phrase = OPERATIONS[ins.op].libelle(valeurs);
            const dit = DIT[ins.op] || {};
            const n = vus[ins.op] || 0;

            // 1. LE POURQUOI, SUR LA FIGURE À OBTENIR. C'est là qu'on voit qu'il
            // manque un côté ; le raisonnement se lit sur le modèle, jamais sur
            // la liste des phrases disponibles.
            if (!await gate.waitTurn()) return;
            cursor.say(dit.avant ? dit.avant(valeurs, n) : phrase, butEl);
            if (!await cursor.pause(DEMO_SPEED.settle)) return;

            // 2. LE GESTE, SUR LA COMMANDE — celle que l'élève aura sous le doigt.
            if (!await this.gesteDemo(cursor, ins, valeurs, phrase)) return;
            jusque.push(ins);
            vus[ins.op] = n + 1;

            // 3. LE RÉSULTAT, SUR LA FIGURE QUI VIENT DE CHANGER.
            const apres = dit.apres && dit.apres(valeurs, n);
            if (apres) {
                if (!await gate.waitTurn()) return;
                cursor.say(apres, this.cadreMoiEl);
                if (!await cursor.pause(DEMO_SPEED.settle)) return;
            }
        }

        if (!await gate.waitTurn()) return;
        this.note('Le programme est écrit : la figure de droite est celle de gauche.', 'ok');
        this.cadreMoiEl.classList.add('pc-cadre--ok');
        cursor.say('Les deux figures sont les mêmes : le programme est bon. Il en '
            + 'existe d\'autres — c\'est la figure obtenue qui décide, pas la '
            + 'tournure des phrases.', this.cadreMoiEl);
        await cursor.pause(DEMO_SPEED.between);
    }

    /**
     * LE GESTE DE LA PHRASE, DANS LE MODE OÙ L'ÉLÈVE EST.
     *
     * Composer : une carte, un appui. Écrire : le verbe, l'objet, les points,
     * un appui chacun — et la phrase se lit en haut de l'arbre pendant qu'elle
     * se construit, ce qui est exactement ce qu'on veut faire voir.
     *
     * Le DOM est refait à chaque `dessiner()` : on rappelle donc le bouton
     * juste avant de le désigner, jamais une référence gardée d'avant.
     */
    async gesteDemo(cursor, ins, valeurs, phrase) {
        if (!this.enAssemblage) return this.gesteDemoArbre(cursor, ins, valeurs);
        const carte = [...this.banqueEl.querySelectorAll('[data-poser]')]
            .find(b => b.dataset.poser === phrase);
        if (carte && !await cursor.tap(carte)) return false;
        this.texte += `${this.texte ? '\n' : ''}${phrase}`;
        this.dessiner();
        return true;
    }

    /** Le même geste, mot à mot, quand l'élève descend l'arbre des phrases. */
    async gesteDemoArbre(cursor, ins, valeurs) {
        const op = OPERATIONS[ins.op];
        for (const v of [verbeDe(op), op.id, ...valeurs]) {
            const mot = [...this.arbreEl.querySelectorAll('[data-mot]')]
                .find(b => b.dataset.mot === String(v));
            if (!mot) return true;              // l'arbre ne propose pas ce mot : on n'insiste pas
            if (!await cursor.tap(mot)) return false;
            this.chemin = descendre(this.chemin, v);
            // UNE PHRASE SANS TROU S'AJOUTE TOUTE SEULE — c'est la règle de
            // l'écran, et la démonstration doit la montrer telle quelle.
            const finie = phraseFinie(this.chemin);
            if (finie && op.id !== 'points') { this.poserPhrase(finie); return true; }
            this.dessiner();
        }
        const fin = this.arbreEl.querySelector('[data-poser-phrase]');
        if (fin && !await cursor.tap(fin)) return false;
        this.poserPhrase(phraseFinie(this.chemin));
        return true;
    }

    /**
     * LA BARRE D'AUTEUR AVANCE EN DEUX TEMPS : le premier écrit le programme
     * modèle, le second passe à la figure suivante. Le meneur appelle
     * `sauterEtape`, pas `sauterQuestion` — je m'étais trompé de nom, et le
     * bouton ne faisait rien sans rien dire.
     */
    sauterEtape() {
        if (this.fini) return false;
        const niv = this.niveau;
        const attendu = niv.modeleResolu.length;
        const ecrites = this.texte.split('\n').filter(l => l.trim()).length;
        if (ecrites < attendu) {
            const jusque = [];
            this.texte = niv.modeleResolu.map(ins => {
                const avant = executer(jusque, niv.atlas);
                const args = OPERATIONS[ins.op].prend.map((sorte, i) => {
                    if (sorte !== 'objet') return ins.args[i];
                    const o = avant.objets.find(x => cleObjet(x) === ins.args[i]);
                    return o ? nomObjet(o, avant.points) : '…';
                });
                jusque.push(ins);
                return OPERATIONS[ins.op].libelle(ins.op === 'points' ? ins.args : args);
            }).join('\n');
            this.note('Programme modèle écrit — il en existe d\'autres.', 'info');
            this.dessiner();
            return true;
        }
        if (this.rang + 1 >= this.plan.length) return false;
        this.rang += 1;
        this.texte = '';
        this.chemin = null;
        this.cadreMoiEl.classList.remove('pc-cadre--ok');
        this.note('');
        this.dessiner();
        return true;
    }

    /** Pendant du saut : on efface le programme, puis on recule d'une figure. */
    revenirEtape() {
        if (this.isDemo || this.fini) return false;
        if (this.texte.trim()) { this.texte = ''; this.chemin = null; this.note(''); this.dessiner(); return true; }
        if (this.rang <= 0) return false;
        this.rang -= 1;
        this.cadreMoiEl.classList.remove('pc-cadre--ok');
        this.dessiner();
        return true;
    }

    /** La ligne des étapes : les figures de la progression. */
    planEtapes() {
        return { courante: this.rang, liste: this.plan.map(i => NIVEAUX[i].titre) };
    }
}

export function engineProgrammeConstruction(container, isDemo, params) {
    const jeu = new ProgrammeConstruction(container, isDemo, params);
    jeu.start();
    return jeu;
}

export const familles = FAMILLES;
