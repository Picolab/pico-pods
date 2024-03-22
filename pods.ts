import { krl, KrlCtx } from "krl-stdlib";
import {
  overwriteFile,
  saveFileInContainer,
  deleteFile,
} from "@inrupt/solid-client";



const POD_ENT_NAME : string = "podURL";
const MODULE_NAME : string = "pods";
const MAX_FILE_SIZE : number = 50;

const getPod = krl.Function([], async function() : Promise<string | undefined> {
	return this.rsCtx.getEnt(POD_ENT_NAME);
});
const setPod = krl.Action(["new_URL"], async function(new_URL : string | undefined) {
	this.rsCtx.putEnt(POD_ENT_NAME, new_URL);
});

const isPodConnected = krl.Function([], async function() : Promise<boolean> {
	if (!await getPod(this, [])) {
		return false;
	}
	return true;
});

async function createFile(fileURL : string) : Promise<File> {
  let response = fetch(fileURL);
  let data = await (await response).blob()
  //this.log(data);
  let data_type : string | null = await response.then(resp => resp.headers.get('content-type'));
  let metadata = {
    type: <string | undefined>data_type,
  };
  let content_disposition : string | null = await response.then(resp => resp.headers.get('content-disposition'));
  if (typeof content_disposition === null) {
	content_disposition = "";
  }
  let filename : string = (<string>content_disposition).split('filename=')[1].split(';')[0];
  let file = new File([data], filename, metadata);
  return file;
}

const connect_pod = krl.Action(["podURL"], async function(podURL : string) {
	if (await isPodConnected(this, [])) {
		throw MODULE_NAME + ":connect_pod cannot connect an already-connected Pico.";
	}
	await setPod(this, [podURL]);
	return getPod(this, []);
});
const disconnect_pod = krl.Action([], async function() {
	if (!await isPodConnected(this, [])) {
		throw MODULE_NAME + ":disconnect_pod cannot disconnect an unconnected Pico.";
	}
	await setPod(this, [undefined]);
	return "Disconnected successfully.";
});
const store = krl.Action(["fileURL"], async function(fileURL : string) {
	if (!await isPodConnected(this, [])) {
		throw MODULE_NAME + ":store needs a Pod to be connected.";
	}
	let podLocation : string = "/test/container/";
	
	//let file : File = await createFile(fileURL);
	//this.log.debug("File Type: " + file.type);
	//this.log.debug("File Name: " + file.name);

	//let fullPodLocation : string = await getPod(this, []) + podLocation + file.name;
	
	//overwriteFile(fullPodLocation, file, { fetch: fetch });
	/**const savedFile = await saveFileInContainer(
		await getPod(this, []) + podLocation + "myFile.txt",
		new File(["This is a plain piece of text"], "suggestedFileName.txt", { type: "text/plain" }),
		{ fetch: fetch }
	);*/
	const savedFile = await overwriteFile(
		await getPod(this, []) + podLocation + "myFile.txt",
		new File(["This is a plain piece of text"], "myFile", { type: "text/plain" }),
		{ fetch: fetch }
	);
});

const pods: krl.Module = {
	connect_pod: connect_pod,
	disconnect_pod: disconnect_pod,
	store: store,

	// getPod : getPod, //Private KRL helper function, does not need to be exported
	// setPod : setPod, //Private KRL helper function, does not need to be exported
	// isPodConnected : isPodConnected //Private KRL helper function, does not need to be exported
}

export default pods;