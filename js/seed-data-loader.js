// js/seed-data-loader.js
// Loads db.json into window._shiftPilotSeedData for first-run sample data
(function() {
    fetch('db.json')
        .then(res => res.json())
        .then(data => { window._shiftPilotSeedData = data; })
        .catch(() => { window._shiftPilotSeedData = {}; });
})();
