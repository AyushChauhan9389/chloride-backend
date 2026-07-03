import { t } from 'elysia';

// storageLimit accepts a number (bytes) or a string like "1GB"
const storageLimitSchema = t.Union([t.Number(), t.String()]);

export const createPlanBody = t.Object({
  name: t.String({ minLength: 1 }),
  fileLimit: t.Union([t.Number(), t.String()]),
  storageLimit: storageLimitSchema,
});

export const updatePlanBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  fileLimit: t.Optional(t.Number()),
  storageLimit: t.Optional(storageLimitSchema),
});

export const assignPlanBody = t.Object({
  planId: t.Union([t.Number(), t.String()]),
});

export const checkStorageBody = t.Object({
  bytesToAdd: t.Optional(t.Number()),
});

export const checkFilesBody = t.Object({
  currentFileCount: t.Optional(t.Number()),
});

export const updateUserStorageBody = t.Object({
  userId: t.Union([t.Number(), t.String()]),
  bytesToAdd: t.Union([t.Number(), t.String()]),
});
