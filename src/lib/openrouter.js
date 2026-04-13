const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemma-3-4b-it:free';

function getKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY ?? '';
}

/**
 * Stream a chat completion from Gemma via OpenRouter.
 * @param {Array} messages - OpenAI-format messages array
 * @param {function} onChunk - called with each text chunk as it arrives
 * @returns {Promise<string>} full response text
 */
export async function streamChat(messages, onChunk) {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getKey()}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'KINETIC',
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          full += content;
          onChunk(content);
        }
      } catch {
        // ignore parse errors on partial chunks
      }
    }
  }
  return full;
}

/**
 * One-shot (non-streaming) chat completion.
 */
export async function chat(messages) {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getKey()}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'KINETIC',
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
