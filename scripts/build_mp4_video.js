import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const manifestPath = path.resolve(process.cwd(), "public/tutorial_audio/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

const chapters = [
  {
    id: 1,
    title: "Importância & Vantagens",
    narration: "Olá, todas e todos. Meu nome é Luna! E hoje eu vou te mostrar como o Agenda Mais Fácil Salão vai transformar a gestão do seu negócio. Ter um sistema próprio garante autonomia total: seus clientes agendam 24 horas por dia e cem por cento do lucro fica no seu bolso, sem intermediários. E para você começar a usar agora mesmo...",
    points: ["Lucro 100% direto no seu bolso", "Sem taxas abusivas ou intermediários", "Agendamento online 24h automático"],
    button: "Visão Geral do Negócio",
    image: "real_salon_people_1788749097357.jpg",
    duration: manifest.chapters[0].duration
  },
  {
    id: 2,
    title: "Como Acessar o Sistema",
    narration: "...o primeiro passo é super rápido! Basta clicar no botão 'Entrada Salão / Administrador' no topo da tela, preencher o seu CPF cadastrado e o seu Token de Licença. Em um segundo o painel do seu salão se abre por completo! E preste muita atenção agora no próximo detalhe...",
    points: ["Clique em 'Entrada Salão / Administrador'", "Informe seu CPF de proprietário", "Digite seu Token de Licença exclusivo"],
    button: "Botão 'Entrada Salão / Administrador'",
    image: "pixar_female_host_1788749082734.jpg",
    duration: manifest.chapters[1].duration
  },
  {
    id: 3,
    title: "O Botão Mais Importante",
    narration: "...porque este é o botão mais importante de todos! Veja aquele botão vermelho no topo: 'Criar Link p/ Clientes'. Clicando nele, você copia o link exclusivo do seu salão, cola direto na bio do seu Instagram e manda pelo WhatsApp para todos os clientes agendarem sozinhos. E para que eles escolham o que desejam...",
    points: ["Botão vermelho 'Criar Link p/ Clientes'", "Cole o link na Bio do seu Instagram", "Envie para a lista de clientes no WhatsApp"],
    button: "Botão 'Criar Link p/ Clientes'",
    image: "real_barber_client_1788749113025.jpg",
    duration: manifest.chapters[2].duration
  },
  {
    id: 4,
    title: "Cardápio de Serviços",
    narration: "...nós vamos personalizar o seu cardápio! Na aba 'Serviços', clique em '+ Novo Serviço'. Cadastre cortes, barba, mechas, manicure ou escova, definindo os valores em reais e o tempo de cada atendimento para que a agenda nunca encavale horários. E para quem vai realizar esses procedimentos...",
    points: ["Aba 'Serviços' e botão '+ Novo Serviço'", "Preços em Reais (R$) e duração em minutos", "Bloqueio automático contra choque de horários"],
    button: "Aba 'Serviços' ➔ '+ Novo Serviço'",
    image: "real_salon_people_1788749097357.jpg",
    duration: manifest.chapters[3].duration
  },
  {
    id: 5,
    title: "Gestão da Equipe & Comissões",
    narration: "...nós cadastramos a sua equipe de profissionais! Na aba 'Equipe', clique em '+ Novo Profissional'. Você adiciona seus barbeiros e cabeleireiras e define a comissão de cada um, como 50%, 60% ou 70%. O sistema calcula o pagamento da equipe automaticamente a cada corte finalizado. E no dia a dia do salão...",
    points: ["Aba 'Equipe' e botão '+ Novo Profissional'", "Configuração individual de comissão (%)", "Cálculo exato e automático do pagamento"],
    button: "Aba 'Equipe' ➔ '+ Novo Profissional'",
    image: "pixar_female_host_1788749082734.jpg",
    duration: manifest.chapters[4].duration
  },
  {
    id: 6,
    title: "Fluxo da Agenda no Dia a Dia",
    narration: "...tudo acontece de forma muito simples na aba 'Agenda'! Você visualiza a fila de atendimentos do dia com filtros por profissional. Ao atender, basta tocar no agendamento para avançar o status de 'Agendado' para 'Em Atendimento' e depois 'Concluído', deixando a recepção sempre organizada. E no fim do expediente...",
    points: ["Aba 'Agenda' com visão diária e por profissional", "Status: Agendado ➔ Em Atendimento ➔ Concluído", "Fila organizada em tempo real"],
    button: "Aba 'Agenda' ➔ Status do Agendamento",
    image: "real_barber_client_1788749113025.jpg",
    duration: manifest.chapters[5].duration
  },
  {
    id: 7,
    title: "Controle de Caixa & Lucro",
    narration: "...o controle financeiro fica impecável! Na aba 'Caixa' e no 'Dashboard', você acompanha cada centavo recebido no Pix, cartão ou dinheiro vivo. O sistema separa sozinho a comissão dos profissionais e o lucro líquido do salão, sem você precisar quebrar a cabeça com planilhas. E para fechar com chave de ouro...",
    points: ["Aba 'Caixa' e 'Dashboard' em tempo real", "Entradas por Pix, Cartão e Dinheiro", "Separação automática: comissão vs lucro do salão"],
    button: "Aba 'Caixa' ➔ Painel Financeiro",
    image: "real_salon_people_1788749097357.jpg",
    duration: manifest.chapters[6].duration
  },
  {
    id: 8,
    title: "Robô Automático & Instalação",
    narration: "...o nosso robô automático cuida dos lembretes no WhatsApp e e-mail dos clientes! E você ainda pode instalar este aplicativo direto na tela inicial do seu celular, seja no Android ou no iPhone, em menos de dois cliques. Muito obrigada, eu sou a Luna e desejo muito sucesso e agenda cheia para o seu salão no Agenda Mais Fácil!",
    points: ["Robô de despacho automático por WhatsApp e E-mail", "Instale no Android (Chrome ➔ Instalar)", "Instale no iPhone (Safari ➔ Tela de Início)"],
    button: "Robô de Despacho & Instalação",
    image: "pixar_female_host_1788749082734.jpg",
    duration: manifest.chapters[7].duration
  }
];

const imgDir = path.resolve(process.cwd(), "src/assets/images");
const tmpDir = path.resolve(process.cwd(), "scripts/tmp_slides");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Pre-read images as base64
const lunaBase64 = fs.readFileSync(path.join(imgDir, "pixar_female_host_1788749082734.jpg")).toString("base64");
const imagesBase64 = {
  "pixar_female_host_1788749082734.jpg": lunaBase64,
  "real_salon_people_1788749097357.jpg": fs.readFileSync(path.join(imgDir, "real_salon_people_1788749097357.jpg")).toString("base64"),
  "real_barber_client_1788749113025.jpg": fs.readFileSync(path.join(imgDir, "real_barber_client_1788749113025.jpg")).toString("base64")
};

console.log("Generating 8 high-definition slide images with 'Agenda Mais Fácil' branding...");

function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

chapters.forEach((ch, idx) => {
  const featImgBase64 = imagesBase64[ch.image];
  const escapedTitle = escapeXml(ch.title);
  const escapedButton = escapeXml(ch.button);
  const escapedNarration = escapeXml(ch.narration);

  const svg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#020617" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <clipPath id="imgClip">
      <rect x="50" y="85" width="530" height="530" rx="24" />
    </clipPath>
    <clipPath id="avatarClip">
      <rect x="660" y="525" width="70" height="70" rx="16" />
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1280" height="720" fill="url(#bgGrad)" />

  <!-- Top Branding Header Bar -->
  <rect x="0" y="0" width="1280" height="65" fill="#0f172a" fill-opacity="0.95" />
  <line x1="0" y1="65" x2="1280" y2="65" stroke="#1e293b" stroke-width="1.5" />

  <!-- Logo Scissor Box -->
  <rect x="50" y="15" width="36" height="36" rx="8" fill="#e11d48" />
  <text x="59" y="40" fill="#ffffff" font-size="20" font-family="Liberation Sans, sans-serif" font-weight="bold">✂</text>

  <!-- App Name & Official Tutorial Badge -->
  <text x="96" y="40" fill="#ffffff" font-size="20" font-family="Liberation Sans, sans-serif" font-weight="900" letter-spacing="1">AGENDA MAIS FÁCIL</text>
  <text x="320" y="40" fill="#f43f5e" font-size="15" font-family="Liberation Sans, sans-serif" font-weight="bold">• VÍDEO TUTORIAL OFICIAL</text>
  
  <text x="1230" y="40" text-anchor="end" fill="#94a3b8" font-size="14" font-family="Liberation Sans, sans-serif" font-weight="bold">VOZ NATURAL DA LUNA • DISNEY PIXAR 3D</text>

  <!-- Left Main Visual Image -->
  <image x="50" y="85" width="530" height="530" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${featImgBase64}" clip-path="url(#imgClip)" />
  <rect x="50" y="85" width="530" height="530" rx="24" fill="none" stroke="#e11d48" stroke-width="3" />

  <!-- If Host Image, add subtle Phone badge -->
  ${ch.image.includes('pixar_female_host') ? `
    <rect x="70" y="555" width="260" height="42" rx="12" fill="#0f172a" fill-opacity="0.95" stroke="#f43f5e" stroke-width="1.5" />
    <text x="85" y="582" fill="#ffffff" font-size="14" font-family="Liberation Sans, sans-serif" font-weight="bold">📱 App Agenda Mais Fácil</text>
  ` : ''}

  <!-- Right Content Card -->
  <rect x="610" y="85" width="620" height="530" rx="24" fill="#0f172a" fill-opacity="0.95" stroke="#e11d48" stroke-opacity="0.5" stroke-width="2" />

  <!-- Chapter Tag -->
  <text x="650" y="135" fill="#f43f5e" font-size="20" font-family="Liberation Sans, sans-serif" font-weight="bold" letter-spacing="1.5">BLOCO ${ch.id} DE 8  •  FLUXO DINÂMICO</text>

  <!-- Chapter Title -->
  <text x="650" y="185" fill="#ffffff" font-size="32" font-family="Liberation Sans, sans-serif" font-weight="900">${escapedTitle}</text>

  <!-- Button Focus Box -->
  <rect x="650" y="215" width="540" height="60" rx="14" fill="#881337" stroke="#f43f5e" stroke-width="2"/>
  <text x="675" y="252" fill="#ffe4e6" font-size="19" font-family="Liberation Sans, sans-serif" font-weight="bold">🎯 Ação: ${escapedButton}</text>

  <!-- Key Bullet Points -->
  ${ch.points.map((pt, i) => `
    <text x="655" y="${325 + i * 50}" fill="#22c55e" font-size="22" font-family="Liberation Sans, sans-serif" font-weight="bold">✓</text>
    <text x="690" y="${325 + i * 50}" fill="#e2e8f0" font-size="20" font-family="Liberation Sans, sans-serif" font-weight="bold">${escapeXml(pt)}</text>
  `).join("")}

  <!-- Hostess Signature Badge -->
  <image x="660" y="525" width="70" height="70" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${lunaBase64}" clip-path="url(#avatarClip)" />
  <rect x="660" y="525" width="70" height="70" rx="16" fill="none" stroke="#f43f5e" stroke-width="2"/>

  <text x="745" y="555" fill="#fb7185" font-size="17" font-family="Liberation Sans, sans-serif" font-weight="bold">Luna • Apresentadora Especialista</text>
  <text x="745" y="578" fill="#94a3b8" font-size="14" font-family="Liberation Sans, sans-serif">Agenda Mais Fácil Salão • Voz Natural Humanizada</text>

  <!-- Subtitle Quote Bar at the very bottom -->
  <rect x="50" y="635" width="1180" height="60" rx="16" fill="#030712" fill-opacity="0.9" stroke="#1e293b" stroke-width="1.5"/>
  <text x="80" y="670" fill="#cbd5e1" font-size="15" font-family="Liberation Sans, sans-serif" font-weight="500">
    &quot;${escapedNarration.slice(0, 150)}...&quot;
  </text>
</svg>
`;

  const svgPath = path.join(tmpDir, `slide_${idx + 1}.svg`);
  const pngPath = path.join(tmpDir, `slide_${idx + 1}.png`);
  fs.writeFileSync(svgPath, svg);
  execSync(`ffmpeg -v error -i "${svgPath}" -vf "scale=1280:720" -y "${pngPath}"`);
  console.log(`Rendered slide ${idx + 1} of 8 (${ch.duration.toFixed(2)}s)`);
});

// Build concat list for ffmpeg with exact chapter audio durations
let concatTxt = "";
chapters.forEach((ch, idx) => {
  const pngPath = path.join(tmpDir, `slide_${idx + 1}.png`);
  concatTxt += `file '${pngPath}'\nduration ${ch.duration.toFixed(3)}\n`;
});
// Repeat last frame so ffmpeg does not drop it
concatTxt += `file '${path.join(tmpDir, `slide_8.png`)}'\n`;

const concatPath = path.join(tmpDir, "concat.txt");
fs.writeFileSync(concatPath, concatTxt);

const masterAudioPath = path.resolve(process.cwd(), "public/tutorial_audio/master_narration.mp3");
const finalMp4Path = path.join(imgDir, "video_tutorial_agende_mais_facil_luna.mp4");

console.log("Compiling official MP4 video with H.264 video and synchronized natural voice AAC audio...");

// Mux video slides with real master audio narration
execSync(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -i "${masterAudioPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "${finalMp4Path}"`);

console.log("Official MP4 created successfully at:", finalMp4Path);
const stat = fs.statSync(finalMp4Path);
console.log("File size in MB:", (stat.size / (1024 * 1024)).toFixed(2));
