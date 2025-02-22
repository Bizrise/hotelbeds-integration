document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("hotelSearchForm");
  const resultsSection = document.getElementById("results");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Get data from the search fields
    const destinationInput = document
      .getElementById("destination")
      .value.trim()
      .toUpperCase();
    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;
    const travellers = document.getElementById("travellers").value;

    // Validation for destination format
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    if (
      isNaN(checkinDate.getTime()) ||
      isNaN(checkoutDate.getTime()) ||
      checkoutDate <= checkinDate ||
      checkinDate < today
    ) {
      alert(
        "Please enter valid dates, with check-out after check-in and check-in in the future."
      );
      return;
    }

    const requestData = {
      destination: destinationInput,
      checkin,
      checkout,
      travellers,
    };

    // Display loading message
    resultsSection.innerHTML =
      "<p>Waiting for hotel results... <span class='loading'>Loading...</span></p>";

    try {
      const response = await fetch(
        "https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", // Your webhook URL
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status} - ${response.statusText}`
        );
      }

      // Check the response type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `Expected JSON, but received: ${contentType || "no content-type"}`
        );
      }

      // Parse response as JSON
      const data = await response.json();
      console.log("Response received:", data);

      // Ensure we properly access hotel data
      if (!data || !data.data || !data.data.hotels) {
        throw new Error("Invalid hotel data structure in response.");
      }

      const hotels = data.data.hotels.hotels || [];
      displayHotels(hotels);
    } catch (error) {
      console.error("Error:", error);
      resultsSection.innerHTML = `<p class="error">An error occurred: ${error.message}. Please try again.</p>`;
    }
  });

  function displayHotels(hotels) {
    resultsSection.innerHTML = "<h2>Hotel Search Results</h2>";
    if (hotels.length > 0) {
      resultsSection.innerHTML += "<div class='results-grid'>";
      hotels.forEach((hotel) => {
        hotel.rooms.forEach((room) => {
          const price = room.rates[0]?.net || "N/A";
          resultsSection.innerHTML += `
            <div class="hotel-card">
              <h3>${hotel.name} - ${room.name}</h3>
              <p>Price: ${price} EUR</p>
              <button onclick="viewRooms('${hotel.code}-${room.code}')">View Rooms</button>
            </div>`;
        });
      });
      resultsSection.innerHTML += "</div>";
    } else {
      resultsSection.innerHTML += "<p>No hotels found for your criteria.</p>";
    }
  }

  function viewRooms(code) {
    alert(`View rooms for ${code}`);
  }
});

// Styling for the loading animation
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

const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
