// LES PETITS PROBLÈMES — et le schéma qui les rend lisibles.
//
// Un problème raté ne l'est presque jamais parce que l'élève ne sait pas
// calculer. Il l'est parce qu'il ne sait pas QUELLE opération faire — et il ne
// le sait pas parce qu'il n'a pas de représentation de la situation. « Tom a 6
// cartes de plus que Zoé » déclenche une addition chez presque tous les élèves
// quand on demande le nombre de Zoé, parce que le mot « plus » est là. Le mot
// décide à leur place.
//
// D'où le SCHÉMA, disponible sur simple demande à chaque énoncé. Ce n'est pas
// une aide de dépannage : c'est l'objet même de l'apprentissage. Un schéma en
// barres montre que le tout est fait de deux parts, et qu'on cherche une part —
// donc qu'on soustrait, quel que soit le mot employé.
//
// Le module fabrique les énoncés, les mauvaises réponses PLAUSIBLES (celles qui
// correspondent à l'erreur classique du type, pas à un nombre au hasard), le
// schéma sous forme de DONNÉES, et la correction pas à pas. Il ne dessine rien
// et ne connaît pas le DOM : le SVG se fait ailleurs, à partir des données.
//
// Les familles suivent la typologie de Vergnaud, celle des programmes du cycle
// 3 : composition, transformation, comparaison, groupes égaux, partage,
// quotition, proportionnalité, fraction d'une quantité, durées, et enfin les
// problèmes à deux étapes — qui sont d'une autre nature, puisqu'il faut y
// fabriquer une donnée qui ne figure pas dans l'énoncé.

const PRENOMS = ['Léa', 'Tom', 'Zoé', 'Malo', 'Inès', 'Noé', 'Jade', 'Adam',
    'Lina', 'Ethan', 'Anaïs', 'Rayan', 'Chloé', 'Sacha', 'Manon', 'Yanis'];

// Chaque objet porte son article et son accord : sans ça, on lit « 3 pomme »
// ou « la 3 billes », et l'énoncé perd toute crédibilité.
const OBJETS = [
    { s: 'bille', p: 'billes', d: 'des billes', g: 'f' },
    { s: 'carte', p: 'cartes', d: 'des cartes', g: 'f' },
    { s: 'image', p: 'images', d: 'des images', g: 'f' },
    { s: 'bonbon', p: 'bonbons', d: 'des bonbons', g: 'm' },
    { s: 'autocollant', p: 'autocollants', d: 'des autocollants', g: 'm' },
    { s: 'crayon', p: 'crayons', d: 'des crayons', g: 'm' },
    { s: 'timbre', p: 'timbres', d: 'des timbres', g: 'm' },
    { s: 'perle', p: 'perles', d: 'des perles', g: 'f' },
    { s: 'coquillage', p: 'coquillages', d: 'des coquillages', g: 'm' },
    { s: 'noisette', p: 'noisettes', d: 'des noisettes', g: 'f' }
];

// Les couleurs s'accordent en genre avec l'objet. « 46 coquillages vertes »
// suffit à décrédibiliser un énoncé — et un élève qui bute sur la langue ne
// lit plus le problème.
const COULEURS = [
    { m: 'rouges', f: 'rouges' },
    { m: 'verts', f: 'vertes' },
    { m: 'bleus', f: 'bleues' },
    { m: 'jaunes', f: 'jaunes' },
    { m: 'noirs', f: 'noires' },
    { m: 'blancs', f: 'blanches' }
];

/** La forme accordée d'une couleur pour un objet donné. */
export function couleur(c, objet) { return objet.g === 'f' ? c.f : c.m; }

const CONTENANTS = [
    { s: 'boîte', p: 'boîtes', g: 'f' },
    { s: 'sachet', p: 'sachets', g: 'm' },
    { s: 'paquet', p: 'paquets', g: 'm' },
    { s: 'panier', p: 'paniers', g: 'm' },
    { s: 'caisse', p: 'caisses', g: 'f' }
];

const MARCHANDISES = [
    { s: 'stylo', p: 'stylos', g: 'm' },
    { s: 'cahier', p: 'cahiers', g: 'm' },
    { s: 'gomme', p: 'gommes', g: 'f' },
    { s: 'règle', p: 'règles', g: 'f' },
    { s: 'classeur', p: 'classeurs', g: 'm' }
];

/**
 * « de » devant un mot : il s'élide devant une voyelle.
 *
 * « Combien y a-t-il de images ? » se lit comme une faute d'inattention du
 * professeur — et un élève qui bute sur la langue ne lit plus le problème.
 */
export function deElide(mot) {
    return /^[aeiouyàâäéèêëîïôöûüh]/i.test(mot) ? `d'${mot}` : `de ${mot}`;
}

/** « que » s'élide aussi : « qu'Adam », pas « que Adam ». */
export function queElide(mot) {
    return /^[aeiouyàâäéèêëîïôöûü]/i.test(mot) ? `qu'${mot}` : `que ${mot}`;
}

/** Accorde un nom avec son nombre. « 1 bille », « 4 billes ». */
export function accorder(n, objet) {
    return `${n} ${n > 1 ? objet.p : objet.s}`;
}

/** Un nombre à la française : virgule décimale, espace fine pour les milliers. */
export function nombre(x) {
    if (Number.isInteger(x)) return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return x.toFixed(2).replace(/0$/, '').replace('.', ',');
}

/** Un prix : « 4,50 € », jamais « 4.5 € ». */
export function prix(x) {
    return `${Number.isInteger(x) ? x : x.toFixed(2).replace('.', ',')} €`;
}

const heure = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
const duree = (m) => m % 60 === 0 ? `${m / 60} h` : (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60}`);

// --- Les familles ---------------------------------------------------------------
//
// Chacune rend :
//   enonce   le texte, en une ou deux phrases courtes
//   question ce qu'on demande
//   reponse  la valeur exacte
//   unite    ce qui suit le nombre dans la réponse (« billes », « € », rien)
//   faux     les réponses PLAUSIBLES, chacune avec l'erreur qu'elle traduit
//   schema   les données du dessin
//   etapes   la correction, une ligne par idée

export const FAMILLES = {

    // 1. COMPOSITION — deux parts font un tout. On cherche le tout.
    composition: {
        label: 'Réunir deux quantités',
        niveaux: ['CM2', '6ème'],
        skill: 'num.probleme.composition',
        tirer(rng) {
            const qui = rng.pick(PRENOMS);
            const o = rng.pick(OBJETS);
            const [c1, c2] = rng.shuffle(COULEURS).slice(0, 2);
            const a = rng.int(12, 48), b = rng.int(9, 39);
            return {
                enonce: `${qui} a ${accorder(a, o)} ${couleur(c1, o)} et ${accorder(b, o)} ${couleur(c2, o)}.`,
                question: `Combien ${qui} a-t-${elide(qui)} ${deElide(o.p)} en tout ?`,
                reponse: a + b, unite: o.p,
                faux: [
                    { v: a - b, pourquoi: 'C\'est la différence entre les deux tas, pas le total.' },
                    { v: a + b + 1, pourquoi: 'Une unité de trop : recompte la somme.' },
                    { v: a * 2, pourquoi: 'Tu as compté deux fois le premier tas.' }
                ],
                schema: { genre: 'barres', parts: [{ n: a, nom: couleur(c1, o) }, { n: b, nom: couleur(c2, o) }], total: '?' },
                etapes: [
                    'Les deux tas forment un seul ensemble : on les réunit.',
                    `${a} + ${b} = ${a + b}`,
                    `Il y a ${accorder(a + b, o)} en tout.`
                ]
            };
        }
    },

    // 2. COMPLÉMENT — le tout et une part sont connus, on cherche l'autre part.
    //    C'est ici que « en tout » fait écrire une addition à tort.
    complement: {
        label: 'Trouver la part qui manque',
        niveaux: ['CM2', '6ème'],
        skill: 'num.probleme.composition',
        tirer(rng) {
            const o = rng.pick(OBJETS);
            const [c1, c2] = rng.shuffle(COULEURS).slice(0, 2);
            const total = rng.int(40, 95), part = rng.int(12, total - 10);
            return {
                enonce: `Dans une boîte il y a ${accorder(total, o)}. ${accorder(part, o)} sont ${couleur(c1, o)}, les autres sont ${couleur(c2, o)}.`,
                question: `Combien y a-t-il ${deElide(o.p)} ${couleur(c2, o)} ?`,
                reponse: total - part, unite: o.p,
                faux: [
                    { v: total + part, pourquoi: 'Le mot « en tout » ne veut pas dire « additionne » : le total est DÉJÀ donné.' },
                    { v: total - part - 1, pourquoi: 'Presque : recompte la soustraction.' },
                    { v: part, pourquoi: `C'est le nombre de ${couleur(c1, o)}, pas de ${couleur(c2, o)}.` }
                ],
                schema: { genre: 'barres', parts: [{ n: part, nom: couleur(c1, o) }, { n: '?', nom: couleur(c2, o), taille: total - part }], total },
                etapes: [
                    'Le tout est connu, une part aussi : on retire la part connue.',
                    `${total} − ${part} = ${total - part}`,
                    `Il y a ${accorder(total - part, o)} ${couleur(c2, o)}.`
                ]
            };
        }
    },

    // 3. TRANSFORMATION — un état change. On cherche l'état final ou la
    //    transformation.
    transformation: {
        label: 'Un changement (gagner, perdre, dépenser)',
        niveaux: ['CM2', '6ème'],
        skill: 'num.probleme.transformation',
        tirer(rng) {
            const qui = rng.pick(PRENOMS);
            const debut = rng.int(25, 90);
            const change = rng.int(8, Math.min(30, debut - 5));
            const gagne = rng.bool();
            const fin = gagne ? debut + change : debut - change;
            const chercheFin = rng.bool();
            if (chercheFin) {
                return {
                    enonce: `${qui} avait ${prix(debut)} dans sa tirelire. ${elide(qui) === 'il' ? 'Il' : 'Elle'} ${gagne ? 'reçoit' : 'dépense'} ${prix(change)}.`,
                    question: `Combien ${qui} a-t-${elide(qui)} maintenant ?`,
                    reponse: fin, unite: '€',
                    faux: [
                        { v: gagne ? debut - change : debut + change, pourquoi: `${gagne ? 'Recevoir, c\'est en AVOIR PLUS' : 'Dépenser, c\'est en avoir MOINS'} : l\'opération est inversée.` },
                        { v: change, pourquoi: 'C\'est la somme reçue ou dépensée, pas ce qui reste.' },
                        { v: fin + (gagne ? 1 : -1), pourquoi: 'Une unité d\'écart : refais le calcul posément.' }
                    ],
                    schema: { genre: 'fleche', debut, fleche: (gagne ? '+ ' : '− ') + change, fin: '?' },
                    etapes: [
                        `${gagne ? 'Recevoir augmente' : 'Dépenser diminue'} la somme de départ.`,
                        `${debut} ${gagne ? '+' : '−'} ${change} = ${fin}`,
                        `${qui} a maintenant ${prix(fin)}.`
                    ]
                };
            }
            return {
                enonce: `${qui} avait ${prix(debut)}. Après ${gagne ? 'avoir reçu de l\'argent' : 'ses achats'}, ${elide(qui)} a ${prix(fin)}.`,
                question: `Combien ${qui} a-t-${elide(qui)} ${gagne ? 'reçu' : 'dépensé'} ?`,
                reponse: change, unite: '€',
                faux: [
                    { v: debut + fin, pourquoi: 'On cherche l\'ÉCART entre les deux sommes, pas leur somme.' },
                    { v: fin, pourquoi: 'C\'est ce qui reste à la fin, pas ce qui a changé.' },
                    { v: Math.abs(change - 2), pourquoi: 'Presque : refais la soustraction.' }
                ],
                schema: { genre: 'fleche', debut, fleche: '?', fin },
                etapes: [
                    'On connaît le départ et l\'arrivée : la transformation est leur écart.',
                    `${Math.max(debut, fin)} − ${Math.min(debut, fin)} = ${change}`,
                    `${qui} a ${gagne ? 'reçu' : 'dépensé'} ${prix(change)}.`
                ]
            };
        }
    },

    // 4. COMPARAISON — « de plus que ». Le piège de vocabulaire par excellence.
    comparaison: {
        label: 'Comparer deux quantités',
        niveaux: ['CM2', '6ème'],
        skill: 'num.probleme.comparaison',
        tirer(rng) {
            const [a, b] = rng.shuffle(PRENOMS).slice(0, 2);
            const o = rng.pick(OBJETS);
            const grand = rng.int(30, 80), ecart = rng.int(6, 25);
            const petit = grand - ecart;
            return {
                enonce: `${a} a ${accorder(grand, o)}. ${elide(a) === 'il' ? 'Il' : 'Elle'} en a ${ecart} de plus ${queElide(b)}.`,
                question: `Combien ${b} a-t-${elide(b)} ${deElide(o.p)} ?`,
                reponse: petit, unite: o.p,
                faux: [
                    { v: grand + ecart, pourquoi: 'Le mot « plus » est un piège : c\'est A qui en a plus, donc B en a MOINS.' },
                    { v: grand, pourquoi: `C'est le nombre de ${a}, pas celui de ${b}.` },
                    { v: ecart, pourquoi: 'C\'est l\'écart entre les deux, pas une quantité.' }
                ],
                schema: {
                    genre: 'comparaison',
                    lignes: [{ nom: a, taille: grand, val: grand }, { nom: b, taille: petit, val: '?' }],
                    ecart
                },
                etapes: [
                    `${a} en a PLUS : sa barre est la plus longue.`,
                    `Pour trouver ${b}, on enlève l'écart : ${grand} − ${ecart} = ${petit}`,
                    `${b} a ${accorder(petit, o)}.`
                ]
            };
        }
    },

    // 5. GROUPES ÉGAUX — la multiplication comme « n fois p ».
    groupes: {
        label: 'Des groupes tous pareils',
        niveaux: ['CM2', '6ème'],
        skill: 'num.probleme.multiplication',
        tirer(rng) {
            const c = rng.pick(CONTENANTS);
            const o = rng.pick(OBJETS);
            const n = rng.int(3, 9), par = rng.int(6, 14);
            return {
                enonce: `Un marchand range ${o.d} dans ${n} ${c.p}. Chaque ${c.s} contient ${accorder(par, o)}.`,
                question: `Combien y a-t-il ${deElide(o.p)} en tout ?`,
                reponse: n * par, unite: o.p,
                faux: [
                    { v: n + par, pourquoi: 'Additionner ne convient pas : il y a n GROUPES de p, donc on multiplie.' },
                    { v: n * par - par, pourquoi: `Il manque un ${c.s} : ils sont ${n}, pas ${n - 1}.` },
                    { v: par, pourquoi: `C'est le contenu d'UN seul ${c.s}.` }
                ],
                schema: { genre: 'groupes', n, par, nomGroupe: c.s, nomGroupes: c.p, nomObjet: o.p },
                etapes: [
                    `${n} groupes qui contiennent chacun la même chose : c'est une multiplication.`,
                    `${n} × ${par} = ${n * par}`,
                    `Il y a ${accorder(n * par, o)} en tout.`
                ]
            };
        }
    },

    // 6. PARTAGE — division : combien dans chaque part ?
    partage: {
        label: 'Partager équitablement',
        niveaux: ['CM2', '6ème'],
        skill: 'num.probleme.division',
        tirer(rng) {
            const o = rng.pick(OBJETS);
            const parts = rng.int(3, 8), par = rng.int(5, 15);
            const total = parts * par;
            return {
                enonce: `${accorder(total, o)} sont ${o.g === 'f' ? 'partagées' : 'partagés'} équitablement entre ${parts} enfants.`,
                question: 'Combien chaque enfant en reçoit-il ?',
                reponse: par, unite: o.p,
                faux: [
                    { v: total - parts, pourquoi: 'Partager n\'est pas soustraire : on cherche le contenu d\'UNE part.' },
                    { v: parts, pourquoi: 'C\'est le nombre d\'enfants, pas ce que chacun reçoit.' },
                    { v: par + 1, pourquoi: 'Vérifie : ce nombre multiplié par le nombre d\'enfants doit redonner le total.' }
                ],
                schema: { genre: 'groupes', n: parts, par: '?', nomGroupe: 'enfant', nomGroupes: 'enfants', nomObjet: o.p, total },
                etapes: [
                    'Partager en parts égales, c\'est diviser.',
                    `${total} ÷ ${parts} = ${par}`,
                    `Chaque enfant reçoit ${accorder(par, o)}. Vérification : ${parts} × ${par} = ${total}.`
                ]
            };
        }
    },

    // 7. QUOTITION AVEC RESTE — « combien de fois ? » et ce qui déborde.
    quotition: {
        label: 'Combien de paquets, et le reste',
        niveaux: ['6ème', '5ème'],
        skill: 'num.probleme.division',
        tirer(rng) {
            const c = rng.pick(CONTENANTS);
            const o = rng.pick(OBJETS);
            const par = rng.int(4, 9);
            const q = rng.int(4, 11), reste = rng.int(1, par - 1);
            const total = q * par + reste;
            return {
                enonce: `On range ${accorder(total, o)} dans des ${c.p} de ${par}.`,
                question: `Combien ${deElide(c.p)} peut-on remplir complètement ?`,
                reponse: q, unite: c.p,
                faux: [
                    { v: q + 1, pourquoi: `Le dernier ${c.s} n'est pas plein : il ne compte pas.` },
                    { v: reste, pourquoi: `C'est le reste — ce qui n'entre dans aucun ${c.s} plein.` },
                    { v: total - par, pourquoi: 'Soustraire une fois ne suffit pas : il faut retirer autant de fois que possible.' }
                ],
                schema: { genre: 'groupes', n: q, par, nomGroupe: c.s, nomGroupes: c.p, nomObjet: o.p, total, reste },
                etapes: [
                    `On cherche combien de fois ${par} tient dans ${total}.`,
                    `${total} = ${q} × ${par} + ${reste}`,
                    `On remplit ${q} ${c.p}, et il reste ${accorder(reste, o)}.`
                ]
            };
        }
    },

    // 8. PROPORTIONNALITÉ — passer par l'unité.
    proportion: {
        label: 'Le prix de plusieurs articles',
        niveaux: ['6ème', '5ème'],
        skill: 'num.probleme.proportion',
        tirer(rng) {
            const m = rng.pick(MARCHANDISES);
            const unitaire = rng.pick([0.5, 0.8, 1.2, 1.5, 2, 2.5, 3]);
            const n1 = rng.int(3, 6), n2 = rng.int(7, 12);
            const p1 = +(unitaire * n1).toFixed(2), p2 = +(unitaire * n2).toFixed(2);
            return {
                enonce: `${n1} ${m.p} identiques coûtent ${prix(p1)}.`,
                question: `Combien coûtent ${n2} ${m.p} ?`,
                reponse: p2, unite: '€',
                faux: [
                    { v: +(p1 + n2).toFixed(2), pourquoi: 'On n\'ajoute pas des articles à des euros : il faut d\'abord le prix d\'UN article.' },
                    { v: +(p1 * n2).toFixed(2), pourquoi: `${prix(p1)} est le prix de ${n1} articles, pas d'un seul.` },
                    { v: +(unitaire * (n2 - 1)).toFixed(2), pourquoi: 'Un article de moins : recompte.' }
                ],
                schema: {
                    genre: 'tableau',
                    entetes: [m.p, 'prix'],
                    lignes: [[n1, prix(p1)], [1, prix(unitaire)], [n2, '?']]
                },
                etapes: [
                    'On passe par le prix d\'UN seul article.',
                    `${prix(p1)} ÷ ${n1} = ${prix(unitaire)}`,
                    `${prix(unitaire)} × ${n2} = ${prix(p2)}`
                ]
            };
        }
    },

    // 9. FRACTION D'UNE QUANTITÉ.
    fraction: {
        label: 'Une fraction d\'une quantité',
        niveaux: ['6ème', '5ème'],
        skill: 'num.probleme.fraction',
        tirer(rng) {
            const den = rng.pick([2, 3, 4, 5, 6]);
            const num = rng.int(1, den - 1) || 1;
            const par = rng.int(4, 12);
            const total = den * par;
            const rep = num * par;
            const o = rng.pick(OBJETS);
            return {
                enonce: `Une classe a ${accorder(total, o)}. ${num === 1 ? 'Le' : 'Les'} ${num}/${den} sont ${o.g === 'f' ? 'abîmées' : 'abîmés'}.`,
                question: `Combien ${deElide(o.p)} sont ${o.g === 'f' ? 'abîmées' : 'abîmés'} ?`,
                reponse: rep, unite: o.p,
                faux: [
                    { v: par, pourquoi: `C'est UN ${den}ᵉ, pas ${num} ${den}ᵉ${num > 1 ? 's' : ''}.` },
                    { v: total - rep, pourquoi: `C'est ce qui reste en bon état, pas ce qui est abîmé.` },
                    { v: total / num || total, pourquoi: 'On divise par le DÉNOMINATEUR, puis on multiplie par le numérateur.' }
                ],
                schema: { genre: 'fractionBarre', den, num, total, par },
                etapes: [
                    `On partage en ${den} parts égales : ${total} ÷ ${den} = ${par}.`,
                    `On en prend ${num} : ${par} × ${num} = ${rep}.`,
                    `${accorder(rep, o)} sont concernées.`
                ]
            };
        }
    },

    // 10. DURÉES — la seule famille où l'on ne compte pas en base dix.
    duree: {
        label: 'Des horaires et des durées',
        niveaux: ['6ème', '5ème'],
        skill: 'num.probleme.duree',
        tirer(rng) {
            const debut = rng.int(8, 19) * 60 + rng.pick([0, 10, 15, 20, 30, 40, 45, 50]);
            const d = rng.pick([45, 75, 90, 100, 105, 120, 135]);
            const fin = debut + d;
            return {
                enonce: `Un film commence à ${heure(debut)} et dure ${duree(d)}.`,
                question: 'À quelle heure se termine-t-il ?',
                reponse: fin, unite: 'heure', format: 'heure',
                faux: [
                    { v: debut + d - 40, pourquoi: 'Attention : une heure fait 60 minutes, pas 100.' },
                    { v: debut + Math.round(d / 60) * 60, pourquoi: 'Les minutes en trop ont disparu : ajoute la durée complète.' },
                    { v: debut, pourquoi: 'C\'est l\'heure de début.' }
                ],
                schema: { genre: 'ligne', debut: heure(debut), saut: duree(d), fin: '?' },
                etapes: [
                    'On ajoute la durée à l\'heure de début, en gardant 60 minutes par heure.',
                    `${heure(debut)} + ${duree(d)} = ${heure(fin)}`,
                    `Le film se termine à ${heure(fin)}.`
                ]
            };
        }
    },

    // 11. DEUX ÉTAPES — il faut FABRIQUER une donnée absente de l'énoncé.
    //     C'est ce qui distingue un problème d'un calcul déguisé.
    deuxEtapes: {
        label: 'Deux étapes : la monnaie rendue',
        niveaux: ['6ème', '5ème'],
        skill: 'num.probleme.etapes',
        tirer(rng) {
            const qui = rng.pick(PRENOMS);
            const m = rng.pick(MARCHANDISES);
            const n = rng.int(3, 6);
            const pu = rng.pick([1.5, 2, 2.5, 3, 4]);
            const cout = +(n * pu).toFixed(2);
            const billet = [10, 20, 50].find(b => b > cout + 1) || 50;
            const rendu = +(billet - cout).toFixed(2);
            return {
                enonce: `${qui} achète ${n} ${m.p} à ${prix(pu)} l'un et paie avec un billet de ${prix(billet)}.`,
                question: 'Combien lui rend-on ?',
                reponse: rendu, unite: '€',
                faux: [
                    { v: cout, pourquoi: 'C\'est le prix des articles, pas la monnaie rendue.' },
                    { v: +(billet - pu).toFixed(2), pourquoi: `Il y a ${n} articles, pas un seul : calcule d'abord le total.` },
                    { v: +(billet + cout).toFixed(2), pourquoi: 'On rend de la monnaie : le billet DIMINUE du prix payé.' }
                ],
                schema: {
                    genre: 'etapes',
                    lignes: [
                        { titre: 'Étape 1 — le total', calcul: `${n} × ${prix(pu)} = ${prix(cout)}` },
                        { titre: 'Étape 2 — la monnaie', calcul: `${prix(billet)} − ${prix(cout)} = ?` }
                    ]
                },
                etapes: [
                    'L\'énoncé ne donne pas le prix total : il faut le fabriquer.',
                    `${n} × ${prix(pu)} = ${prix(cout)}`,
                    `${prix(billet)} − ${prix(cout)} = ${prix(rendu)}`
                ]
            };
        }
    }
};

/** « il » ou « elle », selon le prénom — pour que les phrases soient justes. */
const FEMININS = new Set(['Léa', 'Zoé', 'Inès', 'Jade', 'Lina', 'Anaïs', 'Chloé', 'Manon']);
function elide(prenom) { return FEMININS.has(prenom) ? 'elle' : 'il'; }

export const IDS_FAMILLES = Object.keys(FAMILLES);

/** Les familles disponibles pour un niveau donné. */
export function famillesDe(niveau) {
    return IDS_FAMILLES.filter(id => !niveau || FAMILLES[id].niveaux.includes(niveau));
}

/**
 * Met en forme une valeur de réponse. Les durées ne s'écrivent pas comme les
 * euros, et « 12 » tout seul ne veut rien dire : la réponse d'un problème
 * porte TOUJOURS son unité.
 */
export function direReponse(p, v) {
    if (p.format === 'heure') return heure(Math.max(0, Math.round(v)));
    if (p.unite === '€') return prix(v);
    if (!p.unite) return nombre(v);
    return `${nombre(v)} ${p.unite}`;
}

/**
 * Tire un problème, avec ses quatre propositions mélangées.
 *
 * Les mauvaises réponses ne sont pas des nombres au hasard : chacune est le
 * résultat d'une erreur RÉELLE et fréquente sur ce type de problème. C'est ce
 * qui permet de dire à l'élève ce qu'il a fait, et non seulement qu'il s'est
 * trompé. Elles portent donc chacune leur explication.
 */
export function tirerProbleme(famille, rng) {
    const f = FAMILLES[famille];
    if (!f) return null;
    for (let essai = 0; essai < 60; essai++) {
        const p = f.tirer(rng);
        // Un mauvais choix qui vaut la bonne réponse rendrait l'exercice
        // injouable ; un doublon donnerait deux fois la même chose à lire.
        const vus = new Set([arrondi(p.reponse)]);
        const faux = [];
        for (const m of p.faux) {
            const v = arrondi(m.v);
            if (v === null || vus.has(v) || v < 0) continue;
            vus.add(v);
            faux.push({ ...m, v });
        }
        if (faux.length < 3) continue;
        const choix = rng.shuffle([
            { v: p.reponse, juste: true },
            ...faux.slice(0, 3).map(m => ({ v: m.v, juste: false, pourquoi: m.pourquoi }))
        ]);
        return { ...p, famille, libelleFamille: f.label, skill: f.skill, choix };
    }
    return null;
}

const arrondi = (v) => (typeof v === 'number' && isFinite(v)) ? Math.round(v * 100) / 100 : null;
