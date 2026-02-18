export const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        if (!response.ok) {
            throw new Error('Geocoding failed');
        }
        const data = await response.json();
        return data.display_name || 'Unknown Location';
    } catch (error) {
        console.error('Error fetching address:', error);
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
};
