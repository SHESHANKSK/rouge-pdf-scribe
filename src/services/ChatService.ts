
import { pipeline, Pipeline } from '@huggingface/transformers';

export class ChatService {
  private embedder: Pipeline | null = null;
  private generator: Pipeline | null = null;
  private chunks: string[] = [];
  private chunkEmbeddings: number[][] = [];
  private initialized = false;

  async initialize(chunks: string[]): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('Initializing AI models...');
      
      this.chunks = chunks;
      
      // Initialize embedding model for semantic search
      console.log('Loading embedding model...');
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { 
          device: 'webgpu',
          dtype: 'fp32'
        }
      );
      
      // Initialize text generation model
      console.log('Loading text generation model...');
      this.generator = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-small',
        {
          device: 'webgpu',
          dtype: 'fp32'
        }
      );
      
      // Pre-compute embeddings for all chunks
      console.log('Computing embeddings for PDF chunks...');
      await this.computeChunkEmbeddings();
      
      this.initialized = true;
      console.log('AI models initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize AI models:', error);
      console.log('Falling back to CPU mode...');
      
      try {
        // Fallback to CPU if WebGPU fails
        this.embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          { device: 'cpu' }
        );
        
        this.generator = await pipeline(
          'text2text-generation',
          'Xenova/flan-t5-small',
          { device: 'cpu' }
        );
        
        await this.computeChunkEmbeddings();
        this.initialized = true;
        console.log('AI models initialized successfully on CPU');
        
      } catch (cpuError) {
        console.error('Failed to initialize AI models on CPU:', cpuError);
        throw cpuError;
      }
    }
  }

  private async computeChunkEmbeddings(): Promise<void> {
    if (!this.embedder) throw new Error('Embedder not initialized');
    
    this.chunkEmbeddings = [];
    
    for (let i = 0; i < this.chunks.length; i++) {
      try {
        const embedding = await this.embedder(this.chunks[i], {
          pooling: 'mean',
          normalize: true
        });
        
        // Convert tensor to array
        const embeddingArray = Array.from(embedding.data);
        this.chunkEmbeddings.push(embeddingArray);
        
        if ((i + 1) % 10 === 0) {
          console.log(`Computed embeddings for ${i + 1}/${this.chunks.length} chunks`);
        }
      } catch (error) {
        console.error(`Error computing embedding for chunk ${i}:`, error);
        // Use zero vector as fallback
        this.chunkEmbeddings.push(new Array(384).fill(0));
      }
    }
    
    console.log(`Computed embeddings for all ${this.chunks.length} chunks`);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async findRelevantChunks(query: string, topK: number = 3): Promise<string[]> {
    if (!this.embedder || this.chunkEmbeddings.length === 0) {
      console.log('Using fallback keyword search');
      return this.keywordSearch(query, topK);
    }
    
    try {
      // Compute query embedding
      const queryEmbedding = await this.embedder(query, {
        pooling: 'mean',
        normalize: true
      });
      
      const queryArray = Array.from(queryEmbedding.data);
      
      // Calculate similarities
      const similarities = this.chunkEmbeddings.map((chunkEmbedding, index) => ({
        index,
        similarity: this.cosineSimilarity(queryArray, chunkEmbedding),
        chunk: this.chunks[index]
      }));
      
      // Sort by similarity and return top chunks
      const topChunks = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map(item => item.chunk);
      
      console.log('Found relevant chunks using semantic search');
      return topChunks;
      
    } catch (error) {
      console.error('Error in semantic search, falling back to keyword search:', error);
      return this.keywordSearch(query, topK);
    }
  }

  private keywordSearch(query: string, topK: number = 3): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const scoredChunks = this.chunks.map((chunk, index) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        if (word.length > 2) {
          const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
          score += matches;
        }
      }
      
      return { index, score, chunk };
    });
    
    return scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.chunk);
  }

  async generateResponse(query: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Chat service not initialized');
    }
    
    try {
      console.log('Generating response for query:', query);
      
      // Find relevant context
      const relevantChunks = await this.findRelevantChunks(query, 3);
      
      if (relevantChunks.length === 0) {
        return "I couldn't find relevant information in the PDF to answer your question. Could you try rephrasing or asking about something else?";
      }
      
      // Combine context
      const context = relevantChunks.join('\n\n');
      
      // Create prompt for text generation
      const prompt = `Context: ${context}\n\nQuestion: ${query}\n\nAnswer:`;
      
      if (!this.generator) {
        // Fallback to simple context-based response
        return this.generateSimpleResponse(query, relevantChunks);
      }
      
      // Generate response using the model
      const response = await this.generator(prompt, {
        max_length: 200,
        temperature: 0.7,
        do_sample: true
      });
      
      let answer = '';
      if (Array.isArray(response) && response.length > 0) {
        answer = response[0].generated_text || '';
      } else if (typeof response === 'object' && 'generated_text' in response) {
        answer = response.generated_text || '';
      }
      
      // Clean up the response
      answer = answer.replace(prompt, '').trim();
      
      if (!answer || answer.length < 10) {
        return this.generateSimpleResponse(query, relevantChunks);
      }
      
      console.log('Generated AI response');
      return answer;
      
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Fallback to simple response
      const relevantChunks = await this.findRelevantChunks(query, 2);
      return this.generateSimpleResponse(query, relevantChunks);
    }
  }

  private generateSimpleResponse(query: string, relevantChunks: string[]): string {
    if (relevantChunks.length === 0) {
      return "I couldn't find relevant information in the PDF to answer your question. Could you try asking about something else?";
    }
    
    // Extract the most relevant sentence from the first chunk
    const firstChunk = relevantChunks[0];
    const sentences = firstChunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (sentences.length > 0) {
      const queryWords = query.toLowerCase().split(/\s+/);
      
      // Find sentence with most query word matches
      let bestSentence = sentences[0];
      let maxMatches = 0;
      
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        let matches = 0;
        
        for (const word of queryWords) {
          if (word.length > 2 && sentenceLower.includes(word)) {
            matches++;
          }
        }
        
        if (matches > maxMatches) {
          maxMatches = matches;
          bestSentence = sentence;
        }
      }
      
      return `Based on the PDF content: ${bestSentence.trim()}.`;
    }
    
    // Fallback to first part of the chunk
    const preview = firstChunk.substring(0, 200).trim();
    return `Based on the PDF content: ${preview}${preview.length === 200 ? '...' : ''}`;
  }
}
