let ECI = '';

async function attach(event) {
    event.preventDefault();
    ECI = document.getElementById('PicoECI').value;
    console.log("Pico ECI: ", ECI);
    window.location.href = 'pod.html';
}
