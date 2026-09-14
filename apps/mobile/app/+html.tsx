import { ScrollViewStyleReset } from 'expo-router/html'

// Custom HTML shell for Expo Router web (expo-router ~3.4.0 / SDK 50).
// Only rendered on web — safe for native (iOS/Android ignore this file).
// Fixes uncomfortable auto-zoom on iPhone PWA (standalone):
//  - maximum-scale=1 + user-scalable=no disables double-tap / pinch zoom
//    that Safari iOS applies in standalone even with width=device-width.
//  - viewport-fit=cover keeps layout correct with notch / home indicator.
//  - Global CSS (web-only): touch-action manipulation kills the 300ms
//    double-tap-zoom delay, 16px floor on inputs prevents iOS focus zoom,
//    -webkit-text-size-adjust avoids Safari inflating small text.
export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { touch-action: manipulation; }
              html { -webkit-text-size-adjust: 100%; }
              input, textarea, select { font-size: 16px !important; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
