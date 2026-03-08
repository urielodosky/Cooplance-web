import malePlaceholder from '../assets/placeholders/male-placeholder.png';
import femalePlaceholder from '../assets/placeholders/female-placeholder.png';
import otherPlaceholder from '../assets/placeholders/other-placeholder.png';

export const GENDER_PLACEHOLDERS = {
    male: malePlaceholder,
    female: femalePlaceholder,
    other: otherPlaceholder
};

export const getProfilePicture = (user) => {
    if (!user) return GENDER_PLACEHOLDERS.other;
    if (user.avatar) return user.avatar;
    if (user.profilePicture) return user.profilePicture;

    // Fallback to UI Avatars if we have a name
    const nameStr = user.companyName || user.firstName || user.username;
    if (nameStr) {
        const bg = user.role === 'company' ? '6366f1' : user.role === 'freelancer' ? '8b5cf6' : '3b82f6';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=${bg}&color=fff&size=256`;
    }

    return GENDER_PLACEHOLDERS[user.gender] || GENDER_PLACEHOLDERS.other;
};
