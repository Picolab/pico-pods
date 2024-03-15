document.addEventListener('DOMContentLoaded', function() {
    var button = document.getElementById('detachPod');

    button.addEventListener('click', function(event) {
        event.preventDefault();

        // change the ECI to make it work on your pico
        const detachURL = "http://localhost:3001/sky/event/cltqlszq00012ycu4dtvt55l9/1556/test/disconnect_storage";

        fetch(detachURL, {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            window.location.href = 'index.html';
        })
        .catch(error => console.error('Error:', error));
    });
});