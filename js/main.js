document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('hotelSearchForm');
  const resultsSection = document.getElementById('results');

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Get data from the 4 search sections
    const destinationInput = document.getElementById('destination').value.trim().toUpperCase();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const travellers = document.getElementById('travellers').value;

    // Simple validation for the 4 sections, ensuring Check-in is in the future
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight for date comparison
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime()) || checkoutDate <= checkinDate || checkinDate < today) {
      alert("Please enter valid dates, with check-out after check-in and check-in in the future (after today).");
      return;
    }

    const requestData = {
      destination: destinationInput,
      checkin,
      checkout,
      travellers
    };

    // Show "Loading" message
    resultsSection.innerHTML = "<p>Waiting for hotel results... <span class='loading'>Loading...</span></p>";

    // Send data to Make.com and handle the response simply
    fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", { // Your webhook URL
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON, got: ${contentType || 'no content-type'}`);
      }
      return response.json(); // Parse the JSON response
    })
    .then(data => {
      // Parse the raw data string from Make.com
      const hotels = JSON.parse(data.data).data.hotels.hotels; // Extract hotels from {"data": "..."}
      displayHotels(hotels); // Show hotels
    })
    .catch(error => {
      console.error("Error:", error);
      resultsSection.innerHTML = `<p>An error occurred while fetching hotel data. Please try again later. Details: ${error.message}</p>`;
    });
  });

  function displayHotels(hotels) {
    const container = document.getElementById('results'); // Use existing resultsSection
    container.innerHTML = "<h2>Hotel Search Results</h2>";
    if (hotels.length > 0) {
      container.innerHTML += "<div class='results-grid'>";
      hotels.forEach(hotel => {
        hotel.rooms.forEach(room => {
          const price = room.rates[0]?.net || "N/A";
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
    alert(`View rooms for ${code}`); // Simple alert, customize as needed
  }
});

// Add simple loading animation CSS in styles.css for better visuals
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
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
