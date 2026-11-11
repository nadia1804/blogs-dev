// Shell berjalan tanpa login, jadi hanya boleh diakses dari komputer ini.
// Dua pengaman terhadap situs lain yang mencoba memanggil API lewat browser:
//   1. Host harus localhost (menangkal DNS rebinding).
//   2. Permintaan yang mengubah data harus berasal dari origin shell sendiri.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const hostnameOf = (host = '') => host.replace(/:\d+$/, '');

export function localOnly() {
  return (req, res, next) => {
    const host = req.headers.host ?? '';
    if (!LOCAL_HOSTS.has(hostnameOf(host))) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Shell hanya bisa diakses dari localhost' } });
    }
    const origin = req.headers.origin;
    if (!SAFE_METHODS.has(req.method) && origin) {
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {}
      if (originHost !== host) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Origin tidak diizinkan' } });
      }
    }
    next();
  };
}
