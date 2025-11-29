/**
 * Parses a PDF file and extracts text from all pages.
 * Note: For extremely large files (100k pages), browser memory is a limitation.
 * We try to be efficient by joining text immediately.
 */
export const extractTextFromPDF = async (
  file: File,
  onProgress: (loaded: number, total: number) => void
): Promise<{ text: string; pageCount: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);

        const loadingTask = window.pdfjsLib.getDocument({
          data: typedarray,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        let fullText = '';

        // Process in chunks to avoid blocking UI too much, though await helps
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Basic layout preservation: add newline after items that seem to end a line
          // This is a heuristic.
          const pageText = textContent.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => item.str)
            .join(' ');

          fullText += `[Page ${i}]\n${pageText}\n\n`;
          
          onProgress(i, totalPages);
        }

        resolve({ text: fullText, pageCount: totalPages });
      } catch (error) {
        console.error("PDF Parsing Error", error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
};