/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWljaGFlbGhhOTAiLCJhIjoiY2ttN3Nxbms0MTA1djJwcXQ5YXNuaDFqdCJ9.lZNa6fzH9VcCv55qr0YJZA';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/michaelha90/ckm7uni8jdnox17rz2zbwkszo',
    scrollZoom: false,
    // center: [-80.128473, 25.781842],
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // add pop up
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include the current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
