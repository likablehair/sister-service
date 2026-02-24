import assert from 'assert';
import SisterRobotProcessAutomationManager from 'src/managers/sisterRobotProcessAutomation.manager';
import { test } from 'vitest';

test('Property Data for individual person', { timeout: 200000 }, async () => {
  const fiscalCode = import.meta.env.VITE_TEST_FISCAL_CODE_INDIVIDUAL_PERSON;
  const sisterUsername = import.meta.env.VITE_TEST_SISTER_USERNAME;
  const sisterPassword = import.meta.env.VITE_TEST_SISTER_PASSWORD;
  const province = import.meta.env.VITE_TEST_PROVINCE_INDIVIDUAL_PERSON;

  if (!fiscalCode || !sisterUsername || !sisterPassword || !province) {
    throw new Error('Missing environment variables for the test');
  }

  const sisterRPA = new SisterRobotProcessAutomationManager();
  const realEstateData = await sisterRPA.getRealEstateData({
    ivaOrFiscalCode: fiscalCode,
    province,
    personType: 'individual',
    security: {
      username: sisterUsername,
      password: sisterPassword,
    },
  });

  assert.ok(
    realEstateData.length > 0,
    'Expected to find at least one property',
  );
});

test('Property Data for company person', { timeout: 200000 }, async () => {
  const ivaCode = import.meta.env.VITE_TEST_FISCAL_CODE_COMPANY_PERSON;
  const sisterUsername = import.meta.env.VITE_TEST_SISTER_USERNAME;
  const sisterPassword = import.meta.env.VITE_TEST_SISTER_PASSWORD;
  const province = import.meta.env.VITE_TEST_PROVINCE_COMPANY_PERSON;
  if (!ivaCode || !sisterUsername || !sisterPassword || !province) {
    throw new Error('Missing environment variables for the test');
  }

  const sisterRPA = new SisterRobotProcessAutomationManager();
  const realEstateData = await sisterRPA.getRealEstateData({
    ivaOrFiscalCode: ivaCode,
    province,
    personType: 'company',
    security: {
      username: sisterUsername,
      password: sisterPassword,
    },
  });

  assert.ok(
    realEstateData.length > 0,
    'Expected to find at least one property',
  );
});

test('Empty result for non existing fiscal code', { timeout: 200000 }, async () => {
  const nonExistingFiscalCode = import.meta.env.VITE_TEST_FISCAL_CODE_INDIVIDUAL_PERSON_WITHOUT_RESULTS;
  const sisterUsername = import.meta.env.VITE_TEST_SISTER_USERNAME;
  const sisterPassword = import.meta.env.VITE_TEST_SISTER_PASSWORD;
  const province = import.meta.env.VITE_TEST_PROVINCE_INDIVIDUAL_PERSON;

  if (!sisterUsername || !sisterPassword || !province) {
    throw new Error('Missing environment variables for the test');
  }

  const sisterRPA = new SisterRobotProcessAutomationManager();
  const result = await sisterRPA.getRealEstateData({
    ivaOrFiscalCode: nonExistingFiscalCode,
    province,
    personType: 'individual',
    security: {
      username: sisterUsername,
      password: sisterPassword,
    },
  });

  assert.strictEqual(result.length, 0, 'Expected no properties to be found');
});
