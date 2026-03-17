import type { RedAlert, TelegramMessage, NewsItem, ClassifiedMessage } from "@shared/schema";
import { TtlCache } from "./cache";

export const alertHistory: RedAlert[] = [];
export let latestTgMsgs: TelegramMessage[] = [];
export let latestXPosts: NewsItem[] = [];
export let latestAlerts: RedAlert[] = [];
export const classifiedMessageCache: ClassifiedMessage[] = [];
export const aiClassificationCache = new TtlCache<ClassifiedMessage[]>(10_000);

export function setLatestTgMsgs(msgs: TelegramMessage[]) { latestTgMsgs = msgs; }
export function setLatestXPosts(posts: NewsItem[]) { latestXPosts = posts; }
export function setLatestAlerts(alerts: RedAlert[]) { latestAlerts = alerts; }

export function recordAlertHistory(alerts: RedAlert[]) {
  for (const a of alerts) {
    if (!alertHistory.find(h => h.id === a.id)) {
      alertHistory.push(a);
    }
  }
  if (alertHistory.length > 2000) alertHistory.splice(0, alertHistory.length - 2000);
}

export const sseBroadcasters = new Set<(event: string, data: unknown) => void>();

export function broadcastSse(event: string, data: unknown) {
  for (const fn of sseBroadcasters) { try { fn(event, data); } catch {} }
}
