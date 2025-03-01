// ... (Keep all other functions unchanged)

// Function to display results on the webpage in a perfect Booking.com-inspired format
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (!resultsContainer || !loadingIndicator) {
        console.error('Results container or loading indicator not found.');
        return;
    }
    
    loadingIndicator.style.display = 'none';
    
    if (result.error) {
        resultsContainer.className = 'error';
        resultsContainer.innerHTML = `
            <div style="padding: 15px;">
                <h3 style="color: #d32f2f; margin-top: 0;">Search Error</h3>
                <p>${result.error}</p>
                <p>Please try again or modify your search criteria.</p>
                ${result.details ? `<p style="color: #666; font-size: 14px;">${result.details}</p>` : ''}
            </div>
        `;
        
        if (result.rawResponse || result.rawStatus) {
            resultsContainer.innerHTML += `
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #555;">Technical Details (for debugging)</summary>
                    <pre>
                        ${result.rawResponse || result.rawStatus}
                    </pre>
                </details>
            `;
        }
        
        if (result.hotels && Array.isArray(result.hotels) && result.hotels.length > 0) {
            resultsContainer.innerHTML += '<h3 style="margin-top: 20px; color: #2e7d32;">Partial Results (if available):</h3>';
            result.hotels.forEach((hotel, index) => {
                const hotelName = hotel.name || 'Unknown Hotel';
                const hotelCode = hotel.code || hotel.id || 'N/A';
                const location = hotel.destinationName || hotel.location || hotel.destinationCode || 'N/A';
                let price = 'N/A';
                let cancellationPolicy = 'Contact for details';
                let rateKey = '';
                let imageUrl = 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(hotelName); // Default placeholder

                // Extract price, cancellation policy, and rate key from rates (if available)
                if (hotel.rooms && Array.isArray(hotel.rooms)) {
                    const room = hotel.rooms[0]; // Use the first room for simplicity
                    if (room.rates && Array.isArray(room.rates)) {
                        const rate = room.rates[0]; // Use the first rate
                        rateKey = rate.rateKey || '';
                        price = rate.net ? `$${parseFloat(rate.net).toFixed(2)}` : 'N/A';
                        if (rate.rateClass === 'NRF') {
                            cancellationPolicy = 'Non-refundable';
                        } else if (rate.cancellationPolicies && Array.isArray(rate.cancellationPolicies)) {
                            const policy = rate.cancellationPolicies[0];
                            cancellationPolicy = policy.from ? 
                                `Cancel by ${new Date(policy.from).toLocaleDateString()} for $${policy.amount || 0}` : 
                                'Contact for details';
                        }
                    }
                }

                // Extract image URL from hotel images (if available)
                if (hotel.images && Array.isArray(hotel.images)) {
                    const image = hotel.images.find(img => img.imageTypeCode === 'EXT' || img.imageTypeCode === 'RES'); // Prioritize exterior or resort images
                    if (image && image.path) {
                        // Construct the full image URL (Hotelbeds provides partial paths; prepend the base URL)
                        imageUrl = `https://photos.hotelbeds.com/giata/bigger/${image.path}`;
                    }
                }

                resultsContainer.innerHTML += `
                    <div class="hotel-result">
                        <img src="${imageUrl}" 
                            alt="${hotelName}" 
                            class="hotel-image" 
                            onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(hotelName)}';">
                        <div class="hotel-details">
                            <h4>${index + 1}. ${hotelName} (${hotelCode})</h4>
                            <p><strong>Location:</strong> ${location}</p>
                            <p><strong>Price:</strong> ${price}</p>
                            <p><strong>Cancellation:</strong> ${cancellationPolicy}</p>
                            ${rateKey ? `<p style="font-size: 12px; color: #666;">Rate ID: ${rateKey.substring(0, 20)}...</p>` : ''}
                            <p><strong>Category:</strong> ${hotel.categoryName || hotel.categoryCode || 'N/A'}</p>
                            <p><strong>Facilities:</strong> ${hotel.facilities ? hotel.facilities.map(f => f.facilityName || 'N/A').join(', ') : 'N/A'}</p>
                        </div>
                    </div>
                `;
            });
        }
        return;
    }

    // Success case - extract and display hotels
    try {
        let hotels = [];
        if (Array.isArray(result)) {
            hotels = result;
        } else if (result.hotels && Array.isArray(result.hotels)) {
            hotels = result.hotels;
        } else if (result.data && result.data.hotels && Array.isArray(result.data.hotels)) {
            hotels = result.data.hotels;
        } else if (result.body && result.body.hotels && Array.isArray(result.body.hotels)) {
            hotels = result.body.hotels;
        } else if (result.body && result.body.data && result.body.data.hotels && Array.isArray(result.body.data.hotels)) {
            hotels = result.body.data.hotels;
        } else if (result.auditData && result.hotels && Array.isArray(result.hotels)) {
            hotels = result.hotels;
        } else {
            hotels = scrapeHotelsFromString(result.rawResponse || '').hotels || [];
        }

        if (hotels.length > 0) {
            resultsContainer.className = 'success';
            resultsContainer.innerHTML = `
                <h3 style="margin-top: 0; color: #2e7d32;">We found ${hotels.length} hotels for your search!</h3>
                <p style="color: #555;">Showing results for ${document.getElementById('destination').value} from 
                   ${document.getElementById('checkin').value} to ${document.getElementById('checkout').value} 
                   for ${document.getElementById('travellers').value} traveller(s).</p>
                <div id="hotelList"></div>
            `;

            const hotelList = document.getElementById('hotelList');
            hotels.forEach((hotel, index) => {
                const hotelName = hotel.name || 'Unknown Hotel';
                const hotelCode = hotel.code || hotel.id || 'N/A';
                const location = hotel.destinationName || hotel.location || hotel.destinationCode || 'N/A';
                let price = 'N/A';
                let cancellationPolicy = 'Contact for details';
                let rateKey = '';
                let imageUrl = 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(hotelName); // Default placeholder

                // Extract price, cancellation policy, and rate key from rates (if available)
                if (hotel.rooms && Array.isArray(hotel.rooms)) {
                    const room = hotel.rooms[0]; // Use the first room for simplicity
                    if (room.rates && Array.isArray(room.rates)) {
                        const rate = room.rates[0]; // Use the first rate
                        rateKey = rate.rateKey || '';
                        price = rate.net ? `$${parseFloat(rate.net).toFixed(2)}` : 'N/A';
                        if (rate.rateClass === 'NRF') {
                            cancellationPolicy = 'Non-refundable';
                        } else if (rate.cancellationPolicies && Array.isArray(rate.cancellationPolicies)) {
                            const policy = rate.cancellationPolicies[0];
                            cancellationPolicy = policy.from ? 
                                `Cancel by ${new Date(policy.from).toLocaleDateString()} for $${policy.amount || 0}` : 
                                'Contact for details';
                        }
                    }
                }

                // Extract image URL from hotel images (if available)
                if (hotel.images && Array.isArray(hotel.images)) {
                    const image = hotel.images.find(img => img.imageTypeCode === 'EXT' || img.imageTypeCode === 'RES'); // Prioritize exterior or resort images
                    if (image && image.path) {
                        // Construct the full image URL (Hotelbeds provides partial paths; prepend the base URL)
                        imageUrl = `https://photos.hotelbeds.com/giata/bigger/${image.path}`;
                    }
                }

                hotelList.innerHTML += `
                    <div class="hotel-result">
                        <img src="${imageUrl}" 
                            alt="${hotelName}" 
                            class="hotel-image" 
                            onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(hotelName)}';">
                        <div class="hotel-details">
                            <h4>${index + 1}. ${hotelName} (${hotelCode})</h4>
                            <p><strong>Location:</strong> ${location}</p>
                            <p><strong>Price:</strong> ${price}</p>
                            <p><strong>Cancellation:</strong> ${cancellationPolicy}</p>
                            ${rateKey ? `<p style="font-size: 12px; color: #666;">Rate ID: ${rateKey.substring(0, 20)}...</p>` : ''}
                            <p><strong>Category:</strong> ${hotel.categoryName || hotel.categoryCode || 'N/A'}</p>
                            <p><strong>Facilities:</strong> ${hotel.facilities ? hotel.facilities.map(f => f.facilityName || 'N/A').join(', ') : 'N/A'}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            resultsContainer.className = 'warning';
            resultsContainer.innerHTML = `
                <h3 style="margin-top: 0; color: #856404;">No Hotels Found</h3>
                <p>We couldn't find any hotels matching your search criteria. Please try:</p>
                <ul style="list-style: disc; padding-left: 20px;">
                    <li>Checking different dates</li>
                    <li>Searching for a different destination</li>
                    <li>Adjusting the number of travelers</li>
                </ul>
            `;
        }
    } catch (error) {
        console.error('Error displaying results:', error);
        resultsContainer.className = 'error';
        resultsContainer.innerHTML = `
            <h3 style="margin-top: 0; color: #d32f2f;">Display Error</h3>
            <p>There was a problem displaying your search results. Please try again.</p>
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #555;">Technical Details</summary>
                <pre>
                    Error: ${error.message}
                    Data: ${JSON.stringify(result, null, 2).substring(0, 2000)}...
                </pre>
            </details>
        `;
    }
}

// ... (Keep all other functions unchanged)
