import crypto from "crypto";

export type CloudifyAssetUploadRequest = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string;
  kind: "preview" | "deliverable";
  listingId?: string;
};

export type CloudifySignedUpload = {
  uploadUrl: string;
  storageKey: string;
  headers: Record<string, string>;
};

export type CloudifySignedDownload = {
  downloadUrl: string;
  expiresAt: Date;
};

const CLOUDIFY_BASE_URL = process.env.CLOUDIFY_API_BASE ?? "https://cloud.flyingdarkdev.in/api/v1";

function getAuthHeaders() {
  const apiKey = process.env.CLOUDIFY_API_KEY;
  const apiSecret = process.env.CLOUDIFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Cloudify API credentials are not configured");
  }

  return {
    "X-API-KEY": apiKey,
    "X-API-SECRET": apiSecret,
    "Content-Type": "application/json",
  } satisfies Record<string, string>;
}

export async function requestSignedUpload(
  payload: CloudifyAssetUploadRequest
): Promise<CloudifySignedUpload> {
  const response = await fetch(`${CLOUDIFY_BASE_URL}/uploads/sign`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      checksum: payload.checksum ?? crypto.createHash("sha256").update(payload.fileName).digest("hex"),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudify signed upload request failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as CloudifySignedUpload;
  if (!data.uploadUrl || !data.storageKey) {
    throw new Error("Invalid response from Cloudify signed upload endpoint");
  }

  return data;
}

export async function requestSignedDownload(storageKey: string): Promise<CloudifySignedDownload> {
  const response = await fetch(`${CLOUDIFY_BASE_URL}/downloads/sign`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      storageKey,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudify signed download request failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as { downloadUrl: string; expiresAt: string };
  if (!data.downloadUrl || !data.expiresAt) {
    throw new Error("Invalid response from Cloudify signed download endpoint");
  }

  return {
    downloadUrl: data.downloadUrl,
    expiresAt: new Date(data.expiresAt),
  };
}