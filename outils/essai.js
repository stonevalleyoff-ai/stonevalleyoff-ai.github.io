// StoneValley — L'ESSAI DU PORTAIL (outils/essai.js)
// Dans Chromium, contre un faux service de comptes (outils/faux-service.js) : aucun vrai e-mail ne part, aucun compte n'est créé, aucun
// paiement n'a lieu. L'accueil et les fiches ; la porte du compte ; l'espace (profil, sécurité, bibliothèque, achats, abonnement,
// données) ; la boutique ; l'arrivée par le lien d'un e-mail ; les textes légaux ; le portail quand la base ne connaît pas encore la
// boutique ; un téléphone ; l'application installable (le manifeste, le service worker, sans réseau, la mise à jour).
//   node outils/essai.js [dossier où poser des images]
// Il faut Playwright et son Chromium (ou NAVIGATEUR=chrome, pour le Chrome de la machine). Il sort avec le code 0 si tout passe.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SITE = path.join(__dirname, '..'), { creer } = require('./faux-service.js'), IMAGES = process.argv[2] || null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let ok = true, n = 0;
const verif = (c, m) => { n++; ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
(async () => {
  const service = creer(), nu = creer({ boutique: false, paiement: false });
  await new Promise(f => service.serveur.listen(8136, '127.0.0.1', f));
  await new Promise(f => nu.serveur.listen(8138, '127.0.0.1', f));
  // (comme GitHub Pages : chaque fichier porte la date de la dernière publication ; l'essai en fait une nouvelle en la changeant)
  let publie = new Date(Math.floor(Date.now() / 1000) * 1000 - 3600e3);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(SITE, path.normalize(p));
    if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); return res.end(fs.readFileSync(path.join(SITE, '404.html'))); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Last-Modified': publie.toUTCString() }); res.end(fs.readFileSync(f));
  });
  await new Promise(f => srv.listen(8137, '127.0.0.1', f));
  const BASE = 'http://127.0.0.1:8137/', AVEC = '?service=http://127.0.0.1:8136', SANS = '?service=http://127.0.0.1:8138';
  const nav = await chromium.launch({ channel: process.env.NAVIGATEUR || undefined });
  const erreurs = [];
  const ouvrir = async (suite, opts) => { const ctx = await nav.newContext(Object.assign({ viewport: { width: 1280, height: 800 }, acceptDownloads: true }, opts || {})), p = await ctx.newPage(); p.on('pageerror', e => erreurs.push(e.message)); await p.goto(BASE + suite); return p; };
  const dit = (p, sel, re) => p.waitForFunction(([s, r]) => { const e = document.querySelector(s); return e && new RegExp(r).test(e.textContent); }, [sel, re.source], { timeout: 8000 }).then(() => true, () => false);
  const image = async (p, nom) => { if (IMAGES) await p.screenshot({ path: path.join(IMAGES, nom + '.png'), fullPage: true }); };
  const entrer = async (p, email, mdp) => { await p.fill('#c-email', email); await p.fill('#c-mdp', mdp || 'bon'); await p.click('#f-connexion button[type=submit]'); await p.waitForSelector('#espace:not([hidden])', { timeout: 8000 }).catch(() => {}); };

  console.log('1. L\'accueil et les fiches');
  let p = await ouvrir(AVEC);
  const jeux = await p.locator('#liste-jeux .jeu').evaluateAll(l => l.map(e => ({ nom: e.querySelector('h3').textContent, jouer: e.querySelector('.bas a').href, fiche: e.querySelector('h3 a').getAttribute('href') })));
  verif(jeux.length === 5 && jeux.every(j => j.jouer.startsWith('https://stonevalleyoff-ai.github.io/') && /^jeu\.html\?j=/.test(j.fiche)), `cinq vignettes, chacune sa fiche et son bouton Jouer : ${jeux.map(j => j.nom).join(', ')}`);
  verif(await p.locator('#une h1').innerText() === 'Stone Valley' && await p.locator('#une-rail button').count() === 6, 'la une montre le premier jeu ; son rail en propose six (les jeux et le monde)');
  await p.locator('#une-rail button').nth(1).click();
  verif(await p.locator('#une h1').innerText() === 'Lisière' && await p.locator('#une-rail button').nth(1).getAttribute('aria-pressed') === 'true', 'un clic sur le rail change la une');
  await p.waitForLoadState('networkidle'); const attendues = await p.locator('#liste-jeux .image img, #une-rail img').count();
  const cassees = await p.evaluate(() => Promise.all(Array.from(document.images).map(i => i.decode().then(() => null, () => i.getAttribute('src')))).then(l => l.filter(Boolean)));
  verif(cassees.length === 0 && attendues === 11, 'toutes les images de l\'accueil se chargent : cinq vignettes, six au rail' + (cassees.length ? ' (manquent : ' + cassees.join(', ') + ')' : ''));
  verif(await p.locator('#bande-monde a').first().getAttribute('href') === 'https://stonevalleyoff-ai.github.io/orvane/monde/' && await p.locator('#entete a[href$="compte.html#creer"]').count() === 1, 'la bande d\'Orvane mène à l\'Observatoire ; l\'en-tête propose de créer un compte');
  await image(p, 'accueil');
  await p.goto(BASE + 'jeu.html?j=portefaix');
  verif(await p.locator('h1').innerText() === 'Portefaix' && await p.title() === 'Portefaix · StoneValley' && await p.locator('.encart a.bouton').getAttribute('href') === 'https://stonevalleyoff-ai.github.io/Portefaix/', 'la fiche d\'un jeu : son nom, son titre de page, son bouton');
  await image(p, 'fiche');
  await p.goto(BASE + 'jeu.html?j=rien');
  verif((await p.locator('h1').innerText()).includes('pas au catalogue'), 'un jeu inconnu : c\'est dit');
  await p.goto(BASE + 'nulle-part');
  verif((await p.locator('h1').innerText()).includes('perdue'), 'une adresse inconnue : la page 404, avec l\'en-tête du site');

  console.log('2. Créer un compte');
  await p.goto(BASE + 'compte.html#creer');
  verif(await p.locator('#f-creer').isVisible() && await p.locator('#f-connexion').isHidden(), 'compte.html#creer ouvre le formulaire de création');
  await p.fill('#i-pseudo', 'Eve'); await p.fill('#i-email', 'eve@exemple.fr'); await p.fill('#i-mdp', 'court'); await p.click('#f-creer button[type=submit]');
  verif((await p.locator('#f-creer .avis').innerText()).includes('8 caractères'), 'un mot de passe trop court : refusé');
  await p.fill('#i-mdp', 'motdepasse'); await p.click('#f-creer button[type=submit]');
  verif((await p.locator('#f-creer .avis').innerText()).includes('conditions') && !service.journal.some(l => l.includes('signup')), 'sans accepter les conditions : refusé, rien n\'est envoyé');
  await p.check('#i-cgu'); await p.click('#f-creer button[type=submit]');
  verif((await p.locator('#f-creer .avis').innerText()).includes('15 ans'), 'sans la case de l\'âge : refusé');
  await p.check('#i-age'); await p.fill('#i-email', 'ada@exemple.fr'); await p.click('#f-creer button[type=submit]');
  verif(await dit(p, '#f-creer .avis', /déjà un compte/), 'une adresse déjà prise : c\'est dit');
  await p.fill('#i-email', 'eve@exemple.fr'); await p.click('#f-creer button[type=submit]');
  const eve = () => service.comptes['eve@exemple.fr'];
  verif(await dit(p, '#f-creer .avis', /confirmation/) && eve() && eve().choisi === 'Eve' && eve().meta.cgu && eve().meta.cgu_le && await p.inputValue('#i-mdp') === '',
    'une adresse neuve : le compte est créé avec son pseudo et la version des conditions acceptées ; la page dit d\'aller confirmer');
  verif(service.journal.some(l => l.includes('/auth/v1/signup?redirect_to=' + encodeURIComponent(BASE))), 'le lien de l\'e-mail ramènera à l\'accueil du site');

  console.log('3. Arriver par le lien d\'un e-mail');
  p = await ouvrir(AVEC + '#access_token=jeton:eve@exemple.fr:1&refresh_token=reprise:eve@exemple.fr:1&expires_in=3600&type=signup');
  await p.waitForURL(/compte\.html/, { timeout: 8000 }).catch(() => {});
  verif(await dit(p, '#lien-titre', /confirmé/) && !p.url().includes('access_token') && await p.locator('#espace').isVisible() && (await p.locator('#moi-nom').innerText()) === 'Eve',
    'le lien de confirmation, arrivé sur l\'accueil : la page du compte s\'ouvre, connectée, le jeton hors de l\'adresse');
  p = await ouvrir(AVEC + '#error=access_denied&error_code=otp_expired');
  await p.waitForURL(/compte\.html/, { timeout: 8000 }).catch(() => {});
  verif(await dit(p, '#lien-titre', /ne vaut plus/) && await p.locator('#f-oubli').isVisible(), 'un lien expiré : c\'est dit, et le formulaire « mot de passe oublié » est ouvert');
  await p.fill('#o-email', 'dan@exemple.fr'); await p.click('#f-oubli button[type=submit]');
  verif(await dit(p, '#f-oubli .avis', /vient de partir/) && service.courrier.some(c => c.genre === 'mot de passe' && c.email === 'dan@exemple.fr'), 'mot de passe oublié : le lien est demandé, sans dire si le compte existe');
  p = await ouvrir('compte.html' + AVEC + '#access_token=jeton:dan@exemple.fr:1&refresh_token=reprise:dan@exemple.fr:1&type=recovery');
  await p.waitForSelector('#f-nouveau:not([hidden])', { timeout: 8000 }).catch(() => {});
  await p.fill('#n-mdp', 'nouveaumotdepasse'); await p.fill('#n-encore', 'autrechose'); await p.click('#f-nouveau button[type=submit]');
  verif((await p.locator('#f-nouveau .avis').innerText()).includes('pas les mêmes'), 'le lien de mot de passe : deux saisies différentes sont refusées');
  await p.fill('#n-encore', 'nouveaumotdepasse'); await p.click('#f-nouveau button[type=submit]');
  verif(await dit(p, '#lien-titre', /est changé/) && service.comptes['dan@exemple.fr'].mdp === 'nouveaumotdepasse' && await p.locator('#espace').isVisible(), 'le mot de passe est changé, et l\'on est connecté');

  console.log('4. Se connecter, le profil, la sécurité');
  p = await ouvrir('compte.html' + AVEC);
  await p.fill('#c-email', 'ada@exemple.fr'); await p.fill('#c-mdp', 'faux'); await p.click('#f-connexion button[type=submit]');
  verif(await dit(p, '#f-connexion .avis', /ne va pas/), 'un mauvais mot de passe : c\'est dit');
  await entrer(p, 'ada@exemple.fr');
  verif(await p.locator('#p-profil').isVisible() && (await p.locator('#moi-email').innerText()) === 'ada@exemple.fr' && await p.locator('#ouvre-compte').isVisible() && await p.inputValue('#c-mdp') === '', 'connecté : l\'espace s\'ouvre sur le profil, l\'en-tête montre le compte');
  await p.fill('#p-pseudo', 'Ada <b>Lovelace</b>'); await p.click('#f-pseudo button[type=submit]');
  verif(await dit(p, '#f-pseudo .avis', /enregistré/) && service.comptes['ada@exemple.fr'].choisi === 'Ada bLovelace' && (await p.locator('#moi-nom').innerText()) === 'Ada bLovelace', 'le pseudo est changé, sans chevrons, 16 caractères au plus ; l\'en-tête suit');
  await p.fill('#p-email', 'bob@exemple.fr'); await p.click('#f-email button[type=submit]');
  verif(await dit(p, '#f-email .avis', /déjà un compte/), 'changer pour une adresse déjà prise : refusé');
  await p.fill('#p-email', 'ada2@exemple.fr'); await p.click('#f-email button[type=submit]');
  verif(await dit(p, '#f-email .avis', /confirmation/) && service.courrier.some(c => c.genre === 'changement d\'adresse' && c.email === 'ada2@exemple.fr'), 'changer d\'adresse : un e-mail de confirmation part à la nouvelle');
  await image(p, 'compte-profil');
  await p.click('[data-p="securite"]');
  await p.fill('#s-actuel', 'faux'); await p.fill('#s-mdp', 'unnouveaumdp'); await p.fill('#s-encore', 'unnouveaumdp'); await p.click('#f-mdp button[type=submit]');
  verif(await dit(p, '#f-mdp .avis', /actuel ne va pas/) && !service.comptes['ada@exemple.fr'].mdp, 'changer de mot de passe avec un mauvais mot de passe actuel : refusé');
  await p.fill('#s-actuel', 'bon'); await p.click('#f-mdp button[type=submit]');
  verif(await dit(p, '#f-mdp .avis', /est changé/) && service.comptes['ada@exemple.fr'].mdp === 'unnouveaumdp' && await p.locator('#espace').isVisible(), 'avec le bon : changé, et l\'on reste connecté');
  await p.reload();
  verif(await p.locator('#p-securite').isVisible() && (await p.locator('#moi-email').innerText()) === 'ada@exemple.fr', 'la page rechargée : toujours connecté, au même onglet');

  console.log('5. La bibliothèque, les achats, l\'abonnement');
  await p.click('[data-p="bibliotheque"]');
  await p.waitForSelector('#b-contenus li', { timeout: 8000 }).catch(() => {});
  verif(await p.locator('#b-jeux li').count() === 5 && (await p.locator('#b-contenus').innerText()).includes('Le carnet relié'), 'la bibliothèque : les cinq jeux, et le contenu acheté');
  await p.waitForSelector('#b-jeux li[data-jeu="lisiere"] .avancee', { timeout: 8000 }).catch(() => {});
  const avLisiere = await p.locator('#b-jeux li[data-jeu="lisiere"] .avancee').innerText().catch(() => '');
  verif(/Partie en cours : Le monde d.Orvane, jour 3 · 2 nuits tenues · Prairie, été · 5 régions découvertes — gardée il y a 2 heures\./.test(avLisiere) && /Ton record : 4 nuits tenues \(2e au tableau des scores\) · 6 parties finies\./.test(avLisiere)
    && await p.locator('#b-jeux li[data-jeu="lisiere"] a.bouton:not(.calme)').innerText() === 'Reprendre' && await p.locator('#b-jeux li[data-jeu="stonevalley"] .avancee').count() === 0,
    'Lisière dans la bibliothèque : la partie en cours gardée sur le compte, le record ; son bouton dit « Reprendre »');
  await image(p, 'compte-bibliotheque');
  await p.goto(BASE + 'jeu.html?j=lisiere');
  await p.waitForSelector('#avancee:not([hidden])', { timeout: 8000 }).catch(() => {});
  verif((await p.locator('#avancee').innerText()).includes('Où tu en es') && (await p.locator('#avancee').innerText()).includes('jour 3') && await p.locator('#encart-jouer').innerText() === 'Reprendre ta partie',
    'la fiche de Lisière, connecté : où l\'on en est, sous le bouton, qui dit « Reprendre ta partie »');
  await image(p, 'fiche-avancee');
  await p.goto(BASE + 'compte.html#bibliotheque');
  await p.click('[data-p="achats"]');
  verif((await p.locator('#a-liste').innerText()).includes('2,99') && await p.locator('#a-liste a[href="https://exemple.fr/facture/a-1"]').count() === 1, 'les achats : le montant, et le lien de la facture');
  await image(p, 'compte-achats');
  await p.click('[data-p="abonnement"]');
  verif((await p.locator('#ab-carte').innerText()).includes('Soutien') && (await p.locator('#ab-carte').innerText()).includes('Prochain prélèvement'), 'l\'abonnement : la formule, le prochain prélèvement');
  await image(p, 'compte-abonnement');
  await p.click('[data-p="donnees"]');
  await p.fill('#x-mdp', 'unnouveaumdp'); await p.fill('#x-mot', 'supprimer'); await p.click('#f-supprimer button[type=submit]');
  verif((await p.locator('#f-supprimer .avis').innerText()).includes('résilie-le') && service.supprimes.length === 0, 'supprimer son compte avec un abonnement en cours : refusé, il faut d\'abord résilier');
  await p.click('[data-p="abonnement"]'); await p.click('#ab-resilier');
  verif(await p.locator('#d-resilier').evaluate(d => d.open), 'résilier : une fenêtre demande confirmation (trois clics en tout)');
  await p.click('#d-resilier-oui');
  verif(await dit(p, '#ab-carte', /Résilié/) && !!service.abonnements['u-ada'].resilie_le && await p.locator('#ab-reprendre').isVisible(), 'confirmé : l\'abonnement est résilié, court jusqu\'à sa fin, et peut être repris');
  await p.click('#ab-reprendre');
  verif(await dit(p, '#ab-carte', /Actif/) && service.abonnements['u-ada'].resilie_le === null, 'repris : il est de nouveau actif');

  console.log('6. La boutique');
  await p.goto(BASE + 'boutique.html');
  await p.waitForSelector('#abos .offre', { timeout: 8000 }).catch(() => {});
  verif(await p.locator('#abos .offre').count() === 1 && await p.locator('#produits .offre').count() === 7 && !(await p.locator('main').innerText()).includes('Pas encore en vente'), 'le catalogue : une formule, deux contenus, les cinq jeux gratuits ; ce qui n\'est pas actif ne se voit pas');
  verif((await p.locator('#abos .offre').innerText()).includes('Gérer mon abonnement') && (await p.locator('#produits .offre').first().innerText()).includes('Dans ta bibliothèque'), 'ce qu\'on a déjà : « gérer », « dans ta bibliothèque », pas « acheter »');
  await image(p, 'boutique');
  await p.click('[data-produit="portefaix-tenues"]');
  verif(await p.locator('#caisse').evaluate(d => d.open) && (await p.locator('#caisse-prix').innerText()).includes('1,99') && (await p.locator('#caisse-acces-texte').innerText()).includes('rétractation'), 'acheter : la caisse montre le produit, son prix, et la case sur la rétractation');
  await p.click('#caisse-oui');
  verif((await p.locator('#caisse-avis').innerText()).includes('deux cases') && !service.paiements.some(x => x.action === 'acheter'), 'sans les cases : rien ne part');
  await p.check('#caisse-acces'); await p.check('#caisse-cgv'); await p.click('#caisse-oui');
  verif(await dit(p, '#retour-titre', /Merci/) && service.achats['u-ada'].some(a => a.produit === 'portefaix-tenues') && !p.url().includes('paiement='), 'les cases cochées : la commande part ; de retour du paiement, la page remercie');
  const hors = await ouvrir('boutique.html' + AVEC);
  await hors.waitForSelector('[data-produit]', { timeout: 8000 }).catch(() => {});
  await hors.click('[data-produit="lisiere-carnet"]'); await hors.waitForURL(/compte\.html/, { timeout: 8000 }).catch(() => {});
  verif(hors.url().includes('compte.html'), 'acheter sans être connecté : on est conduit à la page du compte');

  console.log('7. Les données : télécharger, supprimer');
  await p.goto(BASE + 'compte.html#donnees');
  const [fichier] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#d-export')]);
  const contenu = fichier ? JSON.parse(fs.readFileSync(await fichier.path(), 'utf8')) : {};
  verif(fichier && fichier.suggestedFilename() === 'stonevalley-mes-donnees.json' && contenu.compte && contenu.compte.email === 'ada@exemple.fr' && contenu.boutique && contenu.exporte_le, 'télécharger mes données : un fichier, avec le compte, les jeux, la boutique');
  await image(p, 'compte-donnees');
  await p.click('[data-p="abonnement"]'); await p.click('#ab-resilier'); await p.click('#d-resilier-oui'); await dit(p, '#ab-carte', /Résilié/);
  await p.click('[data-p="donnees"]');
  await p.fill('#x-mdp', 'faux'); await p.fill('#x-mot', 'SUPPRIMER'); await p.click('#f-supprimer button[type=submit]');
  verif(await dit(p, '#f-supprimer .avis', /ne va pas/) && service.supprimes.length === 0, 'supprimer avec un mauvais mot de passe : refusé');
  await p.fill('#x-mdp', 'unnouveaumdp'); await p.fill('#x-mot', 'effacer'); await p.click('#f-supprimer button[type=submit]');
  verif((await p.locator('#f-supprimer .avis').innerText()).includes('SUPPRIMER') && service.supprimes.length === 0, 'sans le mot SUPPRIMER : refusé');
  await p.fill('#x-mot', 'SUPPRIMER'); await p.click('#f-supprimer button[type=submit]');
  verif(await dit(p, '#lien-titre', /supprimé/) && service.supprimes.includes('ada@exemple.fr') && await p.locator('#porte').isVisible() && await p.evaluate(() => localStorage.getItem('stonevalley:session')) === null,
    'avec les deux : le compte est effacé, la session aussi, la porte revient');

  console.log('8. Se déconnecter');
  p = await ouvrir('compte.html' + AVEC); await entrer(p, 'bob@exemple.fr');
  await p.click('#ouvre-compte'); await p.click('#sortir');
  verif(await p.locator('#porte').isVisible() && service.journal.some(l => l.includes('/auth/v1/logout?scope=local')), 'le menu de l\'en-tête : se déconnecter ferme la session de ce navigateur');
  await entrer(p, 'bob@exemple.fr'); await p.click('[data-p="securite"]'); await p.click('#s-partout');
  verif(await dit(p, '#lien-titre', /partout/) && service.journal.some(l => l.includes('/auth/v1/logout?scope=global')), '« me déconnecter partout » ferme toutes les sessions');

  console.log('8 bis. La session commune au portail et aux jeux');
  const commune = await p.evaluate(() => JSON.parse(localStorage.getItem('stonevalley:session')));
  verif(commune === null, 'déconnecté : plus de session commune, les jeux ne sont plus connectés non plus');
  await entrer(p, 'bob@exemple.fr');
  const c1 = await p.evaluate(() => JSON.parse(localStorage.getItem('stonevalley:session')));
  verif(c1 && c1.jeton === 'jeton:bob@exemple.fr:1' && c1.refresh && c1.uid === 'u-bob' && c1.email === 'bob@exemple.fr' && c1.exp > Date.now(), 'connecté : la session est sous la clé commune, dans la forme que lisent les jeux');
  // (un jeu renouvelle la session pendant que le portail dort : le portail prend la sienne, sans redemander)
  const avant = service.journal.filter(l => l.includes('grant_type=refresh_token')).length;
  await p.evaluate(() => { window.SV.session().exp = Date.now() - 1000; const s = JSON.parse(localStorage.getItem('stonevalley:session')); s.jeton = 'jeton:bob@exemple.fr:7'; s.refresh = 'reprise:bob@exemple.fr:7'; s.exp = Date.now() + 3600e3; localStorage.setItem('stonevalley:session', JSON.stringify(s)); });
  const pris = await p.evaluate(() => window.SV.jeton());
  verif(pris === 'jeton:bob@exemple.fr:7' && service.journal.filter(l => l.includes('grant_type=refresh_token')).length === avant, 'un jeu a renouvelé la session : le portail prend la sienne au lieu de redemander');
  await p.evaluate(() => { window.SV.session().exp = Date.now() - 1000; });
  const renouvele = await p.evaluate(() => window.SV.jeton());
  verif(renouvele === 'jeton:bob@exemple.fr:8' && await p.evaluate(() => JSON.parse(localStorage.getItem('stonevalley:session')).refresh) === 'reprise:bob@exemple.fr:8', 'personne ne l\'a renouvelée : le portail le fait, et l\'écrit pour les jeux');
  const vieux = await ouvrir(AVEC);
  await vieux.evaluate(() => localStorage.setItem('stone_valley_session', JSON.stringify({ jeton: 'jeton:dan@exemple.fr:1', refresh: 'reprise:dan@exemple.fr:1', exp: Date.now() + 3600e3, uid: 'u-dan', email: 'dan@exemple.fr' })));
  await vieux.goto(BASE + 'compte.html'); await vieux.waitForSelector('#espace:not([hidden])', { timeout: 8000 }).catch(() => {});
  verif(await vieux.locator('#espace').isVisible() && (await vieux.locator('#moi-email').innerText()) === 'dan@exemple.fr' && await vieux.evaluate(() => !!localStorage.getItem('stonevalley:session') && !localStorage.getItem('stone_valley_session')), 'déjà connecté dans Stone Valley avant la session commune : on l\'est au portail en arrivant');

  console.log('9. Avant que la base ne connaisse la boutique (le portail tel qu\'il s\'ouvre aujourd\'hui)');
  p = await ouvrir('boutique.html' + SANS);
  verif(await dit(p, '#abos', /Aucune formule/) && await dit(p, '#produits', /gratuitement/) && await p.locator('#produits .offre').count() === 5, 'la boutique : rien à vendre, c\'est dit, et les cinq jeux gratuits');
  await p.goto(BASE + 'compte.html'); await entrer(p, 'cleo@exemple.fr');
  await p.click('[data-p="bibliotheque"]'); await p.waitForTimeout(400);
  verif(await p.locator('#b-jeux .avancee').count() === 0 && await p.locator('#b-jeux li[data-jeu="lisiere"] a.bouton:not(.calme)').innerText() === 'Jouer',
    'un compte sans partie de Lisière : rien sous son nom, et « Jouer »');
  await p.click('[data-p="achats"]');
  verif(await dit(p, '#a-liste', /Aucun achat/), 'les achats : aucun, sans erreur');
  await p.click('#a-gerer');
  verif(await dit(p, '#a-gerer-avis', /pas encore ouverts/), 'gérer ses moyens de paiement : « les paiements ne sont pas encore ouverts »');
  await p.click('[data-p="abonnement"]');
  verif(await dit(p, '#ab-carte', /Aucun abonnement/), 'l\'abonnement : aucun');
  await p.click('[data-p="donnees"]');
  const [f2] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#d-export')]);
  const c2 = f2 ? JSON.parse(fs.readFileSync(await f2.path(), 'utf8')) : {};
  verif(c2.compte && c2.compte.email === 'cleo@exemple.fr' && c2.stone_valley, 'télécharger mes données marche déjà : avec ce que les jeux savent rendre');
  await p.fill('#x-mdp', 'bon'); await p.fill('#x-mot', 'SUPPRIMER'); await p.click('#f-supprimer button[type=submit]');
  verif(await dit(p, '#lien-titre', /supprimé/) && nu.supprimes.includes('cleo@exemple.fr') && nu.journal.some(l => l.includes('rpc/vp_supprimer_compte')), 'supprimer son compte marche déjà : par la fonction des jeux');

  console.log('10. Les textes légaux');
  for (const [f, titre] of [['cgu', 'Conditions générales d\'utilisation'], ['cgv', 'Conditions générales de vente'], ['confidentialite', 'Politique de confidentialité'], ['cookies', 'Cookies et traceurs'], ['mentions-legales', 'Mentions légales']]) {
    await p.goto(BASE + 'legal/' + f + '.html');
    const liens = await p.locator('article a[href]').evaluateAll(l => l.map(a => a.href).filter(h => h.startsWith(location.origin)));
    const morts = []; for (const l of [...new Set(liens.map(l => l.split('#')[0]))]) { const r = await p.request.get(l); if (r.status() !== 200) morts.push(l); }
    verif(await p.locator('article h1').innerText() === titre && await p.locator('.legal nav a[aria-current]').count() === 1 && await p.locator('#pied a[href$="legal/cgv.html"]').count() === 1 && morts.length === 0, `${titre} : la page, son menu, le pied, aucun lien mort`);
  }
  verif(await p.locator('#preparation').isVisible() && await p.locator('.a-completer').count() > 5, 'tant que l\'éditeur n\'est pas renseigné (assets/editeur.js) : « à compléter », en rouge, et un avis en tête');
  await image(p, 'mentions-legales');
  await p.addInitScript(() => { window.__editeur = { nom: 'Studio d\'essai', forme: 'SAS', adresse: '1 rue de l\'Essai, Paris', siren: '000 000 000', tva: 'FR00', directeur: 'A. Essai', contact: 'contact@exemple.fr', donnees: 'donnees@exemple.fr', telephone: '01 00 00 00 00', prestataire_paiement: 'Paiements d\'essai', mediateur: 'Médiateur d\'essai', mediateur_site: 'https://exemple.fr' }; Object.defineProperty(window, 'SV_EDITEUR', { get: () => window.__editeur, set: () => {} }); });
  await p.goto(BASE + 'legal/cgv.html');
  verif(await p.locator('#preparation').isHidden() && await p.locator('.a-completer').count() === 0 && await p.locator('article a[href="mailto:contact@exemple.fr"]').count() >= 1, 'l\'éditeur renseigné : plus rien à compléter, l\'avis disparaît, l\'adresse de contact est un lien');

  console.log('11. Sur un téléphone');
  p = await ouvrir(AVEC, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const large = async () => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  let tient = await large();
  await image(p, 'telephone-accueil');
  await p.click('#ouvre-nav');
  verif(await p.locator('#nav a').first().isVisible(), 'le menu s\'ouvre par son bouton');
  for (const u of ['jeu.html?j=lisiere', 'boutique.html', 'legal/confidentialite.html', 'compte.html']) { await p.goto(BASE + u); await p.waitForTimeout(150); tient = tient && await large(); }
  await entrer(p, 'bob@exemple.fr'); tient = tient && await large();
  await image(p, 'telephone-compte');
  verif(tient, 'aucune page ne déborde en largeur (accueil, fiche, boutique, texte légal, compte)');

  console.log('12. L\'application installable');
  p = await ouvrir(AVEC);
  const manifeste = await (await p.request.get(BASE + await p.locator('link[rel="manifest"]').getAttribute('href'))).json();
  const icones = []; for (const i of manifeste.icons) icones.push((await p.request.get(BASE + i.src)).status());
  verif(manifeste.name === 'StoneValley' && manifeste.display === 'standalone' && manifeste.scope === '/' && icones.length === 4 && icones.every(c => c === 200) && manifeste.icons.some(i => i.purpose === 'maskable')
    && (await p.request.get(BASE + 'images/icones/apple-touch-icon.png')).status() === 200, 'le manifeste : un nom, le plein écran, quatre icônes qui existent (dont une découpable), et celle de l\'iPhone');
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
  await p.waitForFunction(() => caches.open('stonevalley-portail-3').then(c => c.keys()).then(k => k.length >= 20), null, { timeout: 10000 }).catch(() => {});
  verif(await p.evaluate(() => !!navigator.serviceWorker.controller), 'le service worker est en place et tient la page');
  const passe = await p.evaluate(() => fetch('/stonevalley/quelque-chose.js').then(r => r.status));
  verif(passe === 404 && await p.evaluate(() => caches.open('stonevalley-portail-3').then(c => c.keys()).then(k => !k.some(r => /stonevalley\/quelque/.test(r.url)))), 'il laisse passer l\'adresse d\'un jeu sans y toucher ni la garder');
  await p.context().setOffline(true);
  await p.goto(BASE); const horsLigne = await p.locator('#liste-jeux .jeu').count() === 5 && await p.locator('#une h1').innerText() === 'Stone Valley';
  await p.goto(BASE + 'jeu.html?j=lisiere'); const ficheHorsLigne = await p.locator('h1').innerText() === 'Lisière';
  await p.goto(BASE + 'legal/cgu.html'); const cguHorsLigne = (await p.locator('article h1').innerText()).includes('Conditions');
  await p.context().setOffline(false);
  verif(horsLigne && ficheHorsLigne && cguHorsLigne, 'sans réseau : l\'accueil, une fiche et les conditions s\'ouvrent encore');

  // une publication nouvelle : la page revenue au premier plan (l'application installée qu'on rouvre) se recharge d'elle-même ;
  // si l'on était en train d'écrire, elle le propose
  await p.goto(BASE + AVEC); await p.waitForLoadState('networkidle');
  const datee = await p.evaluate(() => window.SV_MAJ.publiee) === publie.getTime();
  await p.evaluate(() => { window.vieille = true; document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(600);
  const pareille = await p.evaluate(() => window.vieille === true);
  await p.reload(); await p.waitForLoadState('networkidle');
  await p.evaluate(() => { window.vieille = true; });
  publie = new Date(publie.getTime() + 60000);
  let charge = p.waitForEvent('load', { timeout: 8000 }).then(() => true, () => false);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const rechargee = await charge && await p.evaluate(() => !window.vieille && window.SV_MAJ.publiee) === publie.getTime() && await p.locator('#liste-jeux .jeu').count() === 5;
  verif(datee && pareille && rechargee, 'une publication nouvelle : revenue au premier plan, la page se recharge d\'elle-même sur elle (rien de neuf : elle ne bouge pas)');
  await p.goto(BASE + 'compte.html' + AVEC); await p.waitForLoadState('networkidle');
  await p.fill('#c-email', 'quelqu@exemple.fr');
  await p.evaluate(() => { window.vieille = true; });
  publie = new Date(publie.getTime() + 60000);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const propose = await p.waitForSelector('#maj-portail:not([hidden])', { timeout: 8000 }).then(() => true, () => false);
  const garde = await p.evaluate(() => window.vieille === true) && await p.inputValue('#c-email') === 'quelqu@exemple.fr';
  await image(p, 'mise-a-jour');
  charge = p.waitForEvent('load', { timeout: 8000 }).then(() => true, () => false);
  await p.click('#maj-portail button');
  verif(propose && garde && await charge, 'en train d\'écrire (une adresse dans la connexion) : la page ne se recharge pas, elle propose « Recharger », et le fait au clic');

  verif(erreurs.length === 0, 'aucune erreur de script' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); srv.close(); service.serveur.close(); nu.serveur.close();
  console.log(ok ? `\n${n} vérifications : tout passe.` : `\n${n} vérifications : des échecs.`);
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
