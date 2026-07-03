import { t } from 'elysia';

export const credentialsBody = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 1 }),
});

export type Credentials = typeof credentialsBody.static;
