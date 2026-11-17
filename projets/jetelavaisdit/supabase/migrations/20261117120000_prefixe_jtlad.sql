-- « Je te l'avais dit » — préfixe jtlad_ pour partager la base avec d'autres applis
--
-- Le projet Supabase (« claude_projets ») est mutualisé : chaque appli préfixe ses
-- objets (myflix_…, jtlad_…). Les tables, index, contraintes, fonctions et
-- déclencheurs de « Je te l'avais dit » prennent le préfixe jtlad_.
-- Les données, les droits et les politiques RLS sont conservés tels quels.
--
-- À appliquer APRÈS 20261114120000_noms_et_jours.sql.
-- Les anciens noms cessent d'exister : l'app et la page de la carte doivent être
-- mises à jour en même temps (appels .from('jtlad_…') et .rpc('jtlad_…')).

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

alter table public.profils         rename to jtlad_profils;
alter table public.phrases         rename to jtlad_phrases;
alter table public.moderation_mots rename to jtlad_moderation_mots;

comment on table public.jtlad_profils         is 'Je te l''avais dit : profil de chaque compte (pseudo, prénom, nom).';
comment on table public.jtlad_phrases         is 'Je te l''avais dit : phrases scellées (non modifiables) et lien public de leur carte.';
comment on table public.jtlad_moderation_mots is 'Je te l''avais dit : mots refusés par la modération de base.';

-- ---------------------------------------------------------------------------
-- 2. Contraintes et index : leurs noms sont communs à tout le schéma public,
--    on les préfixe aussi (profils_pkey → jtlad_profils_pkey, etc.).
-- ---------------------------------------------------------------------------

do $$
declare
  tables oid[] := array[
    'public.jtlad_profils'::regclass,
    'public.jtlad_phrases'::regclass,
    'public.jtlad_moderation_mots'::regclass
  ];
  r record;
begin
  -- Renommer une contrainte (clé primaire, unique) renomme aussi son index.
  for r in
    select c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
     where c.conrelid = any (tables)
       and c.conname not like 'jtlad\_%'
  loop
    execute format('alter table %s rename constraint %I to %I', r.tbl, r.conname, 'jtlad_' || r.conname);
  end loop;

  -- Index restants (ex. phrases_auteur_date).
  for r in
    select ci.relname
      from pg_index i
      join pg_class ci on ci.oid = i.indexrelid
     where i.indrelid = any (tables)
       and ci.relname not like 'jtlad\_%'
  loop
    execute format('alter index public.%I rename to %I', r.relname, 'jtlad_' || r.relname);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Fonctions : nouveau nom (propriétaire et droits d'exécution conservés)
-- ---------------------------------------------------------------------------

alter function public.creer_profil()                rename to jtlad_creer_profil;
alter function public.completer_noms()              rename to jtlad_completer_noms;
alter function public.noms_depuis_meta(jsonb)       rename to jtlad_noms_depuis_meta;
alter function public.nom_affiche(text, text, text) rename to jtlad_nom_affiche;
alter function public.verifier_moderation(text)     rename to jtlad_verifier_moderation;
alter function public.sceller_phrase(text)          rename to jtlad_sceller_phrase;
alter function public.reveler_phrase(uuid)          rename to jtlad_reveler_phrase;
alter function public.carte_publique(text)          rename to jtlad_carte_publique;

-- ---------------------------------------------------------------------------
-- 4. Déclencheurs sur auth.users (table de comptes commune à toutes les applis).
--    Ils suivent les fonctions renommées et continuent de marcher quoi qu'il
--    arrive. Le renommage est un simple confort : si Supabase le refuse
--    (auth.users n'appartient pas au rôle postgres), on garde l'ancien nom.
-- ---------------------------------------------------------------------------

do $$
begin
  alter trigger profil_a_l_inscription on auth.users rename to jtlad_profil_a_l_inscription;
exception when others then
  raise notice 'Déclencheur profil_a_l_inscription gardé sous son nom : %', sqlerrm;
end;
$$;

do $$
begin
  alter trigger noms_a_la_connexion on auth.users rename to jtlad_noms_a_la_connexion;
exception when others then
  raise notice 'Déclencheur noms_a_la_connexion gardé sous son nom : %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Corps des fonctions : ils citent les anciens noms, on les réécrit.
--    (create or replace garde le propriétaire et les droits.)
--    jtlad_noms_depuis_meta et jtlad_nom_affiche ne citent aucune table :
--    rien à réécrire.
-- ---------------------------------------------------------------------------

-- À l'inscription : pseudo + prénom / nom.
create or replace function public.jtlad_creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base     text;
  candidat text;
  n        int := 0;
  noms     record;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_.]', '', 'g'));
  if char_length(base) < 3 then
    base := 'joueur';
  end if;
  base := left(base, 15);
  candidat := base;
  while exists (select 1 from public.jtlad_profils where pseudo = candidat) loop
    n := n + 1;
    candidat := base || n::text;
  end loop;
  select * into noms from public.jtlad_noms_depuis_meta(coalesce(new.raw_user_meta_data, '{}'::jsonb));
  insert into public.jtlad_profils (id, pseudo, prenom, nom) values (new.id, candidat, noms.prenom, noms.nom);
  return new;
end;
$$;

-- À la connexion : complète le prénom / nom s'ils manquent.
create or replace function public.jtlad_completer_noms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  noms record;
begin
  select * into noms from public.jtlad_noms_depuis_meta(coalesce(new.raw_user_meta_data, '{}'::jsonb));
  update public.jtlad_profils p
     set prenom = coalesce(p.prenom, noms.prenom),
         nom    = coalesce(p.nom, noms.nom)
   where p.id = new.id
     and (p.prenom is null or p.nom is null);
  return new;
end;
$$;

-- Lève une erreur `moderation:<motif>` si la phrase n'est pas acceptable.
create or replace function public.jtlad_verifier_moderation(p_texte text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Numéros de téléphone français et adresses e-mail.
  if p_texte ~ '(\+33|0)\s?[1-9]([\s.-]?[0-9]{2}){4}'
     or p_texte ~* '[^\s@]+@[^\s@]+\.[a-z]{2,}' then
    raise exception 'moderation:donnees_perso' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.jtlad_moderation_mots m
    where p_texte ~* ('(^|[^[:alnum:]])' || m.mot || '($|[^[:alnum:]])')
  ) then
    raise exception 'moderation:insulte' using errcode = 'P0001';
  end if;
end;
$$;

-- Sceller une phrase.
create or replace function public.jtlad_sceller_phrase(p_texte text)
returns public.jtlad_phrases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auteur     uuid := auth.uid();
  v_texte      text := btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g'));
  v_maintenant timestamptz := now();
  v_ligne      public.jtlad_phrases;
begin
  if v_auteur is null then
    raise exception 'non_connecte' using errcode = 'P0001';
  end if;

  if char_length(v_texte) < 3 or char_length(v_texte) > 200 then
    raise exception 'longueur_invalide' using errcode = 'P0001';
  end if;

  perform public.jtlad_verifier_moderation(v_texte);

  begin
    insert into public.jtlad_phrases (auteur, texte, scellee_le, jour, empreinte)
    values (
      v_auteur,
      v_texte,
      v_maintenant,
      (v_maintenant at time zone 'Europe/Paris')::date,
      encode(
        extensions.digest(
          v_auteur::text || '|' || v_texte || '|'
            || to_char(v_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'sha256'),
        'hex')
    )
    returning * into v_ligne;
  exception when unique_violation then
    raise exception 'deja_scelle_aujourdhui' using errcode = 'P0001';
  end;

  return v_ligne;
end;
$$;

-- Révéler une phrase (« Je te l'avais dit ! ») : crée le lien public de la carte.
create or replace function public.jtlad_reveler_phrase(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lien text;
  v_existe boolean;
begin
  select true, lien into v_existe, v_lien
  from public.jtlad_phrases
  where id = p_id and auteur = auth.uid()
  for update;

  if v_existe is null then
    raise exception 'phrase_introuvable' using errcode = 'P0001';
  end if;

  if v_lien is null then
    v_lien := replace(replace(rtrim(encode(extensions.gen_random_bytes(9), 'base64'), '='), '+', '-'), '/', '_');
    update public.jtlad_phrases
       set lien = v_lien, revelee_le = now()
     where id = p_id;
  end if;

  return v_lien;
end;
$$;

-- Carte publique : ce que voit le destinataire du lien (sans compte).
create or replace function public.jtlad_carte_publique(p_lien text)
returns table (
  texte          text,
  pseudo         text,
  auteur         text,
  scellee_le     timestamptz,
  revelee_le     timestamptz,
  jours          int,
  empreinte      text,
  scellees_mois  int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.texte,
    pr.pseudo,
    public.jtlad_nom_affiche(pr.prenom, pr.nom, pr.pseudo) as auteur,
    p.scellee_le,
    p.revelee_le,
    ((now() at time zone 'Europe/Paris')::date - p.jour)::int as jours,
    p.empreinte,
    (select count(*)::int
       from public.jtlad_phrases autres
      where autres.auteur = p.auteur
        and date_trunc('month', autres.jour) = date_trunc('month', p.jour)) as scellees_mois
  from public.jtlad_phrases p
  join public.jtlad_profils pr on pr.id = p.auteur
  where p.lien = p_lien;
$$;
