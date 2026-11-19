-- « Je te l'avais dit » — à qui on l'a dit (le témoin), sa signature sur place,
-- vérification de la phrase avant l'étape 2, et fin de la limite d'une phrase par jour.
--
-- Décisions du 19/11/2026 (maquettes v2 validées) :
--   * Au scellement, facultatif : votre lien en case à cocher (pote, best, crush, famille, coloc,
--     collegue, prof, ex) et / ou un texte libre « à qui » (« Sarah », « ma petite sœur »…).
--     Le témoin est scellé avec la phrase : plus modifiable, inclus dans l'empreinte.
--   * Juste après le scellement, facultatif : la personne signe du doigt sur le téléphone de
--     l'auteur. La signature est une image (tracé SVG dans un cadre 300 × 150), ajoutée une seule
--     fois, dans les 15 minutes, puis plus modifiable. Une seconde empreinte la protège.
--   * La phrase est vérifiée (longueur, modération) dès « Continuer », avant l'étape « à qui ».
--   * Plus de limite d'une phrase par jour : seul reste un garde-fou anti-abus invisible
--     de 20 phrases par jour et par personne.
--   * À l'envoi, l'auteur choisit si le lien coché s'affiche sur la carte (le texte « à qui » s'affiche toujours).
--
-- Compatible avec l'APK déjà installé : les nouveaux paramètres ont tous une valeur par défaut,
-- et les anciennes façons d'appeler jtlad_sceller_phrase(p_texte) et jtlad_reveler_phrase(p_id)
-- continuent de marcher. La carte publique renvoie seulement des colonnes en plus.
--
-- À appliquer APRÈS 20261117120000_prefixe_jtlad.sql.

-- ---------------------------------------------------------------------------
-- 1. Plus de « une phrase par jour » : l'unicité (auteur, jour) devient un simple index
-- ---------------------------------------------------------------------------

alter table public.jtlad_phrases drop constraint jtlad_une_phrase_par_jour;
create index jtlad_phrases_auteur_jour on public.jtlad_phrases (auteur, jour);

-- ---------------------------------------------------------------------------
-- 2. Colonnes du témoin (toutes facultatives)
-- ---------------------------------------------------------------------------

alter table public.jtlad_phrases
  add column temoin              text,
  add column temoin_lien         text,
  add column temoin_signature    text,
  add column temoin_signee_le    timestamptz,
  add column empreinte_signature text,
  add column afficher_lien       boolean not null default true,
  add constraint jtlad_phrases_temoin_check
    check (temoin is null or char_length(temoin) between 1 and 30),
  add constraint jtlad_phrases_temoin_lien_check
    check (temoin_lien is null or temoin_lien in ('pote', 'best', 'crush', 'famille', 'coloc', 'collegue', 'prof', 'ex')),
  -- Signature : un tracé SVG (« M x y L x y … ») dans un cadre de 300 × 150, rien d'autre.
  add constraint jtlad_phrases_temoin_signature_check
    check (temoin_signature is null or (char_length(temoin_signature) between 8 and 20000 and temoin_signature ~ '^M[ML0-9 .]*$')),
  -- Une signature a toujours un signataire nommé, une date et sa propre empreinte.
  add constraint jtlad_phrases_signature_complete
    check ((temoin_signature is null and temoin_signee_le is null and empreinte_signature is null)
        or (temoin_signature is not null and temoin_signee_le is not null and empreinte_signature is not null
            and temoin is not null));

comment on column public.jtlad_phrases.temoin             is 'À qui la phrase a été dite, en texte libre : « Sarah », « ma petite sœur »… (facultatif, scellé).';
comment on column public.jtlad_phrases.temoin_lien        is 'Lien coché : pote, best, crush, famille, coloc, collegue, prof, ex (facultatif, scellé).';
comment on column public.jtlad_phrases.temoin_signature   is 'Signature au doigt du témoin, faite sur place juste après le scellement : image SVG (tracé, cadre 300 × 150).';
comment on column public.jtlad_phrases.temoin_signee_le   is 'Moment de la signature (date du serveur).';
comment on column public.jtlad_phrases.empreinte_signature is 'SHA-256 de empreinte|signature|date de signature : détecte toute modification de la signature.';
comment on column public.jtlad_phrases.afficher_lien      is 'Le lien coché apparaît-il sur la carte publique ? Choisi à l''envoi, modifiable.';

-- ---------------------------------------------------------------------------
-- 3. Petite fonction d'affichage : nom lisible d'un lien coché
-- ---------------------------------------------------------------------------

create function public.jtlad_lien_affiche(p_lien text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_lien when 'collegue' then 'collègue' else p_lien end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Vérifier une phrase sans la sceller (appelé dès « Continuer »)
--    Mêmes erreurs que le scellement : longueur_invalide, moderation:<motif>.
-- ---------------------------------------------------------------------------

create function public.jtlad_verifier_phrase(p_texte text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_texte text := btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then
    raise exception 'non_connecte' using errcode = 'P0001';
  end if;
  if char_length(v_texte) < 3 or char_length(v_texte) > 200 then
    raise exception 'longueur_invalide' using errcode = 'P0001';
  end if;
  perform public.jtlad_verifier_moderation(v_texte);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Sceller une phrase, avec un témoin facultatif
--    (on remplace l'ancienne version à 1 paramètre : garder les deux rendrait
--    l'appel jtlad_sceller_phrase(p_texte) ambigu pour l'API)
-- ---------------------------------------------------------------------------

drop function public.jtlad_sceller_phrase(text);

create function public.jtlad_sceller_phrase(
  p_texte       text,
  p_temoin      text default null,
  p_temoin_lien text default null
)
returns public.jtlad_phrases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auteur     uuid := auth.uid();
  v_texte      text := btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g'));
  v_temoin     text := nullif(btrim(regexp_replace(coalesce(p_temoin, ''), '\s+', ' ', 'g')), '');
  v_lien       text := nullif(lower(btrim(coalesce(p_temoin_lien, ''))), '');
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
  if v_lien is not null and v_lien not in ('pote', 'best', 'crush', 'famille', 'coloc', 'collegue', 'prof', 'ex') then
    raise exception 'temoin_invalide:lien' using errcode = 'P0001';
  end if;

  if v_temoin is not null then
    if char_length(v_temoin) > 30 or v_temoin ~* '(https?://|www\.)' then
      raise exception 'temoin_invalide:texte' using errcode = 'P0001';
    end if;
    -- Même modération que la phrase, avec un message dédié.
    begin
      perform public.jtlad_verifier_moderation(v_temoin);
    exception when raise_exception then
      raise exception 'moderation:temoin' using errcode = 'P0001';
    end;
  end if;

  -- Garde-fou anti-abus (même code d'erreur qu'avant, que l'ancienne app sait lire).
  if (select count(*) from public.jtlad_phrases where auteur = v_auteur and jour = v_jour) >= 20 then
    raise exception 'deja_scelle_aujourdhui' using errcode = 'P0001';
  end if;

  -- Empreinte : identique à avant sans témoin ; avec témoin, « |à qui|lien » est ajouté à la fin.
  v_a_signer := v_auteur::text || '|' || v_texte || '|'
    || to_char(v_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  if v_temoin is not null or v_lien is not null then
    v_a_signer := v_a_signer || '|' || coalesce(v_temoin, '') || '|' || coalesce(v_lien, '');
  end if;

  insert into public.jtlad_phrases (auteur, texte, scellee_le, jour, empreinte, temoin, temoin_lien, afficher_lien)
  values (
    v_auteur,
    v_texte,
    v_maintenant,
    v_jour,
    encode(extensions.digest(v_a_signer, 'sha256'), 'hex'),
    v_temoin,
    v_lien,
    -- Par défaut, on garde pour soi les liens les plus gênants.
    coalesce(v_lien, '') not in ('crush', 'ex')
  )
  returning * into v_ligne;

  return v_ligne;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Faire signer le témoin, sur place, juste après le scellement
--    Une seule fois, dans les 15 minutes, par l'auteur, et seulement s'il a indiqué à qui.
-- ---------------------------------------------------------------------------

create function public.jtlad_signer_phrase(p_id uuid, p_signature text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ligne      public.jtlad_phrases;
  v_signature  text := btrim(regexp_replace(coalesce(p_signature, ''), '\s+', ' ', 'g'));
  v_maintenant timestamptz := now();
begin
  select * into v_ligne
  from public.jtlad_phrases
  where id = p_id and auteur = auth.uid()
  for update;

  if v_ligne.id is null then
    raise exception 'phrase_introuvable' using errcode = 'P0001';
  end if;

  if v_ligne.temoin is null or v_ligne.temoin_signature is not null then
    raise exception 'signature_impossible' using errcode = 'P0001';
  end if;

  if v_maintenant > v_ligne.scellee_le + interval '15 minutes' then
    raise exception 'signature_trop_tard' using errcode = 'P0001';
  end if;

  if char_length(v_signature) not between 8 and 20000 or v_signature !~ '^M[ML0-9 .]*$' then
    raise exception 'temoin_invalide:signature' using errcode = 'P0001';
  end if;

  update public.jtlad_phrases
     set temoin_signature    = v_signature,
         temoin_signee_le    = v_maintenant,
         empreinte_signature = encode(extensions.digest(
           v_ligne.empreinte || '|' || v_signature || '|'
             || to_char(v_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
           'sha256'), 'hex')
   where id = p_id;

  return v_maintenant;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Révéler une phrase : crée le lien public de la carte, et règle l'affichage du lien coché.
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
-- 8. Carte publique : ajoute le témoin, son lien (si l'auteur l'a laissé visible) et sa signature
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
  temoin_lien      text,
  temoin_lien_type text,
  temoin_signature text,
  temoin_signee_le timestamptz
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
    p.temoin,
    case when p.afficher_lien then public.jtlad_lien_affiche(p.temoin_lien) end as temoin_lien,
    case when p.afficher_lien then p.temoin_lien end as temoin_lien_type,
    p.temoin_signature,
    p.temoin_signee_le
  from public.jtlad_phrases p
  join public.jtlad_profils pr on pr.id = p.auteur
  where p.lien = p_lien;
$$;

-- ---------------------------------------------------------------------------
-- 9. Droits d'exécution
-- ---------------------------------------------------------------------------

revoke all on function public.jtlad_lien_affiche(text)                  from public;
revoke all on function public.jtlad_verifier_phrase(text)               from public, anon;
revoke all on function public.jtlad_sceller_phrase(text, text, text)    from public, anon;
revoke all on function public.jtlad_signer_phrase(uuid, text)           from public, anon;
revoke all on function public.jtlad_reveler_phrase(uuid, boolean)       from public, anon;
revoke all on function public.jtlad_carte_publique(text)                from public;

grant execute on function public.jtlad_lien_affiche(text)               to anon, authenticated;
grant execute on function public.jtlad_verifier_phrase(text)            to authenticated;
grant execute on function public.jtlad_sceller_phrase(text, text, text) to authenticated;
grant execute on function public.jtlad_signer_phrase(uuid, text)        to authenticated;
grant execute on function public.jtlad_reveler_phrase(uuid, boolean)    to authenticated;
grant execute on function public.jtlad_carte_publique(text)             to anon, authenticated;
