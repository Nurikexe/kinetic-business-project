# OpenRouter — Gemma API Usage

Package: `@openrouter/sdk`  
API key env var: `VITE_OPENROUTER_API_KEY` (stored in `.env.local`)  
Model: `google/gemma-3-4b-it:free`

## Streaming with vision (text + image)

```ts
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY
});

const stream = await openrouter.chat.send({
  model: "google/gemma-3-4b-it:free",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        { type: "image_url", image_url: { url: "https://..." } }
      ]
    }
  ],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

## Notes
- Use `openrouter.chat.send` for streaming (not `.completions.create`)
- Supports multimodal messages: text + image_url in the same content array
- Free tier model: `google/gemma-3-4b-it:free`
