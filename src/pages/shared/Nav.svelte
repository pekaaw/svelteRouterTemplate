<nav class="navbar navbar-expand-sm navbar-dark bg-dark">
    <section class="container">
        <ul class="navbar-nav mr-auto">
            {#each pages as page}
                <li class="nav-item" class:active={isActive(page.route)}><a class="nav-link" on:click={navigate(page.route)} href="{page.route}">{ page.name }</a></li>
            {/each}
        </ul>
    </section>
</nav>

<script>
    export let pages;
    export let activePage;
    export let navigator;
    let navigate = route => e => {
        e.preventDefault();
        navigator && navigator.navigate(route);
    };
    $: isActive = route => {
        return activePage === route;
    }
</script>
