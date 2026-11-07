// Activité « L'Arbre de Calculs » — on remplit les cases, ou on écrit la ligne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DES BOÎTES EN HTML, DES FLÈCHES EN SVG, ET LA GÉOMÉTRIE EN PIXELS.
//
// Le dessin est mixte, et c'est voulu. Les cases portent du TEXTE qu'on tape :
// ce sont de vrais boutons, qui reçoivent le foyer du clavier, qui grandissent
// avec le réglage d'affichage du téléphone, et dont la police est celle de
// l'application. Les flèches, elles, ne sont pas du texte : elles vont dans un
// calque SVG posé derrière, transparent aux clics.
//
// ET LA GÉOMÉTRIE EST MESURÉE, PAS MISE À L'ÉCHELLE. Un `viewBox` réduit par
// le CSS rend, sur un téléphone, des nombres de sept pixels de haut — avec
// tous les compteurs au vert, puisque le nombre est bien dans le DOM. Payé
// trois fois ce mois-ci, la dernière le jour même sur les Dessins Gradués.
//
// ── LE PAVÉ, ET POURQUOI IL N'EST PAS CELUI DU SYSTÈME ──────────────────────
//
// Rémy, sur un autre exercice : « il faut que le pavé numérique apparaissent
// pour ceux sur portable ». Le clavier du système recouvre la moitié de
// l'écran — donc l'arbre qu'on est en train de lire — et il ne porte ni « × »
// ni « ÷ ». Celui-ci reste sous le contenu et porte exactement les douze
// signes dont cet exercice a besoin.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { nombreFr, ligneJuste, geometrie, lireSaisie } from '../arbresDeCalculs.js';

const CHIFFRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
/** Les signes du pavé de l'expression, dans l'ordre où ils tombent sous le doigt. */
const SIGNES = ['(', ')', '+', '−', '×', '÷'];

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Ce que l'élève a tapé dans chaque case : id → texte. */
    let saisies = new Map();
    /** Ce qu'il a tapé dans la ligne, en mode « écrire l'expression ». */
    let ligneTapee = '';
    let actif = null;
    let fini = false;
    let fautes = [];
    let observateur = null;
    let derniereLargeur = 0;
    let surTouche = null;

    const estLigne = () => item && item.meta.question === 'ligne';
    /** Les cases que l'élève doit remplir, dans l'ordre de lecture. */
    const aRemplir = () => (estLigne() ? []
        : item.meta.cases.filter(c => c.genre === 'noeud'));

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        saisies = new Map();
        ligneTapee = '';
        fautes = [];
        fini = false;
        actif = estLigne() ? null : aRemplir()[0].id;

        // L'ORDRE DES TOUCHES EST CELUI DES RANGÉES, et il est calculé pour
        // qu'aucune ne reste orpheline : six colonnes, donc les dix chiffres
        // et la virgule font deux rangées pleines avec une douzième touche.
        // Pour compléter, c'est le « − » ; pour écrire une ligne, c'est
        // l'effacement, et les six signes prennent la rangée du dessous.
        const pave = estLigne()
            ? CHIFFRES.concat([',', 'eff']).concat(SIGNES)
            : CHIFFRES.concat([',', '−', 'eff']);

        container.innerHTML = `
            <div class="ac-layout">
                <div class="ac-context">${item.prompt.html}</div>
                <div class="ac-arbre"></div>
                ${estLigne()
        ? '<div class="ac-ligne" data-ligne aria-live="polite"></div>'
        : ''}
                <div class="ac-statut" role="status" aria-live="polite"></div>
                <div class="ac-pave${estLigne() ? ' ac-pave--large' : ''}">
                    ${pave.map(t => (t === 'eff'
        ? `<button type="button" class="ac-touche ac-touche--eff" data-t="eff"
                            aria-label="Effacer">⌫</button>`
        : `<button type="button" class="ac-touche" data-t="${t}">${t}</button>`)).join('')}
                    <button type="button" class="ac-touche ac-touche--ok" data-t="ok"
                        data-libelle>✓ Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        container.querySelectorAll('[data-t]').forEach(b => {
            b.onclick = () => taper(b.dataset.t);
        });
        brancherClavier();
        peindre();

        if (typeof ResizeObserver === 'function') {
            if (observateur) observateur.disconnect();
            // SUR LA LARGEUR SEULE : peindre change la HAUTEUR de l'arbre, ce
            // qui réveillerait l'œil, qui repeindrait, sans fin.
            observateur = new ResizeObserver(() => {
                if (destroyed) return;
                const a = container.querySelector('.ac-arbre');
                if (a && Math.abs(a.clientWidth - derniereLargeur) > 1) peindre();
            });
            observateur.observe(container.querySelector('.ac-arbre'));
        }
    }

    /** Le clavier physique écrit la même chose que le pavé. */
    function brancherClavier() {
        if (surTouche) document.removeEventListener('keydown', surTouche);
        surTouche = (e) => {
            if (destroyed || fini || session.locked) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = e.key;
            let t = null;
            if (/^[0-9]$/.test(k)) t = k;
            else if (k === ',' || k === '.') t = ',';
            else if (k === 'Backspace') t = 'eff';
            else if (k === 'Enter') t = 'ok';
            else if (estLigne() && '()+'.includes(k)) t = k;
            else if (estLigne() && (k === '*' || k === 'x')) t = '×';
            else if (estLigne() && (k === '/' || k === ':')) t = '÷';
            else if (k === '-' || k === '−') t = '−';
            if (!t) return;
            e.preventDefault();
            taper(t);
        };
        document.addEventListener('keydown', surTouche);
    }

    function taper(t) {
        if (fini || destroyed || session.locked) return;
        if (t === 'ok') return valider();
        if (estLigne()) {
            if (t === 'eff') ligneTapee = ligneTapee.slice(0, -1);
            // QUATRE-VINGTS SIGNES, parce qu'une réponse JUSTE ne doit jamais
            // être coupée : un arbre de cinq décimaux négatifs entièrement
            // parenthésé — « ((−10,5)×(−0,4)) » et ainsi de suite — tient en
            // cinquante signes, et toutes ces écritures-là sont acceptées.
            else if (ligneTapee.length < 80) ligneTapee += t;
            peindre();
            return;
        }
        if (!actif) return;
        const avant = saisies.get(actif) || '';
        let apres = avant;
        if (t === 'eff') apres = avant.slice(0, -1);
        else if (t === '−') {
            // LE MOINS BASCULE LE SIGNE, il ne s'ajoute pas : un élève qui
            // tape « − » deux fois veut revenir au positif, pas écrire « −− ».
            apres = avant.startsWith('−') ? avant.slice(1) : `−${avant}`;
        } else if (t === ',') {
            if (!avant.replace('−', '') || avant.includes(',')) apres = avant;
            else apres = `${avant},`;
        } else {
            const chiffres = avant.replace(/[−,]/g, '');
            const dec = (avant.split(',')[1] || '').length;
            if (chiffres.length >= 6 || (avant.includes(',') && dec >= 2)) apres = avant;
            else apres = avant + t;
        }
        saisies.set(actif, apres);
        peindre();
    }

    function peindre() {
        const boite = container.querySelector('.ac-arbre');
        if (!boite) return;
        const { cases, colonnes, lignes, racine } = item.meta;
        const g = geometrie(boite.clientWidth, colonnes, lignes);
        derniereLargeur = boite.clientWidth;
        const cx = (c) => g.x(c.colonne) + g.large / 2;
        const cy = (c) => g.y(c.ligne) + g.haut / 2;
        const parId = new Map(cases.map(c => [c.id, c]));

        // ── LES FLÈCHES ET LES RONDS D'OPÉRATION ───────────────────────────
        //
        // Le rond se pose À MI-CHEMIN entre la ligne des enfants et celle du
        // résultat, à l'aplomb du résultat : deux flèches y entrent, une en
        // sort. C'est la figure du manuel, et elle se lit sans légende.
        let traits = '', ronds = '';
        for (const c of cases) {
            if (c.genre !== 'noeud') continue;
            const bas = g.y(c.ligne);
            const rx = cx(c), ry = bas - g.pasY / 2 + g.haut / 2;
            for (const enfant of [parId.get(c.g), parId.get(c.d)]) {
                traits += `<line x1="${cx(enfant).toFixed(1)}"
                    y1="${(g.y(enfant.ligne) + g.haut).toFixed(1)}"
                    x2="${rx.toFixed(1)}" y2="${(ry - 13).toFixed(1)}" class="ac-fleche" />`;
            }
            traits += `<line x1="${rx.toFixed(1)}" y1="${(ry + 13).toFixed(1)}"
                x2="${rx.toFixed(1)}" y2="${(bas - 2).toFixed(1)}"
                class="ac-fleche ac-fleche--bout" marker-end="url(#ac-pointe)" />`;
            ronds += `<g class="ac-rond"><circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}"
                r="13" /><text x="${rx.toFixed(1)}" y="${(ry + 5).toFixed(1)}"
                text-anchor="middle">${c.op}</text></g>`;
        }

        // ── LES CASES ───────────────────────────────────────────────────────
        const montre = (c) => {
            if (c.genre === 'feuille' || estLigne()) return nombreFr(c.valeur);
            return saisies.get(c.id) || '';
        };
        const boutons = cases.map(c => {
            const trou = c.genre === 'noeud' && !estLigne();
            const classes = ['ac-case'];
            if (c.id === racine) classes.push('ac-case--final');
            if (!trou) classes.push('ac-case--donne');
            if (trou && c.id === actif) classes.push('ac-case--actif');
            if (fini && fautes.includes(c.id)) classes.push('ac-case--faux');
            const style = `left:${g.x(c.colonne).toFixed(1)}px; top:${g.y(c.ligne).toFixed(1)}px;`
                + `width:${g.large.toFixed(1)}px; height:${g.haut.toFixed(1)}px;`;
            if (!trou) {
                return `<div class="${classes.join(' ')}" style="${style}">${montre(c)}</div>`;
            }
            return `<button type="button" class="${classes.join(' ')}" style="${style}"
                data-case="${c.id}" aria-label="Case à compléter">${montre(c)}</button>`;
        }).join('');

        boite.style.height = `${Math.round(g.hauteur)}px`;
        boite.innerHTML = `<svg class="ac-svg" width="${g.l}" height="${Math.round(g.hauteur)}"
            viewBox="0 0 ${g.l} ${Math.round(g.hauteur)}" aria-hidden="true"><defs>
            <marker id="ac-pointe" markerWidth="7" markerHeight="7" refX="5.5" refY="3"
                orient="auto"><path d="M0,0 L6,3 L0,6 z" /></marker>
            </defs>${traits}${ronds}</svg>${boutons}`;
        boite.querySelectorAll('[data-case]').forEach(b => {
            b.disabled = fini || session.locked;
            b.onclick = () => { actif = b.dataset.case; peindre(); };
        });

        // ── LA LIGNE TAPÉE, ET L'ÉTAT ───────────────────────────────────────
        const champ = container.querySelector('[data-ligne]');
        if (champ) {
            champ.textContent = ligneTapee || '…';
            champ.classList.toggle('ac-ligne--vide', !ligneTapee);
        }

        const libelle = container.querySelector('[data-libelle]');
        const reste = estLigne() ? (ligneTapee ? 0 : 1)
            : aRemplir().filter(c => lireSaisie(saisies.get(c.id)) === null).length;
        if (libelle) {
            // UN SEUL BOUTON, DEUX MÉTIERS : tant qu'il reste une case vide, il
            // y emmène ; quand tout est rempli, il valide. Deux boutons côte à
            // côte — « suivante » et « valider » — se confondent au doigt, et
            // l'on valide un arbre à moitié rempli en croyant avancer.
            libelle.textContent = fini ? '✓ Valider'
                : (reste && !estLigne() ? '→ Case suivante' : '✓ Valider');
        }

        const statut = container.querySelector('.ac-statut');
        if (statut && !fini) {
            // LE STATUT NE RÉPÈTE PAS LA CONSIGNE, il dit ce qu'elle ne dit
            // pas : qu'on ne cherche pas UNE écriture mais une écriture
            // JUSTE. Sans cette phrase, un élève qui a bon efface tout parce
            // qu'il a mis une parenthèse de plus que ce qu'il imagine attendu.
            statut.textContent = estLigne()
                ? 'Toutes les écritures justes sont acceptées : une parenthèse en '
                    + 'plus ne gêne pas.'
                : (reste
                    ? `${reste} case${reste > 1 ? 's' : ''} à remplir.`
                    : 'Tout est rempli : tu peux valider.');
        }
    }

    /** La case suivante encore vide, à partir de celle qui est active. */
    function caseSuivante() {
        const liste = aRemplir();
        const vide = liste.filter(c => lireSaisie(saisies.get(c.id)) === null);
        if (!vide.length) return null;
        const apres = vide.find(c => liste.indexOf(c) > liste.findIndex(x => x.id === actif));
        return (apres || vide[0]).id;
    }

    function valider() {
        if (fini || destroyed || session.locked) return;
        if (!estLigne()) {
            const suivante = caseSuivante();
            if (suivante) { actif = suivante; peindre(); return; }
        } else if (!ligneTapee.trim()) {
            return;
        }

        let envoye, juste;
        if (estLigne()) {
            juste = ligneJuste(ligneTapee, {
                valeur: item.meta.valeur, nombres: item.meta.nombresDesFeuilles
            });
            // UNE EXPRESSION JUSTE S'ÉCRIT DE PLUSIEURS FAÇONS, et le moteur du
            // dépôt compare des TEXTES. C'est donc ici qu'on juge — avec
            // `ligneJuste`, qui vit au noyau et qui est éprouvé — et l'on
            // envoie l'écriture canonique quand c'est juste, le texte de
            // l'élève quand ça ne l'est pas, pour que le carnet d'erreurs
            // garde ce qu'il a vraiment écrit.
            envoye = juste ? item.answer : ligneTapee;
            fautes = juste ? [] : [item.meta.racine];
        } else {
            const lues = aRemplir().map(c => ({ c, v: lireSaisie(saisies.get(c.id)) }));
            fautes = lues.filter(({ c, v }) => v === null
                || Math.abs(v - c.valeur) > 1e-9).map(({ c }) => c.id);
            envoye = 'a' + aRemplir()
                .map(c => `${c.id}:${lues.find(x => x.c.id === c.id).v === null
                    ? '?' : nombreFr(lues.find(x => x.c.id === c.id).v)}`).join(';');
            juste = fautes.length === 0;
        }

        fini = true;
        actif = null;
        const result = session.submit(envoye);
        peindre();
        const statut = container.querySelector('.ac-statut');
        if (statut) {
            if (result.correct) {
                statut.textContent = estLigne()
                    ? `Oui : ${item.meta.ligneAttendue} = ${nombreFr(item.meta.valeur)}.`
                    : `Tout juste — la case rouge vaut ${nombreFr(item.meta.valeur)}.`;
            } else if (estLigne()) {
                statut.textContent = `Non. L'arbre dit : ${item.meta.ligneAttendue}.`;
            } else {
                // ON NE NOMME PAS LES CASES. Le premier jet écrivait « 1 case à
                // revoir : r1 » — « r1 » est le nom INTERNE de la case, il
                // n'est écrit nulle part à l'écran, et l'élève le cherche. Le
                // rouge, lui, la désigne sans un mot. Vu sur la photo de la
                // sonde, jamais dans un compteur.
                statut.textContent = fautes.length > 1
                    ? `${fautes.length} cases à revoir : elles sont en rouge.`
                    : 'Une case à revoir : elle est en rouge.';
            }
        }
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot remplit les cases dans l'ordre, ou écrit la ligne signe à signe. */
    async function runDemo() {
        peindre();
        if (estLigne()) {
            for (const c of item.meta.ligneAttendue.replace(/ /g, '')) {
                if (destroyed) return;
                ligneTapee += c;
                peindre();
                await new Promise(r => regTimeout(r, 140));
            }
        } else {
            for (const c of aRemplir()) {
                if (destroyed) return;
                actif = c.id;
                saisies.set(c.id, nombreFr(c.valeur));
                peindre();
                await new Promise(r => regTimeout(r, 480));
            }
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
            if (surTouche) { document.removeEventListener('keydown', surTouche); surTouche = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
