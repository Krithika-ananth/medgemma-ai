// src/hooks/useVoice.js - FIXED: no more word repetition
import { useState, useRef, useCallback } from "react";

const langCodeMap = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
};

export function useVoice(language = "en") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef(""); // tracks only final words

  const startListening = useCallback(() => {
    setError("");
    finalTranscriptRef.current = "";

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Please use Google Chrome browser for voice input.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = langCodeMap[language] || "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError("");
      };

      recognition.onresult = (event) => {
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            // Only add final results to the permanent transcript
            finalTranscriptRef.current += result[0].transcript + " ";
          } else {
            // Show interim (in-progress) text temporarily
            interimText += result[0].transcript;
          }
        }

        // Show final + current interim (interim shown in grey ideally)
        setTranscript(finalTranscriptRef.current + interimText);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "aborted") return;
        switch (event.error) {
          case "not-allowed":
            setError("Microphone blocked! In Chrome, click 🔒 in address bar → Allow microphone.");
            break;
          case "no-speech":
            setError("No speech detected. Speak clearly and try again.");
            break;
          case "network":
            setError("Voice needs internet + Chrome browser. Please type symptoms instead.");
            break;
          case "audio-capture":
            setError("No microphone detected. Please plug in a microphone.");
            break;
          default:
            setError("Voice error. Please type your symptoms in the box below.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // When recording ends, set final clean transcript
        setTranscript(finalTranscriptRef.current.trim());
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError("Could not start voice. Please type your symptoms.");
      setIsListening(false);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript(finalTranscriptRef.current.trim());
  }, []);

  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setError("");
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Split long text into sentences for smoother speech
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let index = 0;

    const speakNext = () => {
      if (index >= sentences.length) return;
      const utt = new SpeechSynthesisUtterance(sentences[index]);
      utt.lang = langCodeMap[language] || "en-IN";
      utt.rate = 0.85;
      utt.pitch = 1.0;
      utt.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const langCode = langCodeMap[language] || "en-IN";
      const langPrefix = langCode.split("-")[0];
      const voice =
        voices.find((v) => v.lang === langCode) ||
        voices.find((v) => v.lang.startsWith(langPrefix)) ||
        null;
      if (voice) utt.voice = voice;

      utt.onend = () => { index++; speakNext(); };
      window.speechSynthesis.speak(utt);
    };

    speakNext();
  }, [language]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setTranscript,
    clearTranscript,
  };
}