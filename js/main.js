// Function to process the request with proper handling
async function processRequest(formData, maxAttempts = 3) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            // Show real-time status to user
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.innerHTML = `<p style="color: #0077ff;">Searching for hotels... Attempt ${attempts + 1}/${maxAttempts}</p>`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5-minute timeout for fetch

            // Let user know API call is in progress
            loadingIndicator.innerHTML = '<p style="color: #0077ff;">Connecting to hotel database... Please wait.</p>';
            
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

            // Let user know we're processing the results
            loadingIndicator.innerHTML = '<p style="color: #0077ff;">Processing results... Almost done!</p>';
            
            // Get the raw text response for debugging
            const textResponse = await response.text();
            console.log('Raw Webhook Response:', textResponse);

            // Parse the response
            let result;
            try {
                // Try direct parsing first
                result = JSON.parse(textResponse);
            } catch (firstError) {
                try {
                    // Try handling escaped JSON string (common with Make.com)
                    let cleanedResponse = textResponse.trim();
                    if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
                        cleanedResponse = cleanedResponse.slice(1, -1).replace(/\\"/g, '"');
                        result = JSON.parse(cleanedResponse);
                    } else {
                        throw firstError; // Original error was correct
                    }
                } catch (jsonError) {
                    console.error('Invalid JSON response:', jsonError);
                    result = { 
                        rawResponse: textResponse.substring(0, 1000), // Limit length for display
                        error: 'Invalid response format received from the hotel search API'
                    };
                }
            }

            return result;

        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error);
            
            if (error.name === 'AbortError') {
                console.log('Fetch request timed out, retrying...');
            } else if (attempts === maxAttempts) {
                throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
            }

            // Exponential backoff with user feedback
            const waitTime = 1000 * attempts;
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.innerHTML = `<p style="color: #ff7700;">Connection issue. Retrying in ${waitTime/1000} seconds...</p>`;
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Improved function to display results with better error handling
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    loadingIndicator.style.display = 'none';
    resultsContainer.style.display = 'block';

    if (result.error) {
        resultsContainer.style.backgroundColor = '#ffebee';
        resultsContainer.innerHTML = `
            <div style="padding: 15px;">
                <h3 style="color: #d32f2f; margin-top: 0;">Search Error</h3>
                <p>${result.error}</p>
                <p>Please try again or modify your search criteria.</p>
            </div>
        `;
        if (result.rawResponse) {
            resultsContainer.innerHTML += `
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #555;">Technical Details (for debugging)</summary>
                    <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; font-size: 12px;">
                        ${result.rawResponse}
                    </pre>
                </details>
            `;
        }
        return;
    }

    // Success case - extract hotels
    try {
        // Normalize result structure - handle different possible API response formats
        let hotels = [];
        if (result.hotels && Array.isArray(result.hotels)) {
            hotels = result.hotels;
        } else if (result.data && result.data.hotels && Array.isArray(result.data.hotels)) {
            hotels = result.data.hotels;
        } else if (Array.isArray(result)) {
            hotels = result;
        }

        if (hotels.length > 0) {
            // Success with hotels
            resultsContainer.style.backgroundColor = '#e8f5e9';
            resultsContainer.innerHTML = `
                <h3 style="margin-top: 0; color: #2e7d32;">We found ${hotels.length} hotels for your search!</h3>
                <p style="color: #555;">Showing results for ${document.getElementById('destination').value} from 
                   ${document.getElementById('checkin').value} to ${document.getElementById('checkout').value} 
                   for ${document.getElementById('travellers').value} traveller(s).</p>
                <div id="hotelList"></div>
            `;

            const hotelList = document.getElementById('hotelList');
            hotels.forEach((hotel, index) => {
                // Extract hotel details safely with fallbacks
                const hotelName = hotel.name || 'Unknown Hotel';
                const hotelCode = hotel.code || hotel.id || 'N/A';
                const location = hotel.destinationName || hotel.location || hotel.destinationCode || 'N/A';
                
                // Handle rate information with proper fallbacks
                let price = 'N/A';
                let cancellationPolicy = 'Contact for details';
                let rateKey = '';
                
                if (hotel.rates && Array.isArray(hotel.rates) && hotel.rates.length > 0) {
                    const rate = hotel.rates[0];
                    rateKey = rate.rateKey || '';
                    price = rate.amount ? `$${parseFloat(rate.amount).toFixed(2)}` : 'N/A';
                    
                    if (rate.cancellationPolicies && rate.cancellationPolicies.length > 0) {
                        const policy = rate.cancellationPolicies[0];
                        cancellationPolicy = policy.from ? 
                            `Cancel by ${new Date(policy.from).toLocaleDateString()} for $${policy.amount || 0}` : 
                            'Non-refundable';
                    }
                } else if (hotel.price || hotel.amount) {
                    price = `$${parseFloat(hotel.price || hotel.amount).toFixed(2)}`;
                }

                // Create a clean hotel card
                hotelList.innerHTML += `
                    <div style="margin-top: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <img src="https://via.placeholder.com/300x200?text=${encodeURIComponent(hotelName)}" 
                                alt="${hotelName}" 
                                style="width: 300px; height: 200px; object-fit: cover; border-radius: 4px;">
                            <div style="flex: 1; min-width: 250px;">
                                <h4 style="color: #003580; margin-top: 0; margin-bottom: 10px;">${index + 1}. ${hotelName}</h4>
                                <p style="margin-bottom: 8px;"><strong>Location:</strong> ${location}</p>
                                <p style="margin-bottom: 8px;"><strong>Price:</strong> ${price}</p>
                                <p style="margin-bottom: 8px;"><strong>Cancellation:</strong> ${cancellationPolicy}</p>
                                ${rateKey ? `<p style="font-size: 12px; color: #666; margin-bottom: 0;">Rate ID: ${rateKey.substring(0, 20)}...</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            // No hotels found
            resultsContainer.style.backgroundColor = '#fff3cd';
            resultsContainer.innerHTML = `
                <h3 style="margin-top: 0; color: #856404;">No Hotels Found</h3>
                <p>We couldn't find any hotels matching your search criteria. Please try:</p>
                <ul>
                    <li>Checking different dates</li>
                    <li>Searching for a different destination</li>
                    <li>Reducing the number of travelers</li>
                </ul>
            `;
        }
    } catch (error) {
        console.error('Error displaying results:', error);
        resultsContainer.style.backgroundColor = '#ffebee';
        resultsContainer.innerHTML = `
            <h3 style="margin-top: 0; color: #d32f2f;">Display Error</h3>
            <p>There was a problem displaying your search results. Please try again.</p>
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #555;">Technical Details</summary>
                <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; font-size: 12px;">
                    Error: ${error.message}
                    Data: ${JSON.stringify(result, null, 2)}
                </pre>
            </details>
        `;
    }
}
