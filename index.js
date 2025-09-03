const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const fsp = require('fs').promises;
const qrcode = require('qrcode-terminal');

// ADICIONADO: Constante para o seu número. Verifique se está correto.
const MEU_NUMERO = '558381810388@c.us'; 
const PROSPECTS_FILE_PATH = './prospects.json';
let prospects = [];

// --- FUNÇÕES UTILITÁRIAS ---

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function carregarProspects() {
    try {
        if (fs.existsSync(PROSPECTS_FILE_PATH)) {
            const data = fs.readFileSync(PROSPECTS_FILE_PATH, 'utf8');
            prospects = JSON.parse(data);
            console.log(`✅ ${prospects.length} prospect(s) carregado(s).`);
        } else {
            console.log('📄 Arquivo de prospects não encontrado. Criando um novo.');
            fs.writeFileSync(PROSPECTS_FILE_PATH, '[]', 'utf8');
        }
    } catch (e) {
        console.error('❌ Erro fatal ao carregar prospects. Verifique o JSON.', e);
        process.exit(1);
    }
}

async function salvarProspects() {
    try {
        await fsp.writeFile(PROSPECTS_FILE_PATH, JSON.stringify(prospects, null, 2), 'utf8');
        console.log('💾 Status dos prospects salvo no arquivo.');
    } catch (e) {
        console.error('❌ Erro ao salvar o status dos prospects:', e);
    }
}


// --- LÓGICA PRINCIPAL DO BOT ---

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "prospeccao-bot" }),
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
    console.log("📲 Escaneie o QR Code para o Bot de Prospecção:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log("✅ Bot de Prospecção Zé Navalha está online!");
    const clientState = await client.getState();
    console.log("ℹ️  Estado do Cliente:", clientState);

    const alvos = prospects.filter(p => p.status === 'aguardando_contato');
    if (alvos.length > 0) {
        console.log(`🚀 Iniciando campanha para ${alvos.length} novo(s) alvo(s)...`);
        for (const alvo of alvos) {
            // POLIDO: Adicionado emoji na saudação
            const mensagemInicial = `Opa, tudo na paz por aí na ${alvo.nome}?\n\nMeu nome é *Zé Navalha*, sou um assistente de barbearia *100% autônomo*. Meu chefia queria saber se você teria 3 minutinhos pra demonstrar como eu funciono. É jogo rápido! 🚀`;
            
            console.log(`📤 Enviando para ${alvo.nome}...`);
            await client.sendMessage(alvo.numero, mensagemInicial);
            alvo.status = 'contatado';
            
            const randomDelay = Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
            await delay(randomDelay);
        }
        await salvarProspects();
        console.log("🎉 Campanha inicial finalizada. Aguardando respostas...");
    } else {
        console.log("🤷 Nenhum novo alvo para contatar. Apenas aguardando respostas.");
    }
});

client.on('message', async (message) => {
    const prospect = prospects.find(p => p.numero === message.from);

    if (!prospect || prospect.status === 'desistiu' || prospect.status === 'finalizado') {
        return;
    }

    const chat = await message.getChat();
    await chat.sendStateTyping();
    
    console.log(`💬 Mensagem recebida de ${prospect.nome} (Status: ${prospect.status}): "${message.body}"`);

    const textoMensagem = message.body.toLowerCase();
    const palavrasPositivas = ['sim', 'tenho', 'pode', 'manda', 'gostei', 'interessante', 'mais', 'legal', 'quero', 'claro', 'mostra', 'desejo', 'continuar'];
    const respostaPositiva = palavrasPositivas.some(palavra => textoMensagem.includes(palavra));

    try {
        if (prospect.status === 'contatado') {
            if (respostaPositiva) {
                const media = MessageMedia.fromFilePath('./videos/1.mp4');
                await chat.sendMessage(media, { caption: 'Show! 🎬 Neste primeiro vídeo, meu criador explica o problema que o Zé Navalha resolve no dia a dia de uma barbearia.' });
                await delay(5000);
                await chat.sendMessage('Quer ver como a inteligência artificial funciona na prática? 🤔');
                prospect.status = 'video1_enviado';
            } else {
                await chat.sendMessage('Entendido. Sem problemas! 👍 Se mudar de ideia, é só chamar. Um abraço do Zé!');
                prospect.status = 'desistiu';
            }
        }
        else if (prospect.status === 'video1_enviado') {
            if (respostaPositiva) {
                 const media = MessageMedia.fromFilePath('./videos/2.mp4');
                 await chat.sendMessage(media, { caption: 'Neste segundo vídeo, você vai ver a inteligência do Zé em ação 🧠 e o painel de controle do patrão. 👑' });
                 await delay(2000);
                 await chat.sendMessage('Gostou? No próximo e último vídeo, te mostro os benefícios diretos pro seu negócio e a proposta final. 📈');
                 prospect.status = 'video2_enviado';
            } else {
                await chat.sendMessage('Beleza, campeão! 💪 Qualquer coisa, tô por aqui.');
                prospect.status = 'desistiu';
            }
        }
        else if (prospect.status === 'video2_enviado') {
            if (respostaPositiva) {
                 const media = MessageMedia.fromFilePath('./videos/3.mp4');
                 await chat.sendMessage(media, { caption: 'Pra fechar: aqui estão os benefícios claros e a nossa oferta de lançamento. É a melhor parte! 🎁' });
                 await delay(2000);
                 await chat.sendMessage('Se essa ideia fez sentido pra você, me dá um último "sim" pra eu te mandar a proposta por texto e a gente fechar negócio. ✅');
                 prospect.status = 'interesse_final';
            } else {
                await chat.sendMessage('Ok, meu nobre. A navalha segue afiada por aqui se precisar. 💈');
                prospect.status = 'desistiu';
            }
        }
        else if (prospect.status === 'interesse_final') {
             if (respostaPositiva) {
                const proposta = "Top! Fico feliz que tenha curtido. 👍\n\nComo você viu, a proposta é um *teste gratuito de 30 dias*, sem nenhum compromisso, com acesso a todas as funcionalidades atuais e as novas a serem implantadas.\n\nMeu Patrão (O Bob) pode te chamar para acertar os detalhes. Posso pedir pra ele entrar em contato?";
                await chat.sendMessage(proposta);
                
                // ADICIONADO: Lógica de notificação para você
                console.log(`🔔 Notificando o Patrão sobre o novo lead: ${prospect.nome}`);
                const mensagemPatrao = `🔥 Lead Quente! 🔥\n\nA barbearia *${prospect.nome}* finalizou o funil e aceitou o contato!\n\n*Próximo passo:* Entre em contato com eles pelo número: ${prospect.numero.replace('@c.us', '')}`;
                await client.sendMessage(MEU_NUMERO, mensagemPatrao);

                prospect.status = 'finalizado';
             } else {
                await chat.sendMessage('Tranquilo! Se precisar, é só dar um toque. 😉');
                prospect.status = 'desistiu';
             }
        }
        
        await salvarProspects();

    } catch (e) {
        console.error(`❌ Erro ao processar mensagem de ${prospect.nome}:`, e);
    } finally {
        await chat.clearState();
    }
});

// --- INICIALIZAÇÃO ---
function start() {
    console.log("Iniciando Bot de Prospecção Zé Navalha...");
    carregarProspects();
    client.initialize().catch(err => {
        console.error("❌ Erro fatal durante a inicialização do cliente:", err);
    });
}

start();