// StoneValley — LE SOCLE DU PORTAIL (assets/site.js)
// Chargé par toutes les pages, après assets/jeux.js (et assets/editeur.js). Il pose l'en-tête et le pied, tient la session du compte,
// et parle au service de comptes : le projet Supabase « Vallée de pierre », le même que celui des jeux. La clé ci-dessous est sa clé
// publique, faite pour être dans une page ; elle n'ouvre rien sans le mot de passe de quelqu'un.
// La session (un jeton d'une heure et de quoi le renouveler) est gardée dans ce navigateur, sous une clé commune au portail et aux jeux
// du site (« stonevalley:session ») : connecté ici, on l'est dans les jeux, et l'inverse. Un jeton de renouvellement ne sert qu'une
// fois : avant de renouveler, chacun regarde si un autre ne vient pas de le faire, et prend alors le sien. Le mot de passe n'est gardé
// nulle part.
(function () {
  'use strict';
  var RACINE = new URL('..', document.currentScript.src).href;                      // (l'adresse du site, avec sa barre de fin)
  var LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  var SERVICE = 'https://ldazucyrnpewkqdneznc.supabase.co';
  var CLE = 'sb_publishable_qUrfgAsAUzc3jd_tiqkY9g_EVkkQRAs';
  var STOCKAGE = 'stonevalley:session';
  var ANCIENNES = ['stonevalley_portail:session', 'stone_valley_session'];      // (les clés d'avant la session commune : lues une fois)
  var CGU_VERSION = '2026-11';                                                        // (la version des CGU qu'un nouveau compte accepte)
  // (sur sa propre machine seulement, pour les essais : un autre service de comptes, donné une fois dans l'adresse, tenu le temps de l'onglet)
  if (LOCAL) {
    var autre = new URLSearchParams(location.search).get('service');
    try { if (autre) sessionStorage.setItem('sv:service', autre); else autre = sessionStorage.getItem('sv:service'); } catch (e) { /* pas de stockage : l'adresse seule */ }
    if (autre) SERVICE = autre;
  }
  var $ = function (id) { return document.getElementById(id); };
  function h(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lien(chemin) { return RACINE + chemin; }

  // ---------- la session ----------
  var S = null;
  function gardee() {
    try {
      var s = JSON.parse(localStorage.getItem(STOCKAGE) || 'null');
      for (var i = 0; !(s && s.jeton) && i < ANCIENNES.length; i++) s = JSON.parse(localStorage.getItem(ANCIENNES[i]) || 'null');
      return s && s.jeton && s.uid ? s : null;
    } catch (e) { return null; }
  }
  function lire() {
    S = gardee();
    try { if (S && !localStorage.getItem(STOCKAGE)) ecrire(); } catch (e) { /* tant pis */ }      // (venue d'une ancienne clé : elle passe sous la clé commune)
    return S;
  }
  function ecrire() {
    try {
      if (S) localStorage.setItem(STOCKAGE, JSON.stringify(S)); else localStorage.removeItem(STOCKAGE);
      ANCIENNES.forEach(function (c) { localStorage.removeItem(c); });
    } catch (e) { /* stockage refusé : la session ne tiendra que cette page */ }
  }
  // un jeu vient-il de renouveler la session commune ? Alors on prend la sienne, sans rien demander au service
  function renouveleeAilleurs() {
    var g = gardee();
    if (!S || !g || g.uid !== S.uid || !g.refresh || g.refresh === S.refresh || !(g.exp > Date.now() + 60000)) return false;
    S = g; return true;
  }
  var ecouteurs = [];
  function change() { entete(); ecouteurs.forEach(function (f) { f(S); }); }
  function prendre(r) {
    if (!r || !r.access_token) return false;
    var u = r.user || {}, meta = u.user_metadata || {};
    S = { jeton: r.access_token, refresh: r.refresh_token || (S && S.refresh) || null, exp: Date.now() + (r.expires_in || 3600) * 1000,
      uid: u.id || (S && S.uid) || null, email: u.email || (S && S.email) || '', pseudo: meta.pseudo || (S && S.pseudo) || '' };
    ecrire(); change();
    return true;
  }
  function majUtilisateur(u) {            // (après une lecture ou une mise à jour du compte : l'e-mail et le pseudo à jour)
    if (!S || !u) return;
    S.uid = u.id || S.uid; S.email = u.email || S.email; S.pseudo = (u.user_metadata && u.user_metadata.pseudo) || '';
    ecrire(); change();
  }
  function oublier() { S = null; ecrire(); change(); }

  function appel(methode, chemin, corps, jeton) {
    var entetes = { apikey: CLE, 'Content-Type': 'application/json' };
    if (jeton) entetes.Authorization = 'Bearer ' + jeton;
    return fetch(SERVICE + chemin, { method: methode, headers: entetes, cache: 'no-store', referrerPolicy: 'no-referrer', body: corps ? JSON.stringify(corps) : undefined })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; } return { code: r.status, json: j }; }); })
      .catch(function () { return { code: 0, json: null }; });
  }
  // Le jeton ne vaut qu'une heure : on le renouvelle une minute avant. Un seul renouvellement à la fois.
  var renouvellement = null;
  function jeton() {
    if (!S) return Promise.resolve(null);
    if (Date.now() < S.exp - 60000 || !S.refresh || renouveleeAilleurs()) return Promise.resolve(S.jeton);
    if (!renouvellement) renouvellement = appel('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: S.refresh }).then(function (r) {
      renouvellement = null;
      if (r.code === 200 && prendre(r.json)) return S.jeton;
      if (renouveleeAilleurs()) return S.jeton;                                                  // (un jeu l'a renouvelée pendant qu'on demandait)
      if (r.code === 400 || r.code === 401 || r.code === 403) { oublier(); return null; }      // (la session ne vaut plus)
      return S ? S.jeton : null;                                                                 // (pas de réseau : on essaie avec ce qu'on a)
    });
    return renouvellement;
  }
  function avecJeton(methode, chemin, corps) {
    return jeton().then(function (j) { return j ? appel(methode, chemin, corps, j) : { code: 401, json: null }; });
  }
  function connecter(email, mdp) {
    return appel('POST', '/auth/v1/token?grant_type=password', { email: email, password: mdp }).then(function (r) { if (r.code === 200) prendre(r.json); return r; });
  }
  function quitter(partout) {
    var j = S && S.jeton;
    oublier();
    return j ? appel('POST', '/auth/v1/logout?scope=' + (partout ? 'global' : 'local'), {}, j) : Promise.resolve();
  }
  // ce que le service a refusé, en clair
  function dire(r) {
    var code = (r.json && (r.json.error_code || r.json.code)) || '';
    if (r.code === 0) return 'Le service des comptes ne répond pas. Vérifie ta connexion.';
    var textes = {
      invalid_credentials: 'L\'e-mail ou le mot de passe ne va pas.',
      email_not_confirmed: 'Cette adresse n\'est pas encore confirmée : ouvre le lien de l\'e-mail que tu as reçu.',
      weak_password: 'Ce mot de passe est trop faible : ' + MDP_MIN + ' caractères au moins.',
      same_password: 'C\'est déjà ton mot de passe : choisis-en un autre.',
      user_already_exists: 'Cette adresse a déjà un compte : connecte-toi, ou demande un nouveau mot de passe.',
      email_exists: 'Cette adresse a déjà un compte.',
      email_address_invalid: 'Cette adresse e-mail n\'est pas acceptée.',
      validation_failed: 'Cette adresse e-mail n\'est pas acceptée.',
      signup_disabled: 'La création de compte est fermée pour l\'instant.',
      over_email_send_rate_limit: 'Trop d\'e-mails envoyés pour l\'instant. Réessaie dans une heure.',
      over_request_rate_limit: 'Trop d\'essais. Attends une minute.',
      otp_expired: 'Ce lien a expiré, ou a déjà servi. Redemande-le.',
      reauthentication_needed: 'Par sécurité, reconnecte-toi puis recommence.',
      user_banned: 'Ce compte est suspendu.',
      session_not_found: 'Ta session a expiré : reconnecte-toi.'
    };
    if (textes[code]) return textes[code];
    if (r.code === 429) return 'Trop d\'essais. Attends une minute.';
    if (r.code === 401) return 'Ta session a expiré : reconnecte-toi.';
    return 'Le service a refusé (' + r.code + ').';
  }
  var MDP_MIN = 8;
  function adresse(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function pseudoPropre(p) { return String(p || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16).trim(); }
  function nom() { return S ? (S.pseudo || (S.email || '').split('@')[0] || 'Mon compte') : ''; }
  function euros(centimes, devise) {
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise || 'EUR' }).format((centimes || 0) / 100); } catch (e) { return ((centimes || 0) / 100).toFixed(2) + ' €'; }
  }
  function jour(d) { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
  function avis(id, texte, genre) { var a = typeof id === 'string' ? $(id) : id; if (!a) return; a.textContent = texte; a.className = 'avis' + (genre ? ' ' + genre : ''); }
  // un formulaire : « faire » rend un texte (un refus, dit tout de suite) ou une promesse de { bien, texte, apres } ; pendant qu'on attend, son bouton est tenu
  function soumettre(form, faire) {
    form = typeof form === 'string' ? $(form) : form;
    if (!form) return;
    var b = form.querySelector('button[type="submit"]'), a = form.querySelector('.avis');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (b.disabled) return;
      var avant = faire(form);
      if (typeof avant === 'string') { avis(a, avant, 'mal'); return; }
      if (!avant) return;
      b.disabled = true; avis(a, 'Un instant…', '');
      avant.then(function (r) { b.disabled = false; avis(a, r.texte || '', r.bien ? 'bien' : 'mal'); if (r.apres) r.apres(); });
    });
  }

  // ---------- les paiements ----------
  // Un appel à la fonction de paiement (« sv-paiement », LISEZ-MOI.md) : elle rend une adresse où aller (la page du prestataire), ou un
  // fait accompli ({ ok }). Tant qu'elle n'existe pas, c'est dit. Rend une promesse : la réponse si c'est fait, sinon rien.
  function paiement(corps, idAvis, bouton) {
    if (bouton) bouton.disabled = true;
    avis(idAvis, 'Un instant…', '');
    return avecJeton('POST', '/functions/v1/sv-paiement', corps).then(function (r) {
      if (bouton) bouton.disabled = false;
      var j = r.code === 200 && r.json;
      if (j && j.url && (/^https:\/\//.test(j.url) || LOCAL)) { avis(idAvis, 'On t\'emmène vers la page de paiement…', ''); location.href = j.url; return null; }
      if (j && j.ok) { avis(idAvis, '', ''); return j; }
      avis(idAvis, r.code === 404 || r.code === 0 ? 'Les paiements ne sont pas encore ouverts.' : (r.json && r.json.message) || dire(r), 'mal');
      return null;
    });
  }

  // ---------- l'en-tête et le pied ----------
  var MARQUE = '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#0b0e16"/><path d="M100 30h312L256 420Z" fill="#f2a54a"/><circle cx="256" cy="206" r="48" fill="#fff3d0"/><path d="M0 400V236L136 96l120 324v92H112A112 112 0 0 1 0 400Z" fill="#1b2231"/><path d="M512 400V236L376 96 256 420v92h144a112 112 0 0 0 112-112Z" fill="#141a26"/><path d="M136 96 256 420h-36L100 133Z" fill="#2e384d"/><path d="M376 96 256 420h36l120-287Z" fill="#232c3e"/><rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#f2a54a" stroke-opacity=".45" stroke-width="12"/></svg>';
  var ici = location.pathname.replace(/\/index\.html$/, '/');
  function courant(chemin) { return new URL(lien(chemin)).pathname.replace(/\/index\.html$/, '/') === ici && !/[?&]j=orvane/.test(location.search) ? ' aria-current="page"' : ''; }
  function entete() {
    var e = $('entete');
    if (!e) return;
    var qui = S
      ? '<div class="menu-compte"><button type="button" id="ouvre-compte" aria-haspopup="true" aria-expanded="false"><span class="pastille">' + h(nom().charAt(0)) + '</span><span>' + h(nom()) + '</span></button>'
        + '<ul id="liste-compte" hidden>'
        + '<li><a href="' + lien('compte.html#profil') + '">Mon compte</a></li>'
        + '<li><a href="' + lien('compte.html#bibliotheque') + '">Ma bibliothèque</a></li>'
        + '<li><a href="' + lien('compte.html#achats') + '">Achats et factures</a></li>'
        + '<li><a href="' + lien('compte.html#abonnement') + '">Abonnement</a></li>'
        + '<li class="trait"><button type="button" id="sortir">Se déconnecter</button></li></ul></div>'
      : '<a class="bouton calme petit" href="' + lien('compte.html') + '">Se connecter</a><a class="bouton petit" href="' + lien('compte.html#creer') + '">Créer un compte</a>';
    e.className = 'entete';
    e.innerHTML = '<a class="passer" href="#contenu">Aller au contenu</a><div class="cadre">'
      + '<a class="marque" href="' + lien('') + '" aria-label="StoneValley, accueil">' + MARQUE + '<span>Stone<b>Valley</b></span></a>'
      + '<nav class="nav" id="nav" aria-label="Principale">'
      + '<a href="' + lien('#jeux') + '">Jeux</a>'
      + '<a href="' + lien('jeu.html?j=orvane') + '"' + (/[?&]j=orvane/.test(location.search) ? ' aria-current="page"' : '') + '>Le monde d\'Orvane</a>'
      + '<a href="' + lien('boutique.html') + '"' + courant('boutique.html') + '>Boutique</a></nav>'
      + '<div class="qui">' + qui + '</div>'
      + '<button type="button" class="ouvre-nav" id="ouvre-nav" aria-label="Menu" aria-expanded="false" aria-controls="nav"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
    $('ouvre-nav').addEventListener('click', function () { var o = $('nav').classList.toggle('ouverte'); this.setAttribute('aria-expanded', o); });
    if (S) {
      var b = $('ouvre-compte'), l = $('liste-compte');
      b.addEventListener('click', function (ev) { ev.stopPropagation(); l.hidden = !l.hidden; b.setAttribute('aria-expanded', !l.hidden); });
      $('sortir').addEventListener('click', function () { quitter(false).then(function () { if (/compte\.html$/.test(location.pathname)) location.hash = ''; }); });
    }
  }
  document.addEventListener('click', function () { var l = $('liste-compte'); if (l && !l.hidden) { l.hidden = true; $('ouvre-compte').setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var l = $('liste-compte'); if (l && !l.hidden) { l.hidden = true; $('ouvre-compte').focus(); } } });

  function pied() {
    var p = $('pied');
    if (!p) return;
    var E = window.SV_EDITEUR || {}, jeux = (window.SV_JEUX || []);
    p.className = 'pied';
    p.innerHTML = '<div class="cadre"><div class="colonnes">'
      + '<div><a class="marque" href="' + lien('') + '">' + MARQUE + '<span>Stone<b>Valley</b></span></a><p class="sourd" style="margin-top:.8rem;max-width:22rem">Des jeux qui partagent un même monde vivant. Un seul compte pour tous.</p></div>'
      + '<div><h2>Jeux</h2><ul>' + jeux.map(function (j) { return '<li><a href="' + lien('jeu.html?j=' + j.id) + '">' + h(j.nom) + '</a></li>'; }).join('') + '</ul></div>'
      + '<div><h2>Compte</h2><ul><li><a href="' + lien('compte.html') + '">Mon compte</a></li><li><a href="' + lien('compte.html#bibliotheque') + '">Ma bibliothèque</a></li><li><a href="' + lien('compte.html#achats') + '">Achats et factures</a></li><li><a href="' + lien('compte.html#abonnement') + '">Abonnement</a></li><li><a href="' + lien('boutique.html') + '">Boutique</a></li></ul></div>'
      + '<div><h2>Informations</h2><ul><li><a href="' + lien('legal/cgu.html') + '">Conditions d\'utilisation</a></li><li><a href="' + lien('legal/cgv.html') + '">Conditions de vente</a></li><li><a href="' + lien('legal/confidentialite.html') + '">Confidentialité</a></li><li><a href="' + lien('legal/cookies.html') + '">Cookies et traceurs</a></li><li><a href="' + lien('legal/mentions-legales.html') + '">Mentions légales</a></li>'
      + (E.contact ? '<li><a href="mailto:' + h(E.contact) + '">Nous écrire</a></li>' : '<li><a href="' + lien('legal/mentions-legales.html#contact') + '">Nous écrire</a></li>') + '</ul></div>'
      + '</div><div class="fin"><span>© ' + new Date().getFullYear() + ' StoneValley' + (E.nom ? ' · ' + h(E.nom) : '') + '. Tous droits réservés.</span><span>Ce site ne dépose aucun cookie publicitaire ni traceur d\'audience.</span><button type="button" class="lien-bouton" id="installer"' + (invite ? '' : ' hidden') + '>Installer l\'application</button></div></div>';
  }

  // ---------- les textes légaux : le nom, l'adresse, les contacts de l'éditeur (assets/editeur.js) ----------
  function editeur() {
    var E = window.SV_EDITEUR || {}, manque = false;
    document.querySelectorAll('[data-editeur]').forEach(function (n) {
      var cle = n.getAttribute('data-editeur'), v = E[cle];
      if (v) { if (/^(contact|donnees)$/.test(cle)) n.innerHTML = '<a href="mailto:' + h(v) + '">' + h(v) + '</a>'; else if (cle === 'mediateur_site') n.innerHTML = '<a href="' + h(v) + '" rel="noopener">' + h(v) + '</a>'; else n.textContent = v; }
      else { manque = true; n.className = 'a-completer'; n.textContent = '[à compléter : ' + (n.getAttribute('data-quoi') || cle) + ']'; }
    });
    var note = $('preparation');
    if (note) note.hidden = !manque;
  }

  // ---------- arrivé par le lien d'un e-mail : c'est la page du compte qui s'en occupe ----------
  var arrive = /(^|[#&])(access_token|error|error_code)=/.test(location.hash);
  if (arrive && !/compte\.html$/.test(location.pathname)) { location.replace(lien('compte.html') + location.hash); return; }

  // ---------- l'application installable ----------
  // Le service worker (sw.js, à la racine) garde les pages du portail pour l'ouvrir sans réseau ; il ne touche pas aux jeux.
  // Quand le navigateur sait installer le site, le pied de page propose un bouton.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || LOCAL)) navigator.serviceWorker.register(lien('sw.js'), { scope: RACINE }).catch(function () { /* pas de service worker : le site marche sans */ });
  var invite = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; var b = $('installer'); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', function () { invite = null; var b = $('installer'); if (b) b.hidden = true; });
  document.addEventListener('click', function (e) { if (e.target.id === 'installer' && invite) { invite.prompt(); invite = null; e.target.hidden = true; } });

  lire();
  window.addEventListener('storage', function (e) { if (e.key === STOCKAGE || e.key === null) { lire(); change(); } });
  window.SV = { RACINE: RACINE, MDP_MIN: MDP_MIN, CGU_VERSION: CGU_VERSION, $: $, h: h, lien: lien,
    session: function () { return S; }, nom: nom, quand: function (f) { ecouteurs.push(f); },
    appel: appel, avecJeton: avecJeton, jeton: jeton, prendre: prendre, majUtilisateur: majUtilisateur, oublier: oublier, connecter: connecter, quitter: quitter,
    rpc: function (n, p) { return avecJeton('POST', '/rest/v1/rpc/' + n, p || {}); },
    fonction: function (n, c) { return avecJeton('POST', '/functions/v1/' + n, c || {}); },
    dire: dire, paiement: paiement, LOCAL: LOCAL, adresse: adresse, pseudoPropre: pseudoPropre, euros: euros, jour: jour, avis: avis, soumettre: soumettre,
    jeu: function (id) { return (window.SV_JEUX || []).filter(function (j) { return j.id === id; })[0] || null; } };
  entete(); pied(); editeur();
})();
