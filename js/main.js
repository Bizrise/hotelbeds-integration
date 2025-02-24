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

    // Validate destination code (e.g., "LON", "DXB", "TOKYO")
    if (!/^[A-Z]{3,}$/.test(destinationInput)) {
      alert("Please enter a valid destination code or city (e.g., DXB, LON, TOKYO).");
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

    // Show a polished loading message with animation
    resultsSection.innerHTML = `<div class="loading-container">
      <p class="loading-text">Searching for hotels...</p>
      <div class="loader"></div>
    </div>`;

    // Data object to send to Make.com webhook
    const requestData = { destination: destinationInput, checkin, checkout, travellers };

    // Start polling for data (up to 12 attempts = 60 seconds total)
    sendRequestAndPoll(requestData, Date.now(), 30000);
  });

  function sendRequestAndPoll(requestData, startTime, minLoadingTime) {
    const maxRetries = 12;
    let attempt = 0;

    function fetchData() {
      fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        mode: "cors",
        body: JSON.stringify(requestData)
      })
      .then(response => response.text())
      .then(text => {
        const elapsedTime = Date.now() - startTime;
        console.log("Raw response:", text, "Elapsed:", elapsedTime);

        if (text.trim().startsWith("Accepted")) {
          if (attempt < maxRetries) {
            attempt++;
            console.log(`Attempt ${attempt}: Received "Accepted". Retrying in 5 seconds...`);
            setTimeout(fetchData, 5000);
          } else {
            setTimeout(() => {
              resultsSection.innerHTML = "<p class='error'>No hotels found after multiple attempts.</p>";
            }, Math.max(0, minLoadingTime - elapsedTime));
          }
          return;
        }

        try {
          const data = JSON.parse(text);
          const hotels = data?.hotels || (Array.isArray(data) ? data : []);
          if (hotels.length > 0) {
            setTimeout(() => {
              displayHotels(hotels);
            }, Math.max(0, minLoadingTime - elapsedTime));
          } else if (attempt < maxRetries) {
            attempt++;
            console.log(`Attempt ${attempt}: No hotels yet. Retrying in 5 seconds...`);
            setTimeout(fetchData, 5000);
          } else {
            setTimeout(() => {
              resultsSection.innerHTML = "<p class='error'>No hotels found for your criteria after multiple attempts.</p>";
            }, Math.max(0, minLoadingTime - elapsedTime));
          }
        } catch (error) {
          console.error("Data parsing error:", error, "Response:", text);
          setTimeout(() => {
            resultsSection.innerHTML = "<p class='error'>Unable to process hotel data. Please try again later.</p>";
          }, Math.max(0, minLoadingTime - elapsedTime));
        }
      })
      .catch(error => {
        console.error("Fetch error:", error);
        const elapsedTime = Date.now() - startTime;
        setTimeout(() => {
          resultsSection.innerHTML = `<p class='error'>Error fetching hotels: ${error.message}</p>`;
        }, Math.max(0, minLoadingTime - elapsedTime));
      });
    }
    fetchData();
  }

  function displayHotels(hotels) {
    resultsSection.innerHTML = "<h2>Hotel Search Results</h2>";
    if (!hotels || hotels.length === 0) {
      resultsSection.innerHTML += "<p class='error'>No hotels found for your criteria.</p>";
      return;
    }
    resultsSection.innerHTML += `<div class="results-grid">`;
    hotels.forEach(hotel => {
      const imageUrl = (hotel.images && hotel.images[0]?.url) ? hotel.images[0].url : "https://via.placeholder.com/300x200?text=No+Image";
      let hotelRooms = hotel.rooms || hotel.rates || [];
      hotelRooms = Array.isArray(hotelRooms) ? hotelRooms : [hotelRooms];
      hotelRooms.forEach(room => {
        let minRate = room.minRate || "N/A";
        let maxRate = room.maxRate || "N/A";
        let currency = room.currency || "EUR";
        resultsSection.innerHTML += `
          <div class="hotel-card" data-hotel='${encodeURIComponent(JSON.stringify(hotel))}'>
            <div class="hotel-image">
              <img src="${imageUrl}" alt="${hotel.name || "Unnamed Hotel"}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            </div>
            <div class="hotel-details">
              <h3>${hotel.name || "Unnamed Hotel"}</h3>
              <p class="rating">${hotel.categoryName || "N/A"} <span class="stars">★${"★".repeat(parseInt(hotel.categoryName) || 0)}</span></p>
              <p class="location">${hotel.zoneName || "N/A"}, ${hotel.destinationName || "N/A"}</p>
              <p class="price">Price Range: ${minRate} - ${maxRate} ${currency}</p>
              <button class="book-now">Book Now</button>
            </div>
          </div>`;
      });
    });
    resultsSection.innerHTML += `</div>`;

    // Interactivity similar to Booking.com
    document.querySelectorAll('.hotel-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
        card.style.transform = 'translateY(-5px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        card.style.transform = 'translateY(0)';
      });
      card.querySelector('.book-now').addEventListener('click', (e) => {
        e.stopPropagation();
        const hotelData = JSON.parse(decodeURIComponent(card.dataset.hotel));
        // Replace this with your actual booking process, e.g., redirect to a booking page
        alert(`Booking ${hotelData.name} - please contact us for details!`);
      });
    });
  }
});

// Dynamically add refined CSS for a Booking.com–like design
const styles = `
  body { font-family: "Open Sans", sans-serif; margin: 0; padding: 0; background: #f5f5f5; color: #333; }
  h2 { text-align: center; margin: 20px 0; }
  .loading-container { text-align: center; padding: 40px; }
  .loading-text { font-size: 18px; margin-bottom: 20px; }
  .loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto; animation: spin 2s linear infinite; }\n  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 20px; }\n  .hotel-card { background: #fff; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; }\n  .hotel-image { width: 100%; height: 200px; overflow: hidden; }\n  .hotel-image img { width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s; }\n  .hotel-details { padding: 15px; }\n  .hotel-details h3 { margin: 0 0 8px; font-size: 18px; color: #333; }\n  .hotel-details .rating { font-size: 14px; color: #ff9900; margin-bottom: 6px; }\n  .hotel-details .location { font-size: 14px; color: #777; margin-bottom: 6px; }\n  .hotel-details .price { font-size: 16px; font-weight: bold; margin-bottom: 10px; }\n  .hotel-details .book-now { background: #0071c2; color: #fff; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; font-size: 14px; transition: background 0.3s; }\n  .hotel-details .book-now:hover { background: #005b9f; }\n  .error { color: red; text-align: center; margin: 20px 0; }\n`;
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
