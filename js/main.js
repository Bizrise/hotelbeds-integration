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
        return data; // Return the parsed JSON object or array
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
  const resultsSection = document.getElementById('results');
  let htmlContent = "<h2>Hotel Search Results:</h2>";
  if (data.error) {
    htmlContent += `<p>${data.error}</p>`;
  } else if (Array.isArray(data)) { // Check if data is an array (29.data.hotels.hotels)
    if (data.length > 0) {
      data.forEach(hotel => {
        const firstRoom = hotel.rooms[0];
        const firstRate = firstRoom.rates[0];
        const price = firstRate.net;
        const availability = firstRate.allotment > 0 ? "Available" : "Not Available";
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
