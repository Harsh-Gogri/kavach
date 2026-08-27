import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: "Remote voice service is not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          // The multilingual model detects the language from the generated
          // text. Explicit language_code values are rejected for several
          // supported Indian languages by Flash, so omit it deliberately.
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.52,
            similarity_boost: 0.78,
            style: 0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok || !response.body) {
      const details = await response.text();
      let providerError;
      try {
        providerError = JSON.parse(details)?.detail;
      } catch {
        providerError = null;
      }
      if (providerError?.code === "paid_plan_required") {
        return NextResponse.json(
          { error: "This voice is from the ElevenLabs Voice Library and cannot be used through the API on a free plan. Create a custom Voice Design voice and use its ID instead." },
          { status: 402 },
        );
      }
      return NextResponse.json(
        { error: "Remote speech generation failed", details: providerError?.message || details },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 },
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Speech route error:", error);
    return NextResponse.json({ error: "Unable to generate speech" }, { status: 500 });
  }
}
