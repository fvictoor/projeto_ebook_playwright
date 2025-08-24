// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list', { printSteps: true }],                       // Logs no console
    ['html', { outputFolder: 'logs/report', open: 'never' }],  // Relatório HTML
    ['junit', { outputFile: 'logs/results/output.xml' }],       // XML JUnit
    ['json', { outputFile: 'logs/results/test-results.json' }], // JSON
    ['blob', { outputFile: 'logs/results/blob-report.zip' }]    // Blob zip
  ],

  use: {
    headless: true,
    screenshot: 'only-on-failure',  // Captura screenshot só em falha
    video: 'retain-on-failure',     // Grava vídeo só em falha
    trace: 'retain-on-failure',     // Grava trace só em falha
    slowMo: 1000,
    outputDir: 'logs/test-output',  // Pasta para vídeos, screenshots e traces
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['FHD - Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['FHD - Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
  ],

  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
