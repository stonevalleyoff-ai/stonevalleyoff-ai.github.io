// StoneValley — LE CATALOGUE DES JEUX (assets/jeux.js)
// Tout ce que le portail dit d'un jeu est ici : la une, les vignettes, la fiche (jeu.html?j=…), la bibliothèque du compte.
// Ajouter un jeu : copier une entrée, poser ses images dans images/jeux/<id>/ (couverture en 16:9, 1600 × 900), et c'est tout.
// « genre » : 'jeu' (une vignette, une fiche, un bouton Jouer) ou 'monde' (Orvane : la bande à part, sous les jeux).
window.SV_JEUX = [
  {
    id: 'stonevalley', genre: 'jeu', nom: 'Stone Valley', teinte: '#5f8f4e', claire: '#9fd08a',
    etat: 'Bêta', categorie: 'Exploration · Aventure', joueurs: '1 joueur, îles partagées', compte: 'Compte requis',
    plateformes: 'Navigateur, application installable',
    lien: 'https://stonevalleyoff-ai.github.io/stonevalley/',
    accroche: 'Une île vivante à explorer, apprivoiser et défendre.',
    resume: 'Une île vivante, en isométrie et en première personne. Ses créatures naissent, migrent et évoluent, que tu sois là ou non.',
    recit: [
      'Tu t\'éveilles sur une île qui ne t\'a pas attendu. Sa faune vient du monde d\'Orvane : des lignées vraies, qui naissent, se déplacent et changent d\'une nuit à l\'autre. Tu l\'explores vue de haut, ou les yeux dans l\'herbe, en première personne.',
      'Tu gagnes la confiance des bêtes, tu montes ton campement, tu forges, tu pêches, tu cultives. Puis tu descends au Centre des automates, et tu apprends ce que l\'île cache sous ses pierres.'
    ],
    forts: [
      'Une faune et une flore vivantes, branchées sur le monde d\'Orvane',
      'L\'apprivoisement : chaque bête a sa confiance à gagner',
      'Un campement à bâtir, à défendre, et ceux des autres à visiter',
      'Un donjon, des boss, des sorts, une forge',
      'Ton personnage te suit d\'un appareil à l\'autre'
    ],
    couverture: 'images/jeux/stonevalley/couverture.jpg', captures: []
  },
  {
    id: 'lisiere', genre: 'jeu', nom: 'Lisière', teinte: '#c8742e', claire: '#f0a868',
    etat: 'Jouable', categorie: 'Survie · Horreur', joueurs: '1 joueur', compte: 'Compte facultatif',
    plateformes: 'Navigateur, application installable, tactile',
    lien: 'https://stonevalleyoff-ai.github.io/Lisiere/',
    accroche: 'Tenir jusqu\'au matin.',
    resume: 'Une veilleuse au bord d\'un feu, et autour, le noir qui regarde. Les bêtes sont vraies, et elles se souviennent.',
    recit: [
      'Tu t\'éveilles à la lisière d\'un lieu vrai du monde d\'Orvane : une forêt, une prairie, une lande. Le jour, tu récoltes, tu fabriques, tu chasses. La nuit, tu tiens près de ton feu, et les chasseurs du lieu viennent tourner au bord de la lumière.',
      'Chaque bête est une lignée vraie du monde, dessinée à l\'encre. Ce que les joueurs leur font, elles l\'apprennent : le monde s\'en souvient, tous jeux confondus.'
    ],
    forts: [
      'Le feu est une loi : rien n\'entre dans sa lumière. Garde-le en vie',
      'La faim, la peur, le froid : tout cela tue, et tout prévient avant',
      'La pluie, la boue, la crue, la foudre, l\'incendie : le temps pèse',
      'Un bestiaire à l\'encre, tiré des lignées vivantes d\'Orvane',
      'Un tableau des scores : combien de nuits tiendras-tu ?'
    ],
    couverture: 'images/jeux/lisiere/couverture.jpg', captures: []
  },
  {
    id: 'portefaix', genre: 'jeu', nom: 'Portefaix', teinte: '#e0b24a', claire: '#f3d27e',
    etat: 'Prototype', categorie: 'Coop · Horreur', joueurs: '1 à 6 joueurs', compte: 'Compte facultatif (requis en ligne)',
    plateformes: 'Navigateur, application installable, tactile',
    lien: 'https://stonevalleyoff-ai.github.io/Portefaix/',
    accroche: 'Videz la maison avant l\'aube. Ne réveillez pas ce qui y dort.',
    resume: 'Des déménageurs de nuit vident une maison hantée, seuls ou à six. Les meubles sont lourds, fragiles, et quelque chose écoute.',
    recit: [
      'Chaque nuit a sa maison, inventée et meublée comme une vraie. Il faut charger le camion pour un quota d\'euros avant 6 h, avec des bras élastiques qui s\'arrachent si l\'on tire trop.',
      'La chose qui dort au fond de la maison entend tout : un pas, une course, une armoire qui cogne. Et si tu joues en direct, le public de ton stream vote les sabotages.'
    ],
    forts: [
      'De 1 à 6 porteurs, en ligne par un code de salon',
      'Deux lieux : le manoir, et le bunker avec ses trois créatures',
      'Tout bruit compte : la chose entend, et voit ta torche',
      'Ton chat Twitch vote les sabotages',
      'Des objets précieux cachés dans chaque lieu'
    ],
    couverture: 'images/jeux/portefaix/couverture.jpg', captures: []
  },
  {
    id: 'braises', genre: 'jeu', nom: 'Les Dernières Braises', teinte: '#b23a2c', claire: '#e98a6f',
    etat: 'Alpha', categorie: 'Survie évolutive', joueurs: '1 joueur', compte: 'Sans compte',
    plateformes: 'Navigateur, application installable, clavier ou tactile',
    lien: 'https://stonevalleyoff-ai.github.io/lastembers/',
    accroche: 'Le jour, tu apprends à survivre. La nuit, ils apprennent à te tuer.',
    resume: 'Récolte le jour, défends ton feu la nuit. Les souches de zombies évoluent : celles qui te survivent transmettent leurs traits.',
    recit: [
      'Le monde oublie. Eux, non. Dans la clairière des oubliés, tu récoltes et tu fabriques tant qu\'il fait jour ; à la nuit, tu tiens ton feu jusqu\'à l\'aube.',
      'Les souches qui t\'attaquent évoluent avec le moteur d\'Orvane : chaque mort laisse une place, les traits des survivantes se transmettent. Ce qui marchait hier ne marchera pas demain.'
    ],
    forts: [
      'Récolter et fabriquer le jour, tenir jusqu\'à l\'aube la nuit',
      'Des ennemis qui évoluent vraiment, nuit après nuit',
      'En solo, au clavier ou au doigt',
      'Ta partie est gardée sur ton appareil'
    ],
    couverture: 'images/jeux/braises/couverture.jpg', captures: []
  },
  {
    id: 'orvane', genre: 'monde', nom: 'Orvane', teinte: '#3f7f8c', claire: '#8fc9d4',
    etat: 'Le monde', categorie: 'Le monde partagé', joueurs: 'Tous les joueurs', compte: 'Sans compte',
    plateformes: 'Navigateur',
    lien: 'https://stonevalleyoff-ai.github.io/orvane/', action: 'Entrer dans l\'Observatoire', lienAction: 'https://stonevalleyoff-ai.github.io/orvane/monde/',
    accroche: 'Un seul monde vivant. Tous nos jeux en font partie.',
    resume: 'Un moteur d\'écosystème et d\'évolution : ses lignées naissent, migrent et évoluent chaque nuit. Chaque jeu le montre à sa façon, et y renvoie ce que font ses joueurs.',
    recit: [
      'Orvane n\'est pas un jeu : c\'est le monde que nos jeux partagent. Ses lignées naissent, se séparent, migrent et s\'éteignent, cycle après cycle, sans que personne ne les écrive à l\'avance.',
      'Ce que tu chasses dans Lisière, ce que tu apprivoises dans Stone Valley, tout cela pèse sur le même monde. À l\'Observatoire, tu peux le regarder vivre : ses espèces, leur arbre, leur chaîne alimentaire, leur journal.'
    ],
    forts: [
      'Un moteur d\'évolution indépendant de tout jeu',
      'Un Observatoire public : espèces, lignées, chaîne alimentaire, journal',
      'Les actes des joueurs pèsent sur le monde',
      'Ouvert aux autres studios : n\'importe quel jeu peut s\'y brancher'
    ],
    couverture: 'images/jeux/orvane/couverture.webp', captures: ['images/jeux/orvane/capture-1.webp']
  }
];
