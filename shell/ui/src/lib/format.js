const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '–');
