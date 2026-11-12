// StoneValley — L'ESSAI DE LA PAGE D'ACCUEIL (outils/essai.js)
// Dans Chromium, contre un faux service de comptes (outils/faux-service.js) : aucun vrai e-mail ne part, aucun compte n'est créé.
// Les fiches des jeux ; créer un compte ; mot de passe oublié ; l'arrivée par le lien d'un e-mail (expiré, de confirmation, de mot de
// passe) ; la page sur un téléphone, en thème sombre.
//   node outils/essai.js [dossier où poser des images]
// Il faut Playwright et son Chromium (ou NAVIGATEUR=chrome, pour le Chrome de la machine). Il sort avec le code 0 si tout passe.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SITE = path.join(__dirname, '..'), { creer } = require('./faux-service.js'), IMAGES = process.argv[2] || null;
let ok = true, n = 0;
const verif = (c, m) => { n++; ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
(async () => {
  const service = creer();
  await new Promise(f => service.serveur.listen(8136, '127.0.0.1', f));
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(SITE, 'index.html'))); });
  await new Promise(f => srv.listen(8137, '127.0.0.1', f));
  const BASE = 'http://127.0.0.1:8137/?service=http://127.0.0.1:8136';
  const nav = await chromium.launch({ channel: process.env.NAVIGATEUR || undefined });
  const erreurs = [];
  const ouvrir = async (suite, opts) => { const ctx = await nav.newContext(opts || { viewport: { width: 1100, height: 800 } }), p = await ctx.newPage(); p.on('pageerror', e => erreurs.push(e.message)); await p.goto(BASE + (suite || '')); return p; };
  const texte = (p, id) => p.locator('#' + id).innerText();

  console.log('1. Les jeux');
  let p = await ouvrir();
  const jeux = await p.locator('.jeu').evaluateAll(l => l.map(e => ({ nom: e.querySelector('h3').textContent, lien: e.querySelector('a').href })));
  verif(jeux.length === 5 && jeux.every(j => j.lien.startsWith('https://stonevalleyoff-ai.github.io/')), `cinq fiches : ${jeux.map(j => j.nom).join(', ')}`);
  verif(await p.locator('#lien').isHidden() && await p.locator('#nouveau').isHidden(), 'venu sans lien : pas de bandeau, pas de formulaire de mot de passe');
  if (IMAGES) await p.screenshot({ path: path.join(IMAGES, 'accueil-1.png'), fullPage: true });

  console.log('2. Créer un compte');
  await p.locator('#d-creer summary').click();
  await p.fill('#c-pseudo', 'Eve'); await p.fill('#c-email', 'pas-une-adresse'); await p.fill('#c-mdp', 'motdepasse'); await p.click('#c-creer');
  verif((await texte(p, 'c-avis')).includes('ne se lit pas') && !service.journal.some(l => l.includes('signup')), 'une adresse qui n\'en est pas une : c\'est dit, rien n\'est envoyé');
  await p.fill('#c-email', 'eve@exemple.fr'); await p.fill('#c-mdp', 'court'); await p.click('#c-creer');
  verif((await texte(p, 'c-avis')).includes('6 caractères'), 'un mot de passe trop court : refusé');
  await p.fill('#c-email', 'ada@exemple.fr'); await p.fill('#c-mdp', 'motdepasse'); await p.click('#c-creer');
  await p.waitForFunction(() => /déjà un compte/.test(document.getElementById('c-avis').textContent), null, { timeout: 8000 }).catch(() => {});
  verif((await texte(p, 'c-avis')).includes('déjà un compte'), 'une adresse déjà prise : c\'est dit, avec quoi faire');
  await p.fill('#c-email', 'eve@exemple.fr'); await p.click('#c-creer');
  await p.waitForFunction(() => /confirmation/.test(document.getElementById('c-avis').textContent), null, { timeout: 8000 }).catch(() => {});
  verif((await texte(p, 'c-avis')).includes('confirmation') && service.comptes['eve@exemple.fr'] && service.comptes['eve@exemple.fr'].choisi === 'Eve' && await p.inputValue('#c-mdp') === '',
    'une adresse neuve : le compte est créé avec son pseudo, la page dit d\'aller confirmer, et le mot de passe quitte le champ');
  verif(service.journal.some(l => l.includes('/auth/v1/signup?redirect_to=' + encodeURIComponent('http://127.0.0.1:8137/'))), 'le lien de l\'e-mail ramènera à cette page');

  console.log('3. Mot de passe oublié');
  await p.locator('#d-oubli summary').click();
  await p.fill('#o-email', 'dan@exemple.fr'); await p.click('#o-envoyer');
  await p.waitForFunction(() => /vient de partir/.test(document.getElementById('o-avis').textContent), null, { timeout: 8000 }).catch(() => {});
  verif((await texte(p, 'o-avis')).includes('vient de partir') && service.courrier.some(c => c.genre === 'mot de passe' && c.email === 'dan@exemple.fr'), 'le lien est demandé ; la page dit d\'aller voir ses e-mails, sans dire si le compte existe');
  if (IMAGES) await p.screenshot({ path: path.join(IMAGES, 'accueil-2.png'), fullPage: true });

  console.log('4. Arrivé par le lien d\'un e-mail');
  p = await ouvrir('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  verif((await texte(p, 'lien-titre')).includes('ne vaut plus') && await p.locator('#d-oubli').evaluate(d => d.open) && await p.evaluate(() => location.hash === ''), 'un lien expiré : c\'est dit, « Mot de passe oublié » s\'ouvre, l\'adresse est nettoyée');
  p = await ouvrir('#access_token=nimporte&refresh_token=x&type=recovery');
  await p.waitForFunction(() => /ne vaut plus/.test(document.getElementById('lien-titre').textContent), null, { timeout: 8000 }).catch(() => {});
  verif((await texte(p, 'lien-titre')).includes('ne vaut plus') && await p.locator('#nouveau').isHidden(), 'un jeton qui ne vaut rien : pareil, pas de formulaire');
  p = await ouvrir('#access_token=' + encodeURIComponent('jeton:eve@exemple.fr:3') + '&refresh_token=x&type=signup');
  await p.waitForFunction(() => /confirmé/.test(document.getElementById('lien-titre').textContent), null, { timeout: 8000 }).catch(() => {});
  verif((await texte(p, 'lien-titre')).includes('confirmé') && (await texte(p, 'lien-texte')).includes('eve@exemple.fr') && await p.locator('#nouveau').isHidden(), 'le lien de confirmation : « Ton compte est confirmé », avec son adresse');
  p = await ouvrir('#access_token=' + encodeURIComponent('jeton:dan@exemple.fr:9') + '&refresh_token=x&type=recovery');
  await p.waitForSelector('#nouveau:not([hidden])', { timeout: 8000 }).catch(() => {});
  verif(await p.locator('#nouveau').isVisible() && (await texte(p, 'lien-texte')).includes('dan@exemple.fr') && await p.evaluate(() => location.hash === ''), 'le lien de mot de passe : le formulaire s\'ouvre, pour la bonne adresse ; le jeton n\'est plus dans l\'adresse');
  await p.fill('#n-mdp', 'tout-neuf'); await p.fill('#n-encore', 'tout-nuef'); await p.click('#n-valider');
  verif((await texte(p, 'n-avis')).includes('pas les mêmes') && !service.comptes['dan@exemple.fr'].mdp, 'deux saisies différentes : refusé');
  if (IMAGES) await p.screenshot({ path: path.join(IMAGES, 'accueil-3.png') });
  await p.fill('#n-encore', 'tout-neuf'); await p.click('#n-valider');
  await p.waitForFunction(() => /changé/.test(document.getElementById('lien-titre').textContent), null, { timeout: 8000 }).catch(() => {});
  verif((await texte(p, 'lien-titre')).includes('changé') && service.comptes['dan@exemple.fr'].mdp === 'tout-neuf' && await p.locator('#nouveau').isHidden(), 'les mêmes : le mot de passe est changé, et c\'est dit');

  console.log('5. Sur un téléphone, dans le noir');
  p = await ouvrir('', { viewport: { width: 390, height: 780 }, colorScheme: 'dark', isMobile: true });
  const large = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const sombre = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  verif(large && sombre === 'rgb(13, 16, 22)', 'à 390 pixels de large : rien ne déborde, et la page suit le thème sombre');
  if (IMAGES) await p.screenshot({ path: path.join(IMAGES, 'accueil-4.png'), fullPage: true });
  verif(!erreurs.length, 'aucune erreur dans la page' + (erreurs.length ? ' ; ' + erreurs.slice(0, 3).join(' | ') : ''));

  console.log(`\n${ok ? 'Tout passe' : 'ÉCHEC'} : ${n} vérifications`);
  await nav.close(); srv.close(); service.serveur.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
