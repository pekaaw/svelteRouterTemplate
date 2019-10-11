<nav class="navbar navbar-expand-sm navbar-dark bg-dark">
    <section class="container">
        <ul class="navbar-nav mr-auto">
            {#each pages as page}
                <li class="nav-item { isActive(page.path) }"><a class="nav-link" on:click={navigate(page.route)} href="{page.route}" onclick="return false;">{ page.name }</a></li>
            {/each}
        </ul>
    </section>
</nav>

<script>
    export let pages;
    export let activePage;
    export let navigator;
    let navigate = route => () => {
        console.log(`navigate onclick(\"${route}\") where activePage = ${activePage}`);
        navigator && navigator.navigate(route);
    };
    let isActive = str => activePage === str ? 'active' : '';
</script>
