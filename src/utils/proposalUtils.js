export const autoExpireProposals = () => {
    try {
        const proposalsStr = localStorage.getItem('cooplance_db_proposals');
        if (!proposalsStr) return;

        let proposals = JSON.parse(proposalsStr);
        let updated = false;
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        proposals = proposals.map(prop => {
            if (prop.status === 'pending') {
                let isExpired = false;

                if (prop.expirationDate) {
                    const expTime = new Date(prop.expirationDate).getTime();
                    if (now > expTime) {
                        isExpired = true;
                    }
                } else if (prop.createdAt) {
                    const createdTime = new Date(prop.createdAt).getTime();
                    if (now > createdTime + THIRTY_DAYS_MS) {
                        isExpired = true;
                    }
                }

                if (isExpired) {
                    prop.status = 'expired';
                    updated = true;
                }
            }
            return prop;
        });

        if (updated) {
            localStorage.setItem('cooplance_db_proposals', JSON.stringify(proposals));
        }
    } catch (e) {
        console.error("Error auto-expiring proposals:", e);
    }
};
