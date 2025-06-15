interface CacheEntry {
  result: any;
  timestamp: number;
  transcriptionHash: string;
}

export class NursingTemplateCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 100;

  // Generate a simple hash of the transcription to check for meaningful changes
  private hashTranscription(transcription: string): string {
    // Remove timestamps, filler words, and normalize for comparison
    const normalized = transcription
      .toLowerCase()
      .replace(/\b(um|uh|you know|like|so)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return this.simpleHash(normalized);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getCached(patientId: number, encounterId: string, transcription: string): any | null {
    const key = `${patientId}-${encounterId}`;
    const entry = this.cache.get(key);
    
    if (!transcription || transcription.trim().length === 0) return null;
    
    if (!entry) return null;
    
    const now = Date.now();
    const isExpired = now - entry.timestamp > this.CACHE_DURATION;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    const currentHash = this.hashTranscription(transcription);
    const isSimilar = currentHash === entry.transcriptionHash;
    
    if (isSimilar) {
      console.log(`📋 [Cache] Cache hit for ${key} - skipping API call`);
      return entry.result;
    }
    
    return null;
  }

  setCached(patientId: number, encounterId: string, transcription: string, result: any): void {
    const key = `${patientId}-${encounterId}`;
    const transcriptionHash = this.hashTranscription(transcription);
    
    // Clean up old entries if cache is getting too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      transcriptionHash,
    });
    
    console.log(`📋 [Cache] Cached result for ${key}`);
  }

  clearCache(): void {
    this.cache.clear();
    console.log(`📋 [Cache] Cache cleared`);
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const nursingTemplateCache = new NursingTemplateCache();