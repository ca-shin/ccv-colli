export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Camera Con Vista - Colli</title>
        <meta name="description" content="Menu digitale Camera Con Vista - Colli" />
        <meta name="theme-color" content="#722F37" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CCV Colli" />
        <link rel="icon" type="image/webp" href="/favicon.webp" />
        <link rel="alternate icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <style
          id="web-reset"
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; }
              body { overflow: hidden; }
              #root { display: flex; height: 100%; flex: 1; }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
                  if (isLocal) {
                    navigator.serviceWorker.getRegistrations()
                      .then(function(registrations) {
                        registrations.forEach(function(registration) {
                          registration.unregister();
                        });
                      })
                      .catch(function() {});
                    if ('caches' in window) {
                      caches.keys()
                        .then(function(keys) {
                          keys.forEach(function(key) {
                            caches.delete(key);
                          });
                        })
                        .catch(function() {});
                    }
                    return;
                  }
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
