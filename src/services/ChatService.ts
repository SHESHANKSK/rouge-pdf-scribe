
import { pipeline } from '@huggingface/transformers';

export class ChatService {
  private embedder: any = null;
  private generator: any = null;
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
        'text-generation',
        'Xenova/phi-1_5',
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
          'text-generation',
          'Xenova/phi-1_5',
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
        
        // Convert tensor to array with proper typing
        const embeddingArray = Array.from(embedding.data as Float32Array) as number[];
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
      
      const queryArray = Array.from(queryEmbedding.data as Float32Array) as number[];
      
      // Calculate similarities with enhanced scoring
      const similarities = this.chunkEmbeddings.map((chunkEmbedding, index) => {
        const similarity = this.cosineSimilarity(queryArray, chunkEmbedding);
        
        // Boost score if chunk contains exact query terms (hybrid search)
        const chunk = this.chunks[index];
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        let termBoost = 0;
        
        for (const word of queryWords) {
          if (chunk.toLowerCase().includes(word)) {
            termBoost += 0.1; // Small boost for exact term matches
          }
        }
        
        return {
          index,
          similarity: similarity + termBoost,
          chunk,
          originalSimilarity: similarity
        };
      });
      
      // Filter by minimum similarity threshold and sort
      const relevanceThreshold = 0.2; // Minimum semantic similarity
      const topChunks = similarities
        .filter(item => item.originalSimilarity >= relevanceThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map(item => {
          console.log(`Chunk similarity: ${item.originalSimilarity.toFixed(3)} (boosted: ${item.similarity.toFixed(3)})`);
          return item.chunk;
        });
      
      console.log(`Found ${topChunks.length} relevant chunks using semantic search`);
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
      
      // Find relevant context with higher threshold for relevance
      const relevantChunks = await this.findRelevantChunks(query, 3);
      
      if (relevantChunks.length === 0) {
        return "I couldn't find relevant information in the knowledge base to answer your question. Please try asking about topics that are covered in the document.";
      }
      
      // Combine context with strict grounding
      const context = relevantChunks.join('\n\n');
      
      // Enhanced prompt with strict grounding instructions
      const prompt = `You are a helpful assistant that answers questions ONLY based on the provided context. 

IMPORTANT RULES:
1. ONLY use information from the provided context
2. If the answer is not in the context, say "I cannot find this information in the document"
3. Do not make assumptions or add information not in the context
4. Be direct and specific in your answers

Context from document:
${context}

Question: ${query}

Answer based ONLY on the context above:`;
      
      if (!this.generator) {
        // Enhanced fallback with better grounding
        return this.generateGroundedResponse(query, relevantChunks);
      }
      
      // Generate response using the model with conservative settings
      const response = await this.generator(prompt, {
        max_length: 150,
        temperature: 0.1, // Lower temperature for more deterministic responses
        do_sample: false, // Disable sampling for more grounded responses
        repetition_penalty: 1.1
      });
      
      let answer = '';
      if (Array.isArray(response) && response.length > 0) {
        answer = response[0].generated_text || '';
      } else if (typeof response === 'object' && 'generated_text' in response) {
        answer = response.generated_text || '';
      }
      
      // Clean up and validate the response
      answer = this.cleanAndValidateResponse(answer, prompt, context, query);
      
      if (!answer || answer.length < 10) {
        return this.generateGroundedResponse(query, relevantChunks);
      }
      
      console.log('Generated grounded AI response');
      return answer;
      
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Fallback to grounded simple response
      const relevantChunks = await this.findRelevantChunks(query, 2);
      return this.generateGroundedResponse(query, relevantChunks);
    }
  }

  private cleanAndValidateResponse(response: string, prompt: string, context: string, query: string): string {
    // Remove the prompt from response
    let answer = response.replace(prompt, '').trim();
    
    // Remove common model artifacts
    answer = answer.replace(/^(Answer:|Response:|Based on the context:)/i, '').trim();
    
    // Check if response contains hallucination indicators
    const hallucinationPatterns = [
      /I think|I believe|probably|likely|might be|could be/i,
      /in general|typically|usually|often/i,
      /from my knowledge|as far as I know/i
    ];
    
    const hasHallucination = hallucinationPatterns.some(pattern => pattern.test(answer));
    
    if (hasHallucination) {
      console.warn('Potential hallucination detected, using fallback response');
      return this.generateGroundedResponse(query, [context]);
    }
    
    // Validate that key terms from answer exist in context
    const answerWords = answer.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const contextWords = context.toLowerCase().split(/\s+/);
    
    let groundedTerms = 0;
    for (const word of answerWords.slice(0, 10)) { // Check first 10 significant words
      if (contextWords.includes(word)) {
        groundedTerms++;
      }
    }
    
    // If less than 30% of key terms are grounded, use fallback
    if (answerWords.length > 0 && (groundedTerms / Math.min(answerWords.length, 10)) < 0.3) {
      console.warn('Low grounding detected, using fallback response');
      return this.generateGroundedResponse(query, [context]);
    }
    
    return answer;
  }

  private generateGroundedResponse(query: string, relevantChunks: string[]): string {
    if (relevantChunks.length === 0) {
      return "I cannot find information about this topic in the document. Please ask about topics that are covered in the knowledge base.";
    }
    
    // Extract the most relevant sentences that directly answer the query
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    let bestMatch = '';
    let highestScore = 0;
    
    for (const chunk of relevantChunks) {
      const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        let score = 0;
        
        // Score based on query word matches
        for (const word of queryWords) {
          if (sentenceLower.includes(word)) {
            score += 1;
          }
        }
        
        // Bonus for question-like context
        if (sentenceLower.includes('what') || sentenceLower.includes('how') || 
            sentenceLower.includes('why') || sentenceLower.includes('when')) {
          score += 0.5;
        }
        
        if (score > highestScore) {
          highestScore = score;
          bestMatch = sentence.trim();
        }
      }
    }
    
    if (bestMatch && highestScore > 0) {
      return `Based on the document: ${bestMatch}.`;
    }
    
    // Fallback to first relevant chunk excerpt
    const firstChunk = relevantChunks[0];
    const excerpt = firstChunk.length > 200 ? firstChunk.substring(0, 200) + '...' : firstChunk;
    return `According to the document: ${excerpt}`;
  }

  // This method has been replaced by generateGroundedResponse above
}
