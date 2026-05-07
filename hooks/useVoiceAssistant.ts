"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";

export type VoiceState = "off" | "idle" | "awake" | "dictating" | "processing" | "speaking";

export type VoiceFolder = { id: string; name: string; parentId: string | null };

export type UseVoiceAssistantOptions = {
  folders: VoiceFolder[];
  editorViewRef: React.MutableRefObject<EditorView | null>;
  onCreateNote: (title: string, folderId: string | null) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onAskQuestion: (question: string) => Promise<string>;
};

// --- wake / stop detection ---
const WAKE_PATTERNS = [
  "hey eternal",
  "hey a turn all",
  "hey turn all",
  "hey attorney",
  "hey internal",
];

// Phrases that end a conversation and return to wake-word listening
const CONVO_END_PHRASES = [
  "goodbye", "bye", "end conversation", "stop talking",
  "that's all", "thats all", "i'm done", "im done",
];

const STOP_PHRASES = ["hey eternal done", "hey eternal stop", "hey eternal finish", "stop dictating", "finish dictating", "done dictating"];
const CREATE_NOTE_RE = /(?:create|make|new)\s+(?:a\s+)?note\s+called\s+(.+?)(?:\s+in\s+(?:the\s+)?(.+?)\s+folder)?$/i;
const CREATE_FOLDER_RE = /(?:create|make|new)\s+(?:a\s+)?folder\s+called\s+(.+?)(?:\s+in\s+(?:the\s+)?(.+?)\s+folder)?$/i;

const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

function detectWakeWord(lower: string): { found: boolean; afterWake: string } {
  for (const pattern of WAKE_PATTERNS) {
    const idx = lower.indexOf(pattern);
    if (idx !== -1) {
      return { found: true, afterWake: lower.slice(idx + pattern.length).trim() };
    }
  }
  return { found: false, afterWake: "" };
}

function matchFolder(hint: string, folders: VoiceFolder[]): VoiceFolder | null {
  const h = hint.toLowerCase().trim();
  return (
    folders.find((f) => f.name.toLowerCase() === h) ??
    folders.find((f) => f.name.toLowerCase().includes(h)) ??
    null
  );
}

function checkAvailability(): string | null {
  if (typeof window === "undefined") return "Not available server-side.";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
    return "Your browser doesn't support speech recognition. Try Chrome or Edge.";
  }
  if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
    return "Voice assistant requires HTTPS. Open the app over a secure connection.";
  }
  return null;
}

function browserSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel")
    );
    if (preferred) utter.voice = preferred;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("off");
  const [statusText, setStatusText] = useState("");
  const [interimText, setInterimText] = useState("");

  const voiceStateRef = useRef<VoiceState>("off");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  // When true, after speaking we stay in conversation (awake) rather than idle
  const conversationModeRef = useRef(false);
  const dictationBufferRef = useRef("");
  const dictationPosRef = useRef<number>(0);

  // ── Return to the right listening state after a turn ─────────────────────
  const returnToListening = useCallback(() => {
    if (conversationModeRef.current) {
      setVoiceState("awake");
      voiceStateRef.current = "awake";
      setStatusText("Go ahead…");
    } else {
      setVoiceState("idle");
      voiceStateRef.current = "idle";
      setStatusText("Listening for Hey Eternal…");
    }
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    setVoiceState("speaking");
    voiceStateRef.current = "speaking";
    setStatusText("");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          void audio.play();
        });
      } else {
        await browserSpeak(text);
      }
    } catch {
      await browserSpeak(text);
    }

    if (voiceStateRef.current === "speaking") {
      returnToListening();
    }
  }, [returnToListening]);

  // ── Editor insertion ─────────────────────────────────────────────────────
  const insertText = useCallback((text: string) => {
    const view = optionsRef.current.editorViewRef.current;
    if (!view || !text.trim()) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: text },
      selection: { anchor: pos + text.length }
    });
    dictationPosRef.current = pos + text.length;
  }, []);

  // ── Command / question handler ────────────────────────────────────────────
  const handleCommand = useCallback(async (raw: string) => {
    const text = raw.trim().toLowerCase().replace(/^[.,!?]+|[.,!?]+$/g, "");
    const { folders, onCreateNote, onCreateFolder, onAskQuestion } = optionsRef.current;

    setVoiceState("processing");
    voiceStateRef.current = "processing";

    // Create note
    const noteMatch = text.match(CREATE_NOTE_RE);
    if (noteMatch) {
      const title = noteMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      const folderHint = noteMatch[2]?.trim();
      let folderId: string | null = null;
      let folderConfirm = "";

      if (folderHint) {
        const matched = matchFolder(folderHint, folders);
        if (matched) {
          folderId = matched.id;
          folderConfirm = ` in ${matched.name}`;
        } else {
          await speak(`I couldn't find a folder called ${folderHint}. Creating in the current location.`);
        }
      }

      await onCreateNote(title, folderId);
      conversationModeRef.current = false; // pause conversation during dictation
      await speak(`Note "${title}" created${folderConfirm}. Dictate now. Say Hey Eternal done when finished.`);

      const view = optionsRef.current.editorViewRef.current;
      dictationPosRef.current = view ? view.state.doc.length : 0;
      dictationBufferRef.current = "";
      setVoiceState("dictating");
      voiceStateRef.current = "dictating";
      setStatusText("Dictating… say 'Hey Eternal done' to finish");
      return;
    }

    // Create folder
    const folderMatch = text.match(CREATE_FOLDER_RE);
    if (folderMatch) {
      const name = folderMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      const parentHint = folderMatch[2]?.trim();
      let parentId: string | null = null;
      if (parentHint) {
        const matched = matchFolder(parentHint, folders);
        if (matched) parentId = matched.id;
      }
      onCreateFolder(name, parentId);
      await speak(`Folder ${name} created.`);
      returnToListening();
      return;
    }

    // Everything else → send to RAG as a question/chat
    setStatusText("Thinking…");
    try {
      const answer = await onAskQuestion(raw.trim());
      const short = answer.length > 500 ? answer.slice(0, 500).replace(/\s\S+$/, "") + "…" : answer;
      await speak(short);
    } catch {
      await speak("Sorry, I couldn't get an answer right now.");
    }
    // speak() calls returnToListening() on its own
  }, [speak, insertText, returnToListening]);

  // ── Transcript handler ────────────────────────────────────────────────────
  const handleTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    const lower = transcript.toLowerCase().trim();
    const state = voiceStateRef.current;

    // ── DICTATING ────────────────────────────────────────────────────────
    if (state === "dictating") {
      if (STOP_PHRASES.some((p) => lower.includes(p))) {
        setInterimText("");
        await speak("Got it. Note saved.");
        // Resume conversation if it was active before dictation started
        returnToListening();
        return;
      }
      if (isFinal) {
        const toInsert = transcript.trim() + " ";
        insertText(toInsert);
        dictationBufferRef.current += toInsert;
        setInterimText("");
      } else {
        setInterimText(transcript);
      }
      return;
    }

    // ── IDLE — waiting for wake word ──────────────────────────────────────
    if (state === "idle") {
      const { found, afterWake } = detectWakeWord(lower);
      if (!found) return;

      // Start conversation mode
      conversationModeRef.current = true;

      if (afterWake.length > 2) {
        // Full command in the same utterance as wake word
        const wakePattern = WAKE_PATTERNS.find((p) => lower.includes(p)) ?? "hey eternal";
        const origIdx = transcript.toLowerCase().indexOf(wakePattern);
        const afterInOrig = origIdx !== -1
          ? transcript.slice(origIdx + wakePattern.length).trim()
          : afterWake;
        void handleCommand(afterInOrig);
      } else {
        setVoiceState("awake");
        voiceStateRef.current = "awake";
        setStatusText("Go ahead…");
        await speak("Yes?");
      }
      return;
    }

    // ── AWAKE — in conversation, waiting for next utterance ───────────────
    if (state === "awake") {
      if (!isFinal) {
        setInterimText(transcript);
        return;
      }
      setInterimText("");

      const words = lower.trim();
      if (words.length <= 2) return; // too short, ignore noise

      // End conversation on goodbye phrases
      if (CONVO_END_PHRASES.some((p) => words.includes(p))) {
        conversationModeRef.current = false;
        setVoiceState("idle");
        voiceStateRef.current = "idle";
        setStatusText("Listening for Hey Eternal…");
        await speak("Goodbye!");
        return;
      }

      void handleCommand(transcript.trim());
      return;
    }
  }, [handleCommand, speak, insertText, returnToListening]);

  // ── Speech recognition lifecycle ─────────────────────────────────────────
  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalText) void handleTranscript(finalText, true);
      else if (interim) void handleTranscript(interim, false);
    };

    rec.onend = () => {
      if (shouldRestartRef.current) {
        try { rec.start(); } catch { /* already started */ }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (FATAL_ERRORS.has(e.error)) {
        shouldRestartRef.current = false;
        setVoiceState("off");
        voiceStateRef.current = "off";
        const msg =
          e.error === "not-allowed" ? "Microphone access denied. Allow microphone in browser settings." :
          e.error === "service-not-allowed" ? "Speech recognition blocked — the app must be served over HTTPS." :
          "No microphone found or it is in use by another app.";
        setStatusText(msg);
        setInterimText("");
      }
      // no-speech / network / aborted are transient — let onend restart
    };

    try { rec.start(); } catch { /* ignore start race */ }
  }, [handleTranscript]);

  const enable = useCallback(() => {
    if (voiceStateRef.current !== "off") return;
    const problem = checkAvailability();
    if (problem) { setStatusText(problem); return; }
    shouldRestartRef.current = true;
    setVoiceState("idle");
    voiceStateRef.current = "idle";
    setStatusText("Listening for Hey Eternal…");
    startRecognition();
  }, [startRecognition]);

  const disable = useCallback(() => {
    shouldRestartRef.current = false;
    conversationModeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setVoiceState("off");
    voiceStateRef.current = "off";
    setStatusText("");
    setInterimText("");
  }, []);

  const toggle = useCallback(() => {
    if (voiceStateRef.current === "off") enable();
    else disable();
  }, [enable, disable]);

  useEffect(() => () => { disable(); }, [disable]);

  return { voiceState, statusText, interimText, toggle };
}
