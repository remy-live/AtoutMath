// Activité « Le Dessin Gradué » — on touche la droite, le point se pose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// UN SEUL GESTE : toucher l'endroit voulu sur la bonne droite. Le point se
// range sur la graduation la plus proche — on ne demande pas à un doigt
// d'être au pixel près, on lui demande de viser le bon trait.
//
// ── CE QUE L'ÉLÈVE VOIT, ET CE QU'IL NE VOIT PAS ────────────────────────────
//
// IL VOIT son point une fois posé, AVEC son abscisse relue en dessous. C'est
// ce qui remplace le « je vérifie en recomptant » du papier : il lit ce qu'il
// vient d'écrire, et se corrige avant de valider. Sans cela, dix points posés
// à l'aveugle puis un verdict global, ce qui n'apprend rien.
//
// IL NE VOIT PAS si son point est juste. Le dessin ne se colore qu'à la
// validation : si chaque point se corrigeait tout seul, il suffirait de
// toucher partout et de regarder ce qui reste.
//
// ── LE DESSIN SE TRACE, IL NE SE DESSINE PAS ────────────────────────────────
//
// L'élève PLACE, le logiciel TRACE. C'est le partage qui garde la ligne rouge
// à distance : on ne donne aucun outil de tracé, aucune règle virtuelle, rien
// à faire glisser pour fabriquer un segment. On révèle une image que ses
// nombres ont désignée.
//
// ── POURQUOI LA GÉOMÉTRIE EST EN PIXELS, ET MESURÉE ─────────────────────────
//
// Premier jet : un `viewBox` fixe de 1000 unités, mis à l'échelle par le CSS.
// Sur un téléphone de 390 px, le plan rend 358 px de large, donc UNE UNITÉ
// VAUT 0,36 PIXEL : une borne écrite en « 20 unités » sort à sept pixels, et
// l'écran est illisible — alors que toutes les mesures chiffrées sont vertes,
// parce que le nombre EST là, dans le DOM, à sa place.
//
// Donc le `viewBox` fait la taille du plan EN PIXELS, mesurée avant de
// peindre : une unité vaut un pixel, `font-size: 13px` veut dire treize
// pixels, et l'écart entre deux droites est celui qu'on a écrit. Un
// `ResizeObserver` repeint quand la largeur change.
//
// L'ÉCART ENTRE DEUX DROITES NE SUIT PAS LA LARGEUR DES COLONNES, et c'est
// voulu : une colonne fait trente pixels sur un téléphone, et deux droites à
// trente pixels l'une de l'autre ne se touchent pas du doigt. Le dessin est
// donc ÉTIRÉ EN HAUTEUR sur un petit écran. Les modèles papier le sont aussi,
// pour la même raison, et une fusée étirée reste une fusée.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { nombreFr, COLONNES, geometrie } from '../dessinsGradues.js';
import { ecrirePlacements } from '../generators/dessinGradue.js';

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Où l'élève a posé chaque point : nom → { ligne, colonne }. */
    let poses = new Map();
    let courant = null;
    let fini = false;
    /** Les points mal placés, après validation. Jamais dans `item.meta`. */
    let fautes = [];
    let observateur = null;
    /** La largeur sur laquelle le plan a été peint la dernière fois. */
    let derniereLargeur = 0;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        poses = new Map();
        fautes = [];
        fini = false;
        courant = item.meta.points[0].nom;

        container.innerHTML = `
            <div class="dg-layout">
                <div class="dg-context">${item.prompt.html}</div>
                <div class="dg-ordre" role="status" aria-live="polite"></div>
                <div class="dg-chips" role="group" aria-label="Les points à placer"></div>
                <div class="dg-plan"></div>
                <div class="dg-statut" role="status" aria-live="polite"></div>
                <div class="dg-actions">
                    <button type="button" class="dg-btn" data-recommencer>
                        ↺ Recommencer</button>
                    <button type="button" class="dg-btn dg-btn--fort" data-valider>
                        Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();
        container.querySelector('[data-recommencer]').onclick = () => {
            if (fini) return;
            poses = new Map();
            courant = item.meta.points[0].nom;
            peindre();
        };
        container.querySelector('[data-valider]').onclick = valider;

        // LE PLAN SE REPEINT QUAND IL CHANGE DE LARGEUR : sa géométrie est en
        // pixels, donc elle ne survit pas à une rotation d'écran ni à
        // l'ouverture du volet des réglages.
        //
        // SUR LA LARGEUR SEULE, ET C'EST OBLIGATOIRE : peindre change la
        // HAUTEUR du plan, ce qui réveille l'œil, qui repeint, qui change la
        // hauteur… Le navigateur finit par couper la boucle en criant
        // « ResizeObserver loop completed with undelivered notifications »,
        // une erreur de page qui n'a rien à voir avec ce qu'on lit.
        if (typeof ResizeObserver === 'function') {
            if (observateur) observateur.disconnect();
            observateur = new ResizeObserver(() => {
                if (destroyed) return;
                const plan = container.querySelector('.dg-plan');
                if (plan && Math.abs(plan.clientWidth - derniereLargeur) > 1) peindre();
            });
            observateur.observe(container.querySelector('.dg-plan'));
        }
    }

    /** Le premier point encore à placer, ou null quand tout est posé. */
    const prochainLibre = () => {
        const p = item.meta.points.find(x => !poses.has(x.nom));
        return p ? p.nom : null;
    };

    function peindre() {
        const plan = container.querySelector('.dg-plan');
        if (!plan) return;
        const { droites, points } = item.meta;
        const g = geometrie(plan.clientWidth);
        derniereLargeur = plan.clientWidth;
        const H = g.haut + (droites.length - 1) * g.pas + g.bas;
        const yDeLaLigne = (li) => g.haut + (li - 1) * g.pas;
        const xDeLaColonne = (c) => g.x0 + c * g.colonne;

        // ── LES DROITES ET LEURS CRANS ─────────────────────────────────────
        //
        // LES NOMBRES SE PEIGNENT À PART, ET APRÈS LES FORMES : peints ici,
        // une forme posée par-dessus les délavait. Vu sur la photo du chat,
        // dont le corps recouvrait le « 1,5 » de la troisième droite — la
        // borne qu'un élève relit justement pour placer le point suivant.
        const etiquettes = [];
        const axes = droites.map((d, i) => {
            const y = yDeLaLigne(i + 1);
            const crans = Array.from({ length: COLONNES + 1 }, (_, c) => {
                const x = xDeLaColonne(c).toFixed(1);
                // LE CRAN DU MILIEU EST PLUS HAUT : sans repère au centre, on
                // recompte les dix intervalles un par un à chaque point.
                const h = (c === 0 || c === COLONNES) ? 11 : (c === COLONNES / 2 ? 9 : 5);
                return `<line x1="${x}" y1="${y - h}" x2="${x}" y2="${y + h}"
                    class="dg-cran" />`;
            }).join('');
            // LA BORNE DU MILIEU NE S'ÉCRIT QUE SI ELLE TIENT : « 0,05 » fait
            // vingt-six pixels de large, et sur un téléphone une colonne en
            // fait trente — deux bornes voisines se chevaucheraient.
            const milieu = g.colonne >= 34
                ? `<text x="${xDeLaColonne(COLONNES / 2).toFixed(1)}" y="${y + 24}"
                    class="dg-borne" text-anchor="middle">${nombreFr(
                    d.min + (COLONNES / 2) * d.pas)}</text>`
                : '';
            etiquettes.push(`<g>
                <text x="${g.x0}" y="${y + 24}" class="dg-borne"
                    text-anchor="middle">${nombreFr(d.min)}</text>
                <text x="${g.x1.toFixed(1)}" y="${y + 24}" class="dg-borne"
                    text-anchor="middle">${nombreFr(d.max)}</text>
                ${milieu}
                <text x="${g.x0 - 12}" y="${y + 5}" class="dg-numero"
                    text-anchor="end">${i + 1}</text>
            </g>`);
            return `<g>
                <line x1="${g.x0}" y1="${y}" x2="${g.x1.toFixed(1)}" y2="${y}"
                    class="dg-axe" />
                ${crans}
            </g>`;
        }).join('');

        // ── LES FORMES, UNE FOIS TOUS LEURS SOMMETS POSÉS ──────────────────
        //
        // On les peint AVANT les croix : un sommet doit rester visible par-
        // dessus sa propre forme, sinon on ne sait plus lequel on a bougé.
        const placeDe = (nom) => {
            const p = poses.get(nom);
            return p ? { x: xDeLaColonne(p.colonne), y: yDeLaLigne(p.ligne) } : null;
        };
        const formes = item.meta.formes.map(f => {
            const sommets = [...f.sommets].map(placeDe);
            if (sommets.some(s => !s)) return '';
            const d = sommets.map(s => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(' ');
            return `<polygon points="${d}" class="dg-forme dg-forme--${f.couleur}" />`;
        }).join('');
        const traits = (item.meta.traits || []).map(([a, b]) => {
            const pa = placeDe(a), pb = placeDe(b);
            if (!pa || !pb) return '';
            return `<line x1="${pa.x.toFixed(1)}" y1="${pa.y}" x2="${pb.x.toFixed(1)}"
                y2="${pb.y}" class="dg-trait" />`;
        }).join('');

        // ── LES POINTS POSÉS ────────────────────────────────────────────────
        const croix = points.filter(p => poses.has(p.nom)).map(p => {
            const { x, y } = placeDe(p.nom);
            const classes = ['dg-point',
                p.nom === courant ? 'dg-point--actif' : '',
                fini && fautes.includes(p.nom) ? 'dg-point--faux' : ''].filter(Boolean);
            return `<g class="${classes.join(' ')}">
                <line x1="${(x - 7).toFixed(1)}" y1="${y - 7}" x2="${(x + 7).toFixed(1)}"
                    y2="${y + 7}" />
                <line x1="${(x - 7).toFixed(1)}" y1="${y + 7}" x2="${(x + 7).toFixed(1)}"
                    y2="${y - 7}" />
                <text x="${x.toFixed(1)}" y="${y - 13}" text-anchor="middle">${p.nom}</text>
            </g>`;
        }).join('');

        plan.innerHTML = `<svg viewBox="0 0 ${g.l} ${H}" width="${g.l}" height="${H}"
            class="dg-svg" role="img"
            aria-label="${droites.length} droites graduées">${axes}${formes}${traits}${etiquettes.join("")}${croix}</svg>`;
        // ON POSE LE POINT AU LEVER DU DOIGT, PAS À L'APPUI, et seulement si
        // le doigt n'a pas glissé de plus de douze pixels.
        //
        // AU `pointerdown`, LE PLAN DEVIENT INUTILISABLE SUR UN TÉLÉPHONE :
        // il fait quatre cents pixels de haut, donc on le traverse pour
        // atteindre les boutons du bas, et chaque défilement posait un point
        // au passage. Douze pixels, parce qu'un doigt immobile en bouge trois
        // ou quatre et qu'un défilement en fait vingt du premier coup.
        const svg = plan.querySelector('svg');
        let depart = null;
        svg.addEventListener('pointerdown', (e) => { depart = { x: e.clientX, y: e.clientY }; });
        svg.addEventListener('pointercancel', () => { depart = null; });
        svg.addEventListener('pointerup', (e) => {
            if (!depart) return;
            const glisse = Math.abs(e.clientX - depart.x) + Math.abs(e.clientY - depart.y);
            depart = null;
            if (glisse < 12) toucherLePlan(e, svg, g, H);
        });

        // ── LE POINT EN COURS, ET LA LISTE ──────────────────────────────────
        const enCours = points.find(p => p.nom === courant);
        const ordre = container.querySelector('.dg-ordre');
        if (ordre) {
            ordre.innerHTML = fini || !enCours ? ''
                : `Place le point <b>${enCours.nom}</b> — droite <b>${enCours.ligne}</b>,
                   abscisse <b>${enCours.enonce}</b>`;
        }

        const chips = container.querySelector('.dg-chips');
        if (chips) {
            chips.innerHTML = points.map(p => {
                const pose = poses.get(p.nom);
                const cl = ['dg-chip', p.nom === courant ? 'dg-chip--actif' : '',
                    pose ? 'dg-chip--pose' : '',
                    fini && fautes.includes(p.nom) ? 'dg-chip--faux' : ''
                ].filter(Boolean).join(' ');
                return `<button type="button" class="${cl}" data-point="${p.nom}"
                    aria-label="Le point ${p.nom}${pose ? ', posé' : ', à placer'}"
                    >${p.nom}</button>`;
            }).join('');
            chips.querySelectorAll('[data-point]').forEach(b => {
                b.disabled = fini || session.locked;
                b.onclick = () => { courant = b.dataset.point; peindre(); };
            });
        }

        const valider = container.querySelector('[data-valider]');
        if (valider) valider.disabled = fini || session.locked || poses.size < points.length;
        const recommencer = container.querySelector('[data-recommencer]');
        if (recommencer) recommencer.disabled = fini || session.locked || !poses.size;

        const statut = container.querySelector('.dg-statut');
        if (statut && !fini) {
            const reste = points.length - poses.size;
            const dernier = poses.get(courant);
            const d = dernier ? droites[dernier.ligne - 1] : null;
            // CE QU'IL VIENT D'ÉCRIRE, RELU À VOIX HAUTE : « B est sur la
            // droite 2, à 0,7 ». C'est le seul endroit où il peut voir que sa
            // graduation ne dit pas ce qu'il croyait, AVANT de valider.
            const relu = dernier
                ? `${courant} est sur la droite ${dernier.ligne}, à `
                    + `${nombreFr(d.min + dernier.colonne * d.pas)}. `
                : '';
            statut.textContent = reste
                ? `${relu}${reste} point${reste > 1 ? 's' : ''} à placer.`
                : `${relu}Tout est posé : tu peux valider.`;
        }
    }

    /** Du point touché sur l'écran à une droite et une graduation. */
    function toucherLePlan(e, svg, g, H) {
        if (fini || destroyed || session.locked || !courant) return;
        const r = svg.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const vx = (e.clientX - r.left) / r.width * g.l;
        const vy = (e.clientY - r.top) / r.height * H;
        const ligne = Math.max(1, Math.min(item.meta.droites.length,
            Math.round((vy - g.haut) / g.pas) + 1));
        const colonne = Math.max(0, Math.min(COLONNES,
            Math.round((vx - g.x0) / g.colonne)));
        poses.set(courant, { ligne, colonne });
        // ON PASSE AU SUIVANT TOUT SEUL, sauf si l'on était en train de
        // corriger un point déjà posé : dans ce cas on reste dessus, parce
        // qu'on vient de le déplacer et qu'on veut le relire.
        const suivant = prochainLibre();
        if (suivant && suivant !== courant) courant = suivant;
        peindre();
    }

    function valider() {
        if (fini || session.locked || poses.size < item.meta.points.length) return;
        const envoye = ecrirePlacements(item.meta.points
            .map(p => ({ nom: p.nom, ...poses.get(p.nom) })));
        fini = true;
        // CE QUI EST FAUX SE MONTRE EN ROUGE, POINT PAR POINT : « c'est faux »
        // tout court ne dit pas lequel, et l'élève recommencerait les dix.
        fautes = item.meta.points
            .filter(p => {
                const q = poses.get(p.nom);
                return !q || q.ligne !== p.ligne || q.colonne !== p.colonne;
            })
            .map(p => p.nom);
        // PLUS DE POINT « EN COURS » UNE FOIS VALIDÉ. Sans cette ligne, le
        // dernier point posé gardait son indigo au milieu de huit croix
        // noires toutes justes : on lisait que celui-là était différent, et
        // l'on cherchait en quoi. Vu sur la photo, pas sur un compteur.
        courant = null;
        const result = session.submit(envoye);
        peindre();
        const plan = container.querySelector('.dg-plan');
        if (plan) plan.classList.toggle('dg-plan--ok', !!result.correct);
        const statut = container.querySelector('.dg-statut');
        if (statut) {
            statut.textContent = result.correct
                ? `${item.meta.titre} ! Tous les points sont à leur place.`
                : `${fautes.length} point${fautes.length > 1 ? 's' : ''} `
                    + `mal placé${fautes.length > 1 ? 's' : ''} : ${fautes.join(', ')}.`;
        }
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot pose les points l'un après l'autre, à leur place. */
    async function runDemo() {
        peindre();
        for (const p of item.meta.points) {
            if (destroyed) return;
            courant = p.nom;
            poses.set(p.nom, { ligne: p.ligne, colonne: p.colonne });
            peindre();
            await new Promise(r => regTimeout(r, 420));
        }
        if (!destroyed) regTimeout(renderNext, 1200);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (observateur) { observateur.disconnect(); observateur = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
