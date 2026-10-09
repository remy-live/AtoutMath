// LE PAVÉ DE CHIFFRES DANS LA PAGE, pour les champs de saisie tactiles.
//
// Quatre exercices étaient INJOUABLES au doigt — Rémy, sur iPhone : « je ne
// peux taper les chiffres avec le clavier de l'iPhone » (Priorités), « on ne
// peut taper les chiffres » (Le Compte est Bon), « on ne peut taper le
// nombre » (Le Samouraï), « on ne peut écrire les chiffres » (Quelle heure
// est-il ?). Les champs portaient pourtant `inputmode="numeric"`.
//
// La raison est une règle d'iOS : le clavier système ne s'ouvre QUE sur une
// mise au point déclenchée par un geste de l'utilisateur, dans le même tour de
// boucle. Or ces champs-là apparaissent APRÈS coup — on clique une opération,
// le jeu se redessine, et le champ reçoit le focus depuis le code. iOS refuse
// alors d'ouvrir le clavier, et l'élève voit un curseur qui clignote sans
// pouvoir écrire dedans.
//
// On ne se bat pas contre cette règle : on apporte notre propre pavé. Il vit
// DANS la page, il ne masque rien, et il ne peut pas ne pas s'ouvrir.
//
// DEUX RANGÉES, et c'est la demande : « on pourrait avoir un clavier qui de
// base s'affiche en deux lignes ». Un pavé de téléphone en quatre rangées
// prend la moitié de la hauteur d'un écran de 662 points ; en deux rangées de
// cinq, il tient sous la question sans rien pousser dehors.

/** L'appareil répond-il au doigt ? Sur poste fixe, le vrai clavier suffit. */
export function auDoigt() {
    try {
        return (navigator.maxTouchPoints || 0) > 0
            || window.matchMedia('(pointer: coarse)').matches;
    } catch (e) { return false; }
}

const RANGEES = [['1', '2', '3', '4', '5'], ['6', '7', '8', '9', '0']];

const ICONE_EFF = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="M20 6H9.5L4 12l5.5 6H20a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/>
    <path d="m13 9.5 4 5M17 9.5l-4 5"/></svg>`;

/**
 * Pose un pavé de chiffres sous un conteneur, qui écrit dans le champ visé.
 *
 * @param {HTMLElement} hote      - où poser le pavé (il est ajouté à la fin)
 * @param {Object} opts
 * @param {() => HTMLInputElement|null} opts.champ - le champ à remplir, relu à
 *        chaque frappe : sur ces jeux, il est recréé à chaque redessin.
 * @param {() => void} [opts.valider] - ce que fait le bouton vert
 * @param {boolean} [opts.signe]   - ajoute la touche « − » (relatifs)
 * @param {boolean} [opts.virgule] - ajoute la touche « , » (décimaux)
 * @param {Array<{k:string,cls?:string,html?:string,aria?:string}>} [opts.touches]
 *        - touches PROPRES À UN JEU, insérées telles quelles dans la saisie.
 *        Pythagore en a besoin pour le petit deux : « il faut un pavé avec la
 *        touche ², pour que l'élève ait le réflexe de le mettre ». Une touche
 *        d'appoint qui écrit son propre caractère n'a rien de spécifique à un
 *        exercice — autant que tous les jeux puissent en demander.
 * @param {number} [opts.maxLong]  - nombre maximal de caractères saisis
 * @param {Element} [opts.avant]   - insérer AVANT ce nœud plutôt qu'à la fin :
 *        le pavé doit suivre la saisie, pas la barre d'indices.
 * @returns {{el: HTMLElement, detruire: () => void}}
 */
export function poserPaveTactile(hote, opts = {}) {
    const champ = opts.champ || (() => null);
    const maxLong = opts.maxLong || 6;

    const pave = document.createElement('div');
    pave.className = 'pav-tactile';
    // `aria-hidden` : le champ lui-même reste la cible des lecteurs d'écran,
    // et un clavier logiciel doublonnerait toutes ses touches à la lecture.
    pave.setAttribute('role', 'group');
    pave.setAttribute('aria-label', 'Pavé de chiffres');

    // DEUX RANGÉES DE MÊME LONGUEUR. Rémy, sur iPhone : « je trouve le clavier
    // inégal, 5 au-dessus et 7 boutons en dessous ». Les touches se partagent
    // la largeur de leur rangée (`flex: 1 1 0`), donc une rangée courte donne
    // des touches larges et l'autre des touches étroites : le pavé penche.
    //
    // Les cinq chiffres de chaque rangée ne bougent pas — c'est l'ordre qu'un
    // élève cherche du regard. Ce sont les touches d'appoint que l'on répartit :
    // au départ « − » et « , » en haut, « ⌫ » et « OK » en bas, puis on fait
    // glisser d'une rangée à l'autre tant que l'écart dépasse une touche.
    const perso = (opts.touches || []).map(t => ({ ...t, perso: true }));
    const persoK = new Set(perso.map(t => t.k));
    const hautExtras = [...perso];
    if (opts.signe && !persoK.has('−')) hautExtras.push({ k: '−', cls: 'pav-touche--signe' });
    if (opts.virgule) hautExtras.push({ k: ',', cls: 'pav-touche--signe' });
    const basExtras = [{ k: '⌫', cls: 'pav-touche--eff', html: ICONE_EFF }];
    if (opts.valider) basExtras.push({ k: '✓', cls: 'pav-touche--ok', html: 'OK' });

    const longueur = (extras) => 5 + extras.length;
    // Le « ⌫ » monte avant l'« OK » : la validation reste en bas à droite, là
    // où le pouce la trouve, et l'effacement finit la rangée du haut.
    while (longueur(basExtras) - longueur(hautExtras) >= 2) hautExtras.push(basExtras.shift());
    while (longueur(hautExtras) - longueur(basExtras) >= 2) basExtras.unshift(hautExtras.pop());

    const touches = [];
    [hautExtras, basExtras].forEach((extras, i) => {
        const ligne = document.createElement('div');
        ligne.className = 'pav-rangee';
        RANGEES[i].forEach(k => touches.push({ ligne, k }));
        extras.forEach(t => touches.push({ ligne, ...t }));
        pave.appendChild(ligne);
    });

    const frappe = (k) => {
        const el = champ();
        if (!el || el.disabled) return;
        const val = String(el.value ?? '');
        if (k === '⌫') el.value = val.slice(0, -1);
        else if (k === '✓') { if (opts.valider) opts.valider(); return; }
        // Une touche demandée par le jeu écrit SON caractère, à la suite : le
        // « − » des relatifs bascule le signe du nombre, celui d'une expression
        // est une soustraction, et les deux ne peuvent pas être la même touche.
        else if (persoK.has(k)) { if (val.length < maxLong) el.value = val + k; }
        else if (k === '−') el.value = val.startsWith('-') ? val.slice(1) : '-' + val;
        else if (k === ',') { if (!val.includes(',') && val.replace('-', '')) el.value = val + ','; }
        else if (val.replace(/[-,]/g, '').length < maxLong) el.value = val + k;
        // Un `input` synthétique : les jeux qui écoutent la frappe (l'aperçu
        // d'un calcul, la validation à la volée) doivent voir passer la même
        // chose que si l'élève avait tapé au clavier.
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    touches.forEach(({ ligne, k, cls, html, aria }) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `pav-touche${cls ? ' ' + cls : ''}`;
        b.innerHTML = html || k;
        b.setAttribute('aria-label', aria || (k === '⌫' ? 'Effacer' : k === '✓' ? 'Valider' : k));
        // `pointerdown` et non `click` : le champ perdrait le focus au premier
        // toucher, et les jeux valident sur `blur` — l'élève aurait vu sa
        // réponse partir avant d'avoir fini de la taper.
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); frappe(k); });
        ligne.appendChild(b);
    });

    hote.insertBefore(pave, opts.avant && opts.avant.parentElement === hote ? opts.avant : null);
    return { el: pave, detruire: () => pave.remove() };
}

/**
 * Empêche le clavier système de s'ouvrir sur ce champ : c'est notre pavé qui
 * écrit dedans. Sans cela, iOS pose par-dessus un clavier qui masque la moitié
 * du jeu — et qui ne s'ouvre de toute façon pas quand le champ vient d'être
 * créé par le code.
 */
export function sansClavierSysteme(champ) {
    if (!champ) return;
    champ.setAttribute('inputmode', 'none');
    champ.setAttribute('autocomplete', 'off');
    // On ne met PAS `readonly` : il empêcherait le curseur de se montrer, et
    // l'élève ne saurait plus quel champ reçoit ce qu'il tape.
    champ.addEventListener('focus', () => {
        // Sur iOS, `blur` immédiat referme le clavier tout en gardant la
        // sélection visuelle du champ. Le pavé, lui, écrit sans le focus.
        if (auDoigt()) champ.blur();
    });
}

/**
 * CE CHAMP ÉCRIT EN MAJUSCULES — les points d'une figure en sont.
 *
 * Rémy, sur la notation du cercle : « permet d'avoir des touches de crochet ou
 * parenthèses et en majuscule ». `autocapitalize` ne suffit pas : c'est un
 * CONSEIL au clavier logiciel, que les claviers de poste fixe ignorent et que
 * les claviers logiciels abandonnent dès qu'on a corrigé une lettre à la main.
 * On force donc la valeur, ce qui est la seule façon que ce que l'élève LIT
 * soit ce que le logiciel COMPARE.
 */
export function enMajuscules(champ) {
    if (!champ) return;
    champ.setAttribute('autocapitalize', 'characters');
    champ.addEventListener('input', () => {
        const haut = champ.value.toUpperCase();
        if (haut === champ.value) return;
        const d = champ.selectionStart, f = champ.selectionEnd;
        // ON NE REPOSE LE CURSEUR QUE SI LA LONGUEUR N'A PAS BOUGÉ : quelques
        // lettres s'allongent en majuscules (« ß » devient « SS »), et remettre
        // le curseur à son ancien rang le poserait au milieu d'une lettre.
        const memeTaille = haut.length === champ.value.length;
        champ.value = haut;
        if (memeTaille) {
            try { champ.setSelectionRange(d, f); } catch (e) { /* champ sans curseur */ }
        }
    });
}

/**
 * DEUX TOUCHES QUI ENTOURENT CE QU'ON A ÉCRIT : « [ ] » et « ( ) ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « il faudrait taper [OG], par contre c'est galère au clavier, permet
 * d'avoir des touches de crochet ou parenthèses ». Mesuré sur un téléphone :
 * écrire `[OG]` au clavier d'iOS demande SEPT gestes pour quatre signes —
 * passer aux symboles, trouver `[` (deuxième page), revenir aux lettres,
 * bloquer les majuscules, taper, repasser aux symboles, trouver `]`.
 *
 * ELLES ENTOURENT, ELLES N'AJOUTENT PAS. Une touche qui écrirait son signe à la
 * suite, comme le pavé de chiffres le fait, donnerait « OG[ » : le crochet
 * ouvrant va DEVANT. Chaque touche pose donc sa paire autour de ce qui est
 * écrit — et retire d'abord la paire extérieure, quelle qu'elle soit, pour
 * qu'un appui sur « [ ] » CORRIGE un « (OG) » tapé par erreur au lieu de
 * l'emballer dans « [(OG)] ».
 *
 * Champ vide, le curseur se met ENTRE les deux signes : c'est l'autre ordre des
 * gestes, on ouvre puis on tape, et il doit marcher aussi.
 *
 * @param {HTMLElement} hote
 * @param {Object} opts
 * @param {() => HTMLInputElement|null} opts.champ - relu à chaque appui : ces
 *        écrans se redessinent à chaque question.
 * @param {Element} [opts.avant] - insérer AVANT ce nœud plutôt qu'à la fin.
 * @returns {{el: HTMLElement, detruire: () => void}}
 */
export function poserTouchesDeNotation(hote, opts = {}) {
    const champ = opts.champ || (() => null);
    const rangee = document.createElement('div');
    rangee.className = 'pav-notation';
    rangee.setAttribute('role', 'group');
    rangee.setAttribute('aria-label', 'Crochets et parenthèses');

    const entourer = (signes) => {
        const el = champ();
        if (!el || el.disabled) return;
        const coeur = String(el.value ?? '').trim()
            .replace(/^[[(]/, '').replace(/[\])]$/, '');
        el.value = signes[0] + coeur + signes[1];
        const ou = 1 + coeur.length;
        try {
            el.focus({ preventScroll: true });
            el.setSelectionRange(ou, ou);
        } catch (e) { /* un champ sans curseur : la valeur suffit */ }
        // Le même `input` synthétique que le pavé de chiffres : ce qui écoute la
        // frappe — la mise en majuscules, juste au-dessus — doit voir passer la
        // même chose que si l'élève avait tapé.
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    [['[]', 'Les crochets'], ['()', 'Les parenthèses']].forEach(([signes, titre]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pav-touche pav-touche--notation';
        b.dataset.notation = signes;
        b.textContent = `${signes[0]} ${signes[1]}`;
        b.setAttribute('aria-label', titre);
        b.title = titre;
        // `pointerdown` comme pour le pavé de chiffres : sur `click`, le champ
        // aurait déjà perdu le focus au premier toucher.
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); entourer(signes); });
        rangee.appendChild(b);
    });

    hote.insertBefore(rangee, opts.avant && opts.avant.parentElement === hote ? opts.avant : null);
    return { el: rangee, detruire: () => rangee.remove() };
}
