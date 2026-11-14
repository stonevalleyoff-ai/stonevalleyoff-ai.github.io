// StoneValley — LE FAUX SERVICE DE COMPTES (outils/faux-service.js)
// Répond comme le service de comptes des jeux (le projet Supabase « Vallée de pierre ») pour ce dont la page d'accueil se sert :
// se connecter, créer un compte, demander un nouveau mot de passe, lire qui l'on est, changer de pseudo, d'adresse, de mot de passe,
// télécharger ses données, supprimer son compte ; et la boutique (supabase.sql) : le catalogue, les achats, l'abonnement, la fonction de
// paiement. Tout est en mémoire ; aucun e-mail ne part, aucun paiement n'a lieu : les demandes sont notées. Il vient du faux service des
// essais de Portefaix (il sait aussi ses salons en ligne).
// Comptes : ada@exemple.fr (un achat, un abonnement), bob@exemple.fr, cleo@exemple.fr, dan@exemple.fr ; mot de passe « bon ».
// creer({ boutique: false }) : la base ne connaît pas encore la boutique (comme avant d'y passer supabase.sql) ;
// creer({ paiement: false }) : la fonction de paiement n'existe pas encore.
'use strict';
const http = require('http');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function creer(options) {
  const OPT = Object.assign({ boutique: true, paiement: true }, options || {});
  const COMPTES = { 'ada@exemple.fr': { id: 'u-ada', pseudo: 'Ada' }, 'bob@exemple.fr': { id: 'u-bob', pseudo: 'Bob' }, 'cleo@exemple.fr': { id: 'u-cleo', pseudo: '' },
    'dan@exemple.fr': { id: 'u-dan', pseudo: 'Dan' } };
  const PRODUITS = [
    { id: 'soutien-mensuel', genre: 'abonnement', nom: 'Soutien', resume: 'Une formule d\'essai, pour voir la boutique.', jeu: null, prix_centimes: 499, devise: 'EUR', periode: 'mois', en_avant: true, actif: true },
    { id: 'lisiere-carnet', genre: 'contenu', nom: 'Le carnet relié', resume: 'Un contenu d\'essai pour Lisière.', jeu: 'lisiere', prix_centimes: 299, devise: 'EUR', periode: null, en_avant: false, actif: true },
    { id: 'portefaix-tenues', genre: 'contenu', nom: 'Les tenues de nuit', resume: 'Un contenu d\'essai pour Portefaix.', jeu: 'portefaix', prix_centimes: 199, devise: 'EUR', periode: null, en_avant: false, actif: true },
    { id: 'pas-encore', genre: 'contenu', nom: 'Pas encore en vente', resume: '', jeu: null, prix_centimes: 100, devise: 'EUR', periode: null, en_avant: false, actif: false }];
  const dans = jours => new Date(Date.now() + jours * 864e5).toISOString();
  const achats = { 'u-ada': [{ id: 'a-1', produit: 'lisiere-carnet', etat: 'paye', montant_centimes: 299, devise: 'EUR', paye_le: dans(-12), cree_le: dans(-12), facture_url: 'https://exemple.fr/facture/a-1' }] };
  const abonnements = { 'u-ada': { produit: 'soutien-mensuel', etat: 'actif', debut: dans(-40), periode_fin: dans(20), resilie_le: null } };
  const paiements = [];            // ce qui a été demandé à la fonction de paiement : { uid, action, produit }
  const supprimes = [];            // les comptes effacés
  const produit = id => PRODUITS.find(p => p.id === id);
  const courrier = [];             // les e-mails qui seraient partis : { genre, email }
  const salons = new Map();        // code → { hote, etat, membres: [{ uid, numero, pseudo }], signaux: [{ id, de, vers, donnees }] }
  let suite = 0;
  const journal = [];
  const pseudo = p => (String(p || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16).trim()) || 'Porteur';
  const sortir = uid => { for (const [c, s] of salons) { if (s.hote === uid) salons.delete(c); else s.membres = s.membres.filter(m => m.uid !== uid); } };
  const fonctions = {
    pf_salon_creer(uid, p) {
      sortir(uid);
      let c; do { c = Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * 32)]).join(''); } while (salons.has(c));
      salons.set(c, { hote: uid, etat: 'ouvert', membres: [{ uid, numero: 1, pseudo: pseudo(p.p_pseudo) }], signaux: [] });
      return { code: c, numero: 1 };
    },
    pf_salon_rejoindre(uid, p) {
      const c = String(p.p_code || '').trim().toUpperCase(), s = salons.get(c);
      if (!s) return { erreur: 'introuvable' };
      const deja = s.membres.find(m => m.uid === uid);
      if (deja) { deja.pseudo = pseudo(p.p_pseudo); return { code: c, numero: deja.numero }; }
      if (s.etat !== 'ouvert') return { erreur: 'parti' };
      if (s.membres.length >= 6) return { erreur: 'complet' };
      sortir(uid);
      const n = Math.max(...s.membres.map(m => m.numero)) + 1;
      s.membres.push({ uid, numero: n, pseudo: pseudo(p.p_pseudo) });
      return { code: c, numero: n };
    },
    pf_salon_etat(uid, p) {
      const c = String(p.p_code || '').trim().toUpperCase(), s = salons.get(c), moi = s && s.membres.find(m => m.uid === uid);
      if (!moi) return { erreur: 'dehors' };
      return { code: c, etat: s.etat, numero: moi.numero, membres: s.membres.map(m => ({ numero: m.numero, pseudo: m.pseudo })).sort((a, b) => a.numero - b.numero),
        signaux: s.signaux.filter(x => x.vers === moi.numero && x.id > (p.p_apres || 0)).map(x => ({ id: x.id, de: x.de, donnees: x.donnees })) };
    },
    pf_salon_signal(uid, p) {
      const c = String(p.p_code || '').trim().toUpperCase(), s = salons.get(c), moi = s && s.membres.find(m => m.uid === uid);
      if (!moi) return { erreur: 'dehors' };
      if (p.p_donnees == null || JSON.stringify(p.p_donnees).length > 8000 || s.signaux.length >= 800) return { erreur: 'trop' };
      if (p.p_vers === moi.numero || !s.membres.some(m => m.numero === p.p_vers)) return { erreur: 'destinataire' };
      s.signaux.push({ id: ++suite, de: moi.numero, vers: p.p_vers, donnees: p.p_donnees });
      return { ok: true };
    },
    pf_salon_partir(uid, p) {
      const s = salons.get(String(p.p_code || '').trim().toUpperCase());
      if (!s || s.hote !== uid) return { ok: false };
      s.etat = 'parti'; return { ok: true };
    },
    pf_salon_quitter(uid, p) {
      const c = String(p.p_code || '').trim().toUpperCase(), s = salons.get(c);
      if (!s) return { ok: false };
      if (s.hote === uid) { salons.delete(c); return { ok: true }; }
      const moi = s.membres.find(m => m.uid === uid);
      if (!moi) return { ok: false };
      s.membres = s.membres.filter(m => m !== moi); s.signaux = s.signaux.filter(x => x.de !== moi.numero && x.vers !== moi.numero);
      return { ok: true };
    },
  };
  const utilisateur = email => { const c = COMPTES[email]; return { id: c.id, email, created_at: c.cree_le || '2026-09-20T10:00:00Z', last_sign_in_at: new Date().toISOString(),
    user_metadata: Object.assign({}, c.meta || {}, c.choisi ? { pseudo: c.choisi } : {}) }; };
  const session = (email, n) => ({ access_token: `jeton:${email}:${n}`, refresh_token: `reprise:${email}:${n}`, expires_in: 3600, user: utilisateur(email) });
  // --- le portail : la boutique et le compte (supabase.sql) ---
  const portail = {
    sv_mon_espace(uid) {
      const b = abonnements[uid];
      return { achats: (achats[uid] || []).filter(a => a.etat !== 'en_attente').map(a => Object.assign({ nom: produit(a.produit).nom, genre: produit(a.produit).genre, jeu: produit(a.produit).jeu }, a)),
        abonnement: b ? Object.assign({ nom: produit(b.produit).nom, prix_centimes: produit(b.produit).prix_centimes, devise: 'EUR', periode: produit(b.produit).periode }, b) : null };
    },
    sv_mes_donnees(uid, p, email) {
      return { compte: { id: uid, email, profil: utilisateur(email).user_metadata }, stone_valley: { personnage: { donnees: { sac: {} }, rev: 3 }, messages: [] }, lisiere: { parties: [] },
        boutique: { achats: achats[uid] || [], abonnements: abonnements[uid] ? [abonnements[uid]] : [] } };
    },
    sv_compte_supprimer(uid, p, email) {
      const b = abonnements[uid];
      if (b && b.etat !== 'termine' && !b.resilie_le) return { erreur: 'abonnement' };
      supprimes.push(email); delete COMPTES[email];
      return { ok: true };
    },
  };
  const desJeux = {                // (ce que les jeux savent déjà rendre, portail ou non)
    vp_supprimer_compte(uid, p, email) { supprimes.push(email); delete COMPTES[email]; return { ok: true }; },
    vp_charger_compte() { return { donnees: { sac: {} }, rev: 3 }; },
    lisiere_moi() { return { pseudo: null, parties: 0 }; },
  };
  function payer(uid, j) {
    paiements.push({ uid, action: j.action, produit: j.produit || null });
    const b = abonnements[uid];
    if (j.action === 'acheter') {
      const p = produit(j.produit);
      if (!p || !p.actif) return [400, { message: 'Ce produit n\'est pas en vente.' }];
      if (!j.acces_immediat || !j.cgv) return [400, { message: 'Il faut accepter les conditions.' }];
      // (le vrai prestataire encaisse sur sa page, puis prévient la base ; ici c'est fait tout de suite)
      if (p.genre === 'abonnement') abonnements[uid] = { produit: p.id, etat: 'actif', debut: dans(0), periode_fin: dans(30), resilie_le: null };
      else (achats[uid] = achats[uid] || []).unshift({ id: 'a-' + (paiements.length + 1), produit: p.id, etat: 'paye', montant_centimes: p.prix_centimes, devise: 'EUR', paye_le: dans(0), cree_le: dans(0), facture_url: null });
      return [200, { url: String(j.retour || '') + '?paiement=ok' }];
    }
    if (j.action === 'gerer') return [200, { url: String(j.retour || '') }];
    if (j.action === 'resilier') { if (!b || b.resilie_le) return [400, { message: 'Aucun abonnement à résilier.' }]; b.resilie_le = dans(0); return [200, { ok: true, periode_fin: b.periode_fin }]; }
    if (j.action === 'reprendre') { if (!b || !b.resilie_le) return [400, { message: 'Aucun abonnement à reprendre.' }]; b.resilie_le = null; return [200, { ok: true }]; }
    return [400, { message: 'Action inconnue.' }];
  }
  const serveur = http.createServer((req, res) => {
    let corps = '';
    req.on('data', d => { corps += d; });
    req.on('end', () => {
      const rendre = (code, objet) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' }); res.end(JSON.stringify(objet)); };
      if (req.method === 'OPTIONS') return rendre(200, {});
      let j = {}; try { j = corps ? JSON.parse(corps) : {}; } catch (e) { return rendre(400, {}); }
      const porteur = /^Bearer jeton:([^:]+):/.exec(req.headers.authorization || ''), email = porteur && COMPTES[porteur[1]] ? porteur[1] : null;
      journal.push(`${req.method} ${req.url}`);
      if (!req.headers.apikey) return rendre(401, { message: 'pas de clé' });
      if (req.url.startsWith('/auth/v1/token?grant_type=password')) {
        const c = COMPTES[j.email];
        if (!c || j.password !== (c.mdp || 'bon')) return rendre(400, { code: 400, error_code: 'invalid_credentials' });
        return c.a_confirmer ? rendre(400, { code: 400, error_code: 'email_not_confirmed' }) : rendre(200, session(j.email, 1));
      }
      if (req.url.startsWith('/auth/v1/signup')) {
        if (!/redirect_to=http/.test(req.url)) return rendre(400, { code: 400, error_code: 'validation_failed' });
        if (String(j.password || '').length < 6) return rendre(422, { code: 422, error_code: 'weak_password' });
        if (COMPTES[j.email]) return rendre(200, { id: 'u-faux', email: j.email, identities: [] });       // (comme le vrai service, pour une adresse déjà prise)
        COMPTES[j.email] = { id: 'u-' + Object.keys(COMPTES).length, pseudo: '', choisi: String((j.data || {}).pseudo || ''), mdp: j.password, a_confirmer: true, meta: j.data || {}, cree_le: new Date().toISOString() };
        courrier.push({ genre: 'confirmation', email: j.email });
        return rendre(200, { id: COMPTES[j.email].id, email: j.email, identities: [{ provider: 'email' }], confirmation_sent_at: new Date().toISOString() });
      }
      if (req.url.startsWith('/auth/v1/recover')) {
        if (!/redirect_to=http/.test(req.url)) return rendre(400, { code: 400, error_code: 'validation_failed' });
        courrier.push({ genre: 'mot de passe', email: j.email });
        return rendre(200, {});
      }
      if (req.url.startsWith('/auth/v1/token?grant_type=refresh_token')) {
        const m = /^reprise:([^:]+):(\d+)$/.exec(j.refresh_token || '');
        return m && COMPTES[m[1]] ? rendre(200, session(m[1], +m[2] + 1)) : rendre(400, { code: 400, error_code: 'refresh_token_not_found' });
      }
      if (req.url.startsWith('/rest/v1/sv_produits')) return OPT.boutique ? rendre(200, PRODUITS.filter(p => p.actif)) : rendre(404, { code: 'PGRST205' });   // (le catalogue se lit sans compte)
      if (!email) return rendre(401, { message: 'pas de jeton' });
      if (req.url.startsWith('/functions/v1/sv-paiement')) { if (!OPT.paiement) return rendre(404, { code: 'NOT_FOUND' }); const r = payer(COMPTES[email].id, j); return rendre(r[0], r[1]); }
      if (req.url.startsWith('/rest/v1/vp_comptes')) return rendre(200, [{ pseudo: COMPTES[email].pseudo || null }]);
      if (req.url.startsWith('/auth/v1/user') && req.method === 'GET') { COMPTES[email].a_confirmer = false; return rendre(200, utilisateur(email)); }
      if (req.url.startsWith('/auth/v1/user') && req.method === 'PUT') {
        if (j.password != null) { if (String(j.password).length < 6) return rendre(422, { code: 422, error_code: 'weak_password' }); COMPTES[email].mdp = String(j.password); }
        if (j.data) COMPTES[email].choisi = String(j.data.pseudo || '');
        if (j.email) { if (COMPTES[j.email]) return rendre(422, { code: 422, error_code: 'email_exists' }); courrier.push({ genre: 'changement d\'adresse', email: j.email }); }
        return rendre(200, utilisateur(email));
      }
      if (req.url.startsWith('/auth/v1/logout')) return rendre(204, {});
      const f = /^\/rest\/v1\/rpc\/(\w+)/.exec(req.url);
      if (f && fonctions[f[1]]) return rendre(200, fonctions[f[1]](COMPTES[email].id, j));
      if (f && desJeux[f[1]]) return rendre(200, desJeux[f[1]](COMPTES[email].id, j, email));
      if (f && portail[f[1]] && OPT.boutique) return rendre(200, portail[f[1]](COMPTES[email].id, j, email));
      rendre(404, {});
    });
  });
  return { serveur, salons, journal, comptes: COMPTES, courrier, achats, abonnements, paiements, supprimes };
}

module.exports = { creer };
if (require.main === module) {
  const port = +process.argv[2] || 8126, s = creer({ boutique: !process.argv.includes('--sans-boutique'), paiement: !process.argv.includes('--sans-paiement') });
  s.serveur.listen(port, '127.0.0.1', () => console.log(`faux service de comptes et de salons : http://127.0.0.1:${port}`));
}
