const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const ARQUIVO_ENTRADA = './prospects.json';
const ARQUIVO_SAIDA = './prospects_validado.json';

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "validador-correto" }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: {
        headless: 'new',
        executablePath: '/usr/bin/google-chrome', 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log("📲 Escaneie o QR Code para iniciar o Validador:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log("✅ Validador conectado!");
    
    try {
        const data = fs.readFileSync(ARQUIVO_ENTRADA, 'utf8');
        const prospects = JSON.parse(data);
        const prospectsValidados = [];
        let numerosValidados = 0;
        let numerosInvalidos = 0;

        console.log(`\nIniciando a validação precisa de ${prospects.length} número(s)...`);

        for (const prospect of prospects) {
            let numeroOriginal = prospect.numero.replace(/[^0-9]/g, '');
            let validado = false;

            const ddd = numeroOriginal.substring(2, 4);
            const numeroSemDDD = numeroOriginal.substring(4);
            
            let versaoCom9, versaoSem9;
            if (numeroSemDDD.length === 9 && numeroSemDDD.startsWith('9')) {
                versaoCom9 = numeroSemDDD;
                versaoSem9 = numeroSemDDD.substring(1);
            } else if (numeroSemDDD.length === 8) {
                versaoCom9 = '9' + numeroSemDDD;
                versaoSem9 = numeroSemDDD;
            } else {
                console.log(`\n⚠️  AVISO: Número de "${prospect.nome}" (${prospect.numero}) tem formato inesperado.`);
                numerosInvalidos++;
                continue;
            }

            console.log(`\n🔎 Verificando "${prospect.nome}"...`);

            const numeroCompletoSem9 = `55${ddd}${versaoSem9}`;
            const resultadoSem9 = await client.getNumberId(numeroCompletoSem9);

            if (resultadoSem9) {
                prospectsValidados.push({ ...prospect, numero: resultadoSem9._serialized, status: "aguardando_contato" });
                console.log(`  -> ✅ Encontrado com 8 dígitos: ${resultadoSem9._serialized}`);
                numerosValidados++;
                validado = true;
            } else {
                console.log(`  -> ❌ Versão com 8 falhou. Testando com 9...`);
                const numeroCompletoCom9 = `55${ddd}${versaoCom9}`;
                const resultadoCom9 = await client.getNumberId(numeroCompletoCom9);

                if (resultadoCom9) {
                    prospectsValidados.push({ ...prospect, numero: resultadoCom9._serialized, status: "aguardando_contato" });
                    console.log(`  -> ✅ Encontrado com 9 dígitos: ${resultadoCom9._serialized}`);
                    numerosValidados++;
                    validado = true;
                }
            }

            if (!validado) {
                console.log(`  -> ❌ FALHA: Nenhuma versão do número para "${prospect.nome}" foi encontrada no WhatsApp.`);
                numerosInvalidos++;
            }
        }
        
        fs.writeFileSync(ARQUIVO_SAIDA, JSON.stringify(prospectsValidados, null, 2), 'utf8');
        console.log(`\n🎉 Processo de validação concluído!`);
        console.log(`- ${numerosValidados} número(s) validados com sucesso.`);
        console.log(`- ${numerosInvalidos} número(s) não encontrados.`);
        console.log(`O arquivo 100% correto foi salvo como: ${ARQUIVO_SAIDA}`);

    } catch (e) {
        console.error("Ocorreu um erro:", e);
    } finally {
        await client.destroy();
        console.log("\nCliente desconectado.");
    }
});

client.initialize();