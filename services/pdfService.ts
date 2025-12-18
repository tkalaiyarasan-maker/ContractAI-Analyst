/**
 * Parses a PDF file and extracts text from all pages.
 */
export const extractTextFromPDF = async (
  fileData: ArrayBuffer,
  onProgress: (loaded: number, total: number) => void
): Promise<{ text: string; pageCount: number }> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Use a copy of the buffer to prevent any potential detachment issues if PDF.js were to transfer it
      const bufferCopy = fileData.slice(0);
      const typedarray = new Uint8Array(bufferCopy);

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
        
        // Basic layout preservation
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
  });
};

/**
 * Renders a specific page of a PDF to a data URL (image).
 */
export const renderPdfPage = async (
  fileData: ArrayBuffer | undefined, 
  pageNumber: number, 
  scale: number = 1.0
): Promise<string> => {
  if (!fileData) {
      throw new Error("No file data found in memory. Please reload the document.");
  }
  
  if (fileData.byteLength === 0) {
      throw new Error("File data is empty. The document may need to be re-uploaded.");
  }

  // Debug check
  if (typeof pageNumber !== 'number' || isNaN(pageNumber)) {
      throw new Error(`Invalid page number requested: ${pageNumber}`);
  }
  
  try {
    // CRITICAL: Clone the buffer. PDF.js workers might transfer ownership of the buffer,
    // leaving the original 'fileData' detached (byteLength 0) for subsequent calls.
    const dataCopy = fileData.slice(0);
    const typedarray = new Uint8Array(dataCopy);
    
    const loadingTask = window.pdfjsLib.getDocument({
      data: typedarray,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    
    if (pageNumber > pdf.numPages || pageNumber < 1) {
      throw new Error(`Page ${pageNumber} is out of bounds (Document has ${pdf.numPages} pages).`);
    }

    let page;
    try {
      page = await pdf.getPage(pageNumber);
    } catch (pageError) {
      console.error("PDF.js getPage error:", pageError);
      throw new Error(`Failed to retrieve page ${pageNumber}. The document structure might be complex.`);
    }

    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error("Could not create canvas context");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return canvas.toDataURL();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error rendering PDF page:", error);
    // Return a clean error message to the UI
    throw new Error(error.message || "Failed to render PDF preview.");
  }
};