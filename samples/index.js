let ECI = '';
let pod = true;

async function attach(event) {
    event.preventDefault();
    ECI = document.getElementById('PicoECI').value;
    console.log("Pico ECI: ", ECI);
    window.location.href = 'pod.html';
}

function toggleDetachAttachButtons() {
    const detachPodButton = document.getElementById('detachPod');
    const attachPodButton = document.getElementById('attachPod');
    
    if (pod) {
        pod = false;
        detachPodButton.style.display = 'none';
        attachPodButton.style.display = 'inline-block';
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
