// Set map defaults
var map = new mapboxgl.Map({
		container: "map",
		style: 'mapbox://styles/northamerican/ckf7suzpd0gx219mhjwhbqb0s',
		center: [-73.566520, 45.500100], // Gare Centrale
		
		bearing: -57, // -57 degrees is north
		zoom: 12,
		attributionControl: false
	});

// Create legend
var legendContainer = document.createElement("div");
var legendTitle = document.createElement("h4");
var legend50plus = document.createElement("div");
var legend10plus = document.createElement("div");
var legend3plus = document.createElement("div");
var legendLess3 = document.createElement("div");
var legendUndetermined = document.createElement("div");

// Set content
legendContainer.id = "legend";
legendTitle.innerHTML = i18next.t("LEGEND_TITLE");
legend50plus.innerHTML = `<span style="background-color: ${color4}"></span>50+ ${i18next.t("PROPERTIES")}`;
legend10plus.innerHTML = `<span style="background-color: ${color3}"></span>10+ ${i18next.t("PROPERTIES")}`;
legend3plus.innerHTML = `<span style="background-color: ${color2}"></span>3+ ${i18next.t("PROPERTIES")}`;
legendLess3.innerHTML = `<label><span style="background-color: ${color1}"></span>1-2 ${i18next.t("PROPERTIES")}
	<input id="showPropertiesLess3" type="checkbox">${i18next.t("VISIBLE")}</label>`;
legendUndetermined.innerHTML = `<span style="background-color: ${white}"></span># ${i18next.t("NOT_DETERMINED")}`;

// Add attribution control
var attributionControl = new mapboxgl.AttributionControl({
	customAttribution: `<a href="mailto:${supportEmail}"><b>${i18next.t("IMPROVE_OUR_DATA")}</b></a> | <a href="${githubRepoUrl}" target="_blank">GitHub</a>`
});
map.addControl(attributionControl);

// Get map control
var bottomRightClass = document.getElementsByClassName("mapboxgl-ctrl-bottom-right");
var bottomRightControl = bottomRightClass[0];

// Add legend inside control
bottomRightControl.insertBefore(legendContainer, bottomRightControl.firstChild);
legendContainer.appendChild(legendTitle);
legendContainer.appendChild(legend50plus);
legendContainer.appendChild(legend10plus);
legendContainer.appendChild(legend3plus);
legendContainer.appendChild(legendLess3);
// legendContainer.appendChild(legendUndetermined);

const $showPropertiesLess3 = document.getElementById('showPropertiesLess3')
$showPropertiesLess3.addEventListener("change", showPropertiesProcessFilter);


// View Filtering
function getViewFilters () {
	return showPropertiesLess3.checked ? [] : [['>', ownedColumn, 2]]
}

function showPropertiesProcessFilter () {
	map.setFilter("allProperties", ['all',
		...getViewFilters()
	]);
}

// Add navigation
var navigationControl = new mapboxgl.NavigationControl();
map.addControl(navigationControl, "top-right");


map.on("load", function() {
	// Set source data
	map.addSource("propertyData", {
		type: "vector",
		maxzoom: 14, // Allows overzoom
		tiles: [tiles],
		promoteId: propertyIndexColumn
	});

	map.addLayer({
		"id": "allProperties",
		"type": "circle",
		"source": "propertyData",
		"source-layer": "features",
		"paint": {
			"circle-radius": defaultRadius,
			"circle-color": defaultColors,
			"circle-opacity": defaultOpacity,
			"circle-stroke-width": 1,
			"circle-stroke-color": "rgba(0, 0, 0, .25)",
		},
		'filter': ['all',
			...getViewFilters()
		]
	});

	// Disable functionality if IE
	if (checkIE() == true) {
		// Show unsupported message
		searchInput.value = i18next.t('BROWSER_WARNING');
		searchInput.disabled = true;
		searchInputContainer.style.display = "block";
	} else {
		// Remove persisted value
		searchInput.value = "";
		// Show search
		searchInputContainer.style.display = "flex";

		// Add input listeners
		searchInput.addEventListener("keypress", e => {
			if (e.key === 'Enter') {
				matchAddresses(searchInput.value)
			}
		});
		searchButton.addEventListener("click", () => {
			if (searchInput.value) {
				matchAddresses(searchInput.value)
			}
		});

		// Allow hover and click
		setHoverState("propertyData", "features", "allProperties");
	};

	// Hide spinner
	spinner.style.display = "none";
});

map.on("error", function(e) {
	// Don't log empty tile errors
	if (e && e.error.status != 403) {
		console.error(e);
	};
});

function addLayer (name, data, radius, color, opacity) {
	// Set source data
	map.addSource(name, {
		type: "geojson",
		data: data,
		promoteId: propertyIndexColumn
	});

	// Add to map
	map.addLayer({
		"id": name,
		"type": "circle",
		"source": name,
		"paint": {
			"circle-radius": radius,
			"circle-color": color,
			"circle-opacity": opacity,
			"circle-stroke-width": 2,
			"circle-stroke-color": "rgba(0, 0, 0, .25)",
		},
	});

	// Style hover
	setHoverState(data, null, name);
};

function setHoverState (sourceData, sourceLayer, hoverLayer) {
	// Building under cursor
	var buildingAtPoint = null;
	// Declared here to fix duplicates
	var buildingID = null;

	map.on("mousemove", hoverLayer, function(e) {
		var featuresAtPoint = map.queryRenderedFeatures(e.point, { layers: [hoverLayer] });
		if (sourceLayer != null) {
			// Vector source
			buildingAtPoint = getBuildingAtPoint(featuresAtPoint, sourceData);
		} else {
			// GeoJSON source
			buildingAtPoint = getBuildingAtPoint(featuresAtPoint, hoverLayer);
		};

		if (buildingAtPoint) {
			if (
				selectedContainer.style.display !== "block" &&
				spinner.style.display !== "block"
			) {
				searchInput.value = buildingAtPoint.properties[propertyAddressColumn];
			}
			map.getCanvas().style.cursor = "pointer";
			// Remove existing state
			if (buildingID) {
				if (sourceLayer != null) {
					// Vector source
					map.removeFeatureState({
						source: sourceData,
						sourceLayer: sourceLayer
					});
				} else {
					// GeoJSON source
					map.removeFeatureState({
						source: hoverLayer,
						id: buildingID
					});
				};
			};
			
			// Set new ID
			buildingID = featuresAtPoint[0].properties[propertyIndexColumn];

			// Hover to true
			if (sourceLayer != null) {
				// Vector source
				map.setFeatureState({
					source: sourceData,
					sourceLayer: sourceLayer,
					id: buildingID
				}, {
					hover: true
				});
			} else {
				// GeoJSON source
				map.setFeatureState({
					source: hoverLayer,
					id: buildingID
				}, {
					hover: true
				});
			};
		} else {
			// Clear var
			buildingAtPoint = null;
		};
	});

	map.on("click", hoverLayer, function(e) {
		// Hover to false
		if (buildingID) {
			if (sourceLayer != null) {
				// Vector source
				map.setFeatureState({
					source: sourceData,
					sourceLayer: sourceLayer,
					id: buildingID
				}, {
					hover: false
				});
			} else {
				// GeoJSON source
				map.setFeatureState({
					source: hoverLayer,
					id: buildingID
				}, {
					hover: false
				});
			};	
		};

		// Select property
		if (buildingAtPoint) {
			// Reset UI
			resetMap();
			// Update it
			renderSelectedUI(buildingAtPoint);
			// Log event
			firebase.analytics().logEvent("map-point-clicked", { 
				property_address: buildingAtPoint.properties[propertyAddressColumn],
				taxpayer: buildingAtPoint.properties[taxpayerColumn],
				affiliated_with: buildingAtPoint.properties[affiliatedWithColumn],
			});
		};
	});

	map.on("mouseleave", hoverLayer, function() {
		if (
			selectedContainer.style.display !== "block" &&
			spinner.style.display !== "block"
		) {
			searchInput.value = ''
		}
		// Hover to false
		if (buildingID) {
			if (sourceLayer != null) {
				// Vector source
				map.setFeatureState({
					source: sourceData,
					sourceLayer: sourceLayer,
					id: buildingID
				}, {
					hover: false
				});
			} else {
				// GeoJSON source
				map.setFeatureState({
					source: hoverLayer,
					id: buildingID
				}, {
					hover: false
				});
			};	
		};
		
		// Clear var
		buildingID = null;
		
		// Restore cursor
		map.getCanvas().style.cursor = "";
	});
};

function getBuildingAtPoint (features, source) {
	var filtered = features.filter(function(feature) {
		var pointSource = feature.layer.source;
		// Return feature when trimmed input is found in buildings array
		return pointSource.indexOf(source) > -1;
	});
	return filtered[0];
};
