import { Alert } from 'react-native';

// A published build hides JavaScript errors, which shows up as a blank white screen. This shows any crash as a message
// instead, so it can be read and fixed. Imported first in app/_layout.tsx so it is in place before anything else runs.
type Handler = (error: unknown, isFatal?: boolean) => void;
const g = globalThis as unknown as { ErrorUtils?: { setGlobalHandler: (h: Handler) => void; getGlobalHandler: () => Handler } };

let shown = 0;
function report(error: unknown, isFatal?: boolean) {
  if (shown >= 2) return;
  shown += 1;
  const e = error as { message?: string; stack?: string } | undefined;
  const text = `${isFatal ? 'Crash' : 'Error'}: ${e?.message ?? String(error)}\n\n${(e?.stack ?? '').split('\n').slice(0, 6).join('\n')}`;
  try { Alert.alert('Skreenit Suite hit a problem', text.slice(0, 1400)); } catch { /* nothing more to do */ }
}

if (g.ErrorUtils) {
  const previous = g.ErrorUtils.getGlobalHandler();
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    report(error, isFatal);
    previous?.(error, isFatal);
  });
}
