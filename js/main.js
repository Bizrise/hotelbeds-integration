// Populate travellers dropdown with options from 1 to 100
document.addEventListener('DOMContentLoaded', () => {
    const travellersSelect = document.getElementById('travellers');
    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} Traveller${i > 1 ? 's' : ''}`;
        travellersSelect.appendChild(option);
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
    loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (5 seconds).</p>';
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
        loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (5 seconds).</p>';
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
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout for fetch

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

            // Wait for 5 seconds before processing the response
            await new Promise(resolve => {
                const timeout = setTimeout(() => {
                    resolve();
                }, 5000); // 5-second delay

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

            // Try to parse as JSON, but handle non-JSON responses
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch (jsonError) {
                console.error('Invalid JSON response:', jsonError);
                // If JSON parsing fails, treat the raw text as the result for display
                result = { rawResponse: textResponse, error: 'Invalid JSON response received from webhook' };
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

            // Wait briefly before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
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

// Function to display results on the webpage
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    loadingIndicator.style.display = 'none';

    if (result.error) {
        resultsContainer.style.backgroundColor = '#ffebee'; // Light red for errors
        resultsContainer.innerHTML = `<p style="color: #d32f2f;">Error: ${result.error}</p>`;
        if (result.rawResponse) {
            resultsContainer.innerHTML += `
                <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">
                    Raw Response: ${result.rawResponse}
                </pre>
            `;
        }
    } else {
        resultsContainer.style.backgroundColor = '#e8f5e9'; // Light green for success
        resultsContainer.innerHTML = '<h3>Your Search Results:</h3>';

        // Check if the result has a hotels array (nested under 'hotels' key)
        if (result.hotels && Array.isArray(result.hotels) && result.hotels.length > 0) {
            result.hotels.forEach((hotel, index) => {
                // Extract hotel details from the response
                const hotelName = hotel.name || 'Unknown Hotel';
                const hotelCode = hotel['code'] || 'N/A';
                const location = hotel.destinationName || hotel.destinationCode || 'N/A';
                
                // Extract rate details (assuming multiple rates might exist)
                let rateInfo = 'N/A';
                if (hotel.rates && Array.isArray(hotel.rates)) {
                    const rate = hotel.rates[0] || {}; // Take the first rate for simplicity
                    const rateKey = rate.rateKey || 'N/A';
                    const price = rate.amount ? `$${rate.amount}` : 'N/A';
                    const cancellationPolicy = rate.cancellationPolicies && rate.cancellationPolicies.length > 0 
                        ? `Cancel by ${rate.cancellationPolicies[0].from} for $${rate.cancellationPolicies[0].amount}` 
                        : 'N/A';
                    rateInfo = `${price} | ${cancellationPolicy} | Rate Key: ${rateKey}`;
                }

                resultsContainer.innerHTML += `
                    <div style="margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <h4>${index + 1}. ${hotelName} (Code: ${hotelCode})</h4>
                        <p>Location: ${location}</p>
                        <p>Price & Policy: ${rateInfo}</p>
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
