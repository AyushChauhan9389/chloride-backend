import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { installModule } from './index';

// Mirrors src/index.ts: install routes first, shortener catch-all last.
// The whole point of that ordering is that /install must NOT resolve as a
// short code, so that is what this asserts.
const app = new Elysia()
  .use(installModule)
  .get('/:shortCode', ({ params }) => `shortcode:${params.shortCode}`);

const get = (path: string) => app.handle(new Request(`http://localhost${path}`));

describe('install scripts', () => {
  it('serves the shell script as plain text', async () => {
    const res = await get('/install');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const body = await res.text();
    expect(body).toContain('#!/bin/sh');
    expect(body).toContain('cl-x86_64-unknown-linux-musl');
  });

  it('serves the powershell script', async () => {
    const res = await get('/install.ps1');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('cl-x86_64-pc-windows-msvc.exe');
  });

  it('/install.sh is an alias of /install', async () => {
    expect(await (await get('/install.sh')).text()).toBe(await (await get('/install')).text());
  });

  it('does not let the shortener catch-all swallow the install routes', async () => {
    for (const path of ['/install', '/install.sh', '/install.ps1']) {
      expect(await (await get(path)).text()).not.toContain('shortcode:');
    }
    // …while real short codes still resolve.
    expect(await (await get('/abc123')).text()).toBe('shortcode:abc123');
  });
});
