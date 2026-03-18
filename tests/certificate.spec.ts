import { test, expect } from '@playwright/test';
import { CertificatePage } from '../pages/CertificatePage.js';
import path from 'node:path';

test.describe('Тестування сховища сертифікатів TAXER', () => {
  // Створюємо змінну з типом нашого класу
  let cp: CertificatePage;

  test.beforeEach(async ({ page }) => {
    cp = new CertificatePage(page);
    await cp.navigate();
  });

  test('Успішне завантаження та відображення сертифіката у списку', async ({ page }) => {
    const certPath = path.resolve(process.cwd(), 'tests/fixtures/test_cert.cer');
    await cp.uploadCertificate(certPath);

    const firstItem = cp.certificateListItems.first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    
    const itemName = await firstItem.innerText();
    expect(itemName.length).toBeGreaterThan(0);
  });

  test('Перевірка коректності даних після вибору сертифіката (Баг №2)', async ({ page }) => {
    const certPath = path.resolve(process.cwd(), 'tests/fixtures/test_cert.cer');
    await cp.uploadCertificate(certPath);
    
    // Клікаємо по завантаженому сертифікату
    await cp.certificateListItems.first().click();

    const table = cp.detailsTable;
    // Очікуємо повне ім'я. Тест впаде, бо сайт його обрізає.
    await expect(table, 'Баг №2: ПІБ власника відображається некоректно').toContainText('Нестеренко Володимир Борисович (Тест)');
  });

  test('Перевірка орфографії в зоні завантаження (Баг №10)', async ({ page }) => {
    await cp.loadButton.click();
    // У цьому випадку застосуємо метод "Negative Testing" і навмисно перевіримо чи присутнє слово з помилкою "сертфікат"
    const dropZone = page.locator('text=Перетягніть сертфікат(и)');
    await expect(dropZone, 'Баг №10: Орфографічна помилка у слові "сертфікат"').toBeVisible();
  });

  test('Збереження даних після оновлення сторінки (Баг №1)', async ({ page }) => {
    const certPath = path.resolve(process.cwd(), 'tests/fixtures/test_cert.cer');
    await cp.uploadCertificate(certPath);
    await expect(cp.certificateListItems.first()).toBeVisible();

    await page.reload();
    // Чекаємо 5 сек, поки додаток завантажиться після F5
    await page.waitForTimeout(5000); 

    await expect(cp.certificateListItems.first(), 'Баг №1: Дані зникли після оновлення сторінки').toBeVisible({ timeout: 10000 });
  });
});