/**
 * SOAP API Client
 * Provides base capabilities for executing SOAP requests
 */
export class SoapClient {
  constructor(sessionId, endpoint, apiVersion) {
    this.sessionId = sessionId;
    this.endpoint = endpoint;
    this.apiVersion = apiVersion;
  }

  /**
   * Build SOAP envelope
   * @protected
   */
  _soapEnvelope(action, innerXml) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
  <env:Header>
    <SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata">
      <sessionId>${this.sessionId}</sessionId>
    </SessionHeader>
  </env:Header>
  <env:Body>
    <${action} xmlns="http://soap.sforce.com/2006/04/metadata">
      ${innerXml}
    </${action}>
  </env:Body>
</env:Envelope>`;
  }

  /**
   * Send SOAP request with exponential backoff retry
   * @protected
   */
  async _postSoap(url, body, maxRetries = 3) {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= maxRetries) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': '""'
          },
          body: body
        });
        
        if (!res.ok) {
          const text = await res.text();
          console.error(`[SOAP Client] Error Response (attempt ${attempt + 1}):`, text.slice(0, 500));
          if (res.status >= 500 && attempt < maxRetries) {
            attempt++;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
            continue;
          }
          throw new Error(`Metadata API error ${res.status}: ${res.statusText}`);
        }
        
        return await res.text();

      } catch (error) {
        if (attempt < maxRetries && !error.message.startsWith('Metadata API error 4')) {
          attempt++;
          console.warn(`[SOAP Client] Network error on attempt ${attempt}, retrying in ${delay}ms:`, error.message);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Extract value from XML element
   * @protected
   */
  _extractXmlValue(xml, tagName) {
    const regex = new RegExp(`<[^>]*:?${tagName}(?:\\s+[^>]*)?>(.*?)<\\/[^>]*:?${tagName}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }
  
  /**
   * Escape XML special characters
   * @protected
   */
  _escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
