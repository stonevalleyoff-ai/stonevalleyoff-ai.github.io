// StoneValley — LA PAGE DU COMPTE (assets/compte.js)
// Trois états : la porte (se connecter, créer un compte, mot de passe oublié), le bandeau du lien d'un e-mail, et l'espace (profil,
// sécurité, bibliothèque, achats, abonnement, données). L'adresse dit où l'on est (compte.html#achats) ; le lien d'un e-mail y arrive avec
// son jeton, lu puis effacé de l'adresse aussitôt.
// La boutique : l'espace lit sv_mon_espace() (supabase.sql). Tant que la base ne la connaît pas, tout s'affiche vide et rien ne casse.
// Les paiements passent par la fonction « sv-paiement » (LISEZ-MOI.md, « La boutique ») ; tant qu'elle n'existe pas, c'est dit.
(function () {
  'use strict';
  if (!window.SV) return;
  var SV = window.SV, $ = SV.$, h = SV.h;
  var PANNEAUX = ['profil', 'securite', 'bibliotheque', 'achats', 'abonnement', 'donnees'];
  var U = null;            // le compte, tel que le service le rend
  var voulu = null;        // l'onglet de la porte qu'un lien expiré demande
  var ESPACE = null;       // { achats, abonnement, ferme } : ce que la boutique sait de ce compte
  function bandeau(titre, texte) { $('lien-titre').textContent = titre; $('lien-texte').textContent = texte; $('lien').hidden = false; $('lien').scrollIntoView({ block: 'start' }); }

  // ---------- où l'on est ----------
  function montrer() {
    var dedans = !!SV.session(), ancre = location.hash.replace(/^#/, '');
    $('porte').hidden = dedans; $('espace').hidden = !dedans;
    if (!dedans) { onglet(voulu || (ancre === 'creer' ? 'creer' : 'connexion')); return; }
    var p = PANNEAUX.indexOf(ancre) >= 0 ? ancre : 'profil';
    PANNEAUX.forEach(function (n) { $('p-' + n).hidden = n !== p; });
    Array.prototype.forEach.call($('menu-espace').children, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-p') === p); });
    document.title = $('p-' + p).querySelector('h1').textContent + ' · StoneValley';
    remplir();
  }
  function onglet(n) {
    $('f-connexion').hidden = n !== 'connexion'; $('f-creer').hidden = n !== 'creer'; $('f-oubli').hidden = n !== 'oubli';
    $('o-connexion').setAttribute('aria-selected', n !== 'creer'); $('o-creer').setAttribute('aria-selected', n === 'creer');
  }
  $('o-connexion').addEventListener('click', function () { voulu = null; history.replaceState(null, '', location.pathname + location.search); onglet('connexion'); });
  $('o-creer').addEventListener('click', function () { voulu = null; history.replaceState(null, '', '#creer'); onglet('creer'); });
  $('vers-oubli').addEventListener('click', function () { $('o-email').value = $('c-email').value; onglet('oubli'); $('o-email').focus(); });
  $('vers-connexion').addEventListener('click', function () { voulu = null; onglet('connexion'); });
  $('menu-espace').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b) location.hash = b.getAttribute('data-p'); });
  window.addEventListener('hashchange', montrer);
  $('deconnexion').addEventListener('click', function () { SV.quitter(false); });

  // ---------- la porte ----------
  SV.soumettre('f-connexion', function () {
    var email = $('c-email').value.trim(), mdp = $('c-mdp').value;
    if (!SV.adresse(email)) return 'Cette adresse e-mail ne se lit pas.';
    if (!mdp) return 'Il manque ton mot de passe.';
    return SV.connecter(email, mdp).then(function (r) {
      if (r.code !== 200) return { bien: false, texte: r.code === 400 && !(r.json && r.json.error_code) ? 'L\'e-mail ou le mot de passe ne va pas.' : SV.dire(r) };
      return { bien: true, texte: '', apres: function () { $('c-mdp').value = ''; $('lien').hidden = true; } };
    });
  });
  SV.soumettre('f-creer', function () {
    var email = $('i-email').value.trim(), mdp = $('i-mdp').value, pseudo = SV.pseudoPropre($('i-pseudo').value);
    if (!SV.adresse(email)) return 'Cette adresse e-mail ne se lit pas.';
    if (mdp.length < SV.MDP_MIN) return 'Le mot de passe doit faire ' + SV.MDP_MIN + ' caractères au moins.';
    if (!$('i-cgu').checked) return 'Il faut accepter les conditions d\'utilisation pour créer un compte.';
    if (!$('i-age').checked) return 'Il faut avoir 15 ans, ou l\'accord d\'un parent.';
    var donnees = { cgu: SV.CGU_VERSION, cgu_le: new Date().toISOString() };      // (ce qui a été accepté, et quand : gardé avec le compte)
    if (pseudo) donnees.pseudo = pseudo;
    return SV.appel('POST', '/auth/v1/signup?redirect_to=' + encodeURIComponent(SV.RACINE), { email: email, password: mdp, data: donnees }).then(function (r) {
      if (r.code !== 200 || !r.json) return { bien: false, texte: SV.dire(r) };
      if (r.json.access_token) return { bien: true, texte: '', apres: function () { $('i-mdp').value = ''; SV.prendre(r.json); } };
      if (Array.isArray(r.json.identities) && r.json.identities.length === 0)      // (le service répond ainsi pour une adresse déjà prise)
        return { bien: false, texte: 'Cette adresse a déjà un compte : connecte-toi, ou demande un nouveau mot de passe.' };
      return { bien: true, texte: 'Un e-mail de confirmation vient de partir à ' + email + '. Ouvre le lien qu\'il contient : il te ramènera ici, connecté.', apres: function () { $('i-mdp').value = ''; } };
    });
  });
  SV.soumettre('f-oubli', function () {
    var email = $('o-email').value.trim();
    if (!SV.adresse(email)) return 'Cette adresse e-mail ne se lit pas.';
    return SV.appel('POST', '/auth/v1/recover?redirect_to=' + encodeURIComponent(SV.RACINE), { email: email }).then(function (r) {
      if (r.code !== 200) return { bien: false, texte: SV.dire(r) };
      return { bien: true, texte: 'Si un compte existe pour ' + email + ', un e-mail vient de partir. Ouvre le lien qu\'il contient : il te ramènera ici pour choisir un nouveau mot de passe.' };
    });
  });

  // ---------- arrivé par le lien d'un e-mail ----------
  var lien = new URLSearchParams(/(^|[#&])(access_token|error|error_code)=/.test(location.hash) ? location.hash.replace(/^#/, '') : '');
  var jetonLien = lien.get('access_token'), genre = lien.get('type'), panne = lien.get('error') || lien.get('error_code');
  if (jetonLien || panne) history.replaceState(null, '', location.pathname + location.search);       // (le jeton ne reste pas dans l'adresse)
  function expire() {
    bandeau('Ce lien ne vaut plus', 'Il a expiré, ou il a déjà servi. Demande-en un autre ci-dessous.');
    voulu = 'oubli'; if (!SV.session()) onglet('oubli');
  }
  function entrer(u) {                // (le lien porte une session entière : on est connecté ici)
    return SV.prendre({ access_token: jetonLien, refresh_token: lien.get('refresh_token'), expires_in: +lien.get('expires_in') || 3600, user: u });
  }
  if (panne) expire();
  else if (jetonLien) {
    bandeau('Un instant…', 'On vérifie ton lien.');
    SV.appel('GET', '/auth/v1/user', null, jetonLien).then(function (r) {
      if (r.code !== 200 || !r.json) return expire();
      var qui = r.json.email || 'ton compte';
      if (genre === 'recovery') {
        bandeau('Nouveau mot de passe', 'Pour ' + qui + '.');
        $('f-nouveau').hidden = false; $('porte').hidden = true; $('espace').hidden = true;
        $('f-nouveau').dataset.pour = JSON.stringify(r.json);
        $('n-mdp').focus();
      } else {
        entrer(r.json);
        if (genre === 'email_change') bandeau('Ton adresse est changée', 'Ton compte est maintenant à ' + qui + '.');
        else bandeau('Ton compte est confirmé', 'Bienvenue, ' + (SV.nom() || qui) + '. Te voilà connecté, ici et dans les jeux : choisis-en un.');
      }
    });
  }
  SV.soumettre('f-nouveau', function (f) {
    var a = $('n-mdp').value, b = $('n-encore').value;
    if (a.length < SV.MDP_MIN) return 'Le mot de passe doit faire ' + SV.MDP_MIN + ' caractères au moins.';
    if (a !== b) return 'Les deux mots de passe ne sont pas les mêmes.';
    return SV.appel('PUT', '/auth/v1/user', { password: a }, jetonLien).then(function (r) {
      if (r.code !== 200) return { bien: false, texte: SV.dire(r) };
      return { bien: true, texte: '', apres: function () {
        f.hidden = true; $('n-mdp').value = $('n-encore').value = '';
        entrer(r.json || JSON.parse(f.dataset.pour || '{}')); jetonLien = null;
        bandeau('Ton mot de passe est changé', 'Te voilà connecté, ici et dans les jeux.');
      } };
    });
  });

  // ---------- l'espace ----------
  function remplir() {
    var s = SV.session();
    if (!s) return;
    $('moi-pastille').textContent = SV.nom().charAt(0); $('moi-nom').textContent = SV.nom(); $('moi-email').textContent = s.email;
    $('p-email-actuel').textContent = s.email;
    if (document.activeElement !== $('p-pseudo')) $('p-pseudo').value = s.pseudo || '';
    if (U) {
      $('p-depuis').textContent = U.created_at ? 'Compte créé le ' + SV.jour(U.created_at) + '.' : '';
      var m = U.user_metadata || {};
      $('d-cgu').textContent = m.cgu ? 'Les conditions d\'utilisation, version ' + m.cgu + (m.cgu_le ? ', acceptées le ' + SV.jour(m.cgu_le) : '') + '.'
        : 'Ton compte a été créé dans un jeu, avant ce portail : ce sont les conditions d\'utilisation en vigueur qui s\'appliquent.';
    }
    bibliotheque(); achats(); abonnement();
  }
  var charge = null;
  function charger() {               // (une fois par connexion : le compte, puis ce que la boutique en sait)
    if (!SV.session()) { U = null; ESPACE = null; charge = null; return; }
    if (charge === SV.session().uid) return;
    charge = SV.session().uid;
    SV.avecJeton('GET', '/auth/v1/user').then(function (r) { if (r.code === 200 && r.json) { U = r.json; SV.majUtilisateur(U); } });
    SV.rpc('sv_mon_espace').then(function (r) {
      ESPACE = r.code === 200 && r.json ? { achats: r.json.achats || [], abonnement: r.json.abonnement || null, ferme: false } : { achats: [], abonnement: null, ferme: r.code === 404 };
      if (SV.session()) remplir();
    });
  }
  SV.quand(function () { charger(); montrer(); });

  // --- profil ---
  SV.soumettre('f-pseudo', function () {
    var p = SV.pseudoPropre($('p-pseudo').value);
    if (!p) return 'Il faut au moins une lettre.';
    return SV.avecJeton('PUT', '/auth/v1/user', { data: { pseudo: p } }).then(function (r) {
      if (r.code !== 200) return { bien: false, texte: SV.dire(r) };
      return { bien: true, texte: 'C\'est enregistré. Les jeux le prendront à leur prochaine ouverture.', apres: function () { U = r.json || U; SV.majUtilisateur(r.json); } };
    });
  });
  SV.soumettre('f-email', function () {
    var e = $('p-email').value.trim();
    if (!SV.adresse(e)) return 'Cette adresse e-mail ne se lit pas.';
    if (e.toLowerCase() === (SV.session().email || '').toLowerCase()) return 'C\'est déjà ton adresse.';
    return SV.avecJeton('PUT', '/auth/v1/user?redirect_to=' + encodeURIComponent(SV.RACINE), { email: e }).then(function (r) {
      if (r.code !== 200) return { bien: false, texte: SV.dire(r) };
      return { bien: true, texte: 'Un e-mail de confirmation vient de partir à ' + e + '. Ton adresse changera quand tu auras ouvert son lien ; d\'ici là, l\'ancienne reste la bonne.', apres: function () { $('p-email').value = ''; } };
    });
  });

  // --- sécurité ---
  SV.soumettre('f-mdp', function () {
    var actuel = $('s-actuel').value, a = $('s-mdp').value, b = $('s-encore').value;
    if (!actuel) return 'Il manque ton mot de passe actuel.';
    if (a.length < SV.MDP_MIN) return 'Le nouveau mot de passe doit faire ' + SV.MDP_MIN + ' caractères au moins.';
    if (a !== b) return 'Les deux mots de passe ne sont pas les mêmes.';
    if (a === actuel) return 'C\'est déjà ton mot de passe : choisis-en un autre.';
    return SV.connecter(SV.session().email, actuel).then(function (r) {               // (on vérifie que c'est bien toi)
      if (r.code !== 200) return { bien: false, texte: r.code === 400 ? 'Ton mot de passe actuel ne va pas.' : SV.dire(r) };
      return SV.avecJeton('PUT', '/auth/v1/user', { password: a }).then(function (r2) {
        if (r2.code !== 200) return { bien: false, texte: SV.dire(r2) };
        return { bien: true, texte: 'Ton mot de passe est changé. Tu restes connecté, ici et dans les jeux.', apres: function () { $('s-actuel').value = $('s-mdp').value = $('s-encore').value = ''; } };
      });
    });
  });
  $('s-partout').addEventListener('click', function () {
    var b = this; b.disabled = true;
    SV.quitter(true).then(function () { b.disabled = false; bandeau('Tu es déconnecté partout', 'Toutes tes sessions sont fermées. Reconnecte-toi ici, puis dans tes jeux.'); });
  });

  // --- bibliothèque ---
  function possede(idJeu) { return ESPACE && ESPACE.achats.some(function (a) { return a.jeu === idJeu && a.etat === 'paye'; }); }
  function bibliotheque() {
    var jeux = window.SV_JEUX.filter(function (j) { return j.genre === 'jeu'; });
    $('b-jeux').innerHTML = jeux.map(function (j) {
      return '<li><img class="vignette" src="' + h(j.couverture) + '" alt="" loading="lazy"><div class="quoi"><strong>' + h(j.nom) + '</strong><span>' + h(j.categorie) + ' · ' + (possede(j.id) ? 'Acheté' : 'Gratuit') + '</span></div>'
        + '<a class="bouton calme petit" href="jeu.html?j=' + j.id + '">La fiche</a><a class="bouton petit" href="' + h(j.lien) + '">Jouer</a></li>';
    }).join('');
    var contenus = ESPACE ? ESPACE.achats.filter(function (a) { return a.etat === 'paye' && a.genre !== 'abonnement'; }) : [];
    $('b-contenus-carte').hidden = !contenus.length;
    $('b-contenus').innerHTML = contenus.map(function (a) {
      var j = a.jeu && SV.jeu(a.jeu);
      return '<li>' + (j ? '<img class="vignette" src="' + h(j.couverture) + '" alt="" loading="lazy">' : '') + '<div class="quoi"><strong>' + h(a.nom) + '</strong><span>' + (j ? h(j.nom) + ' · ' : '') + 'acheté le ' + h(SV.jour(a.paye_le)) + '</span></div>'
        + (j ? '<a class="bouton petit" href="' + h(j.lien) + '">Jouer</a>' : '') + '</li>';
    }).join('');
  }

  // --- achats ---
  var ETATS = { paye: 'Payé', en_attente: 'En attente', rembourse: 'Remboursé', annule: 'Annulé' };
  function achats() {
    var l = $('a-liste');
    if (!ESPACE) { l.innerHTML = '<p class="vide">Un instant…</p>'; return; }
    if (!ESPACE.achats.length) { l.innerHTML = '<p class="vide">Aucun achat pour l\'instant. Tous nos jeux sont gratuits ; ce qui se vend est à la <a href="boutique.html">boutique</a>.</p>'; return; }
    l.innerHTML = '<ul class="liste">' + ESPACE.achats.map(function (a) {
      return '<li><div class="quoi"><strong>' + h(a.nom) + '</strong><span>' + h(SV.jour(a.paye_le || a.cree_le)) + ' · ' + h(ETATS[a.etat] || a.etat) + '</span></div><span class="combien">' + h(SV.euros(a.montant_centimes, a.devise)) + '</span>'
        + (a.facture_url && /^https:\/\//.test(a.facture_url) ? '<a class="bouton calme petit" href="' + h(a.facture_url) + '" rel="noopener" target="_blank">Facture</a>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  var paiement = SV.paiement;
  $('a-gerer').addEventListener('click', function () { paiement({ action: 'gerer', retour: location.href }, 'a-gerer-avis', this); });

  // --- abonnement ---
  var PERIODES = { mois: 'par mois', an: 'par an' };
  function abonnement() {
    var c = $('ab-carte'), a = ESPACE && ESPACE.abonnement;
    if (!ESPACE) { c.innerHTML = '<p class="vide">Un instant…</p>'; return; }
    if (!a || a.etat === 'termine') {
      c.innerHTML = '<h2>Aucun abonnement</h2><p class="sourd">Tu n\'as pas d\'abonnement en cours. Tous nos jeux se jouent gratuitement ; quand une formule existera, elle sera à la boutique.</p><div><a class="bouton calme" href="boutique.html#abonnements">Voir la boutique</a></div>';
      return;
    }
    var resilie = !!a.resilie_le, impaye = a.etat === 'impaye';
    c.innerHTML = '<ul class="puces"><li class="puce ' + (resilie || impaye ? '' : 'etat') + '">' + (impaye ? 'Paiement en échec' : resilie ? 'Résilié' : a.etat === 'essai' ? 'Essai en cours' : 'Actif') + '</li></ul>'
      + '<h2>' + h(a.nom) + '</h2>'
      + '<p style="font-size:1.3rem;font-weight:700">' + h(SV.euros(a.prix_centimes, a.devise)) + ' <span class="sourd" style="font-weight:400;font-size:1rem">' + h(PERIODES[a.periode] || '') + '</span></p>'
      + '<p class="sourd">' + (resilie ? 'Ton abonnement est résilié : tu gardes tes avantages jusqu\'au ' + h(SV.jour(a.periode_fin)) + ', puis il s\'arrête. Rien ne sera plus prélevé.'
        : impaye ? 'Le dernier paiement n\'est pas passé. Mets à jour ton moyen de paiement pour garder ton abonnement.'
        : 'Prochain prélèvement le ' + h(SV.jour(a.periode_fin)) + '. Il se renouvelle tout seul jusqu\'à ce que tu le résilies.') + '</p>'
      + '<p class="avis" id="ab-avis" role="status"></p>'
      + '<div style="display:flex;gap:.7rem;flex-wrap:wrap">'
      + (resilie ? '<button type="button" class="bouton" id="ab-reprendre">Reprendre mon abonnement</button>' : '<button type="button" class="bouton danger" id="ab-resilier">Résilier mon abonnement</button>')
      + '<button type="button" class="bouton calme" id="ab-gerer">Moyen de paiement et factures</button></div>';
    $('ab-gerer').addEventListener('click', function () { paiement({ action: 'gerer', retour: location.href }, 'ab-avis', this); });
    if (resilie) $('ab-reprendre').addEventListener('click', function () {
      paiement({ action: 'reprendre' }, 'ab-avis', this).then(function (r) { if (r) { a.resilie_le = null; abonnement(); SV.avis('ab-avis', 'Ton abonnement reprend.', 'bien'); } });
    });
    else $('ab-resilier').addEventListener('click', function () {
      $('d-resilier-texte').textContent = 'Tu gardes « ' + a.nom + ' » jusqu\'au ' + SV.jour(a.periode_fin) + ', puis il s\'arrête. Rien ne sera plus prélevé. Tu pourras le reprendre d\'ici là.';
      SV.avis('d-resilier-avis', '', ''); $('d-resilier').showModal();
    });
  }
  $('d-resilier-non').addEventListener('click', function () { $('d-resilier').close(); });
  $('d-resilier-oui').addEventListener('click', function () {
    paiement({ action: 'resilier' }, 'd-resilier-avis', this).then(function (r) {
      if (!r) return;
      ESPACE.abonnement.resilie_le = new Date().toISOString(); if (r.periode_fin) ESPACE.abonnement.periode_fin = r.periode_fin;
      $('d-resilier').close(); abonnement(); SV.avis('ab-avis', 'C\'est résilié. Un e-mail te le confirme.', 'bien');
    });
  });

  // --- données ---
  $('d-export').addEventListener('click', function () {
    var b = this; b.disabled = true; SV.avis('d-export-avis', 'On rassemble tes données…', '');
    SV.rpc('sv_mes_donnees').then(function (r) {
      if (r.code === 200 && r.json) return r.json;
      if (r.code !== 404) return null;
      // (la base ne connaît pas encore sv_mes_donnees : on rassemble ce que les jeux savent rendre)
      return Promise.all([SV.avecJeton('GET', '/auth/v1/user'), SV.rpc('vp_charger_compte'), SV.rpc('lisiere_moi')]).then(function (t) {
        if (t[0].code !== 200) return null;
        var u = t[0].json;
        return { compte: { id: u.id, email: u.email, cree_le: u.created_at, derniere_connexion: u.last_sign_in_at, profil: u.user_metadata },
          stone_valley: t[1].code === 200 ? t[1].json : null, lisiere: t[2].code === 200 ? t[2].json : null };
      });
    }).then(function (d) {
      b.disabled = false;
      if (!d) { SV.avis('d-export-avis', 'Le service n\'a pas répondu. Réessaie dans un instant.', 'mal'); return; }
      d.exporte_le = new Date().toISOString();
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = 'stonevalley-mes-donnees.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      SV.avis('d-export-avis', 'Le fichier « stonevalley-mes-donnees.json » est téléchargé.', 'bien');
    });
  });
  SV.soumettre('f-supprimer', function () {
    var mdp = $('x-mdp').value;
    if (!mdp) return 'Il manque ton mot de passe.';
    if ($('x-mot').value.trim().toUpperCase() !== 'SUPPRIMER') return 'Écris SUPPRIMER pour confirmer.';
    if (ESPACE && ESPACE.abonnement && (ESPACE.abonnement.etat === 'actif' || ESPACE.abonnement.etat === 'essai' || ESPACE.abonnement.etat === 'impaye') && !ESPACE.abonnement.resilie_le)
      return 'Tu as un abonnement en cours : résilie-le d\'abord (onglet Abonnement), pour qu\'il ne soit plus prélevé.';
    return SV.connecter(SV.session().email, mdp).then(function (r) {                   // (on vérifie que c'est bien toi)
      if (r.code !== 200) return { bien: false, texte: r.code === 400 ? 'Ton mot de passe ne va pas.' : SV.dire(r) };
      return SV.rpc('sv_compte_supprimer').then(function (r2) {
        return r2.code === 404 ? SV.rpc('vp_supprimer_compte') : r2;                    // (la fonction des jeux, tant que celle du portail n'est pas en base)
      }).then(function (r2) {
        if (r2.code === 200 && r2.json && r2.json.erreur === 'abonnement') return { bien: false, texte: 'Tu as un abonnement en cours : résilie-le d\'abord (onglet Abonnement).' };
        if (r2.code !== 200 && r2.code !== 204) return { bien: false, texte: 'La suppression n\'a pas abouti (' + r2.code + '). Rien n\'a été effacé ; réessaie, ou écris-nous.' };
        return { bien: true, texte: '', apres: function () {
          $('x-mdp').value = $('x-mot').value = ''; SV.oublier();
          bandeau('Ton compte est supprimé', 'Ton compte et tes données sont effacés. Merci d\'avoir joué avec nous.');
        } };
      });
    });
  });

  charger(); montrer();
})();
