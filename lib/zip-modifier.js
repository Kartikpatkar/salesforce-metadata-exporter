export class ZipModifier {
  /**
   * Process profile/permissionset downsizing if enabled in settings
   * @param {string} base64Content - Clean Base64 zip string
   * @returns {Promise<string>} Clean Base64 zip string (potentially downsized)
   */
  static async downsizeZipIfEnabled(base64Content) {
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
      return base64Content; 
    }
  }
  
  /**
   * Inject destructiveChanges.xml into the ZIP file if present in chrome.storage.local
   * @param {string} base64Content - Clean Base64 zip string
   * @returns {Promise<string>} Clean Base64 zip string (potentially with destructiveChanges.xml injected)
   */
  static async injectDestructiveChangesIfEnabled(base64Content) {
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
      return base64Content;
    }
  }
}
