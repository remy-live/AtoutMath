// LE COMPTE EST BON — à l'écran.
//
// Le noyau (core/compteEstBon.js) porte le tirage, les règles et la recherche.
// Ici : les plaques, le choix d'une opération, et le trou où l'élève écrit ce
// que ça fait.
//
// TROIS TOUCHES POUR UNE ÉTAPE : une plaque, un signe, une plaque. Puis le
// résultat, au clavier. C'est volontairement plus lent qu'un glisser-déposer —
// on n'essaie pas des couples au hasard, on annonce un calcul et on le fait.
//
// LES PLAQUES CONSOMMÉES NE DISPARAISSENT PAS, elles se retournent. L'élève
// doit pouvoir relire d'où vient le nombre qu'il vient d'obtenir : c'est ce
// qui rend l'annulation compréhensible, et c'est ce qu'on perd quand on efface.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    tirerPartie, commencer, poserEtape, annulerEtape, gagnee, conseil,
    meilleurEcart, calculer, OPERATIONS, SIGNE
} from '../core/compteEstBon.js';

const COMPETENCE = 'num.calc.tri';

const RAISONS = {
    'negatif': 'On ne descend pas sous zéro : la soustraction va du grand vers le petit.',
    'division-inexacte': 'Cette division ne tombe pas juste — il faudrait un reste, et on n\'en veut pas.',
    'calcul-faux': 'Le calcul n\'est pas bon. Recompte : c\'est là tout l\'exercice.',
    'meme-plaque': 'Une plaque ne peut pas se servir deux fois.',
    'introuvable': 'Cette plaque n\'est plus sur la table.'
};

class CompteEstBon extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'compte-est-bon');
        this.rng = makeRng(this.params.seed);
        this.operations = Math.max(2, Math.min(5, parseInt(this.params.operations) || 3));
        this.tous = this.params.tous === true;
        this.grands = Math.max(1, Math.min(2, parseInt(this.params.grands) || 1));
        this.reussis = 0;
        this.choix = { a: null, op: null };
    }

    render() {
        this.container.innerHTML = `
            <style>
                .cb-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .cb-tete { display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; }
                .cb-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .cb-btn:hover:not(:disabled) { background: var(--bg-hover); }
                .cb-btn:disabled { opacity: .4; cursor: default; }

                /* LE BUT, ÉNORME. C'est le seul nombre qu'on regarde pendant
                   toute la partie ; il ne doit jamais se chercher. */
                .cb-but {
                    font-size: clamp(38px, 13cqw, 76px); font-weight: 900; line-height: 1;
                    letter-spacing: -.03em;
                    background: linear-gradient(135deg, var(--primary), #a855f7);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .cb-ecart { font-size: .82rem; color: var(--text-muted); font-weight: 700; }

                .cb-plaques { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 520px; }
                .cb-plaque {
                    min-width: 62px; padding: 10px 12px; border-radius: 12px;
                    font-size: clamp(19px, 5cqw, 26px); font-weight: 900;
                    font-variant-numeric: tabular-nums; cursor: pointer;
                    background: linear-gradient(165deg, #fef3c7, #fcd34d 60%, #f59e0b);
                    color: #451a03; border: 2px solid #b45309;
                    box-shadow: 0 3px 0 #92400e; transition: .12s;
                }
                .cb-plaque:hover { translate: 0 -2px; }
                /* Une plaque OBTENUE se distingue d'une plaque du tirage : on
                   doit voir ce qu'on a fabriqué. */
                .cb-plaque--calculee {
                    background: linear-gradient(165deg, #dbeafe, #93c5fd 60%, #3b82f6);
                    color: #0c2d6b; border-color: #1d4ed8; box-shadow: 0 3px 0 #1e40af;
                }
                .cb-plaque--choisie { outline: 4px solid var(--primary); outline-offset: 2px; }
                .cb-plaque--but { animation: cb-gagne .5s ease 3; }
                @keyframes cb-gagne { 50% { scale: 1.16; filter: brightness(1.3); } }

                .cb-signes { display: flex; gap: 8px; }
                .cb-signe {
                    width: 48px; height: 48px; border-radius: 12px; cursor: pointer;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font-size: 22px; font-weight: 800;
                }
                .cb-signe:hover, .cb-signe--choisi { background: var(--primary); color: #fff; }

                /* LA LIGNE EN COURS : « 75 × 4 = [  ] ». */
                .cb-ligne {
                    display: flex; align-items: center; gap: .35em; min-height: 2.2em;
                    font-size: clamp(20px, 5.5cqw, 30px); font-weight: 800;
                    font-variant-numeric: tabular-nums;
                }
                .cb-trou {
                    width: 3.2em; text-align: center; font: inherit;
                    border: none; border-bottom: 3px dashed var(--primary);
                    background: transparent; color: var(--text-main);
                }
                .cb-trou:focus { outline: none; border-bottom-style: solid; }

                .cb-etapes {
                    display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
                    font-size: clamp(13px, 3.4cqw, 17px); font-weight: 700;
                    color: var(--text-muted); font-variant-numeric: tabular-nums;
                }
                .cb-note { min-height: 2.6em; text-align: center; line-height: 1.35;
                    font-size: clamp(13px, 3cqw, 15px); color: var(--text-muted); max-width: 540px; }
                .cb-note--ok { color: var(--success); font-weight: 700; }
                .cb-note--ko { color: var(--danger); font-weight: 700; }
            </style>
            <div class="cb-wrap">
                <div class="cb-tete">
                    <span data-score></span>
                    <button type="button" class="cb-btn" data-annuler>↶ Annuler</button>
                    <button type="button" class="cb-btn" data-indice>💡 Un coup ?</button>
                    <button type="button" class="cb-btn" data-neuf>🎲 Autre tirage</button>
                </div>
                <div class="cb-but" data-but></div>
                <div class="cb-ecart" data-ecart></div>
                <div class="cb-plaques" data-plaques></div>
                <div class="cb-signes" data-signes></div>
                <div class="cb-ligne" data-ligne></div>
                <div class="cb-etapes" data-etapes></div>
                <p class="cb-note" data-note></p>
            </div>`;

        this.butEl = this.container.querySelector('[data-but]');
        this.ecartEl = this.container.querySelector('[data-ecart]');
        this.plaquesEl = this.container.querySelector('[data-plaques]');
        this.signesEl = this.container.querySelector('[data-signes]');
        this.ligneEl = this.container.querySelector('[data-ligne]');
        this.etapesEl = this.container.querySelector('[data-etapes]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');

        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.aider());
        this.container.querySelector('[data-annuler]').addEventListener('click', () => {
            if (annulerEtape(this.etat)) { this.choix = { a: null, op: null }; this.dessiner(); }
        });

        OPERATIONS.forEach(op => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'cb-signe';
            b.textContent = SIGNE[op];
            b.dataset.op = op;
            b.addEventListener('click', () => this.choisirOp(op));
            this.signesEl.appendChild(b);
        });
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge : le jeu télévisé en a une, pas la classe. */ }

    poser() {
        const partie = tirerPartie({
            rng: this.rng, operations: this.operations, tous: this.tous, grands: this.grands
        });
        this.partie = partie;
        this.etat = commencer(partie);
        this.choix = { a: null, op: null };
        this.note(this.tous
            ? 'Atteins le compte en utilisant TOUTES les plaques : il ne doit rien rester.'
            : 'Touche une plaque, un signe, une seconde plaque — puis écris le résultat.');
        this.dessiner();
        return true;
    }

    dessiner() {
        const e = this.etat;
        this.butEl.textContent = e.but;
        const ecart = meilleurEcart(e);
        this.ecartEl.textContent = ecart === 0
            ? 'Le compte est bon !'
            : `Le plus proche sur la table : à ${ecart} du but`;

        this.plaquesEl.innerHTML = '';
        e.nombres.forEach(n => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'cb-plaque'
                + (n.origine ? '' : ' cb-plaque--calculee')
                + (this.choix.a === n.id ? ' cb-plaque--choisie' : '')
                + (n.valeur === e.but ? ' cb-plaque--but' : '');
            b.textContent = n.valeur;
            b.addEventListener('click', () => this.choisirPlaque(n.id));
            this.plaquesEl.appendChild(b);
        });

        this.signesEl.querySelectorAll('.cb-signe').forEach(b => {
            b.classList.toggle('cb-signe--choisi', b.dataset.op === this.choix.op);
        });

        this.etapesEl.innerHTML = e.etapes
            .map(x => `<div>${x.a} ${SIGNE[x.op]} ${x.b} = ${x.resultat}</div>`).join('');
        this.container.querySelector('[data-annuler]').disabled = !e.etapes.length;
        this.scoreEl.textContent = `${this.reussis} compte${this.reussis > 1 ? 's' : ''} trouvé${this.reussis > 1 ? 's' : ''}`;
        this.dessinerLigne();
    }

    /** La ligne « 75 × 4 = [ ] » se remplit au fur et à mesure des touches. */
    dessinerLigne() {
        const e = this.etat;
        this.ligneEl.innerHTML = '';
        if (this.choix.a === null) return;
        const a = e.nombres.find(n => n.id === this.choix.a);
        const mettre = (t) => {
            const s = document.createElement('span');
            s.textContent = t;
            this.ligneEl.appendChild(s);
        };
        mettre(a.valeur);
        if (this.choix.op) mettre(SIGNE[this.choix.op]);
    }

    choisirPlaque(id) {
        const e = this.etat;
        if (this.choix.a === null) {
            this.choix.a = id;
            this.dessiner();
            return;
        }
        if (this.choix.a === id) {            // on se ravise
            this.choix = { a: null, op: null };
            this.dessiner();
            return;
        }
        if (!this.choix.op) {
            this.note('Choisis d\'abord un signe entre les deux plaques.');
            return;
        }
        this.demanderResultat(id);
    }

    choisirOp(op) {
        if (this.choix.a === null) {
            this.note('Touche d\'abord une plaque.');
            return;
        }
        this.choix.op = op;
        this.dessiner();
    }

    /** Le trou : c'est l'élève qui donne le résultat, jamais la machine. */
    demanderResultat(idB) {
        const e = this.etat;
        const a = e.nombres.find(n => n.id === this.choix.a);
        const b = e.nombres.find(n => n.id === idB);
        // On vérifie l'INTERDIT tout de suite : inutile de faire écrire un
        // résultat pour une opération qui n'a pas le droit d'exister.
        if (calculer(a.valeur, this.choix.op, b.valeur) === null) {
            const raison = this.choix.op === '÷' ? 'division-inexacte' : 'negatif';
            this.note(RAISONS[raison], 'ko');
            this.choix.op = null;
            this.dessiner();
            return;
        }

        this.dessinerLigne();
        const s = document.createElement('span');
        s.textContent = b.valeur;
        this.ligneEl.appendChild(s);
        const eg = document.createElement('span');
        eg.textContent = '=';
        this.ligneEl.appendChild(eg);
        const trou = document.createElement('input');
        trou.className = 'cb-trou';
        trou.type = 'text';
        trou.inputMode = 'numeric';
        trou.setAttribute('aria-label', 'résultat du calcul');
        // UN SEUL ENVOI. « Entrée » valide, puis le champ disparaît avec le
        // redessin — ce qui déclenche « blur », donc un SECOND envoi, sur des
        // plaques déjà consommées. Le verrou est posé sur l'étape réussie, pas
        // sur la frappe : un calcul faux doit pouvoir être retenté.
        // Et le verrou se pose AVANT l'appel, pas après : poser l'étape
        // redessine, ce qui retire le champ, ce qui déclenche « blur » — donc
        // le second envoi partait pendant que l'affectation attendait encore
        // son retour.
        let rendu = false;
        const valider = () => {
            if (rendu) return;
            const v = trou.value.trim();
            if (!v) return;
            rendu = true;
            if (!this.poserEtape(idB, v)) rendu = false;   // calcul faux : on rouvre
        };
        trou.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') valider(); });
        trou.addEventListener('blur', valider);
        this.ligneEl.appendChild(trou);
        trou.focus();
    }

    /** @returns {boolean} vrai si l'étape est passée — c'est le verrou du champ. */
    poserEtape(idB, valeur) {
        const e = this.etat;
        const a = e.nombres.find(n => n.id === this.choix.a);
        const b = e.nombres.find(n => n.id === idB);
        const r = poserEtape(e, this.choix.a, this.choix.op, idB, Number(valeur));
        if (!r.ok) {
            this.note(RAISONS[r.raison] || 'Ce coup n\'est pas possible.', 'ko');
            if (r.raison === 'calcul-faux') {
                this.onWrongAnswer(null, {
                    concept: COMPETENCE,
                    questionText: `${a.valeur} ${this.choix.op} ${b.valeur}`,
                    input: String(valeur),
                    expected: '',                       // on ne donne pas la réponse
                    customMessage: 'Le couple était jouable : c\'est le calcul qu\'il faut refaire.'
                });
            }
            this.dessiner();
            const trou = this.ligneEl.querySelector('.cb-trou');
            if (trou) { trou.value = ''; trou.focus(); }
            return false;
        }

        this.choix = { a: null, op: null };
        if (gagnee(e)) {
            this.reussis++;
            this.note(`🎉 Le compte est bon : ${e.but} en ${e.etapes.length} opérations.`, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Atteindre ${e.but} avec ${this.partie.plaques.join(', ')}`,
                expected: String(e.but), given: String(e.but),
                points: 8 + e.etapes.length * 3 + (this.tous ? 6 : 0)
            });
            this.dessiner();
            setTimeout(() => { if (this.isRunning) this.poser(); }, 2100);
            return true;
        }
        if (e.trouve && this.tous) {
            this.note('Le compte y est — mais il reste des plaques sur la table, et il faut TOUT utiliser.');
        } else if (e.nombres.length === 1) {
            this.note('Plus qu\'une plaque, et ce n\'est pas le compte. Annule pour reprendre autrement.', 'ko');
        } else {
            this.note('');
        }
        this.dessiner();
        return true;
    }

    aider() {
        const c = conseil(this.etat);
        if (!c) return this.note('Il n\'y a plus rien à tenter : annule une étape.');
        // ON NE DONNE PAS LE RÉSULTAT, seulement le couple à essayer : le
        // calcul reste l'exercice.
        this.note(c.exact
            ? `Essaie ${c.a} ${SIGNE[c.op]} ${c.b} — de là, le compte est atteignable.`
            : `Le compte exact n'est plus possible ; au mieux tu peux t'approcher à ${c.ecart}. `
                + `Essaie ${c.a} ${SIGNE[c.op]} ${c.b}.`);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'cb-note' + (ton ? ` cb-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    // --- La démonstration ---------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone([this.plaquesEl, this.signesEl, this.ligneEl]);
            await gate.wait(500);
            cur.say(`Il faut atteindre ${this.etat.but} avec ces six plaques.`, this.butEl);
            await gate.wait(2500);
            cur.say('Les grandes plaques — 25, 50, 75, 100 — sont là pour ça : '
                + 'ce sont leurs multiples qu\'il faut avoir en tête.', this.plaquesEl);
            await gate.wait(2800);

            for (const etape of this.partie.solution.slice(0, 3)) {
                if (!this.isRunning) break;
                const idA = this.etat.nombres.find(n => n.valeur === etape.a)?.id;
                const idB = this.etat.nombres.find(n => n.valeur === etape.b && n.id !== idA)?.id;
                if (!idA || !idB) break;
                cur.say(`Je prends ${etape.a} et ${etape.b}.`, this.plaquesEl);
                await gate.wait(1800);
                this.choix = { a: idA, op: etape.op };
                this.dessiner();
                await gate.wait(700);
                cur.say(`${etape.a} ${SIGNE[etape.op]} ${etape.b} — et c'est MOI qui donne le résultat : `
                    + `${etape.resultat}.`, this.ligneEl);
                await gate.wait(2400);
                this.poserEtape(idB, etape.resultat);
                await gate.wait(900);
            }
            cur.say('La machine ne calcule jamais à ta place : c\'est tout l\'exercice.', this.ligneEl);
            await gate.wait(2600);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function engineCompteEstBon(container, isDemo, params) {
    const jeu = new CompteEstBon(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU, pas l'appelant. Le Runner appelle
    // cette fonction et garde l'instance ; il n'appelle jamais « start ». Sans
    // cette ligne, le jeu se construisait, ne dessinait rien, et l'écran
    // restait vide — sans la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
