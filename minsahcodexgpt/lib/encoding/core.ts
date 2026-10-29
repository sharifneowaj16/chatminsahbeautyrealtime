let instance: EncodingFixer | null = null;

export class EncodingFixer {
  private emojiMap: Map<string, string>;
  private patternCache: Map<string, string>;

  private constructor() {
    this.emojiMap = new Map();
    this.patternCache = new Map();
    this.initializeEmojiMap();
  }

  static getInstance(): EncodingFixer {
    if (!instance) {
      instance = new EncodingFixer();
    }
    return instance;
  }

  private initializeEmojiMap() {
    const patterns: [string, string][] = [
      ['\u00F0\u009F\u0091\u0081', '👁️'], ['\u00F0\u009F\u0091\u008D', '👍'],
      ['\u00F0\u009F\u0091\u008E', '👎'], ['\u00F0\u009F\u0091\u008B', '👋'],
      ['\u00F0\u009F\u0091\u008F', '👏'], ['\u00F0\u009F\u0098\u008D', '😍'],
      ['\u00F0\u009F\u0098\u0082', '😂'], ['\u00F0\u009F\u0098\u008A', '😊'],
      ['\u00F0\u009F\u0092\u0096', '💖'], ['\u00F0\u009F\u0092\u0097', '💗'],
      ['\u00F0\u009F\u0092\u00B0', '💰'], ['\u00F0\u009F\u0093\u008A', '📊'],
      ['\u00F0\u009F\u0093\u0088', '📈'], ['\u00F0\u009F\u008C\u00B9', '🌹'],
      ['\u00F0\u009F\u008C\u009F', '🌟'], ['\u00F0\u009F\u008E\u00AF', '🎯'],
      ['\u00F0\u009F\u0092\u00AC', '💬'], ['\u00E2\u009D\u00A4', '❤️'],
      ['\u00E2\u009C\u00A8', '✨'], ['\u00E2\u009C\u0085', '✅'],
      ['\u00F0\u009F\u0094\u008D', '🔍'], ['\u00F0\u009F\u009B\u0092', '🛒'],
      ['\u00F0\u009F\u0093\u00A2', '📢'], ['\u00F0\u009F\u0093\u008D', '📍'],
      ['\u00F0\u009F\u0097\u00BA', '🗺️'], ['\u00F0\u009F\u0097\u0082', '🗂️'],
      ['\u00F0\u009F\u0094\u0084', '🔄'], ['\u00F0\u009F\u0093\u008B', '📋'],
    ];
    patterns.forEach(([c, r]) => this.emojiMap.set(c, r));
  }

  fix(text: string): string {
    if (!text || typeof text !== 'string') return text;
    if (this.patternCache.has(text)) return this.patternCache.get(text)!;

    let fixed = text;
    this.emojiMap.forEach((correct, corrupted) => {
      if (fixed.includes(corrupted)) fixed = fixed.split(corrupted).join(correct);
    });

    fixed = this.fixMojibake(fixed);
    fixed = this.cleanupSpecialChars(fixed);

    try { fixed = fixed.normalize('NFC'); } catch (e) {}

    if (text !== fixed && text.length < 1000) {
      this.patternCache.set(text, fixed);
    }
    return fixed;
  }

  private fixMojibake(text: string): string {
    return text.replace(/\u00F0[\u0080-\u00BF]{3}/g, (match) => {
      try {
        const bytes = Array.from(match).map(c => c.charCodeAt(0));
        if (bytes.length === 4 && bytes[0] === 0xF0) {
          const codePoint = 
            ((bytes[0] & 0x07) << 18) | ((bytes[1] & 0x3F) << 12) |
            ((bytes[2] & 0x3F) << 6) | (bytes[3] & 0x3F);
          if (codePoint >= 0x1F000 && codePoint <= 0x1FFFF) {
            return String.fromCodePoint(codePoint);
          }
        }
      } catch (e) {}
      return match;
    });
  }

  private cleanupSpecialChars(text: string): string {
    return text
      .replace(/\uFEFF+/g, '')
      .replace(/\u200B+/g, '')
      .replace(/\u200C+/g, '')
      .replace(/[\uFE0E\uFE0F]{2,}/g, '\uFE0F') // Duplicate variation selectors
      .replace(/\uFFFD/g, '');
  }

  fixDeep<T>(data: T): T {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') return this.fix(data) as T;
    if (Array.isArray(data)) return data.map(item => this.fixDeep(item)) as T;
    if (typeof data === 'object') {
      const fixed: any = {};
      for (const [key, value] of Object.entries(data)) {
        fixed[key] = this.fixDeep(value);
      }
      return fixed;
    }
    return data;
  }
}
