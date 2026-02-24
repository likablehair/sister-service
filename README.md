<div align="center">
  <h1><b>Sister-Service</b></h1>

  <p>A package that provides a set of functions to interact with the Italian SISTER  (Sistema Interscambio Territorio)</p>
</div>

## Getting Started

This package is available in the npm registry.

```bash
npm install adm-service
```

Next, configure the .env file (by following the example) and set the following variables for testing the library:

<ul>
  <li><strong>VITE_TEST_SISTER_USERNAME</strong>: the username of the SISTER portal </li>
  <li><strong>VITE_TEST_SISTER_PASSWORD</strong>: the password of the SISTER portal </li>
  <li><strong>VITE_TEST_PROVINCE_INDIVIDUAL_PERSON</strong>: the province where you wish to search for properties owned by the individual </li>
  <li><strong>VITE_TEST_FISCAL_CODE_INDIVIDUAL_PERSON</strong>: the fiscal code of the individual </li>
  <li><strong>VITE_TEST_PROVINCE_COMPANY_PERSON</strong>: the province where you wish to search for properties owned by the company </li>
  <li><strong>VITE_TEST_FISCAL_CODE_COMPANY_PERSON</strong>: the VAT number of the company </li>
</ul>

## Requirements

<ul>
  <li>
    <strong>Node.js >= 22.5.4</strong>: Ensure that you have Node.js version 22.x or higher installed on your system. 
    You can check your version by running:
    <pre><code>node -v</code></pre>
  </li>
  <li>
    <strong>Access to SISTER portal</strong>: You must have valid credentials (username and password) to access the SISTER portal.
  </li>
</ul>

## Usage

Run the following command to test the package

```bash
npm run test
```
