-- StoneValley — le portail (supabase.sql), dans le Supabase des jeux (« Vallée de pierre »)
-- La boutique (trois tables) et le compte (trois fonctions), tout préfixé « sv_ » ; rien des jeux (vp_…, pf_…, lisiere_…) n'est touché.
--   sv_produits      ce qui se vend : un jeu, un contenu, un abonnement. Seules les lignes « actif » se lisent, par tout le monde.
--   sv_achats        une ligne par achat. Fermée : le joueur lit les siens par sv_mon_espace().
--   sv_abonnements   une ligne par abonnement. Fermée de même.
--   sv_mon_espace()        ce que le compte connecté a acheté, et son abonnement.
--   sv_mes_donnees()       tout ce que la base garde sur le compte connecté, dans tous les jeux (droit d'accès et de portabilité).
--   sv_compte_supprimer()  efface le compte connecté et tout ce qui s'y rattache (droit à l'effacement).
-- Personne n'écrit dans les achats ni les abonnements depuis une page : seule la fonction de paiement (« sv-paiement », avec la clé de
-- service) le fait, quand le prestataire de paiement confirme. Les pages du portail marchent sans ce fichier : tout s'y affiche vide.
-- À passer une fois, dans SQL Editor. Pour tout retirer : la fin de ce fichier.

create table public.sv_produits (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  genre text not null check (genre in ('jeu', 'contenu', 'abonnement')),
  nom text not null,
  resume text not null default '',
  jeu text,                                                   -- l'identifiant du jeu dans le catalogue du portail (assets/jeux.js), s'il y en a un
  prix_centimes int not null check (prix_centimes >= 0),      -- toutes taxes comprises
  devise text not null default 'EUR' check (devise ~ '^[A-Z]{3}$'),
  periode text check (periode in ('mois', 'an')),             -- pour un abonnement : ce que couvre le prix
  en_avant boolean not null default false,
  actif boolean not null default false,                       -- tant que c'est faux, le produit ne se voit ni ne s'achète
  ordre int not null default 0,
  ref_prestataire text,                                       -- l'identifiant du prix chez le prestataire de paiement
  cree_le timestamptz not null default now(),
  check ((genre = 'abonnement') = (periode is not null))
);
comment on table public.sv_produits is 'Portail StoneValley : ce qui se vend. Lecture publique des lignes actives ; écriture par le tableau de bord.';

create table public.sv_achats (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid references auth.users (id) on delete set null,   -- un compte supprimé laisse la ligne comptable, sans lui
  produit text not null references public.sv_produits (id),
  etat text not null default 'en_attente' check (etat in ('en_attente', 'paye', 'rembourse', 'annule')),
  montant_centimes int not null check (montant_centimes >= 0),
  devise text not null default 'EUR',
  acces_immediat_le timestamptz,                              -- quand l'acheteur a demandé l'accès immédiat (et renoncé à se rétracter)
  paye_le timestamptz,
  ref_prestataire text unique,                                -- l'identifiant du paiement chez le prestataire : un paiement, une ligne
  facture_url text,
  cree_le timestamptz not null default now()
);
comment on table public.sv_achats is 'Portail StoneValley : les achats. Lus par sv_mon_espace ; écrits par la fonction de paiement seulement.';
create index sv_achats_utilisateur on public.sv_achats (utilisateur, cree_le desc);

create table public.sv_abonnements (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid references auth.users (id) on delete set null,
  produit text not null references public.sv_produits (id),
  etat text not null default 'actif' check (etat in ('essai', 'actif', 'impaye', 'termine')),
  debut timestamptz not null default now(),
  periode_fin timestamptz not null,                           -- la fin de la période payée : le prochain prélèvement, ou la fin si résilié
  resilie_le timestamptz,                                     -- résilié : il court jusqu'à periode_fin, puis passe à « termine »
  ref_prestataire text unique,
  maj_le timestamptz not null default now()
);
comment on table public.sv_abonnements is 'Portail StoneValley : les abonnements. Lus par sv_mon_espace ; écrits par la fonction de paiement seulement.';
create unique index sv_abonnements_un_seul on public.sv_abonnements (utilisateur) where etat <> 'termine';   -- un abonnement vivant par compte

alter table public.sv_produits enable row level security;
alter table public.sv_achats enable row level security;
alter table public.sv_abonnements enable row level security;
revoke all on public.sv_produits, public.sv_achats, public.sv_abonnements from anon, authenticated;
grant select on public.sv_produits to anon, authenticated;
create policy sv_produits_lecture on public.sv_produits for select to anon, authenticated using (actif);

-- ce que le compte connecté a acheté, et son abonnement (le vivant, sinon le dernier)
create function public.sv_mon_espace() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then raise exception 'compte requis'; end if;
  return jsonb_build_object(
    'achats', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'produit', a.produit, 'nom', p.nom, 'genre', p.genre, 'jeu', p.jeu, 'etat', a.etat,
        'montant_centimes', a.montant_centimes, 'devise', a.devise, 'paye_le', a.paye_le, 'cree_le', a.cree_le, 'facture_url', a.facture_url) order by a.cree_le desc), '[]'::jsonb)
      from public.sv_achats a join public.sv_produits p on p.id = a.produit
      where a.utilisateur = moi and a.etat <> 'en_attente'),
    'abonnement', (select jsonb_build_object('produit', b.produit, 'nom', p.nom, 'etat', b.etat, 'prix_centimes', p.prix_centimes, 'devise', p.devise, 'periode', p.periode,
        'debut', b.debut, 'periode_fin', b.periode_fin, 'resilie_le', b.resilie_le)
      from public.sv_abonnements b join public.sv_produits p on p.id = b.produit
      where b.utilisateur = moi order by (b.etat <> 'termine') desc, b.maj_le desc limit 1));
end $$;

-- tout ce que la base garde sur le compte connecté, jeu par jeu. Les identifiants des autres joueurs n'y sont pas.
create function public.sv_mes_donnees() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then raise exception 'compte requis'; end if;
  return jsonb_build_object(
    'compte', (select jsonb_build_object('id', u.id, 'email', u.email, 'cree_le', u.created_at, 'confirme_le', u.email_confirmed_at,
        'derniere_connexion', u.last_sign_in_at, 'profil', u.raw_user_meta_data) from auth.users u where u.id = moi),
    'stone_valley', jsonb_build_object(
      'personnage', (select to_jsonb(c) - 'utilisateur' from public.vp_comptes c where c.utilisateur = moi),
      'campement', (select to_jsonb(c) - 'utilisateur' - 'visite_par' - 'visite_jeton' from public.vp_campements c where c.utilisateur = moi),
      'pillages_subis', (select coalesce(jsonb_agg(to_jsonb(x) - 'pille' - 'pillard' order by x.cree_le), '[]'::jsonb) from public.vp_pillages x where x.pille = moi),
      'messages', (select coalesce(jsonb_agg(to_jsonb(r) - 'utilisateur' order by r.cree_le), '[]'::jsonb) from public.vp_retours r where r.utilisateur = moi),
      'journal_de_jeu', (select coalesce(jsonb_agg(to_jsonb(j) - 'utilisateur' order by j.cree_le), '[]'::jsonb) from public.vp_journal j where j.utilisateur = moi)),
    'lisiere', jsonb_build_object(
      'joueur', (select to_jsonb(l) - 'utilisateur' from public.lisiere_joueurs l where l.utilisateur = moi),
      'parties', (select coalesce(jsonb_agg(to_jsonb(l) - 'utilisateur' order by l.debut), '[]'::jsonb) from public.lisiere_parties l where l.utilisateur = moi),
      'partie_en_cours', (select to_jsonb(g) - 'utilisateur' from public.lisiere_sauvegardes g where g.utilisateur = moi)),
    'portefaix', jsonb_build_object(
      'salons', (select coalesce(jsonb_agg(to_jsonb(m) - 'utilisateur'), '[]'::jsonb) from public.pf_membres m where m.utilisateur = moi)),
    'neural_arena', jsonb_build_object(
      'cerveaux', (select coalesce(jsonb_agg(to_jsonb(n) - 'utilisateur' order by n.cree_le), '[]'::jsonb) from public.na_cerveaux n where n.utilisateur = moi)),
    'orvane', jsonb_build_object(
      'envois', (select coalesce(jsonb_agg(to_jsonb(o) - 'compte' order by o.recu), '[]'::jsonb) from public.orvane_pressions o where o.compte = moi)),
    'boutique', jsonb_build_object(
      'achats', (select coalesce(jsonb_agg(to_jsonb(a) - 'utilisateur' order by a.cree_le), '[]'::jsonb) from public.sv_achats a where a.utilisateur = moi),
      'abonnements', (select coalesce(jsonb_agg(to_jsonb(b) - 'utilisateur' order by b.debut), '[]'::jsonb) from public.sv_abonnements b where b.utilisateur = moi)));
end $$;

-- effacer le compte connecté. Tout ce que les jeux gardent part avec lui (leurs tables le suivent). Les achats restent, sans le compte :
-- ce sont des pièces comptables. Un abonnement encore prélevé bloque : il faut d'abord le résilier, pour que le prestataire s'arrête.
create function public.sv_compte_supprimer() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then raise exception 'compte requis'; end if;
  if exists (select 1 from public.sv_abonnements b where b.utilisateur = moi and b.etat <> 'termine' and b.resilie_le is null) then
    return jsonb_build_object('erreur', 'abonnement');
  end if;
  delete from public.vp_comptes where utilisateur = moi;
  delete from public.vp_retours where utilisateur = moi;
  delete from auth.users where id = moi;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.sv_mon_espace(), public.sv_mes_donnees(), public.sv_compte_supprimer() from public, anon;
grant execute on function public.sv_mon_espace(), public.sv_mes_donnees(), public.sv_compte_supprimer() to authenticated;

-- Mettre un produit en vente (un exemple ; « actif » le rend visible à la boutique) :
--   insert into public.sv_produits (id, genre, nom, resume, jeu, prix_centimes, periode, actif, ordre)
--   values ('soutien-mensuel', 'abonnement', 'Soutien', 'Ce que la formule donne, en une phrase.', null, 499, 'mois', true, 1);

-- Pour tout retirer :
--   drop function public.sv_mon_espace(), public.sv_mes_donnees(), public.sv_compte_supprimer();
--   drop table public.sv_abonnements, public.sv_achats, public.sv_produits;
