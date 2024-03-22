let pod = true;

document.addEventListener("DOMContentLoaded", function() {
    // Set default photo
    setCurrentFolder('');

    // Modal attach button listener
    const attachForm = document.getElementById('loginForm');
    attachForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const storageURL = document.getElementById('podURL').value;
        const clientID = document.getElementById('clientID').value;
        const clientSecret = document.getElementById('clientSecret').value;
        const tokenURL = document.getElementById('tokenURL').value;
        
        const data = {
            storage_url: storageURL,
            client_id: clientID,
            client_secret: clientSecret,
            token_url: tokenURL
        };
        let pico = getPicoURL;
        
        fetch(`${pico}/temp/sample_app/attach_storage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log(response.json());
            const modal = document.getElementById('myModal');
            modal.style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});


async function attach(event) {
    event.preventDefault();
    let pico = document.getElementById('PicoECI').value;
    setPicoURL(pico);
    console.log("Pico URL: ", pico);
    window.location.href = 'pod.html';
}

function toggleDetachAttachButtons() {
    const detachPodButton = document.getElementById('detachPod');
    const attachPodButton = document.getElementById('attachPod');
    
    if (pod) {
        let pico = getPicoURL;
        pod = false;
        detachPodButton.style.display = 'none';
        attachPodButton.style.display = 'inline-block';
        fetch(`${pico}/temp/sample_app/detach_storage`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log(response.json());
        })
    } else {
        pod = true;
        const modal = document.getElementById('myModal');
        modal.style.display = 'block';
        detachPodButton.style.display = 'inline-block';
        attachPodButton.style.display = 'none';
    }
}

async function allPhotos() {
    const sharedPhotosButton = document.getElementById('listAllSharedPhotos');
    const allPhotosButton = document.getElementById('listAllPhotos');
    allPhotosButton.classList.add('active');
    sharedPhotosButton.classList.remove('active');
}

async function sharedPhotos() {
    const sharedPhotosButton = document.getElementById('listAllSharedPhotos');
    const allPhotosButton = document.getElementById('listAllPhotos');
    sharedPhotosButton.classList.add('active');
    allPhotosButton.classList.remove('active');
}

async function toggleFolder(folderHeader) {
    const folderContent = folderHeader.nextElementSibling;
    folderContent.classList.toggle('show');
}

function setPicoURL(url) {
    localStorage.setItem('PicoURL', url);
}

function getPicoURL() {
    return localStorage.getItem('PicoURL');
}

function setCurrentFolder(url) {
    localStorage.setItem('currentFolder', url);
}

function getCurrentFolder() {
    return localStorage.getItem('currentFolder');
}
