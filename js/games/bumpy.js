// BUMPY — à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « bumpy ca cassait des blocs et ca sautait en colonnes »,
// « et il y avait des pics des bonus ». Puis, sur la maquette : « Oui, c'est
// ça », et l'on gagne en ATTEIGNANT LA SORTIE.
//
// ── LA BALLE NE S'ARRÊTE JAMAIS, ET C'EST LE JEU ───────────────────────────
//
// Elle rebondit toute seule, à tempo fixe. On ne choisit pas QUAND, on choisit
// seulement OÙ : gauche, tout droit, ou droite. C'est ce que Rémy appelle
// « ça fait les réflexes » — il y a une décision, mais elle est à prendre
// avant que la balle retombe.
//
// ── ON MONTRE OÙ L'ON VA RETOMBER ──────────────────────────────────────────
//
// Le cadre pointillé marque la case où la balle se posera si l'on ne change
// rien. Ce n'est pas une aide au rabais : le jeu REPOSE sur le fait que
// l'arrivée est connue d'avance — sinon on subit au lieu de décider. On le
// calcule en rejouant `coup` sur une copie du tableau, donc ce qu'il montre
// est exactement ce qui va se produire, et non une approximation qui
// divergerait un jour en silence.
//
// ── DEUX CHOSES QUE L'ORIGINAL NE FAISAIT PAS ──────────────────────────────
//
//   · ON REPREND AU TABLEAU, PAS AU DÉBUT. En 1989 on recommençait tout. Dans
//     une salle de classe, un élève qui refait trois tableaux pour atteindre
//     celui où il a échoué abandonne avant d'y arriver.
//   · ET IL Y A TROIS VIES AFFICHÉES. Savoir combien il en reste change la
//     façon de jouer : on ose une colonne quand on en a trois, on assure
//     quand il n'en reste qu'une.

import { BaseGame } from '../core/BaseGame.js';
import { CASE, NIVEAUX, TUILE, coup, etatInitial, lireNiveau } from '../core/bumpy.js';

/** Combien de temps met la balle à franchir une case, en millisecondes. */
const MS_PAR_CASE = 58;
/**
 * UN COUP NE DURE JAMAIS MOINS QUE CELA, et le temps d'arrêt après
 * l'atterrissage.
 *
 * MESURÉ À L'ÉCRAN : à 280 + 130 ms, la balle enchaîne un rebond toutes les
 * quatre dixièmes de seconde et atteint le fond du tableau en trois secondes.
 * C'est trop court pour LIRE le plateau — or tout le jeu consiste à le lire
 * avant de creuser. À 420 + 180, on a le temps de voir où est la porte et où
 * sont les pics, sans que la balle cesse d'être pressante.
 */
const MS_MINIMUM = 420;
const MS_POSE = 180;

/** Les couleurs du tableau. Une mine de nuit, et chaque tuile sa matière. */
const ENCRE = {
    fond: '#0b1226', grille: '#141d3a',
    roche: '#3f4e86', rocheHaut: '#6b7cc4',
    bloc: '#60a5fa', blocHaut: '#bfdbfe', blocBas: '#1d4ed8',
    pic: '#dc2626', picClair: '#fca5a5',
    bonus: '#fbbf24', bonusClair: '#fff7cc',
    sortie: '#22c55e', sortieClair: '#86efac',
    balle: '#f472b6', balleClair: '#fbcfe8'
};

class Bumpy extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'bumpy');
        // CE JEU AVANCE TOUT SEUL PENDANT QU'ON LIT : il le déclare, pour que
        // les cartes de correction ne s'effacent pas d'elles-mêmes. Voir
        // `tempsReel` dans core/BaseGame.js.
        this.tempsReel = true;
        this.rang = 0;
        this.vies = 3;
        this.bonus = 0;
        this.choix = 0;
        this.touches = { gauche: false, droite: false };
    }

    render() {
        const L = NIVEAUX[0].lignes[0].length * CASE;
        const H = NIVEAUX[0].lignes.length * CASE;
        this.container.innerHTML = `
            <style>
                .bp-wrap { display: flex; flex-direction: column; align-items: center;
                    gap: 10px; width: 100%; user-select: none;
                    -webkit-user-select: none; touch-action: none; }
                .bp-hud { display: flex; gap: 18px; align-items: baseline;
                    font-weight: 800; font-variant-numeric: tabular-nums; }
                .bp-hud span { color: var(--text-muted); font-size: .8rem;
                    text-transform: uppercase; letter-spacing: .05em; }
                .bp-hud b { font-size: 1.1rem; color: var(--text-main); }
                .bp-cadre { position: relative; width: 100%; max-width: ${L}px; }
                .bp-toile { display: block; width: 100%; height: auto;
                    border-radius: 12px; box-shadow: 0 10px 30px -18px #000; }
                /* LES DEUX MOITIÉS DE L'ÉCRAN SONT LES DEUX FLÈCHES. Elles sont
                   invisibles : un bouton dessiné sur le plateau cacherait
                   justement la colonne qu'on vise. */
                .bp-moitie { position: absolute; top: 0; bottom: 0; width: 50%;
                    cursor: pointer; }
                .bp-moitie--g { left: 0; } .bp-moitie--d { right: 0; }
                .bp-mot { min-height: 1.6em; font-weight: 700; text-align: center; }
                .bp-fin { position: absolute; inset: 0; display: none;
                    place-items: center; text-align: center; border-radius: 12px;
                    background: rgb(11 18 38 / .9); color: #eef2ff; padding: 20px; }
                .bp-fin--vu { display: grid; }
                .bp-fin h3 { margin: 0 0 6px; font-size: 1.3rem; }
                .bp-fin p { margin: 0 0 14px; opacity: .85; }
            </style>
            <div class="bp-wrap">
                <div class="bp-hud">
                    <div><span>Tableau</span> <b data-tableau>1</b></div>
                    <div><span>Bonus</span> <b data-bonus>0</b></div>
                    <div><span>Vies</span> <b data-vies>3</b></div>
                </div>
                <div class="bp-cadre">
                    <canvas class="bp-toile" width="${L}" height="${H}"
                        role="img" aria-label="Le plateau de Bumpy"></canvas>
                    <div class="bp-moitie bp-moitie--g" data-cote="-1"
                        aria-label="Aller à gauche"></div>
                    <div class="bp-moitie bp-moitie--d" data-cote="1"
                        aria-label="Aller à droite"></div>
                    <div class="bp-fin" data-fin>
                        <div>
                            <h3 data-fin-titre></h3>
                            <p data-fin-texte></p>
                            <button type="button" class="pl-btn pl-btn--fort"
                                data-neuf>Recommencer</button>
                        </div>
                    </div>
                </div>
                <div class="bp-mot" data-mot>Flèches ← → ou les deux moitiés de
                    l'écran. Le cadre pointillé montre où tu vas retomber.</div>
            </div>`;
        this.toile = this.container.querySelector('.bp-toile');
        this.ctx = this.toile.getContext('2d');
        this.finEl = this.container.querySelector('[data-fin]');
        this.brancher();
        this.chargerTableau(0);
    }

    brancher() {
        const surTouche = (e, enfonce) => {
            if (e.key === 'ArrowLeft') this.touches.gauche = enfonce;
            else if (e.key === 'ArrowRight') this.touches.droite = enfonce;
            else return;
            e.preventDefault();
            this.choix = (this.touches.droite ? 1 : 0) - (this.touches.gauche ? 1 : 0);
        };
        this._bas = (e) => surTouche(e, true);
        this._haut = (e) => surTouche(e, false);
        document.addEventListener('keydown', this._bas);
        document.addEventListener('keyup', this._haut);

        this.container.querySelectorAll('[data-cote]').forEach(el => {
            const cote = Number(el.dataset.cote);
            // `pointerdown` ET LA CAPTURE : un doigt qui glisse d'une moitié à
            // l'autre doit changer de sens, pas rester bloqué parce qu'il a
            // quitté l'élément.
            el.addEventListener('pointerdown', (e) => {
                // LE CHOIX D'ABORD, LA CAPTURE ENSUITE, et la capture dans un
                // `try` : `setPointerCapture` jette quand le pointeur n'est
                // plus actif, et l'exception interrompait le gestionnaire
                // AVANT que le choix soit posé. Le doigt ne faisait alors
                // rien du tout, et rien à l'écran ne disait pourquoi.
                this.choix = cote;
                try { el.setPointerCapture(e.pointerId); } catch (err) { /* sans */ }
            });
            const lacher = () => { this.choix = 0; };
            el.addEventListener('pointerup', lacher);
            el.addEventListener('pointercancel', lacher);
        });

        const neuf = this.container.querySelector('[data-neuf]');
        if (neuf) neuf.onclick = () => this.recommencer();
    }

    chargerTableau(rang) {
        this.rang = rang % NIVEAUX.length;
        this.niveau = lireNiveau(NIVEAUX[this.rang]);
        this.etat = etatInitial(this.niveau);
        this.vol = null;          // le coup en cours d'animation
        this.attente = MS_POSE * 3;
        this.fini = false;
        this.dernier = null;
        this.majHud();
        this.dire(`Tableau ${this.rang + 1} — ${this.niveau.nom}`);
    }

    recommencer() {
        this.vies = 3;
        this.bonus = 0;
        this.finEl.classList.remove('bp-fin--vu');
        this.chargerTableau(0);
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    majHud() {
        const poser = (clef, v) => {
            const el = this.container.querySelector(`[data-${clef}]`);
            if (el) el.textContent = v;
        };
        poser('tableau', this.rang + 1);
        poser('bonus', this.bonus + (this.etat ? this.etat.bonus : 0));
        poser('vies', this.vies);
    }

    dire(texte) {
        const el = this.container.querySelector('[data-mot]');
        if (el) el.textContent = texte;
    }

    startGameLoop() {
        this.dernier = null;
        if (!this.raf) this.raf = requestAnimationFrame(this.boucle);
    }

    boucle = (t) => {
        this.raf = null;
        if (!this.isRunning || !this.toile || !this.toile.isConnected) return;
        const dt = this.dernier === null ? 16 : Math.min(60, t - this.dernier);
        this.dernier = t;
        if (!this.fini && !this.gelDemo) this.avancer(dt);
        this.dessiner();
        this.raf = requestAnimationFrame(this.boucle);
    };

    avancer(dt) {
        if (this.vol) {
            this.vol.passe += dt;
            if (this.vol.passe >= this.vol.duree) {
                const v = this.vol;
                this.vol = null;
                this.attente = MS_POSE;
                this.etat = v.etat;
                this.majHud();
                for (const fait of v.faits) this.surFait(fait);
            }
            return;
        }
        this.attente -= dt;
        if (this.attente > 0) return;
        this.jouerUnCoup();
    }

    /** Un rebond : on demande au monde, et l'on anime ce qu'il répond. */
    jouerUnCoup() {
        const d = this.isDemo ? this.choixDemo() : this.choix;
        const r = coup(this.etat, this.niveau, d);
        const cases = Math.max(1, r.chemin.length - 1);
        this.vol = {
            chemin: r.chemin, etat: r.etat, faits: r.faits,
            passe: 0, duree: Math.max(MS_MINIMUM, cases * MS_PAR_CASE)
        };
    }

    surFait(fait) {
        if (fait === 'bonus') this.dire('Un bonus !');
        if (fait === 'pic') this.perdreUneVie();
        if (fait === 'sortie') this.tableauFini();
    }

    perdreUneVie() {
        this.vies--;
        this.majHud();
        if (this.vies > 0) {
            this.dire(`Les pics ! Il te reste ${this.vies} vie${this.vies > 1 ? 's' : ''}.`);
            const rang = this.rang;
            this.fini = true;
            setTimeout(() => {
                if (!this.isRunning) return;
                // ON REPREND AU TABLEAU, pas au début : voir l'en-tête. Les
                // bonus déjà pris restent acquis.
                this.bonus += this.etat.bonus;
                this.chargerTableau(rang);
            }, 900);
            return;
        }
        this.terminer('Plus de vies', `Tu es allé jusqu'au tableau ${this.rang + 1}.`);
    }

    tableauFini() {
        this.bonus += this.etat.bonus;
        if (this.rang + 1 >= NIVEAUX.length) {
            this.terminer('Tous les tableaux !', 'Tu les as tous finis. On recommence ?');
            return;
        }
        this.fini = true;
        this.dire('La sortie ! Tableau suivant.');
        const suivant = this.rang + 1;
        setTimeout(() => {
            if (!this.isRunning) return;
            this.chargerTableau(suivant);
        }, 900);
    }

    /**
     * LA PARTIE EST FINIE — et c'est LE SEUL MOMENT OÙ L'ON MARQUE.
     *
     * Le catalogue range Bumpy en « 1 partie », et une partie se termine quand
     * les quatre tableaux sont franchis ou les trois vies perdues. MARQUER À
     * CHAQUE TABLEAU TERMINERAIT L'ACTIVITÉ AU PREMIER : mesuré à l'écran, le
     * plateau disparaissait cinq secondes après son ouverture, puisque le
     * premier tableau se gagne sans rien toucher. Les Petites Ailes marquent
     * par monde parce qu'un monde y dure une minute ; ici, non.
     *
     * Ce n'est pas un exercice : il n'y a ni bonne ni mauvaise réponse,
     * seulement une partie jouée — et c'est cela qu'on enregistre, pour
     * qu'elle compte dans un parcours.
     */
    terminer(titre, texte) {
        this.fini = true;
        if (!this.isDemo) {
            this.onCorrectAnswer(null, null, {
                questionText: `Une partie de Bumpy — jusqu'au tableau ${this.rang + 1}`,
                expected: 'une partie', given: `tableau ${this.rang + 1}`,
                points: 10 + this.rang * 8 + this.bonus * 2
            });
        }
        this.container.querySelector('[data-fin-titre]').textContent = titre;
        this.container.querySelector('[data-fin-texte]').textContent = texte;
        this.finEl.classList.add('bp-fin--vu');
    }

    // ── LE DESSIN ──────────────────────────────────────────────────────────
    //
    // CHAQUE TUILE A SA MATIÈRE, et non sa seule couleur : la roche porte une
    // arête claire, le bloc une arête claire ET une ombre basse — c'est elle
    // qui dit « on se pose dessus » —, le pic ses pointes. En gris on les
    // distinguerait encore, et c'est le bon critère : la couleur seule ne
    // suffit jamais.

    dessiner() {
        const g = this.ctx, n = this.niveau;
        if (!g || !n) return;
        g.fillStyle = ENCRE.fond;
        g.fillRect(0, 0, this.toile.width, this.toile.height);
        g.strokeStyle = ENCRE.grille;
        g.lineWidth = 1;
        for (let c = 1; c < n.largeur; c++) {
            g.beginPath(); g.moveTo(c * CASE, 0); g.lineTo(c * CASE, this.toile.height); g.stroke();
        }
        for (let r = 1; r < n.hauteur; r++) {
            g.beginPath(); g.moveTo(0, r * CASE); g.lineTo(this.toile.width, r * CASE); g.stroke();
        }
        for (let r = 0; r < n.hauteur; r++) {
            for (let c = 0; c < n.largeur; c++) {
                this.dessinerTuile(g, n.cases[r][c], c * CASE, r * CASE);
            }
        }
        this.dessinerApercu(g);
        this.dessinerBalle(g);
    }

    dessinerTuile(g, t, x, y) {
        if (t === TUILE.ROCHE) {
            g.fillStyle = ENCRE.roche; g.fillRect(x, y, CASE, CASE);
            g.fillStyle = ENCRE.rocheHaut; g.fillRect(x, y, CASE, 4);
        } else if (t === TUILE.BLOC) {
            g.fillStyle = ENCRE.bloc; g.fillRect(x + 1, y + 1, CASE - 2, CASE - 2);
            g.fillStyle = ENCRE.blocHaut; g.fillRect(x + 1, y + 1, CASE - 2, 5);
            g.fillStyle = ENCRE.blocBas; g.fillRect(x + 1, y + CASE - 5, CASE - 2, 4);
        } else if (t === TUILE.PIC) {
            g.fillStyle = ENCRE.pic;
            g.beginPath();
            for (let i = 0; i < 3; i++) {
                g.moveTo(x + 3 + i * 10.5, y + CASE);
                g.lineTo(x + 8.2 + i * 10.5, y + 6);
                g.lineTo(x + 13.5 + i * 10.5, y + CASE);
            }
            g.fill();
            g.fillStyle = ENCRE.picClair;
            for (let i = 0; i < 3; i++) {
                g.beginPath();
                g.moveTo(x + 6.5 + i * 10.5, y + 16);
                g.lineTo(x + 8.2 + i * 10.5, y + 6);
                g.lineTo(x + 10 + i * 10.5, y + 16);
                g.fill();
            }
        } else if (t === TUILE.BONUS) {
            const cx = x + CASE / 2, cy = y + CASE / 2;
            g.fillStyle = ENCRE.bonus;
            g.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 5 : 12;
                g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            }
            g.closePath(); g.fill();
            g.fillStyle = ENCRE.bonusClair;
            g.beginPath(); g.arc(cx - 2.5, cy - 3, 2.6, 0, Math.PI * 2); g.fill();
        } else if (t === TUILE.SORTIE) {
            // LA SORTIE EST OUVERTE DÈS LE DÉBUT, et on la VOIT dans la masse :
            // c'est elle qui dit quelle colonne creuser. Une porte qui
            // n'apparaîtrait qu'à la fin transformerait le tableau en loterie.
            g.fillStyle = ENCRE.sortie;
            g.fillRect(x + 4, y + 2, CASE - 8, CASE - 2);
            g.fillStyle = ENCRE.fond;
            g.fillRect(x + 10, y + 11, CASE - 20, CASE - 11);
            g.fillStyle = ENCRE.sortieClair;
            g.fillRect(x + 10, y + 11, CASE - 20, 3);
        }
    }

    /**
     * Le cadre pointillé : où la balle se posera si l'on ne change rien.
     *
     * ON LE DESSINE AUSSI PENDANT LE VOL, et c'est tout l'intérêt : c'est
     * pendant qu'elle est en l'air qu'on décide du coup suivant. La première
     * version le cachait dès que la balle bougeait — c'est-à-dire presque tout
     * le temps —, et il ne restait qu'un clignotement. Mesuré : zéro pixel
     * blanc sur la toile.
     *
     * PENDANT LE VOL, L'ÉTAT DE DÉPART DU COUP SUIVANT EST DÉJÀ CONNU : c'est
     * `vol.etat`, et le tableau porte déjà le bloc cassé, puisque `coup` l'a
     * retiré au moment où le vol a commencé. Le cadre dit donc vrai.
     */
    dessinerApercu(g) {
        if (this.fini || !this.etat || this.etat.mort) return;
        const depuis = this.vol ? this.vol.etat : this.etat;
        if (depuis.mort || depuis.fini) return;
        const copie = { ...this.niveau, cases: this.niveau.cases.map(l => l.slice()) };
        const r = coup(depuis, copie, this.isDemo ? 0 : this.choix);
        const fin = r.chemin[r.chemin.length - 1];
        if (!fin) return;
        // OPAQUE, ET C'EST UNE CORRECTION MESURÉE : en blanc à 75 %, le cadre
        // composé sur le fond de nuit rend un gris à 194, qu'on distingue mal
        // des arêtes claires des blocs. À l'œil on le voyait « un peu » ; la
        // sonde, elle, ne trouvait aucun pixel blanc sur la toile.
        g.strokeStyle = r.etat.mort ? '#fca5a5' : '#f8fafc';
        g.lineWidth = 2.5;
        g.setLineDash([6, 5]);
        g.strokeRect(fin.c * CASE + 3, fin.r * CASE + 3, CASE - 6, CASE - 6);
        g.setLineDash([]);
    }

    /** Où est la balle à cet instant : au repos, ou le long de son chemin. */
    positionBalle() {
        if (!this.vol) return { x: (this.etat.c + .5) * CASE, y: (this.etat.r + .5) * CASE };
        const ch = this.vol.chemin;
        const t = Math.min(1, this.vol.passe / this.vol.duree) * (ch.length - 1);
        const i = Math.min(ch.length - 2, Math.floor(t)), f = t - i;
        const a = ch[i], b = ch[i + 1] || a;
        return {
            x: (a.c + (b.c - a.c) * f + .5) * CASE,
            y: (a.r + (b.r - a.r) * f + .5) * CASE
        };
    }

    dessinerBalle(g) {
        if (!this.etat) return;
        const p = this.positionBalle();
        const R = CASE * .36;
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.beginPath(); g.ellipse(p.x, p.y + R + 3, R, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = ENCRE.balle;
        g.beginPath(); g.arc(p.x, p.y, R, 0, Math.PI * 2); g.fill();
        g.fillStyle = ENCRE.balleClair;
        g.beginPath(); g.arc(p.x - R * .3, p.y - R * .3, R * .3, 0, Math.PI * 2); g.fill();
        // LES DEUX YEUX REGARDENT OÙ L'ON VA : c'est le seul endroit du dessin
        // qui dit le sens choisi, et il se lit sans y penser.
        const dx = (this.vol ? 0 : this.choix) * 3;
        g.fillStyle = '#1f2937';
        g.beginPath(); g.arc(p.x - 3.4 + dx, p.y - 1, 2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(p.x + 3.4 + dx, p.y - 1, 2, 0, Math.PI * 2); g.fill();
    }

    /**
     * L'APERÇU DU PROFESSEUR : le robot joue, il ne regarde pas.
     *
     * IL JOUE LE CHEMIN QUE LE CHERCHEUR A TROUVÉ, et non des coups au hasard.
     * Un robot qui tâtonne meurt sur les pics au bout de six rebonds, et Rémy
     * verrait un jeu qui perd — ce qui ressemble beaucoup à un jeu cassé.
     */
    choixDemo() {
        if (!this._demo || this._demoRang !== this.rang) {
            this._demo = cheminDeDemo(this.rang);
            this._demoRang = this.rang;
            this._demoPas = 0;
        }
        const d = this._demo[this._demoPas] ?? 0;
        this._demoPas++;
        return d;
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

/**
 * UN CHEMIN GAGNANT POUR L'APERÇU, cherché à la demande.
 *
 * ON NE LE RECOPIE PAS À LA MAIN dans une constante : un chemin recopié
 * cesserait d'être juste au premier pic déplacé, en silence, et l'aperçu du
 * professeur mourrait sans que rien ne rougisse. On le CHERCHE, avec les trois
 * mêmes coups que l'élève — quelques milliers d'essais, soit quelques
 * millisecondes, et c'est vrai par construction.
 */
function cheminDeDemo(rang) {
    const def = NIVEAUX[rang];
    const n0 = lireNiveau(def);
    const mobiles = [];
    for (let r = 0; r < n0.hauteur; r++) {
        for (let c = 0; c < n0.largeur; c++) {
            const t = n0.cases[r][c];
            if (t === TUILE.BLOC || t === TUILE.BONUS) mobiles.push({ c, r, t });
        }
    }
    const replanter = (emp) => {
        const n = lireNiveau(def);
        mobiles.forEach((m, i) => { if (emp[i] === '1') n.cases[m.r][m.c] = TUILE.VIDE; });
        return n;
    };
    const empreinte = (n) => mobiles.map(m => (n.cases[m.r][m.c] === m.t ? '0' : '1')).join('');
    const vide = '0'.repeat(mobiles.length);
    const e0 = etatInitial(n0);
    const file = [{ etat: e0, emp: vide, chemin: [] }];
    const vus = new Set([`${e0.c}|${e0.r}|${vide}`]);
    let tours = 0;
    while (file.length && tours++ < 200000) {
        const { etat, emp, chemin } = file.shift();
        for (const d of [-1, 0, 1]) {
            const n = replanter(emp);
            const r = coup(etat, n, d);
            if (r.etat.mort) continue;
            if (r.etat.fini) return [...chemin, d];
            const emp2 = empreinte(n);
            const k = `${r.etat.c}|${r.etat.r}|${emp2}`;
            if (vus.has(k)) continue;
            vus.add(k);
            file.push({ etat: r.etat, emp: emp2, chemin: [...chemin, d] });
        }
    }
    return [];
}

export function engineBumpy(container, isDemo, params) {
    const game = new Bumpy(container, isDemo, params);
    game.start();
    return game;
}
