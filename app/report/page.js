"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { categories } from "../../lib/categories";
import SiteFooter from "../../components/SiteFooter";
import SiteNav from "../../components/SiteNav";

const scriptLanguageCodes = new Set(["ta", "te", "bn", "gu", "kn", "ml", "pa", "or"]);
// Devanagari has no reliable JS word-boundary behavior for these scripts, so
// match Marathi markers without using \b. They are used only to disambiguate
// Marathi from Hindi when Whisper returns an uncertain Devanagari result.
const marathiSignals = /(आहे|आणि|माझं|माझे|माझ्या|मला|तुम्ही|झालं|झाले|काय|याचा|याची|याबद्दल|तुमचा|तुमची|कुठे|करून|म्हणून|पाहिजे|नाहीतर|आहोत|होते|होईल)/u;
const categoryIcons = {
  fraud: <path d="M12 3 4.5 6v5.3c0 4.6 3.1 8.5 7.5 9.7 4.4-1.2 7.5-5.1 7.5-9.7V6L12 3Zm0 5v4m0 4h.01" />,
  hacked: <path d="M7 10V7a5 5 0 0 1 10 0v3m-12 0h14v10H5V10Zm7 4v2" />,
  harassment: <path d="M4 5h16v11H8l-4 4V5Zm5 5h.01M12 10h.01M15 10h.01" />,
  other: <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm-3 9h.01M12 12h.01M15 12h.01" />,
};

export default function ReportPage() {
  const router = useRouter();
  const [voiceState, setVoiceState] = useState("idle");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const transcriptRef = useRef([]);
  const languageRef = useRef(null);
  const languageEvidenceRef = useRef(null);
  const startedAtRef = useRef(null);
  const stateRef = useRef("idle");
  const cancelledRef = useRef(false);
  const finalizingRef = useRef(false);
  const capReachedRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceFrameRef = useRef(null);
  const silenceStartedAtRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");
  const speechAbortRef = useRef(null);

  const isLanguageCode = (value) => typeof value === "string" && /^[a-z]{2,3}(?:-[A-Z]{2})?$/i.test(value.trim());

  const inferLanguage = (text, whisperLanguage) => {
    const normalized = typeof text === "string" ? text : "";
    const scriptLanguage = /[\u0B80-\u0BFF]/u.test(normalized) ? "ta" : /[\u0C00-\u0C7F]/u.test(normalized) ? "te" : /[\u0980-\u09FF]/u.test(normalized) ? "bn" : /[\u0A80-\u0AFF]/u.test(normalized) ? "gu" : /[\u0C80-\u0CFF]/u.test(normalized) ? "kn" : /[\u0D00-\u0D7F]/u.test(normalized) ? "ml" : /[\u0A00-\u0A7F]/u.test(normalized) ? "pa" : /[\u0B00-\u0B7F]/u.test(normalized) ? "or" : null;
    if (scriptLanguage) return scriptLanguage;
    if (/[\u0900-\u097F]/u.test(normalized)) {
      if (marathiSignals.test(normalized)) return "mr";
      if (whisperLanguage === "mr" || whisperLanguage === "hi") return whisperLanguage;
      return languageRef.current === "mr" || languageRef.current === "hi" ? languageRef.current : "hi";
    }
    if (isLanguageCode(whisperLanguage)) return whisperLanguage.toLowerCase();
    if (/^[\s\p{P}\p{N}\p{ASCII}]*$/u.test(normalized) && normalized.trim()) return "en";
    return languageRef.current || null;
  };

  const setVoiceStatus = (next) => {
    stateRef.current = next;
    setVoiceState(next);
  };

  const clearRemoteAudio = () => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
  };

  const resetConversation = () => {
    clearRemoteAudio();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (silenceFrameRef.current) cancelAnimationFrame(silenceFrameRef.current);
    audioContextRef.current?.close?.();
    silenceFrameRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    silenceStartedAtRef.current = null;
    streamRef.current = null;
    mediaRecorderRef.current = null;
    transcriptRef.current = [];
    languageEvidenceRef.current = null;
    startedAtRef.current = null;
    capReachedRef.current = false;
    finalizingRef.current = false;
    cancelledRef.current = true;
    document.body.style.overflow = "";
    setFocused(false);
    setVoiceStatus("idle");
  };

  const navigateToCategory = (id) => {
    if (typeof window !== "undefined" && transcriptRef.current.length) {
      sessionStorage.setItem("cyber-report-conversation", JSON.stringify({ category: id, transcript: transcriptRef.current }));
    }
    resetConversation();
    router.push(`/report/${id}`);
  };

  const classify = async (turns, forceFinalize = false) => {
    const response = await fetch("/api/classify-conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: turns, categories, forceFinalize, language: languageRef.current || undefined }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Classification failed");
    return result;
  };

  const speakText = async (text, onComplete) => {
    // Keep the orb in its waiting state until the provider has returned the
    // first audio bytes; this makes network latency visible instead of
    // pretending that playback has already started.
    setVoiceStatus("thinking");
    clearRemoteAudio();
    const controller = new AbortController();
    speechAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30000);
    const fail = () => {
      if (cancelledRef.current || (controller.signal.aborted && !timedOut)) return;
      resetConversation();
      setError("The voice response failed. Please try again or pick an option above.");
    };

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: String(text), language: languageRef.current || "en" }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Speech generation failed");
      }

      if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported?.("audio/mpeg")) {
        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;
        const mediaSource = new MediaSource();
        const url = URL.createObjectURL(mediaSource);
        audioUrlRef.current = url;
        audio.src = url;
        await new Promise((resolve, reject) => {
          mediaSource.addEventListener("sourceopen", resolve, { once: true });
          mediaSource.addEventListener("error", () => reject(new Error("Audio stream failed")), { once: true });
        });
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        const reader = response.body.getReader();
        let started = false;
        let resolvePlayback;
        let rejectPlayback;
        const playbackFinished = new Promise((resolvePlaybackValue, rejectPlaybackValue) => {
          resolvePlayback = resolvePlaybackValue;
          rejectPlayback = rejectPlaybackValue;
        });
        audio.addEventListener("ended", resolvePlayback, { once: true });
        audio.addEventListener("error", () => rejectPlayback(new Error("Audio playback failed")), { once: true });
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await new Promise((resolve, reject) => {
            const append = () => {
              try {
                sourceBuffer.appendBuffer(value);
                sourceBuffer.addEventListener("updateend", resolve, { once: true });
              } catch (error) {
                reject(error);
              }
            };
            if (sourceBuffer.updating) sourceBuffer.addEventListener("updateend", append, { once: true });
            else append();
          });
          if (!started) {
            started = true;
            setVoiceStatus("speaking");
            audio.play().catch(rejectPlayback);
          }
        }
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
        if (!started) throw new Error("Empty audio response");
        await playbackFinished;
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const bufferedAudio = new Audio(url);
        audioRef.current = bufferedAudio;
        audioUrlRef.current = url;
        setVoiceStatus("speaking");
        await new Promise((resolve, reject) => {
          bufferedAudio.addEventListener("ended", resolve, { once: true });
          bufferedAudio.addEventListener("error", () => reject(new Error("Audio playback failed")), { once: true });
          bufferedAudio.play().catch(reject);
        });
      }

      if (!cancelledRef.current && !controller.signal.aborted) onComplete();
    } catch (error) {
      if (error?.name !== "AbortError" || timedOut) fail();
    } finally {
      clearTimeout(timeoutId);
      if (speechAbortRef.current === controller) speechAbortRef.current = null;
    }
  };

  const finishConversation = (categoryId, closingLine) => {
    if (!closingLine) return navigateToCategory(categoryId);
    speakText(closingLine, () => navigateToCategory(categoryId));
  };

  const forceFinalize = async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    try {
      const result = await classify(transcriptRef.current, true);
      if (cancelledRef.current) return;
      const categoryId = categories.some((category) => category.id === result.category) ? result.category : "other";
      finishConversation(categoryId, "Let's go ahead with what you've shared");
    } catch {
      setError("Something went wrong, please try again.");
      resetConversation();
      setError("Something went wrong, please try again.");
    }
  };

  const speakQuestion = (question) => {
    transcriptRef.current = [...transcriptRef.current, { role: "assistant", text: question }];
    speakText(question, () => (capReachedRef.current ? forceFinalize() : startListening()));
  };

  const processRecording = async (recorder) => {
    if (cancelledRef.current) return;
    setVoiceStatus("thinking");
    try {
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audio, "recording.webm");
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      const result = await response.json();
      if (cancelledRef.current) return;
      if (!response.ok) throw new Error(result.error || "Transcription failed");
      const detectedLanguage = inferLanguage(result.text || "", result.language);
      if (detectedLanguage) {
        languageRef.current = detectedLanguage;
        languageEvidenceRef.current = scriptLanguageCodes.has(detectedLanguage) ? "script" : result.language ? "whisper" : "inferred";
      }
      const userTurn = { role: "user", text: result.text || "" };
      transcriptRef.current = [...transcriptRef.current, userTurn];
      const force = capReachedRef.current || Date.now() - startedAtRef.current >= 120000;
      if (force) return forceFinalize();
      const classification = await classify(transcriptRef.current);
      if (cancelledRef.current) return;
      // For Devanagari, let the classifier resolve the Hindi/Marathi
      // ambiguity. For distinctive scripts such as Bengali or Gujarati,
      // preserve the deterministic script result over a model guess.
      if (isLanguageCode(classification.language) && languageEvidenceRef.current !== "script") {
        languageRef.current = classification.language.trim().toLowerCase();
      }
      if (classification.done && categories.some((category) => category.id === classification.category)) {
        return finishConversation(classification.category, classification.summary || "I understand what happened. I'll take you to the right page now.");
      }
      if (classification.question) speakQuestion(classification.question);
      else forceFinalize();
    } catch {
      setError("Something went wrong, please try again.");
      resetConversation();
      setError("Something went wrong, please try again.");
    }
  };

  const startListening = async () => {
    if (capReachedRef.current || finalizingRef.current) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is not supported");
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      chunksRef.current = [];
      silenceStartedAtRef.current = null;
      cancelledRef.current = false;
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
      recorder.onstop = () => processRecording(recorder);
      recorder.start();
      setVoiceStatus("listening");
      const samples = new Uint8Array(analyser.fftSize);
      const watchSilence = () => {
        if (stateRef.current !== "listening" || mediaRecorderRef.current !== recorder) return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const amplitude = (sample - 128) / 128;
          sum += amplitude * amplitude;
        }
        const volume = Math.sqrt(sum / samples.length);
        if (volume < 0.025) {
          silenceStartedAtRef.current ??= Date.now();
          // Allow natural pauses while the user gathers their thoughts.
          // End the turn only after four seconds of continuous silence.
          if (Date.now() - silenceStartedAtRef.current >= 3000) {
            stopListening();
            return;
          }
        } else {
          silenceStartedAtRef.current = null;
        }
        silenceFrameRef.current = requestAnimationFrame(watchSilence);
      };
      silenceFrameRef.current = requestAnimationFrame(watchSilence);
    } catch {
      if (cancelledRef.current) return;
      setError("Couldn't access the microphone");
      resetConversation();
      setError("Couldn't access the microphone");
    }
  };

  const stopListening = () => {
    if (silenceFrameRef.current) cancelAnimationFrame(silenceFrameRef.current);
    silenceFrameRef.current = null;
    silenceStartedAtRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close?.();
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const beginConversation = () => {
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    cancelledRef.current = false;
    setFocused(true);
    setVoiceStatus("listening");
    document.body.style.overflow = "hidden";
    startListening();
  };

  const handleOrbClick = () => {
    if (!focused) return beginConversation();
  };

  useEffect(() => {
    sessionStorage.removeItem("cyber-report-conversation");
  }, []);

  useEffect(() => {
    const timer = startedAtRef.current
      ? setTimeout(
          () => {
            capReachedRef.current = true;
            if (stateRef.current === "listening") stopListening();
          },
          Math.max(0, 120000 - (Date.now() - startedAtRef.current)),
        )
      : null;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [focused, voiceState]);

  useEffect(() => () => resetConversation(), []);

  const orbLabel = { idle: "Start talking", listening: "Stop recording", thinking: "Thinking", speaking: "Speaking" }[voiceState];

  return (
    <main className={`site-shell report-shell${focused ? " is-focused" : ""}`}>
      <SiteNav />
      <section className="report-content" aria-labelledby="report-heading">
        <div className="report-selection">
          <header className="report-header">
            <h1 id="report-heading">What happened?</h1>
            <p>Pick the option closest to your situation</p>
          </header>
          <div className="report-options" aria-label="Choose what happened">
            {categories.map((category) => (
              <article className="report-option" key={category.id}>
                <svg className="report-option-icon" viewBox="0 0 24 24" aria-hidden="true">
                  {categoryIcons[category.id]}
                </svg>
                <span className="report-option-content">
                  <span className="report-option-title">{category.title}</span>
                  <span className="report-option-description">{category.cardDescription}</span>
                </span>
                <a className="button button-outline" href={`/report/${category.id}`}>
                  Proceed
                </a>
              </article>
            ))}
          </div>
        </div>
        <div className="report-divider" />
        <section className="voice-card" aria-labelledby="voice-heading">
          {focused && (
            <button className="voice-close" type="button" aria-label="Cancel voice conversation" onClick={resetConversation}>
              ×
            </button>
          )}
          <div className="voice-orb-wrap">
            <div className={`voice-orb voice-orb-${voiceState}`} aria-hidden="true" />
            {voiceState === "idle" && (
              <button className="voice-button" type="button" aria-label={orbLabel} onClick={handleOrbClick}>
                <span className="voice-mic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0M12 18v4M8 22h8" />
                  </svg>
                </span>
              </button>
            )}
          </div>
          {voiceState !== "idle" && <span className="voice-state-text">{voiceState === "listening" ? "Listening..." : voiceState === "thinking" ? "Thinking..." : "Speaking..."}</span>}
          <h2 id="voice-heading">Talk it through</h2>
          <p>(Currently fluent with English & Hindi)</p>
          {error && (
            <p className="voice-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
