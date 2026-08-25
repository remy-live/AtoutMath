// LE PARKING — à l'écran.
//
// Rémy : « Le but du jeu est de déplacer les véhicules pour que tous les
// véhicules de gauche se retrouvent à droite et ceux de droite à gauche. Les
// véhicules se déplacent case par case sachant qu'une voiture ne peut pas
// SAUTER au-dessus d'une autre ! »
//
// UNE TOUCHE QUAND C'EST ÉVIDENT, DEUX QUAND ÇA NE L'EST PAS. Une voiture
// coincée entre deux places libres a le choix : on la sélectionne, puis on
// désigne où elle va. Mais la plupart du temps elle n'a qu'une sortie, et la
// toucher suffit. On ne force donc jamais deux gestes là où un seul dit tout —
// c'est ce qui rend jouable une partie de cent quatre coups.
//
// CENT QUATRE COUPS, OUI. C'est le minimum démontré du plateau de la revue, et
// c'est pour cela qu'il s'appelle « le jeu de fin de semaine ». Le compteur
// affiche donc trois choses en permanence : ce qu'on a joué, le minimum, et
// surtout CE QU'IL RESTE au plus court. Sans ce dernier nombre, une partie
// aussi longue ressemble à un couloir sans fin ; avec lui, chaque coup se juge.
//
// ON NE PEUT PAS PERDRE, ON PEUT SEULEMENT RALLONGER. Tout coup se défait —
// une voiture qui a glissé sur une place libre peut revenir —, donc aucune
// position n'est morte, contrairement aux grenouilles. Le blocage vient de la
// PLACE : quatre cases libres pour huit voitures, et une voie où l'on ne se
// double pas. C'est un autre raisonnement, et les deux jeux se complètent.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    plateauParking, departParking, coupsPossiblesParking, jouerParking,
    estGagneParking, restantsParking, prochainCoupParking, minimumParking,
    qualiteParking, TAILLES_PARKING
} from '../core/parking.js';

const COMPETENCE = 'defi.parking';

/** Une voiture vue de dessus : une carrosserie, un toit, quatre roues. */
export function voitureSvg(fonce, clair) {
    return `<svg viewBox="0 0 60 100" aria-hidden="true">
        <rect x="2" y="12" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="50" y="12" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="2" y="66" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="50" y="66" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="6" y="4" width="48" height="92" rx="16" fill="${clair}"
            stroke="${fonce}" stroke-width="3"/>
        <rect x="14" y="30" width="32" height="30" rx="7" fill="#4a5568"/>
        <path d="M16 16 q14 -6 28 0" fill="none" stroke="${fonce}" stroke-width="3"
            stroke-linecap="round"/>
    </svg>`;
}

class Parking extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'parking');
        const t = TAILLES_PARKING[this.params.taille] || TAILLES_PARKING.moyen;
        this.n = t.n;
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .pk-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.4cqh, 12px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .pk-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                .pk-plateau {
                    position: relative; flex: 0 0 auto;
                    --pk-case: clamp(22px, min(calc(92cqw / var(--pk-l, 5)),
                                     calc(84cqh / var(--pk-h, 4))), 96px);
                    --pk-bord: calc(var(--pk-case) * .12);
                    padding: var(--pk-bord);
                    width: calc(var(--pk-case) * var(--pk-l, 5));
                    height: calc(var(--pk-case) * var(--pk-h, 4));
                    box-sizing: content-box;
                }
                /* LE BITUME NE COUVRE QUE LES CASES QUI EXISTENT.
                   Un grand rectangle gris derrière tout le plateau serait plus
                   simple à écrire, mais il mentirait : il laisserait croire
                   qu'on peut rouler dans les coins vides, alors que LE PLATEAU
                   N'EST PAS UN RECTANGLE — c'est justement tout le sujet du
                   jeu. Chaque case pose donc son propre morceau de goudron,
                   posé dessous, et les morceaux voisins se rejoignent d'eux-
                   mêmes en une route continue. */
                .pk-sol {
                    position: absolute; background: #9aa3ad; box-sizing: content-box;
                    width: var(--pk-case); height: var(--pk-case);
                    margin: calc(var(--pk-bord) * -1); padding: var(--pk-bord);
                    border-radius: calc(var(--pk-case) * .18);
                }
                .pk-case {
                    position: absolute; box-sizing: border-box;
                    background: #fff; border: 2px solid #43506a; border-radius: 6px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: default; -webkit-tap-highlight-color: transparent;
                    /* En POURCENTAGE, ce creux se calculerait sur la largeur du
                       plateau — la case étant en position absolue — et les
                       voitures se retrouvaient grosses comme des pouces. */
                    padding: calc(var(--pk-case) * .07);
                }
                .pk-case--jouable { cursor: pointer; }
                .pk-case--jouable:hover { filter: brightness(1.05); }
                /* La place de dégagement : la seule où l'on se range pour
                   laisser passer. On la marque, parce que c'est le sujet. */
                .pk-case--place { border-style: dashed; background: #f2f5f9; }
                .pk-case--vise { box-shadow: 0 0 0 4px rgba(109, 92, 246, .6); }
                .pk-case--cible { background: #ede9ff; border-color: #6d5cf6; }
                .pk-case--montre { box-shadow: 0 0 0 4px rgba(183, 121, 31, .6); }
                .pk-case svg { width: 100%; height: 100%; display: block; }

                .pk-compte {
                    font-weight: 700; font-size: clamp(11px, 2.4cqh, 15px);
                    display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
                }
                .pk-compte b { color: #4c3fd0; }
                .pk-compte .pk-detour { color: #b7791f; }
                .pk-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .pk-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .pk-note { min-height: 2.2em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .pk-note--ok { color: #2f855a; }
                .pk-note--ko { color: #c53030; }
            </style>
            <div class="pk-wrap">
                <div class="pk-corps"><div class="pk-plateau" id="pk-plateau"></div></div>
                <div class="pk-compte" id="pk-compte"></div>
                <div class="pk-note" id="pk-note"></div>
                <div class="pk-barre">
                    <button type="button" class="pk-btn" id="pk-aide">💡 Le bon coup</button>
                    <button type="button" class="pk-btn" id="pk-annule">↶ Annuler</button>
                    <button type="button" class="pk-btn" id="pk-neuf">Recommencer</button>
                </div>
            </div>`;
        this.plateauEl = this.container.querySelector('#pk-plateau');
        this.compteEl = this.container.querySelector('#pk-compte');
        this.noteEl = this.container.querySelector('#pk-note');
        this.container.querySelector('#pk-aide').onclick = () => this.aider();
        this.container.querySelector('#pk-annule').onclick = () => this.annuler();
        this.container.querySelector('#pk-neuf').onclick = () => this.poser();
        this.poser();
    }

    poser() {
        this.p = plateauParking(this.n);
        this.etat = departParking(this.p);
        this.histoire = [];
        this.vise = null;
        this.montre = null;
        this.coups = 0;
        this.fini = false;
        this.dessiner();
        this.note(`Échange les ${this.n} bleues et les ${this.n} rouges. `
            + `Le minimum est de ${minimumParking(this.n)} coups — c'est long, c'est normal.`);
    }

    dessiner() {
        const p = this.p;
        this.plateauEl.style.setProperty('--pk-l', p.largeur);
        this.plateauEl.style.setProperty('--pk-h', p.hauteur);
        const coups = this.fini ? [] : coupsPossiblesParking(p, this.etat);
        const partants = new Set(coups.map(c => c.de));
        const cibles = this.vise === null
            ? new Set()
            : new Set(coups.filter(c => c.de === this.vise).map(c => c.vers));

        const sol = p.cases.map(c => `<div class="pk-sol" style="left:calc(var(--pk-case) * ${c.x});`
            + ` top:calc(var(--pk-case) * ${c.y})"></div>`).join('');
        this.plateauEl.innerHTML = sol + p.cases.map((c, i) => {
            const classes = ['pk-case'];
            if (c.zone === 'place') classes.push('pk-case--place');
            if (partants.has(i) || cibles.has(i)) classes.push('pk-case--jouable');
            if (this.vise === i) classes.push('pk-case--vise');
            if (cibles.has(i)) classes.push('pk-case--cible');
            if (this.montre === i) classes.push('pk-case--montre');
            const v = this.etat[i];
            const auto = v === 'B' ? voitureSvg('#1c3a8a', '#2f5fd0')
                : v === 'R' ? voitureSvg('#8f1f14', '#e04a3a') : '';
            return `<div class="${classes.join(' ')}" data-i="${i}"
                style="left:calc(var(--pk-case) * ${c.x}); top:calc(var(--pk-case) * ${c.y});
                width:var(--pk-case); height:var(--pk-case)">${auto}</div>`;
        }).join('');
        this.plateauEl.querySelectorAll('[data-i]').forEach(el => {
            el.onclick = () => this.toucher(Number(el.dataset.i));
        });

        const restants = this.fini ? 0 : restantsParking(p, this.etat);
        const mini = minimumParking(this.n);
        const detour = restants === null ? 0 : this.coups + restants - mini;
        this.compteEl.innerHTML = `<span><b>${this.coups}</b> coups joués</span>`
            + `<span>minimum : <b>${mini}</b></span>`
            + (this.fini ? '' : `<span>il en reste <b>${restants}</b> au plus court</span>`)
            + (detour > 0 ? `<span class="pk-detour">${detour} de détour</span>` : '');
    }

    /**
     * UNE TOUCHE SI LA VOITURE N'A QU'UNE SORTIE, DEUX SINON. C'est ce qui rend
     * jouable une partie de cent coups : on ne demande le second geste que
     * lorsqu'il apporte vraiment une information.
     */
    toucher(i) {
        if (this.isDemo || this.fini) return;
        this.montre = null;
        const coups = coupsPossiblesParking(this.p, this.etat);

        // Second temps : on désigne la place où va la voiture sélectionnée.
        if (this.vise !== null) {
            const c = coups.find(x => x.de === this.vise && x.vers === i);
            if (c) return this.deplacer(c.de, c.vers);
            if (i === this.vise) { this.vise = null; this.dessiner(); this.note(''); return; }
        }

        const sorties = coups.filter(c => c.de === i);
        if (!sorties.length) {
            this.vise = null;
            this.dessiner();
            this.note(this.etat[i]
                ? 'Cette voiture est coincée : toutes les places autour d\'elle sont prises. '
                    + 'Une voiture ne saute pas par-dessus une autre.'
                : 'C\'est une place LIBRE — touche plutôt la voiture que tu veux y mettre.', 'ko');
            return;
        }
        if (sorties.length === 1) return this.deplacer(sorties[0].de, sorties[0].vers);
        this.vise = i;
        this.dessiner();
        this.note('Cette voiture a plusieurs sorties : touche la place où tu veux la mettre.');
    }

    deplacer(de, vers) {
        const avant = restantsParking(this.p, this.etat);
        this.histoire.push(this.etat.slice());
        this.etat = jouerParking(this.p, this.etat, de, vers);
        this.coups++;
        this.vise = null;
        this.dessiner();
        if (estGagneParking(this.p, this.etat)) return this.gagner();
        const apres = restantsParking(this.p, this.etat);
        // UN COUP QUI ÉLOIGNE N'EST PAS UNE FAUTE — il n'y a pas de faute dans
        // ce jeu, seulement des détours. Mais s'en apercevoir au moment où on
        // le fait est toute la différence entre pousser des voitures et jouer.
        this.note(apres > avant
            ? 'Ce coup t\'éloigne : il te reste un coup de plus qu\'avant.'
            : '');
    }

    annuler() {
        if (this.isDemo || this.fini || !this.histoire.length) return;
        this.etat = this.histoire.pop();
        this.coups = Math.max(0, this.coups - 1);
        this.vise = null;
        this.montre = null;
        this.dessiner();
        this.note('Coup annulé.');
    }

    aider() {
        if (this.isDemo || this.fini) return;
        const c = prochainCoupParking(this.p, this.etat);
        if (!c) return;
        this.aides++;
        this.montre = c.de;
        this.vise = null;
        this.dessiner();
        const dest = this.p.cases[c.vers];
        this.note(`Bouge cette voiture ${c.couleur === 'B' ? 'bleue' : 'rouge'} vers `
            + `${dest.zone === 'place' ? 'la place de dégagement'
                : dest.zone === 'voie' ? 'la voie'
                    : dest.zone === 'gauche' ? 'le parking de gauche' : 'le parking de droite'}. `
            + 'La question à se poser sans arrêt : QUI doit se ranger pour laisser passer '
            + 'qui ? Il n\'y a qu\'une place pour cela.');
    }

    gagner() {
        this.fini = true;
        this.vise = null;
        this.montre = null;
        this.dessiner();
        const q = qualiteParking(this.n, this.coups);
        this.note(q.parfait
            ? `🏆 Parfait — ${q.joues} coups, le minimum démontré de ce parking.`
            : `🏆 Gagné en ${q.joues} coups. Le minimum est ${q.mini} : `
                + `${q.detours} coup${q.detours > 1 ? 's' : ''} de détour.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Le parking, ${this.n} contre ${this.n}`,
            expected: `${q.mini} coups`, given: `${q.joues} coups`,
            points: Math.max(10, 45 - Math.round(q.detours / 4) - this.aides * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pk-note' + (ton ? ` pk-note--${ton}` : '');
    }

    /**
     * Le robot montre CE QUI FAIT LE JEU, qui n'est pas de pousser des voitures
     * mais de comprendre à quoi sert la place du bas. Sans elle, deux voitures
     * qui se croisent dans la voie sont coincées pour toujours.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.p) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        cur.say('Une seule voie relie les deux parkings, et on ne se double pas dessus. '
            + 'Alors regarde la case en pointillés, sous la voie : c\'est la SEULE place où '
            + 'une voiture peut se ranger pour en laisser passer une autre.', this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Tout le jeu est là : qui se range, et quand ? Une voiture qui entre dans la '
            + 'voie sans savoir où elle va se ranger bloque tout le monde derrière elle.',
        this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let i = 0; i < 8; i++) {
            const c = prochainCoupParking(this.p, this.etat);
            if (!c) break;
            this.etat = jouerParking(this.p, this.etat, c.de, c.vers);
            this.coups++;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 600) || !this.isRunning) return fin();
        }
        cur.say(`Et il en faut ${minimumParking(this.n)} comme ça, au minimum. C'est bien un `
            + 'jeu de fin de semaine — le compteur t\'indique à chaque coup combien il en '
            + 'reste au plus court.', this.compteEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineParking(container, isDemo, params) {
    const game = new Parking(container, isDemo, params);
    game.start();
    return game;
}
