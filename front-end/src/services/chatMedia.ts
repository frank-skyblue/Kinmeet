import axios from 'axios';
import { chatAPI } from './api';
import type { ChatAttachmentReceipt, ChatMediaKind } from '../types';

/** The parts of Cloudinary's upload response the server needs. */
interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
}

/**
 * Gets a one-file upload pass from the server, then uploads the file straight to Cloudinary,
 * so the server never handles the file itself. Returns the receipt to attach to the message.
 *
 * Uses the plain axios instance on purpose: the app's `api` instance would add the user's
 * Bearer token and rewrite the request body, and neither may reach Cloudinary.
 */
export const uploadChatMedia = async (
  receiverId: string,
  kind: ChatMediaKind,
  file: Blob,
  fileName: string,
  onProgress?: (fraction: number) => void,
): Promise<Pick<ChatAttachmentReceipt, 'id' | 'version' | 'signature'>> => {
  const { pass } = await chatAPI.requestUploadPass(receiverId, kind);

  const form = new FormData();
  Object.entries(pass.fields).forEach(([key, value]) => form.append(key, value));
  form.append('file', file, fileName);

  const response = await axios.post<CloudinaryUploadResponse>(pass.uploadUrl, form, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(event.loaded / event.total);
    },
  });

  return { id: pass.attachmentId, version: response.data.version, signature: response.data.signature };
};
