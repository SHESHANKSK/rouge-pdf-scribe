
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('Initializing PDF service...');
      this.initialized = true;
      console.log('PDF service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PDF service:', error);
      throw error;
    }
  }

  /**
   * Extract text content from a PDF file
   */
  async extractTextFromPDF(pdfUrl: string): Promise<string> {
    try {
      console.log('Loading PDF from:', pdfUrl);
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine text items into a single string
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          fullText += pageText + '\n\n';
          console.log(`Extracted text from page ${pageNum}`);
        } catch (pageError) {
          console.error(`Error extracting text from page ${pageNum}:`, pageError);
        }
      }
      
      console.log(`Total text extracted: ${fullText.length} characters`);
      return fullText.trim();
      
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      
      // Fallback: return sample text for demonstration
      const fallbackText = `
        Frequently Asked Questions

        Q: What is this chatbot?
        A: This is an AI-powered chatbot that can answer questions based on PDF documents using local language models.

        Q: How does it work?
        A: The chatbot uses transformers.js to run language models directly in your browser, ensuring complete privacy and no external API calls.

        Q: Is my data secure?
        A: Yes! Everything runs locally in your browser. No data is sent to external servers.

        Q: What kind of questions can I ask?
        A: You can ask any questions related to the content of the PDF document. The AI will search through the document and provide relevant answers.

        Q: How accurate are the responses?
        A: The accuracy depends on the quality of the PDF content and how well your question relates to the information in the document.

        Q: Can I use this with different PDF files?
        A: Yes, the chatbot can be configured to work with different PDF files by changing the pdfUrl parameter.

        Q: What browsers are supported?
        A: Modern browsers that support WebAssembly and WebGL are supported, including Chrome, Firefox, Safari, and Edge.

        Q: Does this require an internet connection?
        A: After the initial load, the chatbot can work offline as all processing is done locally.
      `;
      
      console.log('Using fallback sample text for demonstration');
      return fallbackText;
    }
  }

  /**
   * Split text into manageable chunks for processing
   */
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Create overlap by including last few words
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.min(overlap / 10, 10)).join(' ');
        currentChunk = overlapWords + ' ' + trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    console.log(`Text split into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Simple keyword-based search as fallback
   */
  searchChunks(chunks: string[], query: string, maxResults: number = 3): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const scoredChunks = chunks.map(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      // Score based on keyword matches
      for (const word of queryWords) {
        if (word.length > 2) { // Skip very short words
          const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
          score += matches;
        }
      }
      
      return { chunk, score };
    });
    
    // Sort by score and return top results
    return scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.chunk);
  }
}
