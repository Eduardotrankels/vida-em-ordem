import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { AIJourneyProgress, LifeJourneyPlan } from "./lifeJourney";

const JOURNEY_NOTIFICATION_ID_KEY = "@vida_em_ordem_ai_journey_notification_id_v1";

let handlerConfigured = false;

function configureHandler() {
  if (handlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  handlerConfigured = true;
}

function buildReminderDate() {
  const date = new Date();
  date.setHours(19, 30, 0, 0);

  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

export async function syncJourneyReminder(
  plan: LifeJourneyPlan | null,
  progress: AIJourneyProgress
) {
  configureHandler();

  const previousId = await AsyncStorage.getItem(JOURNEY_NOTIFICATION_ID_KEY);

  if (previousId) {
    await Notifications.cancelScheduledNotificationAsync(previousId).catch(
      () => undefined
    );
  }

  if (!plan || progress.finishedAt) {
    await AsyncStorage.removeItem(JOURNEY_NOTIFICATION_ID_KEY);
    return;
  }

  const currentDayData = plan.journeyDays.find(
    (item) => item.day === progress.currentDay
  );

  if (!currentDayData) {
    await AsyncStorage.removeItem(JOURNEY_NOTIFICATION_ID_KEY);
    return;
  }

  const permissions = await Notifications.getPermissionsAsync();

  const granted =
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) {
      return;
    }
  }

  await Notifications.setNotificationChannelAsync("journey-reminders", {
    name: "Jornada IA",
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Sua missão do Dia ${currentDayData.day} está te esperando`,
      body: currentDayData.title,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: buildReminderDate(),
      channelId: "journey-reminders",
    },
  });

  await AsyncStorage.setItem(JOURNEY_NOTIFICATION_ID_KEY, id);
}
