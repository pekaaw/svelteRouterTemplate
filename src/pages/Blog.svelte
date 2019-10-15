<h1>Blog</h1>

<a on:click={navigator.navigate} href="/blog/new">New blog entry</a>

<ul>
    <li>
        <a on:click={navigator.navigate} href="/blog/entry/1">Entry #1</a>
    </li>
    <li>
        <a on:click={navigator.navigate} href="/blog/entry/2">Entry #2</a>
    </li>
</ul>


<script>
    export let navigator;

    function navigate(e) {
        e.preventDefault();
        navigator.navigate(e.target.pathname);
    }
</script>
