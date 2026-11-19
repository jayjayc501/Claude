import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  LIENS, PRECISION_MAX, PRENOM_MAX, ditA, messagePiquant, nettoyerInitiale, niveauPiquant, nomTemoin, prenomValide,
  texteLien, type Personne, type Temoin, TEMOIN_VIDE,
} from '../lib/temoin';
import { couleurs, polices } from '../lib/theme';
import { vibrerLeger } from '../lib/vibration';
import { Avatar } from './Avatar';
import { Bouton } from './Bouton';
import { IconeCadenas, IconeCrayon, IconeFlamme, IconePersonne, IconeRetour } from './Icones';

type Props = {
  texte: string;
  temoin: Temoin;
  onChange: (t: Temoin) => void;
  personnes: Personne[];
  erreur: string | null;
  envoi: boolean;
  onRetour: () => void;
  onSceller: () => void;
};

/**
 * Étape 2 du scellement : « Tu l'as dit à qui ? ».
 * Tout est facultatif, mais l'aperçu de la carte et la jauge réagissent à chaque lettre
 * pour donner envie de remplir.
 */
export function EtapeTemoin({ texte, temoin, onChange, personnes, erreur, envoi, onRetour, onSceller }: Props) {
  const champInitiale = useRef<TextInput>(null);
  const champPrecision = useRef<TextInput>(null);

  const prenom = temoin.prenom.trim();
  const nom = nomTemoin(prenom, temoin.initiale);
  const lien = texteLien(temoin.lien, temoin.precision);
  const niveau = niveauPiquant(temoin);
  const message = messagePiquant(temoin);
  const prenomIncorrect = prenom.length > 0 && !prenomValide(prenom);
  const rempli = !!(temoin.prenom || temoin.initiale || temoin.lien || temoin.precision);

  // Les flammes « sautent » et le téléphone vibre quand la jauge monte.
  const rebond = useRef(new Animated.Value(1)).current;
  const niveauPrecedent = useRef(niveau);
  useEffect(() => {
    if (niveau > niveauPrecedent.current) {
      vibrerLeger();
      rebond.setValue(1.35);
      Animated.spring(rebond, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
    }
    niveauPrecedent.current = niveau;
  }, [niveau, rebond]);

  const maj = (champs: Partial<Temoin>) => onChange({ ...temoin, ...champs });

  return (
    <>
      <View style={styles.enTete}>
        <Pressable accessibilityRole="button" accessibilityLabel="Revenir à la phrase" onPress={onRetour} style={styles.retour}>
          <IconeRetour couleur={couleurs.texte} taille={20} />
        </Pressable>
        <View style={{ gap: 2, flex: 1 }}>
          <View style={styles.etape}>
            <View style={styles.trait} />
            <View style={styles.trait} />
            <Text style={styles.etapeTexte}>Étape 2 sur 2</Text>
          </View>
          <Text style={styles.titre} accessibilityRole="header">Tu l'as dit à qui ?</Text>
        </View>
      </View>

      {/* Aperçu de la carte, en direct */}
      <View style={{ gap: 8 }}>
        <Text style={styles.etiquette}>APERÇU DE TA CARTE</Text>
        <View style={styles.carteRose} accessibilityLabel={`Aperçu : « ${texte} ». ${nom ? ditA(nom, lien) : 'Dit à personne.'}`}>
          <Text style={styles.phraseRose} numberOfLines={4}>« {texte} »</Text>
          {nom ? (
            <View style={styles.pastilleDit}>
              <IconePersonne couleur={couleurs.vert} />
              <Text style={styles.pastilleDitTexte} numberOfLines={1}>{ditA(nom, lien)}</Text>
            </View>
          ) : (
            <View style={styles.pastilleVide}>
              <Text style={styles.pastilleVideTexte}>Dit à… personne ?</Text>
            </View>
          )}
        </View>
        <Text style={styles.slogan}>
          {prenom ? `regarde, ${prenom.toLowerCase()}.` : 'regarde.'} je te l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
        </Text>
      </View>

      {/* Jauge « effet je te l'avais dit » */}
      <View style={styles.jauge} accessible accessibilityLabel={`Effet « je te l'avais dit » : ${niveau} sur 3. ${message.titre} ${message.texte}`}>
        <Animated.View style={[styles.flammes, { transform: [{ scale: rebond }] }]}>
          {[1, 2, 3].map((n) => (
            <IconeFlamme key={n} couleur={n <= niveau ? couleurs.vert : couleurs.bordureForte} allumee={n <= niveau} />
          ))}
        </Animated.View>
        <Text style={styles.jaugeTexte}>
          <Text style={{ color: couleurs.texte, fontFamily: polices.tresGras }}>{message.titre}</Text> {message.texte}
        </Text>
      </View>

      {/* Personnes déjà citées : un geste remplit tout */}
      {personnes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recents} keyboardShouldPersistTaps="handled">
          <Text style={styles.recentsTitre}>Déjà dit à</Text>
          {personnes.slice(0, 8).map((p) => (
            <Pressable
              key={p.cle}
              accessibilityRole="button"
              accessibilityLabel={`Remplir avec ${p.nom}${texteLien(p.lien, p.precision) ? `, ${texteLien(p.lien, p.precision)}` : ''}`}
              onPress={() => {
                vibrerLeger();
                onChange({ prenom: p.prenom, initiale: p.initiale, lien: p.lien, precision: p.precision });
              }}
              style={({ pressed }) => [styles.recent, pressed && { opacity: 0.8 }]}
            >
              <Avatar prenom={p.prenom} />
              <Text style={styles.recentTexte}>{p.nom}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Les champs */}
      <View style={styles.champs}>
        <View style={styles.ligne}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.etiquette} nativeID="etiquette-prenom">SON PRÉNOM</Text>
            <TextInput
              accessibilityLabelledBy="etiquette-prenom"
              value={temoin.prenom}
              onChangeText={(v) => maj({ prenom: v.slice(0, PRENOM_MAX) })}
              placeholder="Léa"
              placeholderTextColor="#6E6A80"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="off"
              maxLength={PRENOM_MAX}
              returnKeyType="next"
              onSubmitEditing={() => champInitiale.current?.focus()}
              style={[styles.saisie, prenomIncorrect && styles.saisieErreur]}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.etiquette} nativeID="etiquette-initiale">NOM</Text>
            <View style={styles.ligneInitiale}>
              <TextInput
                ref={champInitiale}
                accessibilityLabelledBy="etiquette-initiale"
                accessibilityHint="Première lettre de son nom"
                value={temoin.initiale}
                onChangeText={(v) => maj({ initiale: nettoyerInitiale(v) })}
                placeholder="M"
                placeholderTextColor="#6E6A80"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={2}
                selectTextOnFocus
                returnKeyType="next"
                onSubmitEditing={() => champPrecision.current?.focus()}
                style={[styles.saisie, styles.saisieInitiale]}
              />
              <Text style={styles.aide}>1re{'\n'}lettre</Text>
            </View>
          </View>
        </View>
        {prenomIncorrect ? (
          <Text style={styles.erreur}>Des lettres seulement (espaces, tirets et apostrophes acceptés).</Text>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={styles.etiquette}>VOTRE LIEN</Text>
          <View style={styles.liens}>
            {LIENS.map((l) => {
              const coche = temoin.lien === l.code;
              return (
                <Pressable
                  key={l.code}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: coche }}
                  accessibilityLabel={l.label}
                  onPress={() => {
                    vibrerLeger();
                    maj({ lien: coche ? null : l.code });
                  }}
                  style={[styles.puceLien, coche && styles.puceLienCochee]}
                >
                  <Text style={[styles.puceLienTexte, coche && { color: couleurs.fond }]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.champPrecision}>
            <IconeCrayon couleur={couleurs.texteDoux} taille={16} />
            <TextInput
              ref={champPrecision}
              accessibilityLabel="Précise votre lien (facultatif)"
              value={temoin.precision}
              onChangeText={(v) => maj({ precision: v.slice(0, PRECISION_MAX) })}
              placeholder="Précise : petite sœur, voisin du 3e…"
              placeholderTextColor="#6E6A80"
              autoCorrect
              maxLength={PRECISION_MAX}
              returnKeyType="done"
              style={styles.saisiePrecision}
            />
            <Text style={styles.compteur}>{temoin.precision.length} / {PRECISION_MAX}</Text>
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <IconeCadenas couleur={couleurs.texteDoux} taille={18} />
        <Text style={styles.infoTexte}>
          Scellé avec ta phrase, pour de bon. Le prénom n'apparaît que sur la carte que tu envoies.
        </Text>
      </View>

      {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}

      <View style={{ flex: 1, minHeight: 16 }} />
      <Bouton
        titre="Sceller"
        onPress={onSceller}
        chargement={envoi}
        desactive={prenomIncorrect}
        icone={<IconeCadenas couleur={prenomIncorrect ? couleurs.texteDoux : couleurs.fond} />}
      />
      {rempli ? (
        <Pressable accessibilityRole="button" onPress={() => onChange(TEMOIN_VIDE)} style={styles.lienTexte}>
          <Text style={styles.lienTexteTexte}>Je ne l'ai dit à personne</Text>
        </Pressable>
      ) : (
        <Text style={[styles.aide, { textAlign: 'center' }]}>C'est facultatif : tu peux sceller sans.</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  enTete: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  retour: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  etape: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trait: { width: 16, height: 5, borderRadius: 999, backgroundColor: couleurs.vert },
  etapeTexte: { fontFamily: polices.gras, fontSize: 12, color: couleurs.texteDoux },
  titre: { fontFamily: polices.titre, fontSize: 22, lineHeight: 26, color: couleurs.texte, letterSpacing: -0.6 },
  etiquette: { fontFamily: polices.gras, fontSize: 12, letterSpacing: 1, color: couleurs.texteDoux },
  carteRose: {
    backgroundColor: couleurs.rose, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 16, gap: 10,
    transform: [{ rotate: '-1.2deg' }],
  },
  phraseRose: { fontFamily: polices.tresGras, fontSize: 17, lineHeight: 22, color: couleurs.fond },
  pastilleDit: {
    alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: couleurs.fond, borderRadius: 999, paddingVertical: 6, paddingLeft: 8, paddingRight: 12,
  },
  pastilleDitTexte: { flexShrink: 1, fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  pastilleVide: {
    alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: 'rgba(13,12,18,0.45)', paddingVertical: 5, paddingHorizontal: 12,
  },
  pastilleVideTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.fond },
  slogan: { fontFamily: polices.titre, fontSize: 15, lineHeight: 19, color: couleurs.texte, letterSpacing: -0.3 },
  jauge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flammes: { flexDirection: 'row', gap: 2 },
  jaugeTexte: { flex: 1, fontFamily: polices.normal, fontSize: 14, lineHeight: 19, color: couleurs.texteDoux },
  recents: { alignItems: 'center', gap: 8, paddingRight: 8 },
  recentsTitre: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.texteDoux },
  recent: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingLeft: 5, paddingRight: 12,
    borderRadius: 999, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure,
  },
  recentTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  champs: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 26, padding: 16, gap: 14,
  },
  ligne: { flexDirection: 'row', gap: 10 },
  ligneInitiale: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saisie: {
    height: 46, borderRadius: 14, borderWidth: 1, borderColor: couleurs.bordureForte, backgroundColor: couleurs.fond,
    paddingHorizontal: 14, fontFamily: polices.gras, fontSize: 17, color: couleurs.texte,
  },
  saisieErreur: { borderColor: couleurs.rose },
  saisieInitiale: { width: 46, paddingHorizontal: 0, textAlign: 'center', fontFamily: polices.titre },
  aide: { fontFamily: polices.normal, fontSize: 12, lineHeight: 15, color: couleurs.texteDoux },
  liens: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  puceLien: {
    flexGrow: 1, flexBasis: '22%', height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: couleurs.fond, borderWidth: 1, borderColor: couleurs.bordure, paddingHorizontal: 4,
  },
  puceLienCochee: { backgroundColor: couleurs.texte, borderColor: couleurs.texte },
  puceLienTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  champPrecision: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1,
    borderColor: couleurs.bordureForte, backgroundColor: couleurs.fond, paddingHorizontal: 12,
  },
  saisiePrecision: { flex: 1, minWidth: 0, height: 44, fontFamily: polices.moyen, fontSize: 15, color: couleurs.texte, padding: 0 },
  compteur: { fontFamily: polices.normal, fontSize: 12, color: couleurs.texteDoux },
  info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoTexte: { flex: 1, fontFamily: polices.normal, fontSize: 13, lineHeight: 18, color: couleurs.texteDoux },
  erreur: { fontFamily: polices.moyen, fontSize: 14, lineHeight: 19, color: couleurs.rose },
  lienTexte: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  lienTexteTexte: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.texteDoux, textDecorationLine: 'underline' },
});
