// Initialize the page when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    populateTravellersDropdown();
    createResultsContainer();
    setupFormListeners();
});

// Webhook URL for backend integration with Make.com
const WEBHOOK_URL = 'https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k';

// State management
let isProcessing = false;
let currentRequest = null;

// Populate travellers dropdown with options from 1 to 20
function populateTravellersDropdown() {
    const travellersSelect = document.getElementById('travellers');
    
    if (!travellersSelect) {
        console.error('Travellers select element not found in the DOM. Check index.html for the <select> with id="travellers".');
        const travellersError = document.getElementById('travellers-error');
        const travellersErrorDetails = document.getElementById('travellers-error-details');
        if (travellersError && travellersErrorDetails) {
            travellersError.style.display = 'block';
            travellersErrorDetails.textContent = 'Travellers select element missing in DOM.';
        }
        return;
    }
    
    // Clear existing options
    travellersSelect.innerHTML = '<option value="">Select</option>';
    
    // Add options from 1 to 20
    for (let i = 1; i <= 20; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} Traveller${i > 1 ? 's' : ''}`;
        travellersSelect.appendChild(option);
    }
    
    // Ensure the first option is selected by default
    if (travellersSelect.options.length > 0) {
        travellersSelect.options[0].selected = true;
    }
    
    // Ensure the dropdown is visible
    travellersSelect.style.display = 'block';
    travellersSelect.style.width = '100%';
    travellersSelect.style.padding = '10px';
    travellersSelect.style.borderRadius = '4px';
    travellersSelect.style.border = '1px solid #ccc';
    
    console.log('Travellers dropdown populated successfully with 20 options.');
    
    // Hide any error message if successful
    const travellersError = document.getElementById('travellers-error');
    if (travellersError) {
        travellersError.style.display = 'none';
    }
}

// Create results container and loading indicator
function createResultsContainer() {
    const bookingCard = document.querySelector('.booking-card');
    if (!bookingCard) {
        console.error('Booking card element not found. Make sure you have a div with class="booking-card".');
        return;
    }
    
    // Create results container if it doesn't exist
    if (!document.getElementById('resultsContainer')) {
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'resultsContainer';
        resultsContainer.style.marginTop = '20px';
        resultsContainer.style.padding = '15px';
        resultsContainer.style.borderRadius = '6px';
        resultsContainer.style.backgroundColor = '#f8f9fa';
        resultsContainer.style.display = 'none'; // Hidden by default
        bookingCard.appendChild(resultsContainer);
    }
    
    // Create loading indicator if it doesn't exist
    if (!document.getElementById('loadingIndicator')) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.style.display = 'none';
        loadingIndicator.style.marginTop = '20px';
        loadingIndicator.style.padding = '15px';
        loadingIndicator.style.borderRadius = '6px';
        loadingIndicator.style.backgroundColor = '#f5f5f5';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (2 minutes).</p>';
        bookingCard.appendChild(loadingIndicator);
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
            displayResults({ error: 'Retry failed. Please try again.' });
        });
}

// Improved function to process the request with better error handling
async function processRequest(formData, maxAttempts = 3) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            // Show real-time status to user
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `<p style="color: #0077ff;">Searching for hotels... Attempt ${attempts + 1}/${maxAttempts}</p>`;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5-minute timeout for fetch

            // Let user know API call is in progress
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

            // Let user know we're processing the results
            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p style="color: #0077ff;">Processing results... Almost done!</p>';
            }
            
            // Get the raw text response for debugging
            const textResponse = await response.text();
            console.log('Raw Webhook Response:', textResponse);

            // Improved parsing logic to handle various response formats from Make.com
            let result;
            try {
                // Try to normalize the response format
                if (!textResponse || textResponse.trim() === '') {
                    throw new Error('Empty response received');
                }
                
                let cleanedResponse = textResponse.trim();
                
                // Handle string escaped JSON (common with Make.com)
                if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
                    cleanedResponse = cleanedResponse.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                }
                
                // Try to parse as JSON
                try {
                    result = JSON.parse(cleanedResponse);
                } catch (jsonError) {
                    console.warn('JSON parse error:', jsonError);
                    // Try one more time with additional cleanup for double-escaped strings
                    try {
                        cleanedResponse = cleanedResponse.replace(/\\\\"/g, '\\"');
                        result = JSON.parse(cleanedResponse);
                    } catch (secondJsonError) {
                        console.error('Second JSON parse attempt failed:', secondJsonError);
                        throw new Error('Unable to parse response as JSON');
                    }
                }
                
                // Handle accepted response with no data
                if (cleanedResponse === 'Accepted' || (result && result === 'Accepted')) {
                    return { 
                        error: 'Invalid response format received from the hotel search API',
                        rawResponse: 'Accepted',
                        details: 'The API acknowledged the request but did not return hotel data. This may indicate an issue with the Make.com workflow or HotelBeds API configuration.'
                    };
                }
                
                console.log('Parsed API Response:', result);
                
                // Validate expected result structure
                if (!result || (
                    !Array.isArray(result) && 
                    !Array.isArray(result.hotels) && 
                    (!result.data || !Array.isArray(result.data.hotels)) &&
                    (!result.body || !Array.isArray(result.body.hotels)) &&
                    (!result.body || !result.body.data || !Array.isArray(result.body.data.hotels))
                )) {
                    return {
                        error: 'Invalid response format received from the hotel search API',
                        rawResponse: cleanedResponse.substring(0, 1000),
                        details: 'The response does not contain the expected hotel data structure.'
                    };
                }
                
                // Normalize the hotel data structure
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
                }

                return { hotels };
                
            } catch (parseError) {
                console.error('Response parsing error:', parseError);
                return { 
                    error: 'Invalid response format received from the hotel search API',
                    rawResponse: textResponse.substring(0, 1000), // Limit length for display
                    details: parseError.message
                };
            }

        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error);
            
            if (error.name === 'AbortError') {
                console.log('Fetch request timed out, retrying...');
            } else if (attempts === maxAttempts) {
                return {
                    error: `Failed after ${maxAttempts} attempts: ${error.message}`,
                    details: 'Please check your network connection and try again.'
                };
            }

            // Exponential backoff with user feedback
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

// Function to display results on the webpages in a Booking.com-inspired format
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (!resultsContainer || !loadingIndicator) {
        console.error('Results container or loading indicator not found.');
        return;
    }
    
    loadingIndicator.style.display = 'none';
    resultsContainer.style.display = 'block';

    if (result.error) {
        resultsContainer.style.backgroundColor = '#ffebee';
        resultsContainer.innerHTML = `
            <div style="padding: 15px;">
                <h3 style="color: #d32f2f; margin-top: 0;">Search Error</h3>
                <p>${result.error}</p>
                <p>Please try again or modify your search criteria.</p>
                ${result.details ? `<p style="color: #666; font-size: 14px;">${result.details}</p>` : ''}
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
                // Set minimum checkout date to day after checkin
                const newMinCheckout = new Date(checkinInput.value);
                newMinCheckout.setDate(newMinCheckout.getDate() + 1);
                checkoutInput.min = formatDate(newMinCheckout);
                
                // If current checkout date is before new min, update it
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
        
        // Get form values
        const destination = document.getElementById('destination')?.value.trim() || '';
        const checkin = document.getElementById('checkin')?.value || '';
        const checkout = document.getElementById('checkout')?.value || '';
        const travellers = document.getElementById('travellers')?.value || '';

        // Basic validation
        if (!destination || !checkin || !checkout || !travellers) {
            alert('Please fill in all fields.');
            return;
        }

        // Validate dates
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

        // Prepare the data to send to the webhook
        const formData = {
            destination: destination,
            checkin: formatDate(checkinDate),  // Ensure consistent date format
            checkout: formatDate(checkoutDate), // Ensure consistent date format
            travellers: parseInt(travellers) // Convert to integer for consistency
        };

        if (isProcessing) {
            alert('A search is already in progress. Please wait or refresh the page.');
            return;
        }

        isProcessing = true;
        currentRequest = formData;

        // Show loading indicator and hide previous results
        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }

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
            eventListeners: element.onclick ? 'Has click handler' : 'No click handler'
        });
    }

    console.log('Current URL:', window.location.href);
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('=== END DEBUGGING ===');
}

// Call debug function after page load to help with troubleshooting
setTimeout(debugFormElements, 1500);
