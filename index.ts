// ─────────────────────────────────────────────
//  Polyfills for Hermes / older JS engines
// ─────────────────────────────────────────────

if (typeof Object.fromEntries !== 'function' || Object.fromEntries.name !== 'fromEntries') {
  Object.fromEntries = function fromEntries(iterable: any) {
    const obj: any = {};
    if (!iterable) return obj;

    // Direct loop for arrays to bypass Symbol.iterator completely
    if (Array.isArray(iterable)) {
      for (let i = 0; i < iterable.length; i++) {
        const item = iterable[i];
        if (item && (Array.isArray(item) || typeof item === 'object')) {
          obj[item[0]] = item[1];
        }
      }
      return obj;
    }

    // Fallback for general iterables
    try {
      const arr = Array.from(iterable);
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i] as any;
        if (item) {
          obj[item[0]] = item[1];
        }
      }
    } catch (e) {
      try {
        for (const key in iterable) {
          if (Object.prototype.hasOwnProperty.call(iterable, key)) {
            const item = iterable[key];
            if (item) {
              obj[item[0]] = item[1];
            }
          }
        }
      } catch {}
    }
    return obj;
  };
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

