// Web Audio API Sound Chimes (Completamente silencioso para evitar sons indesejados ao acessar o app)

class SoundEffects {
  // Sons desativados permanentemente para garantir acesso silencioso em todos os aparelhos
  public playBookingChime() {
    // Silenciado - nenhum som ao acessar ou conectar
  }

  public playMessagePing() {
    // Silenciado - nenhum som ao acessar ou conectar
  }

  public playAlertBell() {
    // Silenciado - nenhum som ao acessar ou conectar
  }
}

export const soundEffects = new SoundEffects();
