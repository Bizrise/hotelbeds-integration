// Store hotels globally to enable filtering and sorting
let hotelsData = [];

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        destination: document.getElementById('destination').value,
        checkin: document.getElementById('checkin').value,
        checkout: document.getElementById('checkout').value,
        travelers: document.getElementById('travelers').value
    };

    const hotelList = document.getElementById('hotelList');
    hotelList.innerHTML = '<p class="loading">Searching for your perfect stay...</p>';

    try {
        const response = await fetch('https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        hotelsData = data.hotels || [];
        updateHotelDisplay(hotelsData);
        document.getElementById('hotelCount').textContent = `${hotelsData.length} Hotels`;
    } catch (error) {
        hotelList.innerHTML = `
            <h3>Oops!</h3>
            <p>Something went wrong. Please try again later. Error: ${error.message}</p>
        `;
        console.error('Fetch error:', error);
    }
});

function updateHotelDisplay(hotels) {
    const hotelList = document.getElementById('hotelList');
    hotelList.innerHTML = '';

    if (!hotels.length) {
        hotelList.innerHTML = '<p>No hotels found.</p>';
        return;
    }

    hotels.forEach(hotel => {
        const hotelCard = document.createElement('div');
        hotelCard.className = 'hotel-card';
        hotelCard.innerHTML = `
            <img src="${hotel.images?.[0] || 'https://via.placeholder.com/200x150'}" alt="${hotel.name}">
            <div class="hotel-info">
                <div class="hotel-name">${hotel.name}</div>
                <div class="hotel-rating">★★★★★ ${hotel.rating || 0} (${hotel.reviews || 0} Reviews)</div>
                <div class="amenities">
                    ${hotel.amenities?.map(amenity => `<span><i class="fas fa-${getAmenityIcon(amenity)}"></i>${amenity}</span>`).join(' ') || ''}
                </div>
                ${hotel.rooms?.map(room => `
                    <div class="room-option">
                        <div>${room.type || 'Standard Room'}</div>
                        <div>${room.availability || 'Available'}</div>
                        <div>${room.cancellation || 'Cancellation policy not available'}</div>
                        <div class="price">${hotel.currency || 'RM'} ${room.price || 0}</div>
                        <button class="add-btn">Add</button>
                    </div>
                `).join('') || '<p>No rooms available</p>'}
                <div>Location: ${hotel.location || 'Not specified'}</div>
                <button class="view-rooms-btn">View Rooms</button>
            </div>
        `;
        hotelList.appendChild(hotelCard);
    });
}

function getAmenityIcon(amenity) {
    const icons = {
        'Parking': 'car',
        'Air Conditioned': 'snowflake',
        'Restaurant': 'utensils',
        'Gym': 'dumbbell',
        'Internet': 'wifi'
    };
    return icons[amenity] || 'question';
}

// Filter functionality
document.getElementById('applyFilters').addEventListener('click', () => {
    const boardFilters = Array.from(document.querySelectorAll('input[name="board"]:checked')).map(cb => cb.value);
    const ratingFilters = Array.from(document.querySelectorAll('input[name="rating"]:checked')).map(cb => parseInt(cb.value));
    const zoneFilters = Array.from(document.querySelectorAll('input[name="zone"]:checked')).map(cb => cb.value);

    let filteredHotels = [...hotelsData];

    if (boardFilters.length) {
        filteredHotels = filteredHotels.filter(hotel => 
            hotel.rooms?.some(room => boardFilters.includes(room.type.toLowerCase().replace(' ', '_')))
        );
    }

    if (ratingFilters.length) {
        filteredHotels = filteredHotels.filter(hotel => ratingFilters.includes(Math.floor(hotel.rating || 0)));
    }

    if (zoneFilters.length) {
        filteredHotels = filteredHotels.filter(hotel => zoneFilters.includes(hotel.location.toLowerCase().replace(' ', '_')));
    }

    updateHotelDisplay(filteredHotels);
    document.getElementById('hotelCount').textContent = `${filteredHotels.length} Hotels`;
});

// Sorting functionality
document.getElementById('sortBy').addEventListener('change', (e) => {
    let sortedHotels = [...hotelsData];
    switch (e.target.value) {
        case 'price_low':
            sortedHotels.sort((a, b) => (a.rooms?.[0]?.price || 0) - (b.rooms?.[0]?.price || 0));
            break;
        case 'price_high':
            sortedHotels.sort((a, b) => (b.rooms?.[0]?.price || 0) - (a.rooms?.[0]?.price || 0));
            break;
        case 'suggested':
        default:
            // No sorting or default sorting (e.g., by relevance, which you can define)
            break;
    }
    updateHotelDisplay(sortedHotels);
});

// Results per page (basic implementation)
document.getElementById('resultsPerPage').addEventListener('change', (e) => {
    // This is a placeholder; you’d need pagination logic or slicing
    const perPage = parseInt(e.target.value);
    updateHotelDisplay(hotelsData.slice(0, perPage));
});

// Show Map (placeholder functionality)
document.getElementById('showMap').addEventListener('click', () => {
    alert('Map view functionality to be implemented. Integrate with a mapping API like Google Maps.');
});
