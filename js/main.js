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
    if (checkoutDate <= checkinDate) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    // --- Calculate the Number of Nights ---
    const timeDiff = Math.abs(checkoutDate - checkinDate);
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // --- Prepare Data Payload for Make.com ---
    const requestData = {
      destination: destinationInput, // Ensuring only the code is sent
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
    .then(response => response.json())
    .then(data => {
      // --- Process the Response from Make.com ---
      let htmlContent = "<h2>Hotel Search Results:</h2>";
      if (data && data.hotels && data.hotels.length) {
        data.hotels.forEach(hotel => {
          htmlContent += `
            <div class="hotel">
              <h3>${hotel.name}</h3>
              <p>Price: ${hotel.price}</p>
              <p>Availability: ${hotel.availability}</p>
            </div>
          `;
        });
      } else {
        htmlContent += "<p>No hotels found for your criteria.</p>";
      }
      resultsSection.innerHTML = htmlContent;
    })
    .catch(error => {
      console.error("Error:", error);
      resultsSection.innerHTML = "<p>An error occurred while fetching hotel data.</p>";
    });
  });
});
