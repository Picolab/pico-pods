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
		pods:store(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("doAutoAuth"))
	}

	rule overwrite_file {
		select when sample_app overwrite_file
		pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("doAutoAuth"))
	}

	rule remove_file {
		select when sample_app remove_file
		pods:removeFile(event:attrs.get("fileURL"))
	}

	rule copy_file {
		select when sample_app copy_file
		pods:copyFile(event:attrs.get("originURL"),
					event:attrs.get("destinationURL"))
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

	rule get_all_agent_access {
		select when sample_app get_all_agent_access
		send_directive(pods:getAllAgentAccess(event:attrs.get("resourceURL")))
	}

	rule set_agent_access {
		select when sample_app set_agent_access
		pods:setAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"), event:attrs.get("read"), event:attrs.get("write"), event:attrs.get("append"))
	}

	rule get_public_access {
		select when sample_app get_public_access
		send_directive(pods:getPublicAccess(event:attrs.get("resourceURL")))
	}

	rule set_public_access {
		select when sample_app set_public_access 
		pods:setPublicAccess(event:attrs.get("resourceURL"), event:attrs.get("read"), event:attrs.get("write"), event:attrs.get("append"))
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
