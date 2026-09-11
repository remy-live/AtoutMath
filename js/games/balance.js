// LA BALANCE — l'écran.
//
// Le fléau, deux plateaux, et la ligne d'algèbre au-dessus. Toute la logique
// vit dans `core/balance.js`, testée sans navigateur ; ce fichier dessine et
// branche les clics.
//
// TROIS DÉCISIONS DE DESSIN, ET ELLES SONT PÉDAGOGIQUES AVANT D'ÊTRE JOLIES.
//
// ① LE FLÉAU PENCHE POUR DE BON. Quand l'élève retire trois poids d'un seul
//    plateau, la barre s'incline et reste inclinée jusqu'au geste jumeau. Il
//    aurait été plus facile — et plus « propre » — d'appliquer le geste des deux
//    côtés d'un coup : l'écran serait toujours équilibré, et l'élève n'aurait
//    jamais vu ce qu'il évite. C'est le déséquilibre qui enseigne.
//
// ② LA LIGNE D'ALGÈBRE BOUGE EN MÊME TEMPS QUE LES POIDS. Sans elle, on
//    apprend à manipuler une balance et rien d'autre ; avec elle, chaque geste
//    a sa traduction sous les yeux au moment où on le fait. Elle se coupe dans
//    les réglages pour une classe qui découvre, et se rallume ensuite : c'est
//    le passage du concret à l'abstrait, et il se règle.
//
// ③ ON CLIQUE LES POIDS, PAS DES BOUTONS. Cliquer « enlever 2 » dans un menu
//    est une commande ; attraper deux poids sur un plateau est un geste. La
//    différence se voit chez les élèves qui n'ont pas encore les mots.
//
// LE PARTAGE, LUI, EST UN BOUTON — et il ne peut pas en être autrement : on ne
// « clique » pas une division, elle porte sur la balance entière. Il ne s'allume
// que lorsqu'il est jouable, ce qui est déjà un indice sans être une réponse.

import { BaseGame } from '../core/BaseGame.js';
import {
    FAMILLES, ORDRE_FAMILLES, NIVEAUX, CONSIGNE, NOM_COTE, AUTRE,
    preparerNiveau, niveauxDisponibles, appliquer, resolu, solution, enSymboles, coups, pese,
    geometrieBalance, PENCHE_MAX
} from '../core/balance.js';
import { makeRng } from '../core/ids.js';

// UNE SEULE COMPÉTENCE, et c'est un choix. La balance travaille aussi le geste
// « faire la même chose des deux côtés », qu'on serait tenté de déclarer à part.
// On s'en abstient : une compétence que rien ne mesure vraiment est une
// compétence fantôme, et on vient d'en corriger une dans ce dépôt.
const COMPETENCE = 'alg.equation.resoudre';



/**
 * L'ÉQUATION AVEC L'OPÉRATION ÉCRITE DES DEUX CÔTÉS.
 *
 * « 2x + 4 = 10 » et « − 4 » donnent « 2x + 4 − 4 = 10 − 4 ». C'est la ligne
 * de rédaction du chapitre : les deux membres, la même opération, et l'égalité
 * qui tient — celle qu'on demande au contrôle, et celle qu'un journal en marge
 * ne montre pas.
 */
function deuxMembres(eq, op) {
    const bouts = String(eq).split('=');
    if (bouts.length !== 2) return '';
    const g = bouts[0].trim(), d = bouts[1].trim();
    return `${g} ${op} = ${d} ${op}`;
}

const enTexte = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * LES PARTAGES PROPOSÉS — Y COMPRIS CEUX QUI VONT ÊTRE REFUSÉS.
 *
 * C'était l'inverse : on ne montrait que les partages jouables, si bien que
 * « 2x + 5 = 17 » n'offrait aucun bouton. Or ce refus EST la leçon du chapitre
 * — on ne partage pas en deux ce qui n'est pas pair, et c'est exactement
 * pourquoi on règle les poids AVANT de diviser. Un bouton absent ne l'enseigne
 * pas : il fait croire qu'il n'y a rien à tenter.
 *
 * Le critère est donc « ce partage a-t-il un SENS à tenter ? » : il faut qu'un
 * plateau porte un nombre de boîtes divisible par n. Le noyau dira ensuite si
 * les poids suivent, et le dira avec une phrase.
 */
function partagesPossibles(etat) {
    const out = [];
    for (let n = 2; n <= 9; n++) {
        const utile = [etat.g, etat.d].some(p => p.x !== 0 && Math.abs(p.x) % n === 0);
        if (utile) out.push(n);
    }
    return out;
}

export class Balance extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'balance');
        const familles = Array.isArray(this.params.familles) && this.params.familles.length
            ? this.params.familles : ORDRE_FAMILLES;
        this.plan = niveauxDisponibles(familles);
        if (!this.plan.length) this.plan = niveauxDisponibles(ORDRE_FAMILLES);
        // LES SYMBOLES SE RÈGLENT, ET LEUR DÉFAUT EST « TOUJOURS ». Une classe
        // qui découvre peut les couper ; mais les couper par défaut ferait de
        // l'exercice un jeu de manipulation, et ce n'est pas ce qu'on note.
        this.symboles = this.params.symboles !== 'jamais';
        this.rng = makeRng(this.params.graine);
        this.rang = 0;
        this.gestes = 0;
        this.fini = false;
        this.chargerNiveau();
    }

    chargerNiveau() {
        this.niv = preparerNiveau(this.plan[this.rang], this.rng);
        this.etat = this.niv.etat;
        this.depart = this.niv.etat;
        // ON COMPTE LES GESTES, PAS LES CLICS — voir `coups()` dans le noyau :
        // enlever quatre poids de chaque côté est UN geste, qu'il se fasse en
        // deux clics groupés ou en huit clics unitaires.
        this.gestes = 0;
        this.optimal = solution(this.etat).coups;
        // Le journal repart de l'équation de départ, et le testeur se rearme :
        // la valeur essayée sur l'équation précédente n'a plus aucun sens ici.
        this.journal = [{ eq: enSymboles(this.etat), geste: '' }];
        this.testX = null;
        this.derniereCle = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .bl-wrap {
                    display: flex; flex-direction: column; gap: 6px; width: 100%; height: 100%;
                    padding: 8px 10px 10px; box-sizing: border-box; color: var(--text-main);
                    min-height: 0; container-type: inline-size;
                }
                .bl-consigne {
                    text-align: center; color: var(--text-muted); flex: 0 0 auto;
                    font-size: clamp(11px, 2.3cqw, 14px); line-height: 1.35;
                    max-width: 640px; margin: 0 auto;
                }
                /* LA LIGNE D'ALGÈBRE : grande, au milieu, impossible à manquer.
                   C'est elle qu'on doit apprendre à lire, pas le dessin. */
                .bl-eq {
                    text-align: center; font-weight: 800; letter-spacing: .5px;
                    font-size: clamp(18px, 5.2cqw, 34px); flex: 0 0 auto;
                    font-variant-numeric: tabular-nums; min-height: 1.2em;
                }
                .bl-eq--penche { color: var(--danger, #c0392b); }
                .bl-eq--penche::after { content: ' ✗'; font-size: .7em; }
                /* LA BALANCE PREND LA LARGEUR, PAS LA HAUTEUR VIDE.
                   Mesuré sur un téléphone de 390 px : la scène recevait toute
                   la hauteur restante, le SVG s'y centrait en gardant ses
                   proportions, et le dessin se retrouvait grand comme un timbre
                   au milieu de trois cents pixels de blanc. La boîte prend
                   maintenant la FORME du dessin — et c'est la largeur qui
                   commande, comme pour toutes les figures du logiciel. */
                /* La balance prend la place qu'il lui faut, pas plus : elle est
                   large et basse, et la hauteur qu'on lui donnait en trop ne
                   l'agrandissait pas — elle la centrait dans du vide, loin de
                   l'équation qu'elle illustre. Le reste va au journal. */
                .bl-scene {
                    flex: 0 1 auto; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                .bl-svg {
                    display: block; width: 100%; height: auto;
                    max-height: 100%;
                }
                /* LE FLÉAU TOURNE AUTOUR DE SON MILIEU — et il fallait le lui
                   laisser faire.
                   Rémy : « la balance est cassée. Répare la lol ». Voici la
                   première des deux fractures. « transform-box: fill-box » avec
                   « transform-origin: center » S'AJOUTE au « rotate(a cx cy) »
                   de l'attribut au lieu de le remplacer : le navigateur compose
                   les deux, et la rotation se fait autour d'un point deux fois
                   plus loin que le pivot. Mesuré à 8,4° : le milieu du fléau
                   partait à quarante-deux pixels du haut du mât, et toute la
                   balance se disloquait.
                   L'attribut porte déjà son centre. On rend donc à la CSS son
                   origine neutre — le repère du dessin, coin en haut à gauche —
                   et il n'y a plus qu'une rotation, celle qui est écrite. */
                .bl-barre {
                    transition: transform .55s cubic-bezier(.34,1.3,.64,1);
                    transform-box: view-box; transform-origin: 0 0;
                }
                .bl-fleau { fill: var(--text-main); }
                .bl-tete { fill: var(--text-main); }
                /* L'axe se pose PAR-DESSUS le fléau : c'est lui qui tient. */
                /* L'AXE SE VOIT SUR LES DEUX THÈMES. En « --card-bg », qui n'est
                   défini nulle part et retombe sur du blanc, il disparaissait
                   dans un fléau devenu blanc en thème nuit. Le fond du plateau,
                   lui, est toujours le contraire du trait. */
                .bl-axe {
                    fill: var(--bg-plateau, var(--card-bg, #fff));
                    stroke: var(--text-main); stroke-width: 3;
                }
                .bl-pied {
                    fill: color-mix(in srgb, var(--text-main) 86%, var(--card-bg, #fff));
                    stroke: var(--text-main); stroke-width: 1.6; stroke-linejoin: round;
                }
                .bl-jour { fill: var(--bg-plateau, #fff); opacity: .22; }
                .bl-couteau { fill: var(--text-main); }
                /* Une ombre au sol, très pâle : elle pose la balance sur
                   quelque chose au lieu de la laisser flotter. */
                .bl-ombre { fill: var(--text-main); opacity: .1; }
                .bl-fil { stroke: var(--text-muted); stroke-width: 1.6; fill: none; }
                .bl-plateau {
                    fill: var(--card-bg, #fff); stroke: var(--text-main); stroke-width: 2.4;
                    stroke-linejoin: round;
                }
                .bl-rebord { stroke: var(--text-main); stroke-width: 1.2; opacity: .35; }
                .bl-jeton { cursor: pointer; }
                .bl-jeton rect, .bl-jeton circle { transition: opacity .18s; }
                .bl-jeton:hover rect, .bl-jeton:hover circle { opacity: .55; }
                .bl-boite { fill: var(--primary, #4a6fd4); stroke: #22315f; stroke-width: 1.6; }
                .bl-poids { fill: #d9a441; stroke: #8a6414; stroke-width: 1.4; }
                /* CE QUI MANQUE SE DESSINE AUSSI. « 5x − 5 » ne veut pas dire
                   qu'il n'y a rien : il y a CINQ POIDS EN MOINS sur le plateau,
                   et c'est cela qu'il faut compenser. On les montre en rouge,
                   comme des ballons qui tirent vers le haut au lieu de peser —
                   sinon « x − 5 = 10 » est un plateau vide qu'on ne sait pas
                   lire. Le noyau les acceptait depuis le début ; l'écran, non. */
                .bl-boite.bl-manque { fill: #e07a3f; stroke: #8a4514; }
                .bl-poids.bl-manque { fill: #d1495b; stroke: #7d1f2c; }
                .bl-lettre {
                    fill: #fff; font-weight: 800; text-anchor: middle; dominant-baseline: central;
                    pointer-events: none;
                }
                /* Même origine neutre que le fléau : une translation s'en moque,
                   mais deux règles qui se contredisent finissent toujours par
                   se rencontrer, et celle du fléau a déjà cassé la balance. */
                .bl-groupe {
                    transition: transform .55s cubic-bezier(.34,1.3,.64,1);
                    transform-box: view-box; transform-origin: 0 0;
                }
                .bl-outils {
                    display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; flex: 0 0 auto;
                }
                .bl-btn {
                    border: 1.5px solid var(--border-color, #d7dae3); background: var(--card-bg, #fff);
                    color: var(--text-main); border-radius: 9px; padding: 5px 11px; cursor: pointer;
                    font-size: clamp(11px, 2.2cqw, 13px); font-weight: 700;
                }
                .bl-btn:hover:not(:disabled) { border-color: var(--primary); }
                .bl-btn:disabled { opacity: .38; cursor: default; }
                .bl-btn--doux { font-weight: 600; color: var(--text-muted); }
                /* --- LA BARRE D'OPÉRATIONS ----------------------------------
                   Rémy m'a envoyé sa propre balance : « pour les équations,
                   refais, je te donne un modèle ». Elle a une rangée de boutons
                   — « − x », « + x », « − 1 », « + 1 », « ÷ » — qui agissent sur
                   LES DEUX MEMBRES à la fois. C'est le geste qu'on écrit au
                   cahier, à côté du geste qu'on fait avec les mains. */
                .bl-ops { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; flex: 0 0 auto; }
                .bl-op {
                    border: 1.5px solid var(--primary, #4a6fd4); border-radius: 9px;
                    background: color-mix(in srgb, var(--primary) 8%, var(--card-bg, #fff));
                    color: var(--primary, #4a6fd4); cursor: pointer; font: inherit; font-weight: 800;
                    padding: 6px 13px; font-size: clamp(12px, 2.4cqw, 15px);
                    font-variant-numeric: tabular-nums;
                }
                .bl-op:hover:not(:disabled) { background: var(--primary); color: #fff; }
                .bl-op:disabled { opacity: .3; cursor: default; }
                /* Le refus se voit : un bouton qui ne fait rien passe pour une
                   panne, un bouton qui SURSAUTE dit qu'il a compris et qu'il
                   refuse. La phrase en dessous explique pourquoi. */
                .bl-op--refus { animation: bl-secousse .34s; border-color: var(--danger, #c0392b);
                    color: var(--danger, #c0392b); }
                @keyframes bl-secousse {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-5px); } 40% { transform: translateX(5px); }
                    60% { transform: translateX(-3px); } 80% { transform: translateX(3px); }
                }
                /* --- LE TESTEUR DE VÉRITÉ -----------------------------------
                   C'est l'idée du modèle de Rémy que je n'aurais pas eue : un
                   curseur qui propose une valeur pour x et FAIT PENCHER la
                   balance selon qu'elle est trop petite ou trop grande. Il ne
                   résout rien — il dit ce que « solution » veut dire, et c'est
                   le mot que personne ne définit jamais : la valeur qui rend
                   les deux plateaux égaux. Un élève qui n'a pas encore la
                   méthode peut chercher à tâtons, et VOIR l'équilibre arriver. */
                .bl-test {
                    display: flex; align-items: center; gap: 10px; flex: 0 0 auto;
                    justify-content: center; flex-wrap: wrap;
                    font-size: clamp(11px, 2.2cqw, 13px); color: var(--text-muted);
                }
                .bl-test input[type=range] { width: min(240px, 60cqw); accent-color: var(--primary); }
                .bl-test-val { font-weight: 800; color: var(--text-main); min-width: 4.5em;
                    font-variant-numeric: tabular-nums; }
                .bl-test-val--ok { color: var(--success, #2e7d32); }
                /* --- LE JOURNAL DE BORD -------------------------------------
                   « 2x + 4 = 10 [− 4] » : chaque ligne porte l'équation ET le
                   geste qui l'a produite. C'est la trace écrite du chapitre —
                   ce qu'on recopie au cahier —, et elle s'écrit toute seule
                   pendant qu'on manipule. */
                .bl-journal {
                    flex: 1 1 auto; min-height: 0; overflow-y: auto;
                    display: flex; flex-direction: column; gap: 1px;
                    font-size: clamp(10px, 2cqw, 12.5px); font-variant-numeric: tabular-nums;
                    color: var(--text-muted); text-align: center;
                }
                /* Le journal porte son nom partout : sans titre, la colonne de
                   lignes sous la balance passait pour un reliquat d'affichage. */
                .bl-journal::before {
                    content: 'Journal de bord'; font-weight: 800; color: var(--text-main);
                    font-size: .84em; margin-bottom: 3px;
                }
                .bl-jl { line-height: 1.5; }
                .bl-jl b { color: var(--text-main); font-weight: 700; }
                /* La ligne développée est un CALCUL INTERMÉDIAIRE : plus
                   discrète que les équations, mais lisible — c'est elle qu'on
                   recopie. */
                .bl-jl--detail { color: var(--text-muted); padding-left: 1em; font-size: .92em; }
                .bl-jl--fin { color: var(--success); font-weight: 800; margin-top: 3px; }
                .bl-jl i { font-style: normal; color: var(--primary); font-weight: 700; }
                .bl-note {
                    text-align: center; min-height: 2.4em; flex: 0 0 auto;
                    font-size: clamp(11px, 2.2cqw, 13px); line-height: 1.3;
                }
                .bl-note--ko { color: var(--danger, #c0392b); }
                .bl-note--ok { color: var(--success, #2e7d32); }
                .bl-note--attente { color: #b8860b; font-weight: 600; }
                @container (max-width: 420px) { .bl-consigne { display: none; } }
                /* SUR UN GRAND PLATEAU, LE JOURNAL PASSE À DROITE.
                   Empilé sous la balance, il était relégué au bas de l'écran en
                   corps 11 — alors qu'il est la TRACE ÉCRITE, c'est-à-dire ce
                   qu'on recopie au cahier. À côté de la balance, on lit les
                   deux ensemble : le geste à gauche, sa ligne à droite. C'est
                   tout le passage du concret à l'abstrait, mis côte à côte. */
                @container (min-width: 760px) {
                    .bl-wrap {
                        display: grid; column-gap: 16px;
                        grid-template-columns: minmax(0, 1fr) minmax(190px, 250px);
                        grid-template-rows: auto auto auto minmax(0, 1fr) auto auto auto;
                    }
                    .bl-consigne, .bl-eq, .bl-ops { grid-column: 1 / -1; }
                    .bl-scene, .bl-test, .bl-outils, .bl-note { grid-column: 1; }
                    .bl-journal {
                        grid-column: 2; grid-row: 4 / -1; max-height: none;
                        align-self: stretch; text-align: left; overflow-y: auto;
                        border-left: 1.5px solid var(--border-color, #d7dae3);
                        padding-left: 12px; gap: 3px;
                        font-size: clamp(12px, 1.6cqw, 15px);
                    }
                }
            </style>
            <div class="bl-wrap">
                <p class="bl-consigne">${enTexte(CONSIGNE)}</p>
                <div class="bl-eq" data-eq></div>
                <div class="bl-ops" data-ops></div>
                <div class="bl-scene" data-scene></div>
                <div class="bl-test" data-test></div>
                <div class="bl-outils" data-outils></div>
                <div class="bl-note" data-note></div>
                <div class="bl-journal" data-journal></div>
            </div>`;
        this.eqEl = this.container.querySelector('[data-eq]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.outilsEl = this.container.querySelector('[data-outils]');
        this.opsEl = this.container.querySelector('[data-ops]');
        this.testEl = this.container.querySelector('[data-test]');
        this.journalEl = this.container.querySelector('[data-journal]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.dessiner();
    }

    /**
     * LE DESSIN D'UN PLATEAU : les boîtes puis les poids, en rangées.
     *
     * Un plateau qui porte quatorze poids ne peut pas les aligner : on remplit
     * par rangées de cinq, du bas vers le haut, comme on empilerait vraiment.
     */
    jetons(p, cote, cx, base) {
        const L = 26, H = 20, PAS = 5;
        let out = '';
        const clic = (quoi) => (this.isDemo ? '' : ` data-cote="${cote}" data-quoi="${quoi}"`);

        // LES BOÎTES, puis les poids, chacun sur ses rangées.
        const nx = Math.abs(p.x);
        for (let i = 0; i < nx; i++) {
            const rangee = Math.floor(i / PAS), place = i % PAS;
            const dans = Math.min(nx - rangee * PAS, PAS);
            const x = cx + (place - (dans - 1) / 2) * (L + 3);
            const y = base - rangee * (H + 3);
            out += `<g class="bl-jeton"${clic('x')}>
                <rect class="bl-boite${p.x < 0 ? ' bl-manque' : ''}"
                    x="${x - L / 2}" y="${y - H}" width="${L}" height="${H}" rx="3"/>
                <text class="bl-lettre" x="${x}" y="${y - H / 2}" font-size="13"
                    >${p.x < 0 ? '−x' : 'x'}</text></g>`;
        }
        const hautX = Math.ceil(nx / PAS) * (H + 3);
        const nu = Math.abs(p.u);
        for (let i = 0; i < nu; i++) {
            const rangee = Math.floor(i / PAS), place = i % PAS;
            const dans = Math.min(nu - rangee * PAS, PAS);
            const x = cx + (place - (dans - 1) / 2) * 21;
            const y = base - hautX - rangee * 21;
            out += `<g class="bl-jeton"${clic('u')}>
                <circle class="bl-poids${p.u < 0 ? ' bl-manque' : ''}" cx="${x}" cy="${y - 9}" r="9"/>
                <text class="bl-lettre" x="${x}" y="${y - 9}" font-size="${p.u < 0 ? 9 : 10}"
                    fill="${p.u < 0 ? '#fff' : '#4a3208'}">${p.u < 0 ? '−1' : '1'}</text></g>`;
        }
        return out;
    }

    dessiner() {
        const e = this.etat;
        // L'INCLINAISON N'EST PAS DÉCORATIVE : elle dit de quel côté on a trop
        // enlevé, ET DE COMBIEN. Un angle fixe ferait mentir le dessin — trois
        // poids retirés d'un côté déséquilibrent plus qu'un seul, et l'élève
        // doit le voir. On plafonne à 14° : au-delà, les plateaux se
        // chevauchent à l'écran et la lecture y perd plus qu'elle n'y gagne.
        // Sans `attente`, la balance est droite par construction.
        let inclinaison = 0;
        if (e.attente) {
            const ampleur = Math.min(PENCHE_MAX, 5 + e.attente.combien * 2.2);
            inclinaison = e.attente.cote === 'g' ? -ampleur : ampleur;
        } else if (this.testX !== null) {
            // LE TESTEUR PENCHE LA BALANCE, LUI AUSSI, et il le fait pour une
            // autre raison : ici l'égalité n'est pas cassée, c'est la VALEUR
            // essayée qui ne convient pas. L'écart se voit — plus on est loin,
            // plus ça penche —, et l'équilibre dit qu'on a trouvé.
            const g = pese(e.g, this.testX), d = pese(e.d, this.testX);
            const ecart = g - d;
            if (ecart) {
                inclinaison = Math.sign(ecart) * Math.min(PENCHE_MAX, 4 + Math.abs(ecart) * 1.1) * -1;
            }
        }

        // LE CADRE COLLE AU DESSIN, ET IL S'AJUSTE À CHAQUE ÉQUATION.
        //
        // Il faisait 460 × 300, taillé pour la pile de jetons la plus haute
        // qu'on puisse rencontrer. Résultat mesuré sur « x − 2 = 1 » : le
        // dessin occupait 110 px sur les 191 de sa boîte, et paraissait petit
        // sans que rien ne le brime — c'était du vide réservé à des jetons qui
        // n'existaient pas. La hauteur du fléau se calcule donc à partir de la
        // pile la plus haute réellement posée, et le pied s'arrête juste sous
        // les plateaux.
        // TOUTE LA GÉOMÉTRIE VIENT DU NOYAU, où elle se teste sans écran : le
        // bout d'un bras qui tourne est sur un cercle, et un plateau pend
        // d'aplomb sous lui. Voir `geometrieBalance`.
        const hautPile = (p) => Math.ceil(Math.abs(p.x) / 5) * 23 + Math.ceil(Math.abs(p.u) / 5) * 21;
        const G = geometrieBalance({
            inclinaison, hautG: hautPile(e.g), hautD: hautPile(e.d)
        });
        const { W, demi, PX, cy, chute, solY, H } = G;
        const bout = (c) => G.bout(c);

        // ET LES PLATEAUX PENDENT À LA VERTICALE, quoi qu'il arrive. C'est ce
        // qu'ils font sur une vraie balance — ils restent d'aplomb pendant que
        // le fléau penche —, et c'est ce qui rend le dessin lisible : les
        // jetons ne glissent pas, ils descendent.
        // LE PLATEAU EST DESSINÉ À PLAT ET SIMPLEMENT DÉPLACÉ, et ce n'est pas
        // une commodité d'écriture : c'est ce qui le fait BOUGER avec le fléau.
        // Un plateau redessiné à de nouvelles coordonnées saute d'une image à
        // l'autre pendant que le fléau, lui, glisse sur sa transition — deux
        // pièces de la même balance, deux vitesses. Une translation, elle,
        // s'anime comme la rotation d'à côté et avec la même courbe.
        const plateauSvg = (c) => {
            const sens = c === 'g' ? -1 : 1;
            const x0 = PX + sens * demi, y0 = cy;   // le bout, balance droite
            const b = bout(c);
            const y = y0 + chute;                   // le plateau, plomb sous le bout
            const dl = 62, dh = 74;                 // demi-largeurs du fond et du bord
            return `<g class="bl-groupe" data-plateau="${c}"
                    transform="translate(${(b.x - x0).toFixed(2)} ${(b.y - y0).toFixed(2)})">
                <path class="bl-fil" d="M ${x0} ${y0} L ${x0 - dh + 6} ${y - 1}
                    M ${x0} ${y0} L ${x0 + dh - 6} ${y - 1}"/>
                <path class="bl-plateau" d="M ${x0 - dh} ${y} L ${x0 + dh} ${y}
                    L ${x0 + dl} ${y + 14} L ${x0 - dl} ${y + 14} Z"/>
                <line class="bl-rebord" x1="${x0 - dh + 4}" y1="${y + 3.5}"
                    x2="${x0 + dh - 4}" y2="${y + 3.5}"/>
                ${this.jetons(e[c], c, x0, y - 2)}</g>`;
        };

        // LE PIED : un socle large, un mât qui s'affine, et le couteau du
        // pivot. Trois traits faisaient un dessin de circuit électrique ; c'est
        // une balance, elle a une masse et elle tient debout toute seule.
        const pied = `
            <ellipse class="bl-ombre" cx="${PX}" cy="${solY + 4}" rx="64" ry="6"/>
            <path class="bl-pied" d="M ${PX - 9} ${cy + 8} L ${PX + 9} ${cy + 8}
                L ${PX + 20} ${solY - 8} L ${PX + 58} ${solY - 8}
                L ${PX + 58} ${solY} L ${PX - 58} ${solY}
                L ${PX - 58} ${solY - 8} L ${PX - 20} ${solY - 8} Z"/>
            ${/* UN CÔTÉ PLUS CLAIR, ET LE MÂT CESSE D'ÊTRE UNE SILHOUETTE.
                  Une seule forme pleine se lit comme un trou dans la page ;
                  la même avec sa face éclairée a une épaisseur. */ ''}
            <path class="bl-jour" d="M ${PX - 9} ${cy + 8} L ${PX - 2} ${cy + 8}
                L ${PX - 9} ${solY - 8} L ${PX - 20} ${solY - 8} Z"/>
            <path class="bl-couteau" d="M ${PX} ${cy - 11} L ${PX + 13} ${cy + 9}
                L ${PX - 13} ${cy + 9} Z"/>`;

        this.sceneEl.innerHTML = `
            <svg class="bl-svg" viewBox="0 0 ${W} ${H}"
                style="aspect-ratio:${W}/${H}" preserveAspectRatio="xMidYMid meet">
                ${pied}
                <g class="bl-barre" transform="rotate(${inclinaison} ${PX} ${cy})">
                    <rect class="bl-fleau" x="${PX - demi}" y="${cy - 4}"
                        width="${2 * demi}" height="8" rx="4"/>
                    <circle class="bl-tete" cx="${PX - demi}" cy="${cy}" r="5.5"/>
                    <circle class="bl-tete" cx="${PX + demi}" cy="${cy}" r="5.5"/>
                </g>
                <circle class="bl-axe" cx="${PX}" cy="${cy}" r="7"/>
                ${plateauSvg('g')}
                ${plateauSvg('d')}
            </svg>`;

        this.eqEl.textContent = this.symboles ? enSymboles(e) : '';
        this.eqEl.className = 'bl-eq' + (e.attente ? ' bl-eq--penche' : '');
        if (!this.isDemo) {
            this.sceneEl.querySelectorAll('[data-cote]').forEach(g => {
                g.onclick = () => this.jouer({
                    geste: 'enlever', cote: g.dataset.cote, quoi: g.dataset.quoi, combien: 1
                });
            });
        }
        this.dessinerOutils();
        this.dessinerOps();
        this.dessinerTest();
        this.dessinerJournal();
    }

    /**
     * LA BARRE D'OPÉRATIONS — le geste qu'on écrit au cahier.
     *
     * Quatre boutons, unité par unité : c'est ce que fait la balance de Rémy,
     * et c'est volontairement lent. « − 4 » d'un coup escamoterait le comptage,
     * qui est la moitié du travail en quatrième.
     */
    dessinerOps() {
        const e = this.etat;
        const dit = (quoi, n) => (quoi === 'x' ? `${n < 0 ? '−' : '+'} x` : `${n < 0 ? '−' : '+'} 1`);
        const ops = [
            { quoi: 'x', combien: -1 }, { quoi: 'x', combien: 1 },
            { quoi: 'u', combien: -1 }, { quoi: 'u', combien: 1 }
        ];
        this.opsEl.innerHTML = ops.map((o, i) =>
            `<button type="button" class="bl-op" data-op="${i}">${dit(o.quoi, o.combien)}</button>`).join('');
        if (this.isDemo) {
            this.opsEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
            return;
        }
        this.opsEl.querySelectorAll('[data-op]').forEach(b => {
            b.onclick = () => {
                const o = ops[+b.dataset.op];
                const r = this.jouer({ geste: 'desDeuxCotes', ...o });
                if (r === false) this.secouer(b);
            };
        });
    }

    /** Un bouton qui refuse le dit : il sursaute, et la note explique. */
    secouer(btn) {
        btn.classList.remove('bl-op--refus');
        void btn.offsetWidth;
        btn.classList.add('bl-op--refus');
        setTimeout(() => btn.classList.remove('bl-op--refus'), 420);
    }

    /**
     * LE TESTEUR DE VÉRITÉ — l'idée que Rémy m'a donnée avec son modèle.
     *
     * Il ne résout rien et ne doit rien résoudre. Il répond à une question que
     * l'exercice ne posait nulle part : « qu'est-ce qu'une SOLUTION ? » On
     * propose un nombre, la balance penche ou s'équilibre, et la définition
     * cesse d'être une phrase.
     */
    dessinerTest() {
        const max = Math.max(12, (this.niv && this.niv.solution ? this.niv.solution : 6) + 6);
        const v = this.testX === null ? '' : this.testX;
        const equilibre = this.testX !== null
            && pese(this.etat.g, this.testX) === pese(this.etat.d, this.testX);
        this.testEl.innerHTML = `
            <label for="bl-testeur">Et si x valait…</label>
            <input id="bl-testeur" type="range" min="0" max="${max}" step="1"
                value="${this.testX === null ? 0 : this.testX}" ${this.isDemo ? 'disabled' : ''}>
            <span class="bl-test-val${equilibre ? ' bl-test-val--ok' : ''}">${
    this.testX === null ? '? ' : `x = ${v}`}${equilibre ? ' ⚖' : ''}</span>
            ${this.testX === null ? '' : '<button type="button" class="bl-btn bl-btn--doux" '
                + 'data-test-off>arrêter d\'essayer</button>'}`;
        if (this.isDemo) return;
        const curseur = this.testEl.querySelector('#bl-testeur');
        curseur.oninput = () => { this.testX = +curseur.value; this.dessiner(); };
        const off = this.testEl.querySelector('[data-test-off]');
        if (off) off.onclick = () => { this.testX = null; this.dessiner(); };
    }

    /**
     * LE JOURNAL DE BORD — « 2x + 4 = 10 [− 4] ».
     *
     * La trace écrite, qui s'écrit toute seule pendant qu'on manipule. C'est
     * elle qu'on recopie au cahier, et c'est le pont que le chapitre demande :
     * la suite des lignes EST la rédaction d'une résolution d'équation.
     */
    dessinerJournal() {
        const fait = resolu(this.etat);
        this.journalEl.innerHTML = this.journal.map(l =>
            `<div class="bl-jl"><b>${enTexte(l.eq)}</b>${l.geste ? ` <i>${enTexte(l.geste)}</i>` : ''}</div>`
            + (l.detail ? `<div class="bl-jl bl-jl--detail">${enTexte(l.detail)}</div>` : '')
        ).join('')
        // ET LA CONCLUSION, EN TOUTES LETTRES. Rémy : « quand on a la réponse
        // il faut le dire ». Une suite de lignes qui s'arrête sur « x = 5 »
        // laisse le lecteur conclure lui-même ; une rédaction de quatrième se
        // termine par une phrase, et c'est elle qu'on oublie en copie.
            + (fait ? `<div class="bl-jl bl-jl--fin">La solution est x = ${fait.x}.</div>` : '');
        this.journalEl.scrollTop = this.journalEl.scrollHeight;
    }

    dessinerOutils() {
        // LES PARTAGES SONT PROPOSÉS MÊME QUAND ILS SONT REFUSÉS, et c'est le
        // cœur de la leçon : « 2x + 5 = 17 » ne se partage pas en deux tant que
        // le 5 est là. N'afficher que les partages possibles cachait
        // exactement ce qu'on veut faire rencontrer. Le bouton existe, il
        // sursaute, et la phrase dit pourquoi.
        const possibles = partagesPossibles(this.etat);
        this.outilsEl.innerHTML = possibles.map(n =>
            `<button type="button" class="bl-btn" data-partage="${n}">Partager en ${n}</button>`).join('')
            + `<button type="button" class="bl-btn bl-btn--doux" data-recommencer>↺ Recommencer</button>`;
        if (this.isDemo) {
            this.outilsEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
            return;
        }
        this.outilsEl.querySelectorAll('[data-partage]').forEach(b => {
            b.onclick = () => {
                if (this.jouer({ geste: 'partager', en: +b.dataset.partage }) === false) this.secouer(b);
            };
        });
        this.outilsEl.querySelector('[data-recommencer]').onclick = () => {
            this.etat = this.depart;
            this.journal = [{ eq: enSymboles(this.depart), geste: '' }];
            this.testX = null;
            this.note('On repart de l\'équation de départ.', 'info');
            this.dessiner();
        };
    }

    /**
     * UN GESTE, ET SA CONSÉQUENCE.
     *
     * Un refus n'est pas comptabilisé comme une erreur d'exercice : c'est un
     * geste empêché, pas une réponse fausse. On ne note que ce qui est ACHEVÉ —
     * l'équation résolue — et l'on garde le compte des gestes pour dire, à la
     * fin, si le chemin était le plus court.
     */
    jouer(geste) {
        if (this.fini || this.isDemo) return;
        const avant = this.etat.attente;
        const avantEq = enSymboles(this.etat);
        const r = appliquer(this.etat, geste);
        // Le refus rend `false`, pour que l'appelant fasse sursauter le bouton :
        // un bouton qui ne bouge pas se lit comme une panne.
        if (!r.ok) { this.note(r.dit, 'ko'); return false; }
        this.etat = r.etat;

        // QUATRE FOIS « + 1 » EST UN SEUL GESTE, et il fallait le dire.
        //
        // Mesuré en jouant « x − 4 = 4 » à la barre : quatre pressions sur
        // « + 1 », et l'écran répondait « tu y es en 4 gestes ; il en suffisait
        // de 1 ». C'était faux et décourageant — l'élève avait fait EXACTEMENT
        // le geste attendu, en quatre pressions, parce que la barre avance
        // unité par unité, exprès. Deux pressions de suite sur le même bouton
        // continuent donc le même geste : c'est aussi ce qu'on écrit au cahier,
        // « + 4 » sur une seule ligne, pas quatre lignes de « + 1 ».
        const cle = this.cleDuGeste(geste);
        const suite = cle && cle === this.derniereCle && !avant;
        if (geste.geste !== 'enlever' || (avant && !r.etat.attente)) {
            if (!suite) this.gestes += 1;
        }
        this.derniereCle = r.etat.attente ? null : cle;

        // LE JOURNAL S'ÉCRIT SUR LES GESTES ACHEVÉS SEULEMENT. Une balance qui
        // penche n'est pas une ligne de cahier : c'est un état transitoire, et
        // l'écrire ferait une rédaction qui contient des égalités fausses.
        if (geste.geste === 'enlever') {
            if (!avant && r.etat.attente) {
                this.eqAvantDette = avantEq;
                this.detteMax = r.etat.attente.combien;
                this.detteQuoi = geste.quoi;
            } else if (r.etat.attente) {
                this.detteMax = Math.max(this.detteMax || 0, r.etat.attente.combien);
            } else {
                this.noterAuJournal(this.eqAvantDette || avantEq,
                    { geste: 'desDeuxCotes', quoi: this.detteQuoi, combien: -(this.detteMax || 1) }, false);
            }
        } else {
            this.noterAuJournal(avantEq, geste, suite);
        }
        this.note(r.dit, r.ton);
        this.dessiner();

        const fait = resolu(this.etat);
        if (!fait) return;
        // LA RÉPONSE EST LUE SUR LA BALANCE, PAS TAPÉE. L'élève n'écrit pas
        // « x = 4 » : il l'a construit, et l'écran le lit.
        const court = this.gestes <= this.optimal;
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${enSymboles(this.depart)} — combien pèse la boîte ?`,
            expected: `x = ${this.niv.solution}`,
            given: `x = ${fait.x}`,
            points: court ? 10 : 7, partiel: true
        });
        this.note(`x = ${fait.x}. ` + (court
            ? 'Et par le chemin le plus court.'
            : `Tu y es en ${this.gestes} gestes ; il en suffisait de ${this.optimal}.`), 'ok');
        this.suivant();
    }

    /**
     * LA SIGNATURE D'UN GESTE : ce qui fait que le suivant le CONTINUE.
     *
     * Même nature, même grandeur, même sens. « + 1 » puis « + 1 » continue ;
     * « + 1 » puis « − 1 » ne continue pas — c'est un repentir, et il mérite
     * sa ligne. Un partage ne se continue jamais : diviser par 2 puis par 2,
     * ce n'est pas diviser par 4 dans la tête d'un élève, c'est deux gestes.
     */
    cleDuGeste(geste) {
        if (geste.geste !== 'desDeuxCotes') return null;
        return `${geste.quoi}:${Math.sign(geste.combien)}`;
    }

    /**
     * UNE LIGNE DE JOURNAL : l'équation d'avant, et le geste qui l'a changée.
     *
     * La dernière ligne, elle, ne porte pas de geste : c'est l'équation où l'on
     * en est. Elle est réécrite à chaque fois plutôt que empilée, sans quoi le
     * journal doublerait chaque ligne.
     */
    noterAuJournal(avantEq, geste, suite) {
        if (this.journal.length && !this.journal[this.journal.length - 1].geste) this.journal.pop();
        const dernier = this.journal[this.journal.length - 1];
        if (suite && dernier && dernier.quoi === geste.quoi) {
            dernier.combien += geste.combien;
        } else {
            this.journal.push({
                eq: avantEq, type: geste.geste, quoi: geste.quoi,
                combien: geste.combien || 0, en: geste.en
            });
        }
        const d = this.journal[this.journal.length - 1];
        const op = d.type === 'partager' ? `÷ ${d.en}`
            : `${d.combien < 0 ? '−' : '+'} ${d.quoi === 'x'
                ? (Math.abs(d.combien) === 1 ? 'x' : `${Math.abs(d.combien)}x`)
                : Math.abs(d.combien)}`;
        d.geste = `[${op}]`;
        // LA LIGNE QU'ON ÉCRIT AU CAHIER : l'opération sur LES DEUX MEMBRES.
        //
        // Rémy : « quand on met −1 il faut bien que tu mettes le −1 des deux
        // côtés de l'équation dans le journal de bord ». Le journal notait
        // « [− 1] » en marge — la notation abrégée du professeur, celle qu'on
        // met à côté de la ligne. Or ce que l'élève doit apprendre à ÉCRIRE,
        // c'est « 2x + 4 − 4 = 10 − 4 » : les deux membres, la même opération,
        // et l'égalité qui tient. C'est la ligne qu'on lui demandera au
        // contrôle, et elle n'apparaissait nulle part.
        d.detail = deuxMembres(d.eq, op);
        this.journal.push({ eq: enSymboles(this.etat), geste: '' });
    }

    suivant() {
        if (this.rang + 1 >= this.plan.length) {
            this.fini = true;
            return this.terminerPartie({
                gagne: true, concept: COMPETENCE,
                quoi: 'Résoudre les équations de la balance',
                obtenu: `${this.plan.length} équations`, points: 25
            });
        }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.chargerNiveau();
            this.note('');
            this.dessiner();
        }, 1700);
    }

    note(texte, ton) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'bl-note' + (ton ? ` bl-note--${ton}` : '');
    }

    /** Le robot résout, un geste à la fois, en laissant voir le déséquilibre. */
    async runDemoSequence() {
        for (const g of solution(this.etat).gestes) {
            if (!this.isRunning) return;
            await new Promise(ok => setTimeout(ok, 1100));
            if (this.gelDemo) await new Promise(ok => setTimeout(ok, 700));
            const r = appliquer(this.etat, g);
            if (!r.ok) return;
            const avantEq = enSymboles(this.etat);
            this.etat = r.etat;
            // LE ROBOT ÉCRIT AU JOURNAL, LUI AUSSI. Une démonstration qui
            // laisse le journal vide montre les gestes sans montrer la
            // rédaction — or c'est la rédaction qu'on vient copier.
            this.noterAuJournal(avantEq, g, false);
            this.note(r.dit, r.ton);
            this.dessiner();
        }
        const fait = resolu(this.etat);
        if (fait) this.note(`x = ${fait.x} : la boîte est seule, on peut la lire.`, 'ok');
    }

    /**
     * LA BARRE D'AUTEUR AVANCE EN DEUX TEMPS : le premier résout l'équation
     * affichée, le second passe à la suivante. Le meneur appelle `sauterEtape`
     * — pas `sauterQuestion` : je m'étais trompé de nom sur un exercice
     * précédent, et le bouton ne faisait rien sans le dire.
     */
    sauterEtape() {
        if (this.fini) return false;
        if (!resolu(this.etat)) {
            for (const g of solution(this.etat).gestes) {
                const avantEq = enSymboles(this.etat);
                const r = appliquer(this.etat, g);
                if (!r.ok) continue;
                this.etat = r.etat;
                // Le saut d'auteur écrit la rédaction complète : c'est ce qu'on
                // vient voir quand on demande la solution.
                this.noterAuJournal(avantEq, g, false);
            }
            const fait = resolu(this.etat);
            this.note(fait ? `Résolue : x = ${fait.x}.` : 'Chemin joué.', 'info');
            this.dessiner();
            return true;
        }
        if (this.rang + 1 >= this.plan.length) return false;
        this.rang += 1;
        this.chargerNiveau();
        this.note('');
        this.dessiner();
        return true;
    }

    /** Pendant du saut : on remet l'équation à zéro, puis on recule. */
    revenirEtape() {
        if (this.isDemo || this.fini) return false;
        if (this.etat !== this.depart) {
            this.etat = this.depart;
            this.gestes = 0;
            this.journal = [{ eq: enSymboles(this.depart), geste: '' }];
            this.testX = null;
            this.note('');
            this.dessiner();
            return true;
        }
        if (this.rang <= 0) return false;
        this.rang -= 1;
        this.chargerNiveau();
        this.dessiner();
        return true;
    }

    planEtapes() {
        return { courante: this.rang, liste: this.plan.map(i => NIVEAUX[i].titre) };
    }
}

export function engineBalance(container, isDemo, params) {
    const jeu = new Balance(container, isDemo, params);
    jeu.start();
    return jeu;
}

export const familles = FAMILLES;
export const cotes = NOM_COTE;
export const autre = AUTRE;
