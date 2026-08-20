// POSER UNE ADDITION (OU UNE SOUSTRACTION) DE FRACTIONS.
//
// Rémy, après avoir essayé les bandes : « je ne suis pas convaincu par les
// bandes pour les fractions, on va proposer l'addition de fraction sans
// support visuel, car on peut tomber sur des choses incohérentes ». Il a
// raison : passé une vingtaine de parts, le dessin devient une hachure — une
// image qui cesse de montrer au moment où le calcul devient difficile n'aide
// personne. L'addition se POSE donc, exactement comme au cahier, et c'est lui
// qui a écrit le modèle :
//
//     3/4 + 5/3 =                  ← on cherche le dénominateur
//     3×… / 4×…  +  5×… / 3×…      ← par quoi multiplier chaque fraction
//     … / 12     +  … / 12         ← les deux fractions converties
//     { … + … } / 12 = … / 12      ← et on calcule
//
// CHAQUE LIGNE EST UNE ÉTAPE, ET ELLES SE VALIDENT DANS L'ORDRE. Une ligne
// juste se verrouille et la suivante s'ouvre : l'élève ne peut pas construire
// la fin sur un dénominateur faux, et l'on sait exactement OÙ il s'est arrêté.
//
// L'AIDE, C'EST LA TABLE DE PYTHAGORE. « On peut lui montrer la table de
// Pythagore, ou on fait clignoter les lignes et colonnes des dénominateurs. »
// La ligne des 4 et la ligne des 3 se rencontrent en 12, 24, 36 : le premier
// rendez-vous est le dénominateur commun. C'est un dessin qui ne se dégrade
// jamais — et c'est pour lui que les dénominateurs restent entre 2 et 10.
//
// « Pas besoin de simplifier dans un premier temps » : la dernière ligne est
// le résultat BRUT. Le réglage « Simplifier » ajoute la ligne quand on veut.
//
// (Préfixe `fa-` et non `fp-` : `fp-` appartient déjà à l'aperçu des fiches
// imprimées, où `.fp-ligne` est une ligne de réglure — en position absolue.
// Toutes les lignes du calcul se posaient donc au même endroit.)

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { multiplesCommuns } from '../fractionsEquivalentes.js';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/** Une fraction en colonne — jamais de barre oblique, c'est l'écriture du cours. */
const colonne = (n, d, cls = '') =>
    `<span class="fa-frac ${cls}"><span class="fa-num">${n}</span>`
    + `<span class="fa-den">${d}</span></span>`;

const caseHtml = (nom, libelle) =>
    `<button type="button" class="fa-case" data-case="${nom}"
        aria-label="${libelle}"><span class="fa-val"></span></button>`;

// LE DÉNOMINATEUR COMMUN NE S'ÉCRIT PAS AVANT D'ÊTRE TROUVÉ.
//
// Les lignes suivantes sont visibles en pâle — on doit voir où l'on va —, mais
// elles portaient le dénominateur commun tout écrit : il suffisait de le lire
// deux lignes plus bas pour répondre à la première question. Elles affichent
// donc « ? » jusqu'à ce que la ligne du dessus soit validée.
const COMMUN_CACHE = '<span class="fa-commun-vu" data-commun>?</span>';

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let gate = null;

    let item = null;
    let calcul = null;
    let lignes = [];          // [{ nom, cases: [noms], el }]
    let ligneActive = 0;
    let cases = {};           // nom → { el, attendu }
    let valeurs = {};
    let choisie = null;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        render();
    }

    // --- La partition du calcul ---------------------------------------------

    /**
     * Les lignes du calcul posé, dans l'ordre où on les écrit.
     *
     * La ligne « facteurs » demande DEUX fois le même nombre par fraction —
     * en haut et en bas. C'est voulu : la règle entière tient dans cette
     * répétition, et un élève qui multiplie le dénominateur en oubliant le
     * numérateur ne se trompe pas de calcul, il se trompe de règle.
     */
    function partition(c) {
        const op = c.signe === '−' ? '−' : '+';
        const l = [];

        l.push({
            nom: 'commun',
            titre: 'Le dénominateur commun',
            attendu: { commun: c.commun },
            html: `<div class="fa-ligne-commun">
                <span>Dénominateur commun&nbsp;:</span>
                ${caseHtml('commun', 'dénominateur commun')}
                <button type="button" class="fa-aide-ppcm" data-table>
                    🔢 Voir la table de Pythagore</button>
            </div>`
        });

        // Une seule fraction bouge quand un dénominateur est multiple de
        // l'autre : on demande quand même le « × 1 », parce que c'est en
        // l'écrivant qu'on comprend qu'il ne change rien.
        l.push({
            nom: 'facteurs',
            titre: 'Par quoi multiplier',
            attendu: { fan: c.ka, fad: c.ka, fbn: c.kb, fbd: c.kb },
            html: `<div class="fa-ligne-calc">
                ${colonne(`${c.a.n} × ${caseHtml('fan', 'facteur du numérateur de la première')}`,
        `${c.a.d} × ${caseHtml('fad', 'facteur du dénominateur de la première')}`)}
                <span class="fa-op">${op}</span>
                ${colonne(`${c.b.n} × ${caseHtml('fbn', 'facteur du numérateur de la seconde')}`,
        `${c.b.d} × ${caseHtml('fbd', 'facteur du dénominateur de la seconde')}`)}
            </div>`
        });

        l.push({
            nom: 'converties',
            titre: 'Les deux fractions au même dénominateur',
            attendu: { na: c.aReduit.n, nb: c.bReduit.n },
            html: `<div class="fa-ligne-calc">
                ${colonne(caseHtml('na', 'numérateur de la première convertie'), COMMUN_CACHE)}
                <span class="fa-op">${op}</span>
                ${colonne(caseHtml('nb', 'numérateur de la seconde convertie'), COMMUN_CACHE)}
                <span class="fa-op">=</span>
            </div>`
        });

        l.push({
            nom: 'calcul',
            titre: 'On calcule',
            attendu: { ra: c.aReduit.n, rb: c.bReduit.n, res: c.brut.n },
            html: `<div class="fa-ligne-calc">
                ${colonne(`<span class="fa-accolade">{</span>${caseHtml('ra', 'premier numérateur')}`
        + `<span class="fa-op fa-op--mini">${op}</span>${caseHtml('rb', 'second numérateur')}`
        + '<span class="fa-accolade">}</span>', COMMUN_CACHE)}
                <span class="fa-op">=</span>
                ${colonne(caseHtml('res', 'résultat'), COMMUN_CACHE)}
            </div>`
        });

        if (c.simplifie) {
            l.push({
                nom: 'simplifiee',
                titre: 'On simplifie',
                attendu: { sn: c.reduit.n, sd: c.reduit.d },
                html: `<div class="fa-ligne-calc">
                    <span class="fa-op">=</span>
                    ${colonne(caseHtml('sn', 'numérateur simplifié'),
        caseHtml('sd', 'dénominateur simplifié'))}
                </div>`
            });
        }
        return l;
    }

    // --- Rendu ---------------------------------------------------------------

    function render() {
        const m = item.meta || {};
        calcul = m.calcul;
        cases = {}; valeurs = {}; choisie = null; ligneActive = 0;
        if (!calcul) { container.innerHTML = item.prompt.html; return; }

        const parts = partition(calcul);
        const op = calcul.signe === '−' ? '−' : '+';

        container.innerHTML = `
            <div class="fa-ecran"><div class="fa-layout">
                <div class="fa-scene">
                    ${m.enonce ? `<p class="fa-enonce">${m.enonce}</p>` : ''}
                    <div class="fa-depart">
                        ${colonne(calcul.a.n, calcul.a.d)}
                        <span class="fa-op">${op}</span>
                        ${colonne(calcul.b.n, calcul.b.d)}
                        <span class="fa-op">=</span>
                    </div>
                    <div class="fa-lignes" data-lignes>
                        ${parts.map((p, i) => `
                            <div class="fa-ligne ${i ? 'fa-ligne--attente' : ''}" data-ligne="${p.nom}">
                                <span class="fa-etiquette">${p.titre}</span>
                                ${p.html}
                            </div>`).join('')}
                    </div>
                    <div class="fa-table" data-table-boite hidden></div>
                </div>
                <div class="fa-panneau">
                    <div class="fa-pave" role="group" aria-label="Chiffres">
                        ${DIGITS.map(k => `<button type="button" class="fa-touche"
                            data-touche="${k}">${k}</button>`).join('')}
                        <button type="button" class="fa-touche fa-touche--del" data-touche="←"
                            aria-label="Effacer">⌫</button>
                        <button type="button" class="fa-touche fa-touche--ok"
                            data-valider disabled>Valider</button>
                    </div>
                    <div class="fa-note" data-note aria-live="polite"></div>
                    ${hintBar(session)}
                </div>
            </div></div>`;

        lignes = parts.map(p => ({
            ...p,
            el: container.querySelector(`[data-ligne="${p.nom}"]`),
            noms: Object.keys(p.attendu)
        }));
        container.querySelectorAll('[data-case]').forEach(el => {
            const nom = el.dataset.case;
            const ligne = lignes.find(l => l.noms.includes(nom));
            cases[nom] = { el, attendu: ligne.attendu[nom] };
            valeurs[nom] = '';
            el.onclick = () => { if (!session.locked) selectionner(nom); };
        });
        selectionner(lignes[0].noms[0]);
        marquerActive();
        majValider();

        const bouton = container.querySelector('[data-table]');
        if (bouton) bouton.onclick = () => basculerTable();

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }

        wireHint(container, session);
        container.querySelectorAll('[data-touche]').forEach(btn => {
            btn.onclick = () => taper(btn.dataset.touche);
        });
        container.querySelector('[data-valider]').onclick = validerLigne;

        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(e.key)) { taper(e.key); e.preventDefault(); }
            else if (e.key === 'Backspace') { taper('←'); e.preventDefault(); }
            else if (e.key === 'Tab') { selectionner(suivante(choisie)); e.preventDefault(); }
            else if (e.key === 'Enter') { validerLigne(); e.preventDefault(); }
        };
    }

    // --- Saisie --------------------------------------------------------------

    const ligneDe = (nom) => lignes.find(l => l.noms.includes(nom));

    function selectionner(nom) {
        // On ne quitte pas sa ligne : c'est elle qui est en train de s'écrire.
        if (ligneDe(nom) !== lignes[ligneActive]) return;
        choisie = nom;
        Object.entries(cases).forEach(([k, c]) =>
            c.el.classList.toggle('fa-case--active', k === nom));
    }

    function suivante(nom) {
        const noms = lignes[ligneActive].noms;
        const i = noms.indexOf(nom);
        const apres = [...noms.slice(i + 1), ...noms.slice(0, i)];
        return apres.find(n => !valeurs[n]) || apres[0] || nom;
    }

    function poser(nom, texte) {
        valeurs[nom] = texte;
        const c = cases[nom];
        if (!c) return;
        c.el.querySelector('.fa-val').textContent = texte;
        c.el.classList.toggle('fa-case--pleine', texte !== '');
        c.el.classList.remove('fa-case--faux');
        majValider();
    }

    function taper(k) {
        if (session.locked || !choisie) return;
        const actuel = valeurs[choisie] || '';
        if (k === '←') poser(choisie, actuel.slice(0, -1));
        else if (actuel.length < 3) poser(choisie, actuel + k);
    }

    function majValider() {
        const btn = container.querySelector('[data-valider]');
        if (!btn || !lignes.length) return;
        btn.disabled = lignes[ligneActive].noms.some(n => !valeurs[n]);
    }

    // --- Validation, ligne par ligne -----------------------------------------

    function validerLigne() {
        if (destroyed || session.locked) return;
        const ligne = lignes[ligneActive];
        if (!ligne || ligne.noms.some(n => !valeurs[n])) return;

        const justes = {};
        ligne.noms.forEach(n => {
            justes[n] = String(valeurs[n]) === String(cases[n].attendu);
            cases[n].el.classList.toggle('fa-case--faux', !justes[n]);
        });
        const toutJuste = ligne.noms.every(n => justes[n]);
        const note = container.querySelector('[data-note]');

        // SEULE LA DERNIÈRE LIGNE COMPTE POUR LA SESSION. Les précédentes sont
        // l'écriture du raisonnement : on les corrige sur place, on ne les note
        // pas — sinon une question vaudrait quatre points de statistiques et
        // le carnet d'erreurs parlerait de « facteurs » sans dire de quel
        // calcul.
        const derniere = ligneActive === lignes.length - 1;
        if (!derniere) {
            if (toutJuste) {
                ligne.el.classList.add('fa-ligne--faite');
                ligne.noms.forEach(n => cases[n].el.classList.add('fa-case--juste'));
                if (ligne.nom === 'commun') revelerCommun();
                if (note) note.textContent = '';
                ouvrirSuivante();
            } else if (note) {
                note.textContent = diagnostic(ligne, justes);
                secouer(ligne.el);
            }
            return;
        }

        const donnee = `${valeurs.res !== undefined ? valeurs.res : valeurs.sn}/`
            + `${calcul.simplifie ? valeurs.sd : calcul.commun}`;
        const result = session.submit(donnee, { element: ligne.el });
        if (result.ignored) return;
        if (note) note.textContent = result.correct ? '' : diagnostic(ligne, justes);
        if (result.correct) {
            ligne.el.classList.add('fa-ligne--faite');
            ligne.noms.forEach(n => cases[n].el.classList.add('fa-case--juste'));
        }

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) return renderNext();
            if (result.revealed) {
                revelerCommun();
                ligne.noms.forEach(n => {
                    poser(n, String(cases[n].attendu));
                    cases[n].el.classList.add('fa-case--juste');
                    cases[n].el.classList.remove('fa-case--faux');
                });
                ligne.el.classList.add('fa-ligne--faite');
                if (note) note.textContent = '';
                regTimeout(renderNext, 2400);
            } else {
                ligne.noms.forEach(n => { if (!justes[n]) poser(n, ''); });
                const premier = ligne.noms.find(n => !justes[n]);
                if (premier) selectionner(premier);
            }
        });
    }

    /** Le dénominateur commun trouvé s'écrit alors dans tout le calcul. */
    function revelerCommun() {
        container.querySelectorAll('[data-commun]').forEach(el => {
            el.textContent = String(calcul.commun);
            el.classList.add('fa-commun-vu--su');
        });
    }

    /** La ligne qu'on est en train d'écrire porte une marque : on doit savoir
     *  où l'on est sans compter les lignes vertes. */
    function marquerActive() {
        lignes.forEach((l, i) => l.el.classList.toggle('fa-ligne--active', i === ligneActive));
    }

    function ouvrirSuivante() {
        ligneActive++;
        const ligne = lignes[ligneActive];
        if (!ligne) { marquerActive(); return; }
        ligne.el.classList.remove('fa-ligne--attente');
        marquerActive();
        selectionner(ligne.noms[0]);
        majValider();
        // La ligne qui s'ouvre doit être VISIBLE : sur un téléphone, le calcul
        // descend plus bas que l'écran au fil des étapes.
        ligne.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /** Ce qui ne va pas, dit dans les termes de la ligne — jamais « faux ». */
    function diagnostic(ligne, justes) {
        const c = calcul;
        if (ligne.nom === 'commun') {
            const v = Number(valeurs.commun);
            if (Number.isFinite(v) && v > 0 && v % c.a.d === 0 && v % c.b.d === 0) {
                return `${v} conviendrait, mais ce n'est pas le PLUS PETIT : `
                    + `${c.commun} est déjà dans les deux tables.`;
            }
            if (Number.isFinite(v) && v === c.a.d + c.b.d) {
                return 'On n\'ADDITIONNE pas les dénominateurs : on cherche un nombre qui soit '
                    + `à la fois dans la table de ${c.a.d} et dans celle de ${c.b.d}.`;
            }
            return `Cherche un nombre qui soit à la fois dans la table de ${c.a.d} et dans `
                + `celle de ${c.b.d} — la table de Pythagore le montre d'un coup d'œil.`;
        }
        if (ligne.nom === 'facteurs') {
            const memeHaut = valeurs.fan === valeurs.fad && valeurs.fbn === valeurs.fbd;
            if (!memeHaut) {
                return 'En haut et en bas, c\'est le MÊME facteur : c\'est justement ce qui fait '
                    + 'que la fraction ne change pas de valeur.';
            }
            const quel = justes.fan ? c.b : c.a;
            const k = justes.fan ? c.kb : c.ka;
            return `${quel.d} × ${k} = ${c.commun} : c'est ce facteur-là qu'il faut écrire.`;
        }
        if (ligne.nom === 'converties') {
            const quel = justes.na ? [c.b, c.kb, c.bReduit] : [c.a, c.ka, c.aReduit];
            return `${quel[0].n} × ${quel[1]} = ${quel[2].n}. Le numérateur se multiplie par le `
                + 'même facteur que le dénominateur.';
        }
        if (ligne.nom === 'calcul') {
            if (!justes.ra || !justes.rb) return 'Recopie les deux numérateurs de la ligne du dessus.';
            return `Le dénominateur ne bouge plus : ${c.aReduit.n} ${c.signe} ${c.bReduit.n} = `
                + `${c.brut.n}, sur ${c.commun}.`;
        }
        return `${c.brut.n} et ${c.brut.d} ont un diviseur commun : la fraction se simplifie.`;
    }

    function secouer(el) {
        el.classList.remove('fa-ligne--non');
        void el.offsetWidth;
        el.classList.add('fa-ligne--non');
    }

    // --- LA TABLE DE PYTHAGORE ------------------------------------------------
    //
    // Elle ne donne pas la réponse : elle allume la ligne ET la colonne de
    // chaque dénominateur, et cercle les nombres qui se trouvent dans les deux.
    // Le plus petit de ces rendez-vous est le dénominateur commun — l'élève le
    // lit, il ne le reçoit pas.

    function basculerTable() {
        const boite = container.querySelector('[data-table-boite]');
        if (!boite) return;
        if (!boite.hidden) { boite.hidden = true; boite.innerHTML = ''; return; }
        boite.innerHTML = tableHtml(calcul.a.d, calcul.b.d);
        boite.hidden = false;
        boite.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function tableHtml(a, b) {
        const info = multiplesCommuns(a, b);
        const communs = new Set(info.communs);
        let corps = '<tr><th></th>';
        for (let c = 1; c <= info.taille; c++) corps += `<th>${c}</th>`;
        corps += '</tr>';
        for (let l = 1; l <= info.taille; l++) {
            const surA = l === a, surB = l === b;
            corps += `<tr class="${surA ? 'fa-lig-a' : ''}${surB ? ' fa-lig-b' : ''}">`
                + `<th class="${surA ? 'fa-lig-a' : ''}${surB ? ' fa-lig-b' : ''}">${l}</th>`;
            for (let c = 1; c <= info.taille; c++) {
                const v = l * c;
                const dansA = surA || c === a;
                const dansB = surB || c === b;
                const rdv = (dansA || dansB) && communs.has(v);
                const classes = [
                    dansA ? 'fa-c-a' : '', dansB ? 'fa-c-b' : '',
                    rdv ? 'fa-c-rdv' : '', rdv && v === info.ppcm ? 'fa-c-ppcm' : ''
                ].filter(Boolean).join(' ');
                corps += `<td class="${classes}">${v}</td>`;
            }
            corps += '</tr>';
        }
        return `<p class="fa-table-mot">La ligne (et la colonne) du <b>${a}</b> et celles du
                <b>${b}</b> sont allumées. Les nombres <b>cerclés</b> sont dans les deux tables :
                le plus petit est le dénominateur commun.</p>
            <div class="fa-table-boite"><table class="fa-pytha">${corps}</table></div>`;
    }

    // --- Le robot -------------------------------------------------------------

    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const scene = container.querySelector('.fa-scene');
        cursor.say('On ne peut additionner que des parts de MÊME taille. Je commence donc par '
            + 'chercher un dénominateur commun.', scene || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        const dits = {
            commun: `${calcul.commun} est à la fois dans la table de ${calcul.a.d} et dans celle `
                + `de ${calcul.b.d} — et c'est le plus petit.`,
            facteurs: `${calcul.a.d} × ${calcul.ka} = ${calcul.commun}, et `
                + `${calcul.b.d} × ${calcul.kb} = ${calcul.commun}. En haut, le MÊME facteur.`,
            converties: `Les numérateurs suivent : ${calcul.aReduit.n} et ${calcul.bReduit.n}.`,
            calcul: `Maintenant les parts ont la même taille : ${calcul.aReduit.n} `
                + `${calcul.signe} ${calcul.bReduit.n} = ${calcul.brut.n}, sur ${calcul.commun}.`,
            simplifiee: `${calcul.brut.n}/${calcul.brut.d} se simplifie en `
                + `${calcul.reduit.n}/${calcul.reduit.d}.`
        };

        for (const ligne of lignes) {
            if (!await gate.waitTurn() || destroyed) return;
            cursor.say(dits[ligne.nom] || '', ligne.el);
            if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
            for (const nom of ligne.noms) {
                const c = cases[nom];
                selectionner(nom);
                if (!await cursor.tap(c.el, 300) || destroyed) return;
                const cible = String(c.attendu);
                for (let i = 0; i < cible.length; i++) {
                    poser(nom, cible.slice(0, i + 1));
                    if (!await cursor.pause(170) || destroyed) return;
                }
                c.el.classList.add('fa-case--juste');
            }
            ligne.el.classList.add('fa-ligne--faite');
            if (ligne.nom === 'commun') revelerCommun();
            if (ligne !== lignes[lignes.length - 1]) ouvrirSuivante();
            if (!await cursor.pause(260) || destroyed) return;
        }

        if (!await gate.waitTurn() || destroyed) return;
        cursor.say(item.explanation || 'Et voilà le calcul posé en entier.', scene || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    if (opts.item) { item = opts.item; render(); } else renderNext();

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
