// COMPTER LES SOMMETS, LES ARÊTES ET LES FACES — sur le dessin.
//
// Le noyau (core/solides.js) tient les solides, la perspective cavalière et le
// calcul de ce qui est caché. Ici on dessine, et on donne à l'élève le geste
// qui manque sur le papier : TOUCHER CE QU'ON COMPTE.
//
//   · ON COMPTE EN MARQUANT. Sur un cahier, l'élève compte des yeux, perd le
//     fil, recompte, trouve autre chose. Ici chaque arête touchée reste
//     marquée : on ne compte jamais deux fois la même, et surtout on voit
//     celles qu'on n'a pas encore prises.
//   · CE QUI EST DERRIÈRE EST EN POINTILLÉS, ET SE TOUCHE AUSSI. C'est TOUTE
//     la difficulté de l'exercice : l'élève qui compte ce qu'il voit trouve
//     toujours trop peu. Le pointillé dit qu'il y a là quelque chose, et le
//     fait qu'il se marque comme le reste dit qu'il compte pour un.
//   · LA CORRECTION MONTRE CE QU'ON A OUBLIÉ. Annoncer « c'est 12, pas 9 »
//     n'apprend rien. Les trois arêtes non marquées clignotent : l'élève voit
//     lesquelles, et pourquoi il les a manquées — elles étaient derrière.
//
// Le robot fait exactement ce qu'on demande à l'élève : il marque une par une,
// en disant à voix haute qu'il n'oublie pas les pointillés, puis il vérifie
// son compte avec la relation d'Euler.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    ASPECTS, tirerQuestion, dessiner, facesVisibles, aretesCachees, sommetsCaches,
    compter, euler, direMethode, accorder
} from '../core/solides.js';

const COMPETENCE = 'geo.espace.denombrer';
const COTE = 100;                 // le repère du dessin ; l'écran s'y adapte

class Solides extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'solides');
        this.rng = makeRng(this.params.seed);
        this.niveau = this.params.niveau || 'tous';
        this.aspectVoulu = this.params.aspect || 'tous';
        this.reussis = 0;
        this.marques = new Set();
        this.saisie = '';
        this.precedent = null;
        // LE NUMÉRO EST UNE BÉQUILLE, et une béquille se retire. Rémy : « après
        // quelques questions, ne mets plus le chiffre ». Tant qu'il s'inscrit,
        // l'élève LIT son total au lieu de le compter ; une fois la méthode
        // installée — marquer une par une, ne pas repasser — la marque suffit,
        // et le comptage redevient un comptage.
        this.numeros = this.params.numeros || 'progressif';
        // Les faces comptées se colorent : sur un solide, une pastille au
        // centre d'une face se confond avec un sommet, alors qu'une face
        // teintée se voit d'un coup d'œil — et l'on voit ce qui reste.
        this.facesColorees = this.params.facesColorees !== false;
    }

    /** Le numéro s'inscrit-il encore sur les marques ? */
    get avecNumeros() {
        if (this.numeros === 'toujours') return true;
        if (this.numeros === 'jamais') return false;
        return this.reussis < 3;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .sd-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: size;
                    user-select: none; -webkit-user-select: none;
                }
                .sd-haut {
                    display: flex; gap: 10px; align-items: center; justify-content: center;
                    flex-wrap: wrap; flex: 0 0 auto; font-size: .82rem; color: var(--text-muted);
                }
                .sd-question {
                    font-size: clamp(15px, 4cqw, 22px); font-weight: 800; text-align: center;
                    flex: 0 0 auto; line-height: 1.25;
                }
                .sd-consigne { font-size: clamp(11px, 2.7cqw, 13px); color: var(--text-muted); text-align: center; }

                /* LE SOLIDE. Le SVG occupe toute la place qui reste : c'est le
                   dessin qu'on regarde, pas les boutons. */
                /* ET IL EN LAISSE POUR LA RÉPONSE. Rémy : « il n'y a rien pour
                   les réponses ». Il y avait tout — le compteur, les deux
                   boutons, le pavé de chiffres — mais sous la ligne de
                   flottaison : le solide, seule boîte élastique, prenait tout ce
                   qui restait et repoussait la saisie hors de l'écran. Il garde
                   donc un plancher ET un plafond : jamais moins de 200 px,
                   jamais plus de la moitié de la zone. */
                .sd-scene {
                    flex: 1 1 auto; width: 100%; min-height: 200px; max-height: 52cqh;
                    display: flex; align-items: center; justify-content: center;
                }
                .sd-svg { width: 100%; height: 100%; max-width: 460px; touch-action: manipulation; }

                .sd-face { fill: color-mix(in srgb, var(--primary) 12%, transparent); stroke: none; }
                .sd-face--cachee { fill: none; }
                /* Les arêtes VISIBLES en trait plein, les CACHÉES en pointillés :
                   c'est la convention du cahier, et c'est le seul indice qui
                   dise « il y a ici quelque chose que tu ne vois pas ». */
                .sd-arete { stroke: var(--text-main); stroke-width: 1.6; fill: none; stroke-linecap: round; }
                .sd-arete--cachee { stroke-dasharray: 3 2.6; stroke-width: 1.3; opacity: .75; }
                .sd-sommet { fill: var(--bg-panel); stroke: var(--text-main); stroke-width: 1.4; }
                .sd-pastille { fill: var(--bg-panel); stroke: var(--text-main); stroke-width: 1.2; opacity: .9; }
                .sd-pastille--cachee { stroke-dasharray: 2.4 2; }

                /* La cible du doigt est bien plus large que le trait : on vise
                   une arête, pas un pixel. */
                .sd-cible { stroke: transparent; fill: transparent; cursor: pointer; }
                .sd-cible--arete { stroke-width: 12; }
                .sd-marque { pointer-events: none; }
                .sd-marque--arete { stroke: var(--success, #16a34a); stroke-width: 3.2; stroke-linecap: round; opacity: .8; }
                .sd-marque--point { fill: var(--success, #16a34a); }
                /* Assez opaque pour se voir, assez transparente pour laisser
                   passer les arêtes — c'est le dessin qu'on compte, pas
                   l'aplat. */
                .sd-face--comptee {
                    fill: var(--success, #16a34a); fill-opacity: .26;
                    stroke: var(--success, #16a34a); stroke-width: .8; stroke-opacity: .6;
                }
                .sd-numero { fill: #fff; font-size: 4.4px; font-weight: 800; text-anchor: middle; pointer-events: none; }
                .sd-oubli { animation: sd-oubli 1s ease 3; }
                @keyframes sd-oubli {
                    0%, 100% { stroke: var(--text-main); }
                    50% { stroke: var(--danger, #dc2626); stroke-width: 4; }
                }
                .sd-oubli-point { animation: sd-oubliP 1s ease 3; }
                @keyframes sd-oubliP { 50% { fill: var(--danger, #dc2626); r: 4; } }

                /* LE COMPTEUR. Il dit ce qu'on a marqué, pas la réponse. */
                .sd-compteur {
                    flex: 0 0 auto; font-weight: 800; font-size: .95rem;
                    background: var(--bg-hover); border-radius: 999px; padding: 4px 14px;
                }
                .sd-pave { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .sd-touche {
                    min-width: 38px; padding: 8px 10px; border-radius: 10px; cursor: pointer;
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 800; font-size: 1rem;
                }
                .sd-touche:hover { background: var(--bg-hover); }
                .sd-ecran {
                    min-width: 66px; text-align: center; font-weight: 800; font-size: 1.25rem;
                    border: 2px solid var(--primary); border-radius: 10px; padding: 5px 10px;
                    background: var(--bg-panel);
                }
                .sd-ecran--vide { color: var(--text-muted); }
                .sd-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 12px; font-size: .85rem;
                }
                .sd-btn--ok { border-color: var(--primary); background: var(--primary); color: #fff; }
                .sd-note {
                    min-height: 2.4em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 620px; flex: 0 0 auto;
                }
                .sd-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .sd-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                @container (max-height: 520px) {
                    .sd-wrap { gap: 5px; }
                    .sd-note { min-height: 1.4em; }
                }
            </style>
            <div class="sd-wrap">
                <div class="sd-question" data-question></div>
                <div class="sd-consigne" data-consigne></div>
                <div class="sd-scene"><svg class="sd-svg" viewBox="0 0 ${COTE} ${COTE}"
                    preserveAspectRatio="xMidYMid meet" data-svg></svg></div>
                <div class="sd-haut">
                    <span class="sd-compteur" data-compteur></span>
                    <button type="button" class="sd-btn" data-effacer>↺ Effacer les marques</button>
                    <button type="button" class="sd-btn" data-aide>💡 Aide-moi</button>
                </div>
                <div class="sd-pave" data-pave></div>
                <div class="sd-note" data-note></div>
            </div>`;

        this.svg = this.container.querySelector('[data-svg]');
        this.questionEl = this.container.querySelector('[data-question]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.compteurEl = this.container.querySelector('[data-compteur]');
        this.paveEl = this.container.querySelector('[data-pave]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.peindrePave();
    }

    startGameLoop() { this.poser(); }

    // --- Une question -------------------------------------------------------

    poser() {
        this.q = tirerQuestion(this.rng, {
            niveau: this.niveau, aspect: this.aspectVoulu, eviter: this.precedent
        });
        this.precedent = this.q.solide.id;
        this.marques = new Set();
        this.saisie = '';
        this.fini = false;
        const label = ASPECTS.find(a => a.id === this.q.aspect).label;
        this.questionEl.textContent = this.q.question;
        this.consigneEl.innerHTML = `Touche les ${label} une par une pour les marquer — `
            + '<b>les traits en pointillés sont derrière</b>, ils comptent aussi. '
            + 'Puis écris ton total.';
        this.dessinerSolide();
        this.majCompteur();
        this.majEcran();
        this.note('');
        return true;
    }

    showNext() { return this.poser(); }

    // --- Le dessin ----------------------------------------------------------

    dessinerSolide() {
        const s = this.q.solide;
        const d = dessiner(s, COTE, 11);
        this.plan = d;
        this.vues = facesVisibles(s);
        this.cacheesA = aretesCachees(s);
        this.cachesS = sommetsCaches(s);
        const P = (i) => d.points[i];

        // Les faces d'abord, à plat : elles donnent le volume sans jamais
        // masquer un trait — et elles ne reçoivent aucun clic, sans quoi elles
        // voleraient les arêtes qui passent dessus.
        let html = s.faces.map((f, i) => this.vues[i]
            ? `<polygon class="sd-face" points="${f.map(k => P(k).join(',')).join(' ')}"
                 pointer-events="none"></polygon>` : '').join('');

        // Les arêtes cachées EN DESSOUS des visibles : un pointillé qui passe
        // par-dessus un trait plein donne un dessin sale.
        const arete = (k, cachee) => {
            const [a, b] = s.aretes[k];
            return `<line class="sd-arete ${cachee ? 'sd-arete--cachee' : ''}" data-arete="${k}"
                x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}"
                pointer-events="none"></line>`;
        };
        html += s.aretes.map((_, k) => this.cacheesA[k] ? arete(k, true) : '').join('');
        html += s.aretes.map((_, k) => this.cacheesA[k] ? '' : arete(k, false)).join('');

        // Puis les cibles, par-dessus tout, pour que le doigt trouve toujours
        // quelque chose — et les marques juste en dessous, mais APRÈS les
        // sommets et les pastilles : dessinées avant, elles passaient dessous
        // et l'élève ne voyait pas ce qu'il venait de compter.
        if (this.q.aspect === 'aretes') {
            html += s.aretes.map(([a, b], k) =>
                `<line class="sd-cible sd-cible--arete" data-cible="${k}"
                    x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}"></line>`).join('');
        }
        if (this.q.aspect !== 'aretes') {
            const pts = this.q.aspect === 'sommets'
                ? s.sommets.map((_, i) => ({ p: P(i), cache: this.cachesS[i], i }))
                : s.faces.map((_, i) => ({ p: d.centres[i], cache: !this.vues[i], i }));
            const cls = this.q.aspect === 'sommets' ? 'sd-sommet' : 'sd-pastille';
            html += pts.map(({ p, cache, i }) =>
                `<circle class="${cls} ${cache ? cls + '--cachee' : ''}" data-point="${i}"
                    cx="${p[0]}" cy="${p[1]}" r="${this.q.aspect === 'sommets' ? 2.6 : 3}"
                    pointer-events="none"></circle>`).join('');
            html += '<g data-marques></g>';
            html += pts.map(({ p, i }) =>
                `<circle class="sd-cible" data-cible="${i}" cx="${p[0]}" cy="${p[1]}" r="7"></circle>`).join('');
        }
        if (this.q.aspect === 'aretes') html += '<g data-marques></g>';
        this.svg.innerHTML = html;
        this.marquesEl = this.svg.querySelector('[data-marques]');
        this.svg.querySelectorAll('[data-cible]').forEach(el => {
            el.addEventListener('click', () => this.basculer(Number(el.dataset.cible)));
        });
        this.peindreMarques();
    }

    /** Les marques : un trait vert sur l'arête, une pastille sur le point. */
    peindreMarques() {
        const s = this.q.solide;
        const P = (i) => this.plan.points[i];
        const ordre = [...this.marques];
        const numeroter = this.avecNumeros;
        // LA FACE COMPTÉE SE TEINTE. Une pastille posée au centre d'une face se
        // confond avec un sommet, et sur une face cachée elle flotte au milieu
        // du dessin sans qu'on sache à quoi elle appartient. Un aplat vert
        // translucide, lui, dit exactement quelle face est prise — et laisse
        // voir les arêtes qui passent dessous.
        const teintes = (this.q.aspect === 'faces' && this.facesColorees)
            ? ordre.map(k => `<polygon class="sd-marque sd-face--comptee"
                points="${s.faces[k].map(i => P(i).join(',')).join(' ')}"></polygon>`).join('')
            : '';
        this.marquesEl.innerHTML = teintes + ordre.map((k, rang) => {
            const n = rang + 1;
            if (this.q.aspect === 'aretes') {
                const [a, b] = s.aretes[k];
                const mx = (P(a)[0] + P(b)[0]) / 2, my = (P(a)[1] + P(b)[1]) / 2;
                return `<line class="sd-marque sd-marque--arete" x1="${P(a)[0]}" y1="${P(a)[1]}"
                        x2="${P(b)[0]}" y2="${P(b)[1]}"></line>
                    <circle class="sd-marque sd-marque--point" cx="${mx}" cy="${my}" r="3.4"></circle>
                    ${numeroter ? `<text class="sd-numero" x="${mx}" y="${my + 1.6}">${n}</text>` : ''}`;
            }
            const p = this.q.aspect === 'sommets' ? P(k) : this.plan.centres[k];
            return `<circle class="sd-marque sd-marque--point" cx="${p[0]}" cy="${p[1]}" r="3.6"></circle>
                ${numeroter ? `<text class="sd-numero" x="${p[0]}" y="${p[1] + 1.6}">${n}</text>` : ''}`;
        }).join('');
    }

    /**
     * MARQUER, C'EST COMPTER. Le numéro qui s'inscrit sur la marque est ce qui
     * distingue ce jeu d'un coloriage : l'élève lit son propre décompte au fur
     * et à mesure, et voit tout de suite s'il repasse sur une arête déjà prise.
     */
    basculer(k) {
        if (this.isDemo || this.fini) return;
        if (this.marques.has(k)) this.marques.delete(k); else this.marques.add(k);
        this.peindreMarques();
        this.majCompteur();
    }

    effacer() {
        if (this.isDemo) return;
        this.marques = new Set();
        this.peindreMarques();
        this.majCompteur();
    }

    majCompteur() {
        this.compteurEl.textContent = accorder(this.marques.size, this.q.aspect);
    }

    // --- Répondre -----------------------------------------------------------

    peindrePave() {
        this.paveEl.innerHTML = `<span class="sd-ecran" data-ecran></span>`
            + [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(c =>
                `<button type="button" class="sd-touche" data-chiffre="${c}">${c}</button>`).join('')
            + `<button type="button" class="sd-touche" data-effacer-saisie>⌫</button>
               <button type="button" class="sd-btn sd-btn--ok" data-valider>✓ Valider</button>`;
        this.ecranEl = this.paveEl.querySelector('[data-ecran]');
        this.paveEl.querySelectorAll('[data-chiffre]').forEach(b => {
            b.onclick = () => this.taper(b.dataset.chiffre);
        });
        this.paveEl.querySelector('[data-effacer-saisie]').onclick = () => {
            this.saisie = this.saisie.slice(0, -1); this.majEcran();
        };
        this.paveEl.querySelector('[data-valider]').onclick = () => this.valider();
    }

    taper(c) {
        if (this.isDemo || this.fini) return;
        if (this.saisie.length < 3) this.saisie += c;
        this.majEcran();
    }

    majEcran() {
        if (!this.ecranEl) return;
        this.ecranEl.textContent = this.saisie || '?';
        this.ecranEl.classList.toggle('sd-ecran--vide', !this.saisie);
    }

    valider() {
        if (this.isDemo || this.fini || !this.saisie) {
            if (!this.saisie) this.note('Écris d\'abord ton total avec les chiffres.');
            return;
        }
        const donne = Number(this.saisie);
        const attendu = this.q.reponse;
        if (donne === attendu) {
            this.fini = true;
            this.reussis++;
            const e = euler(this.q.solide);
            this.note(`✅ ${attendu}, c'est cela. ${this.q.explication}`, 'ok');
            // Pas d'élément passé au bilan : la pastille verte se poserait sur
            // le dessin, et c'est le dessin qu'on veut continuer à voir.
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: this.q.question, expected: String(attendu), given: this.saisie,
                explanation: this.q.explication,
                points: 10 + (e.A > 10 ? 5 : 0)
            });
            setTimeout(() => { if (this.isRunning) this.showNext(); }, 3200);
            return;
        }
        // LA CORRECTION MONTRE CE QU'ON A OUBLIÉ. Un nombre annoncé n'apprend
        // rien ; les arêtes non marquées qui clignotent, si.
        this.montrerOublis();
        const combien = this.marques.size;
        const label = ASPECTS.find(a => a.id === this.q.aspect).label;
        const piste = donne < attendu
            ? (combien === donne
                ? `Tu en as marqué ${combien} : il en reste. Celles qui clignotent, tu ne les as `
                    + 'pas prises — regarde les pointillés, ils sont derrière.'
                : 'Il en manque : celles qui clignotent n\'ont pas été marquées.')
            : `Il y en a moins que ça : tu as peut-être compté deux fois les mêmes ${label}.`;
        this.note(`❌ Ce n'est pas ${donne}. ${piste}`, 'ko');
        this.saisie = '';
        this.majEcran();
        // `silencieux` : la tentative est enregistrée, mais SANS carte d'erreur
        // par-dessus le solide. Toute la correction est là, sur le dessin —
        // une carte rouge qui le recouvre priverait l'élève de ce qu'il doit
        // justement regarder : les arêtes oubliées, en train de clignoter.
        this.onWrongAnswer(null, {
            concept: COMPETENCE, questionText: this.q.question,
            input: String(donne), expected: String(attendu),
            explanation: this.q.explication, customMessage: piste, silencieux: true
        });
    }

    montrerOublis() {
        const total = compter(this.q.solide, this.q.aspect);
        const manquants = [];
        for (let i = 0; i < total; i++) if (!this.marques.has(i)) manquants.push(i);
        manquants.forEach(i => {
            const el = this.q.aspect === 'aretes'
                ? this.svg.querySelector(`[data-arete="${i}"]`)
                : this.svg.querySelector(`[data-point="${i}"]`);
            if (!el) return;
            const cls = this.q.aspect === 'aretes' ? 'sd-oubli' : 'sd-oubli-point';
            el.classList.add(cls);
            setTimeout(() => el.classList.remove(cls), 3200);
        });
    }

    // --- Aider --------------------------------------------------------------

    aider() {
        if (this.isDemo) return;
        const s = this.q.solide;
        const caches = this.q.aspect === 'aretes' ? this.cacheesA.filter(Boolean).length
            : (this.q.aspect === 'sommets' ? this.cachesS.filter(Boolean).length
                : this.vues.filter(v => !v).length);
        const label = ASPECTS.find(a => a.id === this.q.aspect).label;
        // ON DIT LA MÉTHODE, PAS LE NOMBRE.
        this.note(`Ce solide a des ${label} que tu ne vois pas : il y en a ${caches} `
            + `derrière — en pointillés, ou de l'autre côté. Marque d'abord tout ce que tu `
            + `vois, puis va chercher celles-là. ${s.famille === 'prisme'
                ? 'Souviens-toi qu\'un prisme a DEUX bases identiques.'
                : (s.famille === 'pyramide'
                    ? 'Souviens-toi que tout monte vers UN seul sommet.'
                    : 'Regarde-le comme deux pyramides collées.')}`);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'sd-note' + (ton ? ` sd-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.q) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say(direMethode(this.q.solide, this.q.aspect), this.svg);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le robot marque tout, en commençant par ce qui se voit — puis il
        // annonce qu'il va chercher derrière. C'est là qu'est la leçon.
        const total = compter(this.q.solide, this.q.aspect);
        const cache = (i) => this.q.aspect === 'aretes' ? this.cacheesA[i]
            : (this.q.aspect === 'sommets' ? this.cachesS[i] : !this.vues[i]);
        const ordre = [...Array(total).keys()].filter(i => !cache(i))
            .concat([...Array(total).keys()].filter(cache));
        let annonce = false;
        for (const i of ordre) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            if (cache(i) && !annonce) {
                annonce = true;
                cur.say('Et maintenant celles de DERRIÈRE. C\'est là qu\'on se trompe : '
                    + 'elles ne se voient pas, mais elles existent.', this.svg);
                if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
            }
            const el = this.svg.querySelector(`[data-cible="${i}"]`);
            if (el && !await cur.tap(el)) return fin();
            this.marques.add(i);
            this.peindreMarques();
            this.majCompteur();
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`J'en ai marqué ${total}. ${this.q.explication}`, this.compteurEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineSolides(container, isDemo, params) {
    const jeu = new Solides(container, isDemo, params);
    jeu.start();
    return jeu;
}
