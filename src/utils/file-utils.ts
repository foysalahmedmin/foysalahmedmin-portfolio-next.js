import fs from 'fs';
import path from 'path';

/**
 * Delete a file from the public/uploads directory
 * @param filePath - The file path (e.g., "/uploads/projects/image.jpg")
 * @returns true if file was deleted, false if file doesn't exist
 */
export const deleteFile = (filePath: string): boolean => {
  try {
    if (!filePath || !filePath.startsWith('/uploads/')) {
      return false;
    }

    // Remove leading slash and construct full path
    const relativePath = filePath.replace(/^\/+/, '');
    const fullPath = path.join(process.cwd(), 'public', relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

/**
 * Delete multiple files
 * @param filePaths - Array of file paths
 * @returns Number of files successfully deleted
 */
export const deleteFiles = (filePaths: string[]): number => {
  if (!filePaths || filePaths.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  for (const filePath of filePaths) {
    if (deleteFile(filePath)) {
      deletedCount++;
    }
  }
  return deletedCount;
};

/**
 * Delete files from an object with file fields
 * @param data - Object containing file fields (thumbnail, images, image, etc.)
 * @param fields - Array of field names to check for files
 * @returns Number of files deleted
 */
export const deleteFilesFromObject = (
  data: Record<string, any>,
  fields: string[] = ['thumbnail', 'images', 'image'],
): number => {
  let deletedCount = 0;

  for (const field of fields) {
    const value = data[field];
    if (!value) continue;

    if (Array.isArray(value)) {
      // Handle array of file paths (e.g., images)
      deletedCount += deleteFiles(value.filter((v) => typeof v === 'string'));
    } else if (typeof value === 'string') {
      // Handle single file path (e.g., thumbnail, image)
      if (deleteFile(value)) {
        deletedCount++;
      }
    }
  }

  return deletedCount;
};

