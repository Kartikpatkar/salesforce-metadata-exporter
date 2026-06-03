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

export class ZipHandler {
  constructor() {
    // Configuration
    this.maxZipSize = 100 * 1024 * 1024; // 100MB limit
  }
  
  /**
   * Process profile/permissionset downsizing if enabled in settings
   * @param {string} base64Content - Clean Base64 zip string
   * @returns {Promise<string>} Clean Base64 zip string (potentially downsized)
   */
  async downsizeZipIfEnabled(base64Content) {
    try {
      const result = await chrome.storage.local.get('profileDownsizeSettings');
      const settings = result.profileDownsizeSettings;
      
      if (!settings || !settings.enabled) {
        return base64Content;
      }
      
      console.log('[ZIP Handler] Profile downsizing is enabled, loading JSZip...');
      const JSZip = self.JSZip;
      if (!JSZip) {
        console.error('[ZIP Handler] JSZip library not found on self. Exporting unmodified zip.');
        return base64Content;
      }
      
      const zip = await JSZip.loadAsync(base64Content, { base64: true });
      
      // Strip tags map: map settings properties to XML node tag names
      // If setting is FALSE (meaning do NOT keep), then strip = true
      const stripTagsMap = {
        classAccesses: !settings.keepClassAccesses,
        fieldPermissions: !settings.keepFieldPermissions,
        objectPermissions: !settings.keepObjectPermissions,
        pageAccesses: !settings.keepPageAccesses,
        layoutAssignments: !settings.keepLayoutAssignments,
        recordTypeVisibilities: !settings.keepRecordTypeVisibilities,
        tabVisibilities: !settings.keepTabVisibilities,
        userPermissions: !settings.keepUserPermissions
      };
      
      const tagsToStrip = Object.keys(stripTagsMap).filter(tag => stripTagsMap[tag]);
      if (tagsToStrip.length === 0) {
        console.log('[ZIP Handler] All subcomponents are marked as KEEP. Skipping XML processing.');
        return base64Content;
      }
      
      console.log('[ZIP Handler] XML sections to strip:', tagsToStrip);
      
      let modified = false;
      const filePromises = [];
      
      zip.forEach((relativePath, file) => {
        const isProfile = relativePath.endsWith('.profile');
        const isPermissionSet = relativePath.endsWith('.permissionset');
        
        if (isProfile || isPermissionSet) {
          const promise = (async () => {
            let xmlText = await file.async('string');
            let fileModified = false;
            
            tagsToStrip.forEach(tag => {
              // Matches XML nodes with or without namespaces, e.g. <met:classAccesses>...</met:classAccesses>
              const regex = new RegExp(`<[^>]*:?${tag}(?:\\s+[^>]*)?>[\\s\\S]*?<\\/[^>]*:?${tag}>`, 'g');
              if (regex.test(xmlText)) {
                xmlText = xmlText.replace(regex, '');
                fileModified = true;
              }
            });
            
            if (fileModified) {
              zip.file(relativePath, xmlText);
              modified = true;
            }
          })();
          filePromises.push(promise);
        }
      });
      
      await Promise.all(filePromises);
      
      if (!modified) {
        console.log('[ZIP Handler] No profile or permissionset files were modified.');
        return base64Content;
      }
      
      console.log('[ZIP Handler] Regenerating downsized ZIP file...');
      const newBase64 = await zip.generateAsync({ type: 'base64' });
      console.log('[ZIP Handler] Regenerated successfully.');
      return newBase64;
      
    } catch (error) {
      console.error('[ZIP Handler] Error during profile downsizing processing:', error);
      return base64Content; // Fallback to original content
    }
  }
  
  /**
   * Inject destructiveChanges.xml into the ZIP file if present in chrome.storage.local
   * @param {string} base64Content - Clean Base64 zip string
   * @returns {Promise<string>} Clean Base64 zip string (potentially with destructiveChanges.xml injected)
   */
  async injectDestructiveChangesIfEnabled(base64Content) {
    try {
      const result = await chrome.storage.local.get('destructiveChangesXmlContent');
      const destructiveXml = result.destructiveChangesXmlContent;
      
      if (!destructiveXml || typeof destructiveXml !== 'string' || destructiveXml.trim() === '') {
        return base64Content;
      }
      
      console.log('[ZIP Handler] Destructive changes manifest found, loading JSZip...');
      const JSZip = self.JSZip;
      if (!JSZip) {
        console.error('[ZIP Handler] JSZip library not found on self. Exporting unmodified zip.');
        return base64Content;
      }
      
      const zip = await JSZip.loadAsync(base64Content, { base64: true });
      
      // We need to find package.xml inside the zip to determine the target directory.
      let packageXmlPath = null;
      zip.forEach((relativePath, file) => {
        if (relativePath.endsWith('package.xml')) {
          packageXmlPath = relativePath;
        }
      });
      
      if (!packageXmlPath) {
        console.error('[ZIP Handler] package.xml not found in zip file. Injecting at root.');
        packageXmlPath = 'package.xml';
      }
      
      // Get parent path (directory prefix)
      const lastSlashIndex = packageXmlPath.lastIndexOf('/');
      const parentDir = lastSlashIndex !== -1 ? packageXmlPath.substring(0, lastSlashIndex + 1) : '';
      const destructivePath = `${parentDir}destructiveChanges.xml`;
      
      console.log(`[ZIP Handler] Injecting destructiveChanges.xml at path: ${destructivePath}`);
      zip.file(destructivePath, destructiveXml);
      
      console.log('[ZIP Handler] Regenerating ZIP file with destructiveChanges.xml...');
      const newBase64 = await zip.generateAsync({ type: 'base64' });
      console.log('[ZIP Handler] Regenerated successfully with destructiveChanges.xml.');
      return newBase64;
    } catch (error) {
      console.error('[ZIP Handler] Error injecting destructive changes XML:', error);
      return base64Content; // Fallback to original content
    }
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
      const injectedBase64 = await this.injectDestructiveChangesIfEnabled(cleanBase64);
      
      // Process profile downsizing
      const processedBase64 = await this.downsizeZipIfEnabled(injectedBase64);
      
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
