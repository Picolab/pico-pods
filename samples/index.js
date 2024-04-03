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

async function toggleControlPanel(showDefaultButtons) {
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
        addButton('deletePhoto', 'Delete photo', deletePhotoAction);
        addButton('copy', 'Copy', copyAction);
        addButton('downloand', 'Download', downloadAction);
        addButton('grantAccessToggle', await getAccess(), grantAccessAction);
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
    input.id = 'photoNameInput';
    input.className = 'addPhotoInput'; 
    input.placeholder = 'Enter photo URL';
    input.style.width = '150px';
    input.style.marginRight = '5px';

    const submitNewPhoto = () => {
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
            if (input.value.trim() == '') {
                input.remove(); // Remove the input field
                addPhotoBtn.style.display = ''; // Show the button again
            } else {
                submitNewPhoto();
            }
        }
    });

    // Insert the input field into the DOM, after the back button
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
    input.style.marginRight = '5px';

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
            if (input.value.trim() == '') {
                input.remove(); // Remove the input field
                addFolderBtn.style.display = ''; // Show the button again
            } else {
                submitNewFolder();
            }
        }
    });

    // Insert the input field into the DOM, after the add photo button
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

function deletePhotoAction() {
    const event = `${getPicoURL()}1556/sample_app/remove_file?fileURL=${getCurrentPath()}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Delete photo failed: ${response.status}`);
        }
        fetchAndDisplayItems(lastURL.pop(), true);
        toggleControlPanel(true);
    })
    .catch(error => {
        console.error('Error deleting photo:', error);
        alert('Failed to delete the photo.');
    });
}

function copyAction() {
    const copyBtn = document.getElementById('copy');
    copyBtn.style.display = 'none'; 

    // Text input for the folder URL
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'folderURLInput';
    input.className = 'copyPhotoInput'; 
    input.placeholder = 'Enter the folder URL';
    input.style.width = '150px';  
    input.style.marginRight = '5px';

    input.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            if (input.value) {
                await copyPhoto(input.value); 
                console.log(`Copy photo to ${input.value} successfully!`);
                alert(`Copy photo to ${input.value} successfully!`);
                input.remove(); 
                copyBtn.style.display = 'inline-block'; 
            } else {
                input.remove(); 
                copyBtn.style.display = 'inline-block'; 
            }
        }
    });

    // Insert the input field into the DOM, after the delete photo button
    copyBtn.parentNode.insertBefore(input, copyBtn);
    input.focus(); // Automatically focus the input field
}

function downloadAction() {
    const currentPhotoURL = document.querySelector('.folder img').src; 
    const link = document.createElement('a');
    link.href = currentPhotoURL;
    link.download = getCurrentPath().split('/').pop(); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function grantAccessAction() {
    const access = document.getElementById('grantAccessToggle').textContent;
    if (access == 'Private') {
        grantAccess(getCurrentPath());
        document.getElementById('grantAccessToggle').textContent = 'Public';
    } else {
        removeAccess(getCurrentPath());
        document.getElementById('grantAccessToggle').textContent = 'Private';
    }
}

function grantAccessToAction() {
    const grantAccessBtn = document.getElementById('grantAccessTo');
    grantAccessBtn.style.display = 'none'; // Hide the button

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'webIDInput';
    input.className = 'grantAccessInput'; 
    input.placeholder = 'Enter a webID';
    input.style.width = '150px';
    input.style.marginRight = '5px';

    const submitNewGrantAccessRequest = () => {
        let webID = input.value.trim();
        if (webID) {
            console.log(`Granting access to: ${webID}`); 
            grantAccessTo(getCurrentPath(), webID).then(() => {
                console.log(`Access grant to ${webID} successfully!`);
                alert(`Access grant to ${webID} successfully!`);
                input.remove(); // Remove the input field
                grantAccessBtn.style.display = ''; // Show the button again
            })
        }
    };

    // Listen for the Enter key in the input field
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (!input.value.trim()) {
                input.remove();
                grantAccessBtn.style.display = ''; // Show the button again
            } else if (!(input.value.trim().startsWith('http://') || input.value.trim().startsWith('https://'))){
                alert('WebID must be an URL!');           
            } else {
                submitNewGrantAccessRequest();
            }
        }
    });

    // Insert the input field into the DOM, after the private/public button
    grantAccessBtn.parentNode.insertBefore(input, grantAccessBtn);
    input.focus(); // Automatically focus the input field
}

async function removeAccessFromAction() {
    try {
        const webIDs = await getAllAgentAccess(); 
        const grantAccessToBtn = document.getElementById('grantAccessTo');
        const removeAccessBtn = document.getElementById('removeAccessFrom');
        removeAccessBtn.style.display = 'none'; 

        const container = document.createElement('div');
        container.id = 'webIDSelectionContainer';
        container.style.display = 'inline-flex'; 
        container.style.alignItems = 'center';
        container.style.gap = '5px'; 

        // Create and append the dropdown
        const select = document.createElement('select');
        select.id = 'webIDSelect';
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Select a webID';
        defaultOption.value = '';
        select.appendChild(defaultOption);

        webIDs.slice(1).forEach(id => { // Skip the owner's WebID
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            select.appendChild(option);
        });
        container.appendChild(select);

        // Remove Button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = function() {
            const webID = select.value;
            if (webID) {
                console.log(`Removing access from ${webID}`);
                removeAccessFrom(webID)
                .then(() => {
                    console.log(`Remove access from ${webID} successfully!`);
                    alert(`Remove access from ${webID} successfully!`);
                    container.remove(); 
                    removeAccessBtn.style.display = 'inline-block'; 
                })
            } else {
                alert('Please select a WebID.');
            }
        };
        container.appendChild(removeButton);

        // Cancel Button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = function() {
            container.remove(); 
            removeAccessBtn.style.display = 'inline-block'; 
        };
        container.appendChild(cancelButton);

        // Insert the container next to the "Grant Access To" button
        grantAccessToBtn.parentNode.insertBefore(container, grantAccessToBtn.nextSibling);
    } catch (error) {
        console.error('Failed to fetch WebIDs:', error);
    }
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
            throw new Error(`Add photo failed: ${response.status}`);
        }
        fetchAndDisplayItems(getCurrentPath(), true);
    })
    .catch(error => {
        console.error('Error adding photo:', error);
        alert('Failed to add the photo.');
    });
}

async function grantAccess(url) {
    const event = `${getPicoURL()}1556/sample_app/grant_access?resourceURL=${url}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Make photo public failed: ${response.status}`);
        }
        console.log(`${url} is now public.`)
        alert('The photo is now public!');
    })
    .catch(error => {
        console.error('Error making photo public:', error);
        alert('Failed to make the photo public.');
    })
}

async function removeAccess(url) {
    const event = `${getPicoURL()}1556/sample_app/remove_access?resourceURL=${url}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Make photo private failed: ${response.status}`);
        }
        console.log(`${url} is now private.`)
        alert('The photo is now private!');
    })
    .catch(error => {
        console.error('Error making photo private:', error);
        alert('Failed to make the photo private.');
    })
}

async function getAccess() {
    const event = `${getPicoURL()}1556/sample_app/get_access?resourceURL=${getCurrentPath()}`;
    const response = await fetch(event);
    if (!response.ok) {
        throw new Error(`Get photo access failed: ${response.status}`);
    }
    const json = await response.json();
    if (json.directives[0].name == 'false') {
        return 'Private';
    }
    return 'Public';
}

async function grantAccessTo(resourceURL, webID) {
    const data = {
        resourceURL: resourceURL,
        webID: webID,
    };
    fetch(`${getPicoURL()}1556/sample_app/grant_agent_access`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Grant Access to ${webID} failed: ${response.status}`);
        }
    })
    .catch(error => {
        console.error('Error granting access:', error);
        alert(`Failed to grant access to ${webID}.`);
    });
}

async function getAllAgentAccess() {
    const event = `${getPicoURL()}1556/sample_app/get_all_agent_access?resourceURL=${getCurrentPath()}`;
    const response = await fetch(event);
    if (!response.ok) {
        throw new Error(`Get all agents access failed: ${response.status}`);
    }
    const json = await response.json();
    return json.directives[0].name;
}

async function removeAccessFrom(webID) {
    const data = {
        resourceURL: getCurrentPath(),
        webID: webID,
    };
    fetch(`${getPicoURL()}1556/sample_app/remove_agent_access`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Grant Access to ${webID} failed: ${response.status}`);
        }
    })
    .catch(error => {
        console.error('Error removing access:', error);
        alert(`Failed to remove access from ${webID}.`);
    });
}

async function copyPhoto(storeLocation) {
    if (!storeLocation.endsWith('/')) {
        storeLocation += '/';
    }
    const data = {
        fetchFileURL: getCurrentPath(),
        storeLocation: storeLocation
    };
    fetch(`${getPicoURL()}1556/sample_app/copy_file`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Copy photo failed: ${response.status}`);
        }
    })
    .catch(error => {
        console.error('Error copying photo:', error);
        alert('Failed to copy the photo.');
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
