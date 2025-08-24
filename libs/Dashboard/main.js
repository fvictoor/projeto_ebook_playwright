const path = require('path');
const fs = require('fs/promises');
const nunjucks = require('nunjucks');
const { processPlaywrightJUnit } = require('./parser');
const { generateConfig } = require('./config');

function formatSecondsToHms(totalSeconds) {
    if (isNaN(totalSeconds)) return "00:00:00";
    const sec = Math.trunc(totalSeconds);
    return new Date(sec * 1000).toISOString().substr(11, 8);
}

async function generateDashboard(outputXml, customConfig = {}) {
    // Gera configuração automática baseada no projeto
    const autoConfig = generateConfig(outputXml);
    const config = { ...autoConfig, ...customConfig };
    
    const { uniqueTests, stats, totalTime, executionDate, workers } = await processPlaywrightJUnit(outputXml);

    if (!uniqueTests || uniqueTests.length === 0) {
        console.error(`ERRO FATAL: O arquivo '${outputXml}' não contém testes ou não pôde ser lido. Abortando.`);
        process.exit(1);
    }
    
    const { total, passed, initialFailures, recovered, finalFailures } = stats;

    const passed_percentage = total > 0 ? (((stats.passed + stats.recovered) / total) * 100).toFixed(2) : "0.00";
    const recovered_percentage = initialFailures > 0 ? ((recovered / initialFailures) * 100).toFixed(2) : "0.00";
    const final_failures_percentage = total > 0 ? ((finalFailures / total) * 100).toFixed(2) : "0.00";
    
    let suitesToTrack = config.suites || [];
    if (suitesToTrack.length === 0) {
        const allSuiteNames = [...new Set(uniqueTests.map(test => test.suite))];
        suitesToTrack = allSuiteNames;
    }
    
    const statusDistribution = {
        labels: ["Aprovados", "Recuperados", "Falhas Definitivas"],
        data: [stats.passed, recovered, finalFailures],
    };

    const suiteTimes = uniqueTests.reduce((acc, test) => {
        acc[test.suite] = (acc[test.suite] || 0) + test.elapsed;
        return acc;
    }, {});
    const suiteTimeDataSorted = Object.entries(suiteTimes).sort((a, b) => b[1] - a[1]);
    const suiteTimeChartData = {
        labels: suiteTimeDataSorted.map(item => item[0]),
        data: suiteTimeDataSorted.map(item => item[1]),
        formatted_times: suiteTimeDataSorted.map(item => formatSecondsToHms(item[1])),
    };

    const suiteResults = suitesToTrack.reduce((acc, suite) => ({ ...acc, [suite]: { passed: 0, failed: 0 } }), {});
    uniqueTests.forEach(test => {
        if (suitesToTrack.includes(test.suite)) {
            if (test.finalStatus === 'PASS') {
                suiteResults[test.suite].passed++;
            } else {
                suiteResults[test.suite].failed++;
            }
        }
    });
    const suiteResultsChartData = {
        labels: suitesToTrack,
        passed_data: suitesToTrack.map(suite => suiteResults[suite]?.passed || 0),
        failed_data: suitesToTrack.map(suite => suiteResults[suite]?.failed || 0),
    };

    const slowestTests = uniqueTests.sort((a, b) => b.elapsed - a.elapsed).slice(0, 10).reverse();
    const slowestTestsChartData = {
        labels: slowestTests.map(t => t.name),
        data: slowestTests.map(t => t.elapsed),
        formatted_times: slowestTests.map(t => formatSecondsToHms(t.elapsed)),
    };

    const testDetailsBySuite = uniqueTests.reduce((acc, test) => {
        if (!acc[test.suite]) acc[test.suite] = [];
        acc[test.suite].push({
            ...test,
            status: test.finalStatus,
            elapsed: formatSecondsToHms(test.elapsed),
        });
        return acc;
    }, {});

    const suiteListForTemplate = Object.entries(testDetailsBySuite).map(([suiteName, tests]) => ({
        name: suiteName,
        tests: tests,
        has_failures: tests.some(t => t.status === 'FAIL'),
    }));
    
    nunjucks.configure(path.join(__dirname, 'templates'), { autoescape: true });
    const html = nunjucks.render('modern_report_template.html', {
        total_tests: total, 
        total_passed: stats.passed + stats.recovered,
        initial_failures: initialFailures,
        recovered: recovered, 
        final_failures: finalFailures, 
        total_execution_time: formatSecondsToHms(totalTime),
        execution_date: executionDate,
        passed_percentage: passed_percentage,
        recovered_percentage: recovered_percentage,
        final_failures_percentage: final_failures_percentage,
        status_distribution_json: JSON.stringify(statusDistribution),
        suite_time_chart_data_json: JSON.stringify(suiteTimeChartData),
        suite_results_chart_data_json: JSON.stringify(suiteResultsChartData),
        slowest_tests_chart_data_json: JSON.stringify(slowestTestsChartData),
        suite_list: suiteListForTemplate,
        config_info: {
             executedBrowsers: config.executedBrowsers || ['Não disponível'],
             configuredDevices: config.configuredDevices || ['Não disponível'],
             resolution: config.resolution || 'Não disponível',
             browserResolutions: config.browserResolutions || {},
             browserResolutionsList: Object.keys(config.browserResolutions || {}).map(browser => ({
                 name: browser,
                 resolution: config.browserResolutions[browser]
             })),
             frontend_url: config.frontendUrl || 'Não disponível', 
             backend_url: config.backendUrl || 'Não disponível',
             workers: workers || 'Não disponível'
        }
    });

    await fs.mkdir(config.outputDir, { recursive: true });
    const finalFilename = config.filename.toLowerCase().endsWith('.html') ? config.filename : `${config.filename}.html`;
    const outputPath = path.join(config.outputDir, finalFilename);
    await fs.writeFile(outputPath, html, 'utf-8');
}

// Função principal
function main() {
    const args = process.argv.slice(2);
    
    // Se nenhum argumento for fornecido, usa o caminho padrão
    let xmlPath = args[0] || './logs/results/output.xml';
    
    // Resolve o caminho relativo
    if (!path.isAbsolute(xmlPath)) {
        xmlPath = path.resolve(process.cwd(), xmlPath);
    }
    
    // Permite sobrescrever configurações via argumentos (opcional)
    const customConfig = {};
    
    // Processa argumentos nomeados opcionais
    for (let i = 1; i < args.length; i += 2) {
        const key = args[i]?.replace(/^--/, '');
        const value = args[i + 1];
        
        if (key && value) {
            switch (key) {
                case 'output-dir':
                    customConfig.outputDir = value;
                    break;
                case 'filename':
                    customConfig.filename = value;
                    break;
                case 'browser':
                    customConfig.browser = value;
                    break;
                case 'resolution':
                    customConfig.resolution = value;
                    break;
                case 'frontend-url':
                    customConfig.frontendUrl = value;
                    break;
                case 'backend-url':
                    customConfig.backendUrl = value;
                    break;
                case 'suites':
                    customConfig.suites = value.split(',').map(s => s.trim());
                    break;
            }
        }
    }
    
    generateDashboard(xmlPath, customConfig).catch(err => {
        console.error('❌ Erro ao gerar dashboard:', err);
        process.exit(1);
    });
}

// Executa apenas se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { generateDashboard };