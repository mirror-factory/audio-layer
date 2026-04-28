export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { getSettings, saveSettings } from "@/lib/settings";
import { MODEL_OPTIONS } from "@/lib/settings-shared";

const allowedSummaryModels = new Set(MODEL_OPTIONS.summary.map((option) => option.value));
const allowedBatchModels = new Set(MODEL_OPTIONS.batchSpeech.map((option) => option.value));
const allowedStreamingModels = new Set(MODEL_OPTIONS.streamingSpeech.map((option) => option.value));

const SettingsPatchSchema = z.object({
  summaryModel: z.string().refine((value) => allowedSummaryModels.has(value), "Unsupported summary model").optional(),
  batchSpeechModel: z.string().refine((value) => allowedBatchModels.has(value), "Unsupported batch speech model").optional(),
  streamingSpeechModel: z.string().refine((value) => allowedStreamingModels.has(value), "Unsupported streaming speech model").optional(),
}).strict();

export const GET = withRoute(async () => {
  const settings = await getSettings();
  return NextResponse.json(settings);
});

export const PUT = withRoute(async (req) => {
  let partial: z.infer<typeof SettingsPatchSchema>;
  try {
    partial = SettingsPatchSchema.parse(await req.json());
  } catch (err) {
    const zodErrors = err instanceof z.ZodError ? err.issues : null;
    return NextResponse.json(
      { error: zodErrors ?? "Invalid settings payload" },
      { status: 400 },
    );
  }

  const merged = await saveSettings(partial);
  return NextResponse.json(merged);
});
