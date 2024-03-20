import { krl, KrlCtx } from "krl-stdlib";
import {
    overwriteFile,
    getSolidDatasetWithAcl,
    getAgentAccess,
    getAgentAccessAll,
    hasResourceAcl,
    hasFallbackAcl,
    hasAccessibleAcl,
    createAcl,
    createAclFromFallbackAcl,
    getResourceAcl,
    getSolidDataset,
    getContainedResourceUrlAll,
    setAgentResourceAccess,
    saveAclFor,
    getFile,
    isRawData,
    getContentType, 
    getSourceUrl,
    createContainerAt,
    deleteContainer,
    deleteFile,
    universalAccess,
	saveFileInContainer,
} from '@inrupt/solid-client';
import {
    createDpopHeader, 
    generateDpopKeyPair,
    buildAuthenticatedFetch,
} from '@inrupt/solid-client-authn-core';
import * as fs from "fs";

let path = require('path');


const STORAGE_ENT_NAME : string = "__pods_storageURL";
const MODULE_NAME : string = "pods";
const MAX_FILE_SIZE : number = 500;
const CLIENT_ID_ENT_NAME : string = "__pods_clientID";
const CLIENT_SECRET_ENT_NAME : string = "__pods_clientSecret";
const TOKEN_URL_ENT_NAME : string = "__pods_tokenURL";
let authFetch : (typeof fetch);
const ACCESS_TOKEN_ENT_NAME : string = "__pods_accessToken";
const ACCESS_TOKEN_RECEIVE_TIME_ENT_NAME : string = "__pods_accessTokenReceiveTime"
const ACCESS_TOKEN_VALID_DURATION_ENT_NAME : string = "__pods_accessTokenValidDuration"

/**
 * Standardizes URLs by checking for slashes at the start and end of URLs, 
 * adding slashes to the end if not present and removing slashes at the start if present.
 * @param inputURL The URL to standardize.
 * @returns a standardized URL.
 */
function standardizeURL(inputURL : string | undefined) : string | undefined {
    if (typeof inputURL === "undefined") {
        return inputURL;
    }
	inputURL = <string>inputURL;
	let outputURL : string = inputURL;

	if (inputURL.startsWith("/") || inputURL.startsWith("\\")) {
		//Slices off the first letter of the string
		outputURL = outputURL.slice(1);
	};
	if (!(inputURL.endsWith("/") || inputURL.endsWith("\\"))) {
		outputURL = outputURL + "/";
	}

	return outputURL;
};
const getStorage = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(STORAGE_ENT_NAME);
});
const setStorage = krl.Action(["new_URL"], async function(new_URL : string | undefined) {
	new_URL = standardizeURL(new_URL);
	this.rsCtx.putEnt(STORAGE_ENT_NAME, new_URL);
});
const getClientID = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(CLIENT_ID_ENT_NAME);
});
const setClientID = krl.Action(["new_ID"], async function(new_ID : string | undefined) {
	//new_ID = standardizeURL(new_ID);
	this.rsCtx.putEnt(CLIENT_ID_ENT_NAME, new_ID);
});
const getClientSecret = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(CLIENT_SECRET_ENT_NAME);
});
const setClientSecret = krl.Action(["new_Secret"], async function(new_Secret : string | undefined) {
	this.rsCtx.putEnt(CLIENT_SECRET_ENT_NAME, new_Secret);
});
const getRefreshTokenURL = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(TOKEN_URL_ENT_NAME);
});
const setRefreshTokenURL = krl.Action(["new_URL"], async function(new_URL : string | undefined) {
	this.rsCtx.putEnt(TOKEN_URL_ENT_NAME, new_URL);
});
const getAccessToken = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(ACCESS_TOKEN_ENT_NAME);
});
const setAccessToken = krl.Action(["new_Token"], async function(new_Token : string | undefined) {
	this.rsCtx.putEnt(ACCESS_TOKEN_ENT_NAME, new_Token);
});
const getAccessTokenReceiveTime = krl.Function([], async function() : Promise<number | undefined> {
	return this.rsCtx.getEnt(ACCESS_TOKEN_RECEIVE_TIME_ENT_NAME);
});
const setAccessTokenReceiveTime = krl.Action(["new_obj"], async function(new_obj : number | undefined) {
	this.rsCtx.putEnt(ACCESS_TOKEN_RECEIVE_TIME_ENT_NAME, new_obj);
});
const getAccessTokenValidDuration = krl.Function([], async function() : Promise<number | undefined> {
	return this.rsCtx.getEnt(ACCESS_TOKEN_VALID_DURATION_ENT_NAME);
});
const setAccessTokenValidDuration = krl.Action(["new_obj"], async function(new_obj : number | undefined) {
	this.rsCtx.putEnt(ACCESS_TOKEN_VALID_DURATION_ENT_NAME, new_obj);
});

function getCurrentTimeInSeconds() : number {
	return new Date().getTime() / 1000;
}
const hasValidAccessToken = krl.Function([], async function() {
	let accessToken = await getAccessToken(this, []);
	let receiveTime = await getAccessTokenReceiveTime(this, []);
	let validDuration = await getAccessTokenValidDuration(this, []);
	if (!accessToken) {
		return false;
	}
	if (accessToken && receiveTime && validDuration) {
		const currentTime = getCurrentTimeInSeconds();
		if (currentTime-receiveTime > validDuration) {
			this.log.debug("Current Time: " + String(currentTime) + ", " +
							"Receive Time: " + String(receiveTime));
			this.log.debug("Valid Duration: " + String(validDuration) + ", " +
							"Current Duration: " + String(currentTime - receiveTime))
			return false;
		}
	}
	return true;
});
const isStorageConnected = krl.Function([], async function() : Promise<boolean> {
	if (!await getStorage(this, [])) {
		return false;
	}
	return true;
});

async function createFileObject(fileURL : string) : Promise<File> {
	let data : Blob;
	let data_type : string | null;
	let filename : string | undefined;
	if (fileURL.startsWith("file://")) {
		fileURL = fileURL.slice(7);
		let response = fs.readFileSync(fileURL);
		data_type = <string | null>fileURL.split('.').pop();
		data = new Blob([response]);
	} else {
    	let response = await fetch(fileURL);
		//Get file data type
		data_type = await response.headers.get('content-type');
		filename = fileURL.split('/').pop()
		data = await response.blob();
	}
    
    let metadata = {
      type: <string | undefined>data_type,
    };

    //Get file name
    

    let file = new File([data], <string>filename, metadata);
    return file;
}

//Used to check the size of a file without loading it into memory.
/*async function getFileSize(url: string): Promise<number> {
    try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const response = await axios.head(url);
            const contentLength = response.headers['content-length'];
    
            return contentLength ? parseInt(contentLength, 10) : -1;
        } else {
            const stats = fs.statSync(url);
            return stats.size;
        }
    } catch (error) {
        console.error('An error occurred:', error);
        return -1;
    }
}*/

const authenticate = krl.Action([], async function authenticate() {
    // A key pair is needed for encryption.
    // This function from `solid-client-authn` generates such a pair for you.
    const dpopKey = await generateDpopKeyPair();

    // These are the ID and secret generated in the previous step.
    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(await getClientID(this, []))}:${encodeURIComponent(await getClientSecret(this, []))}`;
    // This URL can be found by looking at the "token_endpoint" field at
    // http://localhost:3000/.well-known/openid-configuration
    // if your server is hosted at http://localhost:3000/.
    const tokenUrl = await getRefreshTokenURL(this, []);
    const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
        // The header needs to be in base64 encoding.
        authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
        dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
    },
    body: 'grant_type=client_credentials&scope=webid',
    });

    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
	let response_json = await response.json();
    const { access_token: accessToken } = response_json;
	const { expires_in : expiresIn } = response_json;
	const token_now = getCurrentTimeInSeconds();
	setAccessToken(this, [accessToken]);
	setAccessTokenReceiveTime(this, [token_now]);
	setAccessTokenValidDuration(this, [expiresIn]);
	this.log.debug("Access Token expires in " + String(expiresIn) + " seconds.");

    authFetch = await buildAuthenticatedFetch(accessToken, { dpopKey });
});



const connect_storage = krl.Action(["storageURL", "clientID", "clientSecret", "tokenURL"], 
									async function(
										storageURL : string,
										clientID : string, 
										clientSecret : string, 
										tokenURL : string) {
	if (await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":connect_storage cannot connect an already-connected Pico.";
	}
	await setStorage(this, [storageURL]);
	await setClientID(this, [clientID]);
	await setClientSecret(this, [clientSecret]);
	await setRefreshTokenURL(this, [tokenURL]);

	await authenticate(this, []);
	if (!await hasValidAccessToken(this, [])) {
		throw MODULE_NAME + ":authenticate could not authenticate.";
	}

	return getStorage(this, []);
});
const disconnect_storage = krl.Action([], async function() {
	if (!await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":disconnect_storage cannot disconnect an unconnected Pico.";
	}
	await setStorage(this, [undefined]);
	await setClientID(this, [undefined]);
	await setClientSecret(this, [undefined]);
	await setRefreshTokenURL(this, [undefined]);
	await setAccessToken(this, [undefined]);
	await setAccessTokenReceiveTime(this, [undefined]);
	await setAccessTokenValidDuration(this, [undefined]);
	return "Disconnected successfully.";
});

function checkFileURL(fileURL : string, fileName : string) : string {
	let newFileURL = standardizeURL(fileURL);
	fileURL = <string>newFileURL;
	if (!fileURL.endsWith(fileName)) {
		fileURL = fileURL + fileName;
	}
	return fileURL;
}
const store = krl.Action(["fetchFileURL", "storeLocation"], async function(fetchFileURL : string, storeLocation : string) {
	if (!await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":store needs a Pod to be connected.";
	}
	
	//Used to check file size prior to loading a file into memory
	//Considered unnecessary
	/*const size = getFileSize(fileURL);
    if (await size / (1024*1024) > LIMIT) {
        throw "The file size exceed 500 MB";
    }*/
	
    let file : File = await createFileObject(fetchFileURL);
	//storeLocation = checkFileURL(storeLocation, file.name);
	this.log.debug("Store Location: " + storeLocation);

    saveFileInContainer(
        storeLocation,
        file,
        { fetch: authFetch }
    )
    .then(() => {
        this.log.debug("File uploaded successfully!\n");
    })
    .catch(error => {
        this.log.error("Error uploading file: ", error.message);
    });
});
const overwrite = krl.Action(["fetchFileURL", "storeLocation"], async function(fetchFileURL : string, storeLocation : string) {
	if (!await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":store needs a Pod to be connected.";
	}
	
    let file : File = await createFileObject(fetchFileURL);
	storeLocation = checkFileURL(storeLocation, file.name);
	this.log.debug("Store Location: " + storeLocation);

    overwriteFile(
        storeLocation,
        file,
        { fetch: authFetch }
    )
    .then(() => {
        this.log.debug("File uploaded successfully!\n");
    })
    .catch(error => {
        this.log.error("Error uploading file: ", error.message);
    });
});
const removeFile = krl.Action(["fileURL"], async function(fileURL : string) {
    await deleteFile(fileURL, { fetch: authFetch });
    this.log.debug('File deleted successfully!\n');
});

const copyFile = krl.Action(["fileURL", "targetURL"], 
							 async function(fileURL : string, targetURL : string) {
    // Get the file in Pod
    getFile(
        fileURL,               
        { fetch: authFetch }       
    )
    .then((file) => {
        this.log.debug( `Fetched a ${getContentType(file)} file from ${getSourceUrl(file)}.`);
        this.log.debug(`The file is ${isRawData(file) ? "not " : ""}a dataset.`);

        // get the file name
        let filename : string | undefined = fileURL.split('/').pop()

        overwriteFile(
            targetURL + filename,
            file,
            { fetch: authFetch }
        )
        .then(() => {
            this.log.debug(`File copied to ${targetURL} successfully!\n`);
        })
        .catch(error => {
            this.log.error("Error copying file:", error);
        });
    })
    .catch(error => {
        this.log.error("Error fetching file:", error);
    })
});

const pods_fetch = krl.Function(["fileURL"], async function(fileURL : string) {
    let file = await getFile(
        fileURL,
        { fetch: authFetch }
    )
    this.log.debug(`Fetched a ${getContentType(file)} file from ${getSourceUrl(file)}.`);
	this.log.debug(`The file is ${isRawData(file) ? "not " : ""}a dataset.`);
	this.log.debug(file + '\n');
	return file;
});

const listItems = krl.Function(["fileURL"], async function(fileURL : string) {
    let baseURL = getStorage(this, []);
    let newURL = baseURL + fileURL;

    if (!newURL.endsWith('/')) {
    	throw MODULE_NAME + ": listItems can only be called on containers. Ensure that containers have their trailing slash."
    }
    
    let dataset;
    
    try {
        dataset = await getSolidDataset(newURL, { fetch: authFetch });
        let containedResources = getContainedResourceUrlAll(dataset)
        
        let directory : string[] = [];
        for (let i = 0; i < containedResources.length; i++) {
            let resource = containedResources[i]
            let item = resource.substring(newURL.length, resource.length);
            directory.push(item);
        }
    
		for (let i = 0; i < directory.length; i++) {
			this.log.debug(directory[i]);
		}
        return directory;
    } catch (e) {
        this.log.error((e as Error).message);
    }
});

const findFile = krl.Function(["fileName"], async function (fileName : string) {
    // first item: get the root directory
    let directory = await listItems(this, [""]);
    let queue : string[][] = [];
    queue.push(directory);
    let urls : string[] = []
    urls.push("");

    // using a breadth-first search, only on directories
    // each directory, when listed, returns an array (or undefined)
    while (queue.length > 0) {
        let dir = queue.shift();
        let url = urls.shift();

      // check if directory has the file
      if (dir?.includes(fileName)) {
          console.log(url);
          return url;
      }

      console.log("made it here");
      // go through each subdirectory and enqueue all of them
      if (dir != undefined) {
          for (let i = 0; i < dir?.length; i++) {
                let subdir = dir[i];
                if (subdir.endsWith('/')) {
                    let nextItem = await listItems(this, [url + subdir]);
                    queue.push(nextItem);
                    urls.push(url + subdir)
                }
            }
        }
    }

    // not found
    console.log("null");
    return null;
});

const createFolder = krl.Action(["containerURL"], async function(containerURL : string) {
    await createContainerAt(containerURL, { fetch: authFetch});
    this.log.debug('Container created successfully!\n');
});
const removeFolder = krl.Action(["containerURL"], async function(containerURL : string) {
    await deleteContainer(containerURL, { fetch: authFetch});
    this.log.debug('Container deleted successfully!\n');
});

const grantAgentAccess = krl.Action(["resourceURL", "webID"], async function(resourceURL : string, webID : string) {
    universalAccess.setAgentAccess(
        resourceURL,       // resource  
        webID,   // agent
        // sample: {"read":false,"write":false,"append":false,"controlRead":false,"controlWrite":false}
        { read: true, write: false },
        { fetch: authFetch }                      // fetch function from authenticated session
      ).then((agentAccess) => {
        this.log.debug(`For resource::: ${resourceURL}`);
        if (agentAccess === null) {
            this.log.debug(`Could not load ${webID}'s access details.`);
        } else {
            this.log.debug(`${webID}'s Access:: ${JSON.stringify(agentAccess)}`);
        }
      });
});

const removeAgentAccess = krl.Action(["resourceURL", "webID"], async function(resourceURL : string, webID : string) {
    universalAccess.setAgentAccess(
        resourceURL,       // resource  
        webID,   // agent
        { read: false, write: false },
        { fetch: authFetch }                      // fetch function from authenticated session
      ).then((agentAccess) => {
        this.log.debug(`For resource::: ${resourceURL}`);
        if (agentAccess === null) {
            this.log.debug(`Could not load ${webID}'s access details.`);
        } else {
            this.log.debug(`${webID}'s Access:: ${JSON.stringify(agentAccess)}`);
        }
      });
});

const grantAccess = krl.Action(["resourceURL"], async function(resourceUrl: string) {
    universalAccess.setPublicAccess(
        resourceUrl,  // Resource
        { read: true, write: false },    // Access object
        { fetch: authFetch }                 // fetch function from authenticated session
      ).then((newAccess) => {
        if (newAccess === null) {
          this.log.debug("Could not load access details for this Resource.");
        } else {
          this.log.debug("Returned Public Access:: ", JSON.stringify(newAccess));
        }
      });
});
const removeAccess = krl.Action(["resourceURL"], async function removeAccess(resourceUrl: string) {
    universalAccess.setPublicAccess(
        resourceUrl,  // Resource
        { read: false, write: false },    // Access object
        { fetch: authFetch }                 // fetch function from authenticated session
      ).then((newAccess) => {
        if (newAccess === null) {
          this.log.debug("Could not load access details for this Resource.");
        } else {
          this.log.debug("Returned Public Access:: ", JSON.stringify(newAccess));
        }
      });
});





const pods: krl.Module = {
	connectStorage: connect_storage,
	disconnectStorage: disconnect_storage,
	store: store,
	overwrite: overwrite,
	removeFile: removeFile,
	copyFile: copyFile,
	fetch: pods_fetch,
	listItems: listItems,
    findFile: findFile,
	createFolder: createFolder,
	removeFolder: removeFolder,

	// getStorage : getStorage, //Private KRL helper function, does not need to be exported
	setStorage : setStorage, //Private KRL helper function, does not need to be exported
	// isPodConnected : isPodConnected, //Private KRL helper function, does not need to be exported
	//The following are helper functions that are exported for testing
	setClientID: setClientID, //Private KRL helper function, does not need to be exported
	setClientSecret: setClientSecret, //Private KRL helper function, does not need to be exported
	setRefreshTokenURL: setRefreshTokenURL, //Private KRL helper function, does not need to be exported

	getAccessTokenValidDuration : getAccessTokenValidDuration, //Mostly private KRL helper function, but exported since developer may want to know about the token
	getAccessTokenReceiveTime : getAccessTokenReceiveTime, //Mostly private KRL helper function, but exported since developer may want to know about the token

	authenticate: authenticate,
	grantAgentAccess: grantAgentAccess,
	removeAgentAccess: removeAgentAccess,
	grantAccess: grantAccess,
	removeAccess: removeAccess,
}

export default pods;
