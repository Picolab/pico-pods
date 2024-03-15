document.addEventListener('DOMContentLoaded', function() {
    var button = document.getElementById('attachButton');
    
    button.addEventListener('click', function(event) {
        event.preventDefault();

        const podURL = document.getElementById('podURL').value;
        const webID = document.getElementById('webID').value;
        const clientID = document.getElementById('clientID').value;
        const clientSecret = document.getElementById('clientSecret').value;
        const tokenURL = document.getElementById('tokenURL').value;

        // change the ECI to make it work on your pico
        const queryURL = "http://localhost:3001/sky/event/cltqlszq00012ycu4dtvt55l9/1556/test/connect_storage";
        const queryParams = new URLSearchParams({
            storageURL: podURL,
            webID: webID,
            clientID: clientID,
            clientSecret: clientSecret,
            tokenURL: tokenURL
        }).toString();

        const attachURL = `${queryURL}?${queryParams}`;

        fetch(attachURL, {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            window.location.href = 'pod.html';
        })
        .catch(error => console.error('Error:', error));
    });
});