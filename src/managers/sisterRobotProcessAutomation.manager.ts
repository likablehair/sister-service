import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
import { Browser, Cookie, Page } from 'puppeteer';

export type RealEstatesTableRow = {
  [key: string]: string;
};

export type PersonType = 'individual' | 'company';

export type RealEstate = {
  cadastre: string;
  ownership: string;
  location: string;
  sheet: string;
  parcel: string;
  sub: string;
  classification: string;
  class: string;
  size: string;
  cadastralIncome: string;
  registerNumber: string;
  additionalData: string;
};

const realEstateTableHeaderMap: Record<keyof RealEstate, string> = {
  cadastre: 'Catasto',
  ownership: 'Titolarità',
  location: 'Ubicazione',
  sheet: 'Foglio',
  parcel: 'Particella',
  sub: 'Sub',
  classification: 'Classamento',
  class: 'Classe',
  size: 'Consistenza',
  cadastralIncome: 'Rendita',
  registerNumber: 'Partita',
  additionalData: 'Altri Dati',
};

const inverseRealEstateTableHeaderMap = Object.fromEntries(
  Object.entries(realEstateTableHeaderMap).map(([key, value]) => [value, key]),
) as Record<string, keyof RealEstate>;

export default class SisterRobotProcessAutomationManager {
  constructor() {
    puppeteer.use(StealthPlugin());
  }

  async getRealEstateData(params: {
    ivaOrFiscalCode: string;
    province: string;
    personType: PersonType;
    security: {
      username: string;
      password: string;
    };
    browser?: Browser;
  }) {
    try {
      const {
        ivaOrFiscalCode,
        province,
        personType,
        browser: providedBrowser,
        security: { username, password },
      } = params;

      let browser: Browser;
      if (!providedBrowser) {
        browser = await puppeteer.launch({
          headless: 'shell',
          args: ['--lang=it-IT'],
          env: {
            LANGUAGE: 'it_IT',
            DISPLAY: process.env.DISPLAY,
          },
        });
      } else {
        browser = providedBrowser;
      }

      console.info(
        `[${new Date().toISOString()}] SISTER RPA for vat ${ivaOrFiscalCode} in province ${province} starting...`,
      );
      const page = await browser.newPage();

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'it-IT,it;q=0.9',
      });

      try {
        const cookies = await this.loginSister({
          page,
          username,
          password,
        });

        await browser.setCookie(...cookies);

        // Accettazione dati personali, necessario per procedere
        const confirmPersonalDataXPath =
          'xpath///*[@id="colonna1"]/div[2]/form/input[1]';
        await page.waitForSelector(confirmPersonalDataXPath);
        await this._retry({
          promiseFactory: async () => {
            const [response] = await Promise.all([
              page.waitForNavigation(),
              page.click(confirmPersonalDataXPath),
            ]);
            return response;
          },
          retryCount: 3,
          retryMs: 500,
        });

        // Selezione provincia
        await this.accessToVisuraPage({
          page,
          province,
        });

        //Selezione codice fiscale o partita iva
        const searchResult = await this.searchPersonOrCompany({
          page,
          ivaOrFiscalCode,
          personType,
        });

        if (searchResult.success === false) {
          console.info(
            `[${new Date().toISOString()}] SISTER RPA for vat ${ivaOrFiscalCode} in province ${province} completed successfully. No person found with the provided fiscal code or vat number.`,
          );

          await this.logoutSister({
            page,
          });

          if (!providedBrowser) {
            await browser.close();
          }

          return [];
        }

        // Estrazione dati immobiliari
        const realEstateData = await this.extractRealEstateDataFromTable({
          page,
        });

        console.info(
          `[${new Date().toISOString()}] SISTER RPA for vat ${ivaOrFiscalCode} in province ${province} completed successfully.`,
        );

        await this.logoutSister({
          page,
        });

        //await new Promise(() => {});

        if (!providedBrowser) {
          await browser.close();
        }

        return realEstateData;
      } catch (error) {
        await this.logoutSister({
          page,
        });

        if (!providedBrowser) {
          await browser.close();
        }

        throw error;
      }
    } catch (error: unknown) {
      let localError: Error;

      if (error instanceof Error) {
        localError = error;
      } else if (typeof error === 'string') {
        localError = new Error(error);
      } else {
        localError = new Error('Unknown error');
      }

      localError.message = `getRealEstateData: ${localError.message}`;

      throw localError;
    }
  }

  private async loginSister(params: {
    page: Page;
    username: string;
    password: string;
  }): Promise<Cookie[]> {
    const { page, username, password } = params;
    const url =
      'https://iampe.agenziaentrate.gov.it/sam/UI/Login?realm=/agenziaentrate';

    try {
      await this._retry({
        promiseFactory: () => page.goto(url),
        retryCount: 5,
        retryMs: 500,
      });

      const sisterTabXPath = 'xpath///*[@id="main"]/div/div[2]/ul/li[5]';

      await page.waitForSelector(sisterTabXPath);
      await page.click(sisterTabXPath);

      await page.type('#username-sister', username);
      await page.type('#password-fo-sist', password);

      const accessButtonXPath = 'xpath///*[@id="tab-5"]/div/div[3]/button';

      await page.waitForSelector(accessButtonXPath);

      await this._retry({
        promiseFactory: async () => {
          const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click(accessButtonXPath),
          ]);
          return response;
        },
        retryCount: 3,
        retryMs: 500,
      });

      const cookies = await page.browser().cookies();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      return cookies;
    } catch (error: unknown) {
      let localError: Error;

      if (error instanceof Error) {
        localError = error;
      } else if (typeof error === 'string') {
        localError = new Error(error);
      } else {
        localError = new Error('Unknown error');
      }

      localError.message = `login: ${localError.message}`;

      throw localError;
    }
  }

  private async logoutSister(params: { page: Page }): Promise<void> {
    const { page } = params;

    try {
      const logoutButtonXPath = 'xpath///*[@id="user-collapse"]/div/a';

      await page.waitForSelector(logoutButtonXPath);

      await this._retry({
        promiseFactory: async () => {
          const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click(logoutButtonXPath),
          ]);
          return response;
        },
        retryCount: 3,
        retryMs: 500,
      });
    } catch (error: unknown) {
      let localError: Error;

      if (error instanceof Error) {
        localError = error;
      } else if (typeof error === 'string') {
        localError = new Error(error);
      } else {
        localError = new Error('Unknown error');
      }

      localError.message = `logout: ${localError.message}`;

      throw localError;
    }
  }

  private async accessToVisuraPage(params: {
    page: Page;
    province: string;
  }): Promise<void> {
    const { page, province } = params;

    try {
      const provinceSelectionURL =
        'https://sister3.agenziaentrate.gov.it/Visure/SceltaServizio.do?tipo=/T/TM/VCVC_';

      await this._retry({
        promiseFactory: () => page.goto(provinceSelectionURL),
        retryCount: 5,
        retryMs: 500,
      });

      await page.evaluate((province) => {
        const select = document.querySelector(
          'select[name="listacom"]',
        ) as HTMLSelectElement | null;

        if (!select) {
          throw new Error('Province select element not found');
        }

        const option = Array.from(select.options).find((opt) =>
          opt.value.endsWith(`-${province.toUpperCase()}`),
        );
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, province);

      const applyButtonXPath = 'xpath///*[@id="colonna1"]/div[2]/form/input';

      await this._retry({
        promiseFactory: async () => {
          const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click(applyButtonXPath),
          ]);
          return response;
        },
        retryCount: 5,
        retryMs: 500,
      });
    } catch (error: unknown) {
      let localError: Error;

      if (error instanceof Error) {
        localError = error;
      } else if (typeof error === 'string') {
        localError = new Error(error);
      } else {
        localError = new Error('Unknown error');
      }

      localError.message = `accessToVisuraPage: ${localError.message}`;

      throw localError;
    }
  }

  private async searchPersonOrCompany(params: {
    page: Page;
    personType: PersonType;
    ivaOrFiscalCode: string;
  }): Promise<{
    success: boolean;
  }> {
    const { page, ivaOrFiscalCode, personType } = params;

    try {
      let searchButtonXPath: string;
      let selectFirstResultXPath: string;
      if (personType === 'company') {
        const companyTabXPath = 'xpath///*[@id="menu-left"]/li[2]/a';
        await page.waitForSelector(companyTabXPath);
        await page.click(companyTabXPath);

        const radioButtonXPath = `xpath///*[@id="colonna1"]/div[2]/form/fieldset[1]/table/tbody/tr/td/table[5]/tbody/tr/td[1]/input`;
        await page.waitForSelector(radioButtonXPath);
        await page.click(radioButtonXPath);

        searchButtonXPath = 'xpath///*[@id="colonna1"]/div[2]/form/input[5]';
        selectFirstResultXPath =
          'xpath///*[@id="colonna1"]/div[2]/form/fieldset/table/tbody[2]/tr/td[1]/input';
      } else {
        const radioButtonXPath = `xpath///*[@id="colonna1"]/div[2]/form/fieldset[1]/table[3]/tbody/tr[9]/td[1]/input`;
        await page.waitForSelector(radioButtonXPath);
        await page.click(radioButtonXPath);

        searchButtonXPath = 'xpath///*[@id="colonna1"]/div[2]/form/p/input[4]';
        selectFirstResultXPath =
          'xpath///*[@id="colonna1"]/div[2]/form/fieldset/table/tbody/tr[2]/td[1]/input';
      }

      const fiscalCodeInputXPath = 'xpath///*[@id="cf"]';
      await page.waitForSelector(fiscalCodeInputXPath);
      await page.type(fiscalCodeInputXPath, ivaOrFiscalCode);

      await this._retry({
        promiseFactory: async () => {
          const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click(searchButtonXPath),
          ]);
          return response;
        },
        retryCount: 5,
        retryMs: 500,
      });

      //*[@id="colonna1"]/div[2]/fieldset/div/strong[5]
      const numberOfPersonFound = await page.evaluate(() => {
        const div = document.querySelector('div.riepilogo');

        if (!div) {
          throw new Error('Summary div not found');
        }

        const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
        
        let node: Node | null = walker.nextNode();
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            if (node.textContent.includes('Omonimi individuati')) {
              let next = node.nextSibling;
              while (next) {
                if (next.nodeType === Node.ELEMENT_NODE && next.nodeName === 'STRONG') {
                  return next.textContent ? next.textContent.trim() : '';
                }
                next = next.nextSibling;
              }
            }
          }
        }
        return null;
      });

      if (!numberOfPersonFound) {
        throw new Error('Number of person found not found in the page');
      }

      if (numberOfPersonFound == '' || numberOfPersonFound === '0') {
        return {
          success: false
        }
      }

      await page.waitForSelector(selectFirstResultXPath);
      await page.click(selectFirstResultXPath);

      const propertyButtonXPath =
        'xpath///*[@id="colonna1"]/div[2]/form/table/tbody/tr/td[1]/input[1]';
      await this._retry({
        promiseFactory: async () => {
          const [response] = await Promise.all([
            page.waitForNavigation(),
            page.click(propertyButtonXPath),
          ]);
          return response;
        },
        retryCount: 5,
        retryMs: 500,
      });

      return {
        success: true
      }
    } catch (error: unknown) {
      let localError: Error;

      if (error instanceof Error) {
        localError = error;
      } else if (typeof error === 'string') {
        localError = new Error(error);
      } else {
        localError = new Error('Unknown error');
      }

      localError.message = `searchPerson: ${localError.message}`;

      throw localError;
    }
  }

  private async extractRealEstateDataFromTable(params: {
    page: Page;
  }): Promise<RealEstate[]> {
    const { page } = params;

    let realEstateTableData: RealEstate[] = [];
    const tableData = await page.evaluate((inverseMap) => {
      const rows = document.querySelectorAll(
        '#colonna1 > div.pagina > form > fieldset > table tbody tr',
      );
      const tbody = document.querySelector<HTMLTableSectionElement>(
        '#colonna1 > div.pagina > form > fieldset > table tbody',
      );
      const headerCells = tbody?.closest('table')?.querySelectorAll('th');

      const headersData: (string | undefined)[] = [];
      headerCells?.forEach((header) => {
        const headerText = header.innerText.trim();
        if (Object.keys(inverseMap).includes(headerText)) {
          headersData.push(headerText);
        } else {
          headersData.push(undefined);
        }
      });

      const data: RealEstate[] = [];

      rows.forEach((row, index) => {
        if (index === 0) {
          return; // Skip header row
        }

        const cells = row.querySelectorAll('td');
        const rowData: RealEstate = {
          cadastre: '',
          ownership: '',
          location: '',
          sheet: '',
          parcel: '',
          sub: '',
          classification: '',
          class: '',
          size: '',
          cadastralIncome: '',
          registerNumber: '',
          additionalData: '',
        };

        cells.forEach((cell, index) => {
          const headerName = headersData[index];
          if (!headerName || !inverseMap[headerName]) {
            return;
          }
          rowData[inverseMap[headerName]] = cell.innerText.trim();
        });

        data.push(rowData);
      });

      return data;
    }, inverseRealEstateTableHeaderMap);

    realEstateTableData = tableData;
    return realEstateTableData;
  }

  private async _retry<T>({
    promiseFactory,
    retryCount = 3,
    retryMs = 200,
  }: {
    promiseFactory: () => Promise<T>;
    retryCount?: number;
    retryMs?: number;
  }): Promise<T> {
    try {
      return await promiseFactory();
    } catch (error) {
      if (retryCount <= 0) {
        throw error;
      }

      console.log('retrying', retryCount);

      await new Promise((resolve) => setTimeout(resolve, retryMs));

      return await this._retry({
        promiseFactory: promiseFactory,
        retryCount: retryCount - 1,
        retryMs: retryMs,
      });
    }
  }
}
