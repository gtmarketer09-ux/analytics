import { Storage } from "@google-cloud/storage";
import { parse as parseCsvRowsSync } from "csv-parse/sync";
import { unzipSync } from "fflate";
import { Between } from "typeorm";
import { initializeDatabase } from "../db/data-source";
import { PlayConsoleReport as PlayConsoleReportEntity } from "../db/entities/PlayConsoleReports";
import { DailyCurrencyRate } from "../db/entities/DailyCurrencyRate";
import { isDate } from "../lib/dates";
import type { PlayConsoleMetrics, PlayConsoleReport } from "../types/playConsole";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID || "vr-player-app",
  keyFilename: process.env.PLAY_CONSOLE_SERVICE_ACCOUNT
    || "./console_service_account.json",
});

const BUCKET_NAME = process.env.PLAY_CONSOLE_BUCKET || "";
const TARGET_PACKAGE_ID = "com.vrplayer.vrvideoplayer.videos360.vrapp.vrmovies";

type Totals = Omit<PlayConsoleMetrics, 'date'>;

function parseDate(value: string): string | null {
  const text = value.trim();
  const match = text.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})(?:\D|$)/);
  if (match) {
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    return isDate(date) ? date : null;
  }

  const usDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) {
    const date = `${usDate[3]}-${usDate[1].padStart(2, '0')}-${usDate[2].padStart(2, '0')}`;
    return isDate(date) ? date : null;
  }

  return null;
}

function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  const text = value.trim();
  const negative = text.startsWith('(') && text.endsWith(')');
  const amount = Number(text.replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? (negative ? -Math.abs(amount) : amount) : 0;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findColumn(header: string[], candidates: string[]): number {
  const normalized = header.map(normalizedHeader);
  for (const candidate of candidates) {
    const wanted = normalizedHeader(candidate);
    let index = normalized.indexOf(wanted);
    if (index < 0) index = normalized.findIndex((value) => value.includes(wanted));
    if (index >= 0) return index;
  }
  return -1;
}

async function loadUsdRates(dataSource: Awaited<ReturnType<typeof initializeDatabase>>) {
  const rows = await dataSource.getRepository<DailyCurrencyRate>('DailyCurrencyRate').find({
    order: { date: 'ASC', currency: 'ASC' },
  });
  const rates = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const currencyRates = rates.get(row.currency.toUpperCase()) ?? new Map<string, number>();
    currencyRates.set(row.date, Number(row.exchangeRate));
    rates.set(row.currency.toUpperCase(), currencyRates);
  }
  return rates;
}

async function usdPerUnit(
  dataSource: Awaited<ReturnType<typeof initializeDatabase>>,
  rates: Map<string, Map<string, number>>,
  currency: string,
  date: string,
): Promise<number> {
  const code = currency.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!code || code === 'USD') return 1;
  let currencyRates = rates.get(code);
  if (!currencyRates?.size) {
    currencyRates ??= new Map<string, number>();
    rates.set(code, currencyRates);
  }
  if (currencyRates.has(date)) return Number(currencyRates.get(date));
  let fallback = 0;
  let fallbackDate = '';
  for (const [rateDate, rate] of currencyRates) {
    if (rateDate <= date && rateDate >= fallbackDate) {
      fallbackDate = rateDate;
      fallback = Number(rate);
    }
  }
  if (!fallback && currencyRates.size > 0) {
    fallback = Array.from(currencyRates.values())[0];
  }
  if (!fallback) {
    const lowerCode = code.toLowerCase();
    const baseDate = new Date(`${date}T00:00:00Z`);
    for (let attempt = 0; attempt <= 30; attempt += 1) {
      const lookupDate = attempt === 0 ? date : new Date(baseDate.getTime() - attempt * 86400000).toISOString().slice(0, 10);
      const urls = [
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${lookupDate}/v1/currencies/usd.json`,
        `https://latest.currency-api.pages.dev/v1/currencies/usd.json`,
      ];
      for (const url of urls) {
        try {
          const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (!response.ok) continue;
          const payload = await response.json() as { date?: string; usd?: Record<string, number> };
          const usdRate = Number(payload.usd?.[lowerCode]);
          if (!Number.isFinite(usdRate) || usdRate <= 0) continue;
          fallback = 1 / usdRate;
          currencyRates.set(lookupDate, fallback);
          break;
        } catch {
          continue;
        }
      }
      if (fallback) break;
    }
  }
  return fallback;
}

function decodeCsv(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
}

function findCsvRows(bytes: Uint8Array, fileName: string): string[][] {
  let csvBytes = bytes;
  if (fileName.toLowerCase().endsWith('.zip')) {
    const csvEntry = Object.entries(unzipSync(bytes)).find(([name]) => name.toLowerCase().endsWith('.csv'));
    if (!csvEntry) throw new Error(`No CSV file was found inside ${fileName}.`);
    csvBytes = csvEntry[1];
  }

  const csv = decodeCsv(csvBytes);
  return parseCsvRowsSync(csv, { bom: true, relax_column_count: true, skip_empty_lines: true }) as string[][];
}

export async function importPlayConsoleFile(fileBytes: Uint8Array, fileName: string): Promise<string[]> {
  const rows = findCsvRows(fileBytes, fileName);
  const headerRow = rows.find((row) =>
    row.some((cell) => /package\s*id|package\s*name|product\s*id/i.test(cell.trim())) &&
    row.some((cell) => /charged\s*date|transaction\s*date|^date$/i.test(cell.trim()))
  );
  const headerIndex = headerRow ? rows.indexOf(headerRow) : -1;
  const originalHeader = headerRow?.map((cell) => cell.trim()) ?? [];
  const dateColumn = findColumn(originalHeader, ['Order Charged Date', 'Transaction Date', 'Purchase Date', 'Date']);
  const packageColumn = findColumn(originalHeader, ['Package Name', 'Package ID', 'Product ID']);
  const currencyColumn = findColumn(originalHeader, ['Currency of Sale', 'Buyer Currency', 'Currency']);
  const itemPriceColumn = findColumn(originalHeader, ['Item Price', 'Item Price Buyer Currency', 'Item Price Amount']);
  const chargedAmountColumn = findColumn(originalHeader, ['Charged Amount', 'Charged Amount Buyer Currency', 'Amount Charged']);
  const financialStatusColumn = findColumn(originalHeader, ['Financial Status', 'Status']);

  if (headerIndex < 0 || dateColumn < 0 || packageColumn < 0 || currencyColumn < 0 || itemPriceColumn < 0 || chargedAmountColumn < 0) {
    throw new Error(`Required Play Console sales columns missing. Available headers: ${originalHeader.join(', ')}`);
  }

  const totalsByDate = new Map<string, Totals>();
  const dataSource = await initializeDatabase();
  const rates = await loadUsdRates(dataSource);
  for (const [index, row] of rows.entries()) {
    if (index === headerIndex) continue;
    const foundDate = row[dateColumn] ? parseDate(row[dateColumn]) : null;
    const date = foundDate ?? row.map(parseDate).find((candidate) => candidate !== null);
    if (!date) continue;
    if ((row[packageColumn] ?? '').trim() !== TARGET_PACKAGE_ID) continue;

    const currency = (row[currencyColumn] ?? '').trim();
    const rate = await usdPerUnit(dataSource, rates, currency, date);
    if (!rate) throw new Error(`No USD exchange rate is available for ${currency || 'empty currency'} on ${date}.`);
    const totals = totalsByDate.get(date) ?? emptyTotals();

    const status = financialStatusColumn >= 0 ? (row[financialStatusColumn] ?? '').trim().toLowerCase() : '';
    const charged = parseAmount(row[chargedAmountColumn]);
    const itemPrice = parseAmount(row[itemPriceColumn]);
    const isRefund = status === 'refund' || charged < 0;

    totals.revenueWithTax += charged * rate;
    totals.revenueWithoutTax += (isRefund ? -Math.abs(itemPrice) : itemPrice) * rate;
    totals.inApps += isRefund ? -1 : 1;
    totalsByDate.set(date, totals);
  }

  // Fetch inApps from firebase_daily_reports instead of calculating from Play Console
  const uploadDates = Array.from(totalsByDate.keys()).sort();
  const fileStart = uploadDates[0] ?? '2026-01-01';
  const fileEnd = uploadDates[uploadDates.length - 1] ?? '2026-12-31';
  const firebaseRows = await dataSource.query(
    `SELECT date, inApps FROM firebase_daily_reports WHERE date BETWEEN ? AND ?`,
    [fileStart, fileEnd],
  );
  const firebaseMap = new Map<string, number>();
  for (const row of firebaseRows as Array<{ date: string | Date; inApps: number | string }>) {
    const rawDate = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10);
    firebaseMap.set(rawDate, Number(row.inApps ?? 0));
  }

  const reports = [...totalsByDate.entries()].map(([date, totals]) => ({
    date,
    revenueWithTax: Number(totals.revenueWithTax.toFixed(2)),
    revenueWithoutTax: Number(totals.revenueWithoutTax.toFixed(2)),
    inApps: firebaseMap.get(date) ?? 0,
  }));

  if (!reports.length) {
    throw new Error('No dated revenue rows were found in the uploaded Google Play file.');
  }

  await ensurePlayConsoleSchema(dataSource);
  await dataSource.getRepository<PlayConsoleReportEntity>('PlayConsoleReport').upsert(reports, ['date']);
  return reports.map((report) => report.date);
}

function monthKeys(start: string, end: string): string[] {
  const months: string[] = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

function emptyTotals(): Totals {
  return { revenueWithTax: 0, revenueWithoutTax: 0, inApps: 0 };
}

async function ensurePlayConsoleSchema(
  dataSource: Awaited<ReturnType<typeof initializeDatabase>>,
): Promise<void> {
  try {
    await dataSource.query(`
      ALTER TABLE play_console_daily_reports
        ADD COLUMN IF NOT EXISTS revenue_with_tax numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS revenue_without_tax numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS in_apps numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  } catch {
    // Ignore if already applied
  }
}

async function retryStorageOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      if (attempt === attempts) break;

      const delayMs = 500 * (2 ** (attempt - 1));
      console.warn(
        `Play Console ${operationName} failed (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms`,
        error instanceof Error ? error.message : error,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Play Console ${operationName} failed.`);
}

export async function fetchAndSavePlayConsoleReports(start: string, end: string): Promise<string[]> {
  if (!isDate(start) || !isDate(end) || start > end) {
    throw new Error('A valid start and end date are required.');
  }

  const rows: string[][] = [];
  const foundFiles: string[] = [];

  for (const month of monthKeys(start, end)) {
    const bucket = storage.bucket(BUCKET_NAME);
    const candidateFiles: string[] = [];

    for (const prefix of ['sales/', 'earnings/']) {
      const [files] = await retryStorageOperation(
        `list reports for ${month}`,
        () => bucket.getFiles({ prefix, maxResults: 100 }),
      );
      const matches = files
        .map((file) => file.name)
        .filter((name) => {
          if (prefix === 'sales/') {
            return new RegExp(`^sales/salesreport_${month}\\.(zip|csv)$`, 'i').test(name);
          }
          return new RegExp(`^earnings/earnings_${month}(?:_[^/]*)?\\.(zip|csv)$`, 'i').test(name);
        })
        .sort((a, b) => b.localeCompare(a));
      candidateFiles.push(...matches);
    }

    let monthFileFound = false;
    for (const objectName of candidateFiles) {
      const file = bucket.file(objectName);
      const [exists] = await retryStorageOperation(
        `bucket lookup for ${objectName}`,
        () => file.exists(),
      );
      if (!exists) continue;

      monthFileFound = true;
      foundFiles.push(objectName);
      const chunks: Uint8Array[] = [];
      await retryStorageOperation(
        `read for ${objectName}`,
        async () => {
          for await (const chunk of file.createReadStream()) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk));
          }
        },
      );
      const contentLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const content = new Uint8Array(contentLength);
      let offset = 0;
      for (const chunk of chunks) {
        content.set(chunk, offset);
        offset += chunk.length;
      }
      let csvBytes: Uint8Array = content;
      if (objectName.toLowerCase().endsWith('.zip')) {
        const csvEntry = Object.entries(unzipSync(content))
          .find(([name]) => name.toLowerCase().endsWith('.csv'));
        if (!csvEntry) throw new Error(`No CSV file was found inside ${objectName}.`);
        csvBytes = csvEntry[1];
      }
      const csv = decodeCsv(csvBytes);
      rows.push(...parseCsvRowsSync(csv, { bom: true, relax_column_count: true, skip_empty_lines: true }) as string[][]);
      break;
    }

    if (!monthFileFound) {
      throw new Error(`Play Console sales or earnings report for ${month} is unavailable in bucket ${BUCKET_NAME}.`);
    }
  }

  const headerRow = rows.find((row) =>
    row.some((cell) => /package\s*id|package\s*name|product\s*id/i.test(cell)) &&
    row.some((cell) => /charged\s*date|transaction\s*date|purchase\s*date|^date$/i.test(cell))
  );
  if (!headerRow) {
    throw new Error(`No recognizable Play Console sales header was found. Files checked: ${foundFiles.join(', ')}`);
  }
  const headerIndex = rows.indexOf(headerRow);
  const originalHeader = headerRow.map((cell) => cell.trim());
  const dateColumn = findColumn(originalHeader, ['Order Charged Date', 'Transaction Date', 'Purchase Date', 'Date']);
  const packageColumn = findColumn(originalHeader, ['Package Name', 'Package ID', 'Product ID']);
  const currencyColumn = findColumn(originalHeader, ['Currency of Sale', 'Buyer Currency', 'Currency']);
  const itemPriceColumn = findColumn(originalHeader, ['Item Price', 'Item Price Buyer Currency', 'Item Price Amount']);
  const chargedAmountColumn = findColumn(originalHeader, ['Charged Amount', 'Charged Amount Buyer Currency', 'Amount Charged']);
  const financialStatusColumn = findColumn(originalHeader, ['Financial Status', 'Status']);
  if (dateColumn < 0 || packageColumn < 0 || currencyColumn < 0 || itemPriceColumn < 0 || chargedAmountColumn < 0) {
    throw new Error(`Required Play Console sales columns missing. Available headers: ${originalHeader.join(', ')}`);
  }
  const totalsByDate = new Map<string, Totals>();
  const dataSource = await initializeDatabase();
  const rates = await loadUsdRates(dataSource);

  for (const [index, row] of rows.entries()) {
    if (index === headerIndex) continue;
    const date = parseDate(row[dateColumn] ?? '') ?? row.map(parseDate).find((candidate) => candidate !== null);
    if (!date || date < start || date > end) continue;
    if ((row[packageColumn] ?? '').trim() !== TARGET_PACKAGE_ID) continue;
    const currency = (row[currencyColumn] ?? '').trim();
    const rate = await usdPerUnit(dataSource, rates, currency, date);
    if (!rate) throw new Error(`No USD exchange rate is available for ${currency || 'empty currency'} on ${date}.`);
    const totals = totalsByDate.get(date) ?? emptyTotals();

    const status = financialStatusColumn >= 0 ? (row[financialStatusColumn] ?? '').trim().toLowerCase() : '';
    const charged = parseAmount(row[chargedAmountColumn]);
    const itemPrice = parseAmount(row[itemPriceColumn]);
    const isRefund = status === 'refund' || charged < 0;

    totals.revenueWithTax += charged * rate;
    totals.revenueWithoutTax += (isRefund ? -Math.abs(itemPrice) : itemPrice) * rate;
    totals.inApps += isRefund ? -1 : 1;
    totalsByDate.set(date, totals);
  }

  // Fetch inApps from firebase_daily_reports instead of calculating from Play Console
  const uploadDates = Array.from(totalsByDate.keys()).sort();
  const fileStart = uploadDates[0] ?? '2026-01-01';
  const fileEnd = uploadDates[uploadDates.length - 1] ?? '2026-12-31';
  const firebaseRows = await dataSource.query(
    `SELECT date, inApps FROM firebase_daily_reports WHERE date BETWEEN ? AND ?`,
    [fileStart, fileEnd],
  );
  const firebaseMap = new Map<string, number>();
  for (const row of firebaseRows as Array<{ date: string | Date; inApps: number | string }>) {
    const rawDate = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10);
    firebaseMap.set(rawDate, Number(row.inApps ?? 0));
  }

  const reports = [...totalsByDate.entries()].map(([date, totals]) => ({
    date,
    revenueWithTax: Number(totals.revenueWithTax.toFixed(2)),
    revenueWithoutTax: Number(totals.revenueWithoutTax.toFixed(2)),
    inApps: firebaseMap.get(date) ?? 0,
  }));

  if (reports.length) {
    await ensurePlayConsoleSchema(dataSource);
    await dataSource.getRepository<PlayConsoleReportEntity>('PlayConsoleReport').upsert(reports, ['date']);
  }

  return reports.map((report) => report.date);
}

export type PlayConsoleEstimatedSalesSummary = {
  processedRows: number;
  insertedRows: number;
  conflictRows: number;
  netRevenueAdded: number;
  validationPassed: boolean;
  delta: number;
  sourceFiles: string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function estimatedSalesHeader(headers: string[], candidates: string[]): string | null {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]));
  for (const candidate of candidates) {
    const header = normalizedHeaders.get(normalizeHeader(candidate));
    if (header) return header;
  }
  return null;
}

export async function fetchAndSaveEstimatedSales(
  start = '2026-10-01',
  end = '2026-11-04',
): Promise<PlayConsoleEstimatedSalesSummary> {
  const bucket = storage.bucket(BUCKET_NAME);
  const [files] = await retryStorageOperation(
    'list estimated-sales reports',
    () => bucket.getFiles({ prefix: 'estimated_sales/', maxResults: 1000 }),
  );
  const sourceFiles = files
    .map((file) => file.name)
    .filter((name) => /\/estimated_sales_report_(202610|202611)_v2\.csv$/i.test(name))
    .sort();
  const requiredMonths = ['202610', '202611'];
  const missingMonths = requiredMonths.filter(
    (month) => !sourceFiles.some((name) => name.includes(month)),
  );
  if (missingMonths.length) {
    throw new Error(
      `Missing estimated-sales CSV blobs for ${missingMonths.join(', ')} in gs://${BUCKET_NAME}/estimated_sales/`,
    );
  }

  const rows: Array<{ record: Record<string, string | undefined>; sourceFile: string }> = [];
  let sourceHeaders: string[] = [];
  for (const objectName of sourceFiles) {
    const [content] = await retryStorageOperation(
      `download estimated-sales report ${objectName}`,
      () => bucket.file(objectName).download(),
    );
    const parsedRows = parseCsvRowsSync(decodeCsv(new Uint8Array(content)), {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      columns: false,
    }) as string[][];
    if (!parsedRows.length) continue;
    sourceHeaders = parsedRows[0].map((header) => header.trim());
    for (const row of parsedRows.slice(1)) {
      const record: Record<string, string | undefined> = {};
      sourceHeaders.forEach((header, index) => {
        record[header] = row[index];
      });
      rows.push({ record, sourceFile: objectName });
    }
  }

  if (!sourceHeaders.length) {
    throw new Error('No estimated-sales CSV headers were found.');
  }
  const headers = sourceHeaders;
  const dateHeader = estimatedSalesHeader(headers, ['Transaction Date', 'Order Charged Date', 'Date']);
  const productHeader = estimatedSalesHeader(headers, ['Product Type']);
  const amountHeader = estimatedSalesHeader(headers, [
    'Amount (Merchant Currency)',
    'Merchant Amount',
    'Amount Merchant',
    'Amount',
  ]);
  const itemPriceHeader = estimatedSalesHeader(headers, [
    'Item Price (Merchant Currency)',
    'Item Price Merchant',
    'Item Price',
    'Price',
  ]);
  if (!dateHeader || !productHeader || !amountHeader || !itemPriceHeader) {
    throw new Error(
      `Required estimated-sales columns missing. Available headers: ${headers.join(', ')}`,
    );
  }

  const dataSource = await initializeDatabase();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let processedRows = 0;
  let insertedRows = 0;
  let netRevenueAdded = 0;

  try {
    await queryRunner.query(`
      CREATE TEMPORARY TABLE IF NOT EXISTS play_console_transaction_checksum (
        gross_revenue decimal(14,2),
        purchase_revenue decimal(14,2),
        subscription_revenue decimal(14,2)
      )
    `);
    await queryRunner.query('TRUNCATE TABLE play_console_transaction_checksum');

    for (const { record: row } of rows) {
      const transactionDate = parseDate(row[dateHeader] ?? '');
      if (!transactionDate || transactionDate < start || transactionDate > end) continue;

      const productType = String(row[productHeader] ?? '').trim();
      const normalizedProductType = normalizeHeader(productType);
      const grossRevenue = parseAmount(row[amountHeader]);
      const revenueWithoutTax = parseAmount(row[itemPriceHeader]);
      const purchaseRevenue = normalizedProductType === 'in app product' ? grossRevenue : 0;
      const subscriptionRevenue = normalizedProductType === 'subscription' ? grossRevenue : 0;

      processedRows += 1;
      await queryRunner.query(
        'INSERT INTO play_console_transaction_checksum (gross_revenue, purchase_revenue, subscription_revenue) VALUES (?, ?, ?)',
        [grossRevenue.toFixed(2), purchaseRevenue.toFixed(2), subscriptionRevenue.toFixed(2)],
      );
      insertedRows += 1;
      netRevenueAdded += revenueWithoutTax;
    }

    const checksum = await queryRunner.query(`
      SELECT
        COALESCE(SUM(gross_revenue), 0) AS gross,
        COALESCE(SUM(purchase_revenue), 0) AS purchase,
        COALESCE(SUM(subscription_revenue), 0) AS subscription
      FROM play_console_transaction_checksum
    `);
    const gross = Number(checksum[0].gross);
    const purchase = Number(checksum[0].purchase);
    const subscription = Number(checksum[0].subscription);
    const delta = Math.abs(gross - (purchase + subscription));
    const validationPassed = delta < 0.01;
    if (!validationPassed) {
      await queryRunner.rollbackTransaction();
      return {
        processedRows,
        insertedRows: 0,
        conflictRows: 0,
        netRevenueAdded: 0,
        validationPassed: false,
        delta,
        sourceFiles,
      };
    }
    await queryRunner.commitTransaction();
    return {
      processedRows,
      insertedRows,
      conflictRows: 0,
      netRevenueAdded: Number(netRevenueAdded.toFixed(2)),
      validationPassed: true,
      delta,
      sourceFiles,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    try {
      await queryRunner.query('DROP TEMPORARY TABLE IF EXISTS play_console_transaction_checksum');
    } catch {
      // Ignore
    }
    await queryRunner.release();
  }
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getPlayConsoleReport(start: string, end: string): Promise<PlayConsoleReport> {
  const dataSource = await initializeDatabase();
  await ensurePlayConsoleSchema(dataSource);
  const records = await dataSource.getRepository<PlayConsoleReportEntity>('PlayConsoleReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });
  const days = records.map((record) => ({
    date: record.date,
    revenueWithTax: numeric(record.revenueWithTax),
    revenueWithoutTax: numeric(record.revenueWithoutTax),
    inApps: numeric(record.inApps),
  }));
  const total = days.reduce((sum, day) => ({
    revenueWithTax: sum.revenueWithTax + day.revenueWithTax,
    revenueWithoutTax: sum.revenueWithoutTax + day.revenueWithoutTax,
    inApps: sum.inApps + day.inApps,
  }), emptyTotals());
  const lastUpdated = records.reduce<Date | null>(
    (latest, record) => (!latest || record.createdAt > latest ? record.createdAt : latest),
    null,
  );

  return { days, total, lastUpdated };
}

export async function getPlayConsoleAvailableRange(): Promise<{ start: string; end: string } | null> {
  const dataSource = await initializeDatabase();
  const repository = dataSource.getRepository<PlayConsoleReportEntity>('PlayConsoleReport');
  const oldest = await repository.find({ order: { date: 'ASC' }, take: 1 });
  const newest = await repository.find({ order: { date: 'DESC' }, take: 1 });
  if (!oldest.length || !newest.length) return null;
  return { start: oldest[0].date, end: newest[0].date };
}
