/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//],
  }),
);

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() as {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  } | undefined;
  event.waitUntil(
    self.registration.showNotification(data?.title ?? "Daily Macros", {
      body: data?.body ?? "It's time to log your meal in Daily Macros.",
      icon: "/Logo.png",
      badge: "/Logo.png",
      tag: data?.tag,
      data: { url: data?.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data as { url?: string } | undefined)?.url ?? "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(target);
    }),
  );
});
