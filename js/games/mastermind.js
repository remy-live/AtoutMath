// LE MASTERMIND — à l'écran.
//
// Rémy : « Et un master mind ».
//
// CE QUE L'ÉCRAN APPORTE ICI EST ÉNORME, et ce n'est pas le décor : c'est
// l'ADVERSAIRE. Le mastermind se joue à deux, l'un cachant un code et l'autre
// comptant ; seul, on ne peut pas y jouer du tout. Une machine tient ce rôle
// sans tricher et sans se tromper dans le compte — et c'est bien le compte qui
// est difficile, pas le code.
//
// LES DEUX RÉPONSES SONT ÉCRITES EN TOUTES LETTRES, « bien placés » et « mal
// placés », et non en chevilles noires et blanches. La moitié des joueurs du
// jeu du commerce ne sait jamais laquelle veut dire quoi ; deux colonnes
// nommées suppriment la question, et c'est ainsi qu'on l'imprime.
//
// L'AIDE NE DONNE PAS UNE COULEUR AU HASARD : elle donne une case DÉJÀ
// DÉMONTRÉE par les essais précédents. C'est le vrai enseignement du jeu —
// l'élève continue à tâtonner alors que trois cases sur quatre sont déjà
// prouvées —, et cela se calcule exactement (voir certitudes()).

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    creerMastermind, indices, tousLesCodes, compatibles, certitudes,
    estResoluMastermind, FORMATS
} from '../core/mastermind.js';

const COMPETENCE = 'num.logique.mastermind';

class Mastermind extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'mastermind');
        this.graine = this.params.seed || 'mm';
        this.format = FORMATS[this.params.format] ? this.params.format : 'moyen';
        this.repetitions = this.params.repetitions !== false;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .mm-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.2cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .mm-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                .mm-table {
                    --mm-jeton: clamp(16px, min(calc(58cqw / var(--mm-n, 4)),
                                      calc(80cqh / var(--mm-lignes, 9))), 40px);
                    display: flex; flex-direction: column; gap: 3px; flex: 0 0 auto;
                }
                .mm-ligne {
                    display: flex; align-items: center; gap: 4px;
                    padding: 2px 4px; border-radius: 8px;
                }
                /* La ligne en cours se détache : c'est la seule où l'on écrit. */
                .mm-ligne--ici { background: var(--bg-soft, #eef2f7); }
                .mm-ligne--vieille { opacity: .95; }
                .mm-num {
                    width: 1.6em; text-align: right; font-weight: 700; opacity: .55;
                    font-size: calc(var(--mm-jeton) * .38);
                }
                .mm-jetons { display: flex; gap: 3px; }
                .mm-jeton {
                    width: var(--mm-jeton); height: var(--mm-jeton); border-radius: 50%;
                    border: 0; padding: 0; margin: 0; font: inherit;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; color: #fff; letter-spacing: 0;
                    font-size: calc(var(--mm-jeton) * .5);
                    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .18);
                    cursor: default; -webkit-tap-highlight-color: transparent;
                }
                /* Une case encore vide de la ligne en cours : un rond creux. */
                .mm-jeton--vide {
                    background: var(--bg-panel, #fff); color: transparent;
                    box-shadow: inset 0 0 0 2px var(--border-soft, #cbd5e1);
                    cursor: pointer;
                }
                .mm-jeton--vise { box-shadow: inset 0 0 0 3px #6d5cf6; }
                /* LES DEUX RÉPONSES, NOMMÉES. Le vert compte ce qui est à sa
                   place, l'orange ce qui est dans le code mais ailleurs. */
                .mm-rep { display: flex; gap: 4px; margin-left: 6px; }
                .mm-rep span {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; border-radius: 999px; font-weight: 800;
                    font-size: calc(var(--mm-jeton) * .38);
                    background: var(--bg-panel, #fff);
                    box-shadow: inset 0 0 0 1px var(--border-soft, #cbd5e1);
                }
                .mm-rep .mm-place { color: #2f855a; }
                .mm-rep .mm-present { color: #b7791f; }
                .mm-rep i { font-style: normal; opacity: .6; font-weight: 600; }

                .mm-palette { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; }
                .mm-couleur {
                    /* RONDES, DONC CARRÉES. Une largeur en cqw et une hauteur en
                       cqh donnaient des ovales dès que le plateau n'était pas
                       carré : un jeton de mastermind est un rond, et l'ovale
                       faisait douter qu'il s'agisse du même objet que dans la
                       grille. */
                    --mm-pastille: clamp(26px, min(6cqw, 5cqh), 42px);
                    width: var(--mm-pastille); height: var(--mm-pastille);
                    border-radius: 50%; border: 0; color: #fff; font-weight: 800;
                    font-size: clamp(12px, 2.6cqh, 18px);
                    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .18);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                .mm-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .mm-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .mm-btn--fort { background: #6d5cf6; color: #fff; border-color: #6d5cf6; }
                .mm-note { min-height: 1.5em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .mm-note--ok { color: #2f855a; }
                .mm-note--ko { color: #c53030; }

                /* SUR UN TÉLÉPHONE, LA SECONDE PASTILLE SORTAIT DE L'ÉCRAN.
                   Quatre jetons de quarante pixels, le numéro de la rangée et
                   deux étiquettes nommées ne tiennent pas dans trois cent
                   quatre-vingt-dix : « 1 mal pla… » s'arrêtait au bord, et
                   c'est justement le nombre qu'on vient chercher.
                   On resserre les jetons plutôt que de raccourcir les mots :
                   « bien placés » et « mal placés » écrits en toutes lettres
                   sont ce qui évite la confusion des chevilles noires et
                   blanches du jeu du commerce, et c'est le dernier endroit où
                   il faudrait économiser. */
                @container (max-width: 520px) {
                    .mm-table {
                        --mm-jeton: clamp(15px, min(calc(40cqw / var(--mm-n, 4)),
                                          calc(74cqh / var(--mm-lignes, 8))), 30px);
                    }
                    .mm-ligne { gap: 2px; padding: 1px 2px; }
                    .mm-rep { gap: 3px; margin-left: 3px; }
                    .mm-rep span { font-size: clamp(8px, 2.5cqw, 11px); padding: 1px 4px; gap: 2px; }
                }
            </style>
            <div class="mm-wrap">
                <div class="mm-corps"><div class="mm-table" id="mm-table"></div></div>
                <div class="mm-palette" id="mm-palette"></div>
                <div class="mm-note" id="mm-note"></div>
                <div class="mm-barre">
                    <button type="button" class="mm-btn mm-btn--fort" id="mm-ok">Proposer</button>
                    <button type="button" class="mm-btn" id="mm-eff">⌫ Effacer</button>
                    <button type="button" class="mm-btn" id="mm-aide">💡 Un indice</button>
                    <button type="button" class="mm-btn" id="mm-neuf">Nouvelle partie</button>
                </div>
            </div>`;
        this.tableEl = this.container.querySelector('#mm-table');
        this.paletteEl = this.container.querySelector('#mm-palette');
        this.noteEl = this.container.querySelector('#mm-note');
        this.container.querySelector('#mm-ok').onclick = () => this.proposer();
        this.container.querySelector('#mm-eff').onclick = () => this.effacer();
        this.container.querySelector('#mm-aide').onclick = () => this.aider();
        this.container.querySelector('#mm-neuf').onclick = () => this.poser(true);

        this.surTouche = (e) => {
            if (this.fini || this.isDemo) return;
            const k = (e.key || '').toUpperCase();
            const c = this.m.couleurs.find(x => x.id === k);
            if (c) { this.poserJeton(c.id); e.preventDefault(); }
            else if (e.key === 'Backspace') { this.effacer(); e.preventDefault(); }
            else if (e.key === 'Enter') { this.proposer(); e.preventDefault(); }
        };
        document.addEventListener('keydown', this.surTouche);
        this.poser();
    }

    poser(neuve = false) {
        if (neuve) this.graine = `${this.graine}+`;
        this.m = creerMastermind({
            format: this.format, repetitions: this.repetitions, rng: makeRng(this.graine)
        });
        this.codes = tousLesCodes(this.m.couleurs, this.m.longueur, this.m.repetitions);
        this.lignes = [];
        this.enCours = new Array(this.m.longueur).fill(null);
        this.vise = 0;
        this.fini = false;
        this.aides = 0;
        this.dessiner();
        this.note(`Un code de ${this.m.longueur} couleurs à retrouver, en `
            + `${this.m.essaisMax} essais.`);
    }

    dessiner() {
        const m = this.m;
        this.tableEl.style.setProperty('--mm-n', m.longueur);
        this.tableEl.style.setProperty('--mm-lignes', m.essaisMax);

        const rangee = (jetons, rep, n, ici) => {
            const cases = jetons.map((id, i) => {
                const c = m.couleurs.find(x => x.id === id);
                if (!c) {
                    return `<button type="button" class="mm-jeton mm-jeton--vide${
                        ici && i === this.vise ? ' mm-jeton--vise' : ''}"
                        data-case="${i}">·</button>`;
                }
                return `<button type="button" class="mm-jeton${
                    ici && i === this.vise ? ' mm-jeton--vise' : ''}"
                    style="background:${c.hex}" data-case="${i}"
                    title="${c.nom}">${c.id}</button>`;
            }).join('');
            // L'ÉTIQUETTE S'ACCORDE AVEC SON NOMBRE. Collée à lui dans la même
            // pastille, elle se lit comme une phrase : « 1 bien placés » saute
            // aux yeux, et c'est la ligne que l'élève relira le plus souvent.
            const acc = (n, mot) => `${n}<i>${mot}${n > 1 ? 's' : ''}</i>`;
            const reponse = rep
                ? `<div class="mm-rep">
                    <span class="mm-place">${acc(rep.places, 'bien placé')}</span>
                    <span class="mm-present">${acc(rep.presents, 'mal placé')}</span></div>`
                : '<div class="mm-rep"></div>';
            return `<div class="mm-ligne${ici ? ' mm-ligne--ici' : ' mm-ligne--vieille'}">
                <span class="mm-num">${n}</span>
                <div class="mm-jetons">${cases}</div>${reponse}</div>`;
        };

        // TOUTES LES RANGÉES SONT DESSINÉES, y compris celles qu'on n'a pas
        // encore jouées. C'est le plateau du jeu de société — des trous vides
        // qu'on remplit du haut vers le bas —, et cela règle deux choses d'un
        // coup : le plateau ne saute plus à chaque proposition, et l'on VOIT
        // combien d'essais il reste.
        const vide = new Array(m.longueur).fill(null);
        this.tableEl.innerHTML = Array.from({ length: m.essaisMax }, (_, i) => {
            if (i < this.lignes.length) {
                return rangee(this.lignes[i].code, this.lignes[i], i + 1, false);
            }
            if (i === this.lignes.length && !this.fini) {
                return rangee(this.enCours, null, i + 1, true);
            }
            return rangee(vide, null, i + 1, false);
        }).join('');
        // Seule la rangée en cours accepte le clic : viser une case d'une
        // rangée passée ou à venir n'aurait aucun sens.
        const ici = this.tableEl.children[this.lignes.length];
        if (ici) ici.querySelectorAll('[data-case]').forEach(el => {
            el.onclick = () => { this.vise = Number(el.dataset.case); this.dessiner(); };
        });

        this.paletteEl.innerHTML = m.couleurs.map(c =>
            `<button type="button" class="mm-couleur" style="background:${c.hex}"
                data-couleur="${c.id}" title="${c.nom}">${c.id}</button>`).join('');
        this.paletteEl.querySelectorAll('[data-couleur]').forEach(b => {
            b.onclick = () => this.poserJeton(b.dataset.couleur);
        });
    }

    poserJeton(id) {
        if (this.isDemo || this.fini) return;
        this.enCours[this.vise] = id;
        // On avance à la première case encore vide, sinon à la suivante : c'est
        // ce qui permet de composer une ligne entière sans jamais viser.
        const vide = this.enCours.findIndex(c => !c);
        this.vise = vide >= 0 ? vide : Math.min(this.m.longueur - 1, this.vise + 1);
        this.dessiner();
    }

    effacer() {
        if (this.isDemo || this.fini) return;
        if (!this.enCours[this.vise] && this.vise > 0) this.vise--;
        this.enCours[this.vise] = null;
        this.dessiner();
    }

    proposer() {
        if (this.isDemo || this.fini) return;
        if (this.enCours.some(c => !c)) {
            this.note(`Remplis les ${this.motNombre(this.m.longueur)} cases avant de proposer.`, 'ko');
            return;
        }
        if (!this.m.repetitions && new Set(this.enCours).size !== this.m.longueur) {
            this.note('Dans cette partie, une couleur ne peut pas servir deux fois.', 'ko');
            return;
        }
        const code = this.enCours.slice();
        const rep = indices(this.m.secret, code);
        this.lignes.push({ code, ...rep });
        this.enCours = new Array(this.m.longueur).fill(null);
        this.vise = 0;
        this.dessiner();

        if (estResoluMastermind(this.m.secret, code)) return this.gagner();
        if (this.lignes.length >= this.m.essaisMax) return this.perdre();

        // COMBIEN DE CODES RESTENT : c'est la seule mesure honnête du progrès,
        // et elle apprend quelque chose — un essai qui divise par dix vaut
        // mieux qu'un essai qui trouve une couleur.
        const reste = compatibles(this.codes, this.lignes).length;
        this.note(`${this.dire(rep.places, 'bien placé')}, ${this.dire(rep.presents, 'mal placé')}. `
            + `Il reste <b>${reste}</b> code${reste > 1 ? 's' : ''} possible${reste > 1 ? 's' : ''}.`);
    }

    motNombre(n) {
        return ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six'][n] || String(n);
    }

    /**
     * « 0 bien placé », et non « 0 bien placés ».
     *
     * En français, zéro et un laissent l'adjectif au singulier. La phrase
     * sortait « 0 bien placés, 1 mal placés » à chaque proposition — et c'est
     * la phrase que l'élève lit le plus souvent de toute la partie.
     */
    dire(n, mot) {
        return `${n} ${mot}${n > 1 ? 's' : ''}`;
    }

    /**
     * L'INDICE EST UNE DÉMONSTRATION, PAS UN CADEAU. On cherche une case dont
     * TOUS les codes encore possibles portent la même couleur : elle est déjà
     * prouvée par ce que le joueur a joué, il ne l'a simplement pas vu.
     *
     * Quand aucune case n'est encore certaine, il n'y a rien à démontrer : on
     * le dit, et l'on rappelle combien de codes restent. Donner une couleur au
     * hasard à ce moment-là remplacerait le raisonnement au lieu de l'amorcer.
     */
    aider() {
        if (this.isDemo || this.fini) return;
        const restants = compatibles(this.codes, this.lignes);
        if (!restants.length) {
            this.note('Aucun code ne colle à tes réponses — c\'est impossible, préviens ton '
                + 'professeur.', 'ko');
            return;
        }
        const sures = certitudes(restants);
        const i = sures.findIndex((c, k) => c && this.enCours[k] !== c);
        if (i >= 0) {
            this.aides++;
            const c = this.m.couleurs.find(x => x.id === sures[i]);
            this.enCours[i] = c.id;
            const vide = this.enCours.findIndex(x => !x);
            this.vise = vide >= 0 ? vide : this.vise;
            this.dessiner();
            this.note(`La case ${i + 1} est déjà DÉMONTRÉE : elle est ${c.nom}. `
                + `Tous les ${restants.length} codes encore possibles ont cette couleur-là.`);
            return;
        }

        // AUCUNE CASE N'EST ENCORE CERTAINE — et c'est le cas le plus fréquent
        // après deux ou trois essais. On descendait alors d'un cran dans
        // l'aide… en ne disant rien : « rien n'est démontré, débrouille-toi ».
        // Un bouton d'aide qui n'aide pas est pire que pas de bouton.
        //
        // Il reste pourtant deux choses vraies à dire, et démontrées elles
        // aussi : une COULEUR peut être certaine sans que sa place le soit.
        this.aides++;
        const compteMin = new Map(), compteMax = new Map();
        this.m.couleurs.forEach(c => { compteMin.set(c.id, Infinity); compteMax.set(c.id, 0); });
        restants.forEach(code => {
            this.m.couleurs.forEach(c => {
                const n = code.filter(x => x === c.id).length;
                compteMin.set(c.id, Math.min(compteMin.get(c.id), n));
                compteMax.set(c.id, Math.max(compteMax.get(c.id), n));
            });
        });
        // « Il n'y a aucun rouge » raye une couleur d'un coup : c'est ce qui
        // fait le plus avancer, donc on le dit en premier.
        const absente = this.m.couleurs.find(c => compteMax.get(c.id) === 0);
        if (absente) {
            this.note(`Tu peux rayer le <b>${absente.nom}</b> : aucun des ${restants.length} `
                + 'codes encore possibles n\'en contient. Ce sont tes réponses qui le prouvent.');
            return;
        }
        const presente = this.m.couleurs.find(c => compteMin.get(c.id) >= 1);
        if (presente) {
            const n = compteMin.get(presente.id);
            this.note(`Le <b>${presente.nom}</b> est dans le code — au moins ${this.motNombre(n)} `
                + 'fois — mais rien ne dit encore où. Cherche sa place.');
            return;
        }
        // Rien de certain, ni case ni couleur : on POSE alors une proposition
        // qui colle à tout ce qu'on sait. Elle fait forcément avancer, là où
        // un essai au hasard peut n'apprendre rien du tout.
        const propose = restants[0];
        this.enCours = propose.slice();
        this.vise = 0;
        this.dessiner();
        this.note('Rien n\'est encore certain. Alors voici une règle qui ne trompe jamais : '
            + 'propose un code QUI COLLE ENCORE À TOUT ce que tu sais. J\'en ai posé un — '
            + `il en restait ${restants.length}.`);
    }

    gagner() {
        this.fini = true;
        this.dessiner();
        const n = this.lignes.length;
        this.note(`🏆 Code trouvé en ${n} essai${n > 1 ? 's' : ''} : `
            + `${this.m.secret.map(id => this.m.couleurs.find(c => c.id === id).nom).join(', ')}.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Mastermind ${this.m.longueur} cases, ${this.m.couleurs.length} couleurs`,
            expected: this.m.secret.join(''), given: this.m.secret.join(''),
            points: Math.max(10, 20 + (this.m.essaisMax - n) * 6 - this.aides * 5)
        });
    }

    perdre() {
        this.fini = true;
        this.dessiner();
        this.note(`Les ${this.m.essaisMax} essais sont passés. Le code était `
            + `<b>${this.m.secret.join(' ')}</b> — `
            + `${this.m.secret.map(id => this.m.couleurs.find(c => c.id === id).nom).join(', ')}.`, 'ko');
        this.onWrongAnswer(null, {
            questionText: `Mastermind ${this.m.longueur} cases`,
            expected: this.m.secret.join(''), given: '—'
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'mm-note' + (ton ? ` mm-note--${ton}` : '');
    }

    /**
     * Le robot montre LE GESTE, qui n'est pas de proposer un code plausible :
     * c'est de RELIRE les réponses déjà obtenues avant d'en proposer un
     * nouveau. Un essai qui ne tient pas compte des précédents est un essai
     * perdu, et c'est la faute que tout le monde fait.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.m) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        // Un premier essai « d'exploration » : deux couleurs, deux fois.
        const a = this.m.couleurs[0].id, b = this.m.couleurs[1].id;
        this.enCours = Array.from({ length: this.m.longueur }, (_, i) => (i < 2 ? a : b));
        this.dessiner();
        cur.say('Le premier essai ne cherche pas à trouver : il cherche à SAVOIR. '
            + 'Deux couleurs seulement, et je saurai déjà combien il y en a de chacune.',
        this.tableEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const code = this.enCours.slice();
        const rep = indices(this.m.secret, code);
        this.lignes.push({ code, ...rep });
        this.enCours = new Array(this.m.longueur).fill(null);
        this.vise = 0;
        this.dessiner();
        const reste = compatibles(this.codes, this.lignes).length;
        cur.say(`${rep.places} bien placés, ${rep.presents} mal placés. Ce seul essai vient `
            + `d'éliminer ${this.codes.length - reste} codes sur ${this.codes.length}.`, this.tableEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Et c\'est là qu\'on se trompe : on repart au hasard. Alors qu\'il faut '
            + 'RELIRE — chaque nouvelle proposition doit être un code qui colle encore à '
            + 'tout ce qu\'on sait.', this.tableEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function engineMastermind(container, isDemo, params) {
    const game = new Mastermind(container, isDemo, params);
    game.start();
    return game;
}
