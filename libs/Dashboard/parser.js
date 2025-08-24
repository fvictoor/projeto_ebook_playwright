const fs = require('fs/promises');
const { parseStringPromise } = require('xml2js');

/**
 * 
 * @param {string} filePath
 * @returns {Promise<object>}
 */
async function processPlaywrightJUnit(filePath) {
    if (!await fs.access(filePath).then(() => true).catch(() => false)) {
        console.warn(`[AVISO] Arquivo não encontrado: ${filePath}. Retornando resultados vazios.`);
        return { uniqueTests: [], stats: {}, totalTime: 0, executionDate: "N/A", workers: 0 };
    }

    let workers = 0;
    try {
        const jsonPath = filePath.replace('output.xml', 'test-results.json');
        if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
            const jsonContent = await fs.readFile(jsonPath, 'utf-8');
            const jsonData = JSON.parse(jsonContent);
            workers = jsonData?.config?.metadata?.actualWorkers || 0;
        }
    } catch (error) {
        console.warn('[AVISO] Não foi possível ler informações de workers do arquivo JSON.');
    }

    const xmlContent = await fs.readFile(filePath, 'utf-8');
    if (!xmlContent) {
        return { uniqueTests: [], stats: {}, totalTime: 0, executionDate: "N/A", workers: 0 };
    }

    const result = await parseStringPromise(xmlContent);
    if (!result.testsuites || !result.testsuites.testsuite) {
        return { uniqueTests: [], stats: {}, totalTime: 0, executionDate: "N/A", workers: 0 };
    }

    const allAttempts = [];
    const totalExecutionTime = parseFloat(result.testsuites.$.time || '0');
    const testsuites = result.testsuites.testsuite;
    const executionDate = new Date(testsuites[0].$.timestamp).toLocaleDateString('pt-BR');

    for (const suite of testsuites) {
        if (!suite.testcase) continue;

        for (const testcase of suite.testcase) {
            allAttempts.push({
                suite: suite.$.name,
                classname: testcase.$.classname,
                name: testcase.$.name,
                time: parseFloat(testcase.$.time || '0'),
                hostname: suite.$.hostname || 'unknown',
                status: testcase.failure || testcase.error ? 'FAIL' : 'PASS',
                message: testcase.failure ? (testcase.failure[0]._ || testcase.failure[0].$.message) : '',
            });
        }
    }

    // Agrupar testes por nome único (independente do browser)
    const testsGroupedByName = allAttempts.reduce((acc, attempt) => {
        const key = `${attempt.classname} | ${attempt.name}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(attempt);
        return acc;
    }, {});

    const uniqueTests = Object.values(testsGroupedByName).map(attempts => {
        // Para multibrowser, consideramos o teste como aprovado se passou em pelo menos um browser
        const passedAttempts = attempts.filter(a => a.status === 'PASS');
        const failedAttempts = attempts.filter(a => a.status === 'FAIL');
        
        const finalStatus = passedAttempts.length > 0 ? 'PASS' : 'FAIL';
        const isRecovered = failedAttempts.length > 0 && passedAttempts.length > 0;
        const passedOnFirstTry = attempts.every(a => a.status === 'PASS');
        
        // Usar o tempo médio entre os browsers
        const avgTime = attempts.reduce((sum, a) => sum + a.time, 0) / attempts.length;
        
        // Coletar informações dos browsers
        const browsers = [...new Set(attempts.map(a => a.hostname))];
        
        const failureMessages = failedAttempts
            .map(a => `Browser ${a.hostname}: ${a.message.trim()}`)
            .join('\n\n');

        return {
            name: attempts[0].name,
            suite: attempts[0].suite,
            finalStatus: finalStatus,
            isRecovered: isRecovered,
            passedOnFirstTry: passedOnFirstTry,
            elapsed: avgTime,
            browsers: browsers,
            doc: `Arquivo: ${attempts[0].classname}`,
            message: failureMessages
        };
    });

    const totalTests = uniqueTests.length;
    const finalFailures = uniqueTests.filter(t => t.finalStatus === 'FAIL').length;
    const recovered = uniqueTests.filter(t => t.isRecovered).length;
    const passedOnFirst = uniqueTests.filter(t => t.passedOnFirstTry).length;

    const stats = {
        total: totalTests,
        passed: passedOnFirst,
        initialFailures: finalFailures + recovered,
        recovered: recovered,
        finalFailures: finalFailures
    };
    
    return { uniqueTests, stats, totalTime: totalExecutionTime, executionDate, workers };
}

module.exports = { processPlaywrightJUnit };