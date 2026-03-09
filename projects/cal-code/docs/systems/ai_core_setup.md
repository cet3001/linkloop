# AI Core Setup (Local Ollama)

Cal Code AI Core defaults to local model execution through Ollama.

## 1) Install Ollama

Install Ollama for your operating system from:

[https://ollama.com/download](https://ollama.com/download)

After install, ensure the Ollama server is running:

```bash
ollama serve
```

By default, Cal Code connects to:

`http://localhost:11434`

## 2) Pull Required Models

```bash
ollama pull llama3
ollama pull deepseek-coder
ollama pull qwen2.5
ollama pull mistral
```

## 3) Run the AI Core Runtime Test

From the `cal-code/` root, run:

```bash
tsx scripts/test_ollama.ts
```

If your environment uses a different runner, execute the script with your TypeScript runtime of choice.

## 4) Optional: Override Ollama Host

If Ollama is not on localhost, set:

```bash
export OLLAMA_BASE_URL="http://<host>:11434"
```

The default remains local-first and does not use cloud APIs.
