# StoneValley · le portail

Le site de tous les jeux : https://stonevalleyoff-ai.github.io/

Des pages statiques, sans dépendance ni étape de construction : ce qui est dans le dépôt est ce qui est servi.

| page | ce qu'elle fait |
| --- | --- |
| `index.html` | l'accueil : la une (un jeu à la fois, en grand), les vignettes des jeux, la bande d'Orvane, l'appel au compte |
| `jeu.html?j=…` | la fiche d'un jeu : ce qu'on y fait, ses images, son bouton |
| `compte.html` | le compte : se connecter, créer un compte, mot de passe oublié ; puis l'espace : profil, sécurité, bibliothèque, achats et factures, abonnement, données |
| `boutique.html` | la boutique : les abonnements, les jeux et contenus à vendre, la caisse |
| `legal/` | les conditions d'utilisation, les conditions de vente, la confidentialité, les cookies, les mentions légales |
| `404.html` | la page des adresses perdues |

| fichier | rôle |
| --- | --- |
| `assets/jeux.js` | **le catalogue** : tout ce que le site dit d'un jeu (nom, textes, couleurs, images, lien) |
| `assets/editeur.js` | **l'éditeur** : le nom, l'adresse, les contacts que citent les textes légaux |
| `assets/site.js` | le socle : l'en-tête, le pied, la session, les appels au service de comptes |
| `assets/compte.js` | la page du compte |
| `assets/site.css` | l'habillage |
| `images/jeux/<id>/` | les images d'un jeu : `couverture` (16:9, 1600 × 900) et ses captures |
| `supabase.sql` | la boutique et le compte, côté base (à passer une fois) |
| `manifest.webmanifest`, `sw.js`, `images/icones/` | l'application installable : son nom, ses icônes, et le service worker qui garde le portail pour l'ouvrir sans réseau |

## Avant d'ouvrir au public

Ce qui reste à faire à la main, dans l'ordre :

1. **Remplir `assets/editeur.js`.** Tant qu'une valeur est vide, les textes légaux affichent « à compléter » en rouge et un avis « version préparatoire ». Un site qui s'adresse au public doit dire qui l'édite ; un site qui vend doit en plus donner un téléphone, un numéro d'immatriculation et un médiateur de la consommation.
2. **Faire relire les textes de `legal/`** par un juriste. Ils sont écrits pour ces jeux-ci, d'après ce que le code fait vraiment des données, et suivent le droit français de la consommation et le RGPD ; mais ils engagent l'éditeur, et aucun n'a été validé par un professionnel. À vérifier en particulier : la durée de conservation des comptes inactifs (trois ans, annoncée dans la confidentialité, à appliquer), et ce que le Supabase d'Orvane garde des envois des joueurs.
3. **Régler Supabase** (projet « Vallée de pierre ») :
   - *Authentication › URL Configuration* : **Site URL** = `https://stonevalleyoff-ai.github.io/` (les liens des e-mails y ramènent ; la page les passe au compte).
   - *Authentication › Emails › SMTP Settings* : brancher un vrai service d'envoi. Celui par défaut est limité à quelques e-mails par heure : il ne tient pas une ouverture.
   - *Authentication › Providers › Email* : longueur minimale du mot de passe à 8 (le portail demande 8), « Confirm email » et « Secure email change » allumés.
   - passer `supabase.sql` dans *SQL Editor* (voir « La boutique »).
4. **Mettre à jour `CGU_VERSION`** (dans `assets/site.js`) à chaque changement des conditions : chaque nouveau compte garde la version qu'il a acceptée, et sa date.

## Le compte

Le même que dans les jeux : les comptes du projet Supabase « Vallée de pierre ». La clé écrite dans `assets/site.js` est sa clé publique, faite pour être dans une page : elle n'ouvre rien sans le mot de passe de quelqu'un.

- **La session est commune au portail et aux jeux.** Elle est gardée dans le navigateur sous `stonevalley:session` (un jeton d'une heure, et de quoi le renouveler ; jamais le mot de passe). Le portail et les jeux sont à la même adresse, donc lisent le même stockage : connecté au portail, on l'est dans Stone Valley, Lisière, Portefaix et Neural Arena en les ouvrant, et l'inverse ; se déconnecter quelque part déconnecte partout sur cet appareil. Sa forme : `{ jeton, refresh, exp, uid, email, pseudo }`, `exp` en millisecondes. Un jeton de renouvellement ne sert qu'une fois : avant de renouveler, chacun relit la clé, et si un autre vient de le faire il prend sa session au lieu de redemander. Un jeu qui s'ajoute doit suivre cette règle. Cela vaut dans un navigateur et dans l'application installée ; un jeu lancé hors du navigateur (version de bureau) garde sa propre connexion.
- **Créer un compte** demande d'accepter les conditions et de dire qu'on a 15 ans (ou l'accord d'un parent). La version acceptée et sa date sont gardées avec le compte (`cgu`, `cgu_le`, à côté du `pseudo`).
- **L'arrivée par le lien d'un e-mail** (confirmation, nouveau mot de passe, changement d'adresse, lien expiré) : le lien ramène à l'accueil, qui passe la main à `compte.html`. Le jeton est lu puis effacé de l'adresse aussitôt.
- **Changer de mot de passe** et **supprimer son compte** redemandent le mot de passe.
- **Où l'on en est dans un jeu** (`SV.avancee`, dans `assets/site.js`) : connecté, la bibliothèque du compte et la fiche du jeu le montrent, sous son nom. Aujourd'hui Lisière : sa partie en cours, gardée sur le compte (la fonction `lisiere_avancee`, écrite dans le dépôt de Lisière, `outils/sauvegarde.sql`), et son record au tableau des scores ; une partie en cours fait dire « Reprendre » au bouton. Un jeu qui garde sa progression sur le compte s'ajoute à `AVANCEES`.
- **Télécharger ses données** et **supprimer son compte** marchent dès aujourd'hui, avec les fonctions que les jeux ont déjà (`vp_charger_compte`, `lisiere_moi`, `vp_supprimer_compte`). Une fois `supabase.sql` passé, ce sont `sv_mes_donnees` (tout, jeu par jeu) et `sv_compte_supprimer` (qui refuse tant qu'un abonnement est encore prélevé) qui servent.

## La boutique

Le menu est prêt ; rien ne se vend tant que les trois étapes ci-dessous ne sont pas faites. D'ici là la boutique dit « tous nos jeux se jouent gratuitement », et l'espace du compte affiche « aucun achat », « aucun abonnement », « les paiements ne sont pas encore ouverts ».

1. **La base** : passer `supabase.sql`. Trois tables fermées (`sv_produits`, `sv_achats`, `sv_abonnements`) et trois fonctions (`sv_mon_espace`, `sv_mes_donnees`, `sv_compte_supprimer`), tout préfixé `sv_` ; rien des jeux n'est touché. Le fichier a été essayé sur un Postgres local : un visiteur ne lit que les produits actifs, un compte ne lit que ses achats, personne n'écrit depuis une page.
2. **Les produits** : une ligne par offre dans `sv_produits` (un exemple est à la fin de `supabase.sql`). `actif` la rend visible. Les prix sont en centimes, toutes taxes comprises.
3. **Le paiement** : choisir un prestataire, puis écrire la fonction Supabase (*Edge Function*) `sv-paiement`. C'est le seul morceau qui manque, parce qu'il dépend du prestataire et de son compte marchand. Le site lui envoie, avec le jeton du joueur :

   | ce que le site envoie | ce qu'il attend en retour |
   | --- | --- |
   | `{ action: 'acheter', produit, acces_immediat: true, cgv: true, retour }` | `{ url }` : la page de paiement du prestataire, qui ramène ensuite à `retour?paiement=ok` (ou `=annule`) |
   | `{ action: 'gerer', retour }` | `{ url }` : la page du prestataire où le joueur gère ses cartes et ses factures |
   | `{ action: 'resilier' }` | `{ ok: true, periode_fin }` : l'abonnement s'arrêtera à la fin de la période payée |
   | `{ action: 'reprendre' }` | `{ ok: true }` |

   Un refus se rend avec un code 4xx et `{ message }`, que le site affiche. La même fonction (ou une seconde) reçoit les avis du prestataire (*webhook*) et écrit, avec la clé de service, dans `sv_achats` et `sv_abonnements` : c'est la seule à pouvoir le faire.

   Le choix du prestataire compte pour la TVA : avec un prestataire de paiement simple (Stripe…), c'est l'éditeur qui vend, facture et déclare la TVA de chaque pays d'Europe ; avec un « marchand officiel » (Paddle, Lemon Squeezy…), c'est lui qui vend et s'en charge, contre une commission plus forte. Les conditions de vente (`legal/cgv.html`) sont écrites pour le premier cas.

Ce que la loi demande à la vente en ligne est déjà dans le menu : le prix TTC et le récapitulatif avant de payer, le bouton « Commander et payer », la case de l'accès immédiat (et de la renonciation à se rétracter pour un contenu numérique), la résiliation d'un abonnement en trois clics depuis le compte.

## L'application

Le portail est une application web installable (PWA). Depuis le site :
- **sur Android** (Chrome) : le menu ⋮ › « Installer l'application », ou le lien « Installer l'application » en bas de page ;
- **sur iPhone et iPad** (Safari) : le bouton Partager › « Sur l'écran d'accueil » ;
- **sur un ordinateur** (Chrome, Edge) : l'icône d'installation dans la barre d'adresse, ou le lien en bas de page.

Installée, elle s'ouvre en plein écran, sans barre de navigateur, et les jeux s'y lancent dedans. Le portail s'ouvre **sans réseau** (l'accueil, les fiches, les textes légaux) ; se connecter et la boutique demandent le réseau.

- **L'icône** (`images/icones/icone.svg`) : deux parois de pierre, et entre elles la vallée éclairée, en forme de V, avec son soleil. C'est aussi la marque de l'en-tête et l'icône de l'onglet. Les fichiers PNG en sont tirés (192, 512, une version plein cadre qu'Android découpe lui-même, et celle de l'iPhone) : si le dessin change, il faut les refaire aux mêmes tailles.
- **Le service worker** (`sw.js`) est à la racine du site, donc il voit passer aussi les adresses des jeux : il ne répond que pour les fichiers du portail, et laisse tout le reste au réseau. Les jeux gardent le leur. Les pages, scripts et styles sont pris au réseau d'abord, toujours revalidés auprès du site (`cache: 'no-cache'` : sans cela, le navigateur servait sa propre copie, vieille de dix minutes au plus) : une nouvelle version se voit dès que la page se charge, sans numéro à changer. Une page ou un dossier de plus à la racine s'ajoute à `SOCLE` et à `DU_PORTAIL`.
- **La mise à jour de l'application installée** (`assets/site.js`) : installée, l'application ne se recharge pas d'elle-même (sur un téléphone, on la retrouve telle qu'on l'a laissée), et elle n'a pas de bouton pour recharger. GitHub Pages date tous les fichiers d'une publication du même instant (`Last-Modified`) : quand la page revient au premier plan (et toutes les quinze minutes qu'elle reste ouverte), elle demande cette date au site (`HEAD sw.js`). Plus récente que la sienne, une version nouvelle est en ligne : revenue au premier plan, la page se recharge aussitôt ; si l'on était en train d'écrire dans un champ, ou si elle était restée ouverte sous les yeux, un bandeau propose « Recharger ». Le service worker se cherche une version nouvelle en même temps. Les jeux ont chacun la leur (Lisière : `outils/maj.js` ; Portefaix : `outils/pwa.js`).

## Ajouter un jeu

Dans `assets/jeux.js`, copier une entrée et changer ses textes, ses couleurs (`teinte`, `claire`) et son lien. Poser ses images dans `images/jeux/<id>/`. La une, les vignettes, la fiche, le pied et la bibliothèque le prennent seuls. Ajouter son adresse à `sitemap.xml`.

## L'essai

```
node outils/essai.js [dossier où poser des images]
```

Dans Chromium (il lui faut Playwright), contre un faux service de comptes local (`outils/faux-service.js`) : aucun vrai e-mail ne part, aucun compte n'est créé, aucun paiement n'a lieu. 77 vérifications : l'accueil et les fiches, créer un compte, les liens des e-mails, le profil, la sécurité, la bibliothèque (et où l'on en est dans Lisière), les achats, l'abonnement (résilier, reprendre), la boutique et sa caisse, télécharger ses données, supprimer son compte, la session commune aux jeux, le portail tel qu'il est avant que la base ne connaisse la boutique, les textes légaux et leurs liens, un téléphone, l'application installable (manifeste, service worker, ouverture sans réseau, la mise à jour quand une version nouvelle est publiée).

Pour voir le site sur sa machine avec le faux service (comptes `ada@exemple.fr`, `bob@exemple.fr`… mot de passe `bon`) : `node outils/faux-service.js 8136`, servir ce dossier (`python3 -m http.server 8137`), puis ouvrir `http://127.0.0.1:8137/?service=http://127.0.0.1:8136`. Sur sa propre machine seulement, la page accepte un autre service de comptes dans son adresse : c'est ce dont l'essai se sert.

## Les polices, les images

- Alegreya Sans (Juan Pablo del Peral, Huerta Tipográfica), licence OFL : `assets/polices/`, avec le texte de la licence. Réduite aux caractères du français.
- Les images des jeux sont des captures des jeux. Celles d'Orvane viennent de son dépôt (`assets/ILLUSTRATIONS.md` y dit comment elles ont été faites).
