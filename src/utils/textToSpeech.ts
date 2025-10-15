export const speakTicket = (ticketNumber: string, serviceName: string, clientName?: string) => {
  // Se já estiver falando, agenda esta chamada para depois que terminar
  if (speakingLock || window.speechSynthesis.speaking) {
    pendingSpeak = { ticketNumber, serviceName, clientName };
    return;
  }
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech não suportado neste navegador');
    return;
  }

  // Cancela qualquer fala em andamento para evitar sobreposição
  window.speechSynthesis.cancel();

  const upperName = clientName ? clientName.toUpperCase() : undefined;
  const text = upperName 
    ? `Senha ${ticketNumber}, ${upperName}, compareça ao atendimento de ${serviceName}`
    : `Senha ${ticketNumber}, compareça ao atendimento de ${serviceName}`;

  const makeUtterance = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    return utterance;
  };

  // Beep imediatamente, seguido do nome/serviço.
  // O beep só será reproduzido novamente após terminar de falar.
  speakingLock = true;
  playBeep();
  const utter = makeUtterance();
  utter.onend = () => {
    // Reproduz o beep novamente somente após finalizar a fala
    playBeep();
    speakingLock = false;
    // Executa chamada pendente, se existir
    if (pendingSpeak) {
      const next = pendingSpeak;
      pendingSpeak = null;
      // Pequeno atraso para evitar sobreposição
      setTimeout(() => speakTicket(next.ticketNumber, next.serviceName, next.clientName), 300);
    }
  };
  // Pequeno atraso para não sobrepor o início da fala ao beep
  setTimeout(() => {
    window.speechSynthesis.speak(utter);
  }, 350);
};

const playBeep = () => {
  const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  const audioContext = new AudioCtor();

  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0.0, now);
  gainNode.gain.linearRampToValueAtTime(0.7, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  // Dois tons suaves (sino): 700Hz seguido de 930Hz
  const tone = (freq: number, start: number, duration: number) => {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start(start);
    osc.stop(start + duration);
  };

  tone(700, now, 0.25);
  tone(930, now + 0.25, 0.25);
};
let speakingLock = false;
let pendingSpeak: null | { ticketNumber: string; serviceName: string; clientName?: string } = null;
