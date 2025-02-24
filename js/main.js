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
    loadingIndicator.innerHTML = '<p style="color: #0077ff;">Searching for hotels... Please wait (35 seconds).</p>';
    document.querySelector('.booking-card').appendChild(loadingIndicator);
});

// Webhook URL for backend integration
const WEBHOOK_URL = 'https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k';

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

    // Show loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';

    try {
        // Send POST request to the webhook immediately, but delay showing results
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Wait for 35 seconds before processing the response
        await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds delay

        const result = await response.json();

        // Hide loading indicator and display results
        loadingIndicator.style.display = 'none';
        displayResults(result);

    } catch (error) {
        console.error('Error sending data to webhook:', error);
        // Hide loading indicator and show error after delay
        await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds delay
        loadingIndicator.style.display = 'none';
        displayResults({ error: 'There was an error processing your request. Please try again.' });
    }
});

// Function to display results on the webpage
function displayResults(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (result.error) {
        resultsContainer.style.backgroundColor = '#ffebee'; // Light red for errors
        resultsContainer.innerHTML = `<p style="color: #d32f2f;">Error: ${result.error}</p>`;
    } else {
        resultsContainer.style.backgroundColor = '#e8f5e9'; // Light green for success
        resultsContainer.innerHTML = '<h3>Your Search Results:</h3>';

        // Check if the result has hotels
        if (result.hotels && Array.isArray(result.hotels)) {
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
            resultsContainer.innerHTML += `<p>No hotels found or invalid response format.</p>`;
        }
    }

    // Show the results container
    resultsContainer.style.display = 'block';
}
