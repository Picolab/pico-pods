ruleset pds_test {
	meta {
		name "PDS Test"
	}
	
	rule test_connect_pod {
		select when test connect_pod
		pds:connect_pod(event:attrs.get("podURL"))
	}
	
	rule test_disconnect_pod {
		select when test disconnect_pod
		pds:disconnect_pod()
	}
	
	rule test_store_file {
		select when test store_file
		pds:store(event:attrs.get("fileURL"))
	}
}