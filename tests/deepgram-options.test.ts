import { describe, expect, it } from "vitest";
import {
  buildDeepgramListenUrl,
  getDeepgramStreamingConfig,
} from "@/lib/deepgram/options";

describe("Deepgram streaming option mapping", () => {
  it("maps Nova-3 to Listen v1 with safe string query options", () => {
    const config = getDeepgramStreamingConfig("nova-3");

    expect(config).toMatchObject({
      listenVersion: "v1",
      endpoint: "/v1/listen",
      sampleRate: 16000,
      query: {
        model: "nova-3",
        language: "en",
        punctuate: "true",
        smart_format: "true",
        interim_results: "true",
        diarize: "true",
      },
    });
  });

  it("maps Nova-3 multilingual to the Nova-3 model with multi language", () => {
    const config = getDeepgramStreamingConfig("nova-3-multilingual");

    expect(config?.query).toMatchObject({
      model: "nova-3",
      language: "multi",
    });
  });

  it("maps Flux to Listen v2 without v1-only options", () => {
    const config = getDeepgramStreamingConfig("flux");

    expect(config).toMatchObject({
      listenVersion: "v2",
      endpoint: "/v2/listen",
      query: {
        model: "flux-general-en",
        encoding: "linear16",
        sample_rate: "16000",
      },
    });
    expect(config?.query).not.toHaveProperty("diarize");
    expect(config?.query).not.toHaveProperty("interim_results");
  });

  it("builds a browser websocket URL for the selected option", () => {
    const config = getDeepgramStreamingConfig("nova-3");

    expect(config).not.toBeNull();
    const url = new URL(buildDeepgramListenUrl(config!));

    expect(url.origin).toBe("wss://api.deepgram.com");
    expect(url.pathname).toBe("/v1/listen");
    expect(url.searchParams.get("model")).toBe("nova-3");
    expect(url.searchParams.get("encoding")).toBe("linear16");
  });

  it("does not expose Deepgram models without a runtime adapter", () => {
    expect(getDeepgramStreamingConfig("nova-2")).toBeNull();
  });
});
