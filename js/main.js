// ... (Keep all previous code up to the displayResults function unchanged) ...

// Function to display results on the webpage
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    loadingIndicator.style.display = 'none';

    if (result.error) {
        resultsContainer.style.backgroundColor = '#ffebee'; // Light red for errors
        resultsContainer.innerHTML = `<p style="color: #d32f2f;">Error: ${result.error}</p>`;
        if (result.rawResponse) {
            // If the raw response is plain text (e.g., "Accepted"), display it nicely
            if (typeof result.rawResponse === 'string' && !result.rawResponse.trim().startsWith('{')) {
                resultsContainer.innerHTML += `
                    <p style="margin-top: 10px;">Webhook Response: <strong>${result.rawResponse}</strong></p>
                    <p>Please check the Make.com setup to return JSON data.</p>
                `;
            } else {
                resultsContainer.innerHTML += `
                    <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">
                        Raw Response: ${result.rawResponse}
                    </pre>
                `;
            }
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
