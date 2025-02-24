<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotel Booking</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f4f4f4;
    }
    .container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 0 20px;
    }
    h1 {
      text-align: center;
      color: #003580;
      margin-bottom: 20px;
    }
    #hotelSearchForm {
      display: flex;
      gap: 10px;
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }
    #hotelSearchForm input {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      flex: 1;
    }
    #hotelSearchForm button {
      padding: 10px 20px;
      background: #0071c2;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    #hotelSearchForm button:hover {
      background: #005ea6;
    }
    .loading {
      font-style: italic;
      color: #666;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      padding: 20px;
    }
    .hotel-card {
      display: flex;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      background: #fff;
    }
    .hotel-image {
      flex: 0 0 40%;
    }
    .hotel-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hotel-details {
      flex: 1;
      padding: 15px;
    }
    .hotel-details h3 {
      margin: 0 0 10px;
      font-size: 18px;
      color: #003580;
    }
    .rating {
      margin: 0 0 5px;
      font-size: 14px;
      color: #666;
    }
    .stars {
      color: #feba02;
    }
    .location {
      margin: 0 0 5px;
      font-size: 14px;
      color: #0071c2;
    }
    .coordinates {
      margin: 0 0 5px;
      font-size: 12px;
      color: #999;
    }
    .description {
      margin: 0 0 10px;
      font-size: 14px;
      color: #333;
    }
    .price {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: bold;
      color: #008009;
    }
    .book-now {
      background: #0071c2;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .book-now:hover {
      background: #005ea6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Find Your Hotel</h1>
    <form id="hotelSearchForm">
      <input type="text" id="destination" placeholder="Destination (e.g., LON)" required>
      <input type="date" id="checkin" required>
      <input type="date" id="checkout" required>
      <input type="number" id="travellers" placeholder="Travellers" min="1" required>
      <button type="submit">Search Hotels</button>
    </form>
    <section id="results"></section>
  </div>
  <script src="/main.js"></script> <!-- Updated to use root path with leading slash, ensuring no 404 -->
</body>
</html>
