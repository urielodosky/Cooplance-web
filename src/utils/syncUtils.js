export const syncUserGamificationData = (user) => {
    if (!user || !user.id) return;

    // Sync Teams
    try {
        const teamsStr = localStorage.getItem('cooplance_db_teams');
        if (teamsStr) {
            let teams = JSON.parse(teamsStr);
            let updated = false;
            teams = teams.map(team => {
                if (team.members) {
                    const idx = team.members.findIndex(m => m.userId === user.id || m.userId == user.id);
                    if (idx !== -1) {
                        if (team.members[idx].level !== user.level || team.members[idx].vacation !== user.gamification?.vacation?.active) {
                            team.members[idx].level = user.level;
                            team.members[idx].vacation = user.gamification?.vacation?.active;
                            updated = true;
                        }
                    }
                }
                return team;
            });
            if (updated) localStorage.setItem('cooplance_db_teams', JSON.stringify(teams));
        }
    } catch(e){ console.error("Error syncing teams:", e); }

    // Sync Services
    try {
        const servicesStr = localStorage.getItem('cooplance_db_services');
        if (servicesStr) {
            let services = JSON.parse(servicesStr);
            let updated = false;
            services = services.map(service => {
                if (service.freelancerId === user.id || service.freelancerId == user.id) {
                    if (service.level !== user.level) {
                        service.level = user.level;
                        updated = true;
                    }
                }
                return service;
            });
            if (updated) localStorage.setItem('cooplance_db_services', JSON.stringify(services));
        }
    } catch(e){ console.error("Error syncing services:", e); }

    // Sync Proposals
    try {
        const proposalsStr = localStorage.getItem('cooplance_db_proposals');
        if (proposalsStr) {
            let proposals = JSON.parse(proposalsStr);
            let updated = false;
            proposals = proposals.map(prop => {
                if (prop.freelancerId === user.id || prop.freelancerId == user.id) {
                    if (prop.freelancerLevel !== user.level) {
                        prop.freelancerLevel = user.level;
                        updated = true;
                    }
                }
                return prop;
            });
            if (updated) localStorage.setItem('cooplance_db_proposals', JSON.stringify(proposals));
        }
    } catch(e){ console.error("Error syncing proposals:", e); }
};
