// StoneValley — QUI ÉDITE LE SITE (assets/editeur.js)
// Les textes légaux (legal/*.html) et le pied de page lisent ici le nom, l'adresse et les contacts de l'éditeur.
// Une valeur laissée vide s'affiche « à compléter », en rouge, dans les pages : rien ne doit rester vide le jour de l'ouverture au public.
// La liste de ce qu'il faut remplir, et pourquoi, est dans LISEZ-MOI.md (« Avant d'ouvrir au public »).
window.SV_EDITEUR = {
  // --- l'éditeur (mentions légales, CGU, CGV) ---
  nom: '',                 // nom et prénom (entrepreneur individuel) ou dénomination sociale (société)
  forme: '',               // « entrepreneur individuel (micro-entreprise) », « SAS au capital de 1 000 € »…
  adresse: '',             // adresse du siège ou du domicile professionnel
  siren: '',               // numéro SIREN ou SIRET ; pour une société : RCS + ville
  tva: '',                 // numéro de TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI »
  directeur: '',           // directeur ou directrice de la publication (une personne physique)
  // --- les contacts ---
  contact: '',             // adresse e-mail de contact et d'assistance
  donnees: '',             // adresse e-mail pour les demandes sur les données personnelles (peut être la même)
  telephone: '',           // exigé dans les mentions légales d'un site qui vend
  // --- la vente (CGV) : à remplir avant le premier produit payant ---
  prestataire_paiement: '',   // « Stripe Payments Europe, Ltd. (Irlande) »…
  mediateur: '',              // nom du médiateur de la consommation auquel l'éditeur a adhéré
  mediateur_site: ''          // adresse de son site
};
