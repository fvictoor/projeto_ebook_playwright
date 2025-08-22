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

function verificarOuCriarXml(caminho) {
    if (!fs.existsSync(caminho)) {
        console.log(`[AVISO] Arquivo não encontrado: ${caminho}. Criando um arquivo vazio para continuar.`);
        fs.mkdirSync(path.dirname(caminho), { recursive: true });
        fs.writeFileSync(caminho, CONTEUDO_MINIMO_XML, 'utf-8');
        console.log(`[CRIADO] Arquivo de log vazio criado em: ${caminho}`);
    }
}

function parseXmlReport(caminhoArquivo) {
    verificarOuCriarXml(caminhoArquivo);
    const xmlFile = fs.readFileSync(caminhoArquivo, 'utf8');
    const result = xml2js.xml2js(xmlFile, { compact: true, attributesKey: 'attr' });
    return result.testsuites || { attr: { tests: '0', failures: '0', time: '0' }, testsuite: [] };
}

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

function formatarListaFalhas(lista) {
    if (!lista || lista.length === 0) {
        return "Nenhum teste falhou 🎉";
    }
    return lista.map(item => `- ${item}`).join('\n');
}

function formatarTempo(s) {
    if (s === null || s === undefined) return "0m0s";
    const segundosTotais = parseFloat(s);
    const minutos = Math.floor(segundosTotais / 60);
    const segundos = Math.round(segundosTotais % 60);
    return `${minutos}m${segundos}s`;
}

async function notificarWebhook(linkWebhook, texto) {
    if (!linkWebhook) {
        throw new Error("A variável 'WEBHOOK_URL' não foi definida no seu arquivo .env ou nos secrets da pipeline.");
    }
    const body = { content: texto };
    const headers = { 'Content-Type': 'application/json' };

    console.log("\nEnviando relatório para o webhook...");
    try {
        await axios.post(linkWebhook, body, { headers, timeout: 10000 });
        console.log("Relatório enviado com sucesso!");
    } catch (error) {
        throw new Error(`Erro ao enviar notificação: ${error.message}`);
    }
}

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
        .usage('Uso: node $0 <execucao_xml> [opções]')
        .command('$0 <execucao_xml>', 'Processa o log final do Playwright (JUnit), gera um relatório e envia para um webhook.', (y) => {
            y.positional('execucao_xml', {
                describe: 'Caminho para o arquivo final output.xml.',
                type: 'string',
            })
        })
        .option('titulo', {
            alias: 't',
            type: 'string',
            default: '📋 RELATÓRIO DE TESTES AUTOMATIZADOS',
            description: 'Título personalizado para o relatório.'
        })
        .demandCommand(1, 'Você precisa fornecer o caminho para o arquivo XML.')
        .help()
        .argv;

    const { WEBHOOK_URL } = process.env;

    if (!WEBHOOK_URL) {
        console.error("[ERRO] A variável WEBHOOK_URL não foi encontrada. Verifique seu arquivo .env ou os secrets da pipeline.");
        process.exit(1);
    }
    
    console.log("Processando arquivo de resultado...");
    const resultExecucao = parseXmlReport(argv.execucao_xml);

    // Coletando estatísticas
    const totalTests = parseInt(resultExecucao.attr.tests, 10) || 0;
    const finalFailures = parseInt(resultExecucao.attr.failures, 10) || 0;
    const passedTests = totalTests - finalFailures;
    const falhasFinais = coletarTestesFalhos(resultExecucao);
    const dadosPorArquivo = coletarDadosPorArquivo(resultExecucao);
    const tempoTotal_s = parseFloat(resultExecucao.attr.time) || 0;

    // Montando o corpo do relatório
    console.log("Montando o corpo do relatório...");
    const infoGerais = {
        "🚀 Qtd. Total de Testes": totalTests,
        "✅ Qtd. Testes Aprovados": passedTests,
        "❌ Qtd. Testes Reprovados (final)": finalFailures,
    };

    let partesRelatorio = [`*${argv.titulo}*\n`];
    for (const [key, value] of Object.entries(infoGerais)) {
        partesRelatorio.push(`*${key}:* ${value}`);
    }

    partesRelatorio.push(`\n*⚠️ Testes que falharam (após retries):*\n${formatarListaFalhas(falhasFinais)}`);
    
    partesRelatorio.push("\n*📌 Resultados por Arquivo:*");
    if (Object.keys(dadosPorArquivo).length === 0) {
        partesRelatorio.push("Nenhum arquivo de teste foi processado.");
    } else {
        for (const [arquivo, info] of Object.entries(dadosPorArquivo)) {
            if (info.total > 0) {
                partesRelatorio.push(
                    `\n- *Arquivo: \`${path.basename(arquivo)}\`*\n` +
                    `  • Total: ${info.total}\n` +
                    `  • Aprovados: ${info.passed}\n` +
                    `  • Falharam: ${info.failed}\n` +
                    `  • Duração: ${formatarTempo(info.elapsed)}`
                );
            }
        }
    }

    partesRelatorio.push(`\n*📊 Tempo Total de Execução:* ${formatarTempo(tempoTotal_s)}`);

    const relatorioFinal = partesRelatorio.join('\n');
    
    try {
        await notificarWebhook(WEBHOOK_URL, relatorioFinal);
    } catch (error) {
        console.error(`[FALHA] ${error.message}`);
        process.exit(1);
    }
}

main();