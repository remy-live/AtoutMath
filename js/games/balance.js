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
    preparerNiveau, niveauxDisponibles, appliquer, resolu, solution, enSymboles, coups
} from '../core/balance.js';
import { makeRng } from '../core/ids.js';

// UNE SEULE COMPÉTENCE, et c'est un choix. La balance travaille aussi le geste
// « faire la même chose des deux côtés », qu'on serait tenté de déclarer à part.
// On s'en abstient : une compétence que rien ne mesure vraiment est une
// compétence fantôme, et on vient d'en corriger une dans ce dépôt.
const COMPETENCE = 'alg.equation.resoudre';

const enTexte = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Les diviseurs plausibles proposés en boutons : ceux qui divisent une boîte. */
function partagesPossibles(etat) {
    const out = [];
    for (let n = 2; n <= 9; n++) if (appliquer(etat, { geste: 'partager', en: n }).ok) out.push(n);
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
                .bl-scene { flex: 1 1 auto; min-height: 0; display: block; width: 100%; }
                .bl-svg { width: 100%; height: 100%; display: block; }
                .bl-barre {
                    stroke: var(--text-main); stroke-width: 3.5; stroke-linecap: round;
                    transition: transform .55s cubic-bezier(.34,1.3,.64,1);
                    transform-box: fill-box; transform-origin: center;
                }
                .bl-mat, .bl-socle { stroke: var(--text-main); stroke-width: 3.5; stroke-linecap: round; }
                .bl-fil { stroke: var(--text-muted); stroke-width: 1.4; }
                .bl-plateau {
                    fill: var(--card-bg, #fff); stroke: var(--text-main); stroke-width: 2.4;
                }
                .bl-jeton { cursor: pointer; }
                .bl-jeton rect, .bl-jeton circle { transition: opacity .18s; }
                .bl-jeton:hover rect, .bl-jeton:hover circle { opacity: .55; }
                .bl-boite { fill: var(--primary, #4a6fd4); stroke: #22315f; stroke-width: 1.6; }
                .bl-poids { fill: #d9a441; stroke: #8a6414; stroke-width: 1.4; }
                .bl-lettre {
                    fill: #fff; font-weight: 800; text-anchor: middle; dominant-baseline: central;
                    pointer-events: none;
                }
                .bl-groupe { transition: transform .45s cubic-bezier(.34,1.3,.64,1); }
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
                .bl-note {
                    text-align: center; min-height: 2.4em; flex: 0 0 auto;
                    font-size: clamp(11px, 2.2cqw, 13px); line-height: 1.3;
                }
                .bl-note--ko { color: var(--danger, #c0392b); }
                .bl-note--ok { color: var(--success, #2e7d32); }
                .bl-note--attente { color: #b8860b; font-weight: 600; }
                @container (max-width: 420px) { .bl-consigne { display: none; } }
            </style>
            <div class="bl-wrap">
                <p class="bl-consigne">${enTexte(CONSIGNE)}</p>
                <div class="bl-eq" data-eq></div>
                <div class="bl-scene" data-scene></div>
                <div class="bl-outils" data-outils></div>
                <div class="bl-note" data-note></div>
            </div>`;
        this.eqEl = this.container.querySelector('[data-eq]');
        this.sceneEl = this.container.querySelector('[data-scene]');
        this.outilsEl = this.container.querySelector('[data-outils]');
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
        const poser = (i, quoi, n) => {
            const rangee = Math.floor(i / PAS), place = i % PAS;
            const dans = Math.min(n - rangee * PAS, PAS);
            const x = cx + (place - (dans - 1) / 2) * (L + 3);
            const y = base - rangee * (H + 3);
            const clic = this.isDemo ? '' : ` data-cote="${cote}" data-quoi="${quoi}"`;
            if (quoi === 'x') {
                return `<g class="bl-jeton"${clic}>
                    <rect class="bl-boite" x="${x - L / 2}" y="${y - H}" width="${L}" height="${H}" rx="3"/>
                    <text class="bl-lettre" x="${x}" y="${y - H / 2}" font-size="13">x</text></g>`;
            }
            return `<g class="bl-jeton"${clic}>
                <circle class="bl-poids" cx="${x}" cy="${y - H / 2}" r="${H / 2 - 1}"/>
                <text class="bl-lettre" x="${x}" y="${y - H / 2}" font-size="10" fill="#4a3208">1</text></g>`;
        };
        for (let i = 0; i < p.x; i++) out += poser(i, 'x', p.x);
        const hautX = Math.ceil(p.x / PAS) * (H + 3);
        for (let i = 0; i < p.u; i++) {
            const rangee = Math.floor(i / PAS), place = i % PAS;
            const dans = Math.min(p.u - rangee * PAS, PAS);
            const x = cx + (place - (dans - 1) / 2) * 21;
            const y = base - hautX - rangee * 21;
            const clic = this.isDemo ? '' : ` data-cote="${cote}" data-quoi="u"`;
            out += `<g class="bl-jeton"${clic}>
                <circle class="bl-poids" cx="${x}" cy="${y - 9}" r="9"/>
                <text class="bl-lettre" x="${x}" y="${y - 9}" font-size="10" fill="#4a3208">1</text></g>`;
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
            const ampleur = Math.min(14, 5 + e.attente.combien * 2.2);
            inclinaison = e.attente.cote === 'g' ? -ampleur : ampleur;
        }

        const W = 460, H = 300, cy = 96, demi = 150;
        const dy = (c) => (c === 'g' ? -1 : 1) * inclinaison * 1.9;
        const plateauSvg = (c, cx) => {
            const y = cy + 62 + dy(c);
            return `<g class="bl-groupe" data-plateau="${c}">
                <line class="bl-fil" x1="${cx}" y1="${cy + dy(c)}" x2="${cx}" y2="${y - 6}"/>
                <path class="bl-plateau" d="M ${cx - 74} ${y} L ${cx + 74} ${y}
                    L ${cx + 62} ${y + 13} L ${cx - 62} ${y + 13} Z"/>
                ${this.jetons(e[c], c, cx, y - 3)}</g>`;
        };

        this.sceneEl.innerHTML = `
            <svg class="bl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
                <line class="bl-mat" x1="${W / 2}" y1="${cy}" x2="${W / 2}" y2="${H - 26}"/>
                <line class="bl-socle" x1="${W / 2 - 46}" y1="${H - 26}" x2="${W / 2 + 46}" y2="${H - 26}"/>
                <g class="bl-barre" transform="rotate(${inclinaison} ${W / 2} ${cy})">
                    <line x1="${W / 2 - demi}" y1="${cy}" x2="${W / 2 + demi}" y2="${cy}"
                        stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
                </g>
                ${plateauSvg('g', W / 2 - demi)}
                ${plateauSvg('d', W / 2 + demi)}
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
    }

    dessinerOutils() {
        const possibles = partagesPossibles(this.etat);
        this.outilsEl.innerHTML = possibles.map(n =>
            `<button type="button" class="bl-btn" data-partage="${n}">Partager en ${n}</button>`).join('')
            + `<button type="button" class="bl-btn bl-btn--doux" data-recommencer>↺ Recommencer</button>`;
        if (this.isDemo) {
            this.outilsEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
            return;
        }
        this.outilsEl.querySelectorAll('[data-partage]').forEach(b => {
            b.onclick = () => this.jouer({ geste: 'partager', en: +b.dataset.partage });
        });
        this.outilsEl.querySelector('[data-recommencer]').onclick = () => {
            this.etat = this.depart;
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
        const r = appliquer(this.etat, geste);
        if (!r.ok) { this.note(r.dit, 'ko'); return; }
        this.etat = r.etat;
        // Un geste est ACHEVÉ quand la balance revient droite — ou quand on
        // partage. Les clics intermédiaires, eux, ne comptent pas.
        if (geste.geste === 'partager' || (avant && !r.etat.attente)) this.gestes += 1;
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
            this.etat = r.etat;
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
                const r = appliquer(this.etat, g);
                if (r.ok) this.etat = r.etat;
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
