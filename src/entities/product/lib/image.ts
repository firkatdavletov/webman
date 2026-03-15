export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Не удалось прочитать изображение.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать изображение.'));
    };

    reader.readAsDataURL(file);
  });
}
