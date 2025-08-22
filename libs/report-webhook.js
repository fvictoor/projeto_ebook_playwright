const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml-js');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const CONTEUDO_MINIMO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="empty" tests="0" failures="0" time="0">
</testsuites>`;

/**

 * @param {string} caminho - O caminho para o arquivo XML.
 */
function verificarOuCriarXml(caminho) {
    if (!fs.existsSync(caminho)) {
        console.log(`[AVISO] Arquivo não encontrado: ${caminho}. Criando um arquivo vazio para continuar.`);
        fs.mkdirSync(path.dirname(caminho), { recursive: true });
        fs.writeFileSync(caminho, CONTEUDO_MINIMO_XML, 'utf-8');
        console.log(`[CRIADO] Arquivo de log vazio criado em: ${caminho}`);
    }
}

/**
 * @param {string} caminhoArquivo - O caminho para o arquivo XML.
 * @returns {object} O objeto JavaScript representando o XML.
 */
function parseXmlReport(caminhoArquivo) {
    verificarOuCriarXml(caminhoArquivo);
    const xmlFile = fs.readFileSync(caminhoArquivo, 'utf8');
    const result = xml2js.xml2js(xmlFile, { compact: true, attributesKey: 'attr' });
    return result.testsuites || { attr: { tests: '0', failures: '0', time: '0' }, testsuite: [] };
}

/**
 * Coleta os nomes de todos os testes que falharam.
 * @param {object} suitesData - O objeto de suítes de teste analisado.
 * @returns {string[]} Uma lista de nomes de testes que falharam.
 */
function coletarTestesFalhos(suitesData) {
    const failedTests = [];
    const testsuites = Array.isArray(suitesData.testsuite) ? suitesData.testsuite : [suitesData.testsuite].filter(Boolean);

    for (const suite of testsuites) {
        if (suite && suite.testcase) {
            const testcases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
            for (const testcase of testcases) {
                if (testcase.failure) {
                    failedTests.push(`${testcase.attr.classname} -> ${testcase.attr.name}`);
                }
            }
        }
    }
    return failedTests;
}

/**
 * Formata uma lista de falhas para exibição.
 * @param {string[]} lista - A lista de testes falhos.
 * @returns {string} A lista formatada.
 */
function formatarListaFalhas(lista) {
    if (!lista || lista.length === 0) {
        return "Nenhum teste falhou 🎉";
    }
    return lista.map(item => `- ${item}`).join('\n');
}

/**
 * Converte segundos para o formato 'XmYs'.
 * @param {number | string} s - O tempo em segundos.
 * @returns {string} O tempo formatado.
 */
function formatarTempo(s) {
    if (s === null || s === undefined) return "0m0s";
    const segundosTotais = parseFloat(s);
    const minutos = Math.floor(segundosTotais / 60);
    const segundos = Math.round(segundosTotais % 60);
    return `${minutos}m${segundos}s`;
}

/**
 * Envia uma notificação para um webhook (compatível com Discord/Slack).
 * @param {string} linkWebhook - A URL do webhook.
 * @param {string} texto - O conteúdo da mensagem.
 */
async function notificarWebhook(linkWebhook, texto) {
    if (!linkWebhook) {
        throw new Error("A variável 'WEBHOOK_URL' não foi definida no seu arquivo .env.");
    }

    const body = { content: texto };
    const headers = { 'Content-Type': 'application/json' };

    console.log("\nEnviando relatório para o webhook...");
    try {
        const response = await axios.post(linkWebhook, body, { headers, timeout: 10000 });
        if (response.status >= 200 && response.status < 300) {
            console.log("Relatório enviado com sucesso!");
        }
    } catch (error) {
        throw new Error(`Erro ao enviar notificação: ${error.message}`);
    }
}

/**
 * Coleta estatísticas de testes por arquivo (agindo como a "tag").
 * @param {object} suitesData - O objeto de suítes de teste.
 * @returns {object} Estatísticas agregadas por arquivo.
 */
function coletarDadosPorArquivo(suitesData) {
    const stats = {};
    const testsuites = Array.isArray(suitesData.testsuite) ? suitesData.testsuite : [suitesData.testsuite].filter(Boolean);

    for (const suite of testsuites) {
        if (suite && suite.attr) {
            const nomeArquivo = suite.attr.name;
            stats[nomeArquivo] = {
                total: parseInt(suite.attr.tests, 10),
                failed: parseInt(suite.attr.failures, 10),
                passed: parseInt(suite.attr.tests, 10) - parseInt(suite.attr.failures, 10),
                elapsed: parseFloat(suite.attr.time)
            };
        }
    }
    return stats;
}


async function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Uso: node $0 <execucao_xml> <rerun_xml> [opções]')
        .command('$0 <execucao_xml> <rerun_xml>', 'Processa logs do Playwright (JUnit), gera um relatório e envia para um webhook.', (y) => {
            y.positional('execucao_xml', {
                describe: 'Caminho para o arquivo output.xml da execução principal.',
                type: 'string',
            })
            .positional('rerun_xml', {
                describe: 'Caminho para o arquivo output.xml da re-execução (rerun).',
                type: 'string',
            })
        })
        .option('titulo', {
            alias: 't',
            type: 'string',
            default: '📋 RELATÓRIO DE TESTES AUTOMATIZADOS',
            description: 'Título personalizado para o relatório.'
        })
        .demandCommand(2, 'Você precisa fornecer os caminhos para os dois arquivos XML.')
        .help()
        .argv;

    const { WEBHOOK_URL } = process.env;

    if (!WEBHOOK_URL) {
        console.error("[ERRO] A variável WEBHOOK_URL não foi encontrada. Verifique seu arquivo .env.");
        process.exit(1);
    }
    
    console.log("Processando arquivos de resultado...");
    const resultExecucao = parseXmlReport(argv.execucao_xml);
    const resultRerun = parseXmlReport(argv.rerun_xml);

    const totalTests = parseInt(resultExecucao.attr.tests, 10) || 0;
    const initialFailures = parseInt(resultExecucao.attr.failures, 10) || 0;
    const passedTests = totalTests - initialFailures;

    const falhasRerun = coletarTestesFalhos(resultRerun);
    
    const dadosPorArquivo = coletarDadosPorArquivo(resultExecucao);

    const tempoExecucao_s = parseFloat(resultExecucao.attr.time) || 0;
    const tempoRerun_s = parseFloat(resultRerun.attr.time) || 0;
    const tempoTotal_s = tempoExecucao_s + tempoRerun_s;

    console.log("Montando o corpo do relatório...");
    const infoGerais = {
        "🚀 Qtd. Total de Testes": totalTests,
        "✅ Qtd. Testes Aprovados (final)": passedTests,
        "❌ Qtd. Testes Reprovados (inicial)": initialFailures,
        "🔁 Qtd. Testes que persistiram no erro (Rerun)": falhasRerun.length,
    };

    const tempos = {
        "🕐 Tempo Execução Principal": formatarTempo(tempoExecucao_s),
        "🔄 Tempo Execução Rerun": formatarTempo(tempoRerun_s),
        "⏳ Tempo Total (soma)": formatarTempo(tempoTotal_s),
    };

    let partesRelatorio = [`*${argv.titulo}*\n`];
    for (const [key, value] of Object.entries(infoGerais)) {
        partesRelatorio.push(`*${key}:* ${value}`);
    }

    partesRelatorio.push(`\n*⚠️ Testes que falharam no Rerun:*\n${formatarListaFalhas(falhasRerun)}`);
    
    partesRelatorio.push("\n*📌 Resultados por Arquivo (Execução Principal):*");
    if (Object.keys(dadosPorArquivo).length === 0) {
        partesRelatorio.push("Nenhum arquivo de teste foi processado.");
    } else {
        for (const [arquivo, info] of Object.entries(dadosPorArquivo)) {
            if (info.total > 0) {
                const tempo = formatarTempo(info.elapsed);
                partesRelatorio.push(
                    `\n- *Arquivo: \`${path.basename(arquivo)}\`*\n` +
                    `  • Total: ${info.total}\n` +
                    `  • Aprovados: ${info.passed}\n` +
                    `  • Falharam: ${info.failed}\n` +
                    `  • Duração: ${tempo}`
                );
            }
        }
    }

    partesRelatorio.push("\n*📊 Tempos de Execução:*");
    for (const [key, value] of Object.entries(tempos)) {
        partesRelatorio.push(`*${key}:* ${value}`);
    }

    const relatorioFinal = partesRelatorio.join('\n');
    
    try {
        await notificarWebhook(WEBHOOK_URL, relatorioFinal);
    } catch (error) {
        console.error(`[FALHA] ${error.message}`);
        process.exit(1);
    }
}

main();