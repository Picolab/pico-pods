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
} from '@inrupt/solid-client';
import {
    Session,
} from '@inrupt/solid-client-authn-node'

let url : string = 'http://localhost:3000/test';
let webID : string = 'http://localhost:3000/test/profile/card#me';
let myClientID : string = 'testToke_1f5e0802-b16e-44d3-a0e5-78aecbfbbbda';
let myClientSecret : string = '6cff217d1c31af7a991e6356608af95f89b10c468da51f498314e4107e38ef3f86cca85260ccaed91c9f0e7936b6b47c9281ee45451d86332248b728db8041cc';
let session : Session = new Session();

function setUrl(newUrl : string) {
    url = newUrl;
}

async function login() {
    session.login({
        clientId: myClientID,
        clientSecret: myClientSecret,
        oidcIssuer: 'http://localhost:3000'
    })
    .then(() => {
        console.log('\nLogin successful!\n');
        readFile();
        // uploadFile();
    })
    .catch(error => {
        console.error('Error login:', error);
    });
}

async function readFile() {
    getFile(
        `${url}/README`,
        { fetch: fetch }
    )
    .then((file) => {
        console.log(`Fetched a ${getContentType(file)} file from ${getSourceUrl(file)}.`);
        console.log(`The file is ${isRawData(file) ? "not " : ""}a dataset.`);
        console.log(file);
    })
}

async function uploadFile(){
    overwriteFile(
        url + 'myFile.txt',
        new File(["This is a plain piece of text"], "myFile", { type: "text/plain" }),
        { fetch: fetch }
    )
    .then(() => {
        console.log("File uploaded successfully!");
    })
    .catch(error => {
        console.error("Error uploading file:", error);
    });
}

login();
