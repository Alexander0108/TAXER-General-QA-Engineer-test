import { Page, Locator } from '@playwright/test';

export class CertificatePage {
  readonly page: Page;
  readonly uploadInput: Locator;
  readonly loadButton: Locator;
  readonly certificateListItems: Locator;
  readonly detailsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.uploadInput = page.locator('input[type="file"]');
    this.loadButton = page.locator('button', { hasText: 'Завантажити' });
    // Локатори для списку та таблиці (згідно з структурою додатка)
    this.certificateListItems = page.locator('.list-group-item'); 
    this.detailsTable = page.locator('.card-body table');
  }

  async navigate() {
    await this.page.goto('https://js-qvfsmdwp.stackblitz.io/');
    
    // ПРИМУСОВО чекаємо кнопку Run, якщо вона є
    const runButton = this.page.locator('button', { hasText: 'Run this project' });
    try {
      // Чекаємо саме появу кнопки 5 секунд. Якщо не з'явилась - йдемо далі (може вже завантажено)
      await runButton.waitFor({ state: 'visible', timeout: 5000 });
      await runButton.click();
      console.log('✅ Кнопку Run натиснуто');
    } catch (e) {
      console.log('ℹ️ Кнопка Run не зʼявилася, працюємо далі');
    }

    // Чекаємо появу нашого додатка
    await this.page.waitForSelector('text=Завантажити', { timeout: 15000 });
  }

  async uploadCertificate(filePath: string) {
  // 1. Активуємо панель (як ми вже робили)
  await this.loadButton.click();
  await this.page.waitForSelector('text=Перетягніть', { timeout: 5000 });

  // 2. ЧИТАЄМО ФАЙЛ: Playwright має прочитати файл у буфер, щоб "перетягнути" його дані
  const fs = await import('node:fs');
  const buffer = fs.readFileSync(filePath);
  const fileName = filePath.split('/').pop() || 'test_cert.cer';

  // 3. ІМІТАЦІЯ DRAG & DROP через DataTransfer (JavaScript ін'єкція)
  // Ми створюємо віртуальну подію "drop", яку Angular сприйме як реальне перетягування
  await this.page.evaluate(async ({ bufferData, fileName }) => {
    const dt = new DataTransfer();
    const file = new File([new Uint8Array(bufferData)], fileName, { type: 'application/x-x509-ca-cert' });
    dt.items.add(file);

    // Шукаємо зону завантаження (напис або його батьківський елемент)
    const dropZone = document.querySelector('.drop-panel') || 
                     document.querySelector('.drag-drop-zone') || 
                     document.evaluate("//*[contains(text(), 'Перетягніть')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.parentElement;

    if (dropZone) {
      dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
      dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    }
  }, { bufferData: Array.from(buffer), fileName });

  // 4. Чекаємо, поки сертифікат з'явиться у списку (підтвердження успіху)
  await this.certificateListItems.first().waitFor({ state: 'visible', timeout: 10000 });
}
}