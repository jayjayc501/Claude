-- « Je te l'avais dit » — prénom / nom de l'auteur et calcul des jours sur la carte
--
-- 1. Le profil garde le prénom et le nom (repris du compte Google).
--    La carte affiche « Prénom N. » pour qu'on sache de qui vient la prédiction.
-- 2. La carte compte les jours entre le scellement et aujourd'hui (et non plus
--    jusqu'au premier envoi), pour qu'une phrase renvoyée plus tard affiche le bon nombre.

alter table public.profils
  add column prenom text check (char_length(prenom) <= 50),
  add column nom    text check (char_length(nom) <= 50);

-- Extrait prénom et nom des informations envoyées par Google (ou un autre fournisseur).
create function public.noms_depuis_meta(meta jsonb, out prenom text, out nom text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  complet text := btrim(coalesce(meta->>'full_name', meta->>'name', ''));
begin
  prenom := nullif(btrim(coalesce(meta->>'given_name', split_part(complet, ' ', 1))), '');
  nom := nullif(btrim(coalesce(
    meta->>'family_name',
    case when position(' ' in complet) > 0 then substr(complet, position(' ' in complet) + 1) end
  )), '');
  prenom := left(prenom, 50);
  nom := left(nom, 50);
end;
$$;

-- « Jérôme D. », sinon le prénom seul, sinon le pseudo.
create function public.nom_affiche(p_prenom text, p_nom text, p_pseudo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_prenom is not null and p_nom is not null then p_prenom || ' ' || upper(left(p_nom, 1)) || '.'
    when p_prenom is not null then p_prenom
    else p_pseudo
  end;
$$;

-- À l'inscription : pseudo (comme avant) + prénom / nom.
create or replace function public.creer_profil()
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
  while exists (select 1 from public.profils where pseudo = candidat) loop
    n := n + 1;
    candidat := base || n::text;
  end loop;
  select * into noms from public.noms_depuis_meta(coalesce(new.raw_user_meta_data, '{}'::jsonb));
  insert into public.profils (id, pseudo, prenom, nom) values (new.id, candidat, noms.prenom, noms.nom);
  return new;
end;
$$;

-- Quand on se connecte plus tard avec Google, on complète le prénom / nom s'ils manquent.
create function public.completer_noms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  noms record;
begin
  select * into noms from public.noms_depuis_meta(coalesce(new.raw_user_meta_data, '{}'::jsonb));
  update public.profils p
     set prenom = coalesce(p.prenom, noms.prenom),
         nom    = coalesce(p.nom, noms.nom)
   where p.id = new.id
     and (p.prenom is null or p.nom is null);
  return new;
end;
$$;

create trigger noms_a_la_connexion
  after update of raw_user_meta_data on auth.users
  for each row execute function public.completer_noms();

-- Rattrapage pour les comptes existants.
update public.profils p
   set prenom = coalesce(p.prenom, n.prenom),
       nom    = coalesce(p.nom, n.nom)
  from auth.users u,
       lateral public.noms_depuis_meta(coalesce(u.raw_user_meta_data, '{}'::jsonb)) n
 where u.id = p.id;

-- Chacun peut corriger son prénom et son nom.
grant update (prenom, nom) on public.profils to authenticated;

-- Carte publique : ajoute l'auteur affiché, et compte les jours jusqu'à aujourd'hui.
drop function public.carte_publique(text);

create function public.carte_publique(p_lien text)
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
    public.nom_affiche(pr.prenom, pr.nom, pr.pseudo) as auteur,
    p.scellee_le,
    p.revelee_le,
    ((now() at time zone 'Europe/Paris')::date - p.jour)::int as jours,
    p.empreinte,
    (select count(*)::int
       from public.phrases autres
      where autres.auteur = p.auteur
        and date_trunc('month', autres.jour) = date_trunc('month', p.jour)) as scellees_mois
  from public.phrases p
  join public.profils pr on pr.id = p.auteur
  where p.lien = p_lien;
$$;

revoke all on function public.noms_depuis_meta(jsonb)           from public, anon, authenticated;
revoke all on function public.completer_noms()                  from public, anon, authenticated;
revoke all on function public.carte_publique(text)              from public;
grant execute on function public.nom_affiche(text, text, text)  to anon, authenticated;
grant execute on function public.carte_publique(text)           to anon, authenticated;
