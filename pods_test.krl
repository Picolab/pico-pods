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
		pods:store(event:attrs.get("fileURL"))
	}
	rule test_overwrite_file {
		select when test overwrite_file
		pods:overwrite(event:attrs.get("fileURL"))
	}

	rule test_ls {
		select when test ls
		pods:ls(event:attrs.get("directoryURL"))
	}
}