// LES BANDES DE FRACTIONS — « comment rendre cela visuel ? »
//
// Rémy pose la question à propos de l'addition progressive, et c'est la bonne :
// une règle sur les dénominateurs ne s'apprend pas, elle se récite. Ce qui
// s'apprend, c'est l'image qui la rend inévitable.
//
// L'IMAGE : DEUX BANDES DE MÊME LONGUEUR.
//
// Une fraction est une LONGUEUR, pas un couple de nombres. Un tiers et un
// sixième ne s'additionnent pas parce que les morceaux n'ont pas la même
// taille — on le voit, on n'a pas à le croire. Et quand on RECOUPE la bande
// des tiers en six, les anciens traits restent exactement où ils étaient : le
// trait de coupe change, la longueur non. C'est toute la règle, en une image.
//
// D'où le geste central de l'écran : L'ÉLÈVE TAPE UN DÉNOMINATEUR COMMUN ET
// LES BANDES SE RECOUPENT SOUS SES YEUX. S'il propose 5 pour des tiers et des
// quarts, les nouveaux traits ne tombent sur aucun ancien, et ils s'affichent
// en rouge : la bande lui dit non avant que l'écran n'ait rien à corriger.
// S'il propose 12, tout s'aligne. C'est la réponse à la question de Rémy.
//
// Deux exercices se partagent cet écran (`opts.variante`) :
//   'egalite' — compléter 3/2 = 33/… : une seule case, et les deux bandes
//               montrent que la longueur ne bouge pas ;
//   'somme'   — additionner par marches : toutes les cases du calcul sont
//               posées d'un coup, et une seule validation les juge une par une.
//
// « TOUJOURS DES FRACTIONS EN COLONNES » : numérateur sur dénominateur,
// séparés d'un trait, partout — y compris dans les cases à remplir.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { recoupage } from '../fractionsEquivalentes.js';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// --- Le dessin d'une bande ---------------------------------------------------

// Coordonnées internes d'UNE unité. La bande entière fait `unites` fois cette
// largeur : c'est ce qui fait que 3/2 se dessine plus long que 1/2, et que deux
// fractions égales se dessinent rigoureusement de la même longueur.
const UNITE = 120;
const HAUT = 34;

// QUAND LES TRAITS SE SERRENT.
//
// Deux seuils, parce qu'il y a deux problèmes. Vers vingt traits, une coupe
// pleine épaisseur devient un peigne noir : on l'affine, et la bande se relit.
// Vers soixante — 13/9 = 65/45, quatre-vingt-dix traits sur la largeur d'un
// téléphone —, plus rien ne se distingue : on ne dessine alors que les
// frontières d'unité, et on le DIT. Mieux vaut une bande qui s'assume
// incomplète qu'un aplat gris qui prétend montrer quelque chose.
const TRAITS_FINS = 20;
const TRAITS_LISIBLES = 60;
export const tropDeTraits = (parts, unites = 1) => parts * unites > TRAITS_LISIBLES;

/**
 * Une bande coupée en `parts` par unité, dont `pleines` sont coloriées.
 *
 * @param {Object} o
 * @param {number} o.parts    - découpage actuel (0 = pas encore coupée)
 * @param {number} o.pleines  - nombre de parts coloriées
 * @param {number} [o.unites] - nombre d'unités (une fraction impropre en occupe plusieurs)
 * @param {number[]} [o.nouveaux] - traits AJOUTÉS par un recoupage, en fraction d'unité
 * @param {number[]} [o.faux]     - traits proposés qui ne tombent pas juste
 * @param {string} [o.teinte]     - classe de couleur du remplissage
 */
function bandeSvg(o) {
    const unites = Math.max(1, o.unites || 1);
    const L = UNITE * unites;
    const parts = o.parts > 0 ? o.parts : 0;
    const pleines = Math.max(0, Math.min(o.pleines ?? 0, parts * unites));
    const pas = parts > 0 ? UNITE / parts : 0;

    let dedans = '';
    if (parts > 0 && pleines > 0) {
        dedans += `<rect class="fb-plein ${o.teinte || ''}" x="0" y="0"
            width="${(pleines * pas).toFixed(3)}" height="${HAUT}" />`;
    }
    // Les traits de coupe actuels. Une frontière d'unité est plus épaisse :
    // c'est elle qui dit « ici, une bande entière est passée ».
    //
    // `sansCoupes` garde la LONGUEUR et le coloriage mais tait le découpage :
    // c'est la bande mystère de l'égalité. Sans cela, il suffirait de compter
    // les traits pour répondre — et l'exercice deviendrait un exercice de
    // comptage. Les frontières d'unité, elles, restent : une bande qui dépasse
    // l'unité se voit de toute façon.
    const total = parts + (o.nouveaux || []).length;
    const serre = tropDeTraits(total, unites);
    const fines = total * unites > TRAITS_FINS ? ' fb-coupe--fine' : '';
    if (parts > 0) {
        for (let i = 1; i < parts * unites; i++) {
            const entiere = i % parts === 0;
            if ((o.sansCoupes || serre) && !entiere) continue;
            const x = (i * pas).toFixed(3);
            dedans += `<line class="fb-coupe${entiere ? ' fb-coupe--unite' : ''}${fines}"
                x1="${x}" y1="0" x2="${x}" y2="${HAUT}" />`;
        }
    }
    // Les traits qui DISPARAISSENT quand on simplifie : en gris pâle, pour
    // qu'on voie qu'ils ont existé et que la longueur, elle, n'a pas bougé.
    (o.fantomes || []).forEach(f => {
        for (let u = 0; u < unites; u++) {
            const x = ((u + f) * UNITE).toFixed(3);
            dedans += `<line class="fb-fantome" x1="${x}" y1="0" x2="${x}" y2="${HAUT}" />`;
        }
    });
    // Les traits que le recoupage AJOUTE : ils arrivent en fondu, entre les
    // anciens, et c'est ce mouvement qui montre que la longueur ne bouge pas.
    (serre ? [] : (o.nouveaux || [])).forEach((f, k) => {
        for (let u = 0; u < unites; u++) {
            const x = ((u + f) * UNITE).toFixed(3);
            dedans += `<line class="fb-neuve${fines}" style="--fb-retard:${(k * 45)}ms"
                x1="${x}" y1="0" x2="${x}" y2="${HAUT}" />`;
        }
    });
    // Les traits d'une proposition qui ne tombe pas juste : en rouge, et ils
    // ne s'alignent visiblement sur rien.
    (o.faux || []).forEach(f => {
        for (let u = 0; u < unites; u++) {
            const x = ((u + f) * UNITE).toFixed(3);
            dedans += `<line class="fb-faux" x1="${x}" y1="-3" x2="${x}" y2="${HAUT + 3}" />`;
        }
    });

    return `<svg class="fb-bande" viewBox="-2 -5 ${L + 4} ${HAUT + 10}"
        preserveAspectRatio="none" role="img" aria-label="${etiquetteAlt(o, unites)}">
        ${dedans}
        <rect class="fb-cadre" x="0" y="0" width="${L}" height="${HAUT}" />
    </svg>`;
}

function etiquetteAlt(o, unites) {
    if (!o.parts) return 'bande non coupée';
    return `bande coupée en ${o.parts} par unité, ${o.pleines} parts coloriées`
        + (unites > 1 ? `, sur ${unites} unités` : '');
}

/**
 * Les traits qu'un dénominateur proposé ajoute — ou qui tombent à côté.
 *
 * Un nombre PLUS PETIT que le découpage actuel est traité comme les autres :
 * il ne peut évidemment pas convenir, mais l'élève qui tape 5 pour des
 * sixièmes doit VOIR pourquoi, pas lire un message. Les traits rouges se
 * posent au milieu de nulle part, et c'est la réponse.
 */
function traitsProposes(dActuel, propose) {
    if (!propose || propose < 2 || propose > 60 || propose === dActuel) {
        return { nouveaux: [], faux: [] };
    }
    if (propose % dActuel === 0) return { nouveaux: recoupage(dActuel, propose).nouveaux, faux: [] };
    // Ne tombe pas juste : on montre TOUS les traits proposés, et l'œil voit
    // qu'aucun ne rencontre les anciens.
    const faux = [];
    for (let i = 1; i < propose; i++) {
        const x = i / propose;
        if (Math.abs(x * dActuel - Math.round(x * dActuel)) > 1e-9) faux.push(x);
    }
    return { nouveaux: [], faux };
}

// --- Petites briques d'écriture ---------------------------------------------

/** Ce que le robot dit d'une fraction qu'il convertit — ou qu'il n'a pas à convertir. */
const dire = (f, k, reduit, commun) => (k === 1
    ? `${f.n}/${f.d} est déjà en ${commun}èmes : je recopie ${f.n}.`
    : `${f.d} × ${k} = ${commun}, donc ${f.n} × ${k} = ${reduit.n}.`);

const colonne = (n, d, cls = '') =>
    `<span class="fraction fb-frac ${cls}"><span class="fraction-num">${n}</span>`
    + `<span class="fraction-den">${d}</span></span>`;

/** Une case à remplir, dans une fraction en colonne. */
const caseHtml = (nom, libelle) =>
    `<button type="button" class="fb-case" data-case="${nom}"
        aria-label="${libelle}"><span class="fb-case-val"></span></button>`;

export function mount(container, session, opts = {}) {
    const variante = opts.variante === 'somme' ? 'somme' : 'egalite';
    let destroyed = false;
    let cursor = null;
    let gate = null;
    // Les cases de la question en cours : nom → { attendu, el }.
    let cases = {};
    let choisie = null;
    let valeurs = {};

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    // --- Les cases ----------------------------------------------------------

    function poser(nom, texte) {
        valeurs[nom] = texte;
        const c = cases[nom];
        if (!c) return;
        c.el.querySelector('.fb-case-val').textContent = texte;
        c.el.classList.toggle('fb-case--pleine', texte !== '');
        c.el.classList.remove('fb-case--juste', 'fb-case--faux');
        surSaisie(nom, texte);
        majValider();
    }

    function selectionner(nom) {
        choisie = nom;
        Object.entries(cases).forEach(([k, c]) => c.el.classList.toggle('fb-case--active', k === nom));
    }

    /** La case suivante encore vide, sinon la suivante tout court. */
    function suivante(nom) {
        const noms = Object.keys(cases);
        const i = noms.indexOf(nom);
        const apres = [...noms.slice(i + 1), ...noms.slice(0, i)];
        return apres.find(n => !valeurs[n]) || apres[0] || nom;
    }

    function taper(k) {
        if (session.locked || !choisie) return;
        const actuel = valeurs[choisie] || '';
        if (k === '←') poser(choisie, actuel.slice(0, -1));
        else if (actuel.length < 3) poser(choisie, actuel + k);
    }

    function majValider() {
        const btn = container.querySelector('[data-valider]');
        if (btn) btn.disabled = Object.keys(cases).some(n => !valeurs[n]);
    }

    // Redessin en direct : posé par `render` selon la variante.
    let surSaisie = () => {};

    // --- Le rendu -----------------------------------------------------------

    function render(item) {
        cases = {};
        valeurs = {};
        choisie = null;
        surSaisie = () => {};

        const scene = variante === 'somme' ? sceneSomme(item) : sceneEgalite(item);

        // Le cadre extérieur ne sert qu'à MESURER (voir `.fb-ecran` en CSS) :
        // une requête de conteneur ne s'applique pas au conteneur lui-même.
        container.innerHTML = `
            <div class="fb-ecran"><div class="fb-layout fb-layout--${variante}">
                <div class="fb-scene">${scene.html}</div>
                <div class="fb-panneau">
                    <div class="fb-pave" role="group" aria-label="Chiffres">
                        ${DIGITS.map(k => `<button type="button" class="fb-touche"
                            data-touche="${k}">${k}</button>`).join('')}
                        <button type="button" class="fb-touche fb-touche--del" data-touche="←"
                            aria-label="Effacer">⌫</button>
                        <button type="button" class="fb-touche fb-touche--ok"
                            data-valider disabled>Valider</button>
                    </div>
                    <div class="fb-note" data-note aria-live="polite"></div>
                    ${hintBar(session)}
                </div>
            </div></div>`;

        container.querySelectorAll('[data-case]').forEach(el => {
            const nom = el.dataset.case;
            cases[nom] = { el, attendu: scene.attendu[nom] };
            valeurs[nom] = '';
            el.onclick = () => { if (!session.locked) selectionner(nom); };
        });
        selectionner(Object.keys(cases)[0]);
        majValider();
        surSaisie = scene.surSaisie || (() => {});
        // Les dénominateurs encore inconnus s'affichent en « ? » dès l'arrivée :
        // une fraction sans dénominateur ne se lit pas.
        surSaisie('c', '');

        if (session.isDemo) {
            if (!session.frozen) runDemo(item, scene);
            return;
        }

        wireHint(container, session);
        container.querySelectorAll('[data-touche]').forEach(btn => {
            btn.onclick = () => taper(btn.dataset.touche);
        });
        container.querySelector('[data-valider]').onclick = () => valider(item, scene);

        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(e.key)) { taper(e.key); e.preventDefault(); }
            else if (e.key === 'Backspace') { taper('←'); e.preventDefault(); }
            else if (e.key === 'Tab') { selectionner(suivante(choisie)); e.preventDefault(); }
            else if (e.key === 'Enter') {
                const btn = container.querySelector('[data-valider]');
                if (btn && !btn.disabled) valider(item, scene);
                e.preventDefault();
            }
        };
    }

    // --- La validation ------------------------------------------------------

    function valider(item, scene) {
        if (destroyed || session.locked) return;
        // CHAQUE CASE EST JUGÉE SÉPARÉMENT. Tout barrer d'un trait quand une
        // seule case cloche efface le fait que l'élève a trouvé le
        // dénominateur commun — et c'est justement là-dessus qu'il faut
        // s'appuyer pour lui montrer la suite.
        const justes = {};
        Object.entries(cases).forEach(([nom, c]) => {
            const bon = String(valeurs[nom]) === String(c.attendu);
            justes[nom] = bon;
            c.el.classList.toggle('fb-case--juste', bon);
            c.el.classList.toggle('fb-case--faux', !bon);
        });

        const donnee = scene.reponse(valeurs);
        const result = session.submit(donnee, { element: container.querySelector('.fb-scene') });
        if (result.ignored) return;

        const note = container.querySelector('[data-note]');
        if (note) note.textContent = result.correct ? '' : (scene.diagnostic(valeurs, justes) || '');
        if (result.correct && scene.reussi) scene.reussi();

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) return renderNext();
            if (result.revealed) {
                Object.entries(cases).forEach(([nom, c]) => {
                    poser(nom, String(c.attendu));
                    c.el.classList.add('fb-case--juste');
                    c.el.classList.remove('fb-case--faux');
                });
                if (scene.reussi) scene.reussi();
                if (note) note.textContent = '';
                regTimeout(renderNext, 2200);
            } else {
                // On efface SEULEMENT ce qui est faux : refaire taper une case
                // déjà juste, c'est demander de rejouer ce qu'on a réussi.
                Object.entries(justes).forEach(([nom, bon]) => { if (!bon) poser(nom, ''); });
                const premierFaux = Object.keys(cases).find(n => !justes[n]);
                if (premierFaux) selectionner(premierFaux);
            }
        });
    }

    // --- Variante « compléter l'égalité » -----------------------------------

    function sceneEgalite(item) {
        const e = (item.meta || {}).egalite;
        if (!e) return { html: item.prompt.html, attendu: {}, reponse: () => '', diagnostic: () => '' };

        // Les deux bandes ont la MÊME longueur et le MÊME coloriage : c'est ce
        // qu'affirme l'égalité, et c'est ce qu'on montre AVANT la réponse. Ce
        // qu'on cache, c'est la découpe de droite — sinon il n'y aurait plus
        // qu'à compter les traits.
        const unites = Math.max(1, Math.ceil(e.gauche.n / e.gauche.d));
        const gauche = bandeSvg({ parts: e.gauche.d, pleines: e.gauche.n, unites });
        const droiteCachee = bandeSvg({
            parts: e.droite.d, pleines: e.droite.n, unites, sansCoupes: true,
            teinte: 'fb-plein--voile'
        });

        // CE QU'ON MONTRE UNE FOIS LA RÉPONSE TROUVÉE, et c'est là que la règle
        // se démontre : en agrandissant, la bande de droite est celle de gauche
        // avec des traits EN PLUS ; en simplifiant, c'est la même avec des
        // traits EN MOINS. Dans les deux cas la longueur coloriée est identique
        // — on n'a fait que recouper.
        const agrandit = e.sens === 'agrandir';
        const fin = agrandit ? e.droite.d : e.gauche.d;
        const gros = agrandit ? e.gauche.d : e.droite.d;
        const ajoutes = recoupage(gros, fin).nouveaux;
        const droiteDevoilee = bandeSvg({
            parts: agrandit ? e.gauche.d : e.droite.d,
            pleines: agrandit ? e.gauche.n : e.droite.n,
            unites,
            nouveaux: agrandit ? ajoutes : [],
            fantomes: agrandit ? [] : ajoutes
        });

        const trou = e.trou === 'numerateur'
            ? colonne(caseHtml('x', 'numérateur manquant'), e.droite.d, 'fb-frac--trou')
            : colonne(e.droite.n, caseHtml('x', 'dénominateur manquant'), 'fb-frac--trou');

        const html = `
            <div class="fb-egalite">
                <div class="fb-bloc">
                    <div class="fb-bande-boite">${gauche}</div>
                    ${colonne(e.gauche.n, e.gauche.d)}
                </div>
                <div class="fb-signe">=</div>
                <div class="fb-bloc">
                    <div class="fb-bande-boite fb-bande-boite--mystere" data-mystere>
                        ${droiteCachee}
                        <div class="fb-voile" data-voile>
                            <span>même longueur…<br>mais coupée en combien&nbsp;?</span>
                        </div>
                    </div>
                    ${trou}
                </div>
            </div>
            <p class="fb-legende">La même longueur, coupée autrement : c'est la même fraction.</p>`;

        return {
            html,
            attendu: { x: e.reponse },
            reponse: (v) => v.x,
            reussi() {
                const boite = container.querySelector('[data-mystere]');
                if (!boite) return;
                boite.innerHTML = droiteDevoilee;
                boite.classList.add('fb-bande-boite--devoilee');
                const legende = container.querySelector('.fb-legende');
                if (legende) {
                    legende.textContent = tropDeTraits(fin, unites)
                        ? `${fin} parts, c'est trop fin pour se dessiner trait par trait — mais `
                            + `c'est bien la même longueur, coupée ${Math.round(fin / gros)} fois `
                            + 'plus finement.'
                        : agrandit
                        ? `Des traits en PLUS — ${e.gauche.d} devient ${e.droite.d} — et la `
                            + 'longueur coloriée n\'a pas bougé d\'un millimètre.'
                        : `Des traits en MOINS — ${e.gauche.d} devient ${e.droite.d} — et la `
                            + 'longueur coloriée n\'a pas bougé d\'un millimètre.';
                }
            },
            diagnostic(v) {
                const propose = Number(v.x);
                if (!Number.isFinite(propose)) return '';
                const vu = e.trou === 'numerateur' ? 'dénominateur' : 'numérateur';
                const depart = e.trou === 'numerateur' ? e.gauche.d : e.gauche.n;
                if (propose === depart) {
                    return `Tu as recopié le nombre de gauche. Le ${vu}, lui, a changé : `
                        + `regarde de combien.`;
                }
                if (e.sens === 'agrandir' && propose < depart) {
                    return 'La fraction de droite est écrite avec de PLUS GRANDS nombres : '
                        + 'on multiplie, on ne divise pas.';
                }
                return `Repars du ${vu} : il est écrit des deux côtés, c'est lui qui donne le facteur.`;
            },
            demo: [{ nom: 'x', dit: `Le ${e.trou === 'numerateur' ? 'dénominateur' : 'numérateur'} `
                + `passe de ${e.trou === 'numerateur' ? e.gauche.d : e.gauche.n} à ${e.visible} : `
                + `c'est × ${e.facteur}. Je fais pareil en dessous.` }]
        };
    }

    // --- Variante « addition progressive » ----------------------------------

    function sceneSomme(item) {
        const s = (item.meta || {}).somme;
        if (!s) return { html: item.prompt.html, attendu: {}, reponse: () => '', diagnostic: () => '' };

        const bandeA = bandeSvg({ parts: s.a.d, pleines: s.a.n });
        const bandeB = bandeSvg({ parts: s.b.d, pleines: s.b.n, teinte: 'fb-plein--b' });

        const attendu = { c: s.commun, na: s.aReduit.n, nb: s.bReduit.n, ns: s.brut.n };
        if (s.aSimplifiable) { attendu.rn = s.reduit.n; attendu.rd = s.reduit.d; }

        // LA PREMIÈRE MARCHE N'A RIEN À RECOUPER, et il ne faut surtout pas
        // lui dire le contraire : les deux bandes sont déjà coupées pareil,
        // c'est même toute la leçon de ce niveau-là. Une phrase d'accueil qui
        // annonce un problème inexistant apprend à ne pas la lire.
        const memeTaille = s.a.d === s.b.d;
        const depart = memeTaille
            ? 'Les parts ont déjà la même taille : elles se rassemblent telles quelles. '
                + 'Le découpage commun, c\'est celui qu\'elles ont déjà.'
            : 'Les parts n\'ont pas la même taille : on ne peut pas les rassembler. '
                + 'En combien faut-il recouper les deux bandes&nbsp;?';

        const html = `
            <div class="fb-bandes">
                <div class="fb-bloc">
                    <div class="fb-bande-boite" data-boite="a">${bandeA}</div>
                    ${colonne(s.a.n, s.a.d)}
                </div>
                <div class="fb-signe">+</div>
                <div class="fb-bloc">
                    <div class="fb-bande-boite" data-boite="b">${bandeB}</div>
                    ${colonne(s.b.n, s.b.d)}
                </div>
            </div>
            <p class="fb-legende" data-legende>${depart}</p>
            <div class="fb-calcul">
                <div class="fb-commun">
                    <span>Même découpage : en</span>
                    ${caseHtml('c', 'dénominateur commun')}
                    <span>parts</span>
                </div>
                <div class="fb-ligne">
                    ${colonne(caseHtml('na', 'nouveau numérateur de la première'),
                        '<span data-den="na"></span>', 'fb-frac--trou')}
                    <span class="fb-signe fb-signe--petit">+</span>
                    ${colonne(caseHtml('nb', 'nouveau numérateur de la seconde'),
                        '<span data-den="nb"></span>', 'fb-frac--trou')}
                    <span class="fb-signe fb-signe--petit">=</span>
                    ${colonne(caseHtml('ns', 'numérateur de la somme'),
                        '<span data-den="ns"></span>', 'fb-frac--trou')}
                    ${s.aSimplifiable ? `<span class="fb-signe fb-signe--petit">=</span>
                        ${colonne(caseHtml('rn', 'numérateur simplifié'),
                            caseHtml('rd', 'dénominateur simplifié'), 'fb-frac--trou')}` : ''}
                </div>
            </div>`;

        return {
            html,
            attendu,
            // LE DÉNOMINATEUR COMMUN TAPÉ RECOUPE LES BANDES SOUS LES YEUX.
            // C'est la réponse à « comment rendre cela visuel » : l'élève ne
            // vérifie pas sa proposition, il la VOIT tomber juste ou à côté.
            surSaisie(nom, texte) {
                if (nom !== 'c') return;
                const c = Number(texte);
                container.querySelectorAll('[data-den]').forEach(el => {
                    el.textContent = texte || '?';
                });
                const legende = container.querySelector('[data-legende]');
                let alignees = 0;
                [['a', s.a], ['b', s.b]].forEach(([quel, f]) => {
                    const boite = container.querySelector(`[data-boite="${quel}"]`);
                    if (!boite) return;
                    const { nouveaux, faux } = traitsProposes(f.d, c);
                    if (c && c % f.d === 0) alignees++;
                    boite.innerHTML = bandeSvg({
                        parts: f.d, pleines: f.n, nouveaux, faux,
                        teinte: quel === 'b' ? 'fb-plein--b' : ''
                    });
                });
                if (!legende) return;
                if (!c || c <= 1) {
                    legende.innerHTML = depart;
                } else if (memeTaille && c === s.commun) {
                    legende.textContent = 'Rien à recouper : les deux bandes ont déjà '
                        + `${c} parts. On additionne directement les parts coloriées.`;
                } else if (alignees === 2) {
                    legende.textContent = `Les traits tombent juste sur les deux bandes : `
                        + `${c} convient. Reste à compter les parts coloriées.`;
                } else if (alignees === 1) {
                    legende.textContent = 'Une bande se recoupe bien, l\'autre non : les traits '
                        + 'rouges ne rencontrent aucun trait existant.';
                } else {
                    legende.textContent = 'Aucun trait ne tombe juste : ce nombre n\'est un '
                        + 'multiple d\'aucun des deux dénominateurs.';
                }
            },
            reponse: (v) => (s.aSimplifiable ? `${v.rn}/${v.rd}` : `${v.ns}/${v.c}`),
            diagnostic(v, justes) {
                const c = Number(v.c);
                if (!justes.c) {
                    if (Number.isFinite(c) && c % s.a.d === 0 && c % s.b.d === 0) {
                        return `${c} marche, mais ce n'est pas le PLUS PETIT : `
                            + `${s.commun} suffit, et les nombres restent petits.`;
                    }
                    return `${s.commun} est le plus petit nombre qui soit à la fois dans la table `
                        + `de ${s.a.d} et dans celle de ${s.b.d}.`;
                }
                if (!justes.na || !justes.nb) {
                    const [f, k] = justes.na ? [s.b, s.kb] : [s.a, s.ka];
                    if (k === 1) {
                        return `${f.n}/${f.d} est DÉJÀ en ${s.commun}èmes : son numérateur ne `
                            + 'change pas.';
                    }
                    return 'Le numérateur se multiplie par le MÊME facteur que le dénominateur : '
                        + `${f.d} × ${k} = ${s.commun}, donc ${f.n} × ${k}.`;
                }
                if (!justes.ns) return 'On additionne les numérateurs, et seulement eux : '
                    + `${s.aReduit.n} + ${s.bReduit.n}. Le dénominateur ne bouge plus.`;
                return `${s.brut.n} et ${s.brut.d} ont un diviseur commun : la fraction se simplifie.`;
            },
            demo: [
                {
                    nom: 'c',
                    dit: memeTaille
                        ? `Elles sont déjà coupées pareil : le découpage commun, c'est ${s.commun}.`
                        : `Il faut le même découpage pour les deux : ${s.commun} parts.`
                },
                // « × 1 », ce n'est pas une explication, c'est une formule
                // récitée : quand une fraction est déjà au bon dénominateur,
                // le robot le dit comme on le dirait à voix haute.
                { nom: 'na', dit: dire(s.a, s.ka, s.aReduit, s.commun) },
                { nom: 'nb', dit: dire(s.b, s.kb, s.bReduit, s.commun) },
                { nom: 'ns', dit: `Maintenant les parts ont la même taille : ${s.aReduit.n} + ${s.bReduit.n} = ${s.brut.n}.` },
                ...(s.aSimplifiable ? [
                    { nom: 'rn', dit: `${s.brut.n}/${s.brut.d} se simplifie : ${s.reduit.n}/${s.reduit.d}.` },
                    { nom: 'rd', dit: '' }
                ] : [])
            ]
        };
    }

    // --- Le robot -----------------------------------------------------------

    /**
     * Le robot REMPLIT LES CASES EN DISANT POURQUOI. Le voir taper des chiffres
     * n'apprendrait que le geste ; c'est le raisonnement qu'on vient regarder.
     */
    async function runDemo(item, scene) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const sceneEl = container.querySelector('.fb-scene');
        cursor.say(variante === 'somme'
            ? 'Deux bandes de même longueur, coupées différemment : je commence par les recouper pareil.'
            : 'Les deux bandes font la même longueur. Je cherche en combien la seconde est coupée.',
            sceneEl || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        for (const pas of (scene.demo || [])) {
            const c = cases[pas.nom];
            if (!c) continue;
            if (!await gate.waitTurn() || destroyed) return;
            selectionner(pas.nom);
            if (pas.dit) {
                cursor.say(pas.dit, c.el);
                if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
            }
            if (!await cursor.tap(c.el, 380) || destroyed) return;
            const cible = String(c.attendu);
            for (let i = 0; i < cible.length; i++) {
                poser(pas.nom, cible.slice(0, i + 1));
                if (!await cursor.pause(200) || destroyed) return;
            }
            c.el.classList.add('fb-case--juste');
        }

        if (!await gate.waitTurn() || destroyed) return;
        if (scene.reussi) scene.reussi();
        cursor.say(item.explanation || 'Et voilà : la longueur n\'a pas bougé.',
            sceneEl || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    if (opts.item) render(opts.item); else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
            session.finish();
        }
    };
}
