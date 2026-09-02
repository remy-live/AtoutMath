// L'ATELIER — l'écran de mise au point, en quatre volets.
//
// Rémy : « On pourrait un super debug avec séparation de l'écran : une où on a
// l'aperçu avec option, une où on a le jeu, une où on a les options, une où le
// robot agit, et la possibilité de prendre en photo ce qui peut t'intéresser,
// et une zone pour écrire, et aussi voir où c'est rangé — si c'est un jeu ou
// non, ce que l'on compte en exercice ou en circuit total — et rangé dans
// l'ordre inverse de leur création. On peut évidemment désactiver le robot. »
//
// CE QUE L'ATELIER CHANGE, ET POURQUOI IL FALLAIT L'ÉCRIRE. Régler un exercice
// se faisait jusqu'ici en boucle : ouvrir le jeu, le fermer, rouvrir les
// réglages, relancer, fermer, ouvrir l'aperçu papier, le comparer de mémoire à
// l'écran qu'on vient de quitter. Trois allers-retours par idée, et la moitié
// des comparaisons se faisaient de tête. Ici les trois vues sont côte à côte et
// le réglage les redessine TOUTES : on voit du même coup d'œil ce qu'un
// paramètre fait à l'écran, sur la feuille, et à la démonstration du robot.
//
// CHAQUE VOLET EST UN CADRE, ET C'EST LA DÉCISION D'ARCHITECTURE.
//
// Le jeu vit dans une couche plein écran (`#game-layer`) et l'aperçu dans une
// modale : les poser dans un quart d'écran demanderait de les rendre
// redimensionnables, et l'on regarderait alors une mise en page qui n'existe
// nulle part ailleurs — donc pas celle qu'on veut vérifier. Un `<iframe>`, lui,
// EST un écran : le jeu s'y déploie exactement comme sur un appareil de cette
// taille. C'est gratuit, c'est isolé, et cela rend au passage la vraie mesure
// — « est-ce que ça déborde sur un écran de cette largeur ? ».
//
// L'atelier n'est PAS un outil d'élève : il s'ouvre depuis la palette d'auteur,
// et rien de ce qui s'y passe n'entre au journal (les cadres jouent en mode
// démonstration ou en configuration interne, sans profil).

import { exercices } from '../data/catalog.js';
import { paramSchemaOf } from '../data/catalog.js';
import { fieldHtml, readParams, wireTips } from '../games/configUI.js';
import { estJeuCatalogue } from '../core/revue.js';
import { isGame } from '../core/gameAccess.js';
import { aUneFichePapier, getActivity, getGenerator } from '../core/registry.js';
import { journalConsole } from './consoleLog.js';

const CLE_NOTES = 'mathbox-atelier-notes';
const CLE_EXO = 'mathbox-atelier-exo';
const CLE_ROBOT = 'mathbox-atelier-robot';

let panneau = null;
let exoCourant = null;
let paramsCourants = {};

/**
 * LES EXERCICES DU PLUS NEUF AU PLUS ANCIEN.
 *
 * Rémy : « rangé dans l'ordre inverse de leur création ». C'est le seul ordre
 * utile ici : on met au point ce qu'on vient d'écrire, pas le catalogue entier.
 * L'ordre du catalogue, lui, suit les domaines — parfait pour choisir un
 * exercice à donner, inutile pour retrouver celui d'hier.
 */
function catalogueRecent() {
    return exercices.slice().sort((a, b) => String(b.cree || '').localeCompare(String(a.cree || '')));
}

/**
 * OÙ CET EXERCICE EST RANGÉ — les deux sens du mot « jeu », et ils diffèrent.
 *
 * · `estJeuCatalogue` : il porte un moteur d'activité et AUCUN générateur, donc
 *   son contenu vient de lui-même. C'est la définition qu'emploie le
 *   constructeur de parcours, et celle qui partage le catalogue en jeux et en
 *   exercices.
 * · `isGame` : son activité se déclare AUTONOME, donc il compte dans la
 *   progression des jeux à débloquer. Un exercice peut être l'un sans l'autre,
 *   et c'est exactement ce qu'on veut voir d'un coup d'œil.
 */
function rangement(exo) {
    const act = exo.activityId ? getActivity(exo.activityId) : null;
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const tousJeux = exercices.filter(estJeuCatalogue).length;
    const rang = catalogueRecent().findIndex(e => e.id === exo.id);
    const chemin = (exo.tags && exo.tags.chemin) || [];
    return [
        ['Rangé comme', estJeuCatalogue(exo) ? 'un JEU' : 'un EXERCICE'],
        ['Compté dans', estJeuCatalogue(exo)
            ? `les ${tousJeux} jeux du catalogue`
            : `les ${exercices.length - tousJeux} exercices du catalogue`],
        ['Jeu à débloquer', isGame(exo) ? 'oui — il compte dans la progression' : 'non'],
        ['Créé le', exo.cree || '—'],
        ['Ordre inverse', `${rang === 0 ? '1ᵉʳ' : `${rang + 1}ᵉ`} sur ${exercices.length} — du plus neuf au plus ancien`],
        ['Statut', exo.status || 'publié'],
        ['Domaine', chemin.join(' › ') || '—'],
        ['Niveaux', ((exo.tags && exo.tags.niveaux) || []).join(', ') || '—'],
        ['Activité', exo.activityId || '—'],
        ['Générateur', exo.generatorId || '—'],
        ['Fiche papier', aUneFichePapier(exo)
            ? (exo.printable ? `oui — rendu « ${exo.printable} »` : 'oui — questions écrites') : 'non'],
        ['Robot', act && act.supports && act.supports.demo === false ? 'non' : 'oui'],
        ['Compétences', (exo.skills || (gen && gen.skills) || []).join(', ') || '—']
    ];
}

/** L'adresse d'un volet : la même page, avec ce qu'elle doit ouvrir. */
function adresse(quoi) {
    const p = new URLSearchParams();
    p.set('atelier', quoi);
    p.set('exo', exoCourant.id);
    // Les réglages voyagent en clair : ce sont des valeurs simples, et l'URL
    // lisible se copie dans un onglet à part quand on veut voir un volet en
    // grand sur un vrai écran.
    p.set('p', encodeURIComponent(JSON.stringify(paramsCourants)));
    return `${location.pathname}?${p.toString()}`;
}

const robotActif = () => {
    try { return localStorage.getItem(CLE_ROBOT) !== '0'; } catch (e) { return true; }
};

function reglerRobot(actif) {
    try { localStorage.setItem(CLE_ROBOT, actif ? '1' : '0'); } catch (e) { /* privé */ }
}

const echapper = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function assurerPanneau() {
    if (panneau) return panneau;
    panneau = document.createElement('div');
    panneau.id = 'atelier';
    panneau.className = 'atl';
    panneau.innerHTML = `
        <style>
            /* AU-DESSUS DE LA PALETTE D'AUTEUR (z-index 100000). Elle est
               fixée en bas à gauche, c'est-à-dire exactement sur le volet du
               robot : posée par-dessus l'Atelier, elle en cachait un quart. On
               ferme l'Atelier pour la retrouver — il a son propre bouton. */
            .atl {
                position: fixed; inset: 0; z-index: 100001; display: none;
                flex-direction: column; background: var(--bg-app); color: var(--text-main);
            }
            .atl--ouvert { display: flex; }
            .atl-tete {
                display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                padding: 8px 12px; border-bottom: 1px solid var(--border);
                background: var(--bg-panel); flex: 0 0 auto;
            }
            .atl-titre { font-weight: 800; font-size: .98rem; }
            .atl-select {
                flex: 1 1 240px; min-width: 180px; max-width: 520px;
                border: 1px solid var(--border); border-radius: 9px; padding: 6px 9px;
                background: var(--bg-app); color: var(--text-main); font: inherit;
                font-size: .84rem; font-weight: 600;
            }
            .atl-btn {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                border-radius: 9px; padding: 6px 11px; font: inherit; font-weight: 700;
                font-size: .8rem; cursor: pointer; min-height: 34px;
            }
            .atl-btn--fort { background: var(--primary); border-color: var(--primary); color: #fff; }
            .atl-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }

            /* QUATRE VOLETS ET UN RAIL. Le jeu en haut à gauche, le robot
               dessous — on compare la démonstration à ce qu'on vient de jouer
               sans bouger les yeux —, la feuille sur toute la hauteur au
               milieu, parce qu'une fiche est haute, et les réglages à droite. */
            .atl-corps {
                flex: 1 1 auto; min-height: 0; display: grid; gap: 8px; padding: 8px;
                grid-template-columns: 1fr 1fr 320px;
                grid-template-rows: 1fr 1fr;
                grid-template-areas: "jeu fiche rail" "robot fiche rail";
            }
            .atl-corps[data-plein="jeu"],
            .atl-corps[data-plein="robot"],
            .atl-corps[data-plein="fiche"] {
                grid-template-columns: 1fr 320px;
                grid-template-rows: 1fr;
                grid-template-areas: "plein rail";
            }
            .atl-corps[data-plein] .atl-volet { display: none; }
            .atl-corps[data-plein="jeu"] .atl-volet--jeu,
            .atl-corps[data-plein="robot"] .atl-volet--robot,
            .atl-corps[data-plein="fiche"] .atl-volet--fiche {
                display: flex; grid-area: plein;
            }
            .atl-volet--jeu { grid-area: jeu; }
            .atl-volet--robot { grid-area: robot; }
            .atl-volet--fiche { grid-area: fiche; }
            .atl-rail { grid-area: rail; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }

            .atl-volet {
                display: flex; flex-direction: column; min-height: 0; min-width: 0;
                border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
                background: var(--bg-panel);
            }
            .atl-volet-tete {
                display: flex; align-items: center; gap: 6px; padding: 4px 8px;
                border-bottom: 1px solid var(--border); font-size: .74rem; font-weight: 800;
                text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted);
                flex: 0 0 auto;
            }
            .atl-volet-tete .atl-mini {
                border: none; background: transparent; color: var(--text-muted);
                cursor: pointer; font-size: .9rem; line-height: 1; padding: 3px 5px;
                border-radius: 6px;
            }
            .atl-volet-tete .atl-mini:hover { background: var(--bg-hover); color: var(--text-main); }
            .atl-volet-tete .atl-espace { margin-left: auto; }
            .atl-cadre { flex: 1 1 auto; width: 100%; border: 0; background: #fff; min-height: 0; }
            .atl-eteint {
                flex: 1 1 auto; display: flex; align-items: center; justify-content: center;
                text-align: center; padding: 16px; font-size: .8rem; color: var(--text-muted);
            }
            /* L'ATTRIBUT « hidden » NE SUFFIT PAS quand on a écrit
               display: flex — l'un dit « ne montre pas », l'autre dit « montre
               en flex », et c'est le second qui gagne. Le message d'extinction
               s'affichait donc sous le robot allumé. */
            .atl-eteint[hidden] { display: none; }

            .atl-bloc {
                border: 1px solid var(--border); border-radius: 12px; background: var(--bg-panel);
                padding: 9px 11px; flex: 0 0 auto;
            }
            .atl-bloc-titre {
                font-size: .72rem; font-weight: 800; text-transform: uppercase;
                letter-spacing: .04em; color: var(--text-muted); margin-bottom: 7px;
            }
            .atl-rangement { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: .76rem; }
            .atl-rangement dt { color: var(--text-muted); font-weight: 600; }
            .atl-rangement dd { margin: 0; font-weight: 700; }
            .atl-notes {
                width: 100%; min-height: 130px; resize: vertical; border: 1px solid var(--border);
                border-radius: 9px; padding: 7px 9px; font: inherit; font-size: .8rem;
                background: var(--bg-app); color: var(--text-main); line-height: 1.4;
            }
            .atl-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 7px; }

            /* SUR UN ÉCRAN ÉTROIT, LES VOLETS S'EMPILENT. Un atelier à trois
               colonnes sur un téléphone ne montre rien du tout ; empilé, il
               reste ce qu'il est — plusieurs vues du même exercice, qu'on fait
               défiler. */
            @media (max-width: 1000px) {
                .atl-corps {
                    grid-template-columns: 1fr; grid-template-rows: none;
                    grid-auto-rows: minmax(320px, auto);
                    grid-template-areas: "jeu" "fiche" "robot" "rail";
                    overflow-y: auto;
                }
                .atl-corps[data-plein] { grid-template-columns: 1fr; grid-template-areas: "plein" "rail"; }
                .atl-rail { overflow: visible; }
            }
        </style>
        <div class="atl-tete">
            <span class="atl-titre">🛠️ L'Atelier</span>
            <select class="atl-select" id="atl-exo" aria-label="Exercice"></select>
            <button class="atl-btn" id="atl-recharger" title="Redessiner les trois volets">⟳ Tout relancer</button>
            <button class="atl-btn" id="atl-fermer" style="margin-left:auto">Fermer</button>
        </div>
        <div class="atl-corps" id="atl-corps">
            <section class="atl-volet atl-volet--jeu">
                <header class="atl-volet-tete">Le jeu
                    <span class="atl-espace"></span>
                    <button class="atl-mini" data-relancer="jeu" title="Relancer ce volet">⟳</button>
                    <button class="atl-mini" data-agrandir="jeu" title="Ce volet en grand">⤢</button>
                </header>
                <iframe class="atl-cadre" id="atl-jeu" title="Le jeu"></iframe>
            </section>
            <section class="atl-volet atl-volet--fiche">
                <header class="atl-volet-tete">L'aperçu papier
                    <span class="atl-espace"></span>
                    <button class="atl-mini" data-relancer="fiche" title="Relancer ce volet">⟳</button>
                    <button class="atl-mini" data-agrandir="fiche" title="Ce volet en grand">⤢</button>
                </header>
                <iframe class="atl-cadre" id="atl-fiche" title="L'aperçu papier"></iframe>
            </section>
            <section class="atl-volet atl-volet--robot">
                <header class="atl-volet-tete">Le robot
                    <span class="atl-espace"></span>
                    <button class="atl-mini" id="atl-robot-bascule" title="Allumer ou éteindre le robot">⏻</button>
                    <button class="atl-mini" data-relancer="robot" title="Relancer ce volet">⟳</button>
                    <button class="atl-mini" data-agrandir="robot" title="Ce volet en grand">⤢</button>
                </header>
                <iframe class="atl-cadre" id="atl-robot" title="Le robot"></iframe>
                <div class="atl-eteint" id="atl-robot-eteint" hidden>
                    Le robot est éteint. ⏻ pour le rallumer.
                </div>
            </section>
            <div class="atl-rail">
                <div class="atl-bloc">
                    <div class="atl-bloc-titre">Les réglages</div>
                    <div id="atl-reglages"></div>
                </div>
                <div class="atl-bloc">
                    <div class="atl-bloc-titre">Où c'est rangé</div>
                    <dl class="atl-rangement" id="atl-rangement"></dl>
                </div>
                <div class="atl-bloc">
                    <div class="atl-bloc-titre">Le carnet</div>
                    <textarea class="atl-notes" id="atl-notes"
                        placeholder="Ce qu'on voit, ce qu'on veut changer…"></textarea>
                    <div class="atl-actions">
                        <button class="atl-btn" id="atl-photo" title="Enregistrer l'image du volet">📷 Photo</button>
                        <button class="atl-btn atl-btn--fort" id="atl-releve"
                            title="Tout ce qu'il faut pour décrire l'état, dans le presse-papier">📋 Relevé</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(panneau);

    panneau.querySelector('#atl-fermer').onclick = fermerAtelier;
    panneau.querySelector('#atl-recharger').onclick = () => rafraichir();
    panneau.querySelector('#atl-exo').onchange = (e) => choisir(e.target.value);
    panneau.querySelectorAll('[data-relancer]').forEach(b => {
        b.onclick = () => recharger(b.dataset.relancer);
    });
    // LE PLEIN ÉCRAN D'UN VOLET EST UNE BASCULE, pas un mode. On agrandit pour
    // regarder un détail, et l'on veut retrouver les trois vues d'un seul clic
    // — sur le MÊME bouton, sinon on le cherche.
    // L'ATTRIBUT DU BOUTON N'EST PAS CELUI DE L'ÉTAT, et c'est voulu : le
    // conteneur porte `data-plein` pour que le CSS sache quoi montrer, et si
    // les boutons portaient le même nom, `[data-plein="fiche"]` désignerait
    // deux éléments — le conteneur d'abord.
    panneau.querySelectorAll('[data-agrandir]').forEach(b => {
        b.onclick = () => {
            const corps = panneau.querySelector('#atl-corps');
            if (corps.dataset.plein === b.dataset.agrandir) delete corps.dataset.plein;
            else corps.dataset.plein = b.dataset.agrandir;
        };
    });
    panneau.querySelector('#atl-robot-bascule').onclick = () => {
        reglerRobot(!robotActif());
        majRobot();
    };
    const notes = panneau.querySelector('#atl-notes');
    notes.oninput = () => {
        try { localStorage.setItem(CLE_NOTES, notes.value); } catch (e) { /* privé */ }
    };
    try { notes.value = localStorage.getItem(CLE_NOTES) || ''; } catch (e) { /* privé */ }
    panneau.querySelector('#atl-photo').onclick = photo;
    panneau.querySelector('#atl-releve').onclick = releve;
    return panneau;
}

/** Le robot allumé montre sa démonstration ; éteint, son volet le dit. */
function majRobot() {
    const actif = robotActif();
    const cadre = panneau.querySelector('#atl-robot');
    const eteint = panneau.querySelector('#atl-robot-eteint');
    const bouton = panneau.querySelector('#atl-robot-bascule');
    cadre.hidden = !actif;
    eteint.hidden = actif;
    bouton.classList.toggle('active', actif);
    bouton.title = actif ? 'Éteindre le robot' : 'Allumer le robot';
    if (actif) cadre.src = adresse('demo');
    else cadre.removeAttribute('src');
}

function recharger(quoi) {
    if (quoi === 'robot') { majRobot(); return; }
    const cadre = panneau.querySelector(quoi === 'jeu' ? '#atl-jeu' : '#atl-fiche');
    cadre.src = adresse(quoi);
}

/** Les réglages de l'exercice, et ils redessinent LES TROIS volets. */
function peindreReglages() {
    const zone = panneau.querySelector('#atl-reglages');
    const schema = paramSchemaOf(exoCourant) || [];
    if (!schema.length) {
        zone.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted)">'
            + 'Cet exercice n\'a pas de réglage.</div>';
        return;
    }
    zone.innerHTML = schema.map(p => fieldHtml(p,
        paramsCourants[p.id] !== undefined ? paramsCourants[p.id] : p.default)).join('');
    wireTips(zone);
    const relire = () => {
        paramsCourants = { ...paramsCourants, ...readParams(zone, schema) };
        rafraichir({ garderSelection: true });
    };
    // ON POSE LES ÉCOUTEURS PAR PROPRIÉTÉ, ET C'EST UN VRAI PIÈGE ÉVITÉ.
    //
    // `addEventListener` en EMPILE un par redessin, et chacun garde le schéma
    // qu'il avait à sa naissance. Mesuré : après avoir changé d'exercice, le
    // premier écouteur relisait encore le schéma du PRÉCÉDENT, n'y trouvait
    // aucun de ses champs, rendait un objet vide — et redessinait les réglages
    // avec les anciennes valeurs, effaçant celle qu'on venait de choisir avant
    // même que l'écouteur suivant ne la lise. Le menu revenait tout seul à sa
    // position de départ, et les volets ne bougeaient pas.
    zone.onchange = relire;
    // Les boutons « Oui / Non » n'émettent rien : leur écouteur global ne fait
    // que basculer la classe. On repasse derrière lui — même remède que dans
    // l'engrenage de la fiche du parcours.
    zone.onclick = (ev) => {
        if (ev.target.closest('.cfg-on')) setTimeout(relire, 0);
    };
}

function peindreRangement() {
    panneau.querySelector('#atl-rangement').innerHTML = rangement(exoCourant)
        .map(([k, v]) => `<dt>${echapper(k)}</dt><dd>${echapper(v)}</dd>`).join('');
}

function peindreListe() {
    const sel = panneau.querySelector('#atl-exo');
    sel.innerHTML = catalogueRecent().map(e =>
        `<option value="${echapper(e.id)}"${e.id === exoCourant.id ? ' selected' : ''}>${
            echapper(`${e.cree || '????-??-??'} · ${e.title}`)}</option>`).join('');
}

function choisir(id) {
    const exo = exercices.find(e => e.id === id);
    if (!exo) return;
    exoCourant = exo;
    paramsCourants = { ...(exo.params || {}) };
    try { localStorage.setItem(CLE_EXO, id); } catch (e) { /* privé */ }
    rafraichir();
}

function rafraichir(opts = {}) {
    if (!opts.garderSelection) peindreListe();
    peindreReglages();
    peindreRangement();
    recharger('jeu');
    recharger('fiche');
    majRobot();
}

/**
 * LA PHOTO — ce qui est vraiment capturable, et rien de plus.
 *
 * Rémy : « la possibilité de prendre en photo ce qui peut t'intéresser ». Les
 * volets sont des cadres d'une autre page : le navigateur ne laisse pas les
 * photographier, et aucune bibliothèque ne rend fidèlement du HTML en image.
 * Ce qu'on SAIT capturer exactement, ce sont les dessins — un `<svg>` ou un
 * `<canvas>` se sérialisent au pixel près —, et c'est justement ce qu'on
 * regarde ici : la feuille, le plateau, la figure. On enregistre donc l'image
 * du dessin du volet mis en grand (ou du premier qui en porte un), et l'on dit
 * franchement quand il n'y en a pas, plutôt que de rendre une photo fausse.
 */
async function photo() {
    const { showToast } = await import('./modal.js');
    const corps = panneau.querySelector('#atl-corps');
    const ordre = corps.dataset.plein
        ? [corps.dataset.plein]
        : ['fiche', 'jeu', 'robot'];
    for (const quoi of ordre) {
        const cadre = panneau.querySelector(
            quoi === 'jeu' ? '#atl-jeu' : quoi === 'robot' ? '#atl-robot' : '#atl-fiche');
        const doc = cadre && !cadre.hidden && cadre.contentDocument;
        if (!doc) continue;
        const dessin = plusGrandDessin(doc);
        if (!dessin) continue;
        const url = await enImage(dessin);
        if (!url) continue;
        const a = document.createElement('a');
        a.href = url;
        a.download = `atelier-${exoCourant.id}-${quoi}.png`;
        a.click();
        showToast(`Photo du volet « ${quoi} » enregistrée.`, 'success');
        return;
    }
    showToast('Aucun dessin à photographier dans les volets — le relevé 📋 dit tout le reste.',
        'warning');
}

/** Le plus grand `<svg>` ou `<canvas>` d'un document : c'est ce qu'on regarde. */
function plusGrandDessin(doc) {
    const candidats = [...doc.querySelectorAll('svg, canvas')]
        .map(el => ({ el, aire: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
        .filter(x => x.aire > 400)
        .sort((a, b) => b.aire - a.aire);
    return candidats.length ? candidats[0].el : null;
}

/** Un dessin en PNG : le canvas se lit tel quel, le SVG se rejoue. */
function enImage(el) {
    if (el.tagName.toLowerCase() === 'canvas') {
        try { return Promise.resolve(el.toDataURL('image/png')); } catch (e) { return Promise.resolve(null); }
    }
    const r = el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const copie = el.cloneNode(true);
    copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copie.setAttribute('width', w);
    copie.setAttribute('height', h);
    const texte = new XMLSerializer().serializeToString(copie);
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            // Deux fois la taille : une capture d'écran sert à REGARDER un
            // détail, et un PNG à la taille de l'écran ne montre rien de plus
            // que l'écran.
            c.width = w * 2; c.height = h * 2;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            try { resolve(c.toDataURL('image/png')); } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texte);
    });
}

/**
 * LE RELEVÉ — l'état complet, en texte, dans le presse-papier.
 *
 * C'est le pendant de la photo, et c'est souvent lui qui sert : une image dit
 * qu'un mot déborde, le relevé dit lequel, de combien, avec quels réglages et
 * quelles erreurs de console. On y met tout ce qu'il faudrait sinon redemander.
 */
async function releve() {
    const lignes = [];
    lignes.push(`# Atelier — ${exoCourant.title} (${exoCourant.id})`);
    lignes.push('');
    lignes.push('## Réglages');
    lignes.push(JSON.stringify(paramsCourants));
    lignes.push('');
    lignes.push('## Où c\'est rangé');
    rangement(exoCourant).forEach(([k, v]) => lignes.push(`- ${k} : ${v}`));
    ['jeu', 'fiche', 'robot'].forEach(quoi => {
        const cadre = panneau.querySelector(
            quoi === 'jeu' ? '#atl-jeu' : quoi === 'robot' ? '#atl-robot' : '#atl-fiche');
        lignes.push('');
        lignes.push(`## Volet « ${quoi} »`);
        if (!cadre || cadre.hidden || !cadre.contentDocument) { lignes.push('(éteint)'); return; }
        const d = cadre.contentDocument;
        lignes.push(`taille du cadre : ${Math.round(cadre.clientWidth)} × ${Math.round(cadre.clientHeight)}`);
        const q = d.querySelector('.game-question, .fp-apercu, #fp-apercu');
        if (q) lignes.push(`énoncé : ${(q.innerText || '').trim().slice(0, 400).replace(/\s+/g, ' ')}`);
        deborde(d).forEach(t => lignes.push(`DÉBORDE : ${t}`));
    });
    const notes = panneau.querySelector('#atl-notes').value.trim();
    if (notes) { lignes.push(''); lignes.push('## Le carnet'); lignes.push(notes); }
    const journal = journalConsole().slice(-25);
    if (journal.length) {
        lignes.push('');
        lignes.push('## Console (25 dernières lignes)');
        journal.forEach(l => lignes.push(typeof l === 'string' ? l : JSON.stringify(l)));
    }
    const texte = lignes.join('\n');
    const { showToast } = await import('./modal.js');
    try {
        await navigator.clipboard.writeText(texte);
        showToast('Relevé copié — il n\'y a plus qu\'à le coller.', 'success');
    } catch (e) {
        const a = document.createElement('a');
        a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(texte);
        a.download = `atelier-${exoCourant.id}.txt`;
        a.click();
        showToast('Relevé enregistré en fichier.', 'success');
    }
}

/**
 * CE QUI DÉBORDE, MESURÉ DANS LE CADRE.
 *
 * Un texte rogné par sa case ne se voit pas toujours à l'œil — il se voit
 * toujours à la mesure. On compare le contenu à la boîte, et l'on rend les dix
 * pires : c'est la question qu'on se pose à chaque volet.
 */
function deborde(doc) {
    const out = [];
    // CE QUI N'EST PAS UN DÉBORDEMENT, et qu'il fallait écarter pour que la
    // liste veuille dire quelque chose :
    //  · les champs de formulaire — un `<select>` mesure la largeur de TOUTES
    //    ses options, et se signalait à chaque relevé ;
    //  · ce qui défile exprès — un aperçu de six pages a trois mille pixels de
    //    trop, c'est sa raison d'être ;
    //  · ce qui porte des enfants — on cherche le mot rogné dans sa case, pas
    //    une colonne un peu longue.
    const FORMULAIRE = ['SELECT', 'INPUT', 'TEXTAREA', 'OPTION'];
    doc.querySelectorAll('*').forEach(el => {
        if (out.length > 40) return;
        if (FORMULAIRE.includes(el.tagName) || el.children.length > 3) return;
        const s = doc.defaultView.getComputedStyle(el);
        const dx = s.overflowX === 'visible' || s.overflowX === 'auto' || s.overflowX === 'scroll'
            ? 0 : el.scrollWidth - el.clientWidth;
        const dy = s.overflowY === 'visible' || s.overflowY === 'auto' || s.overflowY === 'scroll'
            ? 0 : el.scrollHeight - el.clientHeight;
        if (dx > 2 || dy > 2) {
            const t = (el.textContent || '').trim().slice(0, 40).replace(/\s+/g, ' ');
            out.push(`${el.className || el.tagName} (+${dx}×${dy}px) « ${t} »`);
        }
    });
    return out.slice(0, 10);
}

export function ouvrirAtelier() {
    assurerPanneau();
    if (!exoCourant) {
        let garde = null;
        try { garde = localStorage.getItem(CLE_EXO); } catch (e) { garde = null; }
        exoCourant = exercices.find(e => e.id === garde) || catalogueRecent()[0];
        paramsCourants = { ...(exoCourant.params || {}) };
    }
    panneau.classList.add('atl--ouvert');
    rafraichir();
}

export function fermerAtelier() {
    if (!panneau) return;
    panneau.classList.remove('atl--ouvert');
    // Les cadres continueraient à tourner derrière — un robot qui joue tout
    // seul dans une page fermée, c'est du travail pour rien et des sons qui
    // sortent de nulle part.
    ['#atl-jeu', '#atl-fiche', '#atl-robot'].forEach(s => {
        const c = panneau.querySelector(s);
        if (c) c.removeAttribute('src');
    });
}

export function basculerAtelier() {
    if (panneau && panneau.classList.contains('atl--ouvert')) fermerAtelier();
    else ouvrirAtelier();
}

/**
 * L'AUTRE BOUT : ce que fait la page quand elle EST un volet.
 *
 * Elle n'affiche ni la navigation ni le catalogue — juste ce qu'on lui demande,
 * en grand. Trois volets, trois ouvertures :
 *   · `jeu`   — l'exercice, réglages fournis, sans la fenêtre de configuration ;
 *   · `demo`  — le même, joué par le robot ;
 *   · `fiche` — l'aperçu papier, avec ses options.
 */
export async function ouvrirVoletAtelier(quoi, params) {
    const exo = exercices.find(e => e.id === params.get('exo'));
    if (!exo) return;
    let regles = {};
    try { regles = JSON.parse(decodeURIComponent(params.get('p') || '{}')) || {}; } catch (e) { regles = {}; }
    const complet = { ...exo, params: { ...(exo.params || {}), ...regles } };
    document.documentElement.classList.add('volet-atelier');
    if (quoi === 'fiche') {
        const { ouvrirFicheModal } = await import('./printSheet.js');
        ouvrirFicheModal(complet, complet.params);
        return;
    }
    const { openGameLayer } = await import('../games/engine.js');
    openGameLayer({ ...complet, internalStudentConfig: true }, quoi === 'demo');
}
