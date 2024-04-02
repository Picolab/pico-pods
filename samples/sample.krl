ruleset sample_app {
    meta {

    }
    global {
        
    }

    rule attach_storage {
        select when sample_app attach_storage
            storage_url re#(.+)#
            client_id re#(.+)#
            client_secret re#(.+)#
            token_url re#(.+)#
            setting(storage, id, secret, token)
        
        pods:connectStorage(storage, id, secret, token)        
    }

    rule detatch_storage {
        select when sample_app detach_storage
        pods:disconnectStorage()
    }
    rule authenticate_storage {
		select when sample_app authenticate_storage
		pods:authenticate()
	}
	
	rule store_file {
		select when sample_app store_file
		pods:store(event:attrs.get("fetchFileURL"), event:attrs.get("storeLocation"))
	}

	rule overwrite_file_with_name {
		select when sample_app overwrite_file
		if (event:attrs.get("fileName")) then
			pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("fileName"))
	}

	rule overwrite_file_no_name {
		select when sample_app overwrite_file
		if (not event:attrs.get("fileName")) then
			pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"))
	}

	rule remove_file {
		select when sample_app remove_file
		pods:removeFile(event:attrs.get("fileURL"))
	}

	rule copy_file {
		select when sample_app copy_file
		pods:copyFile(event:attrs.get("fetchFileURL"),
					event:attrs.get("storeLocation"))
	}
	
	rule fetch_file {
		select when sample_app fetch_file
		pre {
			dataURL = pods:fetch(event:attrs.get("fileURL"))
		}
		send_directive(dataURL)
	}
	
	rule create_folder {
		select when sample_app create_folder
		pods:createFolder(event:attrs.get("containerURL"))
	}
	rule remove_folder {
		select when sample_app remove_folder
		pods:removeFolder(event:attrs.get("containerURL"))
	}

	rule grant_agent_access {
		select when sample_app grant_agent_access
		pods:grantAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"))
	}

	rule remove_agent_access {
		select when sample_app remove_agent_access
		pods:removeAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"))
	}
	
	rule get_access {
		select when sample_app get_access
		send_directive(pods:getAccess(event:attrs.get("resourceURL")))
	}

	rule grant_access {
		select when sample_app grant_access
		pods:grantAccess(event:attrs.get("resourceURL"))
	}
	rule remove_access {
		select when sample_app remove_access
		pods:removeAccess(event:attrs.get("resourceURL"))
	}
	
	rule ls {
		select when sample_app ls
		pre {
			list = pods:listItems(event:attrs.get("fileURL"))
		}
		send_directive(list)
	}

	rule find {
		select when sample_app find 
		pre {
			file = pods:findFile(event:attrs.get("fileName"))
		}
		send_directive(file)
	}

	rule get_storage {
		select when sample_app get_storage
		send_directive(pods:getStorage())
	}
}
