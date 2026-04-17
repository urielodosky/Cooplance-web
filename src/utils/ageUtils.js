/**
 * Calculates age from a date of birth string.
 * @param {string} dobString - Date of birth in YYYY-MM-DD or similar format.
 * @returns {number} Age in years.
 */
export const calculateAge = (dobString) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    
    // Safety check for invalid dates
    if (isNaN(birthDate.getTime())) return 0;

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};
