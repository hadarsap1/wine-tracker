import { env } from "@config/env";

interface VisionResponse {
  fullText: string;
  locale: string;
  error?: string;
}

export async function detectText(imageUri: string): Promise<VisionResponse> {
  const apiKey = env.googleCloudVisionApiKey;
  if (!apiKey) {
    return { fullText: "", locale: "", error: "Google Cloud Vision API key is not configured" };
  }

  // Convert image to base64
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = result.split(",")[1] ?? result;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "TEXT_DETECTION" }],
      },
    ],
  };

  const apiResponse = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    return { fullText: "", locale: "", error: `Vision API error: ${apiResponse.status} ${errorText}` };
  }

  const data = await apiResponse.json();
  const annotations = data.responses?.[0]?.textAnnotations;

  if (!annotations || annotations.length === 0) {
    return { fullText: "", locale: "", error: "No text detected in image" };
  }

  return {
    fullText: annotations[0].description ?? "",
    locale: annotations[0].locale ?? "",
  };
}
