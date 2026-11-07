// BUMPY — à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre, avec les captures du jeu d'origine : « tu peux pas faire
// comme le jeu original mais avec un design moderne ». Puis : « les parois
// cassable de bumpy sont grosses en hauteur, il faut bien voir le rebond, tu
// pense aussi au porte ».
//
// ── CE QUE L'ÉCRAN DOIT DIRE, ET DANS QUEL ORDRE ───────────────────────────
//
//   · LE PANNEAU DONNE LE BUT. Sur ses captures, la moitié droite de l'écran
//     est un panneau qui compte ce qu'il faut ramasser. C'est lui qui fait
//     qu'on sait ce qu'on cherche AVANT de commencer, et je l'avais oublié.
//   · LES PAROIS SONT DES BARRES HAUTES. Une colonne de quatre cases se
//     dessine comme UNE barre, pas comme quatre cubes : c'est la différence
//     entre un mur qu'on abat et un sol sur lequel on marche.
//   · LE REBOND DOIT SE VOIR. La balle laisse une traînée de trois fantômes :
//     à l'arrêt sur une image, on voit d'où elle vient. Et elle s'écrase un
//     peu en touchant le sol — c'est ce qui fait sentir le choc.
//
// ── LE PILOTAGE EST LE MÊME AU DOIGT ET AU CLAVIER ─────────────────────────
//
// Flèches gauche et droite, ou les deux moitiés de l'écran. Pas de bouton de
// saut : il n'y en a pas, la balle saute toute seule — et c'est toute l'idée.
// Un troisième geste donnerait à croire qu'on peut contrôler la hauteur.

import { BaseGame } from '../core/BaseGame.js';
import {
    CASE, FRUITS, NIVEAUX, RAYON, TUILE, avancer, estParoi, etatInitial, lireNiveau
} from '../core/bumpy.js';

/** Les couleurs du tableau. */
const ENCRE = {
    fond: '#0b1226', trame: '#101a36',
    cadre: '#3f4e86', cadreHaut: '#6b7cc4',
    plate: '#94a3b8', plateHaut: '#e2e8f0',
    barre: '#475569', barreHaut: '#94a3b8',
    paroi: { R: ['#ef4444', '#fca5a5'], J: ['#eab308', '#fde047'], V: ['#22c55e', '#86efac'] },
    pic: '#dc2626', picClair: '#fca5a5',
    cle: '#fbbf24',
    porte: '#334155', porteOuverte: '#22c55e', porteClair: '#86efac',
    balle: '#f472b6', balleClair: '#fbcfe8'
};

class Bumpy extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'bumpy');
        // CE JEU AVANCE TOUT SEUL PENDANT QU'ON LIT : il le déclare, pour que
        // les cartes de correction ne s'effacent pas d'elles-mêmes.
        this.tempsReel = true;
        this.rang = 0;
        this.vies = 3;
        this.score = 0;
        this.entree = 0;
        this.touches = { gauche: false, droite: false };
        this.trainee = [];
    }

    render() {
        const L = NIVEAUX[0].lignes[0].length * CASE;
        const H = NIVEAUX[0].lignes.length * CASE;
        this.container.innerHTML = `
            <style>
                .bp-wrap { display: flex; justify-content: center; width: 100%;
                    user-select: none; -webkit-user-select: none; touch-action: none; }
                .bp-jeu { display: flex; gap: 10px; align-items: stretch;
                    max-width: ${L + 232}px; width: 100%; }
                .bp-cadre { position: relative; flex: 1 1 auto; min-width: 0; }
                .bp-toile { display: block; width: 100%; height: auto;
                    border-radius: 12px; box-shadow: 0 10px 30px -18px #000; }
                /* LES DEUX MOITIÉS DE L'ÉCRAN SONT LES DEUX FLÈCHES. Elles
                   sont invisibles : un bouton dessiné sur le plateau cacherait
                   justement la plateforme qu'on vise. */
                .bp-moitie { position: absolute; top: 0; bottom: 0; width: 50%;
                    cursor: pointer; }
                .bp-moitie--g { left: 0; } .bp-moitie--d { right: 0; }

                .bp-panneau { width: 222px; flex: none; display: flex;
                    flex-direction: column; gap: 9px; background: #0b1226;
                    border-radius: 12px; padding: 12px; color: #e8ecff;
                    font-variant-numeric: tabular-nums; }
                .bp-vies { display: flex; gap: 6px; align-items: center; }
                .bp-vies i { width: 17px; height: 17px; border-radius: 50%;
                    background: radial-gradient(circle at 32% 30%, #fbcfe8, #f472b6 60%); }
                .bp-vies span { margin-left: auto; font-size: 10.5px;
                    letter-spacing: .09em; text-transform: uppercase; color: #94a3b8;
                    font-weight: 700; }
                .bp-score { font-size: 25px; font-weight: 800; letter-spacing: .06em;
                    color: #fde047; line-height: 1.1; }
                .bp-score small { display: block; font-size: 10px; letter-spacing: .11em;
                    text-transform: uppercase; color: #94a3b8; font-weight: 700; }
                .bp-obj { display: grid; grid-template-columns: 24px 1fr auto;
                    gap: 8px; align-items: center; background: #141d3a;
                    border-radius: 9px; padding: 6px 9px; }
                .bp-obj em { font-style: normal; font-size: 11.5px; color: #94a3b8;
                    letter-spacing: .03em; }
                .bp-obj b { font-size: 15px; font-weight: 800; }
                .bp-obj .ok { color: #22c55e; }
                .bp-logo { margin-top: auto; text-align: center; background: #141d3a;
                    border-radius: 10px; padding: 9px 6px 7px; }
                .bp-logo b { display: block; font-size: 20px; font-weight: 900;
                    letter-spacing: .12em; color: #f472b6; }
                .bp-logo span { font-size: 10px; letter-spacing: .13em; color: #94a3b8;
                    text-transform: uppercase; }
                .bp-mot { min-height: 1.5em; font-weight: 700; text-align: center;
                    margin-top: 9px; }
                .bp-fin { position: absolute; inset: 0; display: none;
                    place-items: center; text-align: center; border-radius: 12px;
                    background: rgb(11 18 38 / .9); color: #eef2ff; padding: 20px; }
                .bp-fin--vu { display: grid; }
                .bp-fin h3 { margin: 0 0 6px; font-size: 1.3rem; }
                .bp-fin p { margin: 0 0 14px; opacity: .85; }
                @media (max-width: 900px) {
                    .bp-jeu { flex-direction: column; }
                    .bp-panneau { width: auto; flex-direction: row; flex-wrap: wrap;
                        align-items: center; gap: 8px 14px; }
                    .bp-logo { margin-top: 0; }
                }
            </style>
            <div class="bp-wrap"><div class="bp-jeu">
                <div class="bp-cadre">
                    <canvas class="bp-toile" width="${L}" height="${H}"
                        role="img" aria-label="Le plateau de Bumpy"></canvas>
                    <div class="bp-moitie bp-moitie--g" data-bp-cote="-1"
                        aria-label="Aller à gauche"></div>
                    <div class="bp-moitie bp-moitie--d" data-bp-cote="1"
                        aria-label="Aller à droite"></div>
                    <div class="bp-fin" data-bp-fin>
                        <div>
                            <h3 data-bp-fin-titre></h3>
                            <p data-bp-fin-texte></p>
                            <button type="button" class="pl-btn pl-btn--fort"
                                data-bp-neuf>Recommencer</button>
                        </div>
                    </div>
                    <div class="bp-mot" data-bp-mot>Flèches ← → ou les deux moitiés
                        de l'écran. La balle rebondit toute seule.</div>
                </div>
                <div class="bp-panneau">
                    <div class="bp-vies" data-bp-vies></div>
                    <div class="bp-score"><small>Score</small><span data-bp-score>0000000</span></div>
                    <div class="bp-obj">
                        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
                            <g stroke="#fbbf24" stroke-width="2.6" fill="none"
                               stroke-linecap="round"><circle cx="8" cy="13" r="4.4"/>
                            <path d="M12 13h9M18 13v4M21 13v3.5"/></g></svg>
                        <em>Clés</em><b data-bp-clefs>0 / 0</b>
                    </div>
                    <div class="bp-obj">
                        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
                            <circle cx="9" cy="16" r="5" fill="#dc2626"/>
                            <circle cx="18" cy="17" r="5" fill="#dc2626"/>
                            <path d="M8 12q3-10 11-8" stroke="#15803d" stroke-width="2"
                                  fill="none"/></svg>
                        <em>Fruits</em><b data-bp-fruits>0</b>
                    </div>
                    <div class="bp-obj">
                        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
                            <rect x="5" y="3" width="16" height="21" rx="2"
                                  fill="#334155" data-bp-porte-svg/>
                            <rect x="9" y="9" width="8" height="15" fill="#0b1226"/></svg>
                        <em>Porte</em><b data-bp-porte>Fermée</b>
                    </div>
                    <div class="bp-logo"><b>BUMPY</b><span data-bp-tableau>Tableau 1</span></div>
                </div>
            </div></div>`;
        this.toile = this.container.querySelector('.bp-toile');
        this.ctx = this.toile.getContext('2d');
        this.finEl = this.container.querySelector('[data-bp-fin]');
        this.brancher();
        this.chargerTableau(0);
    }

    brancher() {
        const surTouche = (e, enfonce) => {
            if (e.key === 'ArrowLeft') this.touches.gauche = enfonce;
            else if (e.key === 'ArrowRight') this.touches.droite = enfonce;
            else return;
            e.preventDefault();
            this.entree = (this.touches.droite ? 1 : 0) - (this.touches.gauche ? 1 : 0);
        };
        this._bas = (e) => surTouche(e, true);
        this._haut = (e) => surTouche(e, false);
        document.addEventListener('keydown', this._bas);
        document.addEventListener('keyup', this._haut);

        this.container.querySelectorAll('[data-bp-cote]').forEach(el => {
            const cote = Number(el.dataset.bpCote);
            el.addEventListener('pointerdown', (e) => {
                // LE SENS D'ABORD, LA CAPTURE ENSUITE, et la capture dans un
                // `try` : `setPointerCapture` jette quand le pointeur n'est
                // plus actif, et l'exception interrompait le gestionnaire
                // AVANT que le sens soit posé — le doigt ne faisait alors rien
                // du tout, et rien à l'écran ne disait pourquoi.
                this.entree = cote;
                try { el.setPointerCapture(e.pointerId); } catch (err) { /* sans */ }
            });
            const lacher = () => { this.entree = 0; };
            el.addEventListener('pointerup', lacher);
            el.addEventListener('pointercancel', lacher);
        });

        const neuf = this.container.querySelector('[data-bp-neuf]');
        if (neuf) neuf.onclick = () => this.recommencer();
    }

    chargerTableau(rang) {
        this.rang = rang % NIVEAUX.length;
        this.niveau = lireNiveau(NIVEAUX[this.rang]);
        this.etat = etatInitial(this.niveau);
        this.trainee = [];
        this.ecrase = 0;
        this.fige = false;
        this.dernier = null;
        this.majPanneau();
        this.dire(`Tableau ${this.rang + 1} — ${this.niveau.nom} · `
            + `${this.niveau.ilEnFaut} clés pour ouvrir la porte`);
    }

    recommencer() {
        this.vies = 3;
        this.score = 0;
        this.finEl.classList.remove('bp-fin--vu');
        this.chargerTableau(0);
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    majPanneau() {
        const q = (s) => this.container.querySelector(s);
        const vies = q('[data-bp-vies]');
        if (vies) {
            vies.innerHTML = '<i></i>'.repeat(Math.max(0, this.vies)) + '<span>Vies</span>';
        }
        const poser = (sel, v) => { const el = q(sel); if (el) el.textContent = v; };
        poser('[data-bp-score]', String(this.score).padStart(7, '0'));
        poser('[data-bp-clefs]', `${this.etat ? this.etat.clefs : 0} / ${this.niveau.ilEnFaut}`);
        poser('[data-bp-fruits]', this.etat ? this.etat.fruits : 0);
        poser('[data-bp-tableau]', `Tableau ${this.rang + 1}`);
        const ouverte = this.etat && this.etat.ouverte;
        poser('[data-bp-porte]', ouverte ? 'Ouverte' : 'Fermée');
        const bC = q('[data-bp-clefs]');
        if (bC) bC.classList.toggle('ok', ouverte);
        const bP = q('[data-bp-porte]');
        if (bP) bP.classList.toggle('ok', ouverte);
        const svg = q('[data-bp-porte-svg]');
        if (svg) svg.setAttribute('fill', ouverte ? '#22c55e' : '#334155');
    }

    dire(texte) {
        const el = this.container.querySelector('[data-bp-mot]');
        if (el) el.textContent = texte;
    }

    startGameLoop() {
        this.dernier = null;
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    boucle = (t) => {
        this.raf = null;
        if (!this.isRunning || !this.toile || !this.toile.isConnected) return;
        const dt = this.dernier === null ? 1 / 60 : Math.min(0.05, (t - this.dernier) / 1000);
        this.dernier = t;
        if (!this.fige && !this.gelDemo) this.pas(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    pas(dt) {
        // LE PAS DU MONDE EST DÉCOUPÉ, et c'est ce qui empêche la balle de
        // traverser un mur : `avancer` plafonne déjà à 25 ms, mais plafonner
        // RALENTIT le jeu quand l'image tarde. On rejoue donc autant de petits
        // pas qu'il faut pour couvrir le temps écoulé.
        let reste = dt;
        while (reste > 0 && !this.fige) {
            const p = Math.min(0.02, reste);
            reste -= p;
            const r = avancer(this.etat, this.niveau, p, this.coupDuJoueur());
            this.etat = r.etat;
            for (const fait of r.faits) this.surFait(fait);
        }
        // LA TRAÎNÉE : trois positions passées, pour qu'on VOIE d'où la balle
        // vient. Rémy : « il faut bien voir le rebond ».
        this.trainee.unshift({ x: this.etat.x, y: this.etat.y });
        if (this.trainee.length > 9) this.trainee.pop();
        if (this.ecrase > 0) this.ecrase = Math.max(0, this.ecrase - dt * 5);
        this.majPanneau();
    }

    /** La touche tenue, ou celle du robot quand c'est l'aperçu du professeur. */
    coupDuJoueur() {
        if (!this.isDemo) return this.entree;
        // LE ROBOT VISE LA CLÉ LA PLUS PROCHE, puis la porte. Ce n'est pas une
        // recherche : c'en serait une de trois secondes, et elle figerait la
        // page à l'ouverture de l'aperçu. Viser suffit à montrer le jeu, et
        // cela ne ment pas — il joue avec les deux mêmes touches que l'élève.
        const n = this.niveau, e = this.etat;
        let cible = null, best = 1e9;
        for (let r = 0; r < n.hauteur; r++) {
            for (let c = 0; c < n.largeur; c++) {
                const t = n.cases[r][c];
                const vise = e.ouverte ? (t === TUILE.PORTE) : (t === TUILE.CLE);
                if (!vise) continue;
                const d = Math.abs((c + .5) * CASE - e.x) + Math.abs((r + .5) * CASE - e.y);
                if (d < best) { best = d; cible = { c, r }; }
            }
        }
        if (!cible) return 0;
        const dx = (cible.c + .5) * CASE - e.x;
        return Math.abs(dx) < 6 ? 0 : Math.sign(dx);
    }

    surFait(fait) {
        if (fait === 'rebond') this.ecrase = 1;
        if (fait === 'casse') { this.score += 5; this.dire('Un mur de moins !'); }
        if (fait === 'fruit') { this.score += 25; this.dire('Un fruit !'); }
        if (fait === 'cle') {
            this.score += 50;
            const reste = this.niveau.ilEnFaut - this.etat.clefs;
            this.dire(reste > 0 ? `Encore ${reste} clé${reste > 1 ? 's' : ''}.` : 'Dernière clé !');
        }
        if (fait === 'ouverte') this.dire('La porte est ouverte !');
        if (fait === 'pic') this.perdreUneVie();
        if (fait === 'porte') this.tableauFini();
    }

    perdreUneVie() {
        if (this.fige) return;
        this.vies--;
        this.fige = true;
        this.majPanneau();
        if (this.vies > 0) {
            this.dire(`Les pics ! Il te reste ${this.vies} vie${this.vies > 1 ? 's' : ''}.`);
            const rang = this.rang;
            setTimeout(() => {
                if (!this.isRunning) return;
                // ON REPREND AU TABLEAU, pas au début : un élève qui refait
                // deux tableaux pour atteindre celui où il a échoué abandonne
                // avant d'y arriver. Le score, lui, reste acquis.
                this.chargerTableau(rang);
            }, 1000);
            return;
        }
        this.terminer('Plus de vies', `Tu es allé jusqu'au tableau ${this.rang + 1}.`);
    }

    tableauFini() {
        this.score += 200 + this.rang * 100;
        this.fige = true;
        this.majPanneau();
        if (this.rang + 1 >= NIVEAUX.length) {
            this.terminer('Tous les tableaux !', 'Tu les as tous finis. On recommence ?');
            return;
        }
        this.dire('La porte ! Tableau suivant.');
        const suivant = this.rang + 1;
        setTimeout(() => {
            if (!this.isRunning) return;
            this.chargerTableau(suivant);
        }, 1000);
    }

    /**
     * LA PARTIE EST FINIE — et c'est LE SEUL MOMENT OÙ L'ON MARQUE.
     *
     * Le catalogue range Bumpy en « 1 partie ». Marquer à chaque tableau
     * terminerait l'activité au premier : mesuré, le plateau disparaissait
     * quelques secondes après son ouverture. Ce n'est pas un exercice — il n'y
     * a ni bonne ni mauvaise réponse, seulement une partie jouée.
     */
    terminer(titre, texte) {
        this.fige = true;
        if (!this.isDemo) {
            this.onCorrectAnswer(null, null, {
                questionText: `Une partie de Bumpy — jusqu'au tableau ${this.rang + 1}`,
                expected: 'une partie', given: `tableau ${this.rang + 1}`,
                points: 10 + this.rang * 8 + Math.floor(this.score / 100)
            });
        }
        this.container.querySelector('[data-bp-fin-titre]').textContent = titre;
        this.container.querySelector('[data-bp-fin-texte]').textContent =
            `${texte} Score : ${this.score}.`;
        this.finEl.classList.add('bp-fin--vu');
    }

    // ── LE DESSIN ──────────────────────────────────────────────────────────

    dessiner() {
        const g = this.ctx, n = this.niveau;
        if (!g || !n) return;
        g.fillStyle = ENCRE.fond;
        g.fillRect(0, 0, this.toile.width, this.toile.height);
        // UNE TRAME DISCRÈTE, pour que le fond ait de la matière sans parasiter
        // la lecture. Le portage moderne y répète le mot BUMPY ; ici, un damier
        // de points, qui ne concurrence rien.
        g.fillStyle = ENCRE.trame;
        for (let y = 0; y < this.toile.height; y += 18) {
            for (let x = (y / 18 % 2) * 9; x < this.toile.width; x += 18) {
                g.fillRect(x, y, 9, 9);
            }
        }
        for (let r = 0; r < n.hauteur; r++) {
            for (let c = 0; c < n.largeur; c++) this.dessinerTuile(g, n, c, r);
        }
        this.dessinerBalle(g);
    }

    dessinerTuile(g, n, c, r) {
        const t = n.cases[r][c], x = c * CASE, y = r * CASE;
        if (t === TUILE.ROCHE) {
            g.fillStyle = ENCRE.cadre; g.fillRect(x, y, CASE, CASE);
            g.fillStyle = ENCRE.cadreHaut; g.fillRect(x, y, CASE, 4);
        } else if (t === TUILE.PLATEFORME) {
            g.fillStyle = ENCRE.plate;
            g.beginPath(); g.roundRect(x, y + CASE * .3, CASE, CASE * .38, 5); g.fill();
            g.fillStyle = ENCRE.plateHaut;
            g.beginPath(); g.roundRect(x, y + CASE * .3, CASE, CASE * .14, 4); g.fill();
        } else if (t === TUILE.BARRE) {
            g.fillStyle = ENCRE.barre;
            g.beginPath(); g.roundRect(x + CASE * .3, y, CASE * .4, CASE, 5); g.fill();
            g.fillStyle = ENCRE.barreHaut;
            g.beginPath(); g.roundRect(x + CASE * .3, y, CASE * .14, CASE, 4); g.fill();
        } else if (estParoi(t)) {
            // UNE PAROI SE DESSINE COMME UNE BARRE, PAS COMME DES CUBES. On
            // regarde donc si la case du dessus et celle du dessous portent la
            // même paroi, et l'on n'arrondit que les extrémités. C'est la
            // demande de Rémy — « grosses en hauteur » —, et c'est ce qui fait
            // qu'on la lit comme un mur à abattre.
            const memeHaut = r > 0 && n.cases[r - 1][c] === t;
            const memeBas = r < n.hauteur - 1 && n.cases[r + 1][c] === t;
            const [plein, clair] = ENCRE.paroi[t];
            const R = 9;
            g.fillStyle = plein;
            g.beginPath();
            g.roundRect(x + 2, y + (memeHaut ? -1 : 2), CASE - 4,
                CASE - (memeHaut ? -1 : 2) - (memeBas ? -1 : 2),
                [memeHaut ? 0 : R, memeHaut ? 0 : R, memeBas ? 0 : R, memeBas ? 0 : R]);
            g.fill();
            if (!memeHaut) {
                g.fillStyle = clair;
                g.beginPath(); g.roundRect(x + 6, y + 6, CASE - 12, 5, 3); g.fill();
            }
            // LA FÊLURE traverse la case de haut en bas : elle dit « ça se
            // casse » sans qu'on ait à l'apprendre.
            g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2;
            g.beginPath();
            g.moveTo(x + 17, y); g.lineTo(x + 12, y + 12);
            g.lineTo(x + 21, y + 20); g.lineTo(x + 15, y + 28); g.lineTo(x + 19, y + CASE);
            g.stroke();
        } else if (t === TUILE.PIC) {
            g.fillStyle = ENCRE.pic;
            g.beginPath();
            for (let i = 0; i < 3; i++) {
                g.moveTo(x + 3 + i * 11, y + CASE);
                g.lineTo(x + 8.5 + i * 11, y + 4);
                g.lineTo(x + 14 + i * 11, y + CASE);
            }
            g.fill();
            g.fillStyle = ENCRE.picClair;
            for (let i = 0; i < 3; i++) {
                g.beginPath();
                g.moveTo(x + 6.6 + i * 11, y + 17); g.lineTo(x + 8.5 + i * 11, y + 4);
                g.lineTo(x + 10.4 + i * 11, y + 17); g.fill();
            }
        } else if (t === TUILE.CLE) {
            const cx = x + CASE / 2, cy = y + CASE / 2;
            g.strokeStyle = ENCRE.cle; g.lineWidth = 3.4; g.lineCap = 'round';
            g.beginPath(); g.arc(cx - 6, cy, 6, 0, Math.PI * 2); g.stroke();
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 12, cy); g.stroke();
            g.beginPath(); g.moveTo(cx + 8, cy); g.lineTo(cx + 8, cy + 6); g.stroke();
            g.beginPath(); g.moveTo(cx + 12, cy); g.lineTo(cx + 12, cy + 5); g.stroke();
            g.lineCap = 'butt';
        } else if (t === TUILE.PORTE) {
            // LA PORTE EST GRISE TANT QU'IL MANQUE UNE CLÉ, puis verte. On la
            // voit depuis le début : c'est elle qui dit où l'on va. Une porte
            // qui n'apparaîtrait qu'à la fin ferait du tableau une surprise.
            // LA PORTE DOIT SE VOIR DE LOIN, et c'est une correction : en
            // ardoise sur fond de nuit, elle disparaissait dans le décor — or
            // c'est elle, le but du tableau. Elle a donc un ENCADREMENT clair
            // et un trou de serrure doré, qui disent « porte » avant même
            // qu'on ait lu le panneau.
            const ouverte = this.etat && this.etat.ouverte;
            const gauche = n.cases[r][c - 1] !== TUILE.PORTE;
            const droite = n.cases[r][c + 1] !== TUILE.PORTE;
            const R = 9;
            g.fillStyle = ouverte ? ENCRE.porteOuverte : '#64748b';
            g.beginPath();
            g.roundRect(x, y, CASE, CASE,
                [gauche ? R : 0, droite ? R : 0, 0, 0]);
            g.fill();
            g.fillStyle = ouverte ? '#14532d' : '#1e293b';
            g.beginPath();
            g.roundRect(x + (gauche ? 5 : 0), y + 5, CASE - (gauche ? 5 : 0) - (droite ? 5 : 0),
                CASE - 5, [gauche ? 6 : 0, droite ? 6 : 0, 0, 0]);
            g.fill();
            if (droite) {
                g.fillStyle = ouverte ? ENCRE.porteClair : ENCRE.cle;
                g.beginPath(); g.arc(x + 4, y + CASE * .55, 3.2, 0, Math.PI * 2); g.fill();
                g.fillRect(x + 2.6, y + CASE * .55, 2.8, 7);
            }
            if (ouverte && gauche) {
                g.fillStyle = ENCRE.porteClair;
                g.fillRect(x + 5, y + 5, CASE - 5, 3);
            }
        } else if (FRUITS.includes(t)) {
            this.dessinerFruit(g, t, x + CASE / 2, y + CASE / 2);
        }
    }

    /** Cinq fruits, cinq silhouettes. Ce sont les points, et rien d'autre. */
    dessinerFruit(g, quel, cx, cy) {
        if (quel === '1') {              // cerises
            g.strokeStyle = '#15803d'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(cx - 4, cy + 1);
            g.quadraticCurveTo(cx, cy - 12, cx + 5, cy - 10); g.stroke();
            g.beginPath(); g.moveTo(cx + 4, cy + 2);
            g.quadraticCurveTo(cx + 4, cy - 8, cx + 5, cy - 10); g.stroke();
            g.fillStyle = '#dc2626';
            g.beginPath(); g.arc(cx - 5, cy + 5, 5.4, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(cx + 5, cy + 6, 5.4, 0, Math.PI * 2); g.fill();
        } else if (quel === '2') {       // banane
            g.fillStyle = '#facc15';
            g.beginPath();
            g.moveTo(cx - 11, cy - 7);
            g.quadraticCurveTo(cx - 2, cy + 12, cx + 12, cy + 6);
            g.quadraticCurveTo(cx + 1, cy + 5, cx - 7, cy - 8);
            g.closePath(); g.fill();
        } else if (quel === '3') {       // pomme
            g.fillStyle = '#ef4444';
            g.beginPath(); g.arc(cx - 3.5, cy + 2, 7, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(cx + 3.5, cy + 2, 7, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#78350f'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(cx, cy - 5); g.lineTo(cx + 1, cy - 12); g.stroke();
            g.fillStyle = '#22c55e';
            g.beginPath(); g.ellipse(cx + 6, cy - 11, 5, 2.6, -.5, 0, Math.PI * 2); g.fill();
        } else if (quel === '4') {       // citron
            g.fillStyle = '#fde047';
            g.beginPath(); g.ellipse(cx, cy + 1, 11, 7.5, -.25, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fef9c3';
            g.beginPath(); g.ellipse(cx - 3, cy - 1.5, 3.6, 2.2, -.25, 0, Math.PI * 2); g.fill();
        } else {                          // fraise
            g.fillStyle = '#e11d48';
            g.beginPath();
            g.moveTo(cx, cy + 12);
            g.quadraticCurveTo(cx - 11, cy + 1, cx - 7, cy - 5);
            g.quadraticCurveTo(cx, cy - 9, cx + 7, cy - 5);
            g.quadraticCurveTo(cx + 11, cy + 1, cx, cy + 12);
            g.fill();
            g.fillStyle = '#22c55e';
            g.beginPath(); g.ellipse(cx, cy - 6, 8, 3, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fecdd3';
            for (const [a, b] of [[-3, 1], [3, 2], [0, 6], [-5, 5], [5, 6]]) {
                g.beginPath(); g.arc(cx + a, cy + b, 1.2, 0, Math.PI * 2); g.fill();
            }
        }
    }

    dessinerBalle(g) {
        const e = this.etat;
        if (!e) return;
        // LA TRAÎNÉE D'ABORD, sous la balle : trois fantômes espacés disent
        // d'où elle vient. Sur une image arrêtée, c'est la seule chose qui
        // montre le rebond — et Rémy a demandé qu'on le voie bien.
        for (let i = 3; i >= 1; i--) {
            const p = this.trainee[i * 3];
            if (!p) continue;
            g.fillStyle = `rgba(244,114,182,${.1 * (4 - i)})`;
            g.beginPath(); g.arc(p.x, p.y, RAYON - i * 1.6, 0, Math.PI * 2); g.fill();
        }
        // ET ELLE S'ÉCRASE UN PEU EN TOUCHANT : c'est ce qui fait sentir le
        // choc, et cela ne coûte qu'un rapport de rayons.
        const k = this.ecrase * .22;
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.beginPath();
        g.ellipse(e.x, e.y + RAYON + 3, RAYON, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = ENCRE.balle;
        g.beginPath();
        g.ellipse(e.x, e.y + RAYON * k, RAYON * (1 + k), RAYON * (1 - k), 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = ENCRE.balleClair;
        g.beginPath(); g.arc(e.x - 4, e.y - 4, 4.2, 0, Math.PI * 2); g.fill();
        // LES DEUX YEUX REGARDENT OÙ L'ON VA : c'est le seul endroit du dessin
        // qui dit le sens, et il se lit sans y penser.
        const dx = (this.isDemo ? 0 : this.entree) * 3;
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(e.x - 3.6 + dx, e.y - 1, 2.1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(e.x + 3.6 + dx, e.y - 1, 2.1, 0, Math.PI * 2); g.fill();
    }

    async runDemoSequence() {
        this.startGameLoop();
    }

    destroy() {
        document.removeEventListener('keydown', this._bas);
        document.removeEventListener('keyup', this._haut);
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        super.destroy();
    }
}

export function engineBumpy(container, isDemo, params) {
    const game = new Bumpy(container, isDemo, params);
    game.start();
    return game;
}
