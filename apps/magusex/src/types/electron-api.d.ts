export {};

declare global {
  interface Window {
    electronAPI?: {
      getServerInfo: () => Promise<{ url: string }>;
    };
  }
}
