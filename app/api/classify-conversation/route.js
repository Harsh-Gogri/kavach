// import { NextResponse } from "next/server";
// import { categories } from "../../../lib/categories";

// const categoryIds = new Set(categories.map((category) => category.id));
// const languageNames = { en: "English", hi: "Hindi", mr: "Marathi", ta: "Tamil", bn: "Bengali", te: "Telugu" };

// export async function POST(request) {
//   if (!process.env.GROQ_API_KEY) {
//     return NextResponse.json({ error: "Classification service is not configured" }, { status: 500 });
//   }

//   try {
//     const body = await request.json();
//     const transcript = Array.isArray(body.transcript) ? body.transcript : [];
//     const forceFinalize = body.forceFinalize === true;
//     const languageCode = typeof body.language === "string" ? body.language : "";
//     const languageName = languageNames[languageCode];
//     const categoryContext = categories.map(({ id, title, cardDescription }) => ({ id, title, cardDescription }));
//     const prompt = forceFinalize ? "Choose the best-guess category now. You must return done true with one exact category id; do not ask a question." : "Return done true only when you understand the actual nature and outcome of what happened. Do not classify from one keyword, an early mention, a partial story, or by simply ruling out one category. Treat other/something else as a genuine last resort, only after exploring the situation and confirming that it truly does not fit fraud, hacked, or harassment. If a user's no or another ruled-out detail still leaves open what actually happened—for example, refusing to send money does not reveal whether the person later threatened, harassed, or simply stopped—ask specifically about what happened next or how it ended before deciding. If the story could plausibly develop into different categories, keep asking natural, focused follow-ups until the outcome is clear. If the message is only a greeting, small talk, or does not yet describe an incident, respond warmly and naturally in a brief conversational question that gently invites the user to share what happened, rather than sounding like a form or interrogation. Otherwise return done false with one short, human clarifying question.";
//     const outputShape = forceFinalize ? '{"done":true,"category":"id","summary":"brief spoken summary in the conversation language"}' : '{"done":true,"category":"id","summary":"brief spoken summary in the conversation language"} or {"done":false,"question":"one short question"}';

//     const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
//       body: JSON.stringify({
//         model: "openai/gpt-oss-120b",
//         temperature: 0.1,
//         response_format: { type: "json_object" },
//         messages: [
//           { role: "system", content: `You classify a citizen's cyber crime report. Valid categories are exactly: ${JSON.stringify(categoryContext)}. ${prompt} ${languageName ? `Write any question or summary in ${languageName}, matching the language of the conversation, not English.` : "Write any question or summary in the same language as the latest user turn, not English by default."} When done is true, summary must briefly say what you understood and that you are taking the user to the right page. Keep it natural and suitable for being spoken aloud. Respond only as JSON matching ${outputShape}.` },
//           { role: "user", content: JSON.stringify(transcript) },
//         ],
//       }),
//     });

//     if (!response.ok) {
//       const details = await response.text();
//       return NextResponse.json({ error: "Conversation classification failed", details }, { status: response.status >= 400 && response.status < 600 ? response.status : 502 });
//     }

//     const result = await response.json();
//     const parsed = JSON.parse(result.choices?.[0]?.message?.content || "{}");
//     if (parsed.done === true && categoryIds.has(parsed.category)) {
//       return NextResponse.json({
//         done: true,
//         category: parsed.category,
//         summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : "I understand what happened. I'll take you to the right page now.",
//       });
//     }
//     if (!forceFinalize && parsed.done === false && typeof parsed.question === "string" && parsed.question.trim()) return NextResponse.json({ done: false, question: parsed.question.trim() });
//     return NextResponse.json({
//       done: true,
//       category: categoryIds.has(parsed.category) ? parsed.category : "other",
//       summary: "I understand what happened. I'll take you to the right page now.",
//     });
//   } catch (error) {
//     console.error("Classification route error:", error);
//     return NextResponse.json({ error: "Unable to classify the conversation" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import { categories } from "../../../lib/categories";

const categoryIds = new Set(categories.map((category) => category.id));
const languageNames = {
  en: "English", hi: "Hindi", mr: "Marathi", gu: "Gujarati", ta: "Tamil", bn: "Bengali", te: "Telugu",
  kn: "Kannada", ml: "Malayalam", pa: "Punjabi", or: "Odia", ne: "Nepali", ur: "Urdu",
};

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Classification service is not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const transcript = Array.isArray(body.transcript) ? body.transcript : [];
    const forceFinalize = body.forceFinalize === true;
    const languageCode = typeof body.language === "string" ? body.language.trim().toLowerCase() : "";
    const languageName = languageNames[languageCode];
    const categoryContext = categories.map(({ id, title, cardDescription }) => ({ id, title, cardDescription }));

    const conversationRules = `
You are a warm, patient human intake guide—not a form, interrogator, or keyword classifier.

For every turn:
- Understand what the user is trying to say before deciding what to ask. Use the full transcript and latest answer; never repeat a generic question just because the story is short.
- If the user is greeting you or making small talk, respond warmly and invite them to share what they need help with. Do not ask "what happened next?" when no incident has been described.
- If the user says something random or unrelated, acknowledge it briefly and gently steer them back with a natural question such as "What would you like help with today?" Do not force an incident question onto unrelated conversation.
- If an incident is described, ask exactly one focused follow-up for the most important missing detail. Phrase it specifically from what the user just said.
- Do not classify from one keyword or from the opening of a story. Understand the actual nature and outcome, including what happened after a request, refusal, threat, or suspicious contact.
- A "no" answer rules out only the specific thing it answers; it does not prove the incident is over. Ask about the unresolved part only when there is one.
- Use "other" only as a genuine last resort after considering fraud, account misuse, and harassment and learning enough to know none fits.
- Only set done true when the situation is sufficiently clear to a reasonable human. Otherwise set done false and ask one short, relevant question (ideally under 20 words).
- Never default to Hindi because the user is speaking an Indian language. Detect the language from the latest user text and answer in that same language. Preserve the user's script; do not translate a question or summary into another language.
`;

    const promptMode = forceFinalize
      ? "FORCE FINALIZE MODE: choose the best-fit category ID now and set done true; do not ask a question."
      : "CONVERSATIONAL MODE: keep the exchange natural and gather only the missing information needed for a confident category.";

    const systemMessage = `You are a cybercrime intake triage expert classifying a citizen report.
Valid categories are strictly: ${JSON.stringify(categoryContext)}

${conversationRules}

${promptMode}

${languageName ? `For this turn, respond in ${languageName} (${languageCode}). This is the language instruction supplied by the speech layer. Do not translate the response into Hindi or English.` : languageCode ? `For this turn, respond in the language identified by ISO-639 code ${languageCode}. Do not translate the response into Hindi or English.` : "Detect the user's language from the latest user text and respond in that same language."}

Respond ONLY in JSON matching this exact structure:
If done is true: {"done": true, "category": "<valid_id>", "language": "<detected ISO-639 code>", "summary": "<spoken language summary>"}
If done is false: {"done": false, "language": "<detected ISO-639 code>", "question": "<one short natural reply or relevant question>"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: JSON.stringify(transcript) },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: "Conversation classification failed", details }, { status: response.status >= 400 && response.status < 600 ? response.status : 502 });
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices?.[0]?.message?.content || "{}");

    // Strictly validate parsed structure
    if (parsed.done === true && categoryIds.has(parsed.category)) {
      return NextResponse.json({
        done: true,
        category: parsed.category,
        language: typeof parsed.language === "string" ? parsed.language.trim().toLowerCase() : languageCode || null,
        summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : "I understand what happened. I'll take you to the right page now.",
      });
    }

    // Direct return for continuing intake
    if (!forceFinalize && parsed.done === false && typeof parsed.question === "string" && parsed.question.trim()) {
      return NextResponse.json({
        done: false,
        language: typeof parsed.language === "string" ? parsed.language.trim().toLowerCase() : languageCode || null,
        question: parsed.question.trim(),
      });
    }

    // Safety fallback: If forceFinalize is false and parsing failed, default to asking a generic follow-up instead of defaulting to "other"
    if (!forceFinalize) {
      return NextResponse.json({
        done: false,
        question: "Could you tell me what happened next or how the interaction ended?",
      });
    }

    return NextResponse.json({
      done: true,
      category: categoryIds.has(parsed.category) ? parsed.category : "other",
      summary: "I understand what happened. I'll take you to the right page now.",
    });
  } catch (error) {
    console.error("Classification route error:", error);
    return NextResponse.json({ error: "Unable to classify the conversation" }, { status: 500 });
  }
}
