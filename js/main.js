// Wait for the document to load
document.addEventListener('DOMContentLoaded', () => {
  // Reference the form and results section
  const form = document.getElementById('hotelSearchForm');
  const resultsSection = document.getElementById('results');

  form.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent page reload

    // --- Gather User Inputs ---
    const destinationInput = document.getElementById('destination').value.trim().toUpperCase();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const travellers = document.getElementById('travellers').value;

    // --- Validate Destination Input ---
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    // --- Validate Dates ---
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime()) || checkoutDate <= checkinDate) {
      alert("Please enter valid dates, with check-out after check-in.");
      return;
    }

    // --- Calculate the Number of Nights ---
    const timeDiff = Math.abs(checkoutDate - checkinDate);
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // --- Prepare Data Payload for Make.com ---
    const requestData = {
      destination: destinationInput,
      checkin,
      checkout,
      travellers,
      nights
    };

    // Show a loading message in the results section
    resultsSection.innerHTML = "<p>Loading results...</p>";

    // --- Send Data to Make.com Webhook ---
    fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestData)
    })
    .then(response => {
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.text().then(text => {
          try {
            // Attempt to parse the response text as JSON
            const data = JSON.parse(text);
            return data; // Return the parsed JSON array
          } catch (parseError) {
            throw new Error(`Failed to parse JSON: ${parseError.message}. Response text: ${text}`);
          }
        });
      } else {
        return response.text().then(text => {
          throw new Error(`Expected JSON, got: ${text}`);
        });
      }
    })
    .then(data => {
      // --- Process the Response from Make.com ---
      let htmlContent = "<h2>Hotel Search Results:</h2>";
      if (data.error) {
        htmlContent += `<p>${data.error}</p>`;
      } else if (Array.isArray(data)) { // Check if data is an array (29.data.hotels.hotels)
        if (data.length > 0) {
          data.forEach(hotel => {
            // Extract the first room and find the cheapest rate for exact results
            const firstRoom = hotel.rooms[0];
            const cheapestRate = firstRoom.rates.reduce((min, rate) => rate.net < min.net ? rate : min, firstRoom.rates[0]);
            const price = cheapestRate.net;
            const availability = cheapestRate.allotment > 0 ? "Available" : "Not Available";
            htmlContent += `
              <div class="hotel">
                <h3>${hotel.name}</h3>
                <p>Price: ${price} EUR</p>
                <p>Availability: ${availability}</p>
              </div>
            `;
          });
        } else {
          htmlContent += "<p>No hotels found for your criteria.</p>";
        }
      } else {
        htmlContent += "<p>No hotels found for your criteria or invalid response format.</p>";
      }
      resultsSection.innerHTML = htmlContent;
    })
    .catch(error => {
      console.error("Error:", error);
      resultsSection.innerHTML = `<p>An error occurred while fetching hotel data. Please try again later. Details: ${error.message}</p>`;
    });
  });
});
