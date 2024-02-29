import { krl, KrlCtx } from "krl-stdlib";
import { PicoEngineCore } from "../PicoEngineCore";

const simple: krl.Module = {
	get_post: krl.Function(["post_num"], function(post_num : number) {
		if (!post_num) {
			throw new Error("simple:get_post needs a post number");
		}
		
		fetch('https://jsonplaceholder.typicode.com/posts/' + post_num.toString())
			.then((response) => response.json())
	}),
	
	get_all_posts: krl.Function([], function() {
		fetch('https://jsonplaceholder.typicode.com/posts')
			.then((response) => response.json())
	}),
	
	put_post: krl.Action(["body"], function(body : string) {
		if (!body) {
			throw new Error("simple:put_post needs a body");
		}
		
		fetch('https://jsonplaceholder.typicode.com/posts', {
			method: 'POST',
			body: JSON.stringify({
				title: 'Simple',
				body: body,
				userId: 1,
			}),
			headers: {
				'Content-type': 'application/json; charset=UTF-8',
			},
		})
		  .then((response) => response.json())
	}),
	
}

export default simple;