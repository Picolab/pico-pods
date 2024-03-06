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
    Session,
} from '@inrupt/solid-client-authn-node'
import axios from 'axios';

let url : string = 'http://localhost:3000/test/';
let webID : string = 'http://localhost:3000/test/profile/card#me';
let myClientID : string = 'testToke_1f5e0802-b16e-44d3-a0e5-78aecbfbbbda';
let myClientSecret : string = '6cff217d1c31af7a991e6356608af95f89b10c468da51f498314e4107e38ef3f86cca85260ccaed91c9f0e7936b6b47c9281ee45451d86332248b728db8041cc';
let session : Session = new Session();

function setUrl(newUrl : string) {
    url = newUrl;
}

async function login() {
    await session.login({
        clientId: myClientID,
        clientSecret: myClientSecret,
        oidcIssuer: 'http://localhost:3000'
    })
    .then(() => {
        console.log('\nLogin successful!\n');
    })
    .catch(error => {
        console.error('Error login:', error);
    });
    // await first();
    await second();
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
    await createContainerAt(`${url}folder/`);
    console.log('Container created successfully!\n');
}

async function removeFolder() {
    await deleteContainer(`${url}folder/`);
    console.log('Container deleted successfully!\n');
}

async function readFile() {
    getFile(
        `${url}README`,
        { fetch: fetch }
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

async function getFileSize(url: string): Promise<number> {
    try {
        const response = await axios.head(url);
        const contentLength = response.headers['content-length'];

        return contentLength ? parseInt(contentLength, 10) : -1;
    } catch (error) {
        console.error('An error occurred:', error);
        return -1;
    }
}

async function uploadFile(fileURL : string){
    const size = getFileSize(fileURL);
    if (await size / (1024*1024) > LIMIT) {
        throw "The file size exceed 500 MB";
    }
	
    let file : File = await createFileObject(fileURL);

    overwriteFile(
        url + file.name,
        file,
        { fetch: fetch }
    )
    .then(() => {
        console.log("File uploaded successfully!\n");
    })
    .catch(error => {
        console.error("Error uploading file:", error);
    });
}

async function removeFile() {
    await deleteFile( `${url}myFile.txt`, { fetch: fetch });
    console.log('File deleted successfully!\n');
}

async function first() {
    await ls()
    await readFile();
    await createFolder();
    await uploadFile("https://raw.githubusercontent.com/keylanjensen/pico_simpleTest/main/simple_typescript_test.krl");
}
async function second() {
    await ls();
    await removeFolder();
    await removeFile();
    await ls();
}

uploadFile("https://raw.githubusercontent.com/keylanjensen/pico_simpleTest/main/simple_typescript_test.krl");
