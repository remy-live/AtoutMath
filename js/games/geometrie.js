// L'ATELIER DE GÉOMÉTRIE — les instruments de GéoMaster dans AtoutMath.
//
// Règle, équerre, compas, rapporteur : quatre instruments qu'on manipule à la
// souris comme au doigt, avec l'aimantation aux points et aux intersections, et
// le rejeu pas à pas d'une construction. Ils viennent du projet GéoMaster, où
// ils sont au point.
//
// POURQUOI UN CADRE ET NON UN PORTAGE. Le moteur de GéoMaster tient à sa page :
// il adresse une soixantaine d'éléments par leur identifiant (le tiroir de la
// frise, la calculatrice, le panneau de scénario…). L'extraire pour le
// remonter ici reviendrait à le réécrire — et à casser ce qui marche. On
// l'intègre donc TEL QUEL, dans un cadre, et on ne lui ajoute qu'une chose :
// un pont qui pose une figure de départ et rend l'état de la construction.
//
// Ce que l'atelier ajoute, et qui n'existait pas dans GéoMaster : une CONSIGNE,
// et un jugement. La figure de départ est posée par nous, la construction est
// vérifiée par nous (js/core/geoConstruction.js), et le verdict part dans le
// journal comme n'importe quelle réponse — donc dans les statistiques, le
// carnet d'erreurs et le bilan par compétence.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    tirerConsigne, departDe, juger, estDepart, demoMediatrice, consigneDe
} from '../core/geoConstruction.js';

const CADRE = './vendor/geomaster/index.html';
const COMPETENCE = 'geo.construire.instruments';

class Geometrie extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'geometrie');
        this.pret = false;
        this.dernierEtat = null;
        this.taille = null;
        this.jeton = 0;
        this.attentes = new Map();
        this.consigne = null;
        this.reperes = {};
        this.attentesPret = [];
    }

    render() {
        this.container.innerHTML = `
            <style>
                .gm-wrap {
                    display: flex; flex-direction: column; gap: 7px;
                    width: 100%; height: 100%; color: var(--text-main);
                }
                .gm-tete { flex: 0 0 auto; text-align: center; padding: 0 8px; }
                .gm-consigne { font-weight: 800; font-size: clamp(13px, 3cqw, 17px); }
                .gm-aide {
                    font-size: clamp(10px, 2.2cqw, 12.5px); color: var(--text-muted);
                    margin-top: 2px; display: none;
                }
                .gm-aide--vue { display: block; }
                /* LE CADRE PREND TOUTE LA PLACE QUI RESTE. GéoMaster gère
                   lui-même sa mise en page interne ; on ne lui impose qu'une
                   surface, et surtout pas une hauteur en pixels — sur un
                   téléphone, ses barres d'outils s'y replient toutes seules. */
                .gm-cadre {
                    flex: 1 1 auto; min-height: 0; width: 100%; position: relative;
                    border: 1px solid var(--border); border-radius: 12px;
                    overflow: hidden; background: var(--bg-panel);
                }
                .gm-cadre iframe { display: block; width: 100%; height: 100%; border: 0; }
                .gm-barre {
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px; flex-wrap: wrap; flex: 0 0 auto;
                }
                .gm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 700; font-size: .84rem; padding: 7px 14px;
                }
                .gm-btn:hover:not(:disabled) { background: var(--bg-hover); }
                .gm-btn--valider { border-color: var(--primary); color: #fff; background: var(--primary); }
                .gm-btn:disabled { opacity: .45; cursor: default; }
                .gm-note {
                    min-height: 2.4em; text-align: center; flex: 0 0 auto;
                    font-size: .85rem; color: var(--text-muted); padding: 0 8px;
                }
                .gm-note b { color: var(--text-main); }
                .gm-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .gm-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
                /* Le temps que trois mégaoctets arrivent, on le dit. */
                .gm-chargement {
                    position: absolute; inset: 0; display: flex;
                    align-items: center; justify-content: center;
                    font-weight: 700; color: var(--text-muted);
                    background: var(--bg-panel); z-index: 2;
                }
            </style>
            <div class="gm-wrap">
                <div class="gm-tete">
                    <div class="gm-consigne" data-consigne>L'atelier se prépare…</div>
                    <div class="gm-aide" data-aide></div>
                </div>
                <div class="gm-cadre">
                    <div class="gm-chargement" data-chargement>Les instruments arrivent…</div>
                    <iframe data-cadre src="${CADRE}" title="Atelier de géométrie"
                            allow="clipboard-write"></iframe>
                </div>
                <div class="gm-barre">
                    <button type="button" class="gm-btn" data-aide-btn>💡 Comment faire ?</button>
                    <button type="button" class="gm-btn" data-recommencer disabled>↺ Effacer</button>
                    <button type="button" class="gm-btn" data-neuf disabled>Autre consigne</button>
                    <button type="button" class="gm-btn gm-btn--valider" data-valider disabled>
                        Valider ma construction</button>
                </div>
                <div class="gm-note" data-note></div>
            </div>`;

        this.cadreEl = this.container.querySelector('[data-cadre]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.aideEl = this.container.querySelector('[data-aide]');
        this.chargementEl = this.container.querySelector('[data-chargement]');
        this.btnValider = this.container.querySelector('[data-valider]');
        this.btnNeuf = this.container.querySelector('[data-neuf]');
        this.btnRecommencer = this.container.querySelector('[data-recommencer]');

        this.btnNeuf.onclick = () => this.poser();
        this.btnRecommencer.onclick = () => this.reposer();
        this.btnValider.onclick = () => this.valider();
        this.container.querySelector('[data-aide-btn]').onclick = () => {
            this.aideEl.classList.toggle('gm-aide--vue');
        };

        // On n'écoute que NOTRE cadre : une autre fenêtre ne doit pas pouvoir
        // se faire passer pour lui.
        this.ecoute = (ev) => {
            if (!this.cadreEl || ev.source !== this.cadreEl.contentWindow) return;
            const d = ev.data;
            if (!d || d.source !== 'geomaster') return;
            if (d.type === 'pret') this.auPret(d);
            if (d.type === 'etat' || d.type === 'charge') this.repondre(d);
        };
        window.addEventListener('message', this.ecoute);
    }

    /** Rien à animer : GéoMaster mène sa propre boucle. On attend son signal. */
    startGameLoop() {
        this.attendrePret().then(() => { if (this.isRunning) this.poser(); });
    }

    attendrePret() {
        if (this.pret) return Promise.resolve(true);
        return new Promise(resolve => this.attentesPret.push(resolve));
    }

    auPret(d) {
        this.pret = true;
        this.dernierEtat = d.etat;
        this.taille = d.taille || null;
        if (this.chargementEl && this.chargementEl.isConnected) this.chargementEl.remove();
        this.btnValider.disabled = false;
        this.btnNeuf.disabled = false;
        this.btnRecommencer.disabled = false;
        const en = this.attentesPret.splice(0);
        en.forEach(f => f(true));
    }

    // --- Poser une consigne -------------------------------------------------

    /** Une nouvelle consigne, avec sa figure de départ. */
    async poser() {
        this.consigne = tirerConsigne(
            this.params.consigne || this.params.consignes || 'aleatoire',
            null,
            this.consigne && this.consigne.id
        );
        // La feuille de GéoMaster est plus grande que ce qu'on en voit, et
        // l'élève peut l'avoir déplacée ou zoomée : on redemande le cadre
        // visible avant de poser quoi que ce soit, sinon la figure de départ
        // atterrit hors de l'écran.
        await this.demanderEtat(1200);
        if (!this.isRunning) return false;
        this.reposer();
        return true;
    }

    /** Repose la figure de départ de la consigne en cours (efface le reste). */
    reposer() {
        if (!this.consigne) return;
        const d = departDe(this.consigne, this.taille || this.mesurerCadre(), this.hasard());
        this.reperes = d.reperes;
        this.consigneEl.textContent = this.consigne.enonce;
        this.aideEl.textContent = this.consigne.aide;
        this.aideEl.classList.remove('gm-aide--vue');
        this.note('');
        this.charger(d.json);
    }

    /** Un tirage aléatoire à l'interface d'un `rng` : les figures varient. */
    hasard() {
        return { int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) };
    }

    /** Si le cadre n'a pas encore dit sa taille, on mesure la nôtre. */
    mesurerCadre() {
        const r = this.cadreEl ? this.cadreEl.getBoundingClientRect() : null;
        return r && r.width ? { w: r.width, h: r.height } : { w: 640, h: 420 };
    }

    charger(json) {
        if (!this.cadreEl || !this.cadreEl.contentWindow) return Promise.resolve(null);
        const jeton = ++this.jeton;
        return new Promise(resolve => {
            const minuteur = setTimeout(() => { this.attentes.delete(jeton); resolve(null); }, 2500);
            this.attentes.set(jeton, { resolve, minuteur });
            this.cadreEl.contentWindow.postMessage({ cible: 'geomaster', type: 'charger', json, jeton }, '*');
        });
    }

    /** Demande l'état au cadre, et attend la réponse — ou renonce. */
    demanderEtat(delai = 2500) {
        return new Promise((resolve) => {
            if (!this.pret || !this.cadreEl || !this.cadreEl.contentWindow) return resolve(null);
            const jeton = ++this.jeton;
            const minuteur = setTimeout(() => {
                this.attentes.delete(jeton);
                resolve(this.dernierEtat);
            }, delai);
            this.attentes.set(jeton, { resolve, minuteur });
            this.cadreEl.contentWindow.postMessage({ cible: 'geomaster', type: 'etat', jeton }, '*');
        });
    }

    repondre(d) {
        if (d.etat) this.dernierEtat = d.etat;
        if (d.taille && d.taille.w) this.taille = d.taille;
        const a = this.attentes.get(d.jeton);
        if (!a) return;
        clearTimeout(a.minuteur);
        this.attentes.delete(d.jeton);
        a.resolve(d.etat);
    }

    // --- Juger --------------------------------------------------------------

    async valider() {
        if (this.isDemo || !this.consigne) return;
        this.btnValider.disabled = true;
        const etat = await this.demanderEtat();
        this.btnValider.disabled = false;
        if (!this.isRunning) return;

        const verdict = juger(this.consigne, etat && etat.json, this.reperes);
        const ajoutes = compterAjouts(verdict.figure);

        // Une feuille encore vide n'est pas une faute de géométrie : c'est un
        // travail qui n'a pas commencé. On ne l'enregistre pas comme une
        // erreur — on rappelle simplement ce qu'il y a à faire.
        if (!ajoutes) {
            this.note('La feuille est encore vide. ' + this.consigne.aide, 'ko');
            return;
        }

        if (verdict.ok) {
            this.note('✅ ' + verdict.message, 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: this.consigne.enonce,
                expected: this.consigne.titre,
                given: 'construction juste',
                points: 20
            });
            return;
        }
        this.note('❌ ' + verdict.message, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: this.consigne.enonce,
            input: 'construction incorrecte',
            expected: this.consigne.titre,
            customMessage: verdict.message,
            silencieux: true    // le message est déjà sous la feuille, en clair
        });
    }

    /** Le bouton « question suivante » de la barre d'auteur : autre consigne. */
    showNext() {
        if (!this.pret) return false;
        this.poser();
        return true;
    }

    note(texte, ton) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'gm-note' + (ton ? ` gm-note--${ton}` : '');
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => {
            cur.destroy(); gate.destroy();
            this.demoCursor = null; this.demoGate = null;
        };

        // Trois mégaoctets d'instruments : le robot attend, comme l'élève.
        await this.attendrePret();
        if (!this.isRunning) return fin();

        this.consigne = consigneDe('mediatrice');
        const depart = departDe(this.consigne, this.taille || this.mesurerCadre(), null);
        this.reperes = depart.reperes;
        this.consigneEl.textContent = this.consigne.enonce;
        this.aideEl.textContent = this.consigne.aide;

        const temps = demoMediatrice(depart.reperes);
        for (const t of temps) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            await this.charger(t.json);
            this.note(t.note);
            cur.say(t.note, this.cadreEl);
            if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('À toi : les mêmes instruments sont là, en haut de la feuille. '
            + 'La règle, l\'équerre, le compas et le rapporteur se prennent, se posent et se tournent à la souris ou au doigt.', this.cadreEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.ecoute) window.removeEventListener('message', this.ecoute);
        this.attentes.forEach(a => clearTimeout(a.minuteur));
        this.attentes.clear();
        this.attentesPret.splice(0).forEach(f => f(false));
        super.destroy();
    }
}

/** Combien d'objets l'élève a-t-il ajoutés à la figure de départ ? */
function compterAjouts(fig) {
    if (!fig) return 0;
    const neuf = (o) => !estDepart(o.id) && !String(o.id).startsWith('demo-');
    return fig.points.filter(neuf).length
        + fig.droites.filter(neuf).length
        + fig.cercles.filter(neuf).length;
}

export function engineGeometrie(container, isDemo, params) {
    const jeu = new Geometrie(container, isDemo, params);
    jeu.start();
    return jeu;
}
