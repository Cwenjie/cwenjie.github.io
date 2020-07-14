(() => {
    // Check that service workers are supported
    if ("serviceWorker" in navigator) {
        // attach event listener on page l aod
        window.addEventListener("load", () => {
            // register serviceWorker with the [sw.js] file
            navigator.serviceWorker.register("/sw.js").then(
                registration => {
                    console.log("[Service Worker] Registered on ", registration.scope);
                }, error => {
                    // registration failed :(
                    console.log("[Service Worker] Registered Failed: ", error);
                }
            );
        });
    }
})();

