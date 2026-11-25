export function speakPhrase(
  text: string,
  language: 'english' | 'french',
  rate = 0.95,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = language === 'french' ? 'fr-FR' : 'en-GB';
    utterance.lang = targetLang;
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const matched =
      voices.find((v) => v.lang.toLowerCase().startsWith(language === 'french' ? 'fr' : 'en-gb')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(language === 'french' ? 'fr' : 'en'));
    if (matched) utterance.voice = matched;

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
