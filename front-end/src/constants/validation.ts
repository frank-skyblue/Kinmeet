export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ABOUT_MAX_LENGTH = 500;
export const GRADUATION_YEAR_MIN = 1950;
export const GRADUATION_YEAR_MAX = 2100;

export const validatePhotoFile = (file: File): string | null => {
    if (file.size > MAX_PHOTO_SIZE) {
        return 'Image must be under 5 MB';
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Only JPEG, PNG, WebP, and GIF images are allowed';
    }
    return null;
};
