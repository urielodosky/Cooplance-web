export const getAvailableSlots = (dateString, bookingConfig, existingBookings = []) => {
    if (!bookingConfig || !bookingConfig.requiresBooking || !bookingConfig.availability) {
        return [];
    }

    // Parse day of week from dateString (YYYY-MM-DD)
    const dateObj = new Date(dateString + 'T00:00:00'); // Prevent timezone shift
    if (isNaN(dateObj.getTime())) return [];

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[dateObj.getDay()];

    const dayConfig = bookingConfig.availability[dayOfWeek];
    if (!dayConfig || !dayConfig.isActive || !dayConfig.shifts || dayConfig.shifts.length === 0) {
        return [];
    }

    const { slotDurationMinutes, bufferTimeMinutes } = bookingConfig.sessionDetails;
    const totalSlotLength = Number(slotDurationMinutes) + Number(bufferTimeMinutes);

    // Filter existing bookings for the specified date
    const bookedSlotsForDate = existingBookings.filter(b => b.date === dateString);

    let availableSlots = [];

    const getMinutes = (timeStr) => {
        const [hours, mins] = timeStr.split(':').map(Number);
        return hours * 60 + mins;
    };

    const formatTime = (minutes) => {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    dayConfig.shifts.forEach(shift => {
        if (!shift.start || !shift.end) return;

        let currentMin = getMinutes(shift.start);
        const endMin = getMinutes(shift.end);

        while (currentMin + Number(slotDurationMinutes) <= endMin) {
            const timeStr = formatTime(currentMin);
            
            // Check if this slot overlaps with any existing booking
            const isBooked = bookedSlotsForDate.some(b => {
                const bStart = getMinutes(b.time);
                const bEnd = bStart + Number(b.duration);
                const sStart = currentMin;
                const sEnd = currentMin + Number(slotDurationMinutes);

                // Overlap condition
                return (sStart < bEnd && sEnd > bStart);
            });

            availableSlots.push({ time: timeStr, isBooked });

            // Move to next slot considering buffer
            currentMin += totalSlotLength;
        }
    });

    // Remove duplicates and sort
    const uniqueSlotsMap = new Map();
    availableSlots.forEach(slot => {
        // If a slot exists from another shift and is NOT booked there, we prefer the not-booked status
        // But usually shifts shouldn't overlap. Just take the first one or the one that is booked
        if (!uniqueSlotsMap.has(slot.time) || (uniqueSlotsMap.has(slot.time) && slot.isBooked)) {
            uniqueSlotsMap.set(slot.time, slot);
        }
    });

    return Array.from(uniqueSlotsMap.values()).sort((a, b) => getMinutes(a.time) - getMinutes(b.time));
};
