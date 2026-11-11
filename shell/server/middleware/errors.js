import { StorageError } from '@blogs/core';

const STATUS = { NOT_FOUND: 404, CONFLICT: 409, INVALID: 400, FORBIDDEN: 403 };

export function apiNotFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } });
}

// Semua error API keluar dalam bentuk { error: { code, message, details? } }.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof StorageError) {
    return res
      .status(STATUS[error.code] ?? 500)
      .json({ error: { code: error.code, message: error.message, details: error.details } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID', message: 'Body bukan JSON yang valid' } });
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Terjadi kesalahan di server' } });
}
