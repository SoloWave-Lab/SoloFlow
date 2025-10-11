/**
 * Caption Export Service
 * Handles conversion and export of captions to various formats (SRT, VTT, etc.)
 */

// ============================================
// TYPES
// ============================================

export interface Caption {
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
}

export interface CaptionStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  alignment?: 'left' | 'center' | 'right';
}

export type CaptionFormat = 'srt' | 'vtt' | 'ass' | 'sbv' | 'json';

// ============================================
// CAPTION EXPORT SERVICE
// ============================================

export class CaptionExportService {
  /**
   * Export captions to specified format
   */
  static export(
    captions: Caption[],
    format: CaptionFormat,
    style?: CaptionStyle
  ): string {
    switch (format) {
      case 'srt':
        return this.exportToSRT(captions);
      case 'vtt':
        return this.exportToVTT(captions, style);
      case 'ass':
        return this.exportToASS(captions, style);
      case 'sbv':
        return this.exportToSBV(captions);
      case 'json':
        return this.exportToJSON(captions, style);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Export to SRT (SubRip) format
   */
  static exportToSRT(captions: Caption[]): string {
    let srt = '';

    captions.forEach((caption, index) => {
      const startTime = this.formatSRTTime(caption.startTime);
      const endTime = this.formatSRTTime(caption.endTime);

      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${caption.text}\n\n`;
    });

    return srt.trim();
  }

  /**
   * Export to WebVTT format
   */
  static exportToVTT(captions: Caption[], style?: CaptionStyle): string {
    let vtt = 'WEBVTT\n\n';

    // Add style block if provided
    if (style) {
      vtt += 'STYLE\n';
      vtt += '::cue {\n';
      
      if (style.fontFamily) {
        vtt += `  font-family: ${style.fontFamily};\n`;
      }
      if (style.fontSize) {
        vtt += `  font-size: ${style.fontSize}px;\n`;
      }
      if (style.color) {
        vtt += `  color: ${style.color};\n`;
      }
      if (style.backgroundColor) {
        vtt += `  background-color: ${style.backgroundColor};\n`;
      }
      
      vtt += '}\n\n';
    }

    // Add captions
    captions.forEach((caption, index) => {
      const startTime = this.formatVTTTime(caption.startTime);
      const endTime = this.formatVTTTime(caption.endTime);

      vtt += `${index + 1}\n`;
      vtt += `${startTime} --> ${endTime}`;
      
      // Add position and alignment
      if (style?.position || style?.alignment) {
        vtt += ' ';
        if (style.position) {
          vtt += `line:${this.getVTTLinePosition(style.position)} `;
        }
        if (style.alignment) {
          vtt += `align:${style.alignment}`;
        }
      }
      
      vtt += '\n';
      vtt += `${caption.text}\n\n`;
    });

    return vtt.trim();
  }

  /**
   * Export to ASS (Advanced SubStation Alpha) format
   */
  static exportToASS(captions: Caption[], style?: CaptionStyle): string {
    let ass = '[Script Info]\n';
    ass += 'Title: Video Captions\n';
    ass += 'ScriptType: v4.00+\n';
    ass += 'WrapStyle: 0\n';
    ass += 'PlayResX: 1920\n';
    ass += 'PlayResY: 1080\n\n';

    // Styles section
    ass += '[V4+ Styles]\n';
    ass += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
    
    const fontFamily = style?.fontFamily || 'Arial';
    const fontSize = style?.fontSize || 48;
    const color = this.hexToASSColor(style?.color || '#FFFFFF');
    const bgColor = this.hexToASSColor(style?.backgroundColor || '#000000');
    const alignment = this.getASSAlignment(style?.position, style?.alignment);

    ass += `Style: Default,${fontFamily},${fontSize},${color},${color},&H00000000,${bgColor},0,0,0,0,100,100,0,0,1,2,2,${alignment},10,10,10,1\n\n`;

    // Events section
    ass += '[Events]\n';
    ass += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

    captions.forEach(caption => {
      const startTime = this.formatASSTime(caption.startTime);
      const endTime = this.formatASSTime(caption.endTime);
      const text = caption.text.replace(/\n/g, '\\N');

      ass += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
    });

    return ass;
  }

  /**
   * Export to SBV (YouTube) format
   */
  static exportToSBV(captions: Caption[]): string {
    let sbv = '';

    captions.forEach(caption => {
      const startTime = this.formatSBVTime(caption.startTime);
      const endTime = this.formatSBVTime(caption.endTime);

      sbv += `${startTime},${endTime}\n`;
      sbv += `${caption.text}\n\n`;
    });

    return sbv.trim();
  }

  /**
   * Export to JSON format
   */
  static exportToJSON(captions: Caption[], style?: CaptionStyle): string {
    return JSON.stringify({
      captions: captions.map(c => ({
        start: c.startTime,
        end: c.endTime,
        text: c.text,
        confidence: c.confidence
      })),
      style: style || {}
    }, null, 2);
  }

  // ============================================
  // IMPORT METHODS
  // ============================================

  /**
   * Import captions from various formats
   */
  static import(content: string, format: CaptionFormat): Caption[] {
    switch (format) {
      case 'srt':
        return this.importFromSRT(content);
      case 'vtt':
        return this.importFromVTT(content);
      case 'ass':
        return this.importFromASS(content);
      case 'sbv':
        return this.importFromSBV(content);
      case 'json':
        return this.importFromJSON(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Import from SRT format
   */
  static importFromSRT(content: string): Caption[] {
    const captions: Caption[] = [];
    const blocks = content.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      const timeLine = lines[1];
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        const startTime = this.parseSRTTime(timeMatch.slice(1, 5));
        const endTime = this.parseSRTTime(timeMatch.slice(5, 9));
        const text = lines.slice(2).join('\n');

        captions.push({ startTime, endTime, text });
      }
    }

    return captions;
  }

  /**
   * Import from VTT format
   */
  static importFromVTT(content: string): Caption[] {
    const captions: Caption[] = [];
    
    // Remove WEBVTT header and style blocks
    const cleanContent = content.replace(/^WEBVTT.*?\n\n/, '').replace(/STYLE.*?(?=\n\n|\n\d)/gs, '');
    const blocks = cleanContent.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 2) continue;

      // Find time line (may have cue identifier before it)
      const timeLine = lines.find(line => line.includes('-->'));
      if (!timeLine) continue;

      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      
      if (timeMatch) {
        const startTime = this.parseVTTTime(timeMatch.slice(1, 5));
        const endTime = this.parseVTTTime(timeMatch.slice(5, 9));
        const textLines = lines.slice(lines.indexOf(timeLine) + 1);
        const text = textLines.join('\n');

        captions.push({ startTime, endTime, text });
      }
    }

    return captions;
  }

  /**
   * Import from ASS format
   */
  static importFromASS(content: string): Caption[] {
    const captions: Caption[] = [];
    const lines = content.split('\n');
    let inEvents = false;

    for (const line of lines) {
      if (line.startsWith('[Events]')) {
        inEvents = true;
        continue;
      }

      if (inEvents && line.startsWith('Dialogue:')) {
        const parts = line.substring(10).split(',');
        if (parts.length < 10) continue;

        const startTime = this.parseASSTime(parts[1]);
        const endTime = this.parseASSTime(parts[2]);
        const text = parts.slice(9).join(',').replace(/\\N/g, '\n');

        captions.push({ startTime, endTime, text });
      }
    }

    return captions;
  }

  /**
   * Import from SBV format
   */
  static importFromSBV(content: string): Caption[] {
    const captions: Caption[] = [];
    const blocks = content.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 2) continue;

      const timeMatch = lines[0].match(/(\d+):(\d+):(\d+)\.(\d+),(\d+):(\d+):(\d+)\.(\d+)/);
      
      if (timeMatch) {
        const startTime = this.parseSBVTime(timeMatch.slice(1, 5));
        const endTime = this.parseSBVTime(timeMatch.slice(5, 9));
        const text = lines.slice(1).join('\n');

        captions.push({ startTime, endTime, text });
      }
    }

    return captions;
  }

  /**
   * Import from JSON format
   */
  static importFromJSON(content: string): Caption[] {
    const data = JSON.parse(content);
    return data.captions.map((c: any) => ({
      startTime: c.start,
      endTime: c.end,
      text: c.text,
      confidence: c.confidence
    }));
  }

  // ============================================
  // TIME FORMATTING HELPERS
  // ============================================

  private static formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private static formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  private static formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);

    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  private static formatSBVTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  // ============================================
  // TIME PARSING HELPERS
  // ============================================

  private static parseSRTTime(parts: string[]): number {
    const [hours, minutes, seconds, ms] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  }

  private static parseVTTTime(parts: string[]): number {
    const [hours, minutes, seconds, ms] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  }

  private static parseASSTime(time: string): number {
    const parts = time.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const [seconds, cs] = parts[2].split('.').map(Number);
    return hours * 3600 + minutes * 60 + seconds + cs / 100;
  }

  private static parseSBVTime(parts: string[]): number {
    const [hours, minutes, seconds, ms] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  }

  // ============================================
  // STYLE HELPERS
  // ============================================

  private static getVTTLinePosition(position: string): string {
    switch (position) {
      case 'top': return '10%';
      case 'center': return '50%';
      case 'bottom': return '90%';
      default: return '90%';
    }
  }

  private static getASSAlignment(position?: string, alignment?: string): number {
    // ASS alignment: 1-3 bottom, 4-6 middle, 7-9 top
    // Within each row: 1/4/7 left, 2/5/8 center, 3/6/9 right
    let base = 2; // bottom center

    if (position === 'top') base = 8;
    else if (position === 'center') base = 5;

    if (alignment === 'left') base -= 1;
    else if (alignment === 'right') base += 1;

    return base;
  }

  private static hexToASSColor(hex: string): string {
    // Convert #RRGGBB to &HAABBGGRR
    const r = hex.substring(1, 3);
    const g = hex.substring(3, 5);
    const b = hex.substring(5, 7);
    return `&H00${b}${g}${r}`;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Merge overlapping captions
   */
  static mergeOverlapping(captions: Caption[]): Caption[] {
    if (captions.length === 0) return [];

    const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
    const merged: Caption[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.startTime <= last.endTime) {
        // Merge
        last.endTime = Math.max(last.endTime, current.endTime);
        last.text += ' ' + current.text;
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Split long captions
   */
  static splitLong(captions: Caption[], maxLength: number = 80): Caption[] {
    const result: Caption[] = [];

    for (const caption of captions) {
      if (caption.text.length <= maxLength) {
        result.push(caption);
        continue;
      }

      // Split into multiple captions
      const words = caption.text.split(' ');
      const duration = caption.endTime - caption.startTime;
      const durationPerChar = duration / caption.text.length;

      let currentText = '';
      let currentStart = caption.startTime;

      for (const word of words) {
        if ((currentText + ' ' + word).length > maxLength) {
          const currentEnd = currentStart + currentText.length * durationPerChar;
          result.push({
            startTime: currentStart,
            endTime: currentEnd,
            text: currentText.trim()
          });
          currentText = word;
          currentStart = currentEnd;
        } else {
          currentText += (currentText ? ' ' : '') + word;
        }
      }

      if (currentText) {
        result.push({
          startTime: currentStart,
          endTime: caption.endTime,
          text: currentText.trim()
        });
      }
    }

    return result;
  }

  /**
   * Adjust timing
   */
  static adjustTiming(captions: Caption[], offset: number): Caption[] {
    return captions.map(caption => ({
      ...caption,
      startTime: caption.startTime + offset,
      endTime: caption.endTime + offset
    }));
  }
}