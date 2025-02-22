const { bootstrap } = require('./bootstrap');
const walletId = '#Fewcha_Wallet';

describe('test fewcha wallet extension', () => {
  let extPage, appPage, browser;

  beforeAll(async () => {
    const context = await bootstrap({
      appUrl: 'http://localhost:3000' /*, slowMo: 50, devtools: true*/
    });

    extPage = context.extPage;
    appPage = context.appPage;
    browser = context.browser;
  });

  describe('fewcha wallet extension', () => {
    it('should create a new wallet successfully', async () => {
      await extPage.bringToFront();

      // Wait until the page element loaded
      await extPage.waitForSelector('a[href="/welcome/create"]');

      // Create new wallet
      await extPage.click('a[href="/welcome/create"]');

      // Wait until password field loaded
      await extPage.waitForSelector('input[name="password"]');
      await extPage.type('input[name="password"]', '12345678');
      await extPage.type('input[name="confirmPassword"]', '12345678');
      await extPage.$eval('input[name="confirmTermsOfUse"]', (check) =>
        check.parentElement.click()
      );
      await extPage.click('button[type="submit"]');

      // Wait until mnemonic loaded
      await extPage.waitForSelector('input[name="confirmMnemonic"]');
      await extPage.$eval('input[name="confirmMnemonic"]', (check) => check.parentElement.click());
      await extPage.click('button[type="submit"]');

      // Wait for Finish button
      await extPage.waitForSelector('button[type="submit"]');
      await extPage.click('button[type="submit"]');

      await extPage.waitForSelector("header a[href='/']", { visible: true });

      // click side menu
      await extPage.evaluate(() => document.querySelector('header a[href$="/"]').click());
      await extPage.evaluate(() =>
        document.querySelector('.sidebar button[type="button"]').click()
      );

      // wait for faucet
      await extPage.waitForFunction(
        "document.querySelector('.balance').innerText.includes('20000')"
      );
      const text = await extPage.$eval('.balance', (e) => e.innerText);
      expect(text).toEqual('20000');
    });

    it('should connect to the extension', async () => {
      await appPage.bringToFront();
      const popupPagePromise = new Promise((x) =>
        browser.once('targetcreated', (target) => x(target.page()))
      );

      const connectBtn = await appPage.$(walletId);
      await connectBtn.click();

      const popupPage = await popupPagePromise;
      await popupPage.bringToFront();

      // Wait until connection modal loaded
      await popupPage.waitForSelector('button[type="submit"]');
      await popupPage.click('button[type="submit"]');

      await popupPage.waitForSelector('.connect-success--screen');
      await popupPage.click('button[type="button"]');

      await appPage.waitForSelector('#address');
      const addressField = await appPage.$('#address');
      const publicKeyField = await appPage.$('#publicKey');
      const authKeyField = await appPage.$('#authKey');

      const address = await addressField.evaluate((e) => e.innerText);
      const publicKey = await publicKeyField.evaluate((e) => e.innerText);
      const authKey = await authKeyField.evaluate((e) => e.innerText);
      expect(address).not.toBe('');
      expect(publicKey).not.toBe('');
      expect(authKey).toBe('');
    });

    it('should transfer token successfully', async () => {
      await appPage.bringToFront();
      const popupPagePromise = new Promise((x) =>
        browser.once('targetcreated', (target) => x(target.page()))
      );

      const transferBtn = await appPage.$('#transferBtn');
      await transferBtn.click();

      const popupPage = await popupPagePromise;
      await popupPage.bringToFront();

      // Wait until confirmation modal loaded
      await popupPage.waitForSelector('button[type="submit"]');
      await popupPage.click('button[type="submit"]');

      await appPage.waitForSelector('.transaction');
      const txLength = await appPage.$$eval('.transaction', (ele) => ele.length);
      expect(txLength).toEqual(1);
    });

    it('should disconnect the wallet gracefully', async () => {
      await appPage.bringToFront();

      const disconnectBtn = await appPage.$('#disconnectBtn');
      await disconnectBtn.click();

      await appPage.waitForSelector('.connect-btn');
      const connectionBtnLength = await appPage.$$eval('.connect-btn', (ele) => ele.length);
      expect(connectionBtnLength).toEqual(4);
    });

    it('should display user reject connection', async () => {
      await appPage.bringToFront();
      const popupPagePromise = new Promise((x) =>
        browser.once('targetcreated', (target) => x(target.page()))
      );

      const connectBtn = await appPage.$(walletId);
      await connectBtn.click();

      const popupPage = await popupPagePromise;
      await popupPage.bringToFront();

      // Wait until connection modal loaded
      await popupPage.waitForSelector('button[type="button"]');
      await popupPage.click('button[type="button"]');

      await appPage.waitForSelector('.ant-message-custom-content.ant-message-error');
      const errMsg = await appPage.$$eval(
        '.ant-message-custom-content.ant-message-error span',
        (elements) => elements[elements.length - 1].innerText
      );
      expect(errMsg).toEqual('User has rejected the connection');
    });

    it('should connect to the extension again successfully after disconnect', async () => {
      await appPage.bringToFront();
      const popupPagePromise = new Promise((x) =>
        browser.once('targetcreated', (target) => x(target.page()))
      );

      const connectBtn = await appPage.$(walletId);
      await connectBtn.click();

      const popupPage = await popupPagePromise;
      await popupPage.bringToFront();

      // Wait until connection modal loaded
      await popupPage.waitForSelector('button[type="submit"]');
      await popupPage.click('button[type="submit"]');

      await popupPage.waitForSelector('.connect-success--screen');
      await popupPage.click('button[type="button"]');

      await appPage.waitForSelector('#address');
      const addressField = await appPage.$('#address');
      const publicKeyField = await appPage.$('#publicKey');
      const authKeyField = await appPage.$('#authKey');

      const address = await addressField.evaluate((e) => e.innerText);
      const publicKey = await publicKeyField.evaluate((e) => e.innerText);
      const authKey = await authKeyField.evaluate((e) => e.innerText);
      expect(address).not.toBe('');
      expect(publicKey).not.toBe('');
      expect(authKey).not.toBe(null);
    });

    it('should display user reject transaction', async () => {
      await appPage.bringToFront();
      const popupPagePromise = new Promise((x) =>
        browser.once('targetcreated', (target) => x(target.page()))
      );

      const transferBtn = await appPage.$('#transferBtn');
      await transferBtn.click();

      const popupPage = await popupPagePromise;
      await popupPage.bringToFront();

      // Wait until confirmation modal loaded
      await popupPage.waitForSelector('button[type="button"]');
      await popupPage.evaluate(() => document.querySelector('button[type="button"]').click());

      await appPage.waitForSelector('.ant-message-custom-content.ant-message-error');
      const errMsg = await appPage.$$eval(
        '.ant-message-custom-content.ant-message-error span',
        (elements) => elements[elements.length - 1].innerText
      );
      expect(errMsg).toEqual('User has rejected the transaction');
    });
  });

  afterAll(async () => {
    await browser.close();
  });
});
