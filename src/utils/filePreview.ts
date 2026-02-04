export interface FileWithPreview {
  file: File;
  preview: string | null;
}

export const createFilePreviews = async (files: File[]): Promise<FileWithPreview[]> => {
  const previews: FileWithPreview[] = [];

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const preview = await readFileAsDataURL(file);
      previews.push({ file, preview });
    } else {
      previews.push({ file, preview: null });
    }
  }

  return previews;
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
