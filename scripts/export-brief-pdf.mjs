#!/usr/bin/env node
/**
 * Export docs/BRIEF_SYSTEM_DESIGN.html → docs/BRIEF_SYSTEM_DESIGN.pdf
 * Uses Playwright (downloaded on first npx run). Fallback: open HTML and Print → Save as PDF.
 */
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'docs', 'BRIEF_SYSTEM_DESIGN.html');
const pdfPath = join(root, 'docs', 'BRIEF_SYSTEM_DESIGN.pdf');

if (!existsSync(htmlPath)) {
  console.error('Missing:', htmlPath);
  process.exit(1);
}

const fileUrl = `file://${htmlPath}`;

async function exportWithPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log('Wrote', pdfPath);
}

async function main() {
  try {
    await exportWithPlaywright();
  } catch (err) {
    console.warn('Automatic PDF export failed:', err.message || err);
    console.log('\nManual export:');
    console.log('  1. Open', htmlPath);
    console.log('  2. Ctrl+P (or Cmd+P) → Save as PDF');
    console.log('  3. Margins: Default/Minimum · Scale: 100%\n');
    console.log('Or install Playwright browsers and retry:');
    console.log('  npx playwright install chromium');
    console.log('  npm run export:brief-pdf');
    process.exit(1);
  }
}

main();
