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
    executer, comparer, cleObjet, nomObjet, couperAuMonde, lireProgramme
} from '../core/programmeConstruction.js';

const COMPETENCE = 'geo.construction.programme';

const enAttribut = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Le dessin d'une figure : les tracés, puis les points par-dessus. */
function figureSvg(objets, points, { classe = '', aides = [] } = {}) {
    const cles = new Set(aides.map(cleObjet));
    let out = '';
    (objets || []).forEach(o => {
        const aide = cles.has(cleObjet(o)) ? ' pc-trait--aide' : '';
        if (o.genre === 'cercle') {
            out += `<circle class="pc-trait${aide}" cx="${o.c.x.toFixed(3)}" cy="${o.c.y.toFixed(3)}"
                r="${o.r.toFixed(3)}" fill="none"/>`;
            return;
        }
        const bouts = o.genre === 'droite' ? couperAuMonde(o.a, o.b) : [o.a, o.b];
        if (!bouts) return;
        out += `<line class="pc-trait${aide}" x1="${bouts[0].x.toFixed(3)}" y1="${bouts[0].y.toFixed(3)}"
            x2="${bouts[1].x.toFixed(3)}" y2="${bouts[1].y.toFixed(3)}"/>`;
    });
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
        this.avecModeles = this.params.modeles !== false;
        this.texte = '';
        this.fini = false;
    }

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
                .pc-figures { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 0 0 auto; }
                @container (max-width: 460px) { .pc-figures { grid-template-columns: 1fr; } }
                .pc-cadre {
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 12px;
                    background: var(--card-bg, #fff); padding: 6px; position: relative;
                }
                .pc-cadre--but { border-style: dashed; }
                .pc-cadre--ok { border-color: var(--success); }
                .pc-etiq {
                    position: absolute; top: -9px; left: 10px; padding: 0 6px; font-size: 11px;
                    font-weight: 700; background: var(--card-bg, #fff); color: var(--text-muted);
                }
                .pc-svg { width: 100%; height: clamp(100px, 26vh, 250px); display: block; }
                .pc-trait { stroke: var(--primary); stroke-width: 0.5; fill: none; stroke-linecap: round; }
                .pc-trait--aide { stroke: var(--text-muted); stroke-width: 0.3; opacity: .55; }
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
                @container (max-width: 560px) { .pc-redaction { grid-template-columns: 1fr; } }
                .pc-zone {
                    width: 100%; box-sizing: border-box; min-height: 120px; resize: vertical;
                    border: 1.5px solid var(--border-color, #d7dae3); border-radius: 10px;
                    background: var(--card-bg, #fff); color: var(--text-main);
                    padding: 8px 10px; font: inherit; line-height: 1.55;
                    font-size: clamp(12px, 2.3cqw, 15px);
                }
                .pc-zone:focus { outline: none; border-color: var(--primary); }
                .pc-lignes { display: flex; flex-direction: column; gap: 0; font-size: clamp(10px, 2cqw, 12.5px); }
                .pc-l { display: flex; gap: 6px; line-height: 1.55;
                    font-size: clamp(12px, 2.3cqw, 15px); min-height: 1.55em; }
                .pc-l small { font-size: .82em; line-height: 1.55; }
                .pc-l--ok { color: var(--success); }
                .pc-l--ko { color: var(--danger); }
                .pc-l--note { color: var(--primary); }
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
                <div class="pc-redaction">
                    <textarea class="pc-zone" data-zone spellcheck="false"
                        aria-label="Ton programme de construction, une phrase par ligne"
                        placeholder="Une phrase par ligne.&#10;Place 2 points A et B&#10;Trace le segment [AB]"></textarea>
                    <div class="pc-lignes" data-lignes></div>
                </div>
                <div class="pc-modeles" data-modeles></div>
                <div class="pc-note" data-note></div>
                <div class="pc-barre" data-barre></div>
            </div>`;
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.butEl = this.container.querySelector('[data-but]');
        this.moiEl = this.container.querySelector('[data-moi]');
        this.cadreMoiEl = this.container.querySelector('[data-cadre-moi]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.lignesEl = this.container.querySelector('[data-lignes]');
        this.modelesEl = this.container.querySelector('[data-modeles]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.barreEl = this.container.querySelector('[data-barre]');

        if (!this.isDemo) {
            this.zoneEl.addEventListener('input', () => {
                this.texte = this.zoneEl.value;
                this.note('');
                this.dessiner({ garderZone: true });
            });
        }
        this.dessinerBarre();
        this.dessiner();
    }

    startGameLoop() { /* rien à animer : l'exercice avance à la frappe */ }

    dessiner({ garderZone = false } = {}) {
        const niv = this.niveau;
        if (!garderZone) this.zoneEl.value = this.texte;
        const lu = lireProgramme(this.texte, niv.atlas);
        const r = executer(lu.instructions, niv.atlas);
        this.dernier = { lu, r };

        this.consigneEl.innerHTML = `<b>Figure ${this.rang + 1} sur ${this.plan.length} — `
            + `${enAttribut(niv.titre)}.</b> ${enAttribut(niv.dit)}`;
        // LA CIBLE MONTRE LES POINTS DONNÉS ET LES TRACÉS EXIGÉS, jamais les
        // traits de construction : les afficher donnerait la méthode.
        this.butEl.innerHTML = figureSvg(niv.attendus, niv.donnes);
        this.moiEl.innerHTML = figureSvg(r.objets, r.points, {
            aides: r.objets.filter(o => !niv.attendus.some(a => cleObjet(a) === cleObjet(o)))
        });

        this.dessinerLignes(lu, r);
        this.dessinerModeles();
    }

    /** En face de chaque ligne écrite : ce qu'elle a produit, ou pourquoi non. */
    dessinerLignes(lu, r) {
        let iIns = -1;
        this.lignesEl.innerHTML = lu.lignes.map(l => {
            if (l.vide) return '<div class="pc-l">&nbsp;</div>';
            if (!l.ok) {
                return `<div class="pc-l pc-l--ko"><span>✕</span><small>${enAttribut(l.dit)}</small></div>`;
            }
            iIns += 1;
            const etat = (r.lignes || [])[iIns] || {};
            if (etat.etat === 'bloque' && r.erreur) {
                return `<div class="pc-l pc-l--ko"><span>✕</span><small>${enAttribut(r.erreur.dit)}</small></div>`;
            }
            if (etat.etat === 'jamais') return '<div class="pc-l">&nbsp;</div>';
            const nes = etat.noms && etat.noms.length
                ? ` <small>→ ${enAttribut(etat.noms.join(', '))}</small>` : '';
            const note = l.note ? `<small class="pc-l--note"> ${enAttribut(l.note)}</small>` : '';
            return `<div class="pc-l pc-l--ok"><span>✓</span><span>${nes}${note}</span></div>`;
        }).join('');
    }

    dessinerModeles() {
        if (!this.avecModeles) { this.modelesEl.innerHTML = ''; return; }
        const ops = operationsDe(this.famillesActives);
        this.modelesEl.innerHTML = ops.map(op =>
            `<button type="button" class="pc-ajout" data-op="${op.id}"
                title="Insérer le début de la phrase">${enAttribut(op.bouton)}</button>`).join('');
        if (this.isDemo) return;
        this.modelesEl.querySelectorAll('[data-op]').forEach(b => {
            b.onclick = () => this.insererModele(b.dataset.op);
        });
    }

    /**
     * LE MODÈLE S'INSÈRE, IL NE SE REMPLIT PAS.
     *
     * Le bouton pose le début de la phrase et laisse le curseur là où il faut
     * écrire. C'est l'aide que Rémy décrit — « on peut faire glisser des
     * vignettes, l'élève écrit les lettres » — sans jamais donner la réponse :
     * quel objet, à partir de quels points, reste entièrement à décider.
     */
    insererModele(id) {
        const op = OPERATIONS[id];
        if (!op) return;
        const debut = op.gabarit.filter(x => typeof x === 'string').join('').replace(/\s+$/, ' ');
        const avant = this.zoneEl.value;
        const saut = (avant && !avant.endsWith('\n')) ? '\n' : '';
        this.zoneEl.value = `${avant}${saut}${debut}`;
        this.texte = this.zoneEl.value;
        this.zoneEl.focus();
        this.zoneEl.setSelectionRange(this.zoneEl.value.length, this.zoneEl.value.length);
        this.dessiner({ garderZone: true });
    }

    dessinerBarre() {
        this.barreEl.innerHTML = `
            <button type="button" class="pc-btn" data-verifier>✓ Vérifier ma figure</button>
            <button type="button" class="pc-btn pc-btn--doux" data-vider>↺ Tout effacer</button>`;
        if (this.isDemo) return;
        this.barreEl.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.barreEl.querySelector('[data-vider]').onclick = () => {
            this.texte = '';
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
        if (this.rang + 1 >= this.plan.length) { this.fini = true; return this.gagner(); }
        setTimeout(() => {
            if (!this.isRunning) return;
            this.rang += 1;
            this.texte = '';
            this.cadreMoiEl.classList.remove('pc-cadre--ok');
            this.dessiner();
        }, 1600);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pc-note' + (ton ? ` pc-note--${ton}` : '');
    }

    /** Le robot écrit le programme modèle, une phrase à la fois. */
    async runDemoSequence() {
        const niv = this.niveau;
        const jusque = [];
        for (const ins of niv.modeleResolu) {
            if (!this.isRunning) return;
            await new Promise(ok => setTimeout(ok, 950));
            if (this.gelDemo) await new Promise(ok => setTimeout(ok, 600));
            const avant = executer(jusque, niv.atlas);
            const args = OPERATIONS[ins.op].prend.map((sorte, i) => {
                if (sorte !== 'objet') return ins.args[i];
                const o = avant.objets.find(x => cleObjet(x) === ins.args[i]);
                return o ? nomObjet(o, avant.points) : '…';
            });
            this.texte += `${this.texte ? '\n' : ''}${OPERATIONS[ins.op].libelle(
                ins.op === 'points' ? ins.args : args)}`;
            jusque.push(ins);
            this.dessiner();
        }
        this.note('Le programme est écrit : la figure de droite est celle de gauche.', 'ok');
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
        this.cadreMoiEl.classList.remove('pc-cadre--ok');
        this.note('');
        this.dessiner();
        return true;
    }

    /** Pendant du saut : on efface le programme, puis on recule d'une figure. */
    revenirEtape() {
        if (this.isDemo || this.fini) return false;
        if (this.texte.trim()) { this.texte = ''; this.note(''); this.dessiner(); return true; }
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
