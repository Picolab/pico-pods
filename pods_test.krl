ruleset pods_test {
	meta {
		name "Pods Test"
	}
	
	rule test_connect_pod {
		select when test connect_pod
		pods:connect_pod(event:attrs.get("podURL"))
	}
	
	rule test_disconnect_pod {
		select when test disconnect_pod
		pods:disconnect_pod()
	}
	
	rule test_store_file {
		select when test store_file
		pods:store(event:attrs.get("fileURL"))
	}
}