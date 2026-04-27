// src/utils/geminiService.js
const GEMINI_API_KEY =process.env.REACT_APP_GEMINI_API_KEY; 

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Try multiple models - if one is busy, tries next automatically
const FREE_MODELS = [
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const langMap = {
  en: "English",
  hi: "Hindi (हिंदी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
};

export async function analyzeSymptoms({ symptoms, age, gender, history, language }) {
  const langName = langMap[language] || "English";

  const prompt = `You are "Med Gemma AI", a multilingual healthcare assistant for rural users in India.
Respond ONLY in ${langName}. Use very simple words.

Patient:
- Age: ${age || "Unknown"}
- Gender: ${gender || "Unknown"}
- Medical History: ${history || "None"}
- Symptoms: ${symptoms}

Reply in this EXACT format in ${langName}:

Condition:
[likely condition in ${langName}]

Risk Level:
[ONLY write one: Low OR Medium OR High OR Emergency]

Explanation:
[3-4 simple sentences in ${langName}]

Suggested Medicines:
[2-3 OTC medicines in ${langName}]

Home Remedies:
[2-3 home remedies in ${langName}]

Food Advice - Eat:
[3-4 foods in ${langName}]

Food Advice - Avoid:
[3-4 foods in ${langName}]

Recommendation:
[clear advice in ${langName}]

Disclaimer:
[disclaimer in ${langName}]`;

  let lastError = "";

  for (const model of FREE_MODELS) {
    try {
      console.log("Trying:", model);
      const res = await fetch(
        `${BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message || "";
        const status = data?.error?.status || "";
        console.warn(`${model} failed:`, msg);
        lastError = msg;

        // High demand / quota / not found → try next model
        if (
          status === "RESOURCE_EXHAUSTED" ||
          status === "NOT_FOUND" ||
          msg.includes("quota") ||
          msg.includes("not found") ||
          msg.includes("deprecated") ||
          msg.includes("high demand") ||
          msg.includes("overloaded") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("503") ||
          res.status === 503 ||
          res.status === 429
        ) {
          // Wait 2 seconds before trying next model
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(msg);
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        console.warn(`${model} returned empty`);
        continue;
      }

      console.log("✅ Success:", model);
      return parseReport(text);

    } catch (err) {
      lastError = err.message;
      if (
        err.message?.includes("quota") ||
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("not found") ||
        err.message?.includes("high demand") ||
        err.message?.includes("overloaded")
      ) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    "All Gemini models are busy right now. Please wait 1-2 minutes and try again. " +
    "This is a temporary issue with Google's servers."
  );
}

function parseReport(raw) {
  const get = (label, stops) => {
    const stopArr = Array.isArray(stops) ? stops : [stops];
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(
      `(?:^|\\n)\\s*\\**\\s*${esc(label)}\\s*\\**[:\\-\\s]*([\\s\\S]*?)(?=\\n\\s*\\**\\s*(?:${stopArr.map(esc).join("|")})\\s*\\**[:\\-\\s]|$)`,
      "im"
    );
    return raw.match(rx)?.[1]?.trim() || "";
  };

  return {
    raw,
    condition:      get("Condition",          ["Risk Level", "Explanation"]),
    riskLevel:      get("Risk Level",         ["Explanation", "Suggested"]),
    explanation:    get("Explanation",         ["Suggested Medicines", "Home Remedies"]),
    medicines:      get("Suggested Medicines", ["Home Remedies", "Food"]),
    homeRemedies:   get("Home Remedies",       ["Food Advice", "Recommendation"]),
    eatFoods:       get("Food Advice - Eat",   ["Food Advice - Avoid", "Recommendation"]),
    avoidFoods:     get("Food Advice - Avoid", ["Recommendation", "Disclaimer"]),
    recommendation: get("Recommendation",      ["Disclaimer"]),
    disclaimer:     get("Disclaimer",          [""]),
  };
}
