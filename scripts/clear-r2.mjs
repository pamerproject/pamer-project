import "dotenv/config";
import { AwsClient } from "aws4fetch";

const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const bucketName = (process.env.R2_BUCKET_NAME || "pamerproject").trim();
const endpoint =
  (process.env.R2_ENDPOINT ||
    `https://${accountId}.r2.cloudflarestorage.com`).trim();

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("❌ R2 environment variables not set");
  process.exit(1);
}

const region = "auto";
const service = "s3";
const client = new AwsClient({ accessKeyId, secretAccessKey, service, region });

const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

function xmlUnescape(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlEscape(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractKeys(xml) {
  const keys = [];
  const re = /<Key>([\s\S]*?)<\/Key>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    keys.push(xmlUnescape(m[1]));
  }
  return keys;
}

async function listPage(token) {
  const url = new URL(`${base}/${bucketName}`);
  url.searchParams.set("list-type", "2");
  url.searchParams.set("max-keys", "1000");
  if (token) url.searchParams.set("continuation-token", token);

  const res = await client.fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`ListObjectsV2 failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const xml = await res.text();
  const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const nextMatch = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml);
  return {
    keys: extractKeys(xml),
    truncated,
    nextToken: nextMatch ? xmlUnescape(nextMatch[1]) : null,
  };
}

async function deleteObjects(keys) {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<Delete>` +
    keys.map((k) => `<Object><Key>${xmlEscape(k)}</Key></Object>`).join("") +
    `<Quiet>true</Quiet></Delete>`;

  // S3 DeleteObjects mengharuskan POST ke bucket dengan query param `delete`
  const url = new URL(`${base}/${bucketName}`);
  url.searchParams.set("delete", "");
  const res = await client.fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      // R2 mewajibkan Content-Length untuk body
      "Content-Length": String(Buffer.byteLength(body)),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`DeleteObjects failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function clearBucket() {
  console.log(`🧹 Clearing R2 bucket: ${bucketName}`);
  let total = 0;
  let token = null;

  while (true) {
    const page = await listPage(token);
    if (page.keys.length === 0) {
      console.log("✅ Bucket is already empty.");
      break;
    }
    await deleteObjects(page.keys);
    total += page.keys.length;
    console.log(`  Deleted ${page.keys.length} objects (total: ${total})`);
    if (!page.truncated) break;
    token = page.nextToken;
  }

  console.log(`✅ R2 bucket cleared! Total objects deleted: ${total}`);
}

clearBucket().catch((err) => {
  console.error("❌ Failed to clear R2:", err);
  process.exit(1);
});
