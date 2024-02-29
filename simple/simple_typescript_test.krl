ruleset simple_typescript_test {
	meta {
		name "Simple Typescript Test"
	}
	
	rule test_get_posts {
		select when test get_all_posts
		pre {
			posts = simple:get_all_posts()
		}
		send_directive("say", {"something":posts})
	}
	
	rule test_get_post {
		select when test get_post
		pre {
			post = simple:get_post(event:attrs.get("postNumber"))
		}
		send_directive("say", {"something":post})
	}
	
	rule test_put_post {
		select when test put_post
		simple:put_post(event:attrs.get("post"))
	}
}