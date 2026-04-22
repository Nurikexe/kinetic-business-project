import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.0-flash-lite';

function getClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
  return new GoogleGenAI({ apiKey });
}

/**
 * Convert OpenAI-format messages array to a single contents string.
 * System messages are prepended to the first user message.
 */
function messagesToContents(messages) {
  const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
  const userParts = messages.filter(m => m.role !== 'system').map(m => {
    if (typeof m.content === 'string') return m.content;
    // multimodal: array of parts
    return m.content.map(p => (p.type === 'text' ? p.text : '')).join('');
  });

  const prefix = systemParts.length ? systemParts.join('\n\n') + '\n\n' : '';
  return prefix + userParts.join('\n');
}

/**
 * Stream a chat completion from Gemini.
 * Maintains the same API as the previous openrouter.js streamChat.
 * @param {Array} messages - OpenAI-format messages array
 * @param {function} onChunk - called with each text chunk as it arrives
 * @returns {Promise<string>} full response text
 */
export async function streamChat(messages, onChunk) {
  const ai = getClient();
  const contents = messagesToContents(messages);

  const response = await ai.models.generateContentStream({
    model: MODEL,
    contents,
  });

  let full = '';
  for await (const chunk of response) {
    const text = chunk.text ?? '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}

/**
 * One-shot (non-streaming) chat completion.
 */
export async function chat(messages) {
  const ai = getClient();
  const contents = messagesToContents(messages);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
  });

  return response.text ?? '';
}
