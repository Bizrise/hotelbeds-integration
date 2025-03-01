// Initialize the page when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    createResultsContainer();
    setupFormListeners();
    // Ensure loading indicator is hidden on page load (extra safety)
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator && loadingIndicator.style.display !== 'none') {
        loadingIndicator.style.display = 'none';
    }
});

// Webhook URL for backend integration with Make.com
const WEBHOOK_URL = 'https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k';

// State management
let isProcessing = false;
let currentRequest = null;

// Create results container and loading indicator
function createResultsContainer() {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) {
        console.error('Booking card element not found. Make sure you have a div with class="booking-card".');
        return;
    }
    
    // Create results container if it doesn't exist
    let resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'resultsContainer';
        resultsContainer.className = 'success'; // Default to success style
        resultsContainer.style.marginTop = '20px';
        resultsContainer.style.padding = '15px';
        resultsContainer.style.borderRadius = '6px';
        resultsContainer.style.display = 'none';
        bookingCard.appendChild(resultsContainer);
    }
    
    // Create loading indicator if it doesn't exist, initially hidden
    let loadingIndicator = document.getElementById('loadingIndicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.style.display = 'none'; // Ensure it's hidden by default
        loadingIndicator.style.marginTop = '20px';
        loadingIndicator.style.padding = '15px';
        loadingIndicator.style.borderRadius = '6px';
        loadingIndicator.style.backgroundColor = '#f5f5f5';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (5 minutes).</p>';
        bookingCard.appendChild(loadingIndicator);
    }
    // Additional safety check to hide loading indicator on page load
    if (loadingIndicator && loadingIndicator.style.display !== 'none') {
        loadingIndicator.style.display = 'none';
    }
}

// Handle tab visibility for better performance and retry
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isProcessing) {
        console.log('Tab is hidden, pausing processing...');
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = '<p style="color: #0077ff;">Search paused. Return to this tab to resume.</p>';
        }
    } else if (!document.hidden && isProcessing && currentRequest) {
        console.log('Tab is visible, resuming or retrying processing...');
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = '<p style="color: #0077ff;">Resuming search... Please wait.</p>';
        }
        retryProcessing(currentRequest);
    }
});

// Function to retry processing if tab was hidden
function retryProcessing(requestData) {
    if (!isProcessing) return;

    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }

    processRequest(requestData)
        .then(result => {
            isProcessing = false;
            displayResults(result);
        })
        .catch(error => {
            console.error('Retry failed:', error);
            isProcessing = false;
            displayResults({ error: 'Retry failed. Please try again.', details: error.message });
        });
}

// Improved function to process the request and analyze long string data, waiting longer for Make.com
async function processRequest(formData, maxAttempts = 3) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `<p style="color: #0077ff;">Searching for hotels... Attempt ${attempts + 1}/${maxAttempts}</p>`;
                loadingIndicator.style.display = 'block'; // Show only after form submission
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600000); // Extended to 10-minute timeout for fetch (600 seconds)

            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p style="color: #0077ff;">Connecting to hotel database... Please wait.</p>';
            }
            
            console.log('Sending request to webhook:', JSON.stringify(formData, null, 2));
            
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p style="color: #0077ff;">Waiting for Make.com to process... Please wait (5 minutes).</p>';
            }
            
            // Wait for 5 minutes (300,000 ms) to ensure Make.com completes
            await new Promise(resolve => {
                const timeout = setTimeout(() => {
                    resolve();
                }, 300000); // 5-minute delay (300 seconds)

                // Ensure the timeout continues even if the tab is hidden
                const checkInterval = setInterval(() => {
                    if (document.hidden) {
                        console.log('Tab is hidden, keeping timeout alive...');
                    } else {
                        clearInterval(checkInterval);
                    }
                }, 1000);

                // Clean up intervals when resolved
                resolve(() => {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                });
            });

            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p style="color: #0077ff;">Processing results... Almost done!</p>';
            }
            
            const textResponse = await response.text();
            console.log('Raw Webhook Response (Long String):', textResponse);

            // Analyze and structure the long string data
            let result = analyzeAndStructureLongString(textResponse);

            return result;

        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error);
            
            if (error.name === 'AbortError') {
                console.log('Fetch request timed out, retrying...');
            } else if (attempts === maxAttempts) {
                return {
                    error: `Failed after ${maxAttempts} attempts: ${error.message}`,
                    details: 'Please check your network connection and try again later.'
                };
            }

            const waitTime = 1000 * attempts;
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `<p style="color: #ff7700;">Connection issue. Retrying in ${waitTime/1000} seconds...</p>`;
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    
    return {
        error: 'Maximum retry attempts reached',
        details: 'The service is currently unavailable. Please try again later.'
    };
}

// Helper function to analyze and structure long string data
function analyzeAndStructureLongString(text) {
    let hotels = [];
    let error = null;
    let rawResponse = text;

    try {
        // Clean up the string and try to parse as JSON first
        let cleanedResponse = text.trim();
        
        // Handle string-escaped JSON or malformed responses
        if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
            cleanedResponse = cleanedResponse.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        // Try multiple JSON parsing attempts with cleanup
        let parsedData;
        try {
            parsedData = JSON.parse(cleanedResponse);
        } catch (jsonError) {
            console.warn('Initial JSON parse error:', jsonError);
            try {
                cleanedResponse = cleanedResponse.replace(/\\\\"/g, '\\"').replace(/\\n/g, '').replace(/\\r/g, '');
                parsedData = JSON.parse(cleanedResponse);
            } catch (secondJsonError) {
                console.error('Second JSON parse attempt failed:', secondJsonError);
                // If JSON parsing fails, scrape data from the long string
                parsedData = scrapeHotelsFromString(cleanedResponse);
            }
        }

        // Handle structured JSON if successfully parsed
        if (parsedData && (parsedData.hotels || parsedData.data?.hotels || parsedData.body?.hotels || parsedData.body?.data?.hotels)) {
            if (Array.isArray(parsedData.hotels)) {
                hotels = parsedData.hotels;
            } else if (parsedData.data && Array.isArray(parsedData.data.hotels)) {
                hotels = parsedData.data.hotels;
            } else if (parsedData.body && Array.isArray(parsedData.body.hotels)) {
                hotels = parsedData.body.hotels;
            } else if (parsedData.body && parsedData.body.data && Array.isArray(parsedData.body.data.hotels)) {
                hotels = parsedData.body.data.hotels;
            }
            return { hotels };
        }

        // If no structured hotels found, use scraped data
        if (parsedData && !hotels.length) {
            hotels = scrapeHotelsFromString(cleanedResponse).hotels || [];
        }

        if (hotels.length > 0) {
            return { hotels };
        }

        // Handle 'Accepted' or empty responses
        if (cleanedResponse === 'Accepted' || cleanedResponse.trim() === '') {
            return { 
                error: 'Invalid response format received from the hotel search API',
                rawResponse: 'Accepted',
                details: 'The API acknowledged the request but did not return hotel data. Please check Make.com configuration.'
            };
        }

        return {
            error: 'No hotels found or invalid response format',
            rawResponse: cleanedResponse.substring(0, 1000),
            details: 'The response does not contain recognizable hotel data structure.'
        };
    } catch (error) {
        console.error('Error analyzing and structuring long string:', error);
        const scrapedHotels = scrapeHotelsFromString(text).hotels || [];
        return { 
            error: 'Invalid response format received from the hotel search API',
            rawResponse: text.substring(0, 1000),
            details: error.message,
            hotels: scrapedHotels
        };
    }
}

// Helper function to scrape hotels from long string data
function scrapeHotelsFromString(text) {
    let hotels = [];
    try {
        const hotelLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let currentHotel = {};
        let inHotel = false;
        let inRates = false;

        for (const line of hotelLines) {
            // Start of a hotel object (look for code and name)
            if (line.includes('"code"') && line.includes('"name"')) {
                if (currentHotel.code || currentHotel.name) {
                    if (Object.keys(currentHotel).length > 0 && (currentHotel.code || currentHotel.name)) {
                        hotels.push(currentHotel);
                    }
                }
                currentHotel = {};
                inHotel = true;
                const codeMatch = line.match(/"code"\s*:\s*(\d+)/);
                const nameMatch = line.match(/"name"\s*:\s*"([^"]+)"/);
                if (codeMatch) currentHotel.code = codeMatch[1];
                if (nameMatch) currentHotel.name = nameMatch[1];
                continue;
            }

            // Hotel details
            if (inHotel && !inRates) {
                const destCodeMatch = line.match(/"destinationCode"\s*:\s*"([^"]+)"/);
                const destNameMatch = line.match(/"destinationName"\s*:\s*"([^"]+)"/);
                if (destCodeMatch) currentHotel.destinationCode = destCodeMatch[1];
                if (destNameMatch) currentHotel.destinationName = destNameMatch[1];

                // Start of rooms/rates
                if (line.includes('"rooms"') || line.includes('"rates"')) {
                    currentHotel.rates = [];
                    inRates = true;
                }
            }

            // Rate details
            if (inRates) {
                const rateKeyMatch = line.match(/"rateKey"\s*:\s*"([^"]+)"/);
                const amountMatch = line.match(/"net"\s*:\s*([\d.]+)/);
                const cancellationMatch = line.match(/"cancellationPolicies"\s*:\s*\[\s*{\s*"amount"\s*:\s*([\d.]+),\s*"from"\s*:\s*"([^"]+)"\s*}/);

                if (!currentHotel.rates) currentHotel.rates = [];

                if (rateKeyMatch || amountMatch || cancellationMatch) {
                    const rate = {};
                    if (rateKeyMatch) rate.rateKey = rateKeyMatch[1];
                    if (amountMatch) rate.net = amountMatch[1];
                    if (cancellationMatch) {
                        rate.cancellationPolicies = [{
                            amount: cancellationMatch[1],
                            from: cancellationMatch[2]
                        }];
                    }
                    currentHotel.rates.push(rate);
                }

                // End of rates or hotel (assuming '}' indicates closure)
                if (line.includes('}')) {
                    inRates = false;
                    inHotel = false;
                    if (Object.keys(currentHotel).length > 0 && (currentHotel.code || currentHotel.name)) {
                        hotels.push(currentHotel);
                    }
                    currentHotel = {};
                }
            }
        }

        // Push the last hotel if it exists
        if (currentHotel.code || currentHotel.name) {
            if (Object.keys(currentHotel).length > 0) {
                hotels.push(currentHotel);
            }
        }

        if (hotels.length > 0) {
            return { hotels };
        }
        return { hotels: [] };
    } catch (error) {
        console.error('Failed to scrape hotels from long string:', error);
        return { hotels: [], error: 'Failed to extract hotel data from string' };
    }
}

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

// Setup form listeners and validation
function setupFormListeners() {
    const form = document.querySelector('.form-grid');
    if (!form) {
        console.error('Form element not found. Make sure you have a form with class="form-grid".');
        return;
    }
    
    // Set today as the minimum date for check-in
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    
    if (checkinInput) {
        checkinInput.min = formatDate(today);
        checkinInput.addEventListener('change', () => {
            if (checkoutInput) {
                const newMinCheckout = new Date(checkinInput.value);
                newMinCheckout.setDate(newMinCheckout.getDate() + 1);
                checkoutInput.min = formatDate(newMinCheckout);
                
                if (new Date(checkoutInput.value) <= new Date(checkinInput.value)) {
                    checkoutInput.value = formatDate(newMinCheckout);
                }
            }
        });
    }
    
    if (checkoutInput && !checkoutInput.min) {
        checkoutInput.min = formatDate(tomorrow);
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const destination = document.getElementById('destination')?.value.trim() || '';
        const checkin = document.getElementById('checkin')?.value || '';
        const checkout = document.getElementById('checkout')?.value || '';
        const travellers = document.getElementById('travellers')?.value || '';

        if (!destination || !checkin || !checkout || !travellers) {
            alert('Please fill in all fields.');
            return;
        }

        // Validate travellers as a number between 1 and 20
        const travellersNum = parseInt(travellers);
        if (isNaN(travellersNum) || travellersNum < 1 || travellersNum > 20) {
            alert('Please select a number of travellers between 1 and 20.');
            return;
        }

        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        if (checkinDate < currentDate) {
            alert('Check-in date cannot be in the past.');
            return;
        }
        
        if (checkoutDate <= checkinDate) {
            alert('Check-out date must be after check-in date.');
            return;
        }
        
        const daysDifference = (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24);
        if (daysDifference > 30) {
            alert('Maximum stay is 30 days.');
            return;
        }

        const formData = {
            destination: destination.toUpperCase(), // Normalize to uppercase for consistency
            checkin: formatDate(checkinDate),
            checkout: formatDate(checkoutDate),
            travellers: travellersNum // Use the parsed number
        };

        if (isProcessing) {
            alert('A search is already in progress. Please wait or refresh the page.');
            return;
        }

        isProcessing = true;
        currentRequest = formData;

        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'none';

        try {
            const result = await processRequest(formData);
            isProcessing = false;
            currentRequest = null;
            displayResults(result);
        } catch (error) {
            console.error('Error processing request:', error);
            isProcessing = false;
            currentRequest = null;
            displayResults({ 
                error: 'There was an error processing your request. Please try again.',
                details: error.message
            });
        }
    });
}

// Improved debug function with more detailed information
function debugFormElements() {
    console.log('=== DEBUGGING FORM ELEMENTS ===');
    
    const formElements = {
        destination: document.getElementById('destination'),
        checkin: document.getElementById('checkin'),
        checkout: document.getElementById('checkout'),
        travellers: document.getElementById('travellers'),
        form: document.querySelector('.form-grid'),
        bookingCard: document.querySelector('.booking-card'),
        resultsContainer: document.getElementById('resultsContainer'),
        loadingIndicator: document.getElementById('loadingIndicator')
    };
    
    console.log('Form elements status:');
    for (const [name, element] of Object.entries(formElements)) {
        if (!element) {
            console.error(`${name} element is missing`);
            continue;
        }
        
        const style = window.getComputedStyle(element);
        console.log(`${name}:`, {
            exists: true,
            display: style.display,
            visibility: style.visibility,
            height: style.height,
            width: style.width,
            position: style.position,
            value: element.value || 'N/A',
            eventListeners: element._eventListeners ? 'Has event listeners' : 'No event listeners'
        });
    }

    console.log('Current URL:', window.location.href);
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('=== END DEBUGGING ===');
}

// Call debug function after page load to help with troubleshooting
setTimeout(debugFormElements, 1500);
