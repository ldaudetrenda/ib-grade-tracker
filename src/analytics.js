import { logEvent as fbLogEvent } from "firebase/analytics";
import { analytics } from "./firebase";

export function logEvent(eventName, params) {
  if (analytics) {
    fbLogEvent(analytics, eventName, params);
  }
}
