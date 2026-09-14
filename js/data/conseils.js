// DEUX CENTS CONSEILS DE MÉTHODE.
//
// Rémy : « une liste de conseil […] une centaine de chaque ce serait bien ».
//
// LA RÈGLE QUI LES A TOUS ÉCRITS : un conseil doit pouvoir être SUIVI
// AUJOURD'HUI. « Travaille régulièrement » n'est pas un conseil, c'est un
// reproche déguisé — l'élève sait déjà, et il ne saura pas davantage quoi faire
// en fermant la page. « Avant de calculer, entoure ce que la question demande »
// se fait dans les cinq secondes, sur l'exercice qu'il a sous les yeux.
//
// UN MOT INTERDIT : « DESSIN ». Rémy : « dans les conseils n'utilise pas le
// mot dessin mais plutôt schéma ou tracé. » Un dessin, en classe, c'est un
// travail d'arts plastiques : l'élève à qui l'on dit « fais un dessin » soigne
// et perd son temps, quand ce qu'on lui demande est une figure à main levée
// qui porte les données. « Schéma » et « tracé » disent le geste utile.
//
// Trois familles, mêlées volontairement : la MÉTHODE (comment on s'y prend),
// l'ERREUR (comment on la repère), le TRAVAIL (comment on apprend). Les
// séparer en trois écrans reviendrait à demander à l'élève de choisir sa
// catégorie avant d'avoir lu — et personne ne clique sur « erreurs ».
//
// DEUX CENTS, ET NON CENT. Rémy : « mets-en alors deux cents et un clic oui ou
// non et je te l'envoie. » Un conseil qui sonne creux vaut moins que pas de
// conseil du tout, et c'est un professeur devant sa classe qui sait lesquels
// sonnent creux — pas celui qui les écrit. Le banc d'essai porte donc un ✓ et
// un ✕ sur chaque entrée.
//
// Ils ne portent JAMAIS sur une notion précise. Un conseil de contenu tombé au
// hasard un matin n'a aucune chance de correspondre à ce que l'élève travaille
// ce jour-là ; le carnet d'erreurs, lui, sait de quoi il parle et s'en charge.

export const CONSEILS = [
    // --- Lire l'énoncé ------------------------------------------------------
    'Quand tu bloques, relis la question à voix haute. La moitié des erreurs viennent d\'un mot lu trop vite.',
    'Avant de calculer, entoure ce que la question demande. On répond souvent très bien à une autre question.',
    'Un énoncé long n\'est pas un énoncé difficile. Coupe-le en phrases et traite-les une par une.',
    'Souligne les nombres ET leur unité. « 3 » et « 3 cm » ne se manipulent pas pareil.',
    'Repère le mot qui commande : calcule, trace, justifie, compare. Il dit ce qu\'on attend de toi.',
    '« Au moins », « au plus », « exactement » : ces trois mots changent toute la réponse. Ne les saute pas.',
    'Si l\'énoncé donne une figure, cherche dessus ce que la phrase vient de dire. C\'est là que se cachent les données.',
    'Un énoncé qui te semble impossible cache presque toujours une donnée que tu n\'as pas encore utilisée. Cherche-la.',
    'Recopie la question dans ta tête avec tes mots. Si tu n\'y arrives pas, c\'est qu\'il faut la relire.',
    'Quand il y a plusieurs questions, lis-les toutes avant de commencer : la première prépare souvent la dernière.',

    // --- Avant de se lancer -------------------------------------------------
    'Avant de calculer, demande-toi si le résultat sera grand ou petit. Tu repéreras tes erreurs toi-même.',
    'Estime d\'abord, calcule ensuite. Une estimation fausse de dix fois se voit ; un chiffre faux, non.',
    'Écris ce que tu sais avant de chercher ce que tu ne sais pas. La suite vient souvent toute seule.',
    'Si tu ne sais pas par où commencer, commence par faire un schéma. Même moche.',
    'Cherche un cas plus simple : avec 2 au lieu de 100. La méthode qui marche sur 2 marchera sur 100.',
    'Un problème avec de grands nombres se comprend avec de petits nombres. Remplace, comprends, puis remets les vrais.',
    'Note les unités dès le départ. Une longueur ne s\'ajoute pas à une aire, et les unités te le diront.',
    'Avant de te lancer dans un long calcul, vérifie que tu vises la bonne chose. Trois minutes bien dirigées valent dix minutes au hasard.',
    'Demande-toi à quel chapitre ressemble l\'exercice. Tu retrouveras la méthode plus vite qu\'en la réinventant.',
    'Si deux méthodes te viennent, prends celle que tu sais expliquer. C\'est celle que tu maîtrises.',

    // --- Pendant le calcul ---------------------------------------------------
    'Écris une étape par ligne. Les erreurs se cachent dans les lignes où l\'on a fait deux choses à la fois.',
    'Recopie tout ce qui reste quand tu passes à la ligne suivante. C\'est le « − 2 » oublié qui coûte des points, pas la règle.',
    'Ne calcule pas de tête ce que tu peux poser. La tête se trompe sans prévenir.',
    'Garde tes calculs même quand ils sont faux : c\'est en les relisant qu\'on trouve où ça a dérapé.',
    'Un signe moins se recopie. C\'est l\'erreur la plus fréquente de tout le collège, et elle ne vient jamais du raisonnement.',
    'Les parenthèses d\'abord, toujours. Quand elles ne sont pas écrites, demande-toi où elles devraient être.',
    'Si un calcul devient monstrueux, arrête-toi : ce n\'est probablement pas la bonne route.',
    'Simplifie avant de multiplier, pas après. 12/18 se simplifie en 2/3 ; 12 × 25 ne se simplifie plus.',
    'Aligne tes signes égal les uns sous les autres. Une copie alignée se relit ; une copie en escalier, non.',
    'Écris le résultat sous la forme demandée. Une réponse juste dans la mauvaise écriture perd des points, et c\'est dommage.',

    // --- Vérifier ------------------------------------------------------------
    'Vérifie ton résultat en le remettant dans l\'énoncé. C\'est la seule vérification qui prouve quelque chose.',
    'Relis ta réponse en te demandant : est-ce que ça a un sens ? Un âge de 300 ans, une longueur négative, ça se repère.',
    'Refaire le même calcul de la même façon ne vérifie rien. Fais-le autrement, ou vérifie l\'ordre de grandeur.',
    'Quand tu as fini, relis la question. Tu as peut-être calculé le périmètre alors qu\'on demandait l\'aire.',
    'Un résultat rond n\'est pas forcément juste, et un résultat compliqué n\'est pas forcément faux.',
    'Vérifie la dernière ligne autant que la première. La fatigue frappe à la fin.',
    'Si tu as le temps en contrôle, ne relis pas tout : relis les questions où tu as hésité. C\'est là que sont les erreurs.',
    'Compte tes réponses : autant de réponses que de questions. Une question sautée est un zéro gratuit.',
    'Une réponse sans unité est une réponse à moitié écrite.',
    'Encadre ta réponse finale. Le correcteur doit la trouver en une seconde.',

    // --- L'erreur -------------------------------------------------------------
    'Se tromper puis comprendre pourquoi vaut mieux que réussir sans savoir comment.',
    'Une erreur notée dans ton carnet n\'est pas une mauvaise note : c\'est une question que tu vas apprendre à refaire.',
    'Quand tu te trompes, cherche à quel moment exactement. « J\'ai tout faux » n\'apprend rien ; « j\'ai inversé à la troisième ligne » apprend tout.',
    'La même erreur qui revient trois fois n\'est pas de l\'étourderie : c\'est une règle mal comprise. Va la revoir.',
    'Refais l\'exercice raté le lendemain, pas tout de suite. Si tu sais encore le faire demain, tu l\'as compris.',
    'Ne barre pas ce qui est faux jusqu\'à l\'illisible : d\'un trait, et on voit encore. Ton erreur te servira.',
    'Distinguer « je ne savais pas » de « j\'ai été trop vite » change ce qu\'il faut travailler.',
    'Une erreur de calcul dans un raisonnement juste, c\'est un raisonnement juste. Ne jette pas tout.',
    'Si tu trouves un résultat bizarre, garde-le et écris pourquoi il te semble bizarre. C\'est déjà des points.',
    'Personne n\'a jamais appris les maths sans se tromper. Ceux qui semblent ne jamais se tromper se trompent en brouillon.',

    // --- Apprendre -------------------------------------------------------------
    'Dix minutes par jour valent mieux qu\'une heure le dimanche : la mémoire retient ce qu\'elle revoit.',
    'Apprendre une leçon, c\'est pouvoir la réciter SANS la lire. Ferme le cahier et essaie.',
    'Une règle qu\'on ne sait pas dire avec ses mots n\'est pas apprise, elle est recopiée.',
    'Fabrique-toi un exemple pour chaque règle. Une règle sans exemple s\'oublie en trois jours.',
    'Revois ta leçon le soir même, cinq minutes. C\'est le meilleur rapport temps/résultat de toute ta scolarité.',
    'Explique un exercice à quelqu\'un. Si tu y arrives, tu l\'as compris ; sinon, tu viens de trouver quoi revoir.',
    'Les tables de multiplication ne se comprennent pas, elles se savent. Deux minutes par jour, et c\'est réglé pour la vie.',
    'Apprendre par cœur ce qui doit l\'être libère la tête pour ce qui demande à réfléchir.',
    'Relire n\'est pas apprendre. Cache la page et essaie de la retrouver : c\'est ça, apprendre.',
    'Écris les formules à la main plutôt que de les relire. La main retient ce que l\'œil oublie.',

    // --- Aide et outils ---------------------------------------------------------
    'Le bouton d\'indice ne donne jamais la réponse : il donne la première chose à regarder. Sers-t\'en tôt plutôt que tard.',
    'Le robot fait l\'exercice devant toi en expliquant chaque geste. C\'est le meilleur départ sur un exercice inconnu.',
    'Demander de l\'aide après avoir vraiment essayé, ce n\'est pas tricher : c\'est la manière la plus rapide d\'apprendre.',
    'Poser une question précise — « je ne comprends pas pourquoi on divise ici » — obtient une réponse utile. « J\'ai rien compris », non.',
    'La calculatrice ne réfléchit pas à ta place. Elle calcule ce que tu tapes, même si c\'est faux.',
    'Vérifie ce que la calculatrice te rend : une touche à côté donne un résultat cent fois trop grand.',
    'Un brouillon sert à essayer, pas à être propre. N\'aie pas peur de le salir.',
    'Garde ton cahier de leçons ouvert quand tu t\'entraînes. On n\'apprend pas en se privant de ce qu\'on cherche à retenir.',
    'Une règle bien tracée, un compas bien serré : la moitié des erreurs de géométrie sont des erreurs de matériel.',
    'Taille ton crayon. Un trait de deux millimètres de large ne passe pas par un point.',

    // --- Géométrie ---------------------------------------------------------------
    'En géométrie, fais toujours une figure — même quand on ne le demande pas.',
    'Fais ta figure grande. Une figure minuscule cache justement ce qu\'on cherche à voir.',
    'Code ta figure : les angles droits, les longueurs égales, les parallèles. Le codage remplace une phrase.',
    'Une figure « à main levée » n\'est pas une figure bâclée : c\'est une figure rapide où l\'on note les données.',
    'Ne mesure jamais sur la figure pour répondre. La figure illustre, elle ne démontre pas.',
    'Nomme tes points au fur et à mesure. Une figure sans lettres ne se raconte pas.',
    'Pour justifier, cherche d\'abord la propriété du cours. Sans propriété, ce n\'est pas une justification, c\'est une impression.',
    'Écris tes justifications en trois temps : ce que tu sais, la propriété, la conclusion. Toujours dans cet ordre.',
    'Quand une figure est chargée, refais-la à côté avec seulement ce dont tu as besoin.',
    'Un angle droit qui n\'est pas codé sur la figure n\'est pas un angle droit. Même s\'il en a l\'air.',

    // --- Nombres et calcul mental --------------------------------------------------
    'Le calcul mental n\'est pas un don : c\'est un entraînement. Cinq minutes par jour suffisent.',
    'Pour multiplier par 5, multiplie par 10 et prends la moitié. C\'est plus rapide, et c\'est toujours vrai.',
    'Pour multiplier par 9, multiplie par 10 et retire une fois. 7 × 9 = 70 − 7 = 63.',
    'Ajouter 9, c\'est ajouter 10 et retirer 1. Ta tête ira deux fois plus vite.',
    'Connaître les doubles et les moitiés jusqu\'à 100 débloque la moitié du calcul mental.',
    'Un nombre est divisible par 3 si la somme de ses chiffres l\'est. Ça marche à tous les coups.',
    'La virgule ne se déplace pas : ce sont les chiffres qui changent de rang. C\'est la même chose, mais on se trompe moins.',
    'Multiplier ne rend pas toujours plus grand : × 0,5, c\'est prendre la moitié.',
    'Retiens les carrés jusqu\'à 15². Ils ressortent partout, de Pythagore aux racines.',
    'Compare deux fractions en les mettant au même dénominateur, jamais en comparant les chiffres.',

    // --- En classe et en contrôle ----------------------------------------------------
    'Commence un contrôle par ce que tu sais faire. Les points faciles se prennent en premier.',
    'Une question sautée n\'est pas une question perdue : reviens-y à la fin, souvent elle s\'est éclaircie.',
    'Écris ce que tu as commencé, même si tu n\'aboutis pas. Un raisonnement entamé rapporte des points ; une page blanche, zéro.',
    'Note la date et le numéro de l\'exercice. Un correcteur qui cherche perd patience avant toi.',
    'Prends tes notes en classe même si tu comprends : tu comprends aujourd\'hui, tu réviseras dans trois semaines.',
    'Quand tu n\'as pas compris en classe, note-le en marge d\'une croix. Le soir, tu sauras quoi reprendre.',
    'La dernière question d\'un exercice utilise presque toujours les précédentes. Relis-les avant de sécher.',
    'Dormir avant un contrôle vaut mieux que réviser une heure de plus. La mémoire se range pendant la nuit.',
    'Respire un coup avant de commencer. Le stress fait sauter des lignes, pas des connaissances.',
    'Compare ta copie corrigée avec ton cahier, pas avec la note. C\'est la seule façon d\'en tirer quelque chose.',

    // --- Deuxième centaine : relire et vérifier --------------------------------------
    'Avant de rendre, relis ta première ligne. C\'est celle qu\'on écrit le plus vite, et celle où l\'on recopie de travers.',
    'Vérifie ton résultat en l\'estimant : si tu attendais « environ 50 » et que tu trouves 500, il y a un zéro de trop.',
    'Une réponse sans unité n\'est pas une réponse. Relis ton résultat à voix haute et demande-toi « 12 quoi ? ».',
    'Quand tu as fini, remplace ta réponse dans l\'énoncé. Si la phrase devient vraie, tu as gagné.',
    'Repasse sur les signes moins avant de rendre. C\'est ce qui se perd le plus souvent en recopiant.',
    'Si deux méthodes donnent le même résultat, tu peux être tranquille. Si elles diffèrent, tu viens de trouver ton erreur.',
    'Vérifie l\'ordre de grandeur avant les décimales. Une virgule mal placée se voit tout de suite si l\'on sait ce qu\'on attend.',
    'Le résultat d\'une soustraction est plus petit que le nombre de départ — sauf avec les relatifs. Vérifie que tu es dans le bon cas.',
    'Compte tes questions avant de rendre : une question sautée coûte plus cher qu\'une erreur de calcul.',
    'Quand tu doutes entre deux réponses, écris les deux au brouillon et cherche laquelle contredit l\'énoncé.',
    'Une aire ne peut pas être négative, un âge non plus. Si ton résultat est impossible, c\'est une information, pas une catastrophe.',
    'Relis ta copie comme si elle était celle d\'un autre. On voit les erreurs des autres bien mieux que les siennes.',

    // --- Deuxième centaine : s'organiser au brouillon --------------------------------
    'Écris au brouillon la donnée que tu cherches, en haut, entourée. Tu sauras toujours où tu vas.',
    'Un brouillon n\'est pas une copie sale : c\'est un espace où l\'on a le droit de se tromper. Utilise-le vraiment.',
    'Fais un schéma même quand on ne le demande pas. Un tracé approximatif vaut mieux qu\'une phrase relue trois fois.',
    'Note tes essais ratés au lieu de les effacer : ils t\'évitent de recommencer le même deux fois.',
    'Sépare le brouillon en deux colonnes : ce que tu sais à gauche, ce que tu cherches à droite.',
    'Quand un calcul devient long, arrête-toi : il existe presque toujours un chemin plus court que tu n\'as pas vu.',
    'Écris une étape par ligne. Trois calculs sur la même ligne, c\'est trois occasions de se perdre.',
    'Range ton brouillon dans le sens de la lecture : de haut en bas, de gauche à droite. On s\'y retrouve plus tard.',
    'Encadre ton résultat. C\'est autant pour toi que pour celui qui corrige.',
    'Si tu recopies un nombre, vérifie-le tout de suite. Une erreur de recopie se propage jusqu\'au bout.',

    // --- Deuxième centaine : apprendre une leçon -------------------------------------
    'Apprendre une leçon de maths, c\'est savoir refaire un exemple, pas réciter une définition.',
    'Ferme le cahier et écris la règle de mémoire. Ce que tu ne retrouves pas, c\'est ce qu\'il te reste à apprendre.',
    'Relis ta leçon la veille du contrôle, mais aussi le soir même du cours. Dix minutes le soir valent une heure la veille.',
    'Pour chaque règle, invente un exemple à toi. On retient ce qu\'on a fabriqué.',
    'Une propriété a toujours des conditions. Apprends les conditions en même temps que la conclusion.',
    'Quand la leçon donne un contre-exemple, apprends-le : c\'est lui qui dit où la règle s\'arrête.',
    'Explique la leçon à quelqu\'un qui ne l\'a pas suivie. Là où tu bafouilles, tu n\'as pas compris.',
    'Fais-toi une fiche d\'une seule page par chapitre. Si elle déborde, c\'est que tout n\'est pas essentiel.',
    'Apprends le vocabulaire du chapitre : la moitié des énoncés se débloquent quand on sait ce que les mots veulent dire.',
    'Refais un exercice déjà corrigé sans regarder la correction. C\'est le meilleur test qui existe.',
    'Quand une formule ne rentre pas, cherche d\'où elle vient. Une formule comprise se retrouve, une formule apprise s\'oublie.',
    'Étale ton travail : trois fois vingt minutes valent mieux qu\'une heure d\'un coup, même si cela paraît moins.',

    // --- Deuxième centaine : comprendre ses erreurs ----------------------------------
    'Une erreur répétée n\'est pas de l\'étourderie : c\'est une règle que tu as mal apprise. Cherche laquelle.',
    'Classe tes erreurs en deux tas : celles que tu vois en relisant, et celles que tu ne vois pas. Les secondes sont les vraies.',
    'Quand on te rend une copie, refais d\'abord ce que tu as raté. Le reste, tu sais déjà le faire.',
    'Note ce qui t\'a manqué au moment de l\'erreur : le mot, la règle, ou l\'attention. On ne corrige pas les trois pareil.',
    'Se tromper devant la classe, c\'est rendre service à tous ceux qui allaient faire pareil.',
    'Une erreur de signe et une erreur de méthode ne se soignent pas de la même façon. Sache dire laquelle tu as faite.',
    'Si tu ne comprends pas la correction, dis-le. Une correction qu\'on recopie sans comprendre ne sert à rien.',
    'Reviens sur une erreur trois jours plus tard. Si tu la refais, c\'est qu\'elle n\'était pas comprise mais recopiée.',
    'Quand tout un exercice est faux, cherche la PREMIÈRE ligne fausse. La suite n\'est souvent que la conséquence.',

    // --- Deuxième centaine : pendant le contrôle -------------------------------------
    'Lis tout le sujet avant de commencer. Tu sauras où sont les points faciles.',
    'Commence par ce que tu sais faire. La confiance des premières questions sert pour les suivantes.',
    'Si tu bloques cinq minutes, passe à la suite et reviens. Le cerveau continue à travailler pendant ce temps.',
    'Écris tes calculs même si tu es sûr : le raisonnement rapporte des points, le résultat seul en rapporte un.',
    'Garde cinq minutes à la fin pour relire. C\'est le meilleur investissement du devoir.',
    'Une question à laquelle tu réponds à moitié rapporte plus qu\'une question vide. Écris ce que tu sais.',
    'Regarde le barème : une question à quatre points demande quatre choses. Vérifie que tu les as toutes écrites.',
    'Si un résultat te paraît absurde, écris-le quand même en disant pourquoi il te semble faux. Cela se voit et cela compte.',
    'Ne rends jamais avant la fin. Le temps qui reste appartient à ta relecture.',

    // --- Deuxième centaine : la calculatrice et les outils ---------------------------
    'La calculatrice donne un résultat, jamais une méthode. Sache ce que tu lui demandes avant de taper.',
    'Estime le résultat de tête AVANT de taper. C\'est ainsi qu\'on repère une touche mal appuyée.',
    'Sur une calculatrice, les parenthèses ne sont pas facultatives : elle applique les priorités, pas tes intentions.',
    'Taille ton crayon avant un exercice de géométrie. Un trait épais fausse une construction de deux millimètres.',
    'Vérifie le zéro de ta règle : sur beaucoup de règles, il n\'est pas au bord.',
    'Pose le rapporteur avant de chercher le nombre : centre sur le sommet, zéro sur un côté. L\'ordre évite la moitié des erreurs.',
    'Un compas qui glisse fausse tout le tracé. Serre-le avant de commencer, pas au milieu.',
    'Écris à quoi sert chaque touche mémoire de ta calculatrice une fois pour toutes. Tu gagneras du temps toute l\'année.',

    // --- Deuxième centaine : garder le moral -----------------------------------------
    'Ne pas comprendre tout de suite est normal. Ce qui compte, c\'est de savoir ce qu\'on ne comprend pas.',
    'Personne n\'est « nul en maths ». On est en retard sur une notion, et une notion se rattrape.',
    'Compare-toi à toi-même il y a un mois, pas à ton voisin. C\'est la seule comparaison qui apprenne quelque chose.',
    'Un exercice difficile n\'est pas une punition : c\'est l\'endroit exact où tu vas progresser.',
    'Quand tu sèches, demande de l\'aide sur la PREMIÈRE chose que tu ne comprends pas, pas sur l\'exercice entier.',
    'Fais une pause de cinq minutes toutes les demi-heures. Un cerveau fatigué invente des erreurs.',
    'Tu as le droit de trouver un exercice long. Cela ne veut pas dire que tu n\'y arriveras pas.',
    'Le jour où tu expliques quelque chose à quelqu\'un, c\'est que tu l\'as vraiment appris.',
    'Recommencer n\'est pas revenir en arrière. C\'est repartir avec quelque chose en plus.',
    'Chaque exercice réussi rend le suivant un peu plus facile. C\'est lent, et cela ne se voit qu\'au bout d\'un mois.',

    // --- Deuxième centaine : travailler à la maison ----------------------------------
    'Range ton bureau avant de commencer. Cinq minutes de rangement valent vingt minutes de concentration.',
    'Pose ton téléphone dans une autre pièce. Le voir suffit à couper l\'attention, même éteint.',
    'Commence par le plus difficile pendant que tu es frais. Les exercices d\'entraînement passent bien en fin de séance.',
    'Fixe-toi une durée avant de commencer, et arrête-toi quand elle est écoulée. On travaille mieux quand la fin est connue.',
    'Ne recopie jamais un corrigé sans l\'avoir cherché. Le corrigé n\'apprend rien à celui qui n\'a pas essayé.',
    'Prépare tes questions pour le cours suivant à mesure qu\'elles viennent. Elles s\'oublient toutes en une nuit.',
    'Fais tes exercices avec le cours FERMÉ, puis vérifie. C\'est le seul moyen de savoir ce que tu sais.',
    'Si tu travailles à deux, chacun cherche d\'abord seul dix minutes. Sinon l\'un des deux regarde l\'autre travailler.',
    'Relis les corrections en classe le soir même : elles sont encore fraîches, et cela prend dix minutes.',
    'Un exercice terminé mais non compris n\'est pas terminé.',

    // --- Deuxième centaine : les gestes qui reviennent partout ------------------
    'Quand tu vois « donc », vérifie que ce qui précède le justifie vraiment. C\'est le mot le plus dangereux d\'une copie.',
    'Convertis toutes les données dans la même unité AVANT de calculer, jamais pendant.',
    'Une proportion se pose en tableau : deux lignes, deux colonnes, et la question dans une case vide.',
    'Devant une fraction, demande-toi d\'abord si elle se simplifie. Les calculs qui suivent en dépendent.',
    'Avant d\'appliquer Pythagore, vérifie que le triangle est bien rectangle. C\'est la condition, pas un détail.',
    'Quand une figure te semble vide, code-la : marque les angles droits, les longueurs égales, les parallèles.',
    'Un pourcentage se calcule toujours SUR quelque chose. Écris sur quoi avant de chercher combien.',
    'Devant une équation, demande-toi ce que tu cherches à isoler, puis fais la même chose des deux côtés.',
    'Si un calcul comporte des parenthèses, commence par elles — même quand cela semble plus long.',
    'Range les termes par degré avant de réduire. La moitié des erreurs d\'expression littérale viennent d\'un terme oublié.',
    'Quand tu additionnes des fractions, écris le dénominateur commun AVANT de toucher aux numérateurs.',
    'Une moyenne se recalcule toujours à partir de la somme, jamais à partir d\'autres moyennes.',
    'Devant un problème de vitesse, écris les trois grandeurs et entoure celle qu\'on cherche.',
    'Note le nombre de solutions attendues. « Trouve les nombres » au pluriel n\'a pas la même réponse que « le nombre ».',
    'Quand tu appliques une formule, écris-la d\'abord en lettres, puis remplace. Cela évite d\'inverser deux données.',
    'Un résultat qui tombe rond n\'est pas forcément juste, et un résultat qui ne tombe pas rond n\'est pas forcément faux.',
    'Devant un tableau de valeurs, cherche ce qui reste constant : c\'est presque toujours là qu\'est la clé.',
    'Une longueur, une aire et un volume ne se comparent jamais entre elles. Vérifie tes unités avant de conclure.',
    'Quand tu construis une figure, fais un croquis à main levée d\'abord. La construction propre vient après.',
    'Devant une question ouverte, écris une phrase de réponse. Un nombre seul ne répond jamais à une question posée en mots.',
    'Si tu dois choisir entre deux méthodes, prends celle que tu sais expliquer.'
];
