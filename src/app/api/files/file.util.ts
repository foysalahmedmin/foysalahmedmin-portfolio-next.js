import path from 'path';
import type { TFileType } from './file.type';

export const getExtensionFromFilename = (filename: string): string => {
  return path.extname(filename).toLowerCase().replace(/^\./, '');
};

export const getFileTypeFromMime = (
  mimetype: string,
  extension?: string,
): TFileType => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';

  const documentMimes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
  ]);

  if (documentMimes.has(mimetype)) return 'document';

  const documentExtensions = new Set([
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'csv',
    'rtf',
  ]);

  if (extension && documentExtensions.has(extension)) return 'document';

  return 'other';
};
