ruleset pods_test {
	meta {
		name "Pods Test"
	}
	
	rule test_connect_pod {
		select when test connect_storage
		pods:connectStorage(event:attrs.get("storageURL"),
						event:attrs.get("clientID"),
						event:attrs.get("clientSecret"),
						event:attrs.get("tokenURL"))
	}
	
	rule test_disconnect_storage {
		select when test disconnect_storage
		pods:disconnectStorage()
	}
	
	rule test_authenticate_storage {
		select when test authenticate_storage
		pods:authenticate()
	}
	
	rule test_store_file_with_name {
		select when test store_file
		if (event:attrs.get("fileName")) then
			pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("fileName"))
	}
	rule test_store_file_no_name {
		select when test store_file
		if (not event:attrs.get("fileName")) then
			pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"))
	}
	rule test_overwrite_file_with_name {
		select when test overwrite_file
		if (event:attrs.get("fileName")) then
			pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("fileName"))
	}
	rule test_overwrite_file_no_name {
		select when test overwrite_file
		if (not event:attrs.get("fileName")) then
			pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"))
	}
	rule test_remove_file {
		select when test remove_file
		pods:removeFile(event:attrs.get("fileURL"))
	}

	rule test_copy_file {
		select when test copy_file
		pods:copyFile(event:attrs.get("fetchFileURL"),
					event:attrs.get("storeLocation"))
	}
	
	rule test_fetch_file {
		select when test fetch_file
		pre {
			dataURL = pods:fetch(event:attrs.get("fileURL"))
		}
		send_directive(dataURL)
	}
	
	rule test_create_folder {
		select when test create_folder
		pods:createFolder(event:attrs.get("containerURL"))
	}
	rule test_remove_folder {
		select when test remove_folder
		pods:removeFolder(event:attrs.get("containerURL"))
	}

	rule test_grant_agent_access {
		select when test grant_agent_access
		pods:grantAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"))
	}

	rule test_remove_agent_access {
		select when test remove_agent_access
		pods:removeAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"))
	}
	
	rule test_grant_access {
		select when test grant_access
		pods:grantAccess(event:attrs.get("resourceURL"))
	}
	rule test_remove_access {
		select when test remove_access
		pods:removeAccess(event:attrs.get("resourceURL"))
	}
	
	rule test_ls {
		select when test ls
		pre {
			list = pods:listItems(event:attrs.get("directoryURL"))
		}
		send_directive(list)
	}

	rule test_find {
		select when test find 
		pods:findFile(event:attrs.get("fileName"))
	}
	
	rule test_get_storage {
		select when test get_storage
		pre {
			storeURL = pods:getStorage()
		}
		send_directive("Store URL found", {"store_url":storeURL})
	}
	
	rule test_storage_entity {
		select when test storage_entity
		pre {
			storeURL = ent:__pods_storageURL
		}
		send_directive("Store URL found", {"store_url":storeURL})
	}
}
