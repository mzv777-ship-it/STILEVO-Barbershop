import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body ?? {};

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash
:generateContent?key=' +
        process.env.GOOGLE_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  contents: [
    {
      role: "user",
      parts: [
        {
          text:
            message ??
            "Ти AI-асистент барбершопу STILEVO. Відповідай коротко та по справі.",
        },
      ],
    },
  ],
}),

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'AI не зміг відповісти';

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'AI error', details: String(e) });
  }
}

