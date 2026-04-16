import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/explain-dtcs
 *
 * Body: { dtcs: string[] }
 * Response: { explanation: string }
 *
 * Calls the OpenAI Chat Completions API server-side so the API key is never
 * shipped inside the mobile app bundle.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { dtcs } = req.body as { dtcs?: unknown };
  if (!Array.isArray(dtcs) || dtcs.length === 0 || !dtcs.every((d) => typeof d === 'string')) {
    res.status(400).json({ error: 'dtcs must be a non-empty array of strings' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured' });
    return;
  }

  const prompt =
    `You are a friendly automotive assistant. Explain the following OBD-II diagnostic trouble codes ` +
    `in plain English. For each code give: the code, a short name, what it means for the driver, and ` +
    `what the most common causes are. Be concise.\n\nCodes: ${dtcs.join(', ')}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    res.status(502).json({ error: `OpenAI error: ${err}` });
    return;
  }

  const data = (await openaiRes.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const explanation = data.choices[0]?.message?.content ?? '';
  res.status(200).json({ explanation });
}
