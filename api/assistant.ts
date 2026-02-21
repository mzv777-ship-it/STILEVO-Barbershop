import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {

  const key = process.env.GOOGLE_API_KEY;

  // Проверяем, есть ли ключ
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_API_KEY_NOT_FOUND" });
  }

  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body ?? {};

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message || "Скажи: OK"
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI не зміг відповісти";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      error: "FUNCTION_CRASHED",
      details: String(error)
    });
  }
}
