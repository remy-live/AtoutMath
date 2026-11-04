// Activité « Le Pont et la lampe » — on touche, on traverse, on compte.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 4 novembre : « Oui super et il faut que ce soit joli », puis « le A ».
//
// ── LE GESTE EST CELUI DE LA TRAVERSÉE, ET C'EST VOULU ─────────────────────
//
// On touche quelqu'un pour le faire monter sur le pont, on le retouche pour le
// faire redescendre, puis on appuie sur « Traverser ». C'est exactement le
// geste du loup, de la chèvre et du chou — que l'élève connaît déjà. Inventer
// une seconde grammaire pour une énigme de la même famille lui ferait
// apprendre l'écran au lieu de l'énigme.
//
// ── ON NE GRISE PAS « TRAVERSER » QUAND LE COUP EST MAUVAIS ────────────────
//
// Un coup cher n'est pas un coup interdit : il amène bien tout le monde de
// l'autre côté. Ce qui est en jeu ici n'est pas « réussir ou rater », c'est
// « combien ». Griser le bouton donnerait d'ailleurs la solution par
// élimination — il suffirait d'appuyer partout et de regarder ce qui reste
// allumé.
//
// ── CE QUI SE JUGE EST LE TOTAL, PAS LE CHEMIN ─────────────────────────────
//
// Plusieurs chemins coûtent dix-sept minutes. On envoie donc au journal le
// nombre de minutes obtenu, et il est JUSTE quand il égale le minimum. Un élève
// qui passe tout le monde en dix-neuf minutes n'a pas échoué : il a trouvé une
// solution plus chère, et l'écran le lui dit en toutes lettres — c'est là
// qu'est la leçon.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { makeRng } from '../ids.js';
import {
    decorDuPont, etoilesSvg, habitDe, lampeSvg, marcheurSvg, solDuPont, SOL_RIVE
} from '../pontSvg.js';

/** Combien de temps dure la traversée à l'écran, en millisecondes. */
const TRAVERSEE_MS = 900;

/**
 * OÙ L'ON SE TIENT : les deux places du pont, et la bande de chaque rive.
 *
 * LES RIVES ONT 300 PIXELS DE LARGE, et c'est une contrainte du décor, pas un
 * réglage : la falaise de gauche va de 0 à 300, celle de droite de 800 à 1100
 * (voir `decorDuPont`). MESURÉ à l'écran, deux fois :
 *
 *   · avec un pas fixe de 98, le quatrième marcheur se tenait DANS LE VIDE, à
 *     cheval sur la tête du pont ;
 *   · avec un pas fixe de 48, les quatre pastilles de temps se chevauchaient
 *     une fois tout le monde arrivé — on lisait « 10 min 5 min 2 min » en un
 *     seul bloc, et c'est le chiffre qu'on vient lire.
 *
 * ON RÉPARTIT DONC DANS LA BANDE, selon combien de monde s'y trouve : ils se
 * resserrent en arrivant et s'écartent en partant, ce qui est aussi ce que des
 * gens font au bord d'un gouffre.
 */
const PLACES_PONT = [470, 630];
const BANDE = { g: [56, 262], d: [838, 1044] };
/** Jamais plus de ça entre deux marcheurs : à deux, ils seraient aux antipodes. */
const PAS_MAX = 84;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Où est chacun : 'g', 'd' ou 'pont'. Et de quel côté est la lampe. */
    let ou = [], lampe = 'g';
    let minutes = 0, fini = false, enRoute = false;
    let etoiles = '';

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function remettre() {
        ou = item.meta.marcheurs.map(() => 'g');
        lampe = 'g';
        minutes = 0;
        fini = false;
        enRoute = false;
    }

    function dire(texte) {
        const st = container.querySelector('.pl-statut');
        if (st) st.textContent = texte;
    }

    function render(prochain) {
        item = prochain;
        // LES ÉTOILES SE TIRENT DE LA GRAINE DE L'ITEM, et une seule fois : au
        // hasard à chaque repeint, le ciel scintillerait à chaque coup joué —
        // et un décor qui bouge quand on réfléchit est un décor qui gêne.
        etoiles = etoilesSvg(makeRng(`${item.seed || 'pont'}-ciel`), 120);
        remettre();

        container.innerHTML = `
            <div class="pl-layout">
                <div class="pl-context">${item.prompt.html}</div>
                <div class="pl-scene">
                    <svg class="pl-decor" viewBox="0 0 1100 560"
                         preserveAspectRatio="xMidYMid meet" role="img"
                         aria-label="Un pont de corde au-dessus d'un gouffre, la nuit">
                        ${decorDuPont(etoiles)}
                        <circle class="pl-halo" r="210" fill="url(#pl-halo)"/>
                        <g data-gens></g>
                        <g data-lampe></g>
                    </svg>
                </div>
                <div class="pl-compteur">
                    <b data-minutes>0 min</b>
                    <span>objectif : ${item.meta.minutes} min</span>
                </div>
                <div class="pl-statut" role="status" aria-live="polite"></div>
                <div class="pl-actions">
                    <button type="button" class="pl-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="pl-btn pl-btn--fort" data-traverser>Traverser</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();
        dire('Touche une ou deux personnes du côté de la lampe, puis « Traverser ».');
        container.querySelector('[data-recommencer]').onclick = () => {
            if (enRoute) return;
            remettre(); peindre();
            dire('On recommence. Qui part en premier ?');
        };
        container.querySelector('[data-traverser]').onclick = traverser;
        brancherLeToucher();
    }

    /** Qui est sur le pont, dans l'ordre où ils y sont montés. */
    const surLePont = () => ou.map((o, i) => (o === 'pont' ? i : -1)).filter(i => i >= 0);

    /**
     * OÙ CHACUN SE TIENT. Les rives rangent par ordre d'arrivée, le pont a deux
     * places fixes. Le tablier PLIE : on demande au décor la hauteur du
     * plancher à cette abscisse-là, sinon les marcheurs flottent au milieu.
     */
    function placeDe(i) {
        if (ou[i] === 'pont') {
            const rang = surLePont().indexOf(i);
            const x = PLACES_PONT[rang] ?? PLACES_PONT[0];
            return { x, y: solDuPont(x) };
        }
        const liste = ou.map((o, k) => (o === ou[i] ? k : -1)).filter(k => k >= 0);
        const rang = liste.indexOf(i);
        const [a, b] = BANDE[ou[i]];
        const pas = liste.length > 1
            ? Math.min(PAS_MAX, Math.abs(b - a) / (liste.length - 1)) : 0;
        const sens = b > a ? 1 : -1;
        // CENTRÉS DANS LA BANDE : à deux, ils ne se tiennent pas chacun à un
        // bout de la falaise comme s'ils se fâchaient.
        const large = pas * (liste.length - 1);
        const debut = (a + b) / 2 - sens * large / 2;
        return { x: debut + sens * pas * rang, y: SOL_RIVE };
    }

    function peindre() {
        const gens = container.querySelector('[data-gens]');
        const lampeEl = container.querySelector('[data-lampe]');
        const halo = container.querySelector('.pl-halo');
        if (!gens) return;
        const lent = item.meta.marcheurs.reduce(
            (meilleur, m, i) => (m.minutes > item.meta.marcheurs[meilleur].minutes ? i : meilleur), 0);
        gens.innerHTML = item.meta.marcheurs.map((m, i) => {
            const p = placeDe(i);
            // ÉCLAIRÉ VEUT DIRE « DU CÔTÉ DE LA LAMPE », donc « peut partir ».
            // C'est la seule information de règle que le dessin porte tout
            // seul, et elle évite une phrase à chaque coup.
            const eclaire = ou[i] === 'pont' || ou[i] === lampe;
            const habit = habitDe(i, { lent: i === lent, sac: i === 1 });
            const choisi = ou[i] === 'pont' ? ' pl-marcheur--sur' : '';
            return `<g class="pl-marcheur${choisi}" data-pion="${i}" role="button"
                       tabindex="0" aria-label="${m.nom}, ${m.minutes} minute${m.minutes > 1 ? 's' : ''}"
                       transform="translate(${p.x} ${p.y})">
                <g transform="scale(.78)">${marcheurSvg(habit, { lumiere: eclaire })}</g>
                <rect x="-29" y="14" width="58" height="24" rx="12" fill="${habit.corps}"/>
                <text x="0" y="32" text-anchor="middle" class="pl-min">${m.minutes} min</text>
                <text x="0" y="58" text-anchor="middle" class="pl-nom">${m.nom}</text>
            </g>`;
        }).join('');
        // LA LAMPE SUIT CE QUI EST SUR LE PONT, sinon elle attend sur sa rive.
        const dessus = surLePont();
        const pos = dessus.length
            ? { x: (placeDe(dessus[0]).x + placeDe(dessus[dessus.length - 1]).x) / 2 - 56, y: solDuPont(550) - 4 }
            // POSÉE À LA TÊTE DU PONT, et non au milieu de la rive : c'est là
            // qu'on la prend en partant, et elle n'y recouvre personne.
            : { x: lampe === 'g' ? 312 : 788, y: SOL_RIVE - 4 };
        if (lampeEl) lampeEl.innerHTML = `<g transform="translate(${pos.x} ${pos.y})">${lampeSvg()}</g>`;
        if (halo) { halo.setAttribute('cx', pos.x); halo.setAttribute('cy', pos.y); }
        const b = container.querySelector('[data-minutes]');
        if (b) b.textContent = `${minutes} min`;
        const bouton = container.querySelector('[data-traverser]');
        if (bouton) bouton.disabled = fini || enRoute || !dessus.length || session.locked;
    }

    function brancherLeToucher() {
        const scene = container.querySelector('.pl-scene');
        if (!scene) return;
        const prendre = (e) => {
            if (fini || destroyed || enRoute || session.locked) return;
            const el = e.target.closest ? e.target.closest('[data-pion]') : null;
            if (!el) return;
            const i = Number(el.dataset.pion);
            if (ou[i] === 'pont') { ou[i] = lampe; peindre(); return; }
            // ON NE MONTE QUE DU CÔTÉ DE LA LAMPE, et l'on DIT pourquoi : sans
            // ce mot, l'élève touche trois fois le même marcheur en croyant que
            // l'écran ne répond pas.
            if (ou[i] !== lampe) {
                dire(`${item.meta.marcheurs[i].nom} est de l'autre côté : la lampe n'y est pas.`);
                return;
            }
            if (surLePont().length >= item.meta.places) {
                dire(`Le pont ne porte que ${item.meta.places} personnes. Retouche quelqu'un `
                    + 'pour le faire redescendre.');
                return;
            }
            ou[i] = 'pont';
            peindre();
            const dessus = surLePont();
            dire(dessus.length === 2
                ? `${item.meta.marcheurs[dessus[0]].nom} et ${item.meta.marcheurs[dessus[1]].nom} : `
                    + `ils iront au rythme du plus lent, ${Math.max(...dessus.map(k => item.meta.marcheurs[k].minutes))} min.`
                : 'Tu peux en prendre un second, ou traverser seul pour rapporter la lampe.');
        };
        scene.addEventListener('click', prendre);
        scene.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prendre(e); }
        });
    }

    function traverser() {
        const dessus = surLePont();
        if (!dessus.length || enRoute || fini) return;
        enRoute = true;
        const cout = Math.max(...dessus.map(i => item.meta.marcheurs[i].minutes));
        const vers = lampe === 'g' ? 'd' : 'g';
        minutes += cout;
        dire(`${dessus.map(i => item.meta.marcheurs[i].nom).join(' et ')} `
            + `${dessus.length > 1 ? 'traversent' : 'traverse'} — ${cout} min.`);
        const b = container.querySelector('[data-minutes]');
        if (b) b.textContent = `${minutes} min`;
        const scene = container.querySelector('.pl-scene');
        if (scene) scene.classList.add('pl-scene--marche');
        regTimeout(() => {
            if (destroyed) return;
            if (scene) scene.classList.remove('pl-scene--marche');
            dessus.forEach(i => { ou[i] = vers; });
            lampe = vers;
            enRoute = false;
            peindre();
            if (ou.every(o => o === 'd')) reussi();
            else if (vers === 'd') dire('Il faut rapporter la lampe. Qui revient ?');
        }, TRAVERSEE_MS);
    }

    function reussi() {
        fini = true;
        peindre();
        const mini = item.meta.minutes;
        const scene = container.querySelector('.pl-scene');
        if (scene) scene.classList.add(minutes === mini ? 'pl-scene--ok' : 'pl-scene--presque');
        dire(minutes === mini
            ? `Tout le monde est passé en ${minutes} minutes. C'est le minimum !`
            : `Tout le monde est passé, en ${minutes} minutes. On peut faire ${mini} : `
                + 'essaie de faire traverser les deux plus lents ENSEMBLE.');
        // CE QU'ON ENVOIE EST LE TOTAL, et il est juste quand il égale le
        // minimum. Dix-neuf minutes n'est pas une faute de calcul : c'est une
        // solution plus chère, et l'écran vient de le dire.
        const result = session.submit(String(minutes));
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot joue la solution minimale, et la commente. */
    async function runDemo() {
        peindre();
        for (const t of item.meta.trajets) {
            if (destroyed) return;
            t.qui.forEach(i => { ou[i] = 'pont'; });
            peindre();
            await new Promise(r => regTimeout(r, 620));
            if (destroyed) return;
            minutes += t.minutes;
            const vers = t.vers === 'droite' ? 'd' : 'g';
            t.qui.forEach(i => { ou[i] = vers; });
            lampe = vers;
            peindre();
            dire(item.meta.solution[item.meta.trajets.indexOf(t)]);
            await new Promise(r => regTimeout(r, 780));
        }
        if (!destroyed) {
            dire(`${minutes} minutes : c'est le minimum.`);
            regTimeout(renderNext, 1200);
        }
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() { destroyed = true; container.innerHTML = ''; }
    };
}
