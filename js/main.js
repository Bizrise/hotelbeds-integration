document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        destination: document.getElementById('destination').value,
        checkin: document.getElementById('checkin').value,
        checkout: document.getElementById('checkout').value,
        travelers: document.getElementById('travelers').value
    };

    const hotelList = document.getElementById('hotelList');
    hotelList.innerHTML = 'Searching for your perfect stay...';

    try {
        const response = await fetch('https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        displayHotels(data.hotels || []);
    } catch (error) {
        hotelList.innerHTML = `
            <h3>Oops!</h3>
            <p>Something went wrong. Please try again later.</p>
        `;
        console.error('Error:', error);
    }
});

function displayHotels(hotels) {
    const hotelList = document.getElementById('hotelList');
    hotelList.innerHTML = '';

    hotels.forEach(hotel => {
        const hotelCard = document.createElement('div');
        hotelCard.className = 'hotel-card';
        hotelCard.innerHTML = `
            <img src="${hotel.images?.[0] || 'placeholder.jpg'}" alt="${hotel.name}">
            <div class="hotel-info">
                <div class="hotel-name">${hotel.name}</div>
                <div class="hotel-rating">★★★★★ ${hotel.rating} (${hotel.reviews} Reviews)</div>
                <div class="amenities">
                    ${hotel.amenities?.map(amenity => `<span>${amenity}</span>`).join(' ')}
                </div>
                ${hotel.rooms.map(room => `
                    <div class="room-option">
                        <div>${room.type}</div>
                        <div>${room.availability}</div>
                        <div>${room.cancellation}</div>
                        <div class="price">${hotel.currency || 'RM'} ${room.price}</div>
                        <button class="add-btn">Add</button>
                    </div>
                `).join('')}
                <div>Location: ${hotel.location}</div>
                <button class="view-rooms-btn">View Rooms</button>
            </div>
        `;
        hotelList.appendChild(hotelCard);
    });
}

// Filter functionality
document.getElementById('applyFilters').addEventListener('click', () => {
    const boardFilters = Array.from(document.querySelectorAll('input[name="board"]:checked')).map(cb => cb.value);
    const ratingFilters = Array.from(document.querySelectorAll('input[name="rating"]:checked')).map(cb => parseInt(cb.value));
    const zoneFilters = Array.from(document.querySelectorAll('input[name="zone"]:checked')).map(cb => cb.value);

    // This would require access to the full hotels data (you might need to store it globally or refetch)
    // For simplicity, this is a placeholder. You’d need to filter the hotels based on the stored data.
    console.log('Applying filters:', { board: boardFilters, rating: ratingFilters, zone: zoneFilters });
    // Update displayHotels with filtered results here
});

// Sorting functionality
document.getElementById('sortBy').addEventListener('change', (e) => {
    // This would require access to the full hotels data (you might need to store it globally or refetch)
    // For simplicity, this is a placeholder. You’d need to sort the hotels based on the selected option.
    console.log('Sorting by:', e.target.value);
    // Update displayHotels with sorted results here
});
