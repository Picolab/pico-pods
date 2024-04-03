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
	
	rule test_store_file {
		select when test store_file
		pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("fileName"), event:attrs.get("doAutoAuth"))
	}

	rule test_overwrite_file {
		select when test overwrite_file
		pods:overwrite(event:attrs.get("originURL"), event:attrs.get("destinationURL"), event:attrs.get("fileName"), event:attrs.get("doAutoAuth"))
	}

	rule test_remove_file {
		select when test remove_file
		pods:removeFile(event:attrs.get("fileURL"), event:attrs.get("doAutoAuth"))
	}

	rule test_copy_file {
		select when test copy_file
		pods:copyFile(event:attrs.get("fetchFileURL"),
					event:attrs.get("storeLocation"),
					event:attrs.get("doAutoAuth"))
	}
	
	rule test_fetch_file {
		select when test fetch_file
		pre {
			dataURL = pods:fetch(event:attrs.get("fileURL"), event:attrs.get("doAutoAuth"))
		}
		send_directive(dataURL)
	}
	
	rule test_create_folder {
		select when test create_folder
		pods:createFolder(event:attrs.get("containerURL"), event:attrs.get("doAutoAuth"))
	}
	rule test_remove_folder {
		select when test remove_folder
		pods:removeFolder(event:attrs.get("containerURL"), event:attrs.get("doAutoAuth"))
	}

	rule test_grant_agent_access {
		select when test grant_agent_access
		pods:grantAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"), event:attrs.get("doAutoAuth"))
	}

	rule test_remove_agent_access {
		select when test remove_agent_access
		pods:removeAgentAccess(event:attrs.get("resourceURL"), event:attrs.get("webID"), event:attrs.get("doAutoAuth"))
	}
	
	rule test_grant_access {
		select when test grant_access
		pods:grantPublicAccess(event:attrs.get("resourceURL"), event:attrs.get("doAutoAuth"))
	}
	rule test_remove_access {
		select when test remove_access
		pods:removePublicAccess(event:attrs.get("resourceURL"), event:attrs.get("doAutoAuth"))
	}
	
	rule test_ls {
		select when test ls
		pre {
			list = pods:listItems(event:attrs.get("directoryURL"), event:attrs.get("doAutoAuth"))
		}
		send_directive(list)
	}

	rule test_find {
		select when test find 
		pods:findFile(event:attrs.get("fileName"), event:attrs.get("doAutoAuth"))
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
