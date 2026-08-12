// L'ATELIER DES PROBLÈMES — et le bouton qui change tout.
//
// Un problème raté ne l'est presque jamais faute de savoir calculer : il l'est
// faute de savoir QUELLE opération faire. Et on ne le sait pas quand on n'a
// aucune représentation de la situation — alors on attrape un mot (« en tout »,
// « de plus ») et on laisse le mot décider.
//
// D'où le bouton SCHÉMA, présent à chaque énoncé. Ce n'est pas un dépannage
// qu'on s'autorise en cas de blocage : c'est l'outil qu'on veut voir devenir un
// réflexe. Le schéma en barres montre qu'un tout est fait de deux parts et
// qu'on cherche une part — donc qu'on soustrait, quel que soit le mot employé.
// Il est donc gratuit, sans pénalité et sans condition : le cacher derrière un
// coût apprendrait à s'en passer, exactement l'inverse du but.
//
// Les énoncés, les mauvaises réponses plausibles et les schémas (sous forme de
// DONNÉES) viennent de core/problemes.js, testés sans navigateur. Ici on
// dessine et on écoute.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { tirerProbleme, famillesDe, IDS_FAMILLES, FAMILLES, direReponse } from '../core/problemes.js';
import { boutonAide, majBoutonAide } from '../ui/gameChrome.js';
import { suivreDefilement } from '../ui/defilement.js';
import { dessinerSchema, esc } from './problemesSchema.js';

const SKILL_DEFAUT = 'num.probleme.composition';

class Problemes extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'problemes');
        this.rng = makeRng(this.params.seed);
        const niveau = this.params.niveau || null;
        // Le réglage vient d'une liste à cocher (tableau) ; l'ancienne saisie
        // libre — des identifiants séparés par des virgules — reste acceptée,
        // car elle dort dans les parcours déjà enregistrés.
        const brut = this.params.familles;
        const choisies = Array.isArray(brut)
            ? brut.map(String)
            : String(brut || '').split(',').map(s => s.trim()).filter(Boolean);
        const dispo = famillesDe(niveau === 'tout' ? null : niveau);
        this.familles = choisies.filter(f => IDS_FAMILLES.includes(f));
        if (!this.familles.length) this.familles = dispo.length ? dispo : IDS_FAMILLES;
        // On ne retire jamais deux fois la même famille d'affilée : c'est le
        // premier signe de lassitude, et il arrive bien avant la répétition
        // d'un énoncé.
        this.derniere = null;
        this.reussis = 0;
        this.erreurs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pb-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; color: var(--text-main); overflow-y: auto;
                }
                .pb-haut {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .pb-famille {
                    background: color-mix(in srgb, var(--primary) 14%, transparent);
                    color: var(--primary); border-radius: 999px; padding: 3px 12px;
                }
                .pb-score { color: var(--text-muted); font-weight: 600; }
                .pb-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .pb-btn:hover { background: var(--bg-hover); }

                /* L'ÉNONCÉ. Une carte, pas un paragraphe perdu : c'est le texte
                   qu'il faut relire trois fois, il doit être facile à retrouver
                   des yeux. La question est détachée du récit — c'est elle
                   qu'on oublie de lire. */
                .pb-carte {
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 16px; box-shadow: var(--shadow-sm);
                    padding: clamp(12px, 3cqw, 20px); width: 100%; max-width: 620px;
                    flex: 0 0 auto;
                }
                .pb-enonce {
                    font-size: clamp(14px, 3.4cqw, 19px); line-height: 1.5;
                    text-wrap: pretty;
                }
                .pb-question {
                    margin-top: 9px; padding-top: 9px; border-top: 2px dashed var(--border);
                    font-weight: 800; font-size: clamp(14px, 3.6cqw, 20px);
                    color: var(--primary); line-height: 1.35;
                }
                .pb-nb { font-weight: 800; color: var(--text-main); white-space: nowrap; }

                .pb-schema-barre { display: flex; justify-content: center; width: 100%; flex: 0 0 auto; }
                .pb-schema {
                    width: 100%; max-width: 620px; flex: 0 0 auto;
                    background: var(--bg-app); border: 1px solid var(--border);
                    border-radius: 14px; padding: 12px;
                }
                .pb-schema[hidden] { display: none; }
                .pb-schema svg { display: block; width: 100%; height: auto; }
                .pb-schema-titre {
                    font-size: .74rem; font-weight: 700; color: var(--text-muted);
                    text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px;
                }

                .pb-choix {
                    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: clamp(8px, 2cqw, 13px); width: 100%; max-width: 560px; flex: 0 0 auto;
                }
                .pb-carte-rep {
                    display: flex; align-items: center; justify-content: center; text-align: center;
                    min-height: clamp(52px, 10cqw, 70px); padding: 11px 13px;
                    border-radius: 18px; border: 3px solid rgba(255,255,255,.22);
                    background: linear-gradient(135deg, var(--primary), #8b5cf6);
                    color: #fff; font-weight: 800; font-size: clamp(.95rem, 3.2cqw, 1.25rem);
                    line-height: 1.2; text-wrap: balance; cursor: pointer;
                    box-shadow: 0 7px 18px rgba(79, 70, 229, .32);
                    transition: all .22s cubic-bezier(.4, 0, .2, 1);
                    -webkit-tap-highlight-color: transparent;
                }
                .pb-carte-rep:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 12px 26px rgba(79,70,229,.42); }
                .pb-carte-rep:active:not(:disabled) { transform: translateY(2px) scale(.98); }
                .pb-carte-rep:disabled { cursor: default; }
                .pb-carte-rep--ok {
                    background: linear-gradient(135deg, #34d399, #16a34a);
                    box-shadow: 0 8px 20px rgba(22,163,74,.4);
                }
                .pb-carte-rep--ko {
                    background: linear-gradient(135deg, #f87171, #dc2626);
                    box-shadow: 0 8px 20px rgba(220,38,38,.35);
                }
                .pb-carte-rep--eteinte { opacity: .35; }

                .pb-note {
                    min-height: 2.6em; text-align: center; width: 100%; max-width: 620px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.4;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .pb-note b { color: var(--text-main); }
                .pb-bulle { display: inline-block; padding: 6px 14px; border-radius: 14px; font-weight: 700; }
                .pb-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .pb-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
                .pb-etapes { text-align: left; margin: 8px auto 0; max-width: 480px; }
                .pb-etape { display: flex; gap: 8px; align-items: baseline; padding: 3px 0; }
                .pb-etape span:first-child {
                    flex: 0 0 auto; width: 20px; height: 20px; border-radius: 50%;
                    background: var(--primary); color: #fff; font-size: .72rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                }
            </style>
            <div class="pb-wrap">
                <div class="pb-haut">
                    <span class="pb-famille" data-famille></span>
                    <span class="pb-score" data-score></span>
                    <button type="button" class="pb-btn" data-neuf>↺ Autre problème</button>
                </div>
                <div class="pb-carte">
                    <p class="pb-enonce" data-enonce></p>
                    <p class="pb-question" data-question></p>
                </div>
                <div class="pb-schema-barre">${boutonAide('le schéma')}</div>
                <div class="pb-schema" data-schema hidden></div>
                <div class="pb-choix" data-choix></div>
                <p class="pb-note" data-note></p>
            </div>`;

        this.familleEl = this.container.querySelector('[data-famille]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.enonceEl = this.container.querySelector('[data-enonce]');
        this.questionEl = this.container.querySelector('[data-question]');
        this.schemaEl = this.container.querySelector('[data-schema]');
        this.choixEl = this.container.querySelector('[data-choix]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.voirEl = this.container.querySelector('[data-aide]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouveauProbleme());
        this.voirEl.addEventListener('click', () => this.basculerSchema());

        this.nouveauProbleme();
    }

    startGameLoop() { /* Au rythme de la lecture : rien à animer en continu. */ }

    // --- Un problème -----------------------------------------------------------

    nouveauProbleme() {
        let p = null;
        for (let essai = 0; essai < 20 && !p; essai++) {
            const choix = this.familles.length > 1
                ? this.familles.filter(f => f !== this.derniere)
                : this.familles;
            const f = this.rng.pick(choix);
            p = tirerProbleme(f, this.rng);
            if (p) this.derniere = f;
        }
        if (!p) { this.note('Aucun problème disponible avec ces réglages.', 'ko'); return; }

        this.p = p;
        this.repondu = false;
        this.fautes = 0;
        this.schemaOuvert = false;
        this.familleEl.textContent = p.libelleFamille;
        // On MET EN ÉVIDENCE les nombres de l'énoncé : le premier travail sur
        // un problème est de repérer les données, et un élève qui peine à lire
        // les perd dans la phrase.
        this.enonceEl.innerHTML = souligner(p.enonce);
        this.questionEl.textContent = p.question;
        this.schemaEl.hidden = true;
        this.schemaEl.innerHTML = '';
        majBoutonAide(this.voirEl, 'le schéma', false);
        this.majScore();
        this.peindreChoix();
        this.note('Lis l\'énoncé, puis la question. Si tu hésites, ouvre le schéma — c\'est fait pour.');
    }

    majScore() {
        this.scoreEl.textContent = `${this.reussis} résolu${this.reussis > 1 ? 's' : ''}`
            + (this.erreurs ? ` · ${this.erreurs} erreur${this.erreurs > 1 ? 's' : ''}` : '');
    }

    peindreChoix() {
        this.choixEl.innerHTML = this.p.choix.map((c, i) =>
            `<button type="button" class="pb-carte-rep" data-i="${i}">${direReponse(this.p, c.v)}</button>`).join('');
        this.choixEl.querySelectorAll('[data-i]').forEach(b => {
            b.addEventListener('click', () => this.repondre(Number(b.dataset.i), b));
        });
    }

    basculerSchema() {
        if (!this.p) return;
        this.schemaOuvert = !this.schemaOuvert;
        this.schemaEl.hidden = !this.schemaOuvert;
        majBoutonAide(this.voirEl, 'le schéma', this.schemaOuvert);
        if (this.schemaOuvert && !this.schemaEl.innerHTML) {
            this.schemaEl.innerHTML = `<div class="pb-schema-titre">Le schéma de la situation</div>${dessinerSchema(this.p.schema)}`;
            suivreDefilement(this.schemaEl);
        }
    }

    repondre(i, el) {
        if (this.repondu || this.isDemo) return;
        const c = this.p.choix[i];
        if (!c || el.disabled) return;

        if (c.juste) {
            this.repondu = true;
            this.reussis++;
            this.majScore();
            el.classList.add('pb-carte-rep--ok');
            this.choixEl.querySelectorAll('[data-i]').forEach(b => { b.disabled = true; });
            this.note(`✅ ${this.p.etapes[this.p.etapes.length - 1]}${this.correction()}`, 'ok');
            this.onCorrectAnswer(el, this.p.skill || SKILL_DEFAUT, {
                points: this.fautes === 0 ? 25 : 12,
                questionText: `${this.p.enonce} ${this.p.question}`,
                given: direReponse(this.p, c.v), expected: direReponse(this.p, this.p.reponse)
            });
            this.timerId = setTimeout(() => { if (this.isRunning) this.nouveauProbleme(); }, 4200);
            return;
        }

        this.erreurs++;
        this.fautes++;
        this.majScore();
        el.classList.add('pb-carte-rep--ko');
        this.timerId = setTimeout(() => {
            el.classList.remove('pb-carte-rep--ko');
            el.classList.add('pb-carte-rep--eteinte');
            el.disabled = true;
        }, 700);
        // Le message dit CE QU'ON A FAIT, pas seulement que c'est faux — et il
        // renvoie au schéma, qui est la seule chose qui puisse changer le
        // raisonnement.
        this.note(`${c.pourquoi} <b>Ouvre l'aide</b> et regarde ce qu'on cherche.`, 'ko');
        this.onWrongAnswer(el, {
            concept: this.p.skill || SKILL_DEFAUT,
            questionText: `${this.p.enonce} ${this.p.question}`,
            input: direReponse(this.p, c.v),
            expected: direReponse(this.p, this.p.reponse),
            customMessage: c.pourquoi,
            silencieux: true
        });
    }

    /** La correction, une ligne par idée — visible seulement une fois trouvé. */
    correction() {
        return `<div class="pb-etapes">${this.p.etapes.map((e, i) =>
            `<div class="pb-etape"><span>${i + 1}</span><span>${e}</span></div>`).join('')}</div>`;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="pb-bulle pb-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot ---------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Un problème se lit deux fois. L\'histoire, puis la question.', this.enonceEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Les nombres sont en gras : ce sont les données.', this.enonceEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le geste central de l'exercice : ouvrir le schéma.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Je ne devine pas l\'opération. J\'ouvre l\'aide.', this.voirEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        if (!await cur.tap(this.voirEl)) return fin();
        this.basculerSchema();
        if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le dessin montre ce qu\'on cherche. Le mot ne décide plus.', this.schemaEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(this.p.etapes[0], this.schemaEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        const i = this.p.choix.findIndex(c => c.juste);
        const el = this.choixEl.querySelector(`[data-i="${i}"]`);
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(this.p.etapes[1], this.choixEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        if (el && !await cur.tap(el)) return fin();
        el?.classList.add('pb-carte-rep--ok');
        if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et la réponse porte son unité. Toujours.', this.choixEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

/** Les nombres de l'énoncé, mis en évidence — repérer les données se travaille. */
function souligner(texte) {
    return esc(texte).replace(/(\d+(?:[.,]\d+)?)\s*(€|h|min)?/g,
        (m) => `<span class="pb-nb">${m.trim()}</span>${/\s$/.test(m) ? ' ' : ''}`);
}

export function engineProblemes(container, isDemo, params) {
    const jeu = new Problemes(container, isDemo, params);
    jeu.start();
    return jeu;
}
