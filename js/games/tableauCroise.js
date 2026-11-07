// LE TABLEAU À DOUBLE ENTRÉE — à l'écran.
//
// Le noyau (core/tableauCroise.js) tire l'énoncé, le tableau et les trous, et
// garantit qu'ils se remplissent par propagation. Ici on dessine et l'on écoute.
//
// QUATRE PARTIS PRIS.
//
//   · UNE CASE JUSTE SE VERROUILLE. Sur le papier, une valeur trouvée sert
//     d'appui pour la suivante — mais si elle était fausse, tout ce qui suit
//     l'est aussi, et l'élève ne le découvre qu'à la fin. À l'écran, la case
//     juste se ferme en vert : ce qui est écrit est vrai, et l'on peut s'y
//     appuyer sans arrière-pensée. C'est la différence essentielle avec la
//     feuille, et elle vaut d'être prise.
//
//   · L'AIDE MONTRE, ELLE N'ÉCRIT PAS. C'est l'astuce imprimée sous la fiche
//     de Rémy — « trouve la ligne ou la colonne où il ne manque qu'une seule
//     information » —, et elle EST la méthode. Elle était ÉCRITE, et Rémy a
//     tranché : « tes phrases son tellement longues et compliquées elles ne
//     seront pas lues pour le remplissage du tableau il faut du visuel tu
//     sélectionnes les cellules tu montres bien ». Le tableau s'éteint donc
//     sauf la piste, ses cases s'allument par rôle dans l'ordre du calcul, et
//     l'opération s'écrit en grand dessous avec les mêmes couleurs — voir
//     `montrerLeGeste`.
//
//     CE QUE CELA CONCÈDE, ET IL FAUT LE SAVOIR : le conseil écrit ne donnait
//     jamais un nombre, et une épreuve le garde encore (« L'AIDE DÉSIGNE LA
//     LIGNE À BOUCLER, JAMAIS LE NOMBRE À ÉCRIRE »). Le geste MONTRÉ, lui,
//     assemble l'opération — 312 − 56 − 63 = ? — et ne laisse que le calcul.
//     Il n'arrive qu'après DEUX erreurs sur la même case, ou sur demande : à ce
//     moment-là l'élève est arrêté, il n'est plus en train de chercher.
//
//   · UN PAVÉ POUR ÉCRIRE, PAS UNE CALCULATRICE. Rémy avait d'abord demandé
//     « l'utilisation pour le début de la calculatrice », puis, au banc
//     d'essai : « n'en crée pas une, rajoute des boutons pour écrire les
//     valeurs numériques ». Il a raison — l'application a déjà sa calculatrice
//     en accès permanent, et ce qui manquait ici n'était pas de calculer mais
//     d'ÉCRIRE, sur une tablette sans clavier. Le pavé écrit dans la case
//     active ; il disparaît au dernier palier, quand on veut que l'addition en
//     colonne se fasse seule.
//
//   · LE TABLEAU ENTIER COMPTE POUR UNE QUESTION. Neuf cases, c'est un exercice,
//     pas neuf. Chaque case juste est enregistrée pour le carnet d'erreurs —
//     c'est bien une soustraction réussie — mais en `partiel` : c'est le
//     TABLEAU fini qui fait avancer le compteur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { meneurDemo } from '../core/meneurDemo.js';
import {
    PALIERS, TAILLES, genererTableau, estDonnee, cle, estTotalLigne, consigneDe,
    estTotalColonne, prochaineLigne, conseil, nomDeLigne, nomDeColonne, totalGeneral
} from '../core/tableauCroise.js';

const COMPETENCE = 'don.tableau.croise';

class TableauCroise extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'tableau-croise');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'facile';
        // D'OÙ VIENNENT LES NOMBRES. « tableau » : ils sont déjà écrits, il
        // n'y a qu'à compléter. « enonce » : ils sont dits en toutes lettres et
        // le tableau part vide — c'est l'exercice que Rémy a demandé, et le
        // travail commence une étape plus tôt, au rangement.
        this.depart = this.params.depart === 'enonce' ? 'enonce' : 'tableau';
        // LA TAILLE DES NOMBRES, RÉGLABLE À PART DU TABLEAU.
        //
        // RÉMY : « il faudrait que dans les premiers niveaux, les calculs
        // soient plus simples (dans les réglages) ». « auto » suit le palier,
        // et c'est le défaut : le réglage ne change rien tant qu'on n'y touche
        // pas, et il ne s'adresse qu'à qui vient le chercher.
        this.taille = TAILLES[this.params.taille] ? this.params.taille : 'auto';
        this.saisies = {};
        // COMBIEN DE FOIS CHAQUE CASE A ÉTÉ RATÉE. C'est le signal « il est
        // bloqué » : voir `valider`. Une case, pas le tableau.
        this.rates = {};
        this.actif = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                /* LE CADRE GRANDIT AVEC SON CONTENU ; C'EST LA PAGE QUI GLISSE.
                   ========================================================
                   RÉMY, capture d'iPhone du 13 octobre : « là c'est tronqué
                   sur téléphone ». Le tableau s'arrêtait au milieu de sa
                   troisième ligne, avec une barre de défilement de quatre
                   pixels au bord pour toute explication.

                   DEUX DÉCLARATIONS FAISAIENT LE DÉFAUT, ET AUCUNE NE SE
                   DEVINE :

                   · « height: 100% » imposait au cadre la hauteur du plateau,
                     quel que soit ce qu'il contient. MESURÉ dans un plateau de
                     354 px : 638 px de contenu, donc 324 px cachés ;
                   · « min-height: 0 » disait au surplus de rétrécir. Le cadre
                     est un élément flex dans une colonne : sans cette ligne il
                     garderait déjà sa taille, avec elle il descend jusqu'à
                     zéro. C'est le même piège que la scène du contre-la-montre,
                     corrigé le même jour.

                   « overflow-y: auto » n'y changeait rien — il rendait le
                   contenu ATTEIGNABLE, pas VISIBLE. Or une ligne de tableau
                   coupée en deux ne se lit pas « il y a la suite plus bas » :
                   elle se lit « c'est cassé ». Et « .canvas-area » sait déjà
                   défiler (overflow-y: auto !important) : une page qui glisse
                   est un geste que tout le monde connaît, une barre de quatre
                   pixels au bord d'un tableau n'en est pas un.

                   MESURÉ APRÈS, aux trois hauteurs : 844 px — RIEN ne change,
                   0 px caché, 0 px à faire glisser. 560 px — 0 px caché (204
                   avant), la page glisse de 196. 440 px — 0 px caché (324
                   avant), la page glisse de 316.

                   « min-height: 100% » garde l'autre bout : quand le contenu
                   est court, le cadre remplit encore le plateau et le tableau
                   reste centré au lieu de se coller en haut. */
                .tc-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; padding: 10px 12px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                    min-height: 100%; flex: 0 0 auto;
                }
                .tc-enonce {
                    text-align: center; max-width: 640px; flex: 0 0 auto;
                    font-size: clamp(12px, 3cqw, 15px); line-height: 1.4;
                }
                .tc-enonce b { font-weight: 800; }
                .tc-corps {
                    display: flex; gap: 14px; align-items: flex-start; justify-content: center;
                    flex-wrap: wrap; width: 100%;
                }
                /* L'OPÉRATION EST COLLÉE AU TABLEAU, PAS À LA PAGE. Vu sur la
                   photo (tools/tmp/tableau-montre.png) : posée sous le corps
                   entier, elle descendait sous la hauteur du PAVÉ NUMÉRIQUE,
                   cent pixels plus bas que les cases dont elle reprend les
                   couleurs — et au téléphone, où le pavé passe sous le
                   tableau, elle serait passée encore dessous. Le lien entre un
                   nombre et sa case ne survit pas à cette distance.
                   min-width: 0 garde le défilement du tableau : sans lui, un
                   élément flex refuse de rétrécir sous son contenu. */
                .tc-pile {
                    display: flex; flex-direction: column; align-items: center;
                    gap: 10px; min-width: 0;
                }

                /* TOUTES LES COLONNES DE JOURS À LA MÊME LARGEUR.
                   RÉMY, capture à l'appui : « le colonne lundi, mardi, mercredi
                   n'ont pas la même taille ». Un tableau se lit en COLONNES, et
                   trois colonnes de largeurs différentes se lisent comme trois
                   choses d'importance différente — « Mercredi » paraissait deux
                   fois plus large que « Lundi » parce qu'il a trois lettres de
                   plus. C'est le défaut par défaut d'un tableau HTML : chaque
                   colonne prend la largeur de son contenu.
                   table-layout: fixed le corrige, mais il déplace la décision :
                   ce sont les largeurs de la PREMIÈRE rangée qui commandent, et
                   le reste ne compte plus. On les écrit donc toutes les deux —
                   celle des en-têtes de colonnes et celle de la colonne des
                   intitulés —, calculées sur le mot le plus long (voir
                   dessinerTableau). Sans la seconde, « En bon état » se
                   retrouverait dans une colonne large de trois caractères. */
                .tc-table { border-collapse: collapse; table-layout: fixed;
                            font-size: clamp(12px, 2.9cqw, 16px); }
                .tc-table th, .tc-table td {
                    border: 1px solid var(--border); padding: 4px 6px; text-align: center;
                    min-width: 3.4em; height: 2.4em;
                    width: calc(var(--tc-col, 8ch) + 1.6em);
                }
                .tc-table thead th:first-child,
                .tc-table .tc-tete-ligne { width: calc(var(--tc-tete, 9ch) + 1.8em); }
                .tc-table th { font-weight: 800; background: var(--bg-hover); }
                /* La ligne et la colonne des totaux se voient : ce sont elles
                   qu'on boucle, et l'élève doit les repérer d'un coup d'œil. */
                .tc-total { background: color-mix(in srgb, var(--primary) 9%, var(--bg-panel)); font-weight: 800; }
                .tc-coin { background: color-mix(in srgb, var(--primary) 16%, var(--bg-panel)); font-weight: 900; }
                .tc-tete-ligne { text-align: left; white-space: nowrap; }

                .tc-case {
                    width: 100%; box-sizing: border-box; border: none; background: transparent;
                    font: inherit; font-weight: 800; text-align: center; color: var(--text-main);
                    padding: 2px; min-width: 3em; -moz-appearance: textfield;
                }
                .tc-case::-webkit-outer-spin-button, .tc-case::-webkit-inner-spin-button {
                    -webkit-appearance: none; margin: 0;
                }
                .tc-case:focus { outline: 2px solid var(--primary); outline-offset: -2px; border-radius: 4px; }
                td:has(> .tc-case) { background: color-mix(in srgb, var(--warning) 12%, var(--bg-panel)); }
                td.tc-juste { background: color-mix(in srgb, var(--success) 20%, var(--bg-panel)); }
                td.tc-faux { background: color-mix(in srgb, var(--danger) 18%, var(--bg-panel)); }
                td.tc-vise { outline: 2px dashed var(--primary); outline-offset: -2px; }

                /* ── MONTRER, PAS ÉCRIRE ───────────────────────────────────
                   RÉMY, après la première correction : « tes phrases son
                   tellement longues et compliquées elles ne seront pas lues
                   pour le remplissage du tableau il faut du visuel tu
                   sélectionnes les cellules tu montres bien ».
                   IL TRANCHE AUTRE CHOSE QUE LA LONGUEUR : ce n'est pas la
                   phrase qui est trop longue, c'est le MÉDIA qui est faux. Un
                   élève arrêté devant un tableau ne lit pas la méthode, il
                   regarde le tableau. Ce que fait un professeur au tableau :
                   il pose le doigt sur la ligne, dit « ici tu as 312 », puis
                   sur les cases déjà remplies, puis sur la case vide. Les
                   nombres viennent des cases qu'il touche, et il n'a pas
                   prononcé une phrase sur la méthode.
                   TOUT S'ÉTEINT SAUF LA PISTE, et c'est le plus fort des
                   quatre gestes : l'élève n'a plus à chercher OÙ regarder. On
                   baisse l'opacité au lieu de masquer — le tableau garde sa
                   taille, donc rien ne bouge sous les doigts. */
                .tc-table.tc-montre td:not(.tc-piste),
                .tc-table.tc-montre th:not(.tc-piste) { opacity: .18; }
                /* LES TROIS RÔLES. Leurs couleurs sont reprises À L'IDENTIQUE
                   sous le tableau, sur les nombres de l'opération : c'est CE
                   LIEN-LÀ qui remplace la phrase, et c'est tout ce que fait le
                   doigt du professeur. */
                .tc-table.tc-montre td.tc-source {
                    background: color-mix(in srgb, var(--primary) 28%, var(--bg-panel));
                }
                .tc-table.tc-montre td.tc-somme {
                    background: color-mix(in srgb, var(--warning) 48%, var(--bg-panel));
                }
                /* LA CIBLE SE RECONNAÎT À SA FORME, PAS À SA TEINTE. Les cinq
                   thèmes ne gardent pas les mêmes écarts entre « --primary » et
                   « --success » : en thème vert, les deux sont verts (#15803d et
                   #22c55e). Un anneau épais sur une case VIDE ne dépend
                   d'aucun thème. */
                .tc-table.tc-montre td.tc-cible {
                    background: var(--bg-panel);
                    outline: 3px solid var(--success); outline-offset: -3px;
                    animation: tc-allume .3s ease-out both, tc-bat 1.1s ease-in-out 5;
                    animation-delay: calc(var(--i, 0) * .16s), calc(var(--i, 0) * .16s + .3s);
                }
                /* ELLES S'ALLUMENT L'UNE APRÈS L'AUTRE, dans l'ordre de
                   l'OPÉRATION et non du tableau : c'est le doigt qui se
                   déplace. Tout allumer d'un coup donne une image à
                   déchiffrer ; en quatre temps, cela se SUIT. L'index « --i »
                   est posé par le code. */
                .tc-table.tc-montre .tc-piste {
                    animation: tc-allume .3s ease-out both;
                    animation-delay: calc(var(--i, 0) * .16s);
                }
                @keyframes tc-allume {
                    from { background-color: var(--bg-panel); outline-color: transparent; }
                }
                @keyframes tc-bat {
                    0%, 100% { outline-offset: -3px; }
                    50% { outline-offset: 3px; }
                }
                @keyframes tc-paraitre {
                    from { opacity: 0; transform: translateY(-5px); }
                }
                /* L'OPÉRATION, EN GRAND, SOUS LE TABLEAU. Chaque nombre porte
                   la couleur de SA case : « 312 − 56 − 63 = ? » se lit sans un
                   mot de français. */
                .tc-geste {
                    display: flex; gap: 4px; align-items: center; justify-content: center;
                    flex-wrap: wrap; flex: 0 0 auto; font-weight: 900;
                    font-size: clamp(17px, 5.5cqw, 30px);
                    animation: tc-paraitre .3s ease-out both;
                    animation-delay: var(--retard, 0s);
                }
                /* SANS CETTE LIGNE, L'OPÉRATION RESTE AFFICHÉE TOUT LE JEU :
                   un « display: flex » écrit dans une classe l'emporte sur le
                   « hidden » du navigateur. Le défaut a déjà été payé une fois,
                   sur l'écran de fin de Math Crush, et il ne lève aucune
                   erreur — il se voit seulement à l'œil. */
                .tc-geste[hidden] { display: none; }
                .tc-geste span { padding: 1px 9px; border-radius: 8px; }
                .tc-geste .g-src { background: color-mix(in srgb, var(--primary) 28%, var(--bg-panel)); }
                .tc-geste .g-tot { background: color-mix(in srgb, var(--warning) 48%, var(--bg-panel)); }
                .tc-geste .g-cib {
                    outline: 2px solid var(--success); outline-offset: -2px;
                    color: var(--text-muted);
                }
                .tc-geste .g-op { color: var(--text-muted); font-weight: 800; padding: 0 1px; }
                /* QUI NE SUPPORTE PAS LES ANIMATIONS VOIT TOUT, D'UN COUP. Le
                   geste vaut surtout par son ORDRE ; sans l'ordre il reste les
                   trois couleurs, l'anneau et l'opération, et c'est
                   l'essentiel. */
                @media (prefers-reduced-motion: reduce) {
                    .tc-table.tc-montre .tc-piste,
                    .tc-table.tc-montre td.tc-cible,
                    .tc-geste { animation: none; }
                }

                /* --- Le pavé numérique --- */
                .tc-calc {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;
                    width: 168px; flex: 0 0 auto;
                }
                .tc-calc-titre {
                    grid-column: 1 / -1; text-align: center; font-size: .75rem;
                    color: var(--text-muted); font-weight: 700;
                }
                .tc-touche {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 8px; cursor: pointer; font: inherit; font-weight: 800;
                    font-size: 1.05rem; padding: 9px 0; min-height: 40px;
                }
                .tc-touche:active { background: var(--bg-hover); }
                .tc-touche--eff { color: var(--danger); font-size: .95rem; }
                .tc-touche--ok { color: var(--success); font-size: .95rem; }

                .tc-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .tc-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                /* LE BOUTON D'AIDE SE RAPPELLE À L'ŒIL, après deux erreurs sur
                   la même case. Rémy : « est ce que quand l'élève fait beaucoup
                   d'erreurs on fait clignoter le bouton indice ».
                   EN AMBRE, comme la calculatrice disponible, et pour la même
                   raison : c'est la couleur que le dépôt réserve à « regarde
                   ici », et elle n'est utilisée nulle part ailleurs dans cette
                   barre. Trois battements puis plus rien — un bouton qui
                   clignote sans fin cesse d'être vu et devient agaçant. */
                .tc-btn--appel { animation: tc-appel 1.25s ease-out 3; }
                @keyframes tc-appel {
                    0%, 100% { box-shadow: none; transform: scale(1); }
                    35% { box-shadow: 0 0 0 6px var(--warning); transform: scale(1.1); }
                    70% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--warning) 0%, transparent); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .tc-btn--appel { animation: none;
                                     box-shadow: 0 0 0 3px var(--warning); }
                }
                .tc-note {
                    min-height: 2.4em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 640px; flex: 0 0 auto;
                }
                .tc-note--ok { color: var(--success); font-weight: 700; }
                .tc-note--ko { color: var(--danger); font-weight: 600; }

                /* LA LISTE DES DONNÉES DE L'ÉNONCÉ. Deux colonnes dès qu'il y
                   a la place : douze puces en file indienne repoussaient le
                   tableau hors de l'écran. */
                .tc-faits {
                    margin: 8px auto 0; padding: 0 0 0 18px; text-align: left;
                    max-width: 620px; columns: 2; column-gap: 22px;
                    font-size: .88rem; line-height: 1.5;
                }
                .tc-faits li { break-inside: avoid; margin-bottom: 2px; }
                /* Rangée : barrée et pâlie. On la garde à l'écran — c'est une
                   donnée du problème, on peut avoir à la relire. */
                .tc-fait--pose { text-decoration: line-through; opacity: .45; }
                /* ET CELLE QU'IL FAUT RANGER MAINTENANT S'ALLUME. Sur douze
                   puces, « reprends l'énoncé : "…" » demandait de retrouver la
                   phrase des yeux avant de pouvoir la ranger. */
                .tc-fait--vise {
                    background: color-mix(in srgb, var(--warning) 38%, transparent);
                    border-radius: 5px; font-weight: 800; opacity: 1;
                }
                @container (max-width: 620px) { .tc-faits { columns: 1; font-size: .82rem; } }

                /* Sur un téléphone, la calculatrice passe SOUS le tableau :
                   côte à côte, le tableau se serrerait jusqu'à l'illisible. */
                @container (max-width: 620px) {
                    .tc-corps { flex-direction: column; align-items: center; }
                    .tc-calc { width: min(260px, 100%); grid-template-columns: repeat(4, 1fr); }
                    .tc-table { font-size: clamp(11px, 3.4cqw, 15px); }
                    .tc-table th, .tc-table td { padding: 3px 4px; min-width: 2.9em; }
                    /* LE TABLEAU DÉFILE DANS SON CADRE PLUTÔT QUE DE SORTIR.
                       MESURÉ au doigt, au pire tirage sur huit — des en-têtes
                       longs comme « Pointure 36 » : 361 px de tableau dans un
                       cadre de 320 à 360 px de fenêtre, 81 px dehors à 320. Et
                       la colonne coupée est celle des TOTAUX — celle que
                       l'exercice demande de compléter, et sur laquelle repose
                       sa consigne (« la ligne ou la colonne où il ne manque
                       QU'UNE SEULE information »). Elle était invisible à
                       l'arrivée. */
                    [data-table] { max-width: 100%; overflow-x: auto; }
                }
            </style>
            <div class="tc-wrap">
                <div class="tc-enonce" data-enonce></div>
                <div class="tc-corps">
                    <div class="tc-pile">
                        <div data-table></div>
                        <div class="tc-geste" data-geste hidden aria-live="polite"></div>
                    </div>
                    <div class="tc-calc" data-calc hidden></div>
                </div>
                <div class="tc-barre">
                    <button type="button" class="tc-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="tc-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="tc-btn" data-neuf>Autre tableau</button>
                </div>
                <div class="tc-note" data-note></div>
            </div>`;

        this.enonceEl = this.container.querySelector('[data-enonce]');
        this.tableEl = this.container.querySelector('[data-table]');
        this.calcEl = this.container.querySelector('[data-calc]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.gesteEl = this.container.querySelector('[data-geste]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.tableau = genererTableau({ rng: this.rng, palier: this.palier,
            depart: this.depart, taille: this.taille });
        if (!this.tableau) return false;
        this.saisies = {};
        this.rates = {};
        this.fini = false;
        this.dessiner();
        this.note(consigneDe(this.tableau));
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.tableau) return;
        this.saisies = {};
        this.rates = {};
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const t = this.tableau;
        // L'ÉNONCÉ PORTE LES DONNÉES, quand elles n'ont pas été écrites dans le
        // tableau. Une LISTE, et non un paragraphe : douze faits dans une seule
        // phrase à rallonge, on en perd la moitié en cours de route — et l'on
        // veut pouvoir cocher mentalement ce qu'on a déjà reporté.
        const faits = (t.depart === 'enonce' && t.donnees)
            ? `<ul class="tc-faits">${t.donnees.map(d => {
                const pose = Number(this.saisies[cle(d.r, d.c)]) === d.valeur;
                // La puce ouvre une phrase : elle prend la majuscule. Dans la
                // fiche imprimée les mêmes faits s'enchaînent après « On sait
                // que : », et y restent en minuscules — c'est la même règle.
                const dit = d.phrase.charAt(0).toUpperCase() + d.phrase.slice(1);
                return `<li class="${pose ? 'tc-fait--pose' : ''}">${echapper(dit)}</li>`;
            }).join('')}</ul>`
            : '';
        this.enonceEl.innerHTML = `<b>${echapper(t.titre)}</b><br>${echapper(t.phrase)} `
            + (t.depart === 'enonce'
                ? 'Reporte ces informations dans le tableau, puis complète-le.'
                : 'Complète les valeurs manquantes.')
            + faits;

        // LA LARGEUR SE CALCULE SUR LE MOT LE PLUS LONG, ET ELLE VAUT POUR
        // TOUTES. Rémy : « le colonne lundi, mardi, mercredi n'ont pas la même
        // taille ». Les en-têtes viennent de l'énoncé — des jours, des parfums,
        // des classes —, donc aucune largeur écrite à la main ne tiendrait :
        // « Lun. » et « Après-midi » ne demandent pas la même chose. On mesure
        // en `ch`, la largeur d'un chiffre, et l'on ajoute de quoi loger la
        // bordure et les marges intérieures.
        const long = (mots, plancher) =>
            Math.max(plancher, ...mots.map((m) => String(m || '').length));
        const larg = long([...t.colonnes, 'Total'], 5);
        const largTete = long([...t.lignes, 'Total'], 6);
        let html = `<table class="tc-table" style="--tc-col: ${larg}ch; --tc-tete: ${largTete}ch">`
            + '<thead><tr><th></th>';
        // LES EN-TÊTES PORTENT LEUR INDEX, et les cases DONNÉES un `data-cell`
        // comme les autres : le geste (`montrerLeGeste`) doit pouvoir allumer
        // une case déjà remplie, et c'est justement celles-là qu'il montre.
        t.colonnes.forEach((c, i) => { html += `<th data-tete-col="${i}">${echapper(c)}</th>`; });
        html += `<th class="tc-total" data-tete-col="${t.C}">Total</th></tr></thead><tbody>`;
        for (let r = 0; r <= t.R; r++) {
            const totalL = estTotalLigne(t, r);
            html += `<tr><th class="tc-tete-ligne${totalL ? ' tc-total' : ''}" data-tete-ligne="${r}">`
                + `${totalL ? 'Total' : echapper(t.lignes[r])}</th>`;
            for (let c = 0; c <= t.C; c++) {
                const totalC = estTotalColonne(t, c);
                const classes = [];
                if (totalL || totalC) classes.push(totalL && totalC ? 'tc-coin' : 'tc-total');
                if (estDonnee(t, r, c)) {
                    html += `<td class="${classes.join(' ')}" data-cell="${r},${c}">`
                        + `${t.valeurs[r][c]}</td>`;
                    continue;
                }
                const saisie = this.saisies[cle(r, c)];
                const juste = saisie !== undefined && Number(saisie) === t.valeurs[r][c];
                const faux = saisie !== undefined && saisie !== '' && !juste;
                if (juste) classes.push('tc-juste');
                else if (faux) classes.push('tc-faux');
                html += `<td class="${classes.join(' ')}" data-cell="${r},${c}">`
                    + `<input class="tc-case" type="number" inputmode="numeric"
                        data-r="${r}" data-c="${c}" value="${saisie === undefined ? '' : saisie}"
                        ${juste ? 'readonly' : ''} aria-label="${echapper(this.nomDeCase(r, c))}"></td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        this.tableEl.innerHTML = html;
        this.brancherCases();
        this.dessinerPave();
        // LE TABLEAU EST NEUF : rien n'est éteint, rien n'est teinté, et le
        // bandeau de l'opération ne parle plus d'un tableau qui n'existe plus.
        this.effacerLeGeste();
    }

    nomDeCase(r, c) {
        const t = this.tableau;
        const l = estTotalLigne(t, r) ? 'Total' : t.lignes[r];
        const k = estTotalColonne(t, c) ? 'Total' : t.colonnes[c];
        return `${l}, ${k}`;
    }

    brancherCases() {
        if (this.isDemo) return;
        this.tableEl.querySelectorAll('.tc-case').forEach(el => {
            // On valide à la sortie du champ et sur Entrée, jamais à la frappe :
            // « 4 » en route vers « 42 » n'est pas une erreur, et la compter
            // en serait une.
            el.onblur = () => this.valider(el);
            el.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
            // La case ACTIVE, celle où le pavé numérique écrit.
            el.onfocus = () => {
                this.actif = { r: Number(el.dataset.r), c: Number(el.dataset.c) };
                // LE GESTE S'EFFACE DÈS QU'IL VA TRAVAILLER AILLEURS. S'il
                // clique la case qu'on lui montre, on ne touche à rien : il
                // fait exactement ce qu'on lui demande, et il a encore besoin
                // des couleurs et de l'opération sous les yeux.
                const td = el.closest('td');
                if (!td || !td.classList.contains('tc-cible')) this.effacerLeGeste();
            };
        });
    }

    /** Le champ de la case active, ou le premier champ libre s'il n'y en a pas. */
    champActif() {
        const cible = this.actif
            && this.tableEl.querySelector(`.tc-case[data-r="${this.actif.r}"][data-c="${this.actif.c}"]`);
        if (cible && !cible.hasAttribute('readonly')) return cible;
        return this.tableEl.querySelector('.tc-case:not([readonly])');
    }

    /**
     * ON NE REDESSINE QUE LA CASE, PAS TOUT LE TABLEAU.
     *
     * Rémy, banc d'essai : « à l'ordinateur, je ne peux pas taper les valeurs ».
     * Mesuré : on pouvait en taper UNE. La validation se faisait à la sortie du
     * champ et redessinait la table entière — donc, au moment précis où l'élève
     * cliquait sur la case suivante, l'élément visé était détruit et le clic
     * tombait dans le vide. Une seule valeur passait, et le tableau semblait
     * refuser le clavier.
     */
    majCase(r, c) {
        const td = this.tableEl.querySelector(`[data-cell="${r},${c}"]`);
        if (!td) return;
        const saisie = this.saisies[cle(r, c)];
        const juste = saisie !== undefined && Number(saisie) === this.tableau.valeurs[r][c];
        const faux = saisie !== undefined && saisie !== '' && !juste;
        td.classList.toggle('tc-juste', juste);
        td.classList.toggle('tc-faux', faux);
        const champ = td.querySelector('.tc-case');
        if (champ) {
            champ.value = saisie === undefined ? '' : saisie;
            // Une case juste se ferme : ce qui est écrit est vrai, on peut
            // s'appuyer dessus sans arrière-pensée.
            if (juste) champ.setAttribute('readonly', 'readonly');
            else champ.removeAttribute('readonly');
        }
        this.majFaits();
    }

    /**
     * LA PHRASE RANGÉE SE BARRE. Sur douze faits à reporter, on perd le fil de
     * ce qu'on a déjà placé et l'on recommence deux fois le même — c'est ce que
     * fait n'importe qui devant une liste, et c'est pour cela qu'on coche.
     */
    majFaits() {
        const t = this.tableau;
        if (!t || t.depart !== 'enonce' || !t.donnees) return;
        const items = this.enonceEl.querySelectorAll('.tc-faits li');
        t.donnees.forEach((d, i) => {
            if (!items[i]) return;
            items[i].classList.toggle('tc-fait--pose',
                Number(this.saisies[cle(d.r, d.c)]) === d.valeur);
        });
    }

    valider(el) {
        if (this.isDemo || this.fini) return;
        const r = Number(el.dataset.r), c = Number(el.dataset.c);
        const brut = (el.value || '').trim();
        if (brut === '') { delete this.saisies[cle(r, c)]; this.majCase(r, c); return; }
        const n = Number(brut);
        const attendu = this.tableau.valeurs[r][c];
        this.saisies[cle(r, c)] = brut;
        if (n === attendu) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `${this.tableau.titre} — case « ${this.nomDeCase(r, c)} »`,
                expected: String(attendu), given: brut, points: 6,
                // Une case n'est pas une question : c'est le TABLEAU fini qui
                // fait avancer le compteur.
                partiel: true
            });
            this.majCase(r, c);
            // UNE CASE JUSTE OUVRE LA SUIVANTE, ET ON LA MONTRE. La phrase
            // disait « Regarde la ligne "Total" : il n'y manque qu'une seule
            // case » ; le cercle dit la même chose et se voit sans être lu.
            // Rémy : « il faut du visuel tu sélectionnes les cellules ».
            if (this.reste()) {
                this.effacerLeGeste();
                this.note('');
                this.viser();
            } else this.gagner();
            return;
        }
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `${this.tableau.titre} — case « ${this.nomDeCase(r, c)} »`,
            input: brut, expected: String(attendu), partiel: true, silencieux: true
        });
        this.majCase(r, c);

        // ── DEUX FOIS SUR LA MÊME CASE : L'AIDE VIENT À LUI ─────────────────
        //
        // RÉMY : « des élèves en difficulté ont eu pas mal de soucis sur les
        // tableaux à compléter […] est ce que quand l'élève fait beaucoup
        // d'erreurs on fait clignoter le bouton indice ».
        //
        // LE SIGNAL EST LA CASE, PAS LE TABLEAU. Huit erreurs réparties sur
        // huit cases, c'est un élève qui tâtonne et qui avance. DEUX sur la
        // MÊME case, c'est un élève bloqué : la première erreur apprend
        // quelque chose — l'explication dit laquelle —, la seconde dit qu'elle
        // n'a pas suffi.
        //
        // ET L'AIDE EXISTAIT DÉJÀ, GRATUITE ET ILLIMITÉE. Le défaut n'était
        // pas son absence : celui qui sait que « Aide-moi » va l'aider n'en a
        // pas besoin, et celui qui en a besoin ne le sait pas. On ne lui
        // demande donc plus de la demander.
        //
        // ON LE RENVOIE VERS UNE AUTRE CASE, et c'est la méthode même de cet
        // exercice : quand une case résiste, c'est souvent qu'il lui manque
        // encore une valeur. `conseil` désigne celle où il ne manque plus
        // rien, et on l'entoure.
        const k = cle(r, c);
        this.rates[k] = (this.rates[k] || 0) + 1;
        if (this.rates[k] >= 2) {
            this.aider(this.pourquoiFaux(r, c, n));
            return;
        }
        this.note(this.pourquoiFaux(r, c, n), 'ko');
    }

    /**
     * DEUX MOTS ET UNE FLÈCHE.
     *
     * La version longue expliquait la méthode sous la case fausse — « cette
     * case est DANS le tableau, pas dans les totaux : on part du total de sa
     * ligne et on RETIRE ce qu'on y a déjà ». Trente-deux mots, et Rémy a
     * tranché : « tes phrases son tellement longues et compliquées elles ne
     * seront pas lues ».
     *
     * LA MÉTHODE SE MONTRE MAINTENANT SUR LE TABLEAU (montrerLeGeste), et il
     * ne reste ici que le sens dans lequel aller. La flèche le porte seule :
     * elle se lit sans lire.
     *
     * CE QUE ÇA DONNE EN PLUS QU'AVANT, ET C'EST ASSUMÉ : l'ancienne version
     * ne disait « trop grand » que pour une case du corps, et « trop petit »
     * que pour un total — ailleurs, un « ce n'est pas ça » sans direction.
     * Donner le sens à chaque fois ouvre un tâtonnement par encadrement ; mais
     * le nombre de cette case se DÉDUIT, il n'est pas à devinette, et l'élève
     * qui approche 97, 96, 95 n'apprenait de toute façon rien avec la phrase.
     */
    pourquoiFaux(r, c, n) {
        const attendu = this.tableau.valeurs[r][c];
        if (n > attendu) return '↓ Trop grand';
        if (n < attendu) return '↑ Trop petit';
        return 'Pas ça';
    }

    reste() {
        const t = this.tableau;
        let n = 0;
        for (let r = 0; r <= t.R; r++) {
            for (let c = 0; c <= t.C; c++) {
                if (estDonnee(t, r, c)) continue;
                if (Number(this.saisies[cle(r, c)]) !== t.valeurs[r][c]) n++;
            }
        }
        return n;
    }

    gagner() {
        this.fini = true;
        // LE TABLEAU EST FINI : plus rien à montrer, et une opération qui
        // resterait sous un tableau complet se lirait comme un reproche.
        this.effacerLeGeste();
        this.note(`✅ Tableau complet — ${totalGeneral(this.tableau)} ${this.tableau.unite} en tout.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${this.tableau.titre} — tableau complété`,
            expected: `${this.tableau.trous} cases`, given: `${this.tableau.trous} cases`,
            points: 10 + this.tableau.trous * 2
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
    }

    /**
     * L'AIDE, DANS L'ORDRE : ON MONTRE, PUIS ON MONTRE AUTREMENT, ET L'ON
     * N'ÉCRIT QU'EN DERNIER RECOURS.
     *
     * `pourquoi` est rempli quand l'aide arrive SANS qu'on l'ait demandée,
     * après deux erreurs sur la même case. On garde alors sa flèche — deux
     * mots, elle tient sur la même ligne que rien d'autre.
     */
    aider(pourquoi = '') {
        if (this.isDemo || !this.tableau) return;
        const ton = pourquoi ? 'ko' : undefined;
        // RANGER AVANT DE CALCULER. Tant qu'une phrase de l'énoncé n'est pas
        // reportée, il n'y a RIEN à déduire : montrer une ligne enverrait
        // l'élève chercher un raisonnement là où il lui manque une lecture.
        if (this.montrerLeReport()) {
            this.note(pourquoi || 'Cette phrase, dans cette case.', ton);
            this.appeler(pourquoi);
            return;
        }
        if (this.montrerLeGeste()) {
            this.note(pourquoi, ton);
            this.appeler(pourquoi);
            return;
        }
        // LE SEUL CAS QU'ON NE SAIT PAS MONTRER : tout est rempli, et quelque
        // chose ne tombe pas juste. Il n'y a alors aucune case à désigner —
        // c'est tout le tableau qu'il faut relire, et ça, ça s'écrit.
        this.effacerLeGeste();
        this.note(conseil(this.tableau, this.saisies));
        this.appeler(pourquoi);
    }

    /**
     * LE BOUTON SE RAPPELLE À L'ŒIL, mais seulement quand l'aide est venue
     * toute seule : le faire battre quand l'élève vient de le toucher serait
     * lui répondre « j'ai bien vu que tu m'as touché ».
     */
    appeler(spontanee) {
        if (!spontanee) return;
        const b = this.container.querySelector('[data-aide]');
        if (!b) return;
        // On retire la classe et l'on force un reflow avant de la remettre,
        // sans quoi l'animation ne rejoue pas la fois suivante : pour le
        // navigateur, rien n'a changé.
        b.classList.remove('tc-btn--appel');
        void b.offsetWidth;
        b.classList.add('tc-btn--appel');
    }

    /**
     * MONTRER LE CALCUL SUR LE TABLEAU, SANS L'ÉCRIRE.
     *
     * RÉMY : « il faut du visuel tu sélectionnes les cellules tu montres bien ».
     *
     * On éteint tout sauf la ligne (ou la colonne) où il ne manque qu'une
     * case ; on teinte ses cases par leur RÔLE — le total, les nombres connus,
     * la case qui manque ; on les allume l'une après l'autre dans l'ordre du
     * CALCUL et non du tableau ; et l'opération s'écrit en grand dessous avec
     * les mêmes couleurs. C'est le doigt du professeur, et il n'y a pas une
     * phrase à lire.
     *
     * @returns {boolean} faux quand rien n'est déductible — il reste alors la
     *          phrase écrite, en dernier recours.
     */
    montrerLeGeste() {
        const t = this.tableau;
        this.effacerLeGeste();
        const table = this.tableEl.querySelector('.tc-table');
        const suite = table && prochaineLigne(t, this.saisies);
        if (!suite) return false;
        const ligne = suite.sens === 'ligne';
        const [rc, cc] = suite.case;
        const dernier = ligne ? t.C : t.R;
        const cibleEstTotal = ligne ? cc === t.C : rc === t.R;

        // LA CASE VISÉE SE VIDE. Quand c'est celle sur laquelle il s'est trompé
        // deux fois, garder son nombre faux sous le nez pendant qu'on lui
        // montre le calcul, c'est lui demander de lire par-dessus — et le « ? »
        // de l'opération ne veut rien dire si la case porte déjà un nombre.
        if (this.saisies[cle(rc, cc)] !== undefined) {
            delete this.saisies[cle(rc, cc)];
            this.majCase(rc, cc);
        }

        const bouts = [];
        let i = 1;
        const allumer = (r, c, role, classe) => {
            const td = table.querySelector(`[data-cell="${r},${c}"]`);
            if (td) {
                td.classList.add('tc-piste', role);
                td.style.setProperty('--i', String(i));
            }
            bouts.push({ classe, texte: String(t.valeurs[r][c]) });
            i++;
        };

        // L'EN-TÊTE S'ALLUME LE PREMIER : c'est lui qui dit DE QUOI on parle, et
        // le doigt commence toujours par là.
        const tete = table.querySelector(ligne
            ? `[data-tete-ligne="${suite.indice}"]` : `[data-tete-col="${suite.indice}"]`);
        if (tete) { tete.classList.add('tc-piste'); tete.style.setProperty('--i', '0'); }

        // LE TOTAL D'ABORD QUAND C'EST UNE SOUSTRACTION : on allume dans l'ordre
        // où l'on écrit l'opération, pas dans l'ordre du tableau.
        if (!cibleEstTotal) {
            allumer(ligne ? suite.indice : t.R, ligne ? t.C : suite.indice, 'tc-somme', 'g-tot');
        }
        for (let k = 0; k <= dernier; k++) {
            const r = ligne ? suite.indice : k;
            const c = ligne ? k : suite.indice;
            if (r === rc && c === cc) continue;                 // la case qui manque
            if (!cibleEstTotal && k === dernier) continue;      // le total : déjà posé
            if (bouts.length) bouts.push({ classe: 'g-op', texte: cibleEstTotal ? '+' : '−' });
            allumer(r, c, 'tc-source', 'g-src');
        }
        const cible = table.querySelector(`[data-cell="${rc},${cc}"]`);
        if (cible) {
            cible.classList.add('tc-piste', 'tc-cible');
            cible.style.setProperty('--i', String(i));
        }
        bouts.push({ classe: 'g-op', texte: '=' }, { classe: 'g-cib', texte: '?' });

        table.classList.add('tc-montre');
        this.gesteEl.innerHTML = bouts
            .map(b => `<span class="${b.classe}">${b.texte}</span>`).join('');
        // L'OPÉRATION ARRIVE APRÈS LES CASES, sinon elle donne la réponse du
        // film avant le film : c'est l'ordre des cases qui porte le sens.
        this.gesteEl.style.setProperty('--retard', `${((i + 1) * 0.16).toFixed(2)}s`);
        this.gesteEl.hidden = false;
        // ET LE FOYER VA DANS LA CASE MONTRÉE : sur une tablette, le pavé
        // numérique écrit dans la case ACTIVE. Sans ce foyer, l'élève tape dans
        // celle d'avant.
        const champ = cible && cible.querySelector('.tc-case');
        if (champ) champ.focus();
        // ET ON LA RAMÈNE AU MILIEU. Mesuré au doigt (390 px, photo
        // tools/tmp/tableau-doigt.png) : le tableau déborde de son cadre et
        // glisse, le foyer y amène bien la case montrée — mais COLLÉE au bord,
        // l'anneau coupé. Le navigateur fait le minimum ; on lui demande le
        // milieu, qui est là où l'on pose le doigt.
        if (cible && cible.scrollIntoView) {
            cible.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
        return true;
    }

    /**
     * AVANT DE CALCULER, IL FAUT RANGER — et c'est l'étape qu'on rate quand le
     * tableau part vide. On montre donc LA PHRASE et LA CASE où elle va,
     * ensemble : la ligne et la colonne qui se croisent là s'allument, et la
     * phrase s'allume dans la liste. C'est le geste du doigt qui descend la
     * colonne puis traverse la ligne.
     */
    montrerLeReport() {
        const t = this.tableau;
        if (t.depart !== 'enonce' || !t.donnees) return false;
        const i = t.donnees.findIndex(d => Number(this.saisies[cle(d.r, d.c)]) !== d.valeur);
        if (i < 0) return false;
        const d = t.donnees[i];
        const table = this.tableEl.querySelector('.tc-table');
        const td = table && table.querySelector(`[data-cell="${d.r},${d.c}"]`);
        if (!td) return false;
        this.effacerLeGeste();
        [table.querySelector(`[data-tete-ligne="${d.r}"]`),
            table.querySelector(`[data-tete-col="${d.c}"]`)].forEach((el, k) => {
            if (!el) return;
            el.classList.add('tc-piste');
            el.style.setProperty('--i', String(k));
        });
        td.classList.add('tc-piste', 'tc-cible');
        td.style.setProperty('--i', '2');
        table.classList.add('tc-montre');
        const items = this.enonceEl.querySelectorAll('.tc-faits li');
        if (items[i]) items[i].classList.add('tc-fait--vise');
        const champ = td.querySelector('.tc-case');
        if (champ) champ.focus();
        return true;
    }

    /** On remet le tableau comme il était : rien d'éteint, rien de teinté. */
    effacerLeGeste() {
        if (!this.tableEl) return;
        const table = this.tableEl.querySelector('.tc-table');
        if (table) table.classList.remove('tc-montre');
        this.tableEl.querySelectorAll('.tc-piste, .tc-vise').forEach((el) => {
            el.classList.remove('tc-piste', 'tc-source', 'tc-somme', 'tc-cible', 'tc-vise');
            el.style.removeProperty('--i');
        });
        if (this.enonceEl) {
            this.enonceEl.querySelectorAll('.tc-fait--vise')
                .forEach(el => el.classList.remove('tc-fait--vise'));
        }
        if (this.gesteEl) { this.gesteEl.hidden = true; this.gesteEl.innerHTML = ''; }
    }

    /**
     * LE CERCLE SEUL, après une case juste. On ne monte PAS le geste complet
     * ici : un élève qui enchaîne n'a pas besoin qu'on éteigne son tableau sous
     * ses yeux à chaque bonne réponse. Il a besoin de savoir où aller, et le
     * cercle le dit.
     */
    viser() {
        if (!this.tableEl) return;
        this.tableEl.querySelectorAll('.tc-vise').forEach(el => el.classList.remove('tc-vise'));
        const suite = prochaineLigne(this.tableau, this.saisies);
        if (!suite) return;
        const td = this.tableEl.querySelector(`[data-cell="${suite.case[0]},${suite.case[1]}"]`);
        if (td) td.classList.add('tc-vise');
    }

    montrerSolution() {
        if (!this.tableau) return false;
        const t = this.tableau;
        for (let r = 0; r <= t.R; r++) {
            for (let c = 0; c <= t.C; c++) {
                if (!estDonnee(t, r, c)) this.saisies[cle(r, c)] = String(t.valeurs[r][c]);
            }
        }
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tc-note' + (ton ? ` tc-note--${ton}` : '');
    }

    // --- Le pavé numérique --------------------------------------------------
    //
    // Rémy, banc d'essai : « pour la calculatrice, on a un bouton calculatrice
    // dont on peut se servir. N'en crée pas une, rajoute des boutons pour
    // écrire les valeurs numériques. »
    //
    // Il a raison deux fois. L'application a déjà sa calculatrice, en accès
    // permanent : en refaire une dans l'exercice, c'était deux calculatrices
    // différentes dans la même fenêtre. Et surtout, ce n'est pas de calculer
    // que l'élève avait besoin ici — c'est d'ÉCRIRE, sur une tablette où il n'y
    // a pas de clavier. Le pavé écrit donc dans la case active.

    dessinerPave() {
        const active = !!(this.tableau && this.tableau.calculatrice);
        this.calcEl.hidden = !active;
        if (!active) return;
        if (this.calcEl.childElementCount) return;
        let html = '<div class="tc-calc-titre">Écrire dans la case</div>';
        ['7', '8', '9', '4', '5', '6', '1', '2', '3'].forEach(t => {
            html += `<button type="button" class="tc-touche" data-touche="${t}">${t}</button>`;
        });
        html += '<button type="button" class="tc-touche tc-touche--eff" data-touche="eff">⌫</button>';
        html += '<button type="button" class="tc-touche" data-touche="0">0</button>';
        html += '<button type="button" class="tc-touche tc-touche--ok" data-touche="ok">✓</button>';
        this.calcEl.innerHTML = html;
        this.calcEl.querySelectorAll('[data-touche]').forEach(b => {
            // `mousedown` plutôt que `click`, et on empêche le défaut : sinon
            // le bouton prend le focus, la case le perd, et le chiffre suivant
            // n'a plus où aller.
            b.onmousedown = (e) => { e.preventDefault(); this.taper(b.dataset.touche); };
            b.ontouchstart = (e) => { e.preventDefault(); this.taper(b.dataset.touche); };
        });
    }

    taper(t) {
        if (this.isDemo || this.fini) return;
        const champ = this.champActif();
        if (!champ) return;
        champ.focus();
        if (t === 'ok') { champ.blur(); return; }
        if (t === 'eff') { champ.value = champ.value.slice(0, -1); return; }
        // Trois chiffres suffisent : au-delà, c'est une faute de frappe.
        if (champ.value.length < 3) champ.value += t;
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const robot = meneurDemo(cur, gate, () => this.isRunning, () => { this.demoCursor = null; this.demoGate = null; });
        const fin = () => robot.fin();

        if (!this.tableau) this.poser();
        const t = this.tableau;
        if (!await robot.pause(500)) return fin();
        // UNE SEULE IDÉE, LE GESTE DE CHERCHER : « celle-là, je peux la boucler tout de
        // suite » redisait la même chose en plus long, et au-delà de 110 caractères la
        // bulle se lit si lentement qu'on croit la démonstration plantée
        // (js/core/activities/choice.js, COURT).
        cur.say('Je cherche la ligne ou la colonne où il ne manque QU\'UNE SEULE case.', this.tableEl);
        if (!await robot.pause(DEMO_SPEED.between)) return fin();

        for (let k = 0; k < 3; k++) {
            const suite = prochaineLigne(t, this.saisies);
            if (!suite) break;
            const [r, c] = suite.case;
            const ou = suite.sens === 'ligne' ? nomDeLigne(t, r) : nomDeColonne(t, c);
            const estTotal = estTotalLigne(t, r) || estTotalColonne(t, c);
            const td = this.tableEl.querySelector(`[data-cell="${r},${c}"]`);
            if (!await robot.tour()) return fin();
            cur.say(estTotal
                ? `Dans ${ou}, la case qui manque est un TOTAL : j'additionne tout le reste.`
                : `Dans ${ou}, il ne manque que celle-ci. Elle est dans le corps du tableau : `
                  + 'je pars du total et je RETIRE ce qui est déjà écrit.', td || this.tableEl);
            if (td && !await cur.tap(td)) return fin();
            this.saisies[cle(r, c)] = String(t.valeurs[r][c]);
            this.dessiner();
            if (!await robot.pause(DEMO_SPEED.settle)) return fin();
        }

        if (!await robot.tour()) return fin();
        cur.say('Et chaque case que je viens d\'écrire en ouvre d\'autres.', this.tableEl);
        if (!await robot.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

const echapper = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function engineTableauCroise(container, isDemo, params) {
    const jeu = new TableauCroise(container, isDemo, params);
    jeu.start();
    return jeu;
}
