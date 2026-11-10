-- « Je l'avais dit » — schéma initial
--
-- Principes :
--   * La date de scellement est fixée par le serveur (now()), jamais par le téléphone.
--   * Une phrase scellée ne peut plus être modifiée ni supprimée par son auteur :
--     aucune politique RLS n'autorise INSERT / UPDATE / DELETE sur `phrases`.
--     Tout passe par les fonctions `sceller_phrase` et `reveler_phrase`.
--   * Une seule phrase par jour et par personne (jour calculé à l'heure de Paris).
--   * Une empreinte SHA-256 est calculée au scellement pour détecter toute modification.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profils (
  id      uuid primary key references auth.users (id) on delete cascade,
  pseudo  text not null unique check (pseudo ~ '^[a-z0-9_.]{3,20}$'),
  cree_le timestamptz not null default now()
);

create table public.phrases (
  id          uuid primary key default gen_random_uuid(),
  auteur      uuid not null references public.profils (id) on delete cascade,
  texte       text not null check (char_length(texte) between 3 and 200),
  scellee_le  timestamptz not null default now(),
  jour        date not null,                 -- jour du scellement, heure de Paris
  empreinte   text not null,                 -- SHA-256 de auteur|texte|date
  revelee_le  timestamptz,                   -- date du premier « Je l'avais dit ! »
  lien        text unique,                   -- identifiant public de la carte
  constraint une_phrase_par_jour unique (auteur, jour)
);

create index phrases_auteur_date on public.phrases (auteur, scellee_le desc);

-- Mots refusés par la modération de base (en attendant la modération par IA).
create table public.moderation_mots (
  mot text primary key
);

insert into public.moderation_mots (mot) values
  ('connard'), ('connasse'), ('salope'), ('pute'), ('enculé'), ('encule'),
  ('batard'), ('bâtard'), ('abruti'), ('débile'), ('fdp'), ('ntm'),
  ('nique'), ('pd'), ('merde'), ('sale con'), ('grosse vache'), ('gros porc');

-- ---------------------------------------------------------------------------
-- Sécurité (RLS)
-- ---------------------------------------------------------------------------

alter table public.profils enable row level security;
alter table public.phrases enable row level security;
alter table public.moderation_mots enable row level security;

create policy "je vois mon profil" on public.profils
  for select to authenticated using (id = auth.uid());

create policy "je modifie mon pseudo" on public.profils
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "je vois mes phrases" on public.phrases
  for select to authenticated using (auteur = auth.uid());

revoke all on public.profils, public.phrases, public.moderation_mots from anon, authenticated;
grant select on public.profils to authenticated;
grant update (pseudo) on public.profils to authenticated;
grant select on public.phrases to authenticated;

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------------

create function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base     text;
  candidat text;
  n        int := 0;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_.]', '', 'g'));
  if char_length(base) < 3 then
    base := 'joueur';
  end if;
  base := left(base, 15);
  candidat := base;
  while exists (select 1 from public.profils where pseudo = candidat) loop
    n := n + 1;
    candidat := base || n::text;
  end loop;
  insert into public.profils (id, pseudo) values (new.id, candidat);
  return new;
end;
$$;

create trigger profil_a_l_inscription
  after insert on auth.users
  for each row execute function public.creer_profil();

-- ---------------------------------------------------------------------------
-- Modération de base
-- ---------------------------------------------------------------------------

-- Lève une erreur `moderation:<motif>` si la phrase n'est pas acceptable.
create function public.verifier_moderation(p_texte text)
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
    select 1 from public.moderation_mots m
    where p_texte ~* ('(^|[^[:alnum:]])' || m.mot || '($|[^[:alnum:]])')
  ) then
    raise exception 'moderation:insulte' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sceller une phrase
-- ---------------------------------------------------------------------------

create function public.sceller_phrase(p_texte text)
returns public.phrases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auteur     uuid := auth.uid();
  v_texte      text := btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g'));
  v_maintenant timestamptz := now();
  v_ligne      public.phrases;
begin
  if v_auteur is null then
    raise exception 'non_connecte' using errcode = 'P0001';
  end if;

  if char_length(v_texte) < 3 or char_length(v_texte) > 200 then
    raise exception 'longueur_invalide' using errcode = 'P0001';
  end if;

  perform public.verifier_moderation(v_texte);

  begin
    insert into public.phrases (auteur, texte, scellee_le, jour, empreinte)
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

-- ---------------------------------------------------------------------------
-- Révéler une phrase (« Je l'avais dit ! ») : crée le lien public de la carte
-- ---------------------------------------------------------------------------

create function public.reveler_phrase(p_id uuid)
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
  from public.phrases
  where id = p_id and auteur = auth.uid()
  for update;

  if v_existe is null then
    raise exception 'phrase_introuvable' using errcode = 'P0001';
  end if;

  if v_lien is null then
    v_lien := replace(replace(rtrim(encode(extensions.gen_random_bytes(9), 'base64'), '='), '+', '-'), '/', '_');
    update public.phrases
       set lien = v_lien, revelee_le = now()
     where id = p_id;
  end if;

  return v_lien;
end;
$$;

-- ---------------------------------------------------------------------------
-- Carte publique : ce que voit le destinataire du lien (sans compte)
-- ---------------------------------------------------------------------------

create function public.carte_publique(p_lien text)
returns table (
  texte          text,
  pseudo         text,
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
    p.scellee_le,
    p.revelee_le,
    ((p.revelee_le at time zone 'Europe/Paris')::date - p.jour)::int as jours,
    p.empreinte,
    (select count(*)::int
       from public.phrases autres
      where autres.auteur = p.auteur
        and date_trunc('month', autres.jour) = date_trunc('month', p.jour)) as scellees_mois
  from public.phrases p
  join public.profils pr on pr.id = p.auteur
  where p.lien = p_lien;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------

revoke all on function public.creer_profil()              from public, anon, authenticated;
revoke all on function public.verifier_moderation(text)   from public, anon, authenticated;
revoke all on function public.sceller_phrase(text)        from public, anon;
revoke all on function public.reveler_phrase(uuid)        from public, anon;
revoke all on function public.carte_publique(text)        from public;

grant execute on function public.sceller_phrase(text)  to authenticated;
grant execute on function public.reveler_phrase(uuid)  to authenticated;
grant execute on function public.carte_publique(text)  to anon, authenticated;
