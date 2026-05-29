import { createWorker, type Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

const getWorker = async (): Promise<Worker> => {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const w = await createWorker(['chi_sim', 'eng'], 1, {
      logger: () => {},
    });
    return w;
  })();
  return workerPromise;
};

export interface OcrProgress {
  status: string;
  progress: number;
}

export const ocrImageToText = async (
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> => {
  const w = await getWorker();
  if (onProgress) onProgress({ status: '识别中', progress: 0.1 });
  const { data } = await w.recognize(file);
  if (onProgress) onProgress({ status: '完成', progress: 1 });
  return (data.text || '').trim();
};

export const terminateOcrWorker = async () => {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
};
