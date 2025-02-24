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

    try {
        // Send POST request to the webhook
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

        const result = await response.json();

        // Display the results on the webpage
        displayResults(result);

    } catch (error) {
        console.error('Error sending data to webhook:', error);
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
        
        // Assuming the result contains hotel data or a message
        if (result.hotels && Array.isArray(result.hotels)) {
            result.hotels.forEach((hotel, index) => {
                resultsContainer.innerHTML += `
                    <div style="margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <h4>${index + 1}. ${hotel.name || 'Hotel Name'}</h4>
                        <p>Location: ${hotel.location || 'N/A'}</p>
                        <p>Price: ${hotel.price || 'N/A'}</p>
                        <p>Availability: ${hotel.availability || 'N/A'}</p>
                    </div>
                `;
            });
        } else {
            resultsContainer.innerHTML += `<p>${JSON.stringify(result) || 'No results found.'}</p>`;
        }
    }

    // Show the results container
    resultsContainer.style.display = 'block';
}
