document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        destination: document.getElementById('destination').value,
        checkin: document.getElementById('checkin').value,
        checkout: document.getElementById('checkout').value,
        travelers: document.getElementById('travelers').value
    };

    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = 'Searching for your perfect stay...';

    try {
        const response = await fetch('https://hook.eu2.make.com/c453rhisc4nks6zgmz15h4dthq85ma3k', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        resultsDiv.innerHTML = `
            <h3>Search Results</h3>
            <p>${JSON.stringify(data, null, 2)}</p>
        `;
    } catch (error) {
        resultsDiv.innerHTML = `
            <h3>Oops!</h3>
            <p>Something went wrong. Please try again later.</p>
        `;
        console.error('Error:', error);
    }
});
