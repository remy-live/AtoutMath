// LE TRI DES DINGBATS — « celui-là oui, celui-là non ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les dingbats intègre-le dans la revue catalogue pour que je
// puisse faire le tri et te faire un rapport. »
//
// C'est exactement le geste qu'il fait déjà sur les proverbes et les blagues
// (`ui/quotidienTri.js`) : parcourir une longue liste, trancher une fois par
// ligne, et recoller une consigne. On ne réinvente donc pas le geste — on le
// pose sur un autre objet, dans le même écran.
//
// ── CE QUE CE TRI PEUT DIRE, ET QUE RIEN D'AUTRE NE PEUT ───────────────────
//
// `tests/dingbat.test.mjs` vérifie que les cent neuf énigmes se dessinent, que
// leur juge accepte leur propre réponse, qu'aucune n'en répète une autre.
// `tools/dingbats.mjs` vérifie que les cent neuf scènes tiennent dans leur
// cadre. AUCUN DES DEUX NE DIT SI UNE ÉNIGME EST BONNE.
//
// « MÈTRE autour d'un carré se lit périmètre » est un jugement humain : il faut
// qu'un élève de cinquième le VOIE, et c'est Rémy qui sait lequel. C'est la
// même ligne que pour les séances — `relireUneSeance.mjs` ne juge pas le CHOIX
// des exercices — et pour les listes du quotidien.
//
// ── LES VERDICTS SONT RANGÉS PAR IDENTIFIANT, PAS PAR RANG ─────────────────
//
// Le tri du quotidien range ses verdicts par INDEX, et il a raison : ses entrées
// sont des chaînes, elles n'ont pas de nom. Les dingbats, eux, portent un
// identifiant stable (`dg-racine-carree`). On range donc par identifiant, et le
// travail de relecture survit à l'insertion d'une énigme au milieu de la liste —
// ce qui, avec des index, aurait décalé deux cents verdicts d'un cran sans que
// rien ne le signale.

import { DINGBATS } from '../data/dingbats.js';
import { DISPOSITIONS, dessiner, THEMES, NIVEAUX } from '../core/dingbat.js';
import { copierOuMontrer, telechargerTexte, jourPourFichier } from './exporter.js';

const CLE_VERDICTS = 'atoutmath.dingbats.verdicts';

const echapper = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Les verdicts de cet appareil : `{ 'dg-…': true | false }`. */
let verdicts = (() => {
    try { return JSON.parse(localStorage.getItem(CLE_VERDICTS)) || {}; }
    catch { return {}; }
})();

/** Ce que le filtre laisse passer. Il survit à un redessin. */
let filtre = { theme: 'tous', niveau: 0, vu: 'tous' };

function garder() {
    try { localStorage.setItem(CLE_VERDICTS, JSON.stringify(verdicts)); } catch { /* privé */ }
}

/**
 * NOTER, ET POUVOIR SE DÉDIRE.
 *
 * Recliquer le même bouton efface le verdict : c'est le geste qu'on fait quand
 * on s'est trompé, et sans lui il faudrait tout remettre à zéro pour corriger
 * une ligne. Repris tel quel du tri du quotidien, où il a fait ses preuves.
 *
 * Fonction PURE sur la table qu'on lui donne — c'est ce qui la rend éprouvable
 * sans navigateur.
 */
export function noter(table, id, valeur) {
    const suite = { ...table };
    if (suite[id] === valeur) delete suite[id];
    else suite[id] = valeur;
    return suite;
}

/** Les énigmes que le filtre laisse passer, dans l'ordre du fichier. */
export function filtrer(liste, f, table = {}) {
    return liste.filter(d => {
        if (f.theme !== 'tous' && d.theme !== f.theme) return false;
        if (f.niveau && d.niveau !== f.niveau) return false;
        const v = table[d.id];
        if (f.vu === 'nonlues' && v !== undefined) return false;
        if (f.vu === 'garder' && v !== true) return false;
        if (f.vu === 'jeter' && v !== false) return false;
        return true;
    });
}

/**
 * LE RAPPORT, PRÊT À M'ÊTRE ENVOYÉ.
 *
 * ON DONNE L'IDENTIFIANT *ET* LA RÉPONSE. L'identifiant seul est ce dont j'ai
 * besoin pour agir — c'est lui que je cherche dans `js/data/dingbats.js` — mais
 * il est illisible pour un humain, et Rémy doit pouvoir se relire avant de me
 * l'envoyer. La réponse seule, elle, m'obligerait à la rechercher dans le
 * fichier. Les deux ensemble se retrouvent toujours.
 *
 * ON DIT AUSSI CE QUI RESTE À LIRE. Un rapport qui annonce « 12 à supprimer »
 * sans dire sur combien de relues ne se décide pas : douze sur quinze et douze
 * sur cent neuf n'appellent pas la même réponse.
 */
export function rapport(table = verdicts, liste = DINGBATS) {
    const jeter = [], garder = [];
    for (const d of liste) {
        const v = table[d.id];
        if (v === undefined) continue;
        const forme = DISPOSITIONS[d.forme];
        (v ? garder : jeter).push(
            `${d.id} — « ${d.reponse} » (${d.theme}, niveau ${d.niveau})`
            + `${forme ? ` · ${forme.nom}` : ''}`);
    }
    const lues = jeter.length + garder.length;
    return `Dingbats — ${lues} relus sur ${liste.length}\n\n`
        + `À SUPPRIMER (${jeter.length})\n${jeter.join('\n') || '(aucun)'}\n\n`
        + `À GARDER (${garder.length})\n${garder.join('\n') || '(aucun)'}`;
}

/** Le compte, dit en français — c'est la ligne qu'on lit en premier. */
export function compte(table = verdicts, liste = DINGBATS) {
    const lues = liste.filter(d => table[d.id] !== undefined).length;
    const jetes = liste.filter(d => table[d.id] === false).length;
    if (!lues) return `Aucun relu sur ${liste.length}.`;
    return `${lues} relus sur ${liste.length}, dont ${jetes} à supprimer`
        + ` — il en reste ${liste.length - lues}.`;
}

// ── L'ÉCRAN ─────────────────────────────────────────────────────────────────

/** Le bloc entier, à poser dans le corps de la revue. */
export function dingbatsHtml() {
    const vus = filtrer(DINGBATS, filtre, verdicts);

    const chip = (quoi, valeur, texte) => {
        const actif = String(filtre[quoi]) === String(valeur);
        return `<button type="button" class="banc-chip ${actif ? 'banc-chip--actif' : ''}"
            data-filtre="${quoi}" data-valeur="${valeur}" aria-pressed="${actif}">${texte}</button>`;
    };

    const carte = (d) => {
        const v = verdicts[d.id];
        const forme = DISPOSITIONS[d.forme];
        let dessin;
        // UNE ÉNIGME QUI NE SE DESSINE PAS NE DOIT PAS VIDER L'ÉCRAN. Elle le
        // dit à sa place : c'est précisément une ligne qu'on veut voir en
        // triant, et la masquer la rendrait introuvable.
        try { dessin = dessiner(d); }
        catch (e) { dessin = `<p class="dgt-rate">${echapper(e.message)}</p>`; }
        return `<li class="dgt-carte${v === true ? ' dgt-carte--oui' : ''}${v === false ? ' dgt-carte--non' : ''}">
            <div class="dgt-scene">${dessin}</div>
            <div class="dgt-dit">
                <strong class="dgt-reponse">${echapper(d.reponse)}</strong>
                <span class="dgt-forme">${echapper(forme ? forme.lit : d.forme)}</span>
                ${d.explication ? `<span class="dgt-exp">${echapper(d.explication)}</span>` : ''}
                <span class="dgt-rang">${echapper(d.id)} · ${d.theme} · niveau ${d.niveau}</span>
            </div>
            <div class="dgt-verdict">
                <button type="button" class="banc-q-oui${v === true ? ' est-choisi' : ''}"
                    data-verdict="${echapper(d.id)}" data-valeur="oui" title="Garder"
                    aria-pressed="${v === true}">✓</button>
                <button type="button" class="banc-q-non${v === false ? ' est-choisi' : ''}"
                    data-verdict="${echapper(d.id)}" data-valeur="non" title="Supprimer"
                    aria-pressed="${v === false}">✕</button>
            </div>
        </li>`;
    };

    return `
        <div class="banc-critere-q">ON TRIE ICI, ON SUPPRIME DANS LE CODE. Les épreuves
            vérifient qu'un dingbat se dessine et que sa réponse est acceptée ; elles ne
            peuvent pas dire s'il est BON. « MÈTRE autour d'un carré se lit périmètre » est
            un jugement humain — et c'est le tien. Les verdicts restent sur cet appareil ;
            le bouton du bas les rend en une liste à me recopier
            (<code>js/data/dingbats.js</code>).</div>

        <div class="dgt-filtres">
            <span class="dgt-groupe">${chip('theme', 'tous', 'Tous les thèmes')}${
                THEMES.map(t => chip('theme', t.id, t.label)).join('')}</span>
            <span class="dgt-groupe">${chip('niveau', 0, 'Tous les niveaux')}${
                NIVEAUX.map(n => chip('niveau', n.id, `Niveau ${n.id}`)).join('')}</span>
            <span class="dgt-groupe">${chip('vu', 'tous', 'Tous')}${
                chip('vu', 'nonlues', 'Pas encore lus')}${
                chip('vu', 'garder', 'À garder')}${chip('vu', 'jeter', 'À supprimer')}</span>
        </div>

        <div class="banc-q-actions">
            <button type="button" class="banc-chip" data-tri-copier>📋 Copier le rapport</button>
            <!-- Même paire que sur le tri du quotidien, et pour la même raison :
                 un presse-papiers peut refuser sans le dire, un fichier non. -->
            <button type="button" class="banc-chip" data-tri-fichier>⤓ En fichier</button>
            <button type="button" class="banc-chip banc-chip--prudent" data-tri-vider>Tout remettre à zéro</button>
            <span class="banc-q-compte" data-tri-compte>${echapper(compte())}</span>
        </div>

        <div class="banc-domaine">${vus.length} dingbat${vus.length > 1 ? 's' : ''} à l'écran
            sur ${DINGBATS.length}</div>
        ${vus.length ? `<ol class="dgt-liste">${vus.map(carte).join('')}</ol>`
            : '<p class="banc-vide">Aucun dingbat ne correspond à ce filtre.</p>'}`;
}

/**
 * Branche les commandes du bloc.
 *
 * @param {HTMLElement} zone      le conteneur qui vient de recevoir le HTML
 * @param {Function} redessiner   à rappeler quand l'état change
 */
export function brancherDingbats(zone, redessiner) {
    zone.querySelectorAll('[data-filtre]').forEach(b => {
        b.onclick = () => {
            const quoi = b.dataset.filtre;
            filtre[quoi] = quoi === 'niveau' ? Number(b.dataset.valeur) : b.dataset.valeur;
            redessiner();
        };
    });

    zone.querySelectorAll('[data-verdict]').forEach(b => {
        b.onclick = () => {
            verdicts = noter(verdicts, b.dataset.verdict, b.dataset.valeur === 'oui');
            garder();
            redessiner();
        };
    });

    const copier = zone.querySelector('[data-tri-copier]');
    if (copier) copier.onclick = () =>
        copierOuMontrer(copier, rapport(), '📋 Copier le rapport', copier.parentElement);

    const fichier = zone.querySelector('[data-tri-fichier]');
    if (fichier) fichier.onclick = () => {
        telechargerTexte(`dingbats-tries-${jourPourFichier()}.txt`, rapport(), 'text/plain');
        fichier.textContent = '✓ Dans tes téléchargements';
        setTimeout(() => { fichier.textContent = '⤓ En fichier'; }, 3600);
    };

    // DEUX APPUIS POUR EFFACER. Voir `ui/quotidienTri.js` : ce bouton efface
    // cent neuf verdicts posés un par un, et il était à côté de celui qui
    // pouvait ne rien faire.
    const vider = zone.querySelector('[data-tri-vider]');
    if (vider) vider.onclick = () => {
        const n = Object.keys(verdicts).length;
        if (!n) return;
        if (!vider.dataset.arme) {
            vider.dataset.arme = '1';
            vider.textContent = `Effacer les ${n} verdicts ? Appuie encore`;
            vider.classList.add('banc-chip--arme');
            clearTimeout(brancherDingbats._t);
            brancherDingbats._t = setTimeout(() => {
                delete vider.dataset.arme;
                vider.textContent = 'Tout remettre à zéro';
                vider.classList.remove('banc-chip--arme');
            }, 6000);
            return;
        }
        clearTimeout(brancherDingbats._t);
        verdicts = {};
        garder();
        redessiner();
    };
}
