import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_URL = 'http://localhost:9000';
const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');

mkdirSync(ARTIFACTS_DIR, { recursive: true });

test('registro de usuario sin errores de API', async ({ page }) => {
  const email = `playwright+${Date.now()}@example.com`;
  const password = 'Password123!';

  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  const toggleSignup = page.getByRole('button', { name: /no tienes cuenta/i });
  if (await toggleSignup.isVisible()) {
    await toggleSignup.click();
  }

  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);

  const [signupResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/auth/v1/signup')),
    page.getByRole('button', { name: /registrarse/i }).click(),
  ]);

  const status = signupResponse.status();
  const body = await signupResponse.text();
  console.log('Signup URL:', signupResponse.url());
  console.log('Signup request headers:', signupResponse.request().headers());
  const screenshotPath = join(ARTIFACTS_DIR, `playwright-register-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  test.info().attach('ui-state', { path: screenshotPath, contentType: 'image/png' });
  expect(status, `Respuesta de signup: ${status}\n${body}`).toBe(200);
  expect(body).toContain('"user"');

  const invalidApiKey = page.getByText('Invalid API key', { exact: false });
  await expect(invalidApiKey).toHaveCount(0);
});
