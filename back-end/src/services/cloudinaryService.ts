import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config/env';

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

const getFolder = (subfolder: string) =>
    process.env.NODE_ENV === 'production'
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

export const uploadImage = async (
    fileBuffer: Buffer,
    { subfolder, publicId, transformation }: UploadOptions,
): Promise<string> => {
    const folder = getFolder(subfolder);

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
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

    return result.secure_url;
};

export const destroyImage = async (url: string, subfolder: string): Promise<void> => {
    const folder = getFolder(subfolder);
    const publicId = getPublicId(url, folder);
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch {
        // non-critical — image may already be gone
    }
};
