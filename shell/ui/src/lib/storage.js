// Pembungkus localStorage/sessionStorage yang tidak pernah melempar error
// (mode privat, kuota penuh, dsb.). Nilai disimpan sebagai JSON.
function wrap(getStore) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getStore().getItem(`blogs.shell.${key}`);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getStore().setItem(`blogs.shell.${key}`, JSON.stringify(value));
      } catch {}
    },
  };
}

export const persistent = wrap(() => window.localStorage); // bertahan antar sesi
export const session = wrap(() => window.sessionStorage); // per tab
