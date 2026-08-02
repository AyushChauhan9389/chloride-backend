import { Elysia } from 'elysia';

// Served as plain text so `curl … | sh` and `irm … | iex` work directly.
// Read once at boot: they only change when the backend redeploys.
const shell = await Bun.file(`${import.meta.dir}/install.sh`).text();
const powershell = await Bun.file(`${import.meta.dir}/install.ps1`).text();

const script = (body: string) =>
  new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });

// NOTE: must be registered before `urlsModule` in src/index.ts — that module
// owns the root-level `/:shortCode` catch-all and would otherwise treat
// "install" as a short code.
export const installModule = new Elysia({ tags: ['Install'] })
  .get('/install', () => script(shell), { detail: { summary: 'curl -fsSL <host>/install | sh' } })
  .get('/install.sh', () => script(shell), { detail: { summary: 'Alias of /install' } })
  .get('/install.ps1', () => script(powershell), {
    detail: { summary: 'irm <host>/install.ps1 | iex' },
  });
