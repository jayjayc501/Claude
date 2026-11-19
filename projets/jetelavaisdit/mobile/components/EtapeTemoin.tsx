import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LIENS, TEMOIN_MAX, TEMOIN_VIDE, ditA, regarde, type Personne, type Temoin } from '../lib/temoin';
import { couleurs, polices } from '../lib/theme';
import { vibrerLeger } from '../lib/vibration';
import { Avatar } from './Avatar';
import { Bouton } from './Bouton';
import { IconeCadenas, IconeCrayon, IconePersonne, IconeRetour } from './Icones';

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
 * Étape 2 du scellement : « Tu l'as dit à qui ? » (maquette 05).
 * Tout est facultatif : une case pour le lien, un texte libre pour la personne.
 * L'aperçu de la carte se met à jour à chaque lettre.
 */
export function EtapeTemoin({ texte, temoin, onChange, personnes, erreur, envoi, onRetour, onSceller }: Props) {
  const nom = temoin.nom.trim();
  const pastille = ditA(nom, temoin.lien);
  const rempli = !!(temoin.nom || temoin.lien);

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
        <View style={styles.carteRose} accessibilityLabel={`Aperçu : « ${texte} ». ${pastille || 'Dit à personne.'}`}>
          <Text style={styles.phraseRose} numberOfLines={4}>« {texte} »</Text>
          {pastille ? (
            <View style={styles.pastilleDit}>
              <IconePersonne couleur={couleurs.vert} />
              <Text style={styles.pastilleDitTexte} numberOfLines={1}>{pastille}</Text>
            </View>
          ) : (
            <View style={styles.pastilleVide}>
              <Text style={styles.pastilleVideTexte}>Dit à… personne ?</Text>
            </View>
          )}
        </View>
        <Text style={styles.slogan}>
          {regarde(nom)} je te l'avais <Text style={{ color: couleurs.vert }}>dit.</Text>
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
              accessibilityLabel={`Remplir avec ${ditA(p.nom, p.lien).replace('Dit à ', '')}`}
              onPress={() => {
                vibrerLeger();
                onChange({ nom: p.nom, lien: p.lien });
              }}
              style={({ pressed }) => [styles.recent, pressed && { opacity: 0.8 }]}
            >
              <Avatar nom={p.nom} />
              <Text style={styles.recentTexte}>{p.nom}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Le lien (case à cocher) et la personne (texte libre) */}
      <View style={styles.champs}>
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
                  onChange({ ...temoin, lien: coche ? null : l.code });
                }}
                style={[styles.puceLien, coche && styles.puceLienCochee]}
              >
                <Text style={[styles.puceLienTexte, coche && { color: couleurs.fond }]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.champQui}>
          <IconeCrayon couleur={couleurs.texteDoux} taille={16} />
          <TextInput
            accessibilityLabel="À qui ? Son prénom ou un surnom"
            value={temoin.nom}
            onChangeText={(v) => onChange({ ...temoin, nom: v.slice(0, TEMOIN_MAX) })}
            placeholder="Sarah"
            placeholderTextColor="#6E6A80"
            autoCapitalize="sentences"
            autoComplete="off"
            maxLength={TEMOIN_MAX}
            returnKeyType="done"
            style={styles.saisieQui}
          />
          <Text style={styles.compteur}>{temoin.nom.length} / {TEMOIN_MAX}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <IconeCadenas couleur={couleurs.texteDoux} taille={18} />
        <Text style={styles.infoTexte}>Scellé avec ta phrase, pour de bon.</Text>
      </View>

      {erreur ? <Text style={styles.erreur} accessibilityLiveRegion="polite">{erreur}</Text> : null}

      <View style={{ flex: 1, minHeight: 16 }} />
      <Bouton titre="Sceller" onPress={onSceller} chargement={envoi} icone={<IconeCadenas couleur={couleurs.fond} />} />
      {rempli ? (
        <Pressable accessibilityRole="button" onPress={() => onChange(TEMOIN_VIDE)} style={styles.lienTexte}>
          <Text style={styles.lienTexteTexte}>Je ne l'ai dit à personne</Text>
        </Pressable>
      ) : null}
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
  recents: { alignItems: 'center', gap: 8, paddingRight: 8 },
  recentsTitre: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.texteDoux },
  recent: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingLeft: 5, paddingRight: 12,
    borderRadius: 999, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure,
  },
  recentTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  champs: {
    backgroundColor: couleurs.surface, borderColor: couleurs.bordure, borderWidth: 1,
    borderRadius: 26, padding: 16, gap: 10,
  },
  liens: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  puceLien: {
    flexGrow: 1, flexBasis: '22%', height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: couleurs.fond, borderWidth: 1, borderColor: couleurs.bordure, paddingHorizontal: 4,
  },
  puceLienCochee: { backgroundColor: couleurs.texte, borderColor: couleurs.texte },
  puceLienTexte: { fontFamily: polices.gras, fontSize: 13, color: couleurs.texte },
  champQui: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1,
    borderColor: couleurs.bordureForte, backgroundColor: couleurs.fond, paddingHorizontal: 12,
  },
  saisieQui: { flex: 1, minWidth: 0, height: 46, fontFamily: polices.gras, fontSize: 16, color: couleurs.texte, padding: 0 },
  compteur: { fontFamily: polices.normal, fontSize: 12, color: couleurs.texteDoux },
  info: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  infoTexte: { flex: 1, fontFamily: polices.normal, fontSize: 13, lineHeight: 18, color: couleurs.texteDoux },
  erreur: { fontFamily: polices.moyen, fontSize: 14, lineHeight: 19, color: couleurs.rose },
  lienTexte: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  lienTexteTexte: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.texteDoux, textDecorationLine: 'underline' },
});
