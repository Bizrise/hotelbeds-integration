document.addEventListener("DOMContentLoaded", function () {
  const resultsContainer = document.getElementById("results");

  const hotels = [
    {
      name: "Hotel Century Southern Tower",
      location: "Tokyo City",
      rating: "⭐⭐⭐⭐⭐",
      price: "RM 6,200",
      image: "hotel1.jpg"
    },
    {
      name: "Shinjuku Grand Hotel",
      location: "Shinjuku, Tokyo",
      rating: "⭐⭐⭐⭐",
      price: "RM 5,800",
      image: "hotel2.jpg"
    },
    {
      name: "Asakusa Riverside Hotel",
      location: "Asakusa, Tokyo",
      rating: "⭐⭐⭐",
      price: "RM 4,500",
      image: "hotel3.jpg"
    }
  ];

  function displayHotels() {
    resultsContainer.innerHTML = "";
    hotels.forEach((hotel) => {
      const hotelCard = document.createElement("div");
      hotelCard.classList.add("hotel-card");

      hotelCard.innerHTML = `
        <img src="${hotel.image}" alt="Hotel">
        <div class="hotel-info">
          <h3>${hotel.name}</h3>
          <p>${hotel.location}</p>
          <p>${hotel.rating}</p>
        </div>
        <div class="hotel-price">
          ${hotel.price}
          <button class="view-rooms">View Rooms</button>
        </div>
      `;
      resultsContainer.appendChild(hotelCard);
    });
  }

  displayHotels();
});
