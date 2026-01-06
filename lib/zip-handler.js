/**
 * ZIP File Handler
 * 
 * RESPONSIBILITIES:
 * - Process Base64-encoded ZIP files from Salesforce Metadata API
 * - Trigger browser download of ZIP files
 * - Handle ZIP file validation and errors
 * 
 * SALESFORCE METADATA API:
 * The retrieve operation returns a Base64-encoded ZIP file containing
 * all retrieved metadata components.
 * 
 * USAGE:
 * const handler = new ZipHandler();
 * await handler.downloadZip(base64ZipContent, 'metadata-export.zip');
 */

export class ZipHandler {
  constructor() {
    // Configuration
    this.maxZipSize = 50 * 1024 * 1024; // 50MB limit
  }
  
  /**
   * Download a ZIP file from Base64-encoded content
   * 
   * FLOW:
   * 1. Decode Base64 string to binary
   * 2. Create Blob from binary data
   * 3. Trigger browser download using chrome.downloads API
   * 
   * @param {string} base64Content - Base64-encoded ZIP file
   * @param {string} filename - Filename for download
   * @returns {Promise<void>}
   */
  async downloadZip(base64Content, filename) {
    try {
      console.log('[ZIP Handler] Processing ZIP download...', {
        filename,
        contentLength: base64Content.length
      });
      
      // Validate input
      if (!base64Content || typeof base64Content !== 'string') {
        throw new Error('Invalid ZIP content');
      }
      
      // Decode Base64 to binary
      const binaryContent = this.base64ToArrayBuffer(base64Content);
      
      // Validate ZIP size
      if (binaryContent.byteLength > this.maxZipSize) {
        throw new Error(`ZIP file too large: ${this.formatBytes(binaryContent.byteLength)}`);
      }
      
      // Create Blob
      const blob = new Blob([binaryContent], { type: 'application/zip' });
      
      // Create object URL
      const objectUrl = URL.createObjectURL(blob);
      
      // Trigger download using chrome.downloads API
      await this.triggerDownload(objectUrl, filename);
      
      // Clean up object URL after a delay
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000); // 1 minute
      
      console.log('[ZIP Handler] Download initiated successfully');
      
    } catch (error) {
      console.error('[ZIP Handler] Download failed:', error);
      throw new Error(`Failed to download ZIP: ${error.message}`);
    }
  }
  
  /**
   * Convert Base64 string to ArrayBuffer
   * 
   * @param {string} base64 - Base64-encoded string
   * @returns {ArrayBuffer} Binary data
   */
  base64ToArrayBuffer(base64) {
    try {
      // Remove any whitespace or newlines
      const cleanBase64 = base64.replace(/\s/g, '');
      
      // Decode Base64 to binary string
      const binaryString = atob(cleanBase64);
      
      // Convert binary string to ArrayBuffer
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes.buffer;
      
    } catch (error) {
      console.error('[ZIP Handler] Base64 decode failed:', error);
      throw new Error('Failed to decode Base64 content');
    }
  }
  
  /**
   * Trigger browser download using Chrome Downloads API
   * 
   * @param {string} url - Object URL or data URL
   * @param {string} filename - Filename for download
   * @returns {Promise<void>}
   */
  async triggerDownload(url, filename) {
    // In a Chrome extension, we use chrome.downloads.download()
    // This works from background script context
    
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url: url,
          filename: filename,
          saveAs: true // Prompt user for location
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('[ZIP Handler] Download started:', downloadId);
            resolve();
          }
        }
      );
    });
  }
  
  /**
   * Validate ZIP file header (magic bytes)
   * 
   * ZIP files start with: 50 4B 03 04 (PK..)
   * 
   * @param {ArrayBuffer} buffer - Binary data
   * @returns {boolean} True if valid ZIP
   */
  validateZipHeader(buffer) {
    const bytes = new Uint8Array(buffer);
    
    // Check for ZIP magic bytes: 50 4B 03 04
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x50 && // 'P'
      bytes[1] === 0x4B && // 'K'
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    );
  }
  
  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Byte count
   * @returns {string} Formatted size (e.g., "2.5 MB")
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Extract ZIP metadata (file count, total size)
   * 
   * NOTE: This is a simplified version - full ZIP parsing is complex
   * 
   * @param {ArrayBuffer} buffer - ZIP file binary data
   * @returns {Object} ZIP metadata
   */
  extractZipMetadata(buffer) {
    // TODO: Implement basic ZIP parsing
    // This would require parsing the ZIP central directory
    
    return {
      isValid: this.validateZipHeader(buffer),
      size: buffer.byteLength,
      formattedSize: this.formatBytes(buffer.byteLength)
    };
  }
}
