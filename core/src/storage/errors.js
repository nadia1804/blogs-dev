import { z } from 'zod';

export class StorageError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'StorageError';
    this.code = code; // 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | 'FORBIDDEN'
    this.details = details;
  }
}

export const notFound = (what) => new StorageError('NOT_FOUND', `${what} tidak ditemukan`);
export const conflict = (message) => new StorageError('CONFLICT', message);
export const forbidden = (message) => new StorageError('FORBIDDEN', message);

// Validasi dengan skema zod; gagal = StorageError INVALID berisi daftar masalah.
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new StorageError('INVALID', z.prettifyError(result.error), result.error.issues);
}
