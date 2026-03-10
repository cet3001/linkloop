const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";

interface OllamaTag {
  name?: string;
}

interface OllamaTagsResponse {
  models?: OllamaTag[];
}

export async function checkModelAvailable(modelName: string): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_TAGS_URL);
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as OllamaTagsResponse;
    const models = Array.isArray(data.models) ? data.models : [];
    return models.some((model) => model.name === modelName);
  } catch {
    return false;
  }
}
