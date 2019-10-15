<Layout {activePage} pages={routesByLevel(0)} {navigator}>
    <div class="page" bind:this={routerTargetElement}></div>
</Layout>

<script>
    import Layout from './pages/shared/Layout.svelte';
    import * as Back from './pages/shared/Back.js';
    import { onMount, onDestroy } from 'svelte';
    import { routes, routesByLevel } from './setup/routes.js';
    import { AppNavigation } from './setup/AppNavigation.js';

    let activePage;
    const activePageChange = (event) => (activePage = (event.target.location.pathname || "/home"));
    addEventListener('pushstate', activePageChange);
    addEventListener('popstate', activePageChange);

    let routerTargetElement;
    let navigator;
    const navigation = new AppNavigation(routes);
    Back.setNavigator(navigation.getInstance());

    onMount(() => {
        console.log("App onMount()");
        navigator = navigation.getInstance();
        navigation.enable(routerTargetElement);
        navigator.navigate(window.location.pathname);
    });

    onDestroy(() => {
        console.log("App onDestroy()");
        navigation.disable();
    });
</script>
