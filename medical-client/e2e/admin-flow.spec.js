import { test, expect } from '@playwright/test';

test('administrador completa login, CRUD y logout usando solo API v1', async ({ page }) => {
  const apiPaths = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/')) apiPaths.push(pathname);
  });

  await page.goto('/portal');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Correo').fill('admin@medical.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('Admin1234');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByText('admin@medical.com')).toBeVisible();
  await expect(page.getByText('Pacientes activos')).toBeVisible();

  await page.getByRole('link', { name: 'Departamentos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Departamentos' })).toBeVisible();

  const departmentName = `E2E ${Date.now()}`;
  await page.getByRole('button', { name: 'Nuevo' }).click();

  let dialog = page.getByRole('dialog', { name: 'Nuevo departamento' });
  await dialog.getByLabel('Nombre').fill(departmentName);
  await dialog.getByLabel('Descripción').fill('Creado por Playwright');
  await dialog.getByRole('button', { name: 'Crear' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Departamento creado' })).toBeVisible();
  const department = page.getByRole('article', { name: `Departamento ${departmentName}` });
  await expect(department).toBeVisible();

  await department.getByRole('button', { name: 'Editar' }).click();
  dialog = page.getByRole('dialog', { name: 'Editar departamento' });
  await dialog.getByLabel('Descripción').fill('Actualizado por Playwright');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Departamento actualizado' })).toBeVisible();
  await expect(department.getByText('Actualizado por Playwright')).toBeVisible();

  page.once('dialog', (confirmation) => confirmation.accept());
  await department.getByRole('button', { name: 'Desactivar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Departamento desactivado' })).toBeVisible();
  await expect(department).toHaveCount(0);

  expect(apiPaths.length).toBeGreaterThan(4);
  expect(apiPaths).toContain('/api/v1/auth/login');
  expect(apiPaths.every((path) => path.startsWith('/api/v1/'))).toBe(true);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
