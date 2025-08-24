const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { devices } = require('@playwright/test');

// Configurações padrão
const DEFAULT_CONFIG = {
  frontendUrl: 'https://front.serverest.dev',
  backendUrl: 'https://serverest.dev',
  outputDir: 'logs',
  filename: 'dashboard_playwright.html',
  browser: 'Chromium',
  resolution: '1280x720',
  suites: []
};

// Mapeamento de devices do Playwright para resolução
const DEVICE_RESOLUTIONS = {
  'Desktop Chrome': '1280x720',
  'Desktop Firefox': '1280x720', 
  'Desktop Safari': '1280x720'
};

/**
 * Extrai configurações do playwright.config.js
 */
function extractPlaywrightConfig() {
  try {
    const configPath = path.resolve('playwright.config.js');
    if (!fs.existsSync(configPath)) {

      return {};
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extrai outputDir do use global
    const outputDirMatch = configContent.match(/outputDir:\s*['"]([^'"]+)['"]/);
    const outputDir = outputDirMatch ? path.dirname(outputDirMatch[1]) : 'logs';
    
    // Extrai todos os devices configurados nos projetos
    const deviceMatches = [...configContent.matchAll(/devices\['([^']+)'\]/g)];
    const configuredDevices = deviceMatches.map(match => match[1]);
    

    
    // Extrai configurações específicas por browser/projeto
    const projectMatches = [...configContent.matchAll(/name:\s*['"](\w+)['"],\s*use:\s*\{[\s\S]*?viewport:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/g)];
    const browserResolutions = {};
    
    projectMatches.forEach(match => {
      const browserName = match[1];
      const width = match[2];
      const height = match[3];
      browserResolutions[browserName] = `${width}x${height}`;
    });
    
    // Extrai resoluções customizadas gerais (fallback)
    const viewportMatches = [...configContent.matchAll(/viewport:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/g)];
    const customResolutions = viewportMatches.map(match => `${match[1]}x${match[2]}`);
    
    // Determina a resolução principal
    let resolution = '1280x720';
    if (Object.keys(browserResolutions).length > 0) {
      // Usa a primeira resolução encontrada como principal
      resolution = Object.values(browserResolutions)[0];
    } else if (customResolutions.length > 0) {
      resolution = customResolutions[0];
    } else {
      // Fallback para devices padrão
      const resolutions = new Set();
      configuredDevices.forEach(deviceName => {
        if (devices[deviceName] && devices[deviceName].viewport) {
          const { width, height } = devices[deviceName].viewport;
          resolutions.add(`${width}x${height}`);
        } else if (DEVICE_RESOLUTIONS[deviceName]) {
          resolutions.add(DEVICE_RESOLUTIONS[deviceName]);
        }
      });
      if (resolutions.size > 0) {
        resolution = Array.from(resolutions)[0];
      }
    }
    

    
    return {
      outputDir,
      resolution,
      configuredDevices,
      browserResolutions
    };
  } catch (error) {

    return {};
  }
}

/**
 * Extrai informações do XML de resultados
 */
function extractXmlInfo(xmlPath) {
  try {
    if (!fs.existsSync(xmlPath)) {

      return {};
    }
    
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const extractedInfo = {};
    
    // Extrai nomes das suítes do XML
    const suiteMatches = xmlContent.match(/testsuite[^>]+name=["']([^"']+)["']/g);
    if (suiteMatches) {
      const suiteNames = suiteMatches.map(match => {
        const nameMatch = match.match(/name=["']([^"']+)["']/);
        return nameMatch ? nameMatch[1] : null;
      }).filter(Boolean);
      
      extractedInfo.availableSuites = [...new Set(suiteNames)];
    }
    
    // Extrai browsers executados do XML (hostname)
    const browserMatches = xmlContent.match(/testsuite[^>]+hostname=["']([^"']+)["']/g);
    if (browserMatches) {
      const browserNames = browserMatches.map(match => {
        const hostnameMatch = match.match(/hostname=["']([^"']+)["']/);
        return hostnameMatch ? hostnameMatch[1] : null;
      }).filter(Boolean);
      
      const uniqueBrowsers = [...new Set(browserNames)];
      extractedInfo.executedBrowsers = uniqueBrowsers;
      
      // Define o browser principal (primeiro da lista ou o mais comum)
      if (uniqueBrowsers.length > 0) {
        extractedInfo.browser = uniqueBrowsers[0].charAt(0).toUpperCase() + uniqueBrowsers[0].slice(1);
      }
    }
    

    
    return extractedInfo;
  } catch (error) {

    return {};
  }
}

/**
 * Gera configuração final combinando todas as fontes
 */
function generateConfig(xmlPath = null, overrides = {}) {
  // Define o caminho padrão do XML se não fornecido
  if (!xmlPath) {
    xmlPath = path.resolve('logs/results/output.xml');
  }
  

  
  // Extrai configurações do playwright.config.js
  const playwrightConfig = extractPlaywrightConfig();
  
  // Extrai informações do XML
  const xmlInfo = extractXmlInfo(xmlPath);
  
  // Combina todas as configurações (prioridade: overrides > XML > playwright.config.js > padrão)
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...playwrightConfig,
    ...xmlInfo,
    ...overrides
  };
  
  // Se temos browsers executados, usa eles para definir suítes se não especificado
  if (xmlInfo.availableSuites && !overrides.suites) {
    finalConfig.suites = xmlInfo.availableSuites;
  }
  

  
  return finalConfig;
}

module.exports = {
  defaultConfig: DEFAULT_CONFIG,
  extractPlaywrightConfig,
  extractXmlInfo,
  generateConfig
};