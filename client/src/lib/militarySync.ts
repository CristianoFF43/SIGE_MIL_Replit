import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export const MILITARY_QUERY_PREFIX = "/api/militares";

const MILITARY_SYNC_CHANNEL = "sigemil-military-sync";
const MILITARY_SYNC_STORAGE_KEY = "sigemil-military-sync";
const MILITARY_SYNC_EVENT = "sigemil:military-sync";

export const militaryQuerySyncOptions = {
  staleTime: 0,
  refetchInterval: 15000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
} as const;

export function isMilitaryQueryKey(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && queryKey[0].startsWith(MILITARY_QUERY_PREFIX);
}

export function invalidateMilitaryQueries() {
  return queryClient.invalidateQueries({
    predicate: (query) => isMilitaryQueryKey(query.queryKey),
  });
}

export function notifyMilitaryDataChanged() {
  if (typeof window === "undefined") {
    return;
  }

  const payload = Date.now().toString();

  window.dispatchEvent(new CustomEvent(MILITARY_SYNC_EVENT, { detail: payload }));

  try {
    window.localStorage.setItem(MILITARY_SYNC_STORAGE_KEY, payload);
  } catch {
    // Ignore storage write failures (private mode/quota).
  }

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(MILITARY_SYNC_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  }
}

export function useMilitaryDataSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleSync = () => {
      invalidateMilitaryQueries();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === MILITARY_SYNC_STORAGE_KEY && event.newValue) {
        handleSync();
      }
    };

    window.addEventListener(MILITARY_SYNC_EVENT, handleSync as EventListener);
    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(MILITARY_SYNC_CHANNEL);
      channel.onmessage = () => handleSync();
    }

    return () => {
      window.removeEventListener(MILITARY_SYNC_EVENT, handleSync as EventListener);
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [enabled]);
}
