const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/Cooplance/Cooplance-web/src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const newEffect = `    // V42: Automatic Review Prompt for completed jobs (ONLY for Clients) + Track reviewed status
    useEffect(() => {
        if (!user || loading) return;
        
        const checkReviews = async () => {
            // Only prompt automatically for jobs where I am the BUYER (myOrders)
            const jobsToPrompt = myOrders.filter(j => j.status === 'completed');
            const allJobsForTracking = [...myWork, ...myOrders].filter(j => j.status === 'completed');
            
            if (allJobsForTracking.length === 0) return;

            try {
                const results = await Promise.all(
                    allJobsForTracking.map(async (job) => {
                        const reviewed = await ReviewService.hasUserReviewedJob(job.id, user.id);
                        return { id: job.id, reviewed };
                    })
                );

                const newReviewedMap = {};
                results.forEach(r => newReviewedMap[r.id] = r.reviewed);
                setReviewedJobs(newReviewedMap);

                // Auto prompt logic: ONLY if I am the buyer and haven't reviewed yet
                if (!selectedJobForReview) {
                    const sortedPromptJobs = jobsToPrompt.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
                    for (const job of sortedPromptJobs) {
                        if (!newReviewedMap[job.id]) {
                            console.log(\`[Dashboard] Automatic review prompt for client job: \${job.id}\`);
                            setSelectedJobForReview(job);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn("Error checking reviews:", e);
            }
        };
        
        const timer = setTimeout(checkReviews, 2000);
        return () => clearTimeout(timer);
    }, [myWork.length, myOrders.length, user?.id, loading]);`;

// Replace the V42 useEffect
// We match based on the V42 comment and the dependency array
content = content.replace(
    /\/\/ V42: Automatic Review Prompt for completed jobs \+ Track reviewed status[\s\S]+?\}\, \[myWork\.length\, myOrders\.length\, user\?\.id\, loading\]\)\;/,
    newEffect
);

fs.writeFileSync(path, content);
console.log('Updated automatic review prompt to only trigger for clients');
