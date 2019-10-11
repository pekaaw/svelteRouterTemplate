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
    $: console.log("App: activePage " + activePage);
    const activePageChange = (event) => {
        console.log("activePageChange", event);
        (activePage = (event.state || event.uri || "home"));
    }

    console.log("addingEventListeners");
    addEventListener('replacestate', activePageChange);
    addEventListener('pushstate', activePageChange);
    addEventListener('popstate', activePageChange);
    dispatchEvent(new Event("popstate"));

    let routerTargetElement;
    let navigator;
    const navigation = new AppNavigation(routes);
    Back.setNavigator(navigation.getInstance());

    onMount(() => {
        console.log("App onMount()");
        navigator = navigation.getInstance();
        navigation.enable(routerTargetElement);

        addEventListener('replacestate', e => console.log("replacestate", e, this));
        addEventListener('pushstate', e => console.log("pushstate", e, this));
        addEventListener('popstate', e => console.log("popstate", e, this));
    });

    onDestroy(() => {
        console.log("App onDestroy()");
        navigation.disable();
    });
</script>
