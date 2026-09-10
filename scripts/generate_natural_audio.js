import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const chapters = [
  {
    id: 1,
    title: "Importância & Vantagens",
    narration: "Olá, todas e todos. Meu nome é Luna! E hoje eu vou te mostrar como o Agenda Mais Fácil Salão vai transformar a gestão do seu negócio. Ter um sistema próprio garante autonomia total: seus clientes agendam vinte e quatro horas por dia e cem por cento do lucro fica no seu bolso, sem intermediários. E para você começar a usar agora mesmo..."
  },
  {
    id: 2,
    title: "Como Acessar o Sistema",
    narration: "...o primeiro passo é super rápido! Basta clicar no botão Entrada Salão Barra Administrador no topo da tela, preencher o seu CPF cadastrado e o seu Token de Licença. Em um segundo o painel do seu salão se abre por completo! E preste muita atenção agora no próximo detalhe..."
  },
  {
    id: 3,
    title: "O Botão Mais Importante",
    narration: "...porque este é o botão mais importante de todos! Veja aquele botão vermelho no topo: Criar Link para Clientes. Clicando nele, você copia o link exclusivo do seu salão, cola direto na bio do seu Instagram e manda pelo WhatsApp para todos os clientes agendarem sozinhos. E para que eles escolham o que desejam..."
  },
  {
    id: 4,
    title: "Cardápio de Serviços",
    narration: "...nós vamos personalizar o seu cardápio! Na aba Serviços, clique em Novo Serviço. Cadastre cortes, barba, mechas, manicure ou escova, definindo os valores em reais e o tempo de cada atendimento para que a agenda nunca encavale horários. E para quem vai realizar esses procedimentos..."
  },
  {
    id: 5,
    title: "Gestão da Equipe & Comissões",
    narration: "...nós cadastramos a sua equipe de profissionais! Na aba Equipe, clique em Novo Profissional. Você adiciona seus barbeiros e cabeleireiras e define a comissão de cada um, como cinquenta, sessenta ou setenta por cento. O sistema calcula o pagamento da equipe automaticamente a cada corte finalizado. E no dia a dia do salão..."
  },
  {
    id: 6,
    title: "Fluxo da Agenda no Dia a Dia",
    narration: "...tudo acontece de forma muito simples na aba Agenda! Você visualiza a fila de atendimentos do dia com filtros por profissional. Ao atender, basta tocar no agendamento para avançar o status de Agendado para Em Atendimento e depois Concluído, deixando a recepção sempre organizada. E no fim do expediente..."
  },
  {
    id: 7,
    title: "Controle de Caixa & Lucro",
    narration: "...o controle financeiro fica impecável! Na aba Caixa e no Dashboard, você acompanha cada centavo recebido no Pix, cartão ou dinheiro vivo. O sistema separa sozinho a comissão dos profissionais e o lucro líquido do salão, sem você precisar quebrar a cabeça com planilhas. E para fechar com chave de ouro..."
  },
  {
    id: 8,
    title: "Robô Automático & Instalação",
    narration: "...o nosso robô automático cuida dos lembretes no WhatsApp e e-mail dos clientes! E você ainda pode instalar este aplicativo direto na tela inicial do seu celular, seja no Android ou no iPhone, em menos de dois cliques. Muito obrigada, eu sou a Luna e desejo muito sucesso e agenda cheia para o seu salão no Agenda Mais Fácil!"
  }
];

const audioDir = path.resolve(process.cwd(), "public/tutorial_audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

async function main() {
  console.log("Iniciando geração de áudio natural em Português com MsEdgeTTS (pt-BR-FranciscaNeural)...");
  const tts = new MsEdgeTTS();
  await tts.setMetadata("pt-BR-FranciscaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const audioFiles = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    console.log(`Sintetizando capítulo ${ch.id}: ${ch.title}...`);
    
    // Create temporary directory for chapter audio
    const chTmpDir = path.join(audioDir, `tmp_ch_${ch.id}`);
    if (!fs.existsSync(chTmpDir)) {
      fs.mkdirSync(chTmpDir, { recursive: true });
    }
    
    const result = await tts.toFile(chTmpDir, ch.narration);
    const destFile = path.join(audioDir, `chapter_${ch.id}.mp3`);
    fs.copyFileSync(result.audioFilePath, destFile);
    
    // Clean tmp
    fs.rmSync(chTmpDir, { recursive: true, force: true });

    // Probe duration using ffprobe
    const durationStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${destFile}"`).toString().trim();
    const durationSec = parseFloat(durationStr);
    console.log(`Capítulo ${ch.id} gerado com sucesso! Duração: ${durationSec.toFixed(2)}s`);
    audioFiles.push({ id: ch.id, file: destFile, duration: durationSec });
  }

  // Concatenate all 8 audios into one master audio file
  console.log("Concatenando áudios dos 8 capítulos em master_narration.mp3...");
  const concatList = path.join(audioDir, "audio_concat.txt");
  let concatContent = "";
  for (const item of audioFiles) {
    concatContent += `file '${item.file}'\n`;
  }
  fs.writeFileSync(concatList, concatContent);

  const masterAudio = path.join(audioDir, "master_narration.mp3");
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${masterAudio}"`);
  
  const masterDurationStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterAudio}"`).toString().trim();
  console.log(`Áudio Master completo gerado! Duração total: ${parseFloat(masterDurationStr).toFixed(2)}s (${(parseFloat(masterDurationStr)/60).toFixed(2)} min)`);
  
  // Save manifest
  fs.writeFileSync(path.join(audioDir, "manifest.json"), JSON.stringify({
    totalDuration: parseFloat(masterDurationStr),
    voice: "pt-BR-FranciscaNeural",
    chapters: audioFiles
  }, null, 2));

  console.log("Todos os áudios foram gerados com sucesso!");
}

main().catch(err => {
  console.error("Erro ao gerar áudios:", err);
  process.exit(1);
});
