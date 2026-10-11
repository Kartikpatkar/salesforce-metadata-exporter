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

import './jszip.min.js';
import { ZipModifier } from './zip-modifier.js';

export class ZipHandler {
  constructor() {
    // Configuration
    this.maxZipSize = 100 * 1024 * 1024; // 100MB limit
  }
  


  /**
   * Download a ZIP file from Base64-encoded content
   * 
   * FLOW:
   * 1. Validate and clean Base64 string
   * 2. Create data URL from Base64
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
      
      // Clean Base64 string (remove whitespace)
      const cleanBase64 = base64Content.replace(/\s/g, '');
      
      // Inject destructiveChanges.xml if present
      const injectedBase64 = await ZipModifier.injectDestructiveChangesIfEnabled(cleanBase64);
      
      // Process profile downsizing
      const processedBase64 = await ZipModifier.downsizeZipIfEnabled(injectedBase64);
      
      // Estimate size (Base64 is ~33% larger than binary)
      const estimatedSize = (processedBase64.length * 3) / 4;
      if (estimatedSize > this.maxZipSize) {
        throw new Error(`ZIP file too large: ${this.formatBytes(estimatedSize)}`);
      }
      
      // Create data URL for service worker compatibility
      // Service workers don't have access to URL.createObjectURL
      const dataUrl = `data:application/zip;base64,${processedBase64}`;
      
      // Trigger download using chrome.downloads API
      await this.triggerDownload(dataUrl, filename);
      
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
  /**
   * Extract all files from a Base64-encoded ZIP into an array of in-memory file objects
   * @param {string} base64Content
   * @returns {Promise<Array<{path: string, content: string, isBinary: boolean}>>}
   */
  async extractZipFiles(base64Content) {
    if (!base64Content) return [];
    const cleanBase64 = base64Content.replace(/\s/g, '');
    const JSZip = self.JSZip || (typeof window !== 'undefined' ? window.JSZip : null);
    if (!JSZip) throw new Error('JSZip library not available');

    const zip = await JSZip.loadAsync(cleanBase64, { base64: true });
    const files = [];

    const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.zip', '.jar', '.crt', '.resource', '.bin', '.ico', '.svg']);

    const promises = [];
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;

      const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
      const isBinary = binaryExtensions.has(ext);

      const p = (async () => {
        if (isBinary) {
          const b64 = await zipEntry.async('base64');
          files.push({ path: relativePath, content: b64, isBinary: true });
        } else {
          const text = await zipEntry.async('string');
          files.push({ path: relativePath, content: text, isBinary: false });
        }
      })();
      promises.push(p);
    });

    await Promise.all(promises);
    return files;
  }
}
