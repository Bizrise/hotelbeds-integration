document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('hotelSearchForm');
  const resultsSection = document.getElementById('results');

  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Get data from the 4 search fields
    const destinationInput = document.getElementById('destination').value.trim().toUpperCase();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const travellers = document.getElementById('travellers').value;

    // Validate Destination (3-letter airport code)
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    // Validate Dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime()) || checkoutDate <= checkinDate || checkinDate < today) {
      alert("Please enter valid dates, with check-out after check-in and check-in in the future.");
      return;
    }

    // Prepare data for API request
    const requestData = { destination: destinationInput, checkin, checkout, travellers };

    // Show "Loading" message
    resultsSection.innerHTML = `<p>Waiting for hotel results... <span class='loading'>Loading...</span></p>`;
    
    console.log("Sending data to Make.com:", requestData);

    try {
      const response = await fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON, received: ${contentType || 'no content-type'}`);
      }

      const responseData = await response.json();
      console.log("Raw response from Make.com:", responseData);

      // Ensure response contains hotel data
      if (!responseData.data) {
        throw new Error("No hotel data received.");
      }

      const hotels = JSON.parse(responseData.data).data.hotels.hotels || [];
      console.log("Parsed hotel data:", hotels);

      displayHotels(hotels);

    } catch (error) {
      console.error("Error fetching hotel data:", error);
      resultsSection.innerHTML = `<p class="error">An error occurred: ${error.message}. Please try again.</p>`;
    }
  });

  function displayHotels(hotels) {
    const container = document.getElementById('results');
    container.innerHTML = "<h2>Hotel Search Results</h2>";

    if (hotels.length > 0) {
      container.innerHTML += "<div class='results-grid'>";
      hotels.forEach(hotel => {
        hotel.rooms.forEach(room => {
          const price = room.rates?.[0]?.net || "N/A";
          container.innerHTML += `
            <div class="hotel-card">
              <h3>${hotel.name} - ${room.name}</h3>
              <p>Price: ${price} EUR</p>
              <button onclick="viewRooms('${hotel.code}-${room.code}')">View Rooms</button>
            </div>`;
        });
      });
      container.innerHTML += "</div>";
    } else {
      container.innerHTML += "<p>No hotels found for your criteria.</p>";
    }
  }

  function viewRooms(code) {
    alert(`View rooms for ${code}`);
  }
});

// Add simple loading animation CSS
const styles = `
  .loading {
    font-style: italic;
    color: #666;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    padding: 20px;
  }

  .hotel-card {
    border: 1px solid #ddd;
    padding: 10px;
    margin: 10px 0;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .hotel-card h3 {
    margin: 0 0 5px;
    font-size: 16px;
    color: #333;
  }

  .hotel-card p {
    margin: 0 0 10px;
    font-size: 14px;
    color: #666;
  }

  .hotel-card button {
    background: #007bff;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .hotel-card button:hover {
    background: #0056b3;
  }

  .error {
    color: red;
    font-weight: bold;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
