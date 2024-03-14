ruleset pods_test {
	meta {
		name "Pods Test"
	}
	
	rule test_connect_pod {
		select when test connect_storage
		pods:connectStorage(event:attrs.get("storageURL"),
						event:attrs.get("webID"),
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
		pods:store(event:attrs.get("fetchFileLocation"), event:attrs.get("storeLocation"))
	}
	rule test_overwrite_file {
		select when test overwrite_file
		pods:overwrite(event:attrs.get("fileFileLocation"), event:attrs.get("storeLocation"))
	}
	rule test_remove_file {
		select when test remove_file
		pods:removeFile(event:attrs.get("fileURL"))
	}

	rule test_copy_file {
		select when test copy_file
		pods:copyFile(event:attrs.get("fileURL"),
					event:attrs.get("targetURL"))
	}
	
	rule test_fetch_file {
		select when test fetch_file
		pods:fetch(event:attrs.get("fileURL"))
	}
	
	rule test_create_folder {
		select when test create_folder
		pods:createFolder(event:attrs.get("containerURL"))
	}
	rule test_remove_folder {
		select when test remove_folder
		pods:removeFolder(event:attrs.get("containerURL"))
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
		pods:listItems(event:attrs.get("directoryURL"))
	}

	rule test_find {
		select when test find 
		pods:findFile(event:attrs.get("fileName"))
	}
}
