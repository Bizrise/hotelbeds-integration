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

    // Show loading message with animation and start 30-second minimum timer
    resultsSection.innerHTML = "<p class='loading'>Searching for hotels... <span class='loader'>Loading...</span></p>";
    const startTime = Date.now();
    const minLoadingTime = 30000; // 30 seconds in milliseconds

    // Data object to send to Make.com webhook
    const requestData = { destination: destinationInput, checkin, checkout, travellers };

    // Start polling for data (will try up to 12 times = 60 seconds total)
    sendRequestAndPoll(requestData, startTime, minLoadingTime);
  });

  function sendRequestAndPoll(requestData, startTime, minLoadingTime) {
    const maxRetries = 12; // 12 attempts = 60 seconds total (5 sec each)
    let attempt = 0;

    function fetchData() {
      fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json" // Ensure JSON response
        },
        mode: "cors", // Explicitly set CORS mode
        credentials: "omit" // Adjust if needed for cookies or authentication
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text(); // Read response as plain text
        })
        .then(text => {
          const elapsedTime = Date.now() - startTime;
          console.log("Loading started at:", new Date(startTime).toISOString(), "Elapsed time:", elapsedTime, "Response:", text); // Enhanced debug log

          // Check if response starts with "Accepted"
          if (text.trim().startsWith("Accepted")) {
            if (attempt < maxRetries) {
              attempt++;
              console.log(`Attempt ${attempt}: Response is "Accepted". Retrying in 5 seconds...`);
              setTimeout(fetchData, 5000);
            } else {
              setTimeout(() => {
                console.log("Showing error after 30 seconds (no data after max retries)");
                resultsSection.innerHTML = "<p>No hotels found after multiple attempts.</p>";
              }, Math.max(0, minLoadingTime - elapsedTime));
            }
            return;
          }

          // Otherwise, try to parse the JSON
          try {
            const data = JSON.parse(text);
            const hotels = data?.hotels || (Array.isArray(data) ? data : []); // Handle both nested and direct arrays
            if (hotels.length > 0) {
              setTimeout(() => {
                console.log("Showing hotels after 30 seconds");
                displayHotels(hotels);
              }, Math.max(0, minLoadingTime - elapsedTime));
            } else if (attempt < maxRetries) {
              attempt++;
              console.log(`Attempt ${attempt}: No hotels yet. Retrying in 5 seconds...`);
              setTimeout(fetchData, 5000);
            } else {
              setTimeout(() => {
                console.log("Showing error after 30 seconds (no hotels after max retries)");
                resultsSection.innerHTML = "<p>No hotels found for your criteria after multiple attempts.</p>";
              }, Math.max(0, minLoadingTime - elapsedTime));
            }
          } catch (error) {
            console.error("Data parsing error:", error, "Response text:", text);
            setTimeout(() => {
              console.log("Showing error after 30 seconds (parsing failed)");
              resultsSection.innerHTML = "<p>Unable to process hotel data. Please try again later.</p>";
            }, Math.max(0, minLoadingTime - elapsedTime));
          }
        })
        .catch(error => {
          console.error("Fetch error:", error);
          const elapsedTime = Date.now() - startTime;
          setTimeout(() => {
            console.log("Showing error after 30 seconds (fetch failed)");
            resultsSection.innerHTML = `<p>Error fetching hotels: ${error.message}</p>`;
          }, Math.max(0, minLoadingTime - elapsedTime));
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
          <div class="hotel-card" data-hotel="${encodeURIComponent(JSON.stringify(hotel))}">
            <div class="hotel-image">
              <img src="${imageUrl}" alt="${hotel.name || "Unnamed Hotel"}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Error'">
            </div>
            <div class="hotel-details">
              <h3>${hotel.name || "Unnamed Hotel"}</h3>
              <p class="rating">${hotel.category?.name || "N/A"} <span class="stars">★${"★".repeat(parseInt(hotel.category?.name?.charAt(0)) || 0)}</span></p>
              <p class="location">${hotel.zoneName || "N/A"}, ${hotel.destinationName || "N/A"}</p>
              <p class="coordinates">Lat: ${hotel.latitude || "N/A"}, Long: ${hotel.longitude || "N/A"}</p>
              <p class="description">${hotel.description || "No description available."}</p>
              <p class="price">Price Range: ${minRate} - ${maxRate} <span>${currency}</span></p>
              <button class="book-now">Book Now</button>
            </div>
          </div>`;
      });
    });
    resultsSection.innerHTML += `</div>`;

    // Add interactivity to hotel cards
    document.querySelectorAll('.hotel-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
        card.style.transform = 'translateY(-8px)';
        const details = card.querySelector('.hotel-details');
        details.style.backgroundColor = '#f9f9f9';
        details.style.padding = '18px';
        card.querySelector('.hotel-image img').style.opacity = '0.85';
      });
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        card.style.transform = 'translateY(-5px)';
        const details = card.querySelector('.hotel-details');
        details.style.backgroundColor = '#fff';
        details.style.padding = '15px';
        card.querySelector('.hotel-image img').style.opacity = '1';
      });

      // Add click to expand card details (optional interactivity)
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.book-now')) {
          const details = card.querySelector('.description');
          if (details.style.maxHeight === 'none') {
            details.style.maxHeight = '4.2em';
            details.style.overflow = 'hidden';
            details.style.webkitLineClamp = '3';
          } else {
            details.style.maxHeight = 'none';
            details.style.overflow = 'visible';
            details.style.webkitLineClamp = 'unset';
          }
        }
      });
    });

    // Add click event for "Book Now" buttons (optional interactivity, customizable)
    document.querySelectorAll('.book-now').forEach(button => {
      button.addEventListener('click', (e) => {
        const card = e.target.closest('.hotel-card');
        const hotelData = JSON.parse(decodeURIComponent(card.dataset.hotel));
        alert(`Booking ${hotelData.name} - Contact us for more details!`); // Placeholder, customizable for real booking
        // Optional: Add actual booking logic (e.g., redirect, API call)
      });
    });
  }
});
