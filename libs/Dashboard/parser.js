// parser.js
const fs = require('fs/promises');
const { parseStringPromise } = require('xml2js');

/**
 * Analisa o XML JUnit do Playwright, que contém todas as tentativas (retries).
 * @param {string} filePath - O caminho para o arquivo output.xml.
 * @returns {Promise<object>}
 */
async function processPlaywrightJUnit(filePath) {
    if (!await fs.access(filePath).then(() => true).catch(() => false)) {
        console.warn(`[AVISO] Arquivo não encontrado: ${filePath}. Retornando resultados vazios.`);
        return { uniqueTests: [], stats: {}, totalTime: 0, executionDate: "N/A" };
    }

    const xmlContent = await fs.readFile(filePath, 'utf-8');
    if (!xmlContent) {
        return { uniqueTests: [], stats: {}, totalTime: 0, executionDate: "N/A" };
    }

    const result = await parseStringPromise(xmlContent);
    if (!result.testsuites || !result.testsuites.testsuite) {
        return { uniqueTests: [], stats: {}, totalTime: 0, executionDate: "N/A" };
    }

    const allAttempts = [];
    let totalExecutionTime = 0;
    const testsuites = result.testsuites.testsuite;
    const executionDate = new Date(testsuites[0].$.timestamp).toLocaleDateString('pt-BR');

    for (const suite of testsuites) {
        totalExecutionTime += parseFloat(suite.$.time || '0');
        if (!suite.testcase) continue;

        for (const testcase of suite.testcase) {
            allAttempts.push({
                suite: suite.$.name,
                classname: testcase.$.classname,
                name: testcase.$.name,
                time: parseFloat(testcase.$.time || '0'),
                status: testcase.failure || testcase.error ? 'FAIL' : 'PASS',
                message: testcase.failure ? (testcase.failure[0]._ || testcase.failure[0].$.message) : '',
            });
        }
    }

    const testsGroupedByName = allAttempts.reduce((acc, attempt) => {
        const key = `${attempt.classname} | ${attempt.name}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(attempt);
        return acc;
    }, {});

    const uniqueTests = Object.values(testsGroupedByName).map(attempts => {
        const lastAttempt = attempts[attempts.length - 1];
        const firstAttempt = attempts[0];
        const hasFailedAttempts = attempts.some(a => a.status === 'FAIL');
        const isRecovered = lastAttempt.status === 'PASS' && hasFailedAttempts;

        const failureMessages = attempts
            .filter(a => a.status === 'FAIL' && a.message)
            .map((a, i) => `Tentativa ${i + 1}:\n${a.message.trim()}`)
            .join('\n\n');

        return {
            name: lastAttempt.name,
            suite: lastAttempt.suite,
            finalStatus: lastAttempt.status,
            isRecovered: isRecovered,
            passedOnFirstTry: firstAttempt.status === 'PASS',
            elapsed: lastAttempt.time,
            doc: `Arquivo: ${lastAttempt.classname}`,
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
    
    return { uniqueTests, stats, totalTime: totalExecutionTime, executionDate };
}

module.exports = { processPlaywrightJUnit };