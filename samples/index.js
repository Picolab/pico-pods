let pod = true;
let lastURL = [];
let storageURL;

document.addEventListener("DOMContentLoaded", async function() {
    
    // Set default photo
    storageURL = await getStorage();
    setCurrentPath('');

    // Show all items in the root storage URL
    fetchAndDisplayItems();

    // Show primary control panel
    toggleControlPanel(true);

    // Modal attach button listener
    const attachForm = document.getElementById('loginForm');
    attachForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const storageURL = document.getElementById('storageURL').value;
        const clientID = document.getElementById('clientID').value;
        const clientSecret = document.getElementById('clientSecret').value;
        const tokenURL = document.getElementById('tokenURL').value;
        
        const data = {
            storage_url: storageURL,
            client_id: clientID,
            client_secret: clientSecret,
            token_url: tokenURL
        };
        let pico = getPicoURL();
        
        fetch(`${pico}1556/sample_app/attach_storage`, {
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

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', handleFileSelect);
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
        let pico = getPicoURL();
        pod = false;
        detachPodButton.style.display = 'none';
        attachPodButton.style.display = 'inline-block';
        fetch(`${pico}1556/sample_app/detach_storage`)
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
    if (!url.endsWith('/')) {
        url += '/';
    }
    localStorage.setItem('PicoURL', url);
}

function getPicoURL() {
    return localStorage.getItem('PicoURL');
}

function setCurrentPath(url) {
    localStorage.setItem('currentPath', url);
    console.log(`setCurrentPath to ${url}`);
}

function getCurrentPath() {
    return localStorage.getItem('currentPath');
}

async function fetchAndDisplayItems(folderPath = storageURL, goBack = false) {
    const event = `${getPicoURL()}1556/sample_app/ls?fileURL=${folderPath}`;
    try {
        const response = await fetch(event);
        if (!response.ok) {
            throw new Error(`List items failed: ${response.status}`);
        }
        if (!goBack) lastURL.push(getCurrentPath());
        setCurrentPath(folderPath);
        const json = await response.json();
        let items = json.directives[0].name;
        if (items != null) {
            // Sort items by type: folders, photos, others
            items.sort((a, b) => {
                const typeA = getItemType(a), typeB = getItemType(b);
                if (typeA === typeB) return 0; // Keep original order if the same type
                if (typeA === 'folder') return -1; // Folder comes first
                if (typeB === 'folder') return 1;  // Folder comes first
                if (typeA === 'photo') return -1;  // Photo comes second
                if (typeB === 'photo') return 1;   // Photo comes second
                // 'other' implicitly comes last
                return 0;
            });

            const urlMap = await prefetchDataURLs(items);
            const folderDiv = document.querySelector('.folder');
            folderDiv.innerHTML = ''; // Clear current contents

            items.forEach(itemName => {
                const url = urlMap[itemName] || ''; // Default to empty string if no URL for non-photos
                const itemHTML = createItemHTML(itemName, url);
                folderDiv.innerHTML += itemHTML;
            });
        }

        // Display current path
        displayCurrentPath(getCurrentPath());        

    } catch (error) {
        console.error("Failed to fetch and display items:", error);
    }
}

// Function to create HTML for an item
function createItemHTML(itemName, url) {
    const itemType = getItemType(itemName);
    let src = '';
    let altText = '';
    let onClickAttribute = '';

    switch (itemType) {
        case 'folder':
            src = 'folder.png'; 
            altText = 'Folder';
            onClickAttribute = `onclick="fetchAndDisplayItems('${getCurrentPath() + itemName}')"`;
            break;
        case 'photo':
            src = url; 
            altText = 'Photo';
            onClickAttribute = `onclick="displayFullSizePhoto('${url}', '${itemName}')"`;
            break;
        case 'other':
            src = 'file.png'; 
            altText = 'File';
            break;
    }

    return `<div class="item" ${onClickAttribute} style="display: inline-block; width: 300px; text-align: center; margin: 5px;">
                <img src="${src}" alt="${altText}" style="width: 200px; height: 200px;">
                <p>${itemName.replace('/', '')}</p>
            </div>`;
}

function displayFullSizePhoto(url, itemName) {
    const folderDiv = document.querySelector('.folder');
    folderDiv.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%;">`; 
    lastURL.push(getCurrentPath());
    setCurrentPath(getCurrentPath() + itemName);
    displayCurrentPath(getCurrentPath());
    toggleControlPanel(false); 
}

function addButton(id, text, action) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.addEventListener('click', action);
    button.style.marginRight = "5px"; 
    button.style.marginBottom = "5px"; 
    document.querySelector('.control-panel').appendChild(button);
}

function toggleControlPanel(showDefaultButtons) {
    const controlPanel = document.querySelector('.control-panel');
    controlPanel.innerHTML = ''; // Clear existing buttons
    if (showDefaultButtons) {
        addButton('back', 'Back', backAction);
        addButton('addPhoto', 'Add photo', addPhotoAction);
        addButton('addFolder', 'Add folder', addFolderAction);
        addButton('deleteFolder', 'Delete folder', deleteFolderAction);
        addButton('sample', 'sample', sampleAction);
    } else {
        addButton('back', 'Back', backAction);
        addButton('deletePhoto', 'Delete photo', deleteFileAction);
        addButton('copy', 'Copy', copyAction);
        addButton('grantAccessToggle', 'Private', grantAccessAction);
        addButton('grantAccessTo', 'Grant Access to', grantAccessToAction);
        addButton('removeAccessFrom', 'Remove Access from', removeAccessFromAction);
    }
}

function getItemType(itemName) {
    if (itemName.endsWith('/')) return 'folder';
    if (['.jpg', '.png', '.jpeg'].some(ext => itemName.endsWith(ext))) return 'photo';
    return 'other';
}

function backAction() {
    if (lastURL.length == 0) {
        fetchAndDisplayItems();
    } else {
        fetchAndDisplayItems(lastURL.pop(), true);
    }
    toggleControlPanel(true);
}

function addPhotoAction() {
    const addPhotoBtn = document.getElementById('addPhoto');
    addPhotoBtn.style.display = 'none'; // Hide the button

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'folderNameInput';
    input.className = 'addPhotoInput'; 
    input.placeholder = 'Enter file URL';
    input.style.width = '150px';

    const submitNewFile = () => {
        const url = input.value.trim();
        const filename = url.split('/').pop();
        if (url) {
            console.log(`Adding file from: ${url}`); 
            addPhoto(url, filename).then(() => {
                alert('File added successfully!');
                input.remove(); // Remove the input field
                addPhotoBtn.style.display = ''; // Show the button again
            })
        }
    };

    // Listen for the Enter key in the input field
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitNewFile();
        }
    });

    // Insert the input field into the DOM, before the back button
    addPhotoBtn.parentNode.insertBefore(input, addPhotoBtn);
    input.focus(); // Automatically focus the input field
}

function addFolderAction() {
    const addFolderBtn = document.getElementById('addFolder');
    addFolderBtn.style.display = 'none'; // Hide the button

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'folderNameInput';
    input.className = 'addFolderInput'; 
    input.placeholder = 'Enter folder name';
    input.style.width = '150px';

    const submitNewFolder = () => {
        let folderName = input.value.trim();
        if (folderName) {
            console.log(`Adding folder: ${folderName}`); 
            addFolder(folderName).then(() => {
                alert('Folder added successfully!');
                input.remove(); // Remove the input field
                addFolderBtn.style.display = ''; // Show the button again
            })
        }
    };

    // Listen for the Enter key in the input field
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitNewFolder();
        }
    });

    // Insert the input field into the DOM, before the add folder button
    addFolderBtn.parentNode.insertBefore(input, addFolderBtn);
    input.focus(); // Automatically focus the input field
}

async function deleteFolderAction() {
    try {
        const listEvent = `${getPicoURL()}1556/sample_app/ls?fileURL=${getCurrentPath()}`;
        if (getCurrentPath() == storageURL) {
            alert('You cannot delete the root folder!');
            return;
        }
        const listResponse = await fetch(listEvent);
        if (!listResponse.ok) {
            throw new Error(`List folder failed: ${response.status}`);
        }
        const json = await listResponse.json();
        const items = json.directives[0].name;
        if (items.length != 0) {
            alert('You can only delete a empty folder!');
            return;
        }
        const deleteEvent = `${getPicoURL()}1556/sample_app/remove_folder?containerURL=${getCurrentPath()}`;
        const deleteResponse = await fetch(deleteEvent);
        if (!deleteResponse.ok) {
            throw new Error(`Delete folder failed: ${response.status}`);
        }
        alert('Folder deleted successfully!');
        fetchAndDisplayItems(lastURL.pop(), true);
    } catch (error) {
        console.error('Error deleting the folder:', error);
    }
}

function sampleAction() {
    document.getElementById('fileInput').click();
}

// Handle file selection and upload
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log(file);
        const formData = new FormData();
        formData.append('file', file); 

        try {
            const response = await fetch('YOUR_API_ENDPOINT', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Success feedback
            console.log('File uploaded successfully');
            alert('File uploaded successfully');
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }
}

function deleteFileAction() {
    const event = `${getPicoURL()}1556/sample_app/remove_file?fileURL=${getCurrentPath()}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Delete file failed: ${response.status}`);
        }
        fetchAndDisplayItems(lastURL.pop(), true);
        toggleControlPanel(true);
    })
    .catch(error => {
        console.error('Error deleting file:', error);
        alert('Failed to delete the file.');
    });
}

function copyAction() {

}

function grantAccessAction() {

}

function grantAccessToAction() {

}

function removeAccessFromAction() {
    
}

async function search() {
    const fileName = document.getElementById('searchInput').value;
    const event = `${getPicoURL()}1556/sample_app/find?fileName=${fileName}`

    try {
        const response = await fetch(event);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        const json = await response.json();
        const path = json.directives[0].name + fileName;
        if (path == null) {
            alert("File not found! Please make sure the file name is spelled correctly and the file extension is correct.")
        } else {
            displayFullSizePhoto(path, path);
        }
    } catch (error) {
        console.log("error in search: " + error);
    }
}

async function addFolder(folderName) {
    if (!folderName.endsWith('/')) {
        folderName += '/';
    }
    const newPath = getCurrentPath() + folderName;
    const event = `${getPicoURL()}1556/sample_app/create_folder?containerURL=${newPath}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Add folder failed: ${response.status}`);
        }
        fetchAndDisplayItems(newPath);
    })
    .catch(error => {
        console.error('Error adding folder:', error);
        alert('Failed to add the folder.');
    });
}

async function getDataURL(item) {
    try {
        const event = `${getPicoURL()}1556/sample_app/fetch_file?fileURL=${getCurrentPath() + item}`;
        const response = await fetch(event);
        if (!response.ok) {
            throw new Error(`Fetch file failed: ${response.status}`);
        }
        const json = await response.json();
        return json.directives[0].name;
    } catch (error) {
        console.error("Failed to fetch the file:", error);
    }
}

async function prefetchDataURLs(items) {
    const urlPromises = items.map(item => {
        if (getItemType(item) === 'photo') {
            return getDataURL(item).then(url => ({ itemName: item, url }));
        }
        return Promise.resolve({ itemName: item, url: undefined });
    });

    const urls = await Promise.all(urlPromises);
    const urlMap = urls.reduce((acc, { itemName, url }) => {
        acc[itemName] = url;
        return acc;
    }, {});

    return urlMap;
}

async function addPhoto(url, filename) {
    const storeLocation = getCurrentPath() + filename;
    const data = {
        fileName: filename,
        originURL: url,
        destinationURL: storeLocation
    };
    fetch(`${getPicoURL()}1556/sample_app/overwrite_file`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Add file failed: ${response.status}`);
        }
        fetchAndDisplayItems(getCurrentPath(), true);
    })
    .catch(error => {
        console.error('Error adding file:', error);
        alert('Failed to add the file.');
    });
}

function displayCurrentPath(path) {
    const currentPathElement = document.getElementById('currentPath');
    let pathToDisplay = path;
    const formattedPath = pathToDisplay.replace(/^https?:\/\//, ''); // Remove http:// or https://
    currentPathElement.textContent = formattedPath;
}

async function getStorage() {
    try {
        const event = `${getPicoURL()}1556/sample_app/get_storage`;
        const response = await fetch(event);
        if (!response.ok) {
            throw new Error(`fetch storage URL failed: ${response.status}`);
        }
        const json = await response.json();
        return json.directives[0].name;
    } catch {
        console.error("Failed to fetch the storage URL:", error);
    }
}
