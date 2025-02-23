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

    // Start polling for data
    sendRequestAndPoll(requestData);
  });

  function sendRequestAndPoll(requestData) {
    const maxRetries = 6; // Retry up to 6 times (30 seconds total)
    let attempt = 0;

    function fetchData() {
      fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      })
        .then(response => {
          if (response.status === 202) {
            throw new Error("Accepted"); // Simulate "Accepted" error for retry
          }
          return response.json();
        })
        .then(data => {
          let parsedData;
          try {
            parsedData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
            const hotels = parsedData?.data?.hotels?.hotels || [];

            if (hotels.length > 0) {
              displayHotels(hotels);
            } else if (attempt < maxRetries) {
              attempt++;
              setTimeout(fetchData, 5000); // Retry every 5 seconds
            } else {
              resultsSection.innerHTML = `<p>No hotels found for your criteria after multiple attempts.</p>`;
            }
          } catch (error) {
            console.error("Data parsing error:", error);
            resultsSection.innerHTML = `<p>Unable to process hotel data. Please try again later.</p>`;
          }
        })
        .catch(error => {
          if (error.message === "Accepted" && attempt < maxRetries) {
            attempt++;
            setTimeout(fetchData, 5000); // Wait 5 seconds and retry
          } else {
            console.error("Fetch error:", error);
            resultsSection.innerHTML = `<p>Error fetching hotels: ${error.message}</p>`;
          }
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
      let hotelRooms = hotel.rooms || [];
      hotelRooms.forEach(room => {
        let minRate = room.minRate || "N/A";
        let maxRate = room.maxRate || "N/A";
        let currency = room.currency || "EUR";

        resultsSection.innerHTML += `
          <div class="hotel-card">
            <h3>${hotel.name}</h3>
            <p>Category: ${hotel.categoryName}</p>
            <p>Location: ${hotel.zoneName}, ${hotel.destinationName}</p>
            <p>Price Range: ${minRate} - ${maxRate} ${currency}</p>
          </div>`;
      });
    });
    resultsSection.innerHTML += `</div>`;
  }
});

// Add CSS dynamically
const styles = `
  .loading { font-style: italic; color: #666; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 20px; }
  .hotel-card { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
  .hotel-card h3 { margin: 0 0 5px; font-size: 16px; color: #333; }
  .hotel-card p { margin: 0 0 10px; font-size: 14px; color: #666; }
`;
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
