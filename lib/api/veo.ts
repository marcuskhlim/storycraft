import logger from "@/app/logger";
import { getRAIUserMessage } from "@/lib/utils/rai";
import { DEFAULT_SETTINGS } from "@/lib/ai-config";
import { withRetry } from "@/lib/utils/retry";
import { Storage } from "@google-cloud/storage";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const storage = new Storage();

const KIE_API_KEY = process.env.KIE_API_KEY;
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME; // recommended
const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI; // e.g. gs://bucket/path/

// --- Keep your existing response shape so your route does not change ---
interface GenerateVideoResponse {
  name: string;
  done: boolean;
  response: {
    "@type": "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse";
    videos: Array<{
      gcsUri: string;
      mimeType: string;
    }>;
    raiMediaFilteredReasons?: Array<string>;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function parseGsPrefix(gsPrefix: string) {
  // expected: gs://bucket/some/prefix/
  if (!gsPrefix.startsWith("gs://")) throw new Error(`GCS_VIDEOS_STORAGE_URI must start with gs://, got: ${gsPrefix}`);
  const without = gsPrefix.slice("gs://".length);
  const firstSlash = without.indexOf("/");
  const bucket = firstSlash === -1 ? without : without.slice(0, firstSlash);
  const prefix = firstSlash === -1 ? "" : without.slice(firstSlash + 1);
  return { bucket, prefix: prefix.endsWith("/") || prefix === "" ? prefix : `${prefix}/` };
}

async function copyTempVideoToGCS(tempUrl: string, destinationGsUri?: string) {
  const gsPrefix = requireEnv("GCS_VIDEOS_STORAGE_URI", GCS_VIDEOS_STORAGE_URI);
  const { bucket, prefix } = parseGsPrefix(gsPrefix);

  // If you prefer explicit bucket env var, you can override parsed bucket:
  const bucketName = GCS_BUCKET_NAME ?? bucket;

  const objectName = destinationGsUri
    ? destinationGsUri.replace(`gs://${bucketName}/`, "")
    : `${prefix}kie/${crypto.randomUUID()}.mp4`;

  const resp = await fetch(tempUrl);
  if (!resp.ok || !resp.body) {
    throw new Error(`Download temp video failed: HTTP ${resp.status}`);
  }

  const contentType = resp.headers.get("content-type") ?? "video/mp4";
  const file = storage.bucket(bucketName).file(objectName);

  const writeStream = file.createWriteStream({
    resumable: false,
    metadata: { contentType },
  });

  const nodeReadable = Readable.fromWeb(resp.body as any);
  await pipeline(nodeReadable, writeStream);

  return `gs://${bucketName}/${objectName}`;
}

// --- Kie API types ---
type KieCreateTaskResponse = {
  code: number;
  msg?: string;
  message?: string;
  data?: { taskId?: string };
};

type KieRecordInfoResponse = {
  code: number;
  message: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "queuing" | "generating" | "success" | "fail";
    resultJson: string; // stringified JSON containing resultUrls on success
    failCode: string;
    failMsg: string;
  };
};

async function kieCreateTask(prompt: string, aspectRatio: string, durationSeconds: number): Promise<string> {
  const apiKey = requireEnv("KIE_API_KEY", KIE_API_KEY);

  const aspect_ratio = aspectRatio === "9:16" ? "portrait" : "landscape";

  // Kie uses n_frames as a string in examples; map seconds->string as a default.
  // Adjust if Kie expects discrete frame counts rather than seconds.
  const n_frames = String(durationSeconds);

  const res = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sora-2-text-to-video",
      input: {
        prompt,
        aspect_ratio,
        n_frames,
        remove_watermark: true,
      },
    }),
  });

  const json = (await res.json()) as KieCreateTaskResponse;

  if (!res.ok) {
    throw new Error(`Kie createTask HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  const taskId = json?.data?.taskId;
  if (!taskId) {
    throw new Error(`Kie createTask unexpected response: ${JSON.stringify(json)}`);
  }

  return taskId;
}

async function kieRecordInfo(taskId: string): Promise<KieRecordInfoResponse> {
  const apiKey = requireEnv("KIE_API_KEY", KIE_API_KEY);

  const res = await fetch(
    `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  const json = (await res.json()) as KieRecordInfoResponse;

  if (!res.ok) {
    throw new Error(`Kie recordInfo HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

// --- Keep the exported names/signatures so your route file can stay as-is ---

export async function generateSceneVideo(
  prompt: string,
  imageGcsUri: string, // unused for text-to-video; kept for compatibility
  aspectRatio: string = "16:9",
  model: string = DEFAULT_SETTINGS.videoModel, // ignored; kept for compatibility
  generateAudio: boolean = DEFAULT_SETTINGS.generateAudio, // ignored
  durationSeconds: number = 8,
): Promise<string> {
  const modifiedPrompt = prompt + "\nSubtitles: off";
  logger.debug(`kie model: sora-2-text-to-video`);

  return withRetry(
    async () => {
      const taskId = await kieCreateTask(modifiedPrompt, aspectRatio, durationSeconds);
      return taskId;
    },
    { maxRetries: 5 },
  );
}

export async function waitForOperation(
  operationName: string, // this is now taskId, but caller doesn't need to know
  model: string = DEFAULT_SETTINGS.videoModel,
): Promise<GenerateVideoResponse> {
  const taskId = operationName;
  let intervalMs = 2500;
  const maxIntervalMs = 15000;
  const timeoutMs = 15 * 60 * 1000;
  const start = Date.now();

  while (true) {
    logger.debug(`poll task ${taskId}`);

    if (Date.now() - start > timeoutMs) {
      throw new Error("Video generation timed out.");
    }

    const info = await kieRecordInfo(taskId);
    const { state, failMsg, resultJson } = info.data;

    if (state === "fail") {
      // Map to your user-friendly message style
      throw new Error(getRAIUserMessage(failMsg || "Video generation failed"));
    }

    if (state === "success") {
      // resultJson looks like: {"resultUrls":["https://...mp4"]} (string)
      let tempUrl: string | undefined;
      try {
        const parsed = JSON.parse(resultJson);
        tempUrl = parsed?.resultUrls?.[0];
      } catch {
        // ignore
      }
      if (!tempUrl) {
        throw new Error(`Task succeeded but missing resultUrls: ${resultJson}`);
      }

      const gcsUri = await copyTempVideoToGCS(tempUrl);

      const resp: GenerateVideoResponse = {
        name: taskId,
        done: true,
        response: {
          "@type": "type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse",
          videos: [{ gcsUri, mimeType: "video/mp4" }],
        },
      };

      return resp;
    }

    await delay(intervalMs);
    intervalMs = Math.min(Math.floor(intervalMs * 1.25), maxIntervalMs);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
