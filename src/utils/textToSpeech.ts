export const speakTicket = (ticketNumber: string, serviceName: string, clientName?: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech não suportado neste navegador');
    return;
  }

  // Cancela qualquer fala em andamento
  window.speechSynthesis.cancel();

  // Toca um beep antes de falar
  playBeep();

  // Aguarda um pouco após o beep
  setTimeout(() => {
    const text = clientName 
      ? `Senha ${ticketNumber}, ${clientName}, compareça ao atendimento de ${serviceName}`
      : `Senha ${ticketNumber}, compareça ao atendimento de ${serviceName}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }, 500);
};

const playBeep = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};
