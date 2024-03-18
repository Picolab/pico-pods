let ECI = '';

async function attach(event) {
    event.preventDefault();
    ECI = document.getElementById('PicoECI').value;
    console.log("Pico ECI: ", ECI);
    window.location.href = 'pod.html';
}

async function exit(event) {
    event.preventDefault();
    ECI = '';
    window.location.href = 'index.html';
}
