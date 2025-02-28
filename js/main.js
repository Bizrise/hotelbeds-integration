// Populate travellers dropdown with options from 1 to 100
document.addEventListener('DOMContentLoaded', () => {
    const travellersSelect = document.getElementById('travellers');
    const travellersError = document.getElementById('travellers-error');
    const travellersErrorDetails = document.getElementById('travellers-error-details');
    if (travellersSelect) { // Ensure the element exists
        try {
            // Clear any existing options except the default
            while (travellersSelect.options.length > 1) {
                travellersSelect.remove(1);
            }
            // Populate with options from 1 to 100
            for (let i = 1; i <= 100; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i} Traveller${i > 1 ? 's' : ''}`;
                travellersSelect.appendChild(option);
            }
            console.log('Travellers dropdown populated successfully with 100 options.');
            if (travellersError) travellersError.style.display = 'none'; // Hide error if successful
        } catch (error) {
            console.error('Error populating travellers dropdown:', error);
            if (travellersError && travellersErrorDetails) {
                travellersError.style.display = 'block';
                travellersErrorDetails.textContent = `JavaScript error: ${error.message}`;
            }
        }
    } else {
        console.error('Travellers select element not found in the DOM. Check index.html for the <select> with id="travellers".');
        if (travellersError && travellersErrorDetails) {
            travellersError.style.display = 'block';
            travellersErrorDetails.textContent = 'Travellers select element missing in DOM.';
        }
    }

    // Create a results container to display the webhook response
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'resultsContainer';
    resultsContainer.style.marginTop = '20px';
    resultsContainer.style.padding = '15px';
    resultsContainer.style.borderRadius = '6px';
    resultsContainer.style.backgroundColor = '#f8f9fa';
    resultsContainer.style.display = 'none'; // Hidden by default
    document.querySelector('.booking-card').appendChild(resultsContainer);

    // Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.style.display = 'none';
    loadingIndicator.style.marginTop = '20px';
    loadingIndicator.style.padding = '15px';
    loadingIndicator.style.borderRadius = '6px';
    loadingIndicator.style.backgroundColor = '#f5f5f5';
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (2 minutes).</p>';
    document.querySelector('.booking-card').appendChild(loadingIndicator);
});

// Webhook URL for backend integration
const WEBHOOK_URL = 'https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k';

// State management
let isProcessing = false;
let currentRequest = null;

// Handle tab visibility for better performance and retry
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isProcessing) {
        console.log('Tab is hidden, pausing processing...');
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.innerHTML = '<p style="color: #0077ff;">Search paused. Return to this tab to resume.</p>';
    } else if (!document.hidden && isProcessing && currentRequest) {
        console.log('Tab is visible, resuming or retrying processing...');
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (2 minutes).</p>';
        retryProcessing(currentRequest);
    }
});

// Function to retry processing if tab was hidden
function retryProcessing(requestData) {
    if (!isProcessing) return;

    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';

    processRequest(requestData)
        .then(() => isProcessing = false)
        .catch(error => {
            console.error('Retry failed:', error);
            isProcessing = false;
            displayResults({ error: 'Retry failed. Please try again.' });
        });
}

// Function to process the request with timeout
async function processRequest(formData, maxAttempts = 3) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5-minute timeout for fetch (300 seconds)

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

            // Wait for 2 minutes before processing the response
            await new Promise(resolve => {
                const timeout = setTimeout(() => {
                    resolve();
                }, 120000); // 2-minute delay (120 seconds)

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

            // Get the raw text response for debugging
            const textResponse = await response.text();
            console.log('Raw Webhook Response:', textResponse);

            // Analyze and scrape data from the long string
            let result = scrapeHotelDataFromString(textResponse);

            return result;

        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error);
            if (error.name === 'AbortError') {
                console.log('Fetch request timed out, retrying...');
            } else if (attempts === maxAttempts) {
                throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
            }

            // Wait briefly before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
    }
}

// Helper function to scrape hotel data from long strings
function scrapeHotelDataFromString(text) {
    let hotels = [];
    let error = null;
    let rawResponse = text;

    try {
        // Clean up the string and try to parse as JSON first
        let cleanedResponse = text.trim();
        if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
            cleanedResponse = cleanedResponse.slice(1, -1).replace(/\\"/g, '"'); // Remove outer quotes and unescape
        }

        // Attempt to parse as JSON
        let parsedData = JSON.parse(cleanedResponse);

        // If parsed successfully and has hotels, use the structured data
        if (parsedData.hotels && Array.isArray(parsedData.hotels)) {
            return { hotels: parsedData.hotels };
        }

        // If no hotels or invalid structure, scrape manually from the string
        const hotelLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        for (const line of hotelLines) {
            // Look for hotel name (e.g., "name": "Thistle London Marble Arch")
            const nameMatch = line.match(/"name"\s*:\s*"([^"]+)"/);
            if (nameMatch) {
                const hotelName = nameMatch[1];

                // Look for hotel code (e.g., "code": 6557)
                const codeMatch = line.match(/"code"\s*:\s*(\d+)/) || hotelLines.find(l => l.match(/"code"\s*:\s*(\d+)/))?.match(/"code"\s*:\s*(\d+)/);
                const hotelCode = codeMatch ? codeMatch[1] : 'N/A';

                // Look for location (e.g., "destinationName": "London" or "destinationCode": "LON")
                const locationMatch = line.match(/"destinationName"\s*:\s*"([^"]+)"/) || line.match(/"destinationCode"\s*:\s*"([^"]+)"/);
                const location = locationMatch ? locationMatch[1] : 'N/A';

                // Look for price and cancellation policy in rates (e.g., "amount": 142.94, "cancellationPolicies": [{"amount": 142.94, "from": "2025-02-27T22:59:00Z"}])
                const rateMatch = hotelLines.find(l => l.includes('"rates"')) || '';
                let price = 'N/A';
                let cancellationPolicy = 'N/A';
                let rateKey = 'N/A';

                const priceMatch = rateMatch.match(/"amount"\s*:\s*([\d.]+)/);
                if (priceMatch) price = `$${priceMatch[1]}`;

                const cancellationMatch = rateMatch.match(/"cancellationPolicies"\s*:\s*\[\s*{\s*"amount"\s*:\s*([\d.]+),\s*"from"\s*:\s*"([^"]+)"\s*}/);
                if (cancellationMatch) {
                    cancellationPolicy = `Cancel by ${cancellationMatch[2]} for $${cancellationMatch[1]}`;
                }

                const rateKeyMatch = rateMatch.match(/"rateKey"\s*:\s*"([^"]+)"/);
                if (rateKeyMatch) rateKey = rateKeyMatch[1];

                hotels.push({
                    name: hotelName,
                    code: hotelCode,
                    destinationName: location,
                    destinationCode: location === 'N/A' ? 'N/A' : location,
                    rates: [{ amount: price.replace('$', ''), rateKey, cancellationPolicies: cancellationPolicy !== 'N/A' ? [{ amount: cancellationPolicy.match(/\$([\d.]+)/)?.[1] || '0', from: cancellationPolicy.match(/Cancel by (.*?) for/)?.[1] || '' }] : [] }
                });
            }
        }

        if (hotels.length === 0) {
            throw new Error('No hotel data found in the string');
        }

        return { hotels };
    } catch (error) {
        console.error('Error scraping hotel data from string:', error);
        return { rawResponse: text, error: 'Invalid or unparseable response format received from the hotel search API', hotels: hotels.length > 0 ? hotels : [] };
    }
}

// Basic form validation and submission handling
const form = document.querySelector('.form-grid');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const destination = document.getElementById('destination').value.trim();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const travellers = document.getElementById('travellers').value;

    // Basic validation
    if (!destination || !checkin || !checkout || !travellers) {
        alert('Please fill in all fields.');
        return;
    }

    // Prepare the data to send to the webhook
    const formData = {
        destination: destination,
        checkin: checkin,
        checkout: checkout,
        travellers: parseInt(travellers) // Convert to integer for consistency
    };

    if (isProcessing) {
        alert('A search is already in progress. Please wait or refresh the page.');
        return;
    }

    isProcessing = true;
    currentRequest = formData;

    // Show loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';

    processRequest(formData)
        .then(result => {
            isProcessing = false;
            currentRequest = null;
            displayResults(result);
        })
        .catch(error => {
            console.error('Error processing request:', error);
            isProcessing = false;
            currentRequest = null;
            displayResults({ error: 'There was an error processing your request. Please try again.' });
        });
});

// Function to display results on the webpage in a Booking.com-inspired format
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    loadingIndicator.style.display = 'none';

    if (result.error) {
        resultsContainer.style.backgroundColor = '#ffebee'; // Light red for errors
        resultsContainer.innerHTML = `<p style="color: #d32f2f;">Search Error: Invalid or unparseable response format received from the hotel search API</p>`;
        resultsContainer.innerHTML += `<p>Please try again or modify your search criteria.</p>`;
        if (result.rawResponse) {
            resultsContainer.innerHTML += `
                <p>Technical Details (for debugging):</p>
                <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">
                    ${result.rawResponse}
                </pre>
            `;
        }
        if (result.hotels && Array.isArray(result.hotels) && result.hotels.length > 0) {
            resultsContainer.innerHTML += '<h3>Partial Results (if available):</h3>';
            result.hotels.forEach((hotel, index) => {
                const hotelName = hotel.name || 'Unknown Hotel';
                const hotelCode = hotel.code || 'N/A';
                const location = hotel.destinationName || hotel.destinationCode || 'N/A';
                let price = hotel.rates && hotel.rates[0] && hotel.rates[0].amount ? `$${hotel.rates[0].amount}` : 'N/A';
                let cancellationPolicy = hotel.rates && hotel.rates[0] && hotel.rates[0].cancellationPolicies && hotel.rates[0].cancellationPolicies[0] 
                    ? `Cancel by ${hotel.rates[0].cancellationPolicies[0].from} for $${hotel.rates[0].cancellationPolicies[0].amount}` 
                    : 'N/A';
                let rateKey = hotel.rates && hotel.rates[0] ? hotel.rates[0].rateKey : 'N/A';

                // Generate a placeholder image URL (since the API doesn’t provide images, we’ll use a default)
                const hotelImage = `https://via.placeholder.com/300x200?text=${encodeURIComponent(hotelName)}`;

                resultsContainer.innerHTML += `
                    <div class="hotel-result">
                        <img src="${hotelImage}" alt="${hotelName}" class="hotel-image">
                        <div class="hotel-details">
                            <h4>${index + 1}. ${hotelName} (Code: ${hotelCode})</h4>
                            <p><strong>Location:</strong> ${location}</p>
                            <p><strong>Price:</strong> ${price}</p>
                            <p><strong>Cancellation Policy:</strong> ${cancellationPolicy}</p>
                            <p><strong>Rate Key:</strong> ${rateKey}</p>
                        </div>
                    </div>
                `;
            });
        }
    } else {
        resultsContainer.style.backgroundColor = '#e8f5e9'; // Light green for success
        resultsContainer.innerHTML = '<h3>Your Search Results:</h3>';

        // Check if the result has a hotels array (nested under 'hotels' key)
        if (result.hotels && Array.isArray(result.hotels) && result.hotels.length > 0) {
            result.hotels.forEach((hotel, index) => {
                // Extract hotel details from the response
                const hotelName = hotel.name || 'Unknown Hotel';
                const hotelCode = hotel.code || 'N/A';
                const location = hotel.destinationName || hotel.destinationCode || 'N/A';
                
                // Extract rate details (assuming multiple rates might exist)
                let rateInfo = 'N/A';
                let price = 'N/A';
                let cancellationPolicy = 'N/A';
                let rateKey = 'N/A';
                if (hotel.rates && Array.isArray(hotel.rates)) {
                    const rate = hotel.rates[0] || {}; // Take the first rate for simplicity
                    rateKey = rate.rateKey || 'N/A';
                    price = rate.amount ? `$${rate.amount}` : 'N/A';
                    cancellationPolicy = rate.cancellationPolicies && rate.cancellationPolicies.length > 0 
                        ? `Cancel by ${rate.cancellationPolicies[0].from} for $${rate.cancellationPolicies[0].amount}` 
                        : 'N/A';
                    rateInfo = `${price} | ${cancellationPolicy} | Rate Key: ${rateKey}`;
                }

                // Generate a placeholder image URL (since the API doesn’t provide images, we’ll use a default)
                const hotelImage = `https://via.placeholder.com/300x200?text=${encodeURIComponent(hotelName)}`;

                resultsContainer.innerHTML += `
                    <div class="hotel-result">
                        <img src="${hotelImage}" alt="${hotelName}" class="hotel-image">
                        <div class="hotel-details">
                            <h4>${index + 1}. ${hotelName} (Code: ${hotelCode})</h4>
                            <p><strong>Location:</strong> ${location}</p>
                            <p><strong>Price:</strong> ${price}</p>
                            <p><strong>Cancellation Policy:</strong> ${cancellationPolicy}</p>
                            <p><strong>Rate Key:</strong> ${rateKey}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            // Display raw response or detailed message if no hotels are found
            resultsContainer.style.backgroundColor = '#fff3cd'; // Light yellow for warnings
            resultsContainer.innerHTML = `
                <p style="color: #856404;">No hotels found or invalid response format. 
                Check the console for the full response or verify the Make.com setup.</p>
                <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">
                    ${JSON.stringify(result, null, 2) || 'No response data available.'}
                </pre>
            `;
        }
    }

    // Show the results container
    resultsContainer.style.display = 'block';
    isProcessing = false;
    currentRequest = null;
}
