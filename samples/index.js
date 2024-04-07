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

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {

            const filename = file.name;
            // Create a FileReader to read the file
            const reader = new FileReader();
            
            reader.onloadend = function() {
                // reader.result contains the data URL
                const dataURL = reader.result;
                addPhoto(dataURL, filename)
            };
            
            // Read the file as a data URL
            reader.readAsDataURL(file);
        }
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

// Function to create HTML for an item
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
        addButton('addPhoto', 'Add photo', addPhotoAction2);
        addButton('addFolder', 'Add folder', addFolderAction);
        addButton('deleteFolder', 'Delete folder', deleteFolderAction);
    } else {
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

async function backAction() {
    if (lastURL.length == 0) {
        fetchAndDisplayItems();
    } else {
        fetchAndDisplayItems(lastURL.pop(), true);
    }
    toggleControlPanel(true);
    document.getElementById('listAllSharedPhotos').classList.remove('active');
    document.getElementById('listAllPhotos').classList.remove('active');
}

function addPhotoAction2() {
    const addPhotoBtn = document.getElementById('addPhoto');
    const backBtn = document.getElementById('back');
    addPhotoBtn.style.display = 'none'; // Hide the button

    const container = document.createElement('div');
    container.id = 'webIDSelectionContainer';
    container.style.display = 'inline-flex'; 
    container.style.alignItems = 'center';
    container.style.gap = '5px'; 
    container.style.marginRight = '5px';

    // Add from local button
    const addFromLocalButton = document.createElement('button');
    addFromLocalButton.textContent = 'From local';
    addFromLocalButton.onclick = function() {
        document.getElementById('fileInput').click();
    }

    // Add from internet button
    const addFromInternetButton = document.createElement('button');
    addFromInternetButton.textContent = 'From internet';
    addFromInternetButton.onclick = function() {
        addFromInternetButton.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'photoURLInput';
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
                    input.remove(); // Remove the input field
                    container.remove(); // Remove the two extra buttons
                    addPhotoBtn.style.display = ''; // Show the add photo button again
                })
            }
        };
    
        // Listen for the Enter key in the input field
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (input.value.trim() == '') {
                    input.remove(); // Remove the input field
                    container.remove(); // Remove the two extra buttons
                    addPhotoBtn.style.display = ''; // Show the add photo button again
                } else {
                    submitNewPhoto();
                }
            }
        });
    
        // Insert the input field into the DOM, before the add from local button
        addFromLocalButton.parentNode.insertBefore(input, addFromLocalButton);
        addFromLocalButton.style.marginTop = '9px';
        input.focus(); // Automatically focus the input field
    };

    container.appendChild(addFromInternetButton);
    container.appendChild(addFromLocalButton);

    backBtn.parentNode.insertBefore(container, backBtn.nextSibling);
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
                input.remove(); // Remove the input field
                addPhotoBtn.style.display = ''; // Show the button again
                fetchAndDisplayItems(getCurrentPath(), true); // Refresh the contents of the folder
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
    } else {
        removeAccess(getCurrentPath());
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
        console.log(webIDs.length);
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
        alert('Failed to add the photo. Please check the console log.');
    });
}

async function grantAccess(url) {
    const event = `${getPicoURL()}1556/sample_app/grant_access?resourceURL=${url}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Make photo public failed: ${response.status}`);
        }
        if (!url.endsWith('/')) document.getElementById('grantAccessToggle').textContent = 'Public';
        console.log(`${getCurrentPath()} is now public.`)
    })
    .catch(error => {
        console.error('Error making photo public:', error);
        alert('Failed to make the photo public. Please check the console log.');
    })
}

async function removeAccess(url) {
    const event = `${getPicoURL()}1556/sample_app/remove_access?resourceURL=${url}`;
    fetch(event)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Make photo private failed: ${response.status}`);
        }
        if (!url.endsWith('/')) document.getElementById('grantAccessToggle').textContent = 'Private';
        console.log(`${getCurrentPath()} is now private.`)
    })
    .catch(error => {
        console.error('Error making photo private:', error);
        alert('Failed to make the photo private. Please check the console log.');
    })
}

async function getAccess(url = getCurrentPath()) {
    const event = `${getPicoURL()}1556/sample_app/get_access?resourceURL=${url}`;
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
        alert(`Failed to grant access to ${webID}. Please check the console log.`);
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
        alert(`Failed to remove access from ${webID}. Please check the console log.`);
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
            const createFolderEvent = `${getPicoURL()}1556/sample_app/create_folder?containerURL=${photosFolderURL}`;
            fetch(createFolderEvent)
            .then(createFolderResponse => {
                if (!createFolderResponse.ok) {
                    throw new Error(`Failed to create folder: myPhotos: ${response.status}`);
                }
                grantAccess(photosFolderURL);
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

        // A map to gather all photos info
        let photoMap = new Map();

        // Get photos recursively
        await getPhotos(items, folderURL, photoMap, isShared);

        // Display photos using the map
        displayPhotos(photoMap);
    } catch (error) {
        console.error("Error displaying all photos:", error);
    }
}

async function getPhotos(items, currentPath, photoMap, isShared) {
    for (let item of items) {
        const itemType = getItemType(item);
        const fullPath = currentPath + item;

        if (itemType === 'folder') {
            // Fetch and process items in this folder
            const response = await fetch(`${getPicoURL()}1556/sample_app/ls?fileURL=${fullPath}`);
            if (response.ok) {
                const json = await response.json();
                const subItems = json.directives[0].name;
                await getPhotos(subItems, fullPath, photoMap, isShared); // Recursive call
            }
        } else if (itemType === 'photo') {
            // Add photo to the map
            if (isShared) {
                const access = await checkAccess(fullPath);
                if (access) {
                    const dataURL = await getDataURL(fullPath);
                    photoMap.set(item, { dataURL, storeLocation: currentPath });
                }
                continue; 
            } else {
                const dataURL = await getDataURL(fullPath);
                photoMap.set(item, { dataURL, storeLocation: currentPath });
            }

        }
    }
}

async function checkAccess(url) {
    const access = await getAccess(url);
    const webIDs = await getAllAgentAccess(url);
    if (access == 'Public' || webIDs.length > 1) {
        return true;
    }
    return false;
}

function displayPhotos(photoMap) {
    const folderDiv = document.querySelector('.folder');
    folderDiv.innerHTML = ''; // Clear current contents

    for (let [photoName, info] of photoMap) {
        const src = info.dataURL;
        const altText = 'Photo';
        const onClickAttribute = `onclick="displayFullSizePhoto('${info.dataURL}', '${info.storeLocation + photoName}')"`;

        const itemHTML = `<div class="item" ${onClickAttribute} style="display: inline-block; width: 300px; text-align: center; margin: 5px;">
                            <img src="${src}" alt="${altText}" style="width: 200px; height: 200px;">
                            <p>${photoName.replace('/', '')}</p>
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
