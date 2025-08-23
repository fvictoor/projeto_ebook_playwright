const path = require('path');
const fs = require('fs/promises');
const nunjucks = require('nunjucks');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { processPlaywrightJUnit } = require('./parser');

function formatSecondsToHms(totalSeconds) {
    if (isNaN(totalSeconds)) return "00:00:00";
    const sec = Math.trunc(totalSeconds);
    return new Date(sec * 1000).toISOString().substr(11, 8);
}

async function generateDashboard({ outputXml, suites: suitesToTrack, outputDir, filename, browser, resolution, frontendUrl, backendUrl }) {
    console.log("Iniciando geração do dashboard...");
    
    const { uniqueTests, stats, totalTime, executionDate, workers } = await processPlaywrightJUnit(outputXml);

    if (!uniqueTests || uniqueTests.length === 0) {
        console.error(`ERRO FATAL: O arquivo '${outputXml}' não contém testes ou não pôde ser lido. Abortando.`);
        process.exit(1);
    }
    
    const { total, passed, initialFailures, recovered, finalFailures } = stats;

    const passed_percentage = total > 0 ? (((stats.passed + stats.recovered) / total) * 100).toFixed(2) : "0.00";
    const recovered_percentage = initialFailures > 0 ? ((recovered / initialFailures) * 100).toFixed(2) : "0.00";
    const final_failures_percentage = total > 0 ? ((finalFailures / total) * 100).toFixed(2) : "0.00";
    
    if (suitesToTrack.length === 0) {
        console.log("[INFO] Nenhuma suíte especificada. O gráfico 'Resultados por Suíte' mostrará todas as suítes.");
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
             browser: browser || 'Não disponível', resolution: resolution || 'Não disponível',
             frontend_url: frontendUrl || 'Não disponível', backend_url: backendUrl || 'Não disponível',
             workers: workers || 'Não disponível'
        }
    });

    await fs.mkdir(outputDir, { recursive: true });
    const finalFilename = filename.toLowerCase().endsWith('.html') ? filename : `${filename}.html`;
    const outputPath = path.join(outputDir, finalFilename);
    await fs.writeFile(outputPath, html, 'utf-8');

    console.log(`✅ Dashboard customizado gerado: ${path.resolve(outputPath)}`);
}

const argv = yargs(hideBin(process.argv))
    .usage('Uso: node $0 <outputXml> [opções]')
    .command('$0 <outputXml>', 'Gera o dashboard a partir do XML do Playwright', (yargs) => {
        yargs.positional('outputXml', {
            describe: 'Caminho para o arquivo results.xml principal',
            type: 'string',
        })
    })
    .option('suites', {
        alias: 's',
        describe: 'Lista de suítes para destacar no gráfico, separadas por vírgula',
        default: '',
        type: 'string',
    })
    .option('output-dir', { alias: 'd', describe: 'Pasta de destino para o relatório', default: 'logs', type: 'string' })
    .option('filename', { alias: 'f', describe: 'Nome do arquivo HTML gerado', default: 'dashboard_playwright.html', type: 'string' })
    .option('browser', { describe: 'Nome do browser usado', type: 'string' })
    .option('resolution', { describe: 'Resolução da tela (ex: 1920x1080)', type: 'string' })
    .option('frontendUrl', { describe: 'URL do ambiente de Frontend', type: 'string' })
    .option('backendUrl', { describe: 'URL do ambiente de Backend', type: 'string' })
    .demandCommand(1, 'Você precisa fornecer o caminho para o arquivo XML.')
    .help()
    .argv;

generateDashboard({
    ...argv,
    suites: argv.suites.split(',').map(s => s.trim()).filter(Boolean),
}).catch(err => {
    console.error("Ocorreu um erro inesperado:", err);
    process.exit(1);
});