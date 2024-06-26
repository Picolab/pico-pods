let lastURL = [];
let storageURL;

document.addEventListener("DOMContentLoaded", async function() {
    
    // Set default photo
    storageURL = await getStorage();
    if (storageURL === null) {
        storageURL = '';
        toggleDetachAttachButtons(false);
    }
    else{
        setCurrentPath(storageURL);

        // Show all items in the root storage URL
        // fetchAndDisplayItems(getCurrentPath());

        // Set the default photo path to a folder called 'myPhotos'
        setUpMyPhotosFolder();
        // Show primary control panel
        toggleControlPanel(true);
        const detachPodButton = document.getElementById('detachPod');
        detachPodButton.style.display = 'inline-block';

    }


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
            fetchAndDisplayItems(storageURL);
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

function toggleDetachAttachButtons(pod) {
    const detachPodButton = document.getElementById('detachPod');
    const attachPodButton = document.getElementById('attachPod');
    
    if (pod) {
        let pico = getPicoURL();
        detachPodButton.style.display = 'none';
        attachPodButton.style.display = 'inline-block';
        fetch(`${pico}1556/sample_app/detach_storage`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log(response.json());
            const folderDiv = document.querySelector('.folder');
            folderDiv.innerHTML = ''; // Clear current contents
            setCurrentPath('');
            displayCurrentPath('');
        })
    } else {
        detachPodButton.style.display = 'inline-block';
        attachPodButton.style.display = 'none';
        const modal = document.getElementById('myModal');
        modal.style.display = 'block';
    }
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

function createItemHTML(itemName, dataURL) {
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
            src = dataURL; 
            altText = 'Photo';
            onClickAttribute = `onclick="displayFullSizePhoto('${dataURL}', '${getCurrentPath() + itemName}')"`;
            break;
        case 'other':
            // Hide the other types of file
            return '';
            // src = 'file.png'; 
            // altText = 'File';
            // break;
    }

    return `<div class="item" ${onClickAttribute} style="display: inline-block; width: 300px; text-align: center; margin: 5px;">
                <img src="${src}" alt="${altText}" style="width: 200px; height: 200px;">
                <p>${itemName.replace('/', '')}</p>
            </div>`;
}

function displayFullSizePhoto(dataURL, pathURL) {
    const folderDiv = document.querySelector('.folder');
    folderDiv.innerHTML = `<img src="${dataURL}" style="max-width: 100%; max-height: 100%;">`; 
    // Keep track of the last folder which users were at
    if (getCurrentPath().endsWith('/')) {
        lastURL.push(getCurrentPath());
    }
    setCurrentPath(pathURL);
    displayCurrentPath(getCurrentPath());
    toggleControlPanel(false); 
}

async function listItems(folderURL) {
    try {
        const event = `${getPicoURL()}1556/sample_app/ls?fileURL=${folderURL}`;
        const listResponse = await fetch(event);
        if (!listResponse.ok) {
            throw new Error(`List items failed: ${response.status}`);
        }
        const json = await listResponse.json();
        return json.directives[0].name;
    } catch (error) {
        console.error("Failed to list items:", error);
    }
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
    addButton('back', 'Back', backAction);
    if (showDefaultButtons) {
        addButton('addPhoto', 'Add photo', addPhotoAction);
        addButton('addFolder', 'Add folder', addFolderAction);
        addButton('deleteFolder', 'Delete folder', deleteFolderAction);
    } else {
        addButton('deletePhoto', 'Delete photo', deletePhotoAction);
        addButton('copy', 'Copy', copyAction);
        addButton('downloand', 'Download', downloadAction);
        addButton('grantAccessToggle', await getPublicAccess(), grantAccessAction);
        addButton('grantAccessTo', 'Grant Access to', grantAccessToAction);
        addButton('removeAccessFrom', 'Remove Access from', removeAccessFromAction);
    }
}

function getItemType(itemName) {
    if (itemName.endsWith('/')) return 'folder';
    if (['.jpg', '.png', '.jpeg'].some(ext => itemName.toLowerCase().endsWith(ext))) return 'photo';
    return 'other';
}

function backAction() {
    if (lastURL.length == 0) {
        fetchAndDisplayItems();
    } else {
        fetchAndDisplayItems(lastURL.pop(), true);
    }
    toggleControlPanel(true);
    document.getElementById('listAllSharedPhotos').classList.remove('active');
    document.getElementById('listAllPhotos').classList.remove('active');
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
            addPhoto(url, filename);
            input.remove(); // Remove the input field
            addPhotoBtn.style.display = ''; // Show the button again
            fetchAndDisplayItems(getCurrentPath(), true); // Refresh the contents of the folder
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
        if (getCurrentPath() == storageURL) {
            alert('You cannot delete the root folder!');
            return;
        }
        const items = await listItems(getCurrentPath());
        if (items.length != 0) {
            alert('You can only delete a empty folder!');
            return;
        }
        const deleteEvent = `${getPicoURL()}1556/sample_app/remove_folder?containerURL=${getCurrentPath()}`;
        const deleteResponse = await fetch(deleteEvent);
        if (!deleteResponse.ok) {
            throw new Error(`Delete folder failed: ${response.status}`);
        }
        fetchAndDisplayItems(lastURL.pop(), true);
    } catch (error) {
        console.error('Error deleting the folder:', error);
        alert('Failed to delete the folder. Please check the console log.');
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
        alert('Failed to delete the photo. Please check the console log.');
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
                copyPhoto(input.value); 
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

function grantAccessAction() {
    const access = document.getElementById('grantAccessToggle').textContent;
    if (access == 'Make Public') {
        setPublicAccess(getCurrentPath(), true);
    } else {
        setPublicAccess(getCurrentPath(), false);
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
            setAgentAccess(webID, true);
            console.log(`Access grant to ${webID} successfully!`);
            alert(`Access grant to ${webID} successfully!`);
            input.remove(); // Remove the input field
            grantAccessBtn.style.display = ''; // Show the button again
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
                setAgentAccess(webID, false);
                console.log(`Remove access from ${webID} successfully!`);
                alert(`Remove access from ${webID} successfully!`);
                container.remove(); 
                removeAccessBtn.style.display = 'inline-block'; 
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
        const path = json.directives[0].name;
        if (path == null) {
            alert("File not found! Please make sure the file name is spelled correctly and the file extension is correct.")
        } else {
            const fullPath = path + fileName;
            const dataURL = await getDataURL(fullPath);
            displayFullSizePhoto(dataURL, fullPath);
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
    const hasSubfolder = await checkSubfolder(newPath);
    if (!hasSubfolder) {
        alert('Subfolder(s) not found. Please create corresponding subfolder(s) first.');
        return;
    }
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
        alert('Failed to add the folder. Please check the console log.');
    });
}

async function checkSubfolder(url) {
    if (url.endsWith('/')) { // if it is a folder
        const lastIndex = url.lastIndexOf('/', url.lastIndexOf('/') - 1);
        url = url.substring(0, lastIndex + 1);
    } else { // otherwise photo
        url = url.substring(0, url.lastIndexOf('/') + 1);
    }
    const items = await listItems(url);
    if (items == null) {
        return false;
    }
    return true;
}

async function getDataURL(url) {
    try {
        const event = `${getPicoURL()}1556/sample_app/fetch_file?fileURL=${url}`;
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
            return getDataURL(getCurrentPath() + item).then(url => ({ itemName: item, url }));
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

function addPhoto(url, filename) {
	const storeLocation = getCurrentPath() + filename;
    const data = {
        originURL: url,
        destinationURL: storeLocation
    };
    fetch(`${getPicoURL()}1556/sample_app/store_file`, {
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
    })
    .catch(error => {
        console.error('Error adding photo:', error);
        alert('Failed to add the photo. Please check the console log.');
    });
}

function setPublicAccess(url, read) {
    const data = {
        resourceURL: url,
        read: read,
    };
    fetch(`${getPicoURL()}1556/sample_app/set_public_access`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Change photo public access failed: ${response.status}`);
        }
        // Check if it is a folder or photo. The button to grant/remove public access only available in the photo view.
        if (read == true) {
            if (!url.endsWith('/')) document.getElementById('grantAccessToggle').textContent = 'Make Private';
            console.log(`${getCurrentPath()} is now public.`);
        } else {
            if (!url.endsWith('/')) document.getElementById('grantAccessToggle').textContent = 'Make Public';
            console.log(`${getCurrentPath()} is now private.`)
        }
    })
    .catch(error => {
        console.error('Error changing photo public access:', error);
        alert('Failed to make the change the photo public access. Please check the console log.');
    });
}

async function getPublicAccess(url = getCurrentPath()) {
    const event = `${getPicoURL()}1556/sample_app/get_public_access?resourceURL=${url}`;
    const response = await fetch(event);
    if (!response.ok) {
        throw new Error(`Get photo access failed: ${response.status}`);
    }
    const json = await response.json();
    if (json.directives[0].name == 'true') {
        return 'Make Private';
    }
    return 'Make Public';
}

function setAgentAccess(webID, read) {
    const data = {
        resourceURL: getCurrentPath(),
        webID: webID,
        read: read
    };
    fetch(`${getPicoURL()}1556/sample_app/set_agent_access`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Set ${webID} access failed: ${response.status}`);
        }
    })
    .catch(error => {
        console.error('Error setting agent access:', error);
        alert(`Failed to set ${webID} access. Please check the console log.`);
    });
}

async function getAllAgentAccess(url = getCurrentPath()) {
    const event = `${getPicoURL()}1556/sample_app/get_all_agent_access?resourceURL=${url}`;
    const response = await fetch(event);
    if (!response.ok) {
        throw new Error(`Get all agents access failed: ${response.status}`);
    }
    const json = await response.json();
    return json.directives[0].name;
}

async function copyPhoto(destinationURL) {
    if (destinationURL.endsWith('/')) {
        alert('Please ensure you have the photo name at the end of the URL.');
        return;
    }
    const hasSubfolder = await checkSubfolder(destinationURL);
    if (!hasSubfolder) {
        alert('Subfolder(s) not found. Please create corresponding subfolder(s) first.');
        return;
    }
    const data = {
        originURL: getCurrentPath(),
        destinationURL: destinationURL
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
        console.log(`Copy photo to ${destinationURL} successfully!`);
        alert(`Copy photo to ${destinationURL} successfully!`);
    })
    .catch(error => {
        console.error('Error copying photo:', error);
        alert('Failed to copy the photo. Please check the console log.');
    });
}

async function setUpMyPhotosFolder() {
    const photosFolderURL = getCurrentPath() + 'myPhotos/';
    const listEvent = `${getPicoURL()}1556/sample_app/ls?fileURL=${photosFolderURL}`;
    try {
        const listResponse = await fetch(listEvent);
        if (!listResponse.ok) {
            throw new Error(`Failed to list items in myPhotos: ${response.status}`);
        }
        const json = await listResponse.json();
        if (json.directives[0].name == null) {
            const addFolderEvent = `${getPicoURL()}1556/sample_app/create_folder?containerURL=${photosFolderURL}`;
            fetch(addFolderEvent)
            .then(addFolderResponse => {
                if (!addFolderResponse.ok) {
                    throw new Error(`Failed to create folder: myPhotos: ${response.status}`);
                }
                setPublicAccess(photosFolderURL, true);
            })
        } 
        fetchAndDisplayItems(photosFolderURL);
    } catch (error) {
        console.error("Failed to setup photos' folder:", error);
        alert("Failed to setup photos' folder. Please check the console log.");
    }
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
        alert("Failed to fetch the storage URL. Please check the console log.");
    }
}

async function displayAllPhotos(isShared = false, folderURL = storageURL + 'myPhotos/') {

    const sharedPhotosButton = document.getElementById('listAllSharedPhotos');
    const allPhotosButton = document.getElementById('listAllPhotos');
    if (isShared) {
        sharedPhotosButton.classList.add('active');
        allPhotosButton.classList.remove('active');
    } else {
        allPhotosButton.classList.add('active');
        sharedPhotosButton.classList.remove('active');
    }

    try {
        const response = await fetch(`${getPicoURL()}1556/sample_app/ls?fileURL=${folderURL}`);
        if (!response.ok) {
            throw new Error(`Failed to display all photos: ${response.statusText}`);
        }
        const json = await response.json();
        const items = json.directives[0].name;

        // An array to gather all photos info
        let photos = [];

        // Get photos recursively
        await getPhotos(items, folderURL, photos, isShared);

        // Display photos using the array
        displayPhotos(photos);
    } catch (error) {
        console.error("Error displaying all photos:", error);
    }
}

async function getPhotos(items, currentPath, photos, isShared) {
    for (let item of items) {
        const itemType = getItemType(item);
        const fullPath = currentPath + item;

        if (itemType === 'folder') {
            // Fetch and process items in this folder
            const response = await fetch(`${getPicoURL()}1556/sample_app/ls?fileURL=${fullPath}`);
            if (response.ok) {
                const json = await response.json();
                const subItems = json.directives[0].name;
                await getPhotos(subItems, fullPath, photos, isShared); // Recursive call
            }
        } else if (itemType === 'photo') {
            // Add photo to the array
            if (isShared) {
                const access = await checkAccess(fullPath);
                if (access) {
                    const dataURL = await getDataURL(fullPath);
                    photos.push([item, dataURL, currentPath]);
                }
                continue; 
            } else {
                const dataURL = await getDataURL(fullPath);
                photos.push([item, dataURL, currentPath]);
            }
        }
    }
}

async function checkAccess(url) {
    const access = await getPublicAccess(url);
    const webIDs = await getAllAgentAccess(url);
    if (access == 'Public' || webIDs.length > 1) {
        return true;
    }
    return false;
}

function displayPhotos(photos) {
    const folderDiv = document.querySelector('.folder');
    folderDiv.innerHTML = ''; // Clear current contents
    for (let i = 0; i < photos.length; i++) {
        const src = photos[i][1];
        const altText = 'Photo';
        const onClickAttribute = `onclick="displayFullSizePhoto('${photos[i][1]}', '${photos[i][2] + photos[i][0]}')"`;

        const itemHTML = `<div class="item" ${onClickAttribute} style="display: inline-block; width: 300px; text-align: center; margin: 5px;">
                            <img src="${src}" alt="${altText}" style="width: 200px; height: 200px;">
                            <p>${photos[i][0].replace('/', '')}</p>
                        </div>`;

        folderDiv.innerHTML += itemHTML;
    }

    const controlPanel = document.querySelector('.control-panel');
    controlPanel.innerHTML = ''; // Clear existing buttons
    addButton('back', 'Back', backAction); // only add button is available when checking all photos
    displayCurrentPath('');
    // Keep track of the last folder which users were at
    if (getCurrentPath().endsWith('/')) {
        lastURL.push(getCurrentPath());
    }
}
