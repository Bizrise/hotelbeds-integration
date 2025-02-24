// Populate travellers dropdown with options from 1 to 100
document.addEventListener('DOMContentLoaded', () => {
    const travellersSelect = document.getElementById('travellers');
    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} Traveller${i > 1 ? 's' : ''}`;
        travellersSelect.appendChild(option);
    }
});

// Basic form validation and submission handling
const form = document.querySelector('.form-grid');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const destination = document.getElementById('destination').value;
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const travellers = document.getElementById('travellers').value;

    // Basic validation
    if (!destination || !checkin || !checkout || !travellers) {
        alert('Please fill in all fields.');
        return;
    }

    // Simple alert to simulate booking (replace with actual API call or logic)
    alert(`Searching for hotels in ${destination} from ${checkin} to ${checkout} for ${travellers} travellers...`);
});
