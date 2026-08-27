import { NextResponse } from "next/server";

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Transcription service is not configured" }, { status: 500 });
  }

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    const language = incoming.get("language");

    if (!audio || typeof audio.arrayBuffer !== "function") {
      return NextResponse.json({ error: "An audio file is required" }, { status: 400 });
    }

    const groqForm = new FormData();
    groqForm.append("file", new Blob([await audio.arrayBuffer()], { type: audio.type || "audio/webm" }), audio.name || "recording.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "verbose_json");
    if (typeof language === "string" && language.trim()) groqForm.append("language", language.trim());

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: "Groq transcription failed", details }, { status: response.status >= 400 && response.status < 600 ? response.status : 502 });
    }

    const result = await response.json();
    return NextResponse.json({
      text: result.text || "",
      // Whisper metadata is advisory. The client treats it as a hint because
      // automatic detection can be wrong for some Indic languages.
      language: typeof result.language === "string" ? result.language : null,
    });
  } catch (error) {
    console.error("Transcription route error:", error);
    return NextResponse.json({ error: "Unable to transcribe the recording" }, { status: 500 });
  }
}
