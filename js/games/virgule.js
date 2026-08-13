// × 10, × 100, × 1000 — LA VIRGULE SE DÉCALE.
//
// Trois temps, et l'ordre est le sujet même de l'exercice.
//
//   DÉCALER.  Le nombre est posé dans un tableau de numération, et l'élève
//             déplace LA VIRGULE d'un rang à l'autre, à la main : vers la
//             DROITE pour multiplier, vers la gauche pour diviser. Les chiffres
//             restent à leur place. On ne demande aucun résultat : on fait
//             faire le geste, et le geste EST la règle — celle que le
//             professeur dit en classe, dans les mêmes mots.
//
//             Faire glisser les chiffres donnait le même résultat et disait
//             l'inverse. Les deux lectures sont vraies — un chiffre change de
//             rang, la virgule change de place — mais une seule est celle que
//             l'élève entend en cours, et c'est celle-là qu'il doit voir. Le
//             tableau montre l'autre en même temps, sans avoir à la nommer :
//             les rangs restent écrits en tête de colonne, et le chiffre qui
//             valait des dixièmes se retrouve à gauche de la virgule.
//   CHOISIR.  Quatre propositions, dont les trois fausses règles du chapitre.
//             On n'écrit pas encore ; on reconnaît.
//   ÉCRIRE.   Le résultat au clavier, sans tableau. C'est là qu'on saura si
//             quelque chose est resté.
//
// Pourquoi cet ordre : « ×10, on ajoute un zéro » est une règle qui marche pour
// les entiers et casse dès la première décimale. On ne la déloge pas en la
// contredisant — on la déloge en donnant à voir ce qui se passe vraiment, assez
// longtemps pour que l'image remplace la formule.
//
// Les nombres sont manipulés SOUS FORME DE TEXTE dans core/virgule.js : un
// exercice sur l'écriture décimale ne peut pas se permettre les poussières du
// binaire.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    RANGS, nomRang, placer, combler, decaler, normaliser, tirerQuestion,
    verifierGlissement, verifierEcriture, expliquer, IDS_NIVEAUX
} from '../core/virgule.js';
import { suivreDefilement } from '../ui/defilement.js';

const SKILL = 'num.dec.puissances10';

// Les rangs affichés. On garde le tableau STABLE d'une question à l'autre :
// des colonnes qui apparaissent et disparaissent obligeraient à relire les
// en-têtes à chaque fois, et c'est justement ce qu'on veut rendre automatique.
const COLONNES = RANGS.filter(r => r.e <= 4 && r.e >= -3);
const INDEX = new Map(COLONNES.map((r, i) => [r.e, i]));

class Virgule extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'virgule');
        this.niveau = IDS_NIVEAUX.includes(this.params.niveau) ? this.params.niveau : 'facile';
        this.parPhase = Math.max(1, Number(this.params.parPhase) || 3);
        this.rng = makeRng(this.params.seed);
        this.phase = 0;              // 0 glisser, 1 qcm, 2 écrire
        this.acquis = 0;             // réussites dans la phase en cours
        this.reussis = 0;
        this.erreurs = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .vg-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 9px;
                    width: 100%; height: 100%; color: var(--text-main); overflow-y: auto;
                    user-select: none; -webkit-user-select: none;
                }
                .vg-haut {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    flex-wrap: wrap; width: 100%; flex: 0 0 auto;
                    font-size: clamp(11px, 2.6cqw, 14px); font-weight: 700;
                }
                .vg-score { color: var(--text-muted); font-weight: 600; }
                .vg-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .82rem; padding: 4px 10px;
                }
                .vg-btn:hover { background: var(--bg-hover); }

                /* Le fil des trois temps : on doit voir où l'on en est, et
                   surtout qu'il RESTE quelque chose après. */
                .vg-fil { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .vg-etape {
                    font-size: .72rem; font-weight: 800; padding: 3px 11px; border-radius: 999px;
                    background: var(--bg-hover); color: var(--text-muted);
                }
                .vg-etape--active { background: var(--primary); color: #fff; }
                .vg-etape--faite { background: color-mix(in srgb, var(--success) 25%, transparent); color: var(--success); }

                /* L'OPÉRATION, en grand. C'est la seule chose à lire. */
                .vg-op {
                    font-size: clamp(21px, 6cqw, 34px); font-weight: 800; flex: 0 0 auto;
                    letter-spacing: .01em; text-align: center;
                }
                .vg-op b { color: var(--primary); }
                .vg-consigne {
                    text-align: center; max-width: 560px; flex: 0 0 auto;
                    font-size: clamp(12px, 2.9cqw, 15px); line-height: 1.35; color: var(--text-muted);
                }

                /* LE TABLEAU DE NUMÉRATION. */
                .vg-cadre {
                    width: 100%; overflow-x: auto; flex: 0 0 auto; padding: 3px;
                    display: flex; justify-content: center;
                }
                /* « inline-grid » et non « grid » : la boîte doit épouser EXACTEMENT
                   ses colonnes. En grille bloc, elle occupait toute la largeur
                   et centrait ses pistes — les chiffres, eux, sont posés en
                   absolu depuis le bord gauche de la boîte. Résultat : les
                   chiffres et les en-têtes étaient décalés, et la virgule
                   tombait entre les milliers au lieu des unités. */
                .vg-tab {
                    position: relative; display: inline-grid; width: fit-content;
                    grid-auto-flow: column; flex: 0 0 auto;
                    background: var(--bg-panel); border: 2px solid var(--border);
                    border-radius: 14px; box-shadow: var(--shadow-sm); overflow: hidden;
                }
                .vg-col {
                    width: var(--vg-w); display: flex; flex-direction: column;
                    border-right: 1px solid var(--border);
                }
                .vg-col:last-child { border-right: none; }
                .vg-col--dec { background: color-mix(in srgb, var(--primary) 7%, transparent); }
                .vg-tete {
                    font-size: clamp(8px, 1.9cqw, 11px); font-weight: 700; color: var(--text-muted);
                    text-align: center; padding: 5px 2px; line-height: 1.1; min-height: 2.6em;
                    border-bottom: 1px solid var(--border);
                }
                .vg-case { height: var(--vg-h); }

                /* La virgule est DESSINÉE SUR LE TABLEAU, pas dans un chiffre :
                   c'est un objet à part entière, qu'on déplace d'une frontière
                   de colonne à la suivante. Tout l'exercice tient dans ce
                   trait — et dans le fait qu'il GLISSE, doucement, pour qu'on
                   voie le passage d'un rang à l'autre au lieu de deux états. */
                .vg-virgule {
                    position: absolute; top: 0; bottom: 0; width: 3px;
                    background: var(--danger); z-index: 3; pointer-events: none;
                    transition: left .34s cubic-bezier(.35, .1, .25, 1);
                }
                /* LE REPÈRE DES UNITÉS. Les en-têtes disent le rang des
                   colonnes et ne bougent pas — c'est ce qui fait qu'on VOIT le
                   changement. Mais une fois la virgule déplacée, ce n'est plus
                   la colonne « unités » qui porte les unités : c'est celle
                   juste à gauche du trait rouge. Sans ce repère, le tableau
                   dirait deux choses à la fois. */
                .vg-unites {
                    position: absolute; bottom: 2px; height: 17px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 9px; font-weight: 800; letter-spacing: .02em;
                    color: #fff; background: var(--danger); border-radius: 5px;
                    z-index: 4; pointer-events: none; white-space: nowrap;
                    transition: left .34s cubic-bezier(.35, .1, .25, 1);
                }
                .vg-virgule::after {
                    content: ','; position: absolute; bottom: -2px; left: 50%;
                    transform: translateX(-50%); color: var(--danger);
                    font-size: clamp(24px, 6cqw, 38px); font-weight: 900; line-height: .6;
                }

                /* Les chiffres restent, mais gardent leur transition : le
                   tableau se réutilise d'une question à l'autre, et une tuile
                   qui se repose doit le faire proprement.
                   S'ils se téléportaient, on verrait deux états sans voir le
                   passage de l'un à l'autre — donc rien. */
                .vg-chiffre {
                    position: absolute; width: var(--vg-w); height: var(--vg-h);
                    display: flex; align-items: center; justify-content: center;
                    font-size: clamp(19px, 5cqw, 30px); font-weight: 800; color: var(--text-main);
                    transition: transform .45s cubic-bezier(.34, 1.2, .5, 1); z-index: 2;
                }
                .vg-chiffre span {
                    width: 78%; height: 74%; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center;
                    background: color-mix(in srgb, var(--primary) 16%, var(--bg-panel));
                    box-shadow: 0 2px 0 rgba(15,23,42,.14);
                }
                .vg-chiffre--zero span { opacity: .55; }
                /* Un zéro de remplissage : il est VRAI (le nombre en a besoin)
                   mais il n'était pas dans le nombre de départ. On le montre
                   donc différemment — c'est lui qu'on oublie d'écrire. */
                .vg-chiffre--comble { animation: vg-apparait .4s ease-out; }
                @keyframes vg-apparait { from { opacity: 0; transform: scale(.5); } }
                .vg-chiffre--comble span {
                    background: color-mix(in srgb, var(--warning) 22%, var(--bg-panel));
                    border: 2px dashed color-mix(in srgb, var(--warning) 70%, transparent);
                    color: var(--text-muted); opacity: 1;
                }

                .vg-fleches { display: flex; gap: 10px; justify-content: center; flex: 0 0 auto; flex-wrap: wrap; }
                .vg-fleche {
                    display: flex; flex-direction: column; align-items: center; gap: 1px;
                    min-width: 96px; padding: 9px 14px; border-radius: 14px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font: inherit; font-weight: 800;
                    cursor: pointer; box-shadow: 0 3px 0 rgba(15,23,42,.14);
                    -webkit-tap-highlight-color: transparent;
                }
                .vg-fleche:active:not(:disabled) { transform: translateY(3px); box-shadow: none; }
                .vg-fleche:disabled { opacity: .32; cursor: default; }
                .vg-fleche small { font-size: .68rem; font-weight: 700; color: var(--text-muted); }
                .vg-fleche--ok { border-color: var(--success); color: var(--success); }
                .vg-compteur {
                    font-size: clamp(12px, 2.9cqw, 15px); font-weight: 800; flex: 0 0 auto;
                    color: var(--text-muted);
                }
                .vg-compteur b { color: var(--primary); }

                /* Les quatre propositions, en cartes : « 0,025 » ne tient pas
                   dans une bulle ronde. */
                .vg-choix {
                    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: clamp(8px, 2cqw, 13px); width: 100%; max-width: 520px; flex: 0 0 auto;
                }
                .vg-carte {
                    display: flex; align-items: center; justify-content: center;
                    min-height: clamp(54px, 11cqw, 72px); padding: 11px 13px;
                    border-radius: 18px; border: 3px solid rgba(255,255,255,.22);
                    background: linear-gradient(135deg, var(--primary), #8b5cf6);
                    color: #fff; font-weight: 800; font-size: clamp(1.05rem, 4cqw, 1.5rem);
                    cursor: pointer; box-shadow: 0 7px 18px rgba(79,70,229,.32);
                    transition: all .22s cubic-bezier(.4,0,.2,1);
                    -webkit-tap-highlight-color: transparent;
                }
                .vg-carte:hover:not(:disabled) { transform: translateY(-4px); }
                .vg-carte:disabled { cursor: default; }
                .vg-carte--ok { background: linear-gradient(135deg, #34d399, #16a34a); }
                .vg-carte--ko { background: linear-gradient(135deg, #f87171, #dc2626); }
                .vg-carte--eteinte { opacity: .32; }

                .vg-saisie {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    flex: 0 0 auto; font-size: clamp(22px, 6cqw, 34px); font-weight: 800;
                }
                .vg-ecran {
                    min-width: clamp(140px, 42cqw, 230px); padding: 8px 16px;
                    border: 3px solid var(--primary); border-radius: 14px;
                    background: var(--bg-panel); color: var(--primary); text-align: center;
                }
                .vg-ecran--vide::after { content: '?'; opacity: .4; }
                .vg-pave {
                    display: grid; grid-template-columns: repeat(5, 1fr);
                    gap: clamp(5px, 1.4cqw, 9px); width: 100%; max-width: 400px; flex: 0 0 auto;
                }
                .vg-touche {
                    padding: clamp(9px, 2.4cqw, 13px) 0; border-radius: 12px;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font: inherit; font-weight: 800;
                    font-size: clamp(15px, 3.6cqw, 20px); cursor: pointer;
                    box-shadow: 0 3px 0 rgba(15,23,42,.12);
                    -webkit-tap-highlight-color: transparent;
                }
                .vg-touche:active { transform: translateY(3px); box-shadow: none; }
                .vg-touche--ok { border-color: var(--success); color: var(--success); }
                .vg-touche--eff { border-color: var(--warning); color: var(--warning); }

                .vg-note {
                    min-height: 2.6em; text-align: center; width: 100%; max-width: 580px;
                    font-size: clamp(11px, 2.7cqw, 14px); line-height: 1.4;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .vg-note b { color: var(--text-main); }
                .vg-bulle { display: inline-block; padding: 6px 14px; border-radius: 14px; font-weight: 700; }
                .vg-bulle--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .vg-bulle--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
            </style>
            <div class="vg-wrap">
                <div class="vg-haut">
                    <span class="vg-score" data-score></span>
                    <button type="button" class="vg-btn" data-neuf>↺ Autre nombre</button>
                </div>
                <div class="vg-fil" data-fil></div>
                <p class="vg-op" data-op></p>
                <p class="vg-consigne" data-consigne></p>
                <div class="vg-cadre"><div class="vg-tab" data-tab></div></div>
                <div data-zone></div>
                <p class="vg-note" data-note></p>
            </div>`;

        this.scoreEl = this.container.querySelector('[data-score]');
        this.filEl = this.container.querySelector('[data-fil]');
        this.opEl = this.container.querySelector('[data-op]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.tabEl = this.container.querySelector('[data-tab]');
        suivreDefilement(this.container.querySelector('.vg-cadre'));
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.nouvelleQuestion());

        this.surTouche = (e) => {
            if (this.isDemo) return;
            if (this.phase === 0) {
                if (e.key === 'ArrowRight') { e.preventDefault(); this.glisser(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); this.glisser(-1); }
                if (e.key === 'Enter') { e.preventDefault(); this.validerGlissement(); }
                return;
            }
            if (this.phase !== 2) return;
            if (/^[0-9]$/.test(e.key)) { e.preventDefault(); this.taper(e.key); }
            else if (e.key === ',' || e.key === '.') { e.preventDefault(); this.taper(','); }
            else if (e.key === 'Backspace') { e.preventDefault(); this.taper('eff'); }
            else if (e.key === 'Enter') { e.preventDefault(); this.validerEcriture(); }
        };
        document.addEventListener('keydown', this.surTouche);

        this.construireTableau();
        this.nouvelleQuestion();
    }

    startGameLoop() { /* Au rythme de l'élève : rien à animer en continu. */ }

    // --- Le tableau ------------------------------------------------------------

    construireTableau() {
        // La virgule se place entre les unités (e = 0) et les dixièmes.
        const iUnites = INDEX.get(0);
        this.tabEl.innerHTML = COLONNES.map(r => `
            <div class="vg-col ${r.e < 0 ? 'vg-col--dec' : ''}">
                <div class="vg-tete">${r.court}</div>
                <div class="vg-case"></div>
            </div>`).join('')
            + `<div class="vg-virgule" data-virgule></div>
               <div class="vg-unites" data-unites>unités</div>
               <div data-chiffres></div>`;
        this.chiffresEl = this.tabEl.querySelector('[data-chiffres]');
        this.virguleEl = this.tabEl.querySelector('[data-virgule]');
        this.unitesEl = this.tabEl.querySelector('[data-unites]');
        this.iUnites = iUnites;
        this.majTaille();
        if (!this.redim) {
            this.redim = () => this.majTaille();
            window.addEventListener('resize', this.redim);
        }
    }

    /** La largeur d'une colonne, en pixels, pour placer les chiffres dessus. */
    majTaille() {
        if (!this.tabEl) return;
        const dispo = this.tabEl.parentElement.clientWidth - 8;
        const w = Math.max(30, Math.min(58, Math.floor(dispo / COLONNES.length)));
        const h = Math.round(w * 1.15);
        this.colW = w;
        this.tabEl.style.setProperty('--vg-w', `${w}px`);
        this.tabEl.style.setProperty('--vg-h', `${h}px`);
        this.poserVirgule(w, this.rangsFaits || 0);
        if (this.q) this.placerChiffres(false);
    }

    /** La virgule sur sa frontière, et l'étiquette « unités » juste à gauche. */
    poserVirgule(w, rangs) {
        const bord = (this.iUnites + 1 + rangs) * w;
        this.virguleEl.style.left = `${bord - 1.5}px`;
        if (!this.unitesEl) return;
        this.unitesEl.style.left = `${bord - w + 2}px`;
        this.unitesEl.style.width = `${w - 4}px`;
    }

    /**
     * LES TUILES SONT CRÉÉES UNE FOIS, puis seulement DÉPLACÉES.
     *
     * C'est la différence entre voir un glissement et voir deux états. Si on
     * reconstruisait le contenu à chaque cran, les chiffres apparaîtraient déjà
     * arrivés : le mouvement — qui EST la leçon — n'aurait jamais lieu. On ne
     * touche donc qu'au `transform`, que le navigateur sait animer.
     */
    construireChiffres() {
        if (!this.chiffresEl || !this.q) return;
        const tete = this.tabEl.querySelector('.vg-tete')?.offsetHeight || 30;
        this.chiffresEl.innerHTML = placer(this.q.depart).map(c => `
            <div class="vg-chiffre ${c.chiffre === '0' ? 'vg-chiffre--zero' : ''}"
                 data-e="${c.e}" style="top:${tete}px;left:0">
                <span>${c.chiffre}</span></div>`).join('')
            + `<div data-combles></div>`;
        this.comblesEl = this.chiffresEl.querySelector('[data-combles]');
        this.placerChiffres(false);
    }

    /** Repositionne les tuiles, et repose les zéros de remplissage. */
    placerChiffres(anime = true) {
        if (!this.q || !this.chiffresEl) return;
        const w = this.colW;
        const tuiles = this.chiffresEl.querySelectorAll('[data-e]');
        if (!tuiles.length) return this.construireChiffres();

        // LES CHIFFRES NE BOUGENT PAS : chacun reste sur son rang d'origine.
        tuiles.forEach(el => {
            const i = INDEX.get(Number(el.dataset.e));
            if (!anime) el.style.transition = 'none';
            if (i === undefined) { el.style.opacity = '0'; return; }
            el.style.opacity = '';
            el.style.transform = `translateX(${i * w}px)`;
        });
        // C'EST LA VIRGULE QUI SE DÉPLACE, d'un rang par cran — et le repère
        // des unités la suit, collé à sa gauche.
        this.poserVirgule(w, this.rangsFaits);
        if (!anime) {
            void this.chiffresEl.offsetWidth;
            tuiles.forEach(el => { el.style.transition = ''; });
        }

        // Les zéros qui COMBLENT entre le dernier chiffre et la virgule. Sans
        // eux, après × 1000 le tableau montrerait « 7,777 » avec la virgule
        // trois rangs plus loin et des colonnes vides entre les deux, alors
        // qu'on lit 7777 — et c'est exactement le trou dans lequel l'élève
        // tombe. Ils ne glissent pas : ils apparaissent, parce qu'ils
        // n'étaient pas là avant.
        //
        // `combler` raisonne dans le repère où les chiffres ont bougé ; on
        // ramène ses colonnes dans le nôtre en retirant le décalage.
        const tete = this.tabEl.querySelector('.vg-tete')?.offsetHeight || 30;
        const r = this.rangsFaits;
        const cases = combler(placer(this.q.depart).map(c => ({ ...c, e: c.e + r })));
        this.comblesEl.innerHTML = cases.filter(c => c.implicite && INDEX.has(c.e - r)).map(c => `
            <div class="vg-chiffre vg-chiffre--comble"
                 style="top:${tete}px;left:0;transform:translateX(${INDEX.get(c.e - r) * w}px)">
                <span>0</span></div>`).join('');
    }

    // --- Une question -----------------------------------------------------------

    nouvelleQuestion() {
        this.q = tirerQuestion(this.niveau, this.rng);
        this.rangsFaits = 0;
        this.brouillon = '';
        this.repondu = false;
        this.fautes = 0;
        this.opEl.innerHTML = `${this.q.depart} <b>${this.q.op} ${this.q.facteur}</b> = ?`;
        this.majFil();
        this.majScore();
        this.construireChiffres();
        this.peindreZone();
    }

    majFil() {
        const noms = ['1 · Décaler', '2 · Choisir', '3 · Écrire'];
        this.filEl.innerHTML = noms.map((n, i) => {
            const etat = i < this.phase ? 'faite' : i === this.phase ? 'active' : '';
            const compte = i === this.phase ? ` ${this.acquis}/${this.parPhase}` : '';
            return `<span class="vg-etape ${etat ? 'vg-etape--' + etat : ''}">${n}${compte}</span>`;
        }).join('');
    }

    majScore() {
        this.scoreEl.textContent = `${this.reussis} réussite${this.reussis > 1 ? 's' : ''}`
            + (this.erreurs ? ` · ${this.erreurs} erreur${this.erreurs > 1 ? 's' : ''}` : '');
    }

    peindreZone() {
        if (this.phase === 0) return this.peindreGlisser();
        if (this.phase === 1) return this.peindreQcm();
        return this.peindreEcrire();
    }

    // --- Phase 1 : glisser --------------------------------------------------------

    peindreGlisser() {
        this.consigneEl.innerHTML = `Décale <b>la virgule</b> dans le tableau. Les chiffres, eux, ne bougent pas.`;
        this.zoneEl.innerHTML = `
            <div class="vg-fleches">
                <button type="button" class="vg-fleche" data-sens="1">
                    <span style="font-size:1.5em">→</span><small>× 10 · virgule à droite</small>
                </button>
                <button type="button" class="vg-fleche" data-sens="-1">
                    <span style="font-size:1.5em">←</span><small>÷ 10 · virgule à gauche</small>
                </button>
                <button type="button" class="vg-fleche vg-fleche--ok" data-valider>
                    <span style="font-size:1.1em">✓</span><small>C'est bon</small>
                </button>
            </div>
            <p class="vg-compteur" data-compteur style="text-align:center;margin-top:7px"></p>`;
        this.zoneEl.querySelectorAll('[data-sens]').forEach(b => {
            b.addEventListener('click', () => this.glisser(Number(b.dataset.sens)));
        });
        this.zoneEl.querySelector('[data-valider]').addEventListener('click', () => this.validerGlissement());
        this.majCompteur();
        this.note('Le nombre est posé dans le tableau, chaque chiffre à son rang. '
            + 'Le trait rouge est la virgule : c\'est elle que tu déplaces.');
    }

    majCompteur() {
        const el = this.zoneEl.querySelector('[data-compteur]');
        if (!el) return;
        const n = this.rangsFaits;
        el.innerHTML = n === 0 ? 'virgule à sa place' :
            `virgule décalée de <b>${Math.abs(n)}</b> rang${Math.abs(n) > 1 ? 's' : ''} vers ${n > 0 ? 'la droite' : 'la gauche'}`;
    }

    glisser(sens) {
        if (this.isDemo || this.phase !== 0 || this.repondu) return;
        // On borne au tableau. La virgule doit rester sur une frontière de
        // colonne, et les zéros qu'elle fait apparaître derrière elle doivent
        // avoir un rang où se poser — sinon le tableau mentirait.
        const suivant = this.rangsFaits + sens;
        const frontiere = this.iUnites + 1 + suivant;
        const cases = combler(placer(this.q.depart).map(c => ({ ...c, e: c.e + suivant })));
        const ok = frontiere >= 1 && frontiere <= COLONNES.length - 1
            && cases.every(c => INDEX.has(c.e - suivant));
        if (!ok) {
            this.note('Le tableau s\'arrête là : la virgule n\'aurait plus de rang où aller.', 'ko');
            return;
        }
        this.rangsFaits = suivant;
        this.placerChiffres(true);
        this.majCompteur();
        const lu = decaler(this.q.depart, this.rangsFaits);
        this.note(`Le tableau se lit maintenant <b>${lu}</b>.`);
    }

    validerGlissement() {
        if (this.isDemo || this.repondu) return;
        const r = verifierGlissement(this.q, this.rangsFaits);
        if (r.ok) return this.gagner(`✅ ${this.q.etapes[2]}`);
        this.rater(r.message, null);
    }

    // --- Phase 2 : choisir ---------------------------------------------------------

    peindreQcm() {
        this.consigneEl.innerHTML = 'Quel est le résultat ? Le tableau au-dessus est là si tu hésites.';
        this.zoneEl.innerHTML = `<div class="vg-choix">${this.q.choix.map((c, i) =>
            `<button type="button" class="vg-carte" data-i="${i}">${c.v}</button>`).join('')}</div>`;
        this.zoneEl.querySelectorAll('[data-i]').forEach(b => {
            b.addEventListener('click', () => this.repondreQcm(Number(b.dataset.i), b));
        });
        this.note('Trois de ces réponses sont des erreurs classiques. Une seule est juste.');
    }

    repondreQcm(i, el) {
        if (this.isDemo || this.repondu) return;
        const c = this.q.choix[i];
        if (!c || el.disabled) return;
        if (c.juste) {
            el.classList.add('vg-carte--ok');
            this.zoneEl.querySelectorAll('[data-i]').forEach(b => { b.disabled = true; });
            return this.gagner(`✅ ${this.q.etapes[0]}`);
        }
        el.classList.add('vg-carte--ko');
        this.timerId = setTimeout(() => {
            el.classList.remove('vg-carte--ko');
            el.classList.add('vg-carte--eteinte');
            el.disabled = true;
        }, 650);
        this.rater(c.pourquoi, el);
    }

    // --- Phase 3 : écrire -----------------------------------------------------------

    peindreEcrire() {
        this.consigneEl.innerHTML = 'Écris le résultat. Sans tableau, cette fois.';
        const touches = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ','];
        this.zoneEl.innerHTML = `
            <div class="vg-saisie"><span class="vg-ecran vg-ecran--vide" data-ecran></span></div>
            <div class="vg-pave" style="margin-top:9px">
                ${touches.map(c => `<button type="button" class="vg-touche" data-t="${c}">${c}</button>`).join('')}
                <button type="button" class="vg-touche vg-touche--eff" data-t="eff" aria-label="Effacer">⌫</button>
                <button type="button" class="vg-touche vg-touche--ok" data-t="ok" style="grid-column: span 3">✓ Valider</button>
            </div>`;
        this.ecranEl = this.zoneEl.querySelector('[data-ecran]');
        this.zoneEl.querySelectorAll('[data-t]').forEach(b => {
            b.addEventListener('click', () => {
                if (this.isDemo) return;
                if (b.dataset.t === 'ok') this.validerEcriture();
                else this.taper(b.dataset.t);
            });
        });
        this.majEcran();
        this.note('Repense au tableau : de combien de rangs la virgule se décale-t-elle ?');
    }

    taper(c) {
        if (this.repondu || this.phase !== 2) return;
        if (c === 'eff') this.brouillon = this.brouillon.slice(0, -1);
        else if (c === ',') { if (!this.brouillon.includes(',') && this.brouillon) this.brouillon += ','; }
        else if (this.brouillon.replace(',', '').length < 7) this.brouillon += c;
        this.majEcran();
    }

    majEcran() {
        if (!this.ecranEl) return;
        this.ecranEl.textContent = this.brouillon;
        this.ecranEl.classList.toggle('vg-ecran--vide', !this.brouillon);
    }

    validerEcriture() {
        if (this.isDemo || this.repondu) return;
        const r = verifierEcriture(this.q, this.brouillon);
        if (r.ok) return this.gagner(`✅ ${this.q.etapes[1]}`);
        this.brouillon = '';
        this.majEcran();
        this.rater(r.message, this.ecranEl);
    }

    // --- Réussite et erreur ----------------------------------------------------------

    gagner(message) {
        this.repondu = true;
        this.reussis++;
        this.acquis++;
        this.majScore();
        this.onCorrectAnswer(null, SKILL, {
            points: this.fautes === 0 ? 18 : 9,
            questionText: `${this.q.depart} ${this.q.op} ${this.q.facteur}`,
            given: this.q.resultat, expected: this.q.resultat
        });

        const finPhase = this.acquis >= this.parPhase;
        if (finPhase && this.phase < 2) {
            const suite = ['choisir le résultat parmi quatre', 'écrire le résultat toi-même'][this.phase];
            this.note(`${message}<br>🎉 Temps ${this.phase + 1} terminé — maintenant, ${suite}.`, 'ok');
            this.phase++;
            this.acquis = 0;
        } else if (finPhase) {
            this.note(`${message}<br>🏆 Les trois temps sont faits. On recommence avec d'autres nombres.`, 'ok');
            this.phase = 0;
            this.acquis = 0;
        } else {
            this.note(message, 'ok');
        }
        this.majFil();
        this.timerId = setTimeout(() => { if (this.isRunning) this.nouvelleQuestion(); }, 2600);
    }

    rater(message, el) {
        this.erreurs++;
        this.fautes++;
        this.majScore();
        this.note(message, 'ko');
        this.onWrongAnswer(el, {
            concept: SKILL,
            questionText: `${this.q.depart} ${this.q.op} ${this.q.facteur}`,
            input: this.phase === 0 ? `${this.rangsFaits} rang(s)` : (this.brouillon || 'proposition fausse'),
            expected: this.q.resultat,
            customMessage: message,
            silencieux: true
        });
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="vg-bulle vg-bulle--${ton}">${html}</span>` : html;
    }

    // --- Le robot ---------------------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur?.destroy(); gate?.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Un tableau de numération. Chaque chiffre a son rang.', this.tabEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Le trait rouge, c\'est la virgule. C\'est ELLE qu\'on déplace.', this.virguleEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(`${this.q.op} ${this.q.facteur} : la virgule se décale de `
            + `${Math.abs(this.q.rangs)} rang${Math.abs(this.q.rangs) > 1 ? 's' : ''} vers `
            + `${this.q.rangs > 0 ? 'la DROITE' : 'la GAUCHE'}. Les chiffres, eux, ne bougent pas.`, this.tabEl);
        if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();

        const sens = this.q.rangs > 0 ? '1' : '-1';
        for (let i = 0; i < Math.abs(this.q.rangs); i++) {
            const b = this.zoneEl.querySelector(`[data-sens="${sens}"]`);
            if (b && !await cur.tap(b)) return fin();
            this.rangsFaits += Number(sens);
            this.placerChiffres(true);
            this.majCompteur();
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say(this.q.etapes[1], this.tabEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Surtout pas « on ajoute un zéro » : faux avec une virgule.', this.opEl);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        if (this.redim) { window.removeEventListener('resize', this.redim); this.redim = null; }
        super.destroy();
    }
}

export function engineVirgule(container, isDemo, params) {
    const jeu = new Virgule(container, isDemo, params);
    jeu.start();
    return jeu;
}
