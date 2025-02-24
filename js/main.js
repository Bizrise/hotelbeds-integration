document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("hotelSearchForm");
  const resultsSection = document.getElementById("results");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Get input values
    const destinationInput = document.getElementById("destination").value.trim().toUpperCase();
    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;
    const travellers = document.getElementById("travellers").value;

    // Validate destination code (3-letter code like "LON", "DXB")
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    // Validate check-in & check-out dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkoutDate <= checkinDate || checkinDate < today) {
      alert("Please enter valid dates, with check-out after check-in and check-in in the future.");
      return;
    }

    // Show loading message
    resultsSection.innerHTML = "<p>Waiting for hotel results... <span class='loading'>Loading...</span></p>";

    // Data object to send
    const requestData = { destination: destinationInput, checkin, checkout, travellers };

    // Start polling for data (will try up to 12 times = 60 seconds total)
    sendRequestAndPoll(requestData);
  });

  function sendRequestAndPoll(requestData) {
    const maxRetries = 12; // 12 attempts = 60 seconds total (5 sec each)
    let attempt = 0;

    function fetchData() {
      fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })
        .then(response => response.text()) // Read response as plain text
        .then(text => {
          // Check if response starts with "Accepted"
          if (text.trim().startsWith("Accepted")) {
            if (attempt < maxRetries) {
              attempt++;
              console.log(`Attempt ${attempt}: Response is "Accepted". Retrying in 5 seconds...`);
              setTimeout(fetchData, 5000);
            } else {
              resultsSection.innerHTML = "<p>No hotels found after multiple attempts.</p>";
            }
            return;
          }
          // Otherwise, try to parse the JSON
          try {
            const data = JSON.parse(text);
            const hotels = data?.hotels || []; // Handle if data is directly an array or nested under 'hotels'
            if (hotels.length > 0) {
              displayHotels(hotels);
            } else if (attempt < maxRetries) {
              attempt++;
              console.log(`Attempt ${attempt}: No hotels yet. Retrying in 5 seconds...`);
              setTimeout(fetchData, 5000);
            } else {
              resultsSection.innerHTML = "<p>No hotels found for your criteria after multiple attempts.</p>";
            }
          } catch (error) {
            console.error("Data parsing error:", error);
            resultsSection.innerHTML = "<p>Unable to process hotel data. Please try again later.</p>";
          }
        })
        .catch(error => {
          console.error("Fetch error:", error);
          resultsSection.innerHTML = `<p>Error fetching hotels: ${error.message}</p>`;
        });
    }

    fetchData(); // Start polling
  }

  function displayHotels(hotels) {
    resultsSection.innerHTML = "<h2>Hotel Search Results</h2>";

    if (!hotels || hotels.length === 0) {
      resultsSection.innerHTML += "<p>No hotels found for your criteria.</p>";
      return;
    }

    resultsSection.innerHTML += `<div class="results-grid">`;
    hotels.forEach(hotel => {
      const imageUrl = hotel.images && hotel.images[0]?.url ? hotel.images[0].url : "https://via.placeholder.com/300x200?text=No+Image";
      let hotelRooms = hotel.rooms || hotel.rates || []; // Handle both 'rooms' and 'rates' from Hotelbeds
      hotelRooms = Array.isArray(hotelRooms) ? hotelRooms : [hotelRooms]; // Ensure it's an array
      hotelRooms.forEach(room => {
        let minRate = room.minRate || "N/A";
        let maxRate = room.maxRate || "N/A";
        let currency = room.currency || "EUR";
        resultsSection.innerHTML += `
          <div class="hotel-card">
            <div class="hotel-image">
              <img src="${imageUrl}" alt="${hotel.name}">
            </div>
            <div class="hotel-details">
              <h3>${hotel.name || "Unnamed Hotel"}</h3>
              <p class="rating">${hotel.category?.name || "N/A"} <span class="stars">${"★".repeat(parseInt(hotel.category?.name?.charAt(0)) || 0)}</span></p>
              <p class="location">${hotel.zoneName || "N/A"}, ${hotel.destinationName || "N/A"}</p>
              <p class="coordinates">Lat: ${hotel.latitude || "N/A"}, Long: ${hotel.longitude || "N/A"}</p>
              <p class="description">${hotel.description || "No description available."}</p>
              <p class="price">Price Range: ${minRate} - ${maxRate} ${currency}</p>
              <button class="book-now">Book Now</button>
            </div>
          </div>`;
      });
    });
    resultsSection.innerHTML += `</div>`;
  }
});
