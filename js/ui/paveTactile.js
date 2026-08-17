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

    const touches = [];
    RANGEES.forEach((rang, i) => {
        const ligne = document.createElement('div');
        ligne.className = 'pav-rangee';
        rang.forEach(k => touches.push({ ligne, k }));
        // Les touches d'appoint tiennent au bout des rangées plutôt que sur une
        // troisième : c'est tout l'intérêt d'un pavé en deux lignes.
        if (i === 0 && opts.signe) touches.push({ ligne, k: '−', cls: 'pav-touche--signe' });
        if (i === 0 && opts.virgule) touches.push({ ligne, k: ',', cls: 'pav-touche--signe' });
        if (i === 1) touches.push({ ligne, k: '⌫', cls: 'pav-touche--eff', html: ICONE_EFF });
        if (i === 1 && opts.valider) touches.push({ ligne, k: '✓', cls: 'pav-touche--ok', html: 'OK' });
        pave.appendChild(ligne);
    });

    const frappe = (k) => {
        const el = champ();
        if (!el || el.disabled) return;
        const val = String(el.value ?? '');
        if (k === '⌫') el.value = val.slice(0, -1);
        else if (k === '✓') { if (opts.valider) opts.valider(); return; }
        else if (k === '−') el.value = val.startsWith('-') ? val.slice(1) : '-' + val;
        else if (k === ',') { if (!val.includes(',') && val.replace('-', '')) el.value = val + ','; }
        else if (val.replace(/[-,]/g, '').length < maxLong) el.value = val + k;
        // Un `input` synthétique : les jeux qui écoutent la frappe (l'aperçu
        // d'un calcul, la validation à la volée) doivent voir passer la même
        // chose que si l'élève avait tapé au clavier.
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    touches.forEach(({ ligne, k, cls, html }) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `pav-touche${cls ? ' ' + cls : ''}`;
        b.innerHTML = html || k;
        b.setAttribute('aria-label', k === '⌫' ? 'Effacer' : k === '✓' ? 'Valider' : k);
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
