import { EventSource } from "eventsource";

type Handler = (event: MessageEvent) => void;

type Entry = {
  es: EventSource;
  handlers: Map<string, Set<Handler>>;
};

const sources = new Map<string, Entry>();

export function subscribeToSse(url: string, eventName: string, handler: Handler) {
  let entry = sources.get(url);
  if (!entry) {
    const es = new EventSource(url);
    entry = { es, handlers: new Map() };
    sources.set(url, entry);
  }

  let set = entry.handlers.get(eventName);
  if (!set) {
    set = new Set();
    entry.handlers.set(eventName, set);
  }

  // Keep reference to the handler so we can remove it later
  set.add(handler);
  entry.es.addEventListener(eventName, handler);

  // Return unsubscribe
  return () => {
    const current = sources.get(url);
    if (!current) return;

    const handlersForEvent = current.handlers.get(eventName);
    if (!handlersForEvent) return;

    handlersForEvent.delete(handler);
    try {
      current.es.removeEventListener(eventName, handler);
    } catch {
      // ignore removal errors
    }

    if (handlersForEvent.size === 0) {
      current.handlers.delete(eventName);
    }

    if (current.handlers.size === 0) {
      try {
        current.es.close();
      } catch {
        // swallow
      }
      sources.delete(url);
    }
  };
}
