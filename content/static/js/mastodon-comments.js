function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function recurse_post_tree(post_id, prefix, post_tree, replies_map) {
    reply = replies_map[post_id]
    reply.account.display_name = escapeHtml(reply.account.display_name);
    reply.account.emojis.forEach(emoji => {
	reply.account.display_name = reply.account.display_name.replace(`:${emoji.shortcode}:`,
									`<img src="${escapeHtml(emoji.static_url)}" alt="Emoji ${emoji.shortcode}" height="20" width="20" />`);
    });
    if (post_tree[post_id] && post_tree[post_id].length > 0) {
	div_class = 'mastodon-comment';
    } else {
	div_class = 'mastodon-comment mastodon-comment-leaf';
    }
    extra = ''
    if (reply.reblogs_count > 0 || reply.favourites_count > 0) {
	extra = '<div class="stats">';
	if (reply.reblogs_count > 0) {
	    extra += reply.reblogs_count + " 🚀";
	}
	if (reply.favourites_count > 0) {
	    if (reply.reblogs_count > 0) {
		// What am I missing... why doesn't this work?
		extra += " ";
	    }
	    extra += reply.favourites_count += " ★";
	}
	extra += '</div>';
    }
    content = prefix +
`  <div class="${div_class}">
      <div class="avatar">
	<img src="${escapeHtml(reply.account.avatar_static)}" height=60 width=60 alt="">
        <div>${extra}</div>
      </div>
      <div class="content">
	<div class="author">
	  <a href="${reply.account.url}" rel="nofollow" target="_blank">
	    <span>${reply.account.display_name}</span>
	    <span class="disabled">@${escapeHtml(reply.account.username)}</span>
	  </a>
	  <a class="date" href="${reply.uri}" rel="nofollow" target="_blank">
	    ${reply.created_at.substr(0, 10)}
	  </a>
	</div>
       <div class="mastodon-comment-content">${reply.content}</div>
     </div>
   </div>`;
    if (post_tree[post_id]) {
	if (post_tree[post_id].length == 1) {
	    content += recurse_post_tree(post_tree[post_id][0], prefix, post_tree, replies_map);
	} else if (post_tree[post_id].length > 1) {
	    content += '<UL style="list-style-type: none; padding-left: 1em">';
	    post_tree[post_id].forEach(function(reply_id) {
		content += recurse_post_tree(reply_id, '<LI>', post_tree, replies_map);
	    });
	    content += '</UL>';
	}
    }

    return content;
}

function load_mastodon_comments(host, id) {
    document.getElementById("load-comment-text").innerHTML = " ... Loading ... ";
    document.getElementById("mastodon-comments-list").innerHTML = "";

    // Note the limitations for an unauthenticated call (which is what
    // we're doing here):
    //
    //   https://docs.joinmastodon.org/methods/statuses/#context
    //
    // Meaning we will see 60 replies at the most. It doesn't make any
    // guarantees about the order, and they probably show in order of
    // time, not in order of walking the reply tree

    post_tree = {}
    post_tree[id] = []
    replies_map = {}
    fetch('https://'+host+'/api/v1/statuses/'+id)
	.then(function(response) {
	    return response.json()
	})
	.then(function(data) {
	    replies_map[id] = data
	})
    fetch('https://'+host+'/api/v1/statuses/'+id+'/context')
	.then(function(response) {
	    return response.json()
	})
	.then(function(data) {
	    desc = data['descendants']
	    if (desc && Array.isArray(desc) && desc.length > 0) {
		desc.forEach(function(reply) {
		    reply_id = reply.id
		    reply_to = reply.in_reply_to_id

		    replies_map[reply_id] = reply
		    if (!post_tree[reply_to]) {
			post_tree[reply_to] = []
		    }
		    post_tree[reply_to].push(reply_id)
		});
		comments_element = document.getElementById('mastodon-comments-list');
		content = recurse_post_tree(id, '', post_tree, replies_map)
//		post_tree[id].forEach(function(reply_id) {
//		    content += recurse_post_tree(reply_id, '', post_tree, replies_map);
//		});
		/* comments_element.innerHTML = content; */
		comments_element.appendChild(DOMPurify.sanitize(content, {'RETURN_DOM_FRAGMENT': true}));
	    } else {
		document.getElementById('mastodon-comments-list').innerHTML = '<p>No comments found at this time.</p>';
	    }
	})
    document.getElementById("load-comment-text").innerHTML = "Reload comments";
}
