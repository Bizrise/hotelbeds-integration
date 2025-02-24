document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("hotelSearchForm");
  const resultsSection = document.getElementById("results");

  // Mock hotel data with images and description
  const mockHotelData = [
    {
      "code": 6547,
      "name": "The Royal Horseguards Hotel London",
      "categoryCode": "5EST",
      "categoryName": "5 STARS",
      "destinationCode": "LON",
      "destinationName": "London",
      "zoneCode": 51,
      "zoneName": "Westminster",
      "latitude": 51.506015,
      "longitude": -0.124116,
      "rooms": [
        {
          "minRate": 1273.05,
          "maxRate": 5149.32,
          "currency": "EUR"
        }
      ],
      "images": [
        {
          "url": "https://via.placeholder.com/300x200?text=Royal+Horseguards+Hotel"
        }
      ],
      "description": "A luxurious 5-star hotel overlooking the River Thames, offering elegant rooms and exceptional service."
    }
  ];

  // Display mock data immediately on page load
  displayHotels(mockHotelData);

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const destinationInput = document.getElementById("destination").value.trim().toUpperCase();
    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;
    const travellers = document.getElementById("travellers").value;

    // Validate destination code
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    if (isNaN(checkinDate) || isNaN(checkoutDate) || checkoutDate <= checkinDate || checkinDate < today) {
      alert("Please enter valid dates, with check-out after check-in and check-in in the future.");
      return;
    }

    resultsSection.innerHTML = "<p>Waiting for hotel results... <span class='loading'>Loading...</span></p>";
    const requestData = { destination: destinationInput, checkin, checkout, travellers };
    sendRequestAndPoll(requestData);
  });

  function sendRequestAndPoll(requestData) {
    const maxRetries = 12;
    let attempt = 0;

    function fetchData() {
      fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })
        .then(response => response.text())
        .then(text => {
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
          try {
            const data = JSON.parse(text);
            let parsedData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
            const hotels = parsedData?.data?.hotels?.hotels || [];
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

    fetchData();
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
      let hotelRooms = hotel.rooms || [];
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
              <h3>${hotel.name}</h3>
              <p class="rating">${hotel.categoryName} <span class="stars">${"★".repeat(parseInt(hotel.categoryCode[0]) || 0)}</span></p>
              <p class="location">${hotel.zoneName}, ${hotel.destinationName}</p>
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

  const styles = `
    .loading { font-style: italic; color: #666; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 20px; }
    .hotel-card { display: flex; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background: #fff; }
    .hotel-image { flex: 0 0 40%; }
    .hotel-image img { width: 100%; height: 100%; object-fit: cover; }
    .hotel-details { flex: 1; padding: 15px; }
    .hotel-details h3 { margin: 0 0 10px; font-size: 18px; color: #003580; }
    .rating { margin: 0 0 5px; font-size: 14px; color: #666; }
    .stars { color: #feba02; }
    .location { margin: 0 0 5px; font-size: 14px; color: #0071c2; }
    .coordinates { margin: 0 0 5px; font-size: 12px; color: #999; }
    .description { margin: 0 0 10px; font-size: 14px; color: #333; }
    .price { margin: 0 0 10px; font-size: 16px; font-weight: bold; color: #008009; }
    .book-now { background: #0071c2; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .book-now:hover { background: #005ea6; }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
});
