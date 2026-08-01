self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "هكوله";
  const options = {
    body: data.body || "",
    icon: "/hakolah/assets/android-chrome-192x192.png",
    badge: "/hakolah/assets/favicon-32x32.png",
    data: { url: data.url || "/hakolah/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  event.waitUntil(self.clients.openWindow(url || "/hakolah/"));
});
