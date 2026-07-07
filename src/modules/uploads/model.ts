import { t } from 'elysia';

const expiresInField = t.Optional(t.Union([t.Number({ minimum: 1 }), t.String({ minLength: 1 })]));

export const presignBody = t.Object({
  name: t.String({ minLength: 1 }),
  contentType: t.Optional(t.String()),
  // Declared size in bytes, used for a pre-upload quota check.
  size: t.Optional(t.Number({ minimum: 0 })),
});

export const completeBody = t.Object({
  key: t.String({ minLength: 1 }),
  name: t.Optional(t.String()),
  // How long (seconds) the presigned view/download URLs should stay valid.
  // Defaults to the server's PRESIGN_EXPIRES_IN (7 days). Capped by
  // MAX_PRESIGN_EXPIRES_IN (365 days).
  expiresIn: expiresInField,
});

export const singleUploadBody = t.Object({
  file: t.File(),
  expiresIn: expiresInField,
});

export const multiUploadBody = t.Object({
  files: t.Files(),
  expiresIn: expiresInField,
});
