// Activité « Le Dessin Gradué » — on pose un jeton, on le glisse, on le reprend.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre, capture à l'appui : « on pourrait glisser les points, tous
// les axes doivent apparaitre à l'écran et quand on clique sur un point qui
// est sur un axe ca le remet. Fais mieux ».
//
// TROIS DEMANDES, ET UN QUATRIÈME DÉFAUT QUI SE VOIT SUR SA CAPTURE :
//
//   · ON GLISSE UN POINT POSÉ. Un point mal placé se rattrapait en le
//     resélectionnant dans la liste puis en retouchant la droite — deux gestes
//     pour corriger de deux graduations.
//   · TOUTES LES DROITES TIENNENT DANS L'ÉCRAN. L'écart entre deux droites ne
//     suit plus la seule largeur : il se calcule aussi sur la HAUTEUR
//     DISPONIBLE, mesurée sous le plan. Un dessin de six droites ne s'étale
//     plus hors de la fenêtre.
//   · TOUCHER UN POINT POSÉ LE REPREND. Il repart dans la liste et redevient
//     le point en cours.
//   · ET DEUX POINTS AU MÊME ENDROIT SE VOIENT. Sur sa capture, deux lettres
//     empilées exactement au même pixel font une TACHE NOIRE qu'on ne sait pas
//     lire. Les dessins n'ont jamais deux points sur la même case : les voir
//     ensemble, c'est donc savoir qu'au moins l'un des deux est à reprendre —
//     sans dire lequel, ce qui resterait une correction avant l'heure.
//
// ── LE JETON A REMPLACÉ LA CROIX ────────────────────────────────────────────
//
// Une croix de quatorze pixels avec sa lettre flottant au-dessus, c'est petit
// à viser, laid quand deux se touchent, et impossible à saisir du doigt. Un
// jeton rond de vingt-quatre pixels portant sa lettre se voit, se prend, et
// dit tout seul qu'on peut le déplacer.
//
// ── LE DESSIN SE TRACE, IL NE SE DESSINE PAS ────────────────────────────────
//
// L'élève PLACE, le logiciel TRACE. C'est le partage qui garde la ligne rouge
// à distance : on ne donne aucun outil de tracé, aucune règle virtuelle, rien
// à faire glisser pour fabriquer un segment. On révèle une image que ses
// nombres ont désignée — et glisser un POINT n'est pas tracer un trait.
//
// ── POURQUOI LA GÉOMÉTRIE EST EN PIXELS, ET MESURÉE ─────────────────────────
//
// Un `viewBox` fixe mis à l'échelle par le CSS rend, sur un téléphone de
// 390 px, une borne de sept pixels de haut — avec toutes les mesures chiffrées
// au vert, puisque le nombre EST là, dans le DOM, à sa place. Le `viewBox` fait
// donc la taille du plan EN PIXELS, mesurée avant de peindre.

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
    let derniereLargeur = 0;
    /** La géométrie de la dernière peinture — les gestes en ont besoin. */
    let geo = null, hauteurSvg = 0;
    /** Le point qu'on tient, et si le doigt a bougé assez pour que ce soit un glisser. */
    let saisi = null, depart = null, aGlisse = false;
    /** Le dernier point déposé : c'est LUI qu'on reprend sur un tas de deux. */
    let dernierPose = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        poses = new Map();
        fautes = [];
        fini = false;
        saisi = null; depart = null; aGlisse = false; dernierPose = null;
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
        brancherGestes();

        // LE PLAN SE REPEINT QUAND IL CHANGE DE LARGEUR : sa géométrie est en
        // pixels, donc elle ne survit pas à une rotation d'écran ni à
        // l'ouverture du volet des réglages.
        //
        // SUR LA LARGEUR SEULE, ET C'EST OBLIGATOIRE : peindre change la
        // HAUTEUR du plan, ce qui réveille l'œil, qui repeint, qui change la
        // hauteur… Le navigateur finit par couper la boucle en criant
        // « ResizeObserver loop completed with undelivered notifications ».
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

    /**
     * LA HAUTEUR QUI RESTE SOUS LE PLAN, mesurée et non devinée.
     *
     * Rémy : « tous les axes doivent apparaitre à l'écran ». On additionne donc
     * ce que les frères DU DESSOUS occupent — le statut, les deux boutons, la
     * barre d'indice — et l'on en déduit la place que le plan peut prendre.
     * Un chiffre écrit en dur serait juste sur l'écran où on l'a écrit et faux
     * sur les deux autres.
     */
    function hauteurDisponible(plan) {
        if (typeof window === 'undefined') return 0;
        const layout = plan.parentElement;
        let sous = 0, apres = false;
        for (const el of layout ? layout.children : []) {
            if (el === plan) { apres = true; continue; }
            if (apres) sous += el.getBoundingClientRect().height + 10;
        }
        return window.innerHeight - plan.getBoundingClientRect().top - sous - 12;
    }

    /** Les points posés, regroupés par case : « A » seul, ou « B C » ensemble. */
    function parCase() {
        const tas = new Map();
        for (const p of item.meta.points) {
            const q = poses.get(p.nom);
            if (!q) continue;
            const clef = `${q.ligne}.${q.colonne}`;
            if (!tas.has(clef)) tas.set(clef, { ligne: q.ligne, colonne: q.colonne, noms: [] });
            tas.get(clef).noms.push(p.nom);
        }
        return [...tas.values()];
    }

    function peindre() {
        const plan = container.querySelector('.dg-plan');
        if (!plan) return;
        const { droites, points } = item.meta;
        const g = geometrie(plan.clientWidth, {
            lignes: droites.length, dispo: hauteurDisponible(plan)
        });
        geo = g;
        derniereLargeur = plan.clientWidth;
        const H = g.haut + (droites.length - 1) * g.pas + g.bas;
        hauteurSvg = H;
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
                ? `<text x="${xDeLaColonne(COLONNES / 2).toFixed(1)}" y="${y + g.souscran}"
                    class="dg-borne" text-anchor="middle">${nombreFr(
                    d.min + (COLONNES / 2) * d.pas)}</text>`
                : '';
            etiquettes.push(`<g>
                <text x="${g.x0}" y="${y + g.souscran}" class="dg-borne"
                    text-anchor="middle">${nombreFr(d.min)}</text>
                <text x="${g.x1.toFixed(1)}" y="${y + g.souscran}" class="dg-borne"
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
        // On les peint AVANT les jetons : un sommet doit rester visible par-
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

        // ── LES JETONS POSÉS, UN PAR CASE OCCUPÉE ───────────────────────────
        const jetons = parCase().map(t => {
            const x = xDeLaColonne(t.colonne), y = yDeLaLigne(t.ligne);
            const double = t.noms.length > 1;
            const classes = ['dg-point',
                t.noms.includes(courant) ? 'dg-point--actif' : '',
                saisi && t.noms.includes(saisi) ? 'dg-point--tenu' : '',
                double ? 'dg-point--double' : '',
                fini && t.noms.some(n => fautes.includes(n)) ? 'dg-point--faux' : ''
            ].filter(Boolean);
            const texte = t.noms.join(' ');
            // SUR UN TAS DE DEUX, ON REPREND CELUI QU'ON VIENT DE POSER. C'est
            // le geste qu'on fait en s'apercevant qu'on s'est trompé d'endroit,
            // et il ne demande pas de deviner lequel des deux le logiciel va
            // choisir. À défaut, le dernier de la liste.
            const prenable = t.noms.includes(dernierPose)
                ? dernierPose : t.noms[t.noms.length - 1];
            // UN JETON ROND POUR UN POINT, UN JETON ALLONGÉ POUR DEUX : la
            // largeur suit le nombre de lettres, et l'on voit d'un coup d'œil
            // qu'il y en a deux au même endroit.
            const demi = double ? 10 + texte.length * 5 : 12;
            return `<g class="${classes.join(' ')}" data-jeton="${prenable}">
                <rect x="${(x - demi).toFixed(1)}" y="${y - 12}" width="${demi * 2}"
                    height="24" rx="12" />
                <text x="${x.toFixed(1)}" y="${y + 5}" text-anchor="middle">${texte}</text>
            </g>`;
        }).join('');

        // L'ÉTAT S'ÉCRIT SUR LE CADRE, et ce n'est pas du débogage oublié :
        // une sonde qui veut savoir quel point est en cours n'a, sinon, que des
        // indices — la pastille indigo, le texte de l'ordre de marche — et
        // chacun peut mentir pour une autre raison que celle qu'on cherche.
        plan.dataset.courant = courant || '';
        plan.dataset.fini = fini ? '1' : '';
        plan.innerHTML = `<svg viewBox="0 0 ${g.l} ${H}" width="${g.l}" height="${H}"
            class="dg-svg" role="img"
            aria-label="${droites.length} droites graduées">${axes}${formes}${traits}${
    etiquettes.join('')}${jetons}</svg>`;

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
            const empiles = parCase().filter(t => t.noms.length > 1);
            const dernier = poses.get(courant);
            const d = dernier ? droites[dernier.ligne - 1] : null;
            // CE QU'IL VIENT D'ÉCRIRE, RELU À VOIX HAUTE : « B est sur la
            // droite 2, à 0,7 ». C'est le seul endroit où il peut voir que sa
            // graduation ne dit pas ce qu'il croyait, AVANT de valider.
            const relu = dernier
                ? `${courant} est sur la droite ${dernier.ligne}, à `
                    + `${nombreFr(d.min + dernier.colonne * d.pas)}. `
                : '';
            if (empiles.length) {
                statut.textContent = `${empiles[0].noms.join(' et ')} sont au même endroit : `
                    + 'deux points ne peuvent pas partager une case.';
            } else {
                statut.textContent = reste
                    ? `${relu}${reste} point${reste > 1 ? 's' : ''} à placer.`
                    : `${relu}Tout est posé : tu peux valider.`;
            }
        }
    }

    /**
     * LES TROIS GESTES DU PLAN, branchés UNE FOIS sur le cadre.
     *
     * Ils ne peuvent pas vivre sur le `<svg>` : peindre le remplace, et un
     * glisser en cours perdrait son écouteur au premier mouvement. Le cadre,
     * lui, survit à toutes les peintures — c'est aussi lui qui capture le
     * pointeur, pour que le doigt puisse sortir du plan sans lâcher le jeton.
     */
    function brancherGestes() {
        const plan = container.querySelector('.dg-plan');
        if (!plan) return;

        const place = (e) => {
            const svg = plan.querySelector('svg');
            if (!svg || !geo) return null;
            const r = svg.getBoundingClientRect();
            if (!r.width || !r.height) return null;
            const vx = (e.clientX - r.left) / r.width * geo.l;
            const vy = (e.clientY - r.top) / r.height * hauteurSvg;
            return {
                ligne: Math.max(1, Math.min(item.meta.droites.length,
                    Math.round((vy - geo.haut) / geo.pas) + 1)),
                colonne: Math.max(0, Math.min(COLONNES,
                    Math.round((vx - geo.x0) / geo.colonne)))
            };
        };

        // `data-jeton`, ET SURTOUT PAS `data-point`.
        //
        // `js/core/state.js` pose le style de point choisi par le professeur
        // sur la RACINE du document : `<html data-point="croix">`. Un
        // `closest('[data-point]')` lancé depuis le plan remonte donc jusqu'à
        // `<html>` et trouve TOUJOURS un « jeton » nommé « croix ». Résultat :
        // le premier toucher prenait en main un point qui n'existe pas, le
        // point courant devenait « croix », et plus rien ne se posait — sans
        // une seule erreur de page. Trouvé en écrivant l'état sur le cadre et
        // en le relisant, pas en relisant le code.
        //
        // On borne aussi au plan : un attribut de données générique peut
        // toujours réapparaître au-dessus de nous.
        plan.addEventListener('pointerdown', (e) => {
            if (fini || destroyed || session.locked) return;
            const cible = e.target.closest ? e.target.closest('[data-jeton]') : null;
            const jeton = (cible && plan.contains(cible)) ? cible : null;
            saisi = jeton ? jeton.dataset.jeton : null;
            depart = { x: e.clientX, y: e.clientY };
            aGlisse = false;
            if (saisi) {
                try { plan.setPointerCapture(e.pointerId); } catch (err) { /* souris */ }
                peindre();
            }
        });

        plan.addEventListener('pointermove', (e) => {
            if (!depart || !saisi || fini || destroyed) return;
            if (!aGlisse
                && Math.abs(e.clientX - depart.x) + Math.abs(e.clientY - depart.y) < 8) return;
            aGlisse = true;
            const p = place(e);
            if (!p) return;
            poses.set(saisi, p);
            dernierPose = saisi;
            courant = saisi;
            peindre();
        });

        const lacher = (e) => {
            if (!depart || fini || destroyed || session.locked) { depart = null; saisi = null; return; }
            const bouge = Math.abs(e.clientX - depart.x) + Math.abs(e.clientY - depart.y);
            const tenu = saisi, glisse = aGlisse;
            depart = null; saisi = null; aGlisse = false;
            try { plan.releasePointerCapture(e.pointerId); } catch (err) { /* souris */ }

            if (glisse) { peindre(); return; }
            // UN TOUCHER COURT SUR UN JETON POSÉ LE REPREND. Rémy : « quand on
            // clique sur un point qui est sur un axe ca le remet ».
            if (tenu) {
                poses.delete(tenu);
                if (dernierPose === tenu) dernierPose = null;
                courant = tenu;
                peindre();
                return;
            }
            // AU LEVER DU DOIGT, ET SEULEMENT SI LE DOIGT N'A PAS GLISSÉ. Au
            // `pointerdown`, le plan devient inutilisable sur un téléphone : on
            // le traverse pour atteindre les boutons du bas, et chaque
            // défilement posait un point au passage.
            if (bouge >= 12 || !courant) return;
            const p = place(e);
            if (!p) return;
            poses.set(courant, p);
            dernierPose = courant;
            const suivant = prochainLibre();
            if (suivant && suivant !== courant) courant = suivant;
            peindre();
        };
        plan.addEventListener('pointerup', lacher);
        plan.addEventListener('pointercancel', () => {
            depart = null; saisi = null; aGlisse = false; peindre();
        });
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
        // dernier point posé gardait son indigo au milieu de huit jetons
        // tous justes : on lisait que celui-là était différent, et l'on
        // cherchait en quoi. Vu sur la photo, pas sur un compteur.
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
