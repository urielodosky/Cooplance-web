export const GENDER_PLACEHOLDERS = {
    male: 'https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&size=256',
    female: 'https://ui-avatars.com/api/?name=User&background=ec4899&color=fff&size=256',
    other: 'https://ui-avatars.com/api/?name=User&background=6b7280&color=fff&size=256'
};

export const getProfilePicture = (user) => {
    if (!user) return GENDER_PLACEHOLDERS.other;
    
    // Check all possible avatar fields (Supabase + legacy)
    if (user.avatar_url) return user.avatar_url;
    if (user.avatar) return user.avatar;
    if (user.profilePicture) return user.profilePicture;

    // Fallback to UI Avatars if we have a name
    const nameStr = user.username || user.company_name || user.companyName || user.first_name || user.firstName;
    if (nameStr) {
        const bg = user.role === 'company' ? '6366f1' : user.role === 'freelancer' ? '8b5cf6' : '3b82f6';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=${bg}&color=fff&size=256`;
    }

    return GENDER_PLACEHOLDERS[user.gender] || GENDER_PLACEHOLDERS.other;
};

