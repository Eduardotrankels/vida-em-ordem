// =====================================================
// NOTIFICAÇÕES DESATIVADAS TEMPORARIAMENTE
// =====================================================
//
// Motivo:
// O Expo Go (SDK 53+) não suporta mais push notifications
// da forma que estávamos usando no desenvolvimento.
//
// Para evitar erros no console e deixar o app rodando liso,
// este arquivo fica neutro por enquanto.
//
// Quando formos gerar APK / Development Build / Play Store,
// eu te entrego a versão completa reativada.
//
// =====================================================

type SmartNotificationContext = {
  todayDone: number;
  totalHabits: number;
  activeChallenges: number;
  currentStreak: number;
};

export async function rescheduleSmartNotifications(
  _context: SmartNotificationContext
) {
  console.log("Notificações temporariamente desativadas no Expo Go.");
}

export async function registerForPushNotificationsAsync() {
  console.log("Registro de notificações ignorado no Expo Go.");
  return null;
}

export async function scheduleDailyNotification() {
  console.log("Agendamento de notificação ignorado no Expo Go.");
}

export async function cancelAllNotifications() {
  console.log("Cancelamento de notificações ignorado no Expo Go.");
}