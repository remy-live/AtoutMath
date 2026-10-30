// Activité « Le Pendu Mathématique » — vingt-six lettres, six erreurs.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// UN SEUL GESTE : toucher une lettre. Il n'y a rien d'autre à apprendre, et
// c'est pour cela que ce jeu marche depuis toujours.
//
// ── POURQUOI UN PAVÉ DE LETTRES ET PAS LE CLAVIER DU TÉLÉPHONE ──────────────
//
// Sur un téléphone, ouvrir le clavier mange la moitié de l'écran — le dessin
// et le mot passent sous le pli, et l'on ne voit plus ce qu'on cherche. Le
// pavé, lui, montre AUSSI ce qui a déjà été essayé, ce qu'un clavier ne fait
// pas : une lettre grisée est une lettre qu'on ne redemandera pas.
//
// LE CLAVIER PHYSIQUE RESTE BRANCHÉ pour ceux qui travaillent sur ordinateur :
// taper « m » joue le M. C'est gratuit, et personne sur un ordinateur ne va
// chercher la souris pour appuyer sur une lettre.
//
// ── CE QU'ON MONTRE ET CE QU'ON TAIT ────────────────────────────────────────
//
// On montre le nombre de lettres, les lettres trouvées, les lettres déjà
// essayées, et le dessin des erreurs. ON NE MONTRE PAS combien d'erreurs il
// reste EN CHIFFRES : le dessin le dit, et le dire deux fois ferait regarder
// le compteur plutôt que le mot.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { decorSvg } from '../penduDecors.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Les lettres proposées, dans l'ordre, et le compte des erreurs. */
    let essayees = [], erreurs = 0, fini = false;
    let auClavier = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    const trouvees = () => essayees.filter(c => item.meta.mot.includes(c));
    const gagne = () => item.meta.lettres.every(c => essayees.includes(c));

    function render(prochain) {
        item = prochain;
        essayees = [];
        erreurs = 0;
        fini = false;

        container.innerHTML = `
            <div class="pd-layout">
                <div class="pd-context">${item.prompt.html}</div>
                <div class="pd-haut">
                    <div class="pd-decor"></div>
                    <div class="pd-droite">
                        <div class="pd-def"></div>
                        <div class="pd-mot" role="status" aria-live="polite"></div>
                    </div>
                </div>
                <div class="pd-clavier" role="group" aria-label="Les lettres"></div>
                <div class="pd-statut" role="status" aria-live="polite"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();

        // LE CLAVIER PHYSIQUE, pour ceux qui sont sur ordinateur. On le
        // débranche dans `destroy` : un écouteur sur `document` qui survit à
        // son activité joue des lettres dans l'exercice suivant.
        auClavier = (e) => {
            if (fini || destroyed || e.metaKey || e.ctrlKey || e.altKey) return;
            const c = (e.key || '').toUpperCase();
            if (c.length === 1 && ALPHABET.includes(c)) { e.preventDefault(); jouer(c); }
        };
        document.addEventListener('keydown', auClavier);
    }

    function peindre() {
        const { mot, definition, erreursMax, decor, indice } = item.meta;

        const d = container.querySelector('.pd-decor');
        if (d) {
            d.innerHTML = decorSvg(decor, erreurs,
                { taille: 150, titre: `${erreurs} erreur sur ${erreursMax}` });
            d.classList.toggle('pd-decor--chaud', erreurs >= erreursMax - 2);
        }

        // LA DÉFINITION SELON LE RÉGLAGE. « À partir de la deuxième erreur »
        // laisse une chance de trouver sans elle, et la donne avant que ce
        // soit perdu — donner un indice quand il ne reste plus rien à jouer
        // n'aide personne.
        const def = container.querySelector('.pd-def');
        if (def) {
            const visible = indice === 'toujours' || (indice === 'apres' && erreurs >= 2)
                || fini;
            def.textContent = visible ? definition : '';
            def.classList.toggle('pd-def--vide', !visible);
        }

        const vu = container.querySelector('.pd-mot');
        if (vu) {
            vu.innerHTML = [...mot].map(c => {
                const su = essayees.includes(c);
                // À LA FIN PERDUE, on montre le mot entier en marquant ce qui
                // manquait : un élève qui ne voit jamais la réponse ne l'apprend
                // pas, et c'est tout l'intérêt de l'exercice.
                const montre = su || (fini && !gagne());
                return `<span class="pd-lettre${su ? ' pd-lettre--su'
                    : montre ? ' pd-lettre--ratee' : ''}">${montre ? c : ''}</span>`;
            }).join('');
            vu.setAttribute('aria-label', `Le mot : ${[...mot]
                .map(c => (essayees.includes(c) ? c : 'blanc')).join(' ')}`);
        }

        const clav = container.querySelector('.pd-clavier');
        if (clav) {
            clav.innerHTML = ALPHABET.map(c => {
                const essaye = essayees.includes(c);
                const bonne = essaye && mot.includes(c);
                return `<button type="button" class="pd-touche${essaye
                    ? (bonne ? ' pd-touche--bonne' : ' pd-touche--ratee') : ''}"
                    data-lettre="${c}"${essaye || fini ? ' disabled' : ''}>${c}</button>`;
            }).join('');
            clav.querySelectorAll('[data-lettre]').forEach(b => {
                b.onclick = () => jouer(b.dataset.lettre);
                if (session.locked) b.disabled = true;
            });
        }

        const st = container.querySelector('.pd-statut');
        if (st && !fini) {
            st.textContent = essayees.length
                ? `${trouvees().length} lettre${trouvees().length > 1 ? 's' : ''} trouvée`
                    + `${trouvees().length > 1 ? 's' : ''}.`
                : 'Choisis une lettre.';
        }
    }

    function jouer(lettre) {
        if (fini || destroyed || session.locked || essayees.includes(lettre)) return;
        essayees.push(lettre);
        if (!item.meta.mot.includes(lettre)) erreurs++;
        peindre();
        if (gagne()) { finir(true); return; }
        if (erreurs >= item.meta.erreursMax) finir(false);
    }

    function finir(estGagne) {
        fini = true;
        peindre();
        const st = container.querySelector('.pd-statut');
        if (st) {
            st.textContent = estGagne
                ? `Trouvé : ${item.meta.mot}.`
                : `C'était ${item.meta.mot} — ${item.meta.definition}`;
        }
        const haut = container.querySelector('.pd-haut');
        if (haut) haut.classList.add(estGagne ? 'pd-haut--ok' : 'pd-haut--rate');
        // ON ENVOIE LE MOT QUAND IL EST TROUVÉ, et ce qu'on voyait encore
        // sinon — qui ne peut pas être le mot, puisqu'il manque une lettre.
        const result = session.submit(estGagne
            ? item.meta.mot
            : [...item.meta.mot].map(c => (essayees.includes(c) ? c : '·')).join(''));
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot joue le mot, lettre par lettre, en se trompant deux fois. */
    async function runDemo() {
        peindre();
        const ordre = [...item.meta.lettres];
        // Deux fausses pistes, pour que le dessin se montre.
        const fausses = ALPHABET.filter(c => !item.meta.mot.includes(c)).slice(0, 2);
        const suite = [ordre[0], fausses[0], ordre[1], fausses[1], ...ordre.slice(2)];
        for (const c of suite) {
            if (destroyed) return;
            if (!c) continue;
            essayees.push(c);
            if (!item.meta.mot.includes(c)) erreurs++;
            peindre();
            await new Promise(r => regTimeout(r, 520));
        }
        if (!destroyed) regTimeout(renderNext, 1100);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (auClavier) document.removeEventListener('keydown', auClavier);
            container.innerHTML = '';
            session.finish();
        }
    };
}
