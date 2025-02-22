document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('hotelSearchForm');
  const resultsSection = document.getElementById('results');

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Get data from the 4 search sections (Destination, Check-in, Check-out, Number of Travellers)
    const destinationInput = document.getElementById('destination').value.trim().toUpperCase();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const travellers = document.getElementById('travellers').value;

    // Validate the 4 sections, ensuring Check-in is in the future
    if (!/^[A-Z]{3}$/.test(destinationInput)) {
      alert("Please enter a valid three-letter airport code (e.g., DXB, LON, PAR).");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight to compare dates only
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime()) || checkoutDate <= checkinDate || checkinDate < today) {
      alert("Please enter valid dates, with check-out after check-in and check-in in the future (after today).");
      return;
    }

    const timeDiff = Math.abs(checkoutDate - checkinDate);
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const requestData = {
      destination: destinationInput,
      checkin,
      checkout,
      travellers,
      nights
    };

    // Show "Waiting" or "Loading" message while Make.com processes
    resultsSection.innerHTML = "<p>Waiting for hotel results... <span class='loading'>Loading...</span></p>";

    // Send data to Make.com and wait for the final response
    fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", { // Replace with your actual webhook URL
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestData)
    })
    .then(response => {
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      if (!response.ok) {
        if (response.status === 202) { // Handle 202 Accepted (asynchronous response)
          return new Promise((resolve) => {
            // Poll or wait for the final response (simplified polling for demo)
            let attempts = 0;
            const maxAttempts = 10; // Try up to 10 times (adjust as needed)
            const delay = 1000; // Check every 1 second

            const poll = () => {
              if (attempts >= maxAttempts) {
                throw new Error("Timeout waiting for Make.com response");
              }

              fetch("https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k", { // Same webhook URL
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
              })
              .then(pollResponse => {
                if (pollResponse.ok && pollResponse.status === 200) {
                  const contentType = pollResponse.headers.get('content-type');
                  if (contentType && contentType.includes('application/json')) {
                    return pollResponse.text().then(text => {
                      try {
                        let data = text.trim();
                        if (data.startsWith('"') && data.endsWith('"')) {
                          data = data.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        }
                        const parsedData = JSON.parse(data);
                        resolve({ hotels: parsedData.hotels || [], images: parsedData.images || [] });
                      } catch (parseError) {
                        console.log('Raw response text:', text);
                        throw new Error(`Failed to parse JSON: ${parseError.message}. Response text: ${text}`);
                      }
                    });
                  } else {
                    throw new Error(`Expected JSON, got: ${pollResponse.statusText}`);
                  }
                } else if (pollResponse.status === 202) {
                  attempts++;
                  setTimeout(poll, delay);
                } else {
                  throw new Error(`HTTP error! status: ${pollResponse.status}`);
                }
              })
              .catch(error => {
                throw new Error(`Polling error: ${error.message}`);
              });
            };

            poll();
          });
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.text().then(text => {
          try {
            let data = text.trim();
            if (data.startsWith('"') && data.endsWith('"')) {
              data = data.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
            const parsedData = JSON.parse(data);
            return { hotels: parsedData.hotels || [], images: parsedData.images || [] };
          } catch (parseError) {
            console.log('Raw response text:', text);
            throw new Error(`Failed to parse JSON: ${parseError.message}. Response text: ${text}`);
          }
        });
      } else {
        throw new Error(`Expected JSON, got: ${response.statusText}`);
      }
    })
    .then(data => {
      let htmlContent = `
        <h2>Hotel Search Results</h2>
        <div class="filters">
          <label>Board:</label>
          <select id="boardFilter">
            <option value="all">All</option>
            <option value="RO">Room Only</option>
            <option value="BB">Bed & Breakfast</option>
            <option value="HB">Half Board</option>
            <option value="FB">Full Board</option>
          </select>
          <label>Category:</label>
          <select id="categoryFilter">
            <option value="all">All</option>
            <option value="1">1 Star</option>
            <option value="2">2 Stars</option>
            <option value="3">3 Stars</option>
            <option value="4">4 Stars</option>
            <option value="5">5 Stars</option>
          </select>
        </div>
        <div class="results-grid">`;
      if (data.error) {
        htmlContent += `<p>${data.error}</p>`;
      } else if (data.hotels.length > 0) {
        data.hotels.forEach(hotel => {
          const hotelImage = data.images.find(img => img.hotelCode === hotel.code)?.imageUrl || `https://via.placeholder.com/300x200?text=No+Image`;
          const firstRoom = hotel.rooms && hotel.rooms[0] ? hotel.rooms[0] : null;
          if (firstRoom && firstRoom.rates && firstRoom.rates.length > 0) {
            const cheapestRate = firstRoom.rates.reduce((min, rate) => rate.net < min.net ? rate : min, firstRoom.rates[0]);
            const price = cheapestRate.net || "N/A";
            const availability = cheapestRate.allotment > 0 ? "Available" : "Not Available";
            const board = cheapestRate.boardName || "Room Only";
            const category = hotel.categoryName || "Unknown Category";
            htmlContent += `
              <div class="hotel-card">
                <img src="${hotelImage}" alt="${hotel.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <h3>${hotel.name}</h3>
                <p>Category: ${category}</p>
                <p>Board: ${board}</p>
                <p>Price: ${price} EUR / night</p>
                <p>Availability: ${availability}</p>
                <button class="book-btn" data-hotel="${hotel.code}" data-rate="${cheapestRate.rateKey}">View Rooms</button>
              </div>`;
          }
        });
        htmlContent += `</div>`;
      } else {
        htmlContent += "<p>No hotels found for your criteria.</p>";
      }
      resultsSection.innerHTML = htmlContent;

      // Add filtering like Booking.com
      document.getElementById('boardFilter').addEventListener('change', filterResults);
      document.getElementById('categoryFilter').addEventListener('change', filterResults);

      function filterResults() {
        const boardFilter = document.getElementById('boardFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const hotelCards = document.querySelectorAll('.hotel-card');
        hotelCards.forEach(card => {
          const board = card.querySelector('p:nth-child(3)').textContent.split(': ')[1];
          const category = card.querySelector('p:nth-child(2)').textContent.split(': ')[1];
          const show = (boardFilter === 'all' || board === boardFilter) && 
                      (categoryFilter === 'all' || category.includes(categoryFilter + ' Stars'));
          card.style.display = show ? 'block' : 'none';
        });
      }

      // Add booking button click handler, mimicking Booking.com behavior
      document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const hotelCode = this.getAttribute('data-hotel');
          const rateKey = this.getAttribute('data-rate');
          alert(`Booking for Hotel ${hotelCode} with Rate ${rateKey}. Redirecting to booking page...`);
          // In a real Booking.com setup, this would navigate to a booking page or API call
        });
      });
    })
    .catch(error => {
      console.error("Error:", error);
      resultsSection.innerHTML = `<p>An error occurred while fetching hotel data. Please try again later. Details: ${error.message}</p>`;
    });
  });
});

// Optional: Add loading animation CSS in styles.css for better visuals
// Add this to your styles.css if not already included:
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
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
