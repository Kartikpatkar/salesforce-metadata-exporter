export class AuthManager {
    /**
     * Validate session via Salesforce API
     * @param {string} apiBase - The API base URL
     * @param {string} sessionId - The session ID to validate
     * @returns {Promise<Object>}
     */
    static async validateSessionViaApi(apiBase, sessionId) {
        if (!apiBase || !sessionId) {
            return { success: false, error: 'Missing apiBase or sessionId' };
        }

        // Try REST API with Bearer token
        const url = `${apiBase}/services/data/v59.0/limits`;
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                return { success: true, status: res.status };
            }

            const bodyText = await res.text();
            return {
                success: false,
                status: res.status,
                statusText: res.statusText,
                bodyPreview: bodyText.substring(0, 200)
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}
