export class CookieManager {
    static async getSalesforceCookies(hostname, apiHostname) {
        const cookieDomains = [
            hostname,
            `.${hostname}`,
            apiHostname,
            `.${apiHostname}`,
            '.salesforce.com',
            '.my.salesforce.com',
            '.force.com'
        ];

        const allCookies = [];
        for (const domain of cookieDomains) {
            try {
                const cookies = await chrome.cookies.getAll({ domain });
                allCookies.push(...cookies);
            } catch (e) {
                // Ignore cookie fetch errors
            }
        }

        const scoreCookie = (cookie) => {
            let score = 0;
            if (cookie.name === 'sid') score += 3;
            else if (cookie.name.startsWith('sid_')) score += 2;
            else if (cookie.name.includes('sid')) score += 1;
            else if (cookie.name.endsWith('_sid')) score += 1;

            const cDomain = (cookie.domain || '').replace(/^\./, '');
            if (cDomain === hostname || cDomain === apiHostname) {
                score += 100;
            } else if (hostname.endsWith(cDomain) || apiHostname.endsWith(cDomain)) {
                score += 10;
            }
            return score;
        };

        const seenValues = new Set();
        return allCookies
            .filter(c => {
                if (!c.name || !c.value || seenValues.has(c.value)) return false;
                const isSid = c.name === 'sid' ||
                              c.name.startsWith('sid_') ||
                              c.name.includes('sid') ||
                              c.name.endsWith('_sid');
                if (isSid) {
                    seenValues.add(c.value);
                    return true;
                }
                return false;
            })
            .sort((a, b) => scoreCookie(b) - scoreCookie(a));
    }
}
