import { t } from 'elysia';

export const presignBody = t.Object({
  name: t.String({ minLength: 1 }),
  contentType: t.Optional(t.String()),
  // Declared size in bytes, used for a pre-upload quota check.
  size: t.Optional(t.Number({ minimum: 0 })),
});

export const completeBody = t.Object({
  key: t.String({ minLength: 1 }),
  name: t.Optional(t.String()),
});
