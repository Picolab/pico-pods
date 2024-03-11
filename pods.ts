import { krl, KrlCtx } from "krl-stdlib";
import {
	overwriteFile,
	saveFileInContainer,
    getSolidDatasetWithAcl,
    getAgentAccess,
    getAgentAccessAll,
    hasResourceAcl,
    hasFallbackAcl,
    hasAccessibleAcl,
    createAcl,
    createAclFromFallbackAcl,
    getResourceAcl,
    setAgentResourceAccess,
    saveAclFor,
    getFile,
    isRawData,
    getContentType, 
    getSourceUrl,
    createContainerAt,
    deleteContainer,
    deleteFile,
} from "@inrupt/solid-client";
import {
    createDpopHeader, 
    generateDpopKeyPair,
    buildAuthenticatedFetch,
} from '@inrupt/solid-client-authn-core';



const STORAGE_ENT_NAME : string = "__pods_storageURL";
const MODULE_NAME : string = "pods";
const MAX_FILE_SIZE : number = 500;
const WEB_ID_ENT_NAME : string = "__pods_webID";
const CLIENT_ID_ENT_NAME : string = "__pods_clientID";
const CLIENT_SECRET_ENT_NAME : string = "__pods_clientSecret";
const TOKEN_URL_ENT_NAME : string = "__pods_tokenURL";
let authFetch : (typeof fetch);

const getStorage = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(STORAGE_ENT_NAME);
});
const setStorage = krl.Action(["new_URL"], async function(new_URL : string | undefined) {
	this.rsCtx.putEnt(STORAGE_ENT_NAME, new_URL);
});
const getClientID = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(CLIENT_ID_ENT_NAME);
});
const setClientID = krl.Action(["new_ID"], async function(new_ID : string | undefined) {
	this.rsCtx.putEnt(CLIENT_ID_ENT_NAME, new_ID);
});
const getClientSecret = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(CLIENT_SECRET_ENT_NAME);
});
const setClientSecret = krl.Action(["new_Secret"], async function(new_Secret : string | undefined) {
	this.rsCtx.putEnt(CLIENT_SECRET_ENT_NAME, new_Secret);
});
const getWebID = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(WEB_ID_ENT_NAME);
});
const setWebID = krl.Action(["new_ID"], async function(new_ID : string | undefined) {
	this.rsCtx.putEnt(WEB_ID_ENT_NAME, new_ID);
});
const getTokenURL = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(TOKEN_URL_ENT_NAME);
});
const setTokenURL = krl.Action(["new_URL"], async function(new_URL : string | undefined) {
	this.rsCtx.putEnt(TOKEN_URL_ENT_NAME, new_URL);
});


const isStorageConnected = krl.Function([], async function() : Promise<boolean> {
	if (!await getStorage(this, [])) {
		return false;
	}
	return true;
});

async function createFileObject(fileURL : string) : Promise<File> {
    let response = await fetch(fileURL);
    let data = await response.blob()
    
	//Get file data type
    let data_type : string | null = await response.headers.get('content-type');
    let metadata = {
      type: <string | undefined>data_type,
    };

    //Get file name
    let filename : string | undefined = fileURL.split('/').pop()

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
    const tokenUrl = await getTokenURL(this, []);
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
    const { access_token: accessToken } = await response.json();

    authFetch = await buildAuthenticatedFetch(accessToken, { dpopKey });
});



const connect_storage = krl.Action(["storageURL", "webID", "clientID", "clientSecret", "tokenURL"], 
									async function(
										storageURL : string, 
										webID : string, 
										clientID : string, 
										clientSecret : string, 
										tokenURL : string) {
	if (await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":connect_storage cannot connect an already-connected Pico.";
	}
	await setStorage(this, [storageURL]);
	await setWebID(this, [webID]);
	await setClientID(this, [clientID]);
	await setClientSecret(this, [clientSecret]);
	await setTokenURL(this, [tokenURL]);
	return getStorage(this, []);
});
const disconnect_storage = krl.Action([], async function() {
	if (!await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":disconnect_storage cannot disconnect an unconnected Pico.";
	}
	await setStorage(this, [undefined]);
	await setWebID(this, [undefined]);
	await setClientID(this, [undefined]);
	await setClientSecret(this, [undefined]);
	await setTokenURL(this, [undefined]);
	return "Disconnected successfully.";
});

const store = krl.Action(["fileURL"], async function(fileURL : string) {
	if (!await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":store needs a Pod to be connected.";
	}
	let storageRelativeLocation : string = "/test/container/";
	
	//Used to check file size prior to loading a file into memory
	//Considered unnecessary
	/*const size = getFileSize(fileURL);
    if (await size / (1024*1024) > LIMIT) {
        throw "The file size exceed 500 MB";
    }*/
	
    let file : File = await createFileObject(fileURL);

    saveFileInContainer(
        await getStorage(this, []) + storageRelativeLocation + file.name,
        file,
        { fetch: authFetch }
    )
    .then(() => {
        this.log.debug("File uploaded successfully!\n");
    })
    .catch(error => {
        this.log.error("Error uploading file:", error);
    });
});
const overwrite = krl.Action(["fileURL"], async function(fileURL : string) {
	if (!await isStorageConnected(this, [])) {
		throw MODULE_NAME + ":store needs a Pod to be connected.";
	}
	let storageRelativeLocation : string = "/test/container/";
	
	//Used to check file size prior to loading a file into memory
	//Considered unnecessary
	/*const size = getFileSize(fileURL);
    if (await size / (1024*1024) > LIMIT) {
        throw "The file size exceed 500 MB";
    }*/
	
    let file : File = await createFileObject(fileURL);

    overwriteFile(
        await getStorage(this, []) + storageRelativeLocation + file.name,
        file,
        { fetch: authFetch }
    )
    .then(() => {
        this.log.debug("File uploaded successfully!\n");
    })
    .catch(error => {
        this.log.error("Error uploading file:", error);
    });
});





const pods: krl.Module = {
	connect_pod: connect_storage,
	disconnect_pod: disconnect_storage,
	store: store,
	overwrite: overwrite,

	// getStorage : getStorage, //Private KRL helper function, does not need to be exported
	// setStorage : setStorage, //Private KRL helper function, does not need to be exported
	// isPodConnected : isPodConnected //Private KRL helper function, does not need to be exported
	//The following are helper functions that are exported for testing
	setClientID: setClientID,
	setClientSecret: setClientSecret,
	setWebID: setWebID,
	setTokenURL : setTokenURL,

	authenticate : authenticate,
}

export default pods;