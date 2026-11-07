import { v2 as cloudinary } from 'cloudinary';
import {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    NODE_ENV,
} from '../config/env';
import { CHAT_MEDIA_LIMITS, type ChatMediaKind } from '../config/chatMedia';

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

const getFolder = (subfolder: string) =>
    NODE_ENV === 'production'
        ? `kinmeet/${subfolder}`
        : `kinmeet-dev/${subfolder}`;

const getPublicId = (url: string, folder: string): string | null => {
    try {
        const folderPattern = folder.replace(/\//g, '\\/');
        const match = url.match(new RegExp(`\\/${folderPattern}\\/([^/.]+)`));
        return match ? `${folder}/${match[1]}` : null;
    } catch {
        return null;
    }
};

export interface UploadOptions {
    subfolder: string;
    publicId: string;
    transformation?: Record<string, unknown>[];
}

export interface UploadedImage {
    url: string;
    publicId: string;
}

const uploadToCloudinary = async (
    fileBuffer: Buffer,
    { subfolder, publicId, transformation }: UploadOptions,
): Promise<UploadedImage> => {
    const folder = getFolder(subfolder);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                transformation,
            },
            (error, result) => {
                if (error || !result) return reject(error);
                resolve(result);
            },
        );
        stream.end(fileBuffer);
    });

    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
};

export const uploadImage = async (
    fileBuffer: Buffer,
    options: UploadOptions,
): Promise<string> => {
    const { url } = await uploadToCloudinary(fileBuffer, options);
    return url;
};

export const uploadImageAsset = async (
    fileBuffer: Buffer,
    options: UploadOptions,
): Promise<UploadedImage> => {
    return uploadToCloudinary(fileBuffer, options);
};

export const destroyImageByPublicId = async (publicId: string): Promise<void> => {
    await cloudinary.uploader.destroy(publicId);
};

export const destroyImage = async (url: string, subfolder: string): Promise<void> => {
    const folder = getFolder(subfolder);
    const publicId = getPublicId(url, folder);
    if (!publicId) return;

    try {
        await destroyImageByPublicId(publicId);
    } catch {
        // non-critical — image may already be gone
    }
};

// ─── Chat media ──────────────────────────────────────────────────────────────
// Chat images and voice messages are uploaded by the browser straight to Cloudinary with a pass
// signed here, stored as `authenticated` (private), and viewed only through signed URLs.

const CHAT_SUBFOLDER = 'chat';

export type ChatResourceType = 'image' | 'video';

/** Cloudinary files audio under its `video` resource type. */
export const chatResourceType = (kind: ChatMediaKind): ChatResourceType =>
    kind === 'image' ? 'image' : 'video';

export const chatMediaPublicId = (attachmentId: string): string =>
    `${getFolder(CHAT_SUBFOLDER)}/${attachmentId}`;

export interface SignedChatUpload {
    uploadUrl: string;
    /** Form fields the browser sends with the file, exactly as given. */
    fields: Record<string, string>;
}

/**
 * Signs a one-file upload pass. Every signed parameter is enforced by Cloudinary: the file can
 * only be stored under `publicId`, privately, in an allowed format, and never replaced.
 * Cloudinary accepts the signature for about an hour after `timestamp`.
 */
export const createSignedChatUpload = (
    publicId: string,
    kind: ChatMediaKind,
    notificationUrl: string | null,
): SignedChatUpload => {
    const params: Record<string, string> = {
        timestamp: String(Math.round(Date.now() / 1000)),
        public_id: publicId,
        type: 'authenticated',
        overwrite: 'false',
        allowed_formats: CHAT_MEDIA_LIMITS[kind].formats.join(','),
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    };
    const signature = cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET);

    return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${chatResourceType(kind)}/upload`,
        fields: { ...params, api_key: CLOUDINARY_API_KEY, signature },
    };
};

/**
 * Checks an upload receipt the browser forwards: Cloudinary signs `public_id` and `version` with
 * the API secret, so a forged or altered receipt fails. Nothing else in the receipt is signed.
 */
export const verifyChatUploadReceipt = (
    publicId: string,
    version: number,
    signature: string,
): boolean =>
    // Present in the SDK at runtime but missing from its type definitions.
    (cloudinary.utils as unknown as {
        verify_api_response_signature(publicId: string, version: number, signature: string): boolean;
    }).verify_api_response_signature(publicId, version, signature);

/** Checks a Cloudinary upload notification against the raw request body it was signed over. */
export const verifyCloudinaryNotification = (
    rawBody: string,
    timestamp: number,
    signature: string,
): boolean => cloudinary.utils.verifyNotificationSignature(rawBody, timestamp, signature);

export interface ChatMediaRef {
    publicId: string;
    resourceType: ChatResourceType;
    version: number;
}

export interface ChatMediaUrls {
    /** Chat bubble size. */
    display?: string;
    /** Full-screen viewer. */
    full?: string;
    /** Voice messages, always as mp3 so every browser can play them. */
    audio?: string;
}

/**
 * Signed viewing URLs. They can't be guessed or altered without the API secret, but don't
 * expire. Images are always delivered transformed, which strips metadata such as GPS location.
 */
export const buildChatMediaUrls = ({ publicId, resourceType, version }: ChatMediaRef): ChatMediaUrls => {
    const base = { type: 'authenticated', sign_url: true, secure: true, resource_type: resourceType, version };

    if (resourceType === 'video') {
        return { audio: cloudinary.url(publicId, { ...base, format: 'mp3' }) };
    }

    const sized = (width: number) => cloudinary.url(publicId, {
        ...base,
        transformation: [{ width, height: width, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
    });
    return { display: sized(640), full: sized(2048) };
};

export const destroyChatMedia = async (
    publicId: string,
    resourceType: ChatResourceType,
): Promise<void> => {
    await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
        invalidate: true,
    });
};
