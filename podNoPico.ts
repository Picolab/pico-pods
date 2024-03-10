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
    setAgentResourceAccess,
    saveAclFor,
    getFile,
    isRawData,
    getContentType, 
    getSourceUrl,
    createContainerAt,
    deleteContainer,
    deleteFile,
} from '@inrupt/solid-client';
import {
    createDpopHeader, 
    generateDpopKeyPair,
    buildAuthenticatedFetch,
} from '@inrupt/solid-client-authn-core';

let url : string = 'http://localhost:3000/test/';
let webID : string = 'http://localhost:3000/test/profile/card#me';
let myClientID : string = 'testToke_1f5e0802-b16e-44d3-a0e5-78aecbfbbbda';
let myClientSecret : string = '6cff217d1c31af7a991e6356608af95f89b10c468da51f498314e4107e38ef3f86cca85260ccaed91c9f0e7936b6b47c9281ee45451d86332248b728db8041cc';
let authFetch;

function setUrl(newUrl : string) {
    url = newUrl;
}

async function ls() {
    let data = await fetch(url)
        .then(function(response) {
            return response.text();
        })
        .then(function(data) {
            return data;
        });

    data = data.substring(data.indexOf("contains"));
    data = data.substring(9, data.indexOf("\n"));
    let directory = data.split(", ");

    for (let i = 0; i < directory.length; i++) {
        const element = directory[i];
        let newEl = element.substring(1, element.indexOf(">"));
        directory[i] = newEl;
    }
    console.log(directory);
    console.log();
    return directory;
}

async function createFolder(){
    await createContainerAt(`${url}folder/`, { fetch: authFetch});
    console.log('Container created successfully!\n');
}

async function removeFolder() {
    await deleteContainer(`${url}folder/`, { fetch: authFetch});
    console.log('Container deleted successfully!\n');
}

async function readFile() {
    getFile(
        `${url}README`,
        { fetch: authFetch }
    )
    .then((file) => {
        console.log(`Fetched a ${getContentType(file)} file from ${getSourceUrl(file)}.`);
        console.log(`The file is ${isRawData(file) ? "not " : ""}a dataset.`);
        console.log(file + '\n');
    })
}

async function createFileObject(fileURL : string) : Promise<File> {
    let response = await fetch(fileURL);
    let data = await response.blob()
    console.log(data);
    let data_type : string | null = await response.headers.get('content-type');
    let metadata = {
      type: <string | undefined>data_type,
    };

    //Get file name
    let filename : string | undefined = fileURL.split('/').pop()

    let file = new File([data], <string>filename, metadata);
    return file;
}

async function uploadFile(fileURL : string){
    let file : File = await createFileObject(fileURL);

    overwriteFile(
        url + file.name,
        file,
        { fetch: authFetch }
    )
    .then(() => {
        console.log("File uploaded successfully!\n");
    })
    .catch(error => {
        console.error("Error uploading file:", error);
    });
}

async function removeFile() {
    await deleteFile( `${url}myFile.txt`, { fetch: authFetch });
    console.log('File deleted successfully!\n');
}

async function authenticate() {
    // A key pair is needed for encryption.
    // This function from `solid-client-authn` generates such a pair for you.
    const dpopKey = await generateDpopKeyPair();

    // These are the ID and secret generated in the previous step.
    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(myClientID)}:${encodeURIComponent(myClientSecret)}`;
    // This URL can be found by looking at the "token_endpoint" field at
    // http://localhost:3000/.well-known/openid-configuration
    // if your server is hosted at http://localhost:3000/.
    const tokenUrl = 'http://localhost:3000/.oidc/token';
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
}

async function Login() {
    // All these examples assume the server is running at `http://localhost:3000/`.

    // First we request the account API controls to find out where we can log in
    const indexResponse = await fetch('http://localhost:3000/.account/');
    const { controls } = await indexResponse.json();

    // And then we log in to the account API
    const response = await fetch(controls.password.login, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'example@email.com', password: 'password' }),
    });
    // This authorization value will be used to authenticate in the next step
    const { authorization } = await response.json();
    await loginHelper(authorization);
}

async function loginHelper(authorization: string) {
    // Now that we are logged in, we need to request the updated controls from the server.
    // These will now have more values than in the previous example.
    const indexResponse = await fetch('http://localhost:3000/.account/', { 
        headers: { authorization: `CSS-Account-Token ${authorization}` }
    });
    const { controls } = await indexResponse.json();
    
    // Here we request the server to generate a token on our account
    const response = await fetch(controls.account.clientCredentials, {
        method: 'POST',
        headers: { authorization: `CSS-Account-Token ${authorization}`, 'content-type': 'application/json' },
        // The name field will be used when generating the ID of your token.
        // The WebID field determines which WebID you will identify as when using the token.
        // Only WebIDs linked to your account can be used.
        body: JSON.stringify({ name: 'my-token', webId: webID }),
    });
    // These are the identifier and secret of your token.
    // Store the secret somewhere safe as there is no way to request it again from the server!
    // The `resource` value can be used to delete the token at a later point in time.
    const { id, secret, resource } = await response.json();
    myClientID = id;
    myClientSecret = secret;
    await authenticate();
}
