// LE DÉFI CHRONOMÉTRÉ DE LA CLASSE — ce que l'élève a sous les yeux.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je peux lancer un challenge chronométré, le plus de calcul et toute
// la classe participe et au bout du challenge, un tableau de High score, on
// pourrait faire cela avec les générateurs. Exemple : je lance le défi. Et là
// tous les élèves reçoivent des calculs, il faut taper la réponse ou QCM, aux
// choix, et au bout d'une minute, tableau de score pour tout le monde, et on
// reprend la suite des exercices normalement ».
//
// ── POURQUOI ÇA COUPE, ET POURQUOI C'EST LE BON CHOIX ─────────────────────
//
// Quand il a demandé si cela devait interrompre l'activité ou attendre la fin
// de l'exercice en cours, la réponse tenait en une phrase : L'INTÉRÊT D'UNE
// QUESTION LANCÉE PAR LE PROFESSEUR, C'EST QUE LES TRENTE RÉPONDENT DANS LES
// MÊMES VINGT SECONDES. Mise en file, elle arrive à trente moments différents :
// plus de correction collective, plus de classement, plus de moment de classe.
//
// MAIS CE QU'IL FAISAIT N'EST PAS PERDU. Le défi se pose PAR-DESSUS, sans rien
// démonter : l'exercice reste monté dessous, et il le retrouve exactement où
// il l'avait laissé. C'est la même idée que la pause du professeur.
//
// ── CE QUI VIENT DU SERVEUR, ET POURQUOI ──────────────────────────────────
//
//   · LA GRAINE — la même série de questions pour toute la classe. Sans elle,
//     chaque ardoise tirerait les siennes et le classement comparerait trente
//     épreuves différentes ;
//   · LES DEUX INSTANTS — début et fin. Jamais une durée : celle-ci commence à
//     vieillir dès qu'elle est écrite, et l'ardoise qui interroge deux secondes
//     plus tard aurait deux secondes de plus. `defiEnCours` corrige en plus
//     l'écart entre l'horloge du serveur et celle d'ici ;
//   · LE TABLEAU — podium et place, déjà coupés par le serveur. Rémy a choisi
//     « podium + ta place à toi » : afficher les trente prénoms classés devant
//     toute la classe désignerait le dernier à chaque défi.
//
// ── ON NE REJOUE PAS UN DÉFI DÉJÀ FAIT ────────────────────────────────────
//
// L'état de séance arrive toutes les dix secondes ; sans mémoire, le défi se
// relancerait à chaque réponse du serveur. On retient donc l'instant de début —
// il identifie le défi — dans `sessionStorage`, pour qu'un rechargement de page
// au milieu de la minute ne le redonne pas non plus.

import { defiEnCours, tableauDuDefi } from '../core/seanceDistante.js';
import { state } from '../core/state.js';
import { apiEleve, rafraichirSeance } from '../core/sync.js';
import { makeRng } from '../core/ids.js';
import { getExerciseById } from '../data/catalog.js';
import { getGenerator } from '../core/registry.js';

const CLE_FAITS = 'atoutmath-defis-faits';

export function initDefiUI() {
    document.addEventListener('seance_distante', () => regarder());
    document.addEventListener('role_change', () => regarder());
    regarder();
}

/** Les défis que CET appareil a déjà joués ou dont il a vu le tableau. */
function dejaVu(quoi) {
    try {
        return (sessionStorage.getItem(CLE_FAITS) || '').split(',').includes(String(quoi));
    } catch (e) { return false; }
}

function noter(quoi) {
    try {
        const vus = (sessionStorage.getItem(CLE_FAITS) || '').split(',').filter(Boolean);
        vus.push(String(quoi));
        sessionStorage.setItem(CLE_FAITS, vus.slice(-20).join(','));
    } catch (e) { /* navigation privée : on rejouera, et c'est moins grave */ }
}

let enCours = false;

// ── « TU N'AS PAS PARTICIPÉ » DIT À CEUX QUI VENAIENT DE JOUER ─────────────
//
// RÉMY, en classe, avec ses élèves : « pour le défi, on l'a fait avec les
// élèves une fois fini, on a eu le classement des 3 premiers mais les autres
// c'était noté, tu n'as pas participé à ce défi ».
//
// CE QUI SE PASSAIT. Le tableau est une PHOTO prise par le serveur à l'instant
// où l'ardoise l'interroge, et il ne s'affiche qu'une fois (`dejaVu`). Or le
// score de l'élève part dans une requête séparée, à la seconde où le défi
// tombe. Celui dont la photo arrive AVANT que son score ne soit rangé n'y
// figure pas — et il lisait alors, définitivement, qu'il n'avait pas joué. Le
// serveur, lui, avait bien son score : MESURÉ, trois élèves, trois scores en
// base, et l'un des trois lisant « Tu n'as pas participé à ce défi » dix-huit
// secondes après la fin, sans que l'écran se corrige jamais.
//
// DEUX CORRECTIONS, ET LA PREMIÈRE SUFFIRAIT PRESQUE :
//
//   · on REDEMANDE l'état dès que le score est parti, au lieu d'attendre le
//     battement suivant — la photo est alors prise après, par construction ;
//   · et l'on n'affiche pas une photo qui nous oublie quand on sait avoir
//     joué : on laisse passer quelques battements. La phrase « tu n'as pas
//     participé » reste vraie pour qui n'a vraiment pas joué, et c'est tout ce
//     qu'elle doit dire.
//
// POURQUOI NE PAS SE CONTENTER D'ATTENDRE ? Parce qu'un réseau qui tombe au
// mauvais moment remettrait l'élève dans le cas d'avant, sans rien à l'écran.
// Au bout de ATTENTES_MAX battements on montre le tableau quand même — avec,
// pour celui qui a joué, sa ligne telle qu'il l'a vécue plutôt qu'un démenti.
const ATTENTES_MAX = 4;
const attentes = new Map();

/** Ce que CET appareil a compté pendant le défi, pour le cas où le serveur tarde. */
let monScore = null;

function regarder() {
    // LE PROFESSEUR NE SE LANCE PAS UN DÉFI À LUI-MÊME. Son navigateur a servi
    // à essayer le côté élève et en garde le rattachement — c'est la même règle
    // que pour les mots, et elle est écrite une seule fois dans le noyau.
    if (state.isTeacherMode || enCours) return;
    const d = defiEnCours();
    if (d && !dejaVu('d' + d.debut)) {
        noter('d' + d.debut);
        jouer(d);
        return;
    }
    const t = tableauDuDefi();
    if (t && !dejaVu('t' + t.debut)) {
        // J'AI JOUÉ ET LE TABLEAU NE ME VOIT PAS : mon score n'est pas encore
        // arrivé. On laisse passer le battement — et l'on ne NOTE rien, sans
        // quoi le tableau juste, celui d'après, ne s'afficherait jamais.
        const joue = dejaVu('d' + t.debut);
        if (!t.moi && joue) {
            const n = (attentes.get(t.debut) || 0) + 1;
            attentes.set(t.debut, n);
            if (n <= ATTENTES_MAX) return;
        }
        noter('t' + t.debut);
        montrerLeTableau(t, joue ? monScore : null);
        return;
    }
    // LE TABLEAU DÉJÀ OUVERT SUIT LES SCORES QUI ARRIVENT : voir
    // `rafraichirLeTableau`. Sans cela, le premier servi garde un podium d'un
    // prénom pendant les cinq minutes d'affichage.
    if (t) rafraichirLeTableau(t, dejaVu('d' + t.debut) ? monScore : null);
}

/* ------------------------------------------------------------ Le plateau --- */

function plateau(contenu, classe = '') {
    const d = document.createElement('div');
    d.className = 'defi-voile ' + classe;
    d.innerHTML = contenu;
    document.body.appendChild(d);
    return d;
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* -------------------------------------------------------------- Le défi --- */

/**
 * LES QUESTIONS DU DÉFI, dans l'ordre et les mêmes pour tous.
 *
 * `makeRng(graine + '-' + n)` : le rang est DANS la graine, donc la question
 * numéro sept est la même chez les trente élèves, et elle ne dépend pas de la
 * vitesse à laquelle on y arrive.
 */
export function questionDuDefi(exo, graine, n) {
    const gen = exo && exo.generatorId ? getGenerator(exo.generatorId) : null;
    if (!gen) return null;
    try {
        return gen.generate(exo.params || {}, {
            rng: makeRng(`${graine}-${n}`), index: n, total: 999
        });
    } catch (e) { return null; }
}

async function jouer(defi) {
    enCours = true;
    const exo = getExerciseById(defi.exo);
    const voile = plateau(`
        <div class="defi-carte">
            <div class="defi-titre">⚡ DÉFI DE LA CLASSE</div>
            <div class="defi-exo">${echapper(exo ? exo.title : defi.exo)}</div>
            <div class="defi-compte" data-compte>${Math.max(1, defi.avant)}</div>
            <div class="defi-sous">Tout le monde commence en même temps.</div>
        </div>`, 'defi-voile--annonce');
    // L'ANNONCE, ET ELLE EST LA MOITIÉ DU MÉCANISME.
    //
    // RÉMY : « ça se lance pareil pour tout le monde ? au même moment ? ».
    // L'ardoise interroge le serveur toutes les DIX secondes : sans annonce,
    // celle qui vient de le faire apprenait le défi dix secondes après celle du
    // voisin, et perdait ces dix secondes-là. Le serveur fixe donc le départ
    // douze secondes plus tard, et chacun regarde le même compte à rebours
    // tomber. ON LE RELIT SUR L'HORLOGE DU SERVEUR à chaque tour, pour la même
    // raison qu'ailleurs : un onglet en arrière-plan fige les minuteurs.
    const compte = voile.querySelector('[data-compte]');
    for (;;) {
        const d = defiEnCours();
        if (!d) { voile.remove(); enCours = false; return; }
        if (d.avant <= 0) break;
        compte.textContent = String(d.avant);
        await dormir(250);
    }
    voile.remove();
    await questionner(defi, exo);
    enCours = false;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function questionner(defi, exo) {
    const voile = plateau(`
        <div class="defi-carte defi-carte--jeu">
            <!-- ON DIT CE QUE C'EST, MÊME PENDANT. Les trois secondes de départ
                 l'annoncent, mais un élève qui lève les yeux dix secondes plus
                 tard ne sait plus pourquoi son écran a changé. -->
            <div class="defi-titre">⚡ DÉFI DE LA CLASSE</div>
            <div class="defi-barre"><div class="defi-jauge" data-jauge></div></div>
            <div class="defi-haut">
                <!-- LE TEMPS TIENT EN UN SEUL ÉLÉMENT, et c'est la photo qui
                     l'a dit : dans un « justify-content: space-between », le
                     « 12 » et le « s » sont DEUX enfants, donc ils partent
                     chacun à un bout de la carte. -->
                <span class="defi-temps"><b data-reste>${defi.reste}</b> s</span>
                <span class="defi-score">✅ <b data-bonnes>0</b></span>
            </div>
            <div class="defi-question" data-question></div>
            <div class="defi-reponses" data-reponses></div>
        </div>`, 'defi-voile--jeu');

    const el = (s) => voile.querySelector(s);
    let n = 0;
    let bonnes = 0;
    let total = 0;
    let ms = 0;
    let fini = false;

    // LE TEMPS RESTANT SE RELIT SUR L'HORLOGE DU SERVEUR À CHAQUE SECONDE, et
    // ne se décompte pas tout seul : un onglet mis en arrière-plan fige les
    // minuteurs du navigateur, et l'élève se retrouverait avec trente secondes
    // de plus que son voisin.
    const tic = setInterval(() => {
        const d = defiEnCours();
        // APRÈS L'ANNONCE, `reste` compte la vraie minute : le défi a commencé
        // à la seconde où le serveur l'avait dit, chez les trente.
        const reste = d ? Math.min(d.reste, defi.duree) : 0;
        el('[data-reste]').textContent = String(Math.max(0, reste));
        el('[data-jauge]').style.width = `${Math.max(0, Math.min(100, (reste / defi.duree) * 100))}%`;
        if (reste <= 0 && !fini) { fini = true; terminer(); }
    }, 250);

    const terminer = async () => {
        clearInterval(tic);
        voile.remove();
        // CE QUE CET APPAREIL A COMPTÉ, gardé avant tout aller-retour : si le
        // serveur tarde, l'élève lira au moins son propre score plutôt qu'un
        // démenti. Voir `ATTENTES_MAX` plus haut.
        monScore = { bonnes, total };
        // ON ENVOIE LE SCORE, ET L'ÉCHEC N'EST PAS GRAVE : le serveur accepte
        // le renvoi, et il garde le meilleur.
        try {
            await apiEleve('/defi/score', { bonnes, total, ms });
            // PUIS ON REDEMANDE L'ÉTAT TOUT DE SUITE.
            //
            // C'est la moitié qui compte de la correction de Rémy — « les
            // autres c'était noté, tu n'as pas participé à ce défi ». Sans
            // cette ligne, le tableau arrive au battement suivant, jusqu'à dix
            // secondes plus tard ; et s'il arrive AVANT que le score ne soit
            // rangé, il oublie celui qui vient de jouer. En le redemandant
            // ici, la photo est prise après l'enregistrement, par
            // construction — et le tableau s'affiche sans attendre, ce qui est
            // de toute façon ce qu'on veut à la seconde où le défi tombe.
            await rafraichirSeance();
        } catch (e) { /* le réseau a hoqueté : on retentera au prochain état */ }
    };

    const poser = () => {
        const item = questionDuDefi(exo, defi.graine, n);
        if (!item) { fini = true; terminer(); return; }
        el('[data-question]').innerHTML = (item.prompt && item.prompt.html)
            ? item.prompt.html
            : `<div class="game-question">${echapper((item.prompt || {}).text || '')}</div>`;
        const zone = el('[data-reponses]');
        zone.innerHTML = '';
        const parti = Date.now();

        const repondre = (juste) => {
            if (fini) return;
            total++;
            if (juste) { bonnes++; ms += Date.now() - parti; }
            el('[data-bonnes]').textContent = String(bonnes);
            zone.classList.add(juste ? 'defi-ok' : 'defi-ko');
            setTimeout(() => { zone.classList.remove('defi-ok', 'defi-ko'); n++; poser(); }, 260);
        };

        // DEUX FAÇONS DE RÉPONDRE, « aux choix » — et c'est le choix de Rémy au
        // lancement, pas celui de l'élève : une classe où chacun choisit son
        // mode ne se compare plus.
        if (defi.mode === 'saisie' && item.answer !== undefined && item.answer !== null) {
            zone.innerHTML = '<input class="defi-saisie" type="text" inputmode="numeric" '
                + 'autocomplete="off" data-saisie><button class="defi-valider" '
                + 'type="button" data-valider>OK</button>';
            const champ = zone.querySelector('[data-saisie]');
            const valider = () => {
                const lu = (champ.value || '').trim().replace(',', '.').replace('-', '−');
                const attendu = String(item.answer).trim().replace(',', '.').replace('-', '−');
                repondre(lu !== '' && lu === attendu);
            };
            zone.querySelector('[data-valider]').onclick = valider;
            champ.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); valider(); } };
            champ.focus();
            return;
        }
        const choix = (item.choices || []).slice(0, 4);
        if (!choix.length) { n++; poser(); return; }
        choix.forEach((c) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'defi-choix';
            b.innerHTML = c.label !== undefined ? String(c.label) : String(c.value);
            b.onclick = () => repondre(!!c.correct);
            zone.appendChild(b);
        });
    };
    poser();
}

/* ------------------------------------------------------------ Le tableau --- */

// LE TABLEAU OUVERT, pour pouvoir le remettre à jour sans le rouvrir.
//
// TRENTE ÉLÈVES FINISSENT DANS LA MÊME SECONDE, et chacun reçoit la photo que
// le serveur a prise au moment où SON ardoise a demandé. Les premiers servis
// voyaient donc un podium d'un ou deux prénoms, figé pour les cinq minutes
// d'affichage. MESURÉ, trois élèves : « Toi : 1e sur 1 » chez l'une,
// « 2e sur 2 » chez l'autre, pour le même défi et au même instant.
//
// Le tableau se redessine donc tant qu'il est à l'écran, à chaque état qui
// descend. Ce n'est pas un rafraîchissement de confort : un classement qui
// change sous les yeux est gênant une seconde, un classement faux l'est toute
// l'heure — et c'est de ce tableau-là que Rémy parle ensuite à sa classe.
let tableauOuvert = null;

function corpsDuTableau(t, monScoreLocal) {
    const marches = ['🥇', '🥈', '🥉'];
    const podium = (t.podium || []).map((p, i) =>
        `<div class="defi-marche"><span class="defi-medaille">${marches[i] || ''}</span>`
        + `<span class="defi-prenom">${echapper(p.prenom)}</span>`
        + `<span class="defi-pts">${p.bonnes}</span></div>`).join('');
    // SA LIGNE À LUI, TOUJOURS, même quand il est sur le podium : c'est celle
    // qu'il cherche des yeux, et la faire disparaître dans ce cas-là
    // obligerait à se chercher dans la liste.
    const moi = t.moi
        ? `<div class="defi-moi">Toi : <b>${t.moi.rang}<sup>e</sup></b> sur `
            + `${t.participants} — <b>${t.moi.bonnes}</b> bonne${t.moi.bonnes > 1 ? 's' : ''} `
            + `réponse${t.moi.bonnes > 1 ? 's' : ''}</div>`
        // ON NE DÉMENT PAS CELUI QUI VIENT DE JOUER. Son score n'est pas
        // remonté — le réseau, le plus souvent —, et lui dire qu'il n'a pas
        // participé serait faux là où il est le mieux placé pour le savoir.
        : (monScoreLocal
            ? `<div class="defi-moi">Toi : <b>${monScoreLocal.bonnes}</b> `
                + `bonne${monScoreLocal.bonnes > 1 ? 's' : ''} `
                + `réponse${monScoreLocal.bonnes > 1 ? 's' : ''} — ton classement `
                + 'n\'a pas pu être calculé.</div>'
            : '<div class="defi-moi">Tu n\'as pas participé à ce défi.</div>');
    return `
        <div class="defi-carte defi-carte--fin">
            <div class="defi-titre">🏆 LE DÉFI EST FINI</div>
            <div class="defi-podium">${podium || '<div class="defi-moi">Personne n’a marqué.</div>'}</div>
            ${moi}
            <button type="button" class="defi-valider" data-fermer>On continue !</button>
        </div>`;
}

/** Pose les gestes du tableau : il n'y en a qu'un, et il le ferme. */
function brancherLeTableau(voile) {
    const b = voile.querySelector('[data-fermer]');
    if (!b) return;
    b.onclick = () => { voile.remove(); tableauOuvert = null; };
}

/**
 * REMET À JOUR LE TABLEAU DÉJÀ OUVERT, s'il parle bien du même défi.
 *
 * ON NE REND PAS LE FOYER AU BOUTON à chaque mise à jour : l'élève qui vient
 * d'appuyer sur « On continue ! » le verrait se rallumer sous son doigt.
 */
function rafraichirLeTableau(t, monScoreLocal) {
    if (!tableauOuvert || tableauOuvert.debut !== t.debut) return false;
    if (!document.body.contains(tableauOuvert.voile)) { tableauOuvert = null; return false; }
    tableauOuvert.voile.innerHTML = corpsDuTableau(t, monScoreLocal);
    brancherLeTableau(tableauOuvert.voile);
    return true;
}

function montrerLeTableau(t, monScoreLocal = null) {
    const voile = plateau(corpsDuTableau(t, monScoreLocal));
    tableauOuvert = { debut: t.debut, voile };
    brancherLeTableau(voile);
    const b = voile.querySelector('[data-fermer]');
    if (b) b.focus();
}
