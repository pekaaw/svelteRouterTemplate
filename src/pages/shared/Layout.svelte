<header>
    <Nav {pages} {activePage} {navigator} />
</header>
<main class="container">
    <slot></slot>
</main>
<footer id="mainFooter" class="container d-flex aligh-self-end">
    <Footer />
</footer>

<script>
    import Nav from './Nav.svelte';
    import Footer from './Footer.svelte';
    
    export let pages;
    export let activePage;
    export let navigator;
    $: console.log(activePage);
</script>
