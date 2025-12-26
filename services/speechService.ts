
export function speak(text: string, language: string) {
  // Cancel any ongoing speech to avoid overlapping
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);

  const langMap: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    bn: "bn-IN",
    ta: "ta-IN",
    te: "te-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    ur: "ur-PK"
  };

  utter.lang = langMap[language] || "en-IN";
  utter.rate = 0.9;
  utter.pitch = 1;

  // Error handling for synthesis
  utter.onerror = (event) => {
    console.error("SpeechSynthesisUtterance error", event);
  };

  window.speechSynthesis.speak(utter);
}
