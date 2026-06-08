import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const TEST_RESULTS_DIR = path.join(REPO_ROOT, 'front-end/test-results');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error(
    'Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET. Set them in back-end/.env.',
  );
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

const getFolder = (): string =>
  process.env.NODE_ENV === 'production' ? 'kinmeet/e2e-demos' : 'kinmeet-dev/e2e-demos';

const findLatestWebm = (dir: string): string | null => {
  if (!fs.existsSync(dir)) return null;

  let latestPath: string | null = null;
  let latestMtime = 0;

  const walk = (currentDir: string): void => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.webm')) continue;
      const mtime = fs.statSync(fullPath).mtimeMs;
      if (mtime > latestMtime) {
        latestMtime = mtime;
        latestPath = fullPath;
      }
    }
  };

  walk(dir);
  return latestPath;
};

const resolveVideoPath = (arg: string | undefined): string => {
  if (arg && arg !== '--latest') {
    const resolved = path.resolve(arg);
    if (!fs.existsSync(resolved)) {
      console.error(`Video file not found: ${resolved}`);
      process.exit(1);
    }
    return resolved;
  }

  const latest = findLatestWebm(TEST_RESULTS_DIR);
  if (!latest) {
    console.error(
      `No .webm found under ${TEST_RESULTS_DIR}. Run Playwright E2E first (npm run e2e).`,
    );
    process.exit(1);
  }
  return latest;
};

const uploadVideo = async (filePath: string, publicIdPrefix: string): Promise<string> => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: getFolder(),
    public_id: publicIdPrefix,
  });
  return result.secure_url;
};

const main = async (): Promise<void> => {
  const fileArg = process.argv[2];
  const publicIdArg = process.argv[3];
  const videoPath = resolveVideoPath(fileArg);
  const publicId = publicIdArg ?? `e2e-${Date.now()}`;

  const url = await uploadVideo(videoPath, publicId);
  console.log(url);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
