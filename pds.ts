import { krl, KrlCtx } from "krl-stdlib";
import { PicoEngineCore } from "../PicoEngineCore";
import {
  overwriteFile,
  saveFileInContainer,
  deleteFile
} from "@inrupt/solid-client";

let pod_URL:string | undefined = undefined;

function getPod() : string | undefined {
	return pod_URL;
}
function setPod(new_URL : string) {
	pod_URL = new_URL;
}

function isPodConnected() : boolean {
	if (!pod_URL) {
		return false;
	}
	return true;
}

async function createFile(fileURL : string) : File {
  let response = await fetch(fileURL);
  console.log("");
  console.log(response);
  console.log("");
  console.log(response.body);
  let data = response.body;
  let metadata = {
    type: response.headers.get('Content-Type');
  };
  let file = new File([data], "test", metadata);
  return file;
}

const pds: krl.Module = {
	connect_pod: krl.Action(["podURL"], function(podURL : string) {
		if (isPodConnected()) {
			throw "pds:connect_pod cannot connect an already-connected Pico.";
		}
		setPod(podURL);
		return pod_URL;
	}),
	
	disconnect_pod: krl.Action([], function() {
		if (!isPodConnected()) {
			throw "pds:disconnect_pod cannot disconnect an unconnected Pico.";
		}
		pod_URL = undefined;
		return "Disconnected successfully.";
	}),
	
	store: krl.Action(["fileURL"], function(fileURL : string) {
		if (!isPodConnected()) {
			throw "pds:store needs a Pod to be connected.";
		}
		let podLocation : string = "";
		
		let file : File = createFile(fileURL);
		
		overwriteFile(getPod() + podLocation, file, { contentType: file.type });
	}),
}

export default pds;