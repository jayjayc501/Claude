import { Tabs } from 'expo-router';
import { BarreOnglets } from '../../components/BarreOnglets';
import { couleurs } from '../../lib/theme';

export default function Onglets() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: couleurs.fond } }}
      tabBar={(props) => <BarreOnglets {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Écrire' }} />
      <Tabs.Screen name="phrases" options={{ title: 'Mes phrases' }} />
    </Tabs>
  );
}
