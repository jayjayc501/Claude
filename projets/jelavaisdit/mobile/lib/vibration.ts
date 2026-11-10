import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Vibrations : uniquement sur téléphone (sans effet dans la version web).
const actif = Platform.OS !== 'web';

export function vibrerAppui() {
  if (actif) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function vibrerSucces() {
  if (actif) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function vibrerErreur() {
  if (actif) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
