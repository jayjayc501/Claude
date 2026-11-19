-- « Je te l'avais dit » — à qui on l'a dit (le témoin), et fin de la limite d'une phrase par jour
--
-- Au scellement, l'auteur peut préciser (c'est facultatif) à qui il a dit sa prédiction :
--   * le prénom de la personne et la 1re lettre de son nom : « Léa M. » ;
--   * votre lien : une case à cocher (pote, best, crush, famille, coloc, collegue, prof, ex)
--     et / ou un texte libre (« petite sœur », « voisin du 3e »).
-- Le témoin est scellé avec la phrase : il n'est plus modifiable et entre dans l'empreinte.
-- À l'envoi, l'auteur choisit si le lien s'affiche sur la carte (le prénom s'affiche toujours).
--
-- Plus de limite d'une phrase par jour (décision du 19/11/2026) : seul reste un garde-fou
-- anti-abus invisible de 20 phrases par jour et par personne.
--
-- Compatible avec l'APK déjà installé : les nouveaux paramètres ont tous une valeur par défaut,
-- et les anciennes façons d'appeler jtlad_sceller_phrase(p_texte) et jtlad_reveler_phrase(p_id)
-- continuent de marcher. La carte publique renvoie seulement des colonnes en plus.
--
-- À appliquer APRÈS 20261117120000_prefixe_jtlad.sql.

-- ---------------------------------------------------------------------------
-- 1. Colonnes (toutes facultatives)
-- ---------------------------------------------------------------------------

alter table public.jtlad_phrases
  add column temoin_prenom    text,
  add column temoin_initiale  text,
  add column temoin_lien      text,
  add column temoin_precision text,
  add column afficher_lien    boolean not null default true,
  add constraint jtlad_phrases_temoin_prenom_check
    check (temoin_prenom is null or char_length(temoin_prenom) between 1 and 20),
  add constraint jtlad_phrases_temoin_initiale_check
    check (temoin_initiale is null or char_length(temoin_initiale) = 1),
  add constraint jtlad_phrases_temoin_lien_check
    check (temoin_lien is null or temoin_lien in ('pote', 'best', 'crush', 'famille', 'coloc', 'collegue', 'prof', 'ex')),
  add constraint jtlad_phrases_temoin_precision_check
    check (temoin_precision is null or char_length(temoin_precision) between 1 and 30),
  -- Pas d'initiale ni de lien sans prénom.
  add constraint jtlad_phrases_temoin_complet
    check (temoin_prenom is not null or (temoin_initiale is null and temoin_lien is null and temoin_precision is null));

-- Fin de « une phrase par jour » : l'unicité (auteur, jour) disparaît, un index la remplace
-- pour compter vite les phrases du jour (garde-fou anti-abus).
alter table public.jtlad_phrases drop constraint jtlad_une_phrase_par_jour;
create index jtlad_phrases_auteur_jour on public.jtlad_phrases (auteur, jour);

comment on column public.jtlad_phrases.temoin_prenom    is 'Prénom de la personne à qui la prédiction a été dite (facultatif, scellé).';
comment on column public.jtlad_phrases.temoin_initiale  is '1re lettre du nom de cette personne, en majuscule (facultatif, scellé).';
comment on column public.jtlad_phrases.temoin_lien      is 'Lien coché : pote, best, crush, famille, coloc, collegue, prof, ex (facultatif, scellé).';
comment on column public.jtlad_phrases.temoin_precision is 'Lien écrit librement, ex. « petite sœur » (facultatif, scellé).';
comment on column public.jtlad_phrases.afficher_lien    is 'Le lien apparaît-il sur la carte publique ? Choisi à l''envoi, modifiable.';

-- ---------------------------------------------------------------------------
-- 2. Petites fonctions d'affichage
-- ---------------------------------------------------------------------------

-- « Léa M. », sinon « Léa », sinon rien.
create function public.jtlad_temoin_affiche(p_prenom text, p_initiale text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_prenom is null then null
    when p_initiale is null then p_prenom
    else p_prenom || ' ' || p_initiale || '.'
  end;
$$;

-- Le texte libre s'il existe, sinon le nom de la case cochée.
create function public.jtlad_lien_affiche(p_lien text, p_precision text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_precision,
    case p_lien when 'collegue' then 'collègue' else p_lien end
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Sceller une phrase, avec un témoin facultatif
--    (on remplace l'ancienne version à 1 paramètre : garder les deux rendrait
--    l'appel jtlad_sceller_phrase(p_texte) ambigu pour l'API)
-- ---------------------------------------------------------------------------

drop function public.jtlad_sceller_phrase(text);

create function public.jtlad_sceller_phrase(
  p_texte            text,
  p_temoin_prenom    text default null,
  p_temoin_initiale  text default null,
  p_temoin_lien      text default null,
  p_temoin_precision text default null
)
returns public.jtlad_phrases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auteur     uuid := auth.uid();
  v_texte      text := btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g'));
  v_prenom     text := nullif(btrim(regexp_replace(coalesce(p_temoin_prenom, ''), '\s+', ' ', 'g')), '');
  v_initiale   text := nullif(upper(left(regexp_replace(coalesce(p_temoin_initiale, ''), '[^[:alpha:]]', '', 'g'), 1)), '');
  v_lien       text := nullif(lower(btrim(coalesce(p_temoin_lien, ''))), '');
  v_precision  text := nullif(btrim(regexp_replace(coalesce(p_temoin_precision, ''), '\s+', ' ', 'g')), '');
  v_maintenant timestamptz := now();
  v_jour       date := (now() at time zone 'Europe/Paris')::date;
  v_a_signer   text;
  v_ligne      public.jtlad_phrases;
begin
  if v_auteur is null then
    raise exception 'non_connecte' using errcode = 'P0001';
  end if;

  if char_length(v_texte) < 3 or char_length(v_texte) > 200 then
    raise exception 'longueur_invalide' using errcode = 'P0001';
  end if;

  perform public.jtlad_verifier_moderation(v_texte);

  -- Le témoin (facultatif).
  if v_prenom is null and (v_initiale is not null or v_lien is not null or v_precision is not null) then
    raise exception 'temoin_invalide:prenom' using errcode = 'P0001';
  end if;

  if v_prenom is not null then
    -- Des lettres, espaces, tirets et apostrophes : « Léa », « Jean-Marc », « Maman ».
    if char_length(v_prenom) > 20 or v_prenom !~ '^[[:alpha:]][[:alpha:]'' ’-]*$' then
      raise exception 'temoin_invalide:prenom' using errcode = 'P0001';
    end if;
    v_prenom := upper(left(v_prenom, 1)) || substr(v_prenom, 2);

    if v_lien is not null and v_lien not in ('pote', 'best', 'crush', 'famille', 'coloc', 'collegue', 'prof', 'ex') then
      raise exception 'temoin_invalide:lien' using errcode = 'P0001';
    end if;

    if v_precision is not null and (char_length(v_precision) > 30 or v_precision ~* '(https?://|www\.)') then
      raise exception 'temoin_invalide:precision' using errcode = 'P0001';
    end if;

    -- Même modération que la phrase, avec un message dédié.
    begin
      perform public.jtlad_verifier_moderation(v_prenom);
      if v_precision is not null then
        perform public.jtlad_verifier_moderation(v_precision);
      end if;
    exception when raise_exception then
      raise exception 'moderation:temoin' using errcode = 'P0001';
    end;
  end if;

  -- Empreinte : identique à avant sans témoin ; avec témoin, il est ajouté à la fin.
  v_a_signer := v_auteur::text || '|' || v_texte || '|'
    || to_char(v_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  if v_prenom is not null then
    v_a_signer := v_a_signer || '|' || v_prenom || '|' || coalesce(v_initiale, '')
      || '|' || coalesce(v_lien, '') || '|' || coalesce(v_precision, '');
  end if;

  -- Garde-fou anti-abus (même code d'erreur qu'avant, que l'ancienne app sait lire).
  if (select count(*) from public.jtlad_phrases where auteur = v_auteur and jour = v_jour) >= 20 then
    raise exception 'deja_scelle_aujourdhui' using errcode = 'P0001';
  end if;

  insert into public.jtlad_phrases (
    auteur, texte, scellee_le, jour, empreinte,
    temoin_prenom, temoin_initiale, temoin_lien, temoin_precision, afficher_lien
  )
  values (
    v_auteur,
    v_texte,
    v_maintenant,
    v_jour,
    encode(extensions.digest(v_a_signer, 'sha256'), 'hex'),
    v_prenom, v_initiale, v_lien, v_precision,
    -- Par défaut, on garde pour soi les liens les plus gênants.
    coalesce(v_lien, '') not in ('crush', 'ex')
  )
  returning * into v_ligne;

  return v_ligne;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Révéler une phrase : crée le lien public de la carte, et règle l'affichage du lien.
--    p_afficher_lien = null (ancienne app) : on ne touche pas au réglage.
-- ---------------------------------------------------------------------------

drop function public.jtlad_reveler_phrase(uuid);

create function public.jtlad_reveler_phrase(p_id uuid, p_afficher_lien boolean default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lien   text;
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

  if p_afficher_lien is not null then
    update public.jtlad_phrases
       set afficher_lien = p_afficher_lien
     where id = p_id;
  end if;

  return v_lien;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Carte publique : ajoute le témoin (et son lien si l'auteur l'a laissé visible)
-- ---------------------------------------------------------------------------

drop function public.jtlad_carte_publique(text);

create function public.jtlad_carte_publique(p_lien text)
returns table (
  texte            text,
  pseudo           text,
  auteur           text,
  scellee_le       timestamptz,
  revelee_le       timestamptz,
  jours            int,
  empreinte        text,
  scellees_mois    int,
  temoin           text,
  temoin_prenom    text,
  temoin_lien      text,
  temoin_lien_type text
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
        and date_trunc('month', autres.jour) = date_trunc('month', p.jour)) as scellees_mois,
    public.jtlad_temoin_affiche(p.temoin_prenom, p.temoin_initiale) as temoin,
    p.temoin_prenom,
    case when p.afficher_lien then public.jtlad_lien_affiche(p.temoin_lien, p.temoin_precision) end as temoin_lien,
    case when p.afficher_lien then p.temoin_lien end as temoin_lien_type
  from public.jtlad_phrases p
  join public.jtlad_profils pr on pr.id = p.auteur
  where p.lien = p_lien;
$$;

-- ---------------------------------------------------------------------------
-- 6. Droits d'exécution
-- ---------------------------------------------------------------------------

revoke all on function public.jtlad_temoin_affiche(text, text)                    from public;
revoke all on function public.jtlad_lien_affiche(text, text)                      from public;
revoke all on function public.jtlad_sceller_phrase(text, text, text, text, text)  from public, anon;
revoke all on function public.jtlad_reveler_phrase(uuid, boolean)                 from public, anon;
revoke all on function public.jtlad_carte_publique(text)                          from public;

grant execute on function public.jtlad_temoin_affiche(text, text)                   to anon, authenticated;
grant execute on function public.jtlad_lien_affiche(text, text)                     to anon, authenticated;
grant execute on function public.jtlad_sceller_phrase(text, text, text, text, text) to authenticated;
grant execute on function public.jtlad_reveler_phrase(uuid, boolean)                to authenticated;
grant execute on function public.jtlad_carte_publique(text)                         to anon, authenticated;
