// Set map defaults
var map = new mapboxgl.Map({
		container: "map",
		style: "mapbox://styles/mapbox/dark-v10?optimize=true",
		center: [-87.695787, 41.881302], // Fred Hampton mural
		zoom: 10,
		attributionControl: false
	});

// Create legend
var legendContainer = document.createElement("div");
var legendTitle = document.createElement("h4");
var legend200plus = document.createElement("div");
var legend50plus = document.createElement("div");
var legend5plus = document.createElement("div");
var legendLess5 = document.createElement("div");

// Set content
legendContainer.id = "legend";
legendTitle.innerHTML = "Owned by a landlord with...";
legend200plus.innerHTML = "<span style='background-color: "+yellow+"'></span>200+ properties";
legend50plus.innerHTML = "<span style='background-color: "+red+"'></span>50+ properties";
legend5plus.innerHTML = "<span style='background-color: "+pink+"'></span>5+ properties";
legendLess5.innerHTML = "<span style='background-color: "+green+"'></span>Less than 5 properties";

// Add attribution control
var attributionControl = new mapboxgl.AttributionControl({
	customAttribution: "<a href='https://github.com/ChicagoDSA/find-my-landlord'>View this project on GitHub</a>"
});
map.addControl(attributionControl);

// Get map control
var bottomRightClass = document.getElementsByClassName("mapboxgl-ctrl-bottom-right");
var bottomRightControl = bottomRightClass[0];

// Add legend inside control
bottomRightControl.insertBefore(legendContainer, bottomRightControl.firstChild);
legendContainer.appendChild(legendTitle);
legendContainer.appendChild(legend200plus);
legendContainer.appendChild(legend50plus);
legendContainer.appendChild(legend5plus);
legendContainer.appendChild(legendLess5);

// Add navigation
var navigationControl = new mapboxgl.NavigationControl();
map.addControl(navigationControl, "top-right");

map.on("load", function() {
	// Load search keys
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.onload = function() {
		if (this.status >= 200 && this.status < 400) {
			json = JSON.parse(this.response);

			// Set source data
			map.addSource("propertyData", {
				type: "vector",
				url: "mapbox://lucienlizlepiorz.ddpjhgng",
				promoteId: "Property Address"
			});
			
			// Add features
			map.addLayer({
				"id": "features",
				"type": "circle",
				"source": "propertyData",
				"source-layer": "features",
				"paint": {
					"circle-radius": defaultRadius,
					"circle-color": defaultColors,
					"circle-opacity": defaultOpacity
				},
			});

			setHoverState("propertyData", "vector", "features");
			
			// Remove persisted value
			searchInput.value = "";
			// Show search
			searchInputContainer.style.display = "block";

			// Add listeners
			searchInput.addEventListener("keypress", matchAddresses);
			// Fix for IE clear button
			searchInput.addEventListener("input", matchAddresses);	
		};
	};
	request.send();
});

function addFilteredLayer (name, data, color, opacity) {
	// Set source data
	map.addSource(name, {
		type: "geojson",
		data: data,
		promoteId: "Property Index Number"
	});

	// Add to map
	map.addLayer({
		"id": name,
		"type": "circle",
		"source": name,
		"paint": {
			"circle-radius": defaultRadius,
			"circle-color": color,
			"circle-opacity": opacity
		},
	});

	// Style hover
	setHoverState(name, name);
};

function setHoverState (source, type, layer) {
	// Declared here to fix duplicates
	var buildingID = null;

	map.on("mousemove", layer, function(e) {
		var featuresAtPoint = map.queryRenderedFeatures(e.point, { layers: [layer] });
		buildingAtPoint = getBuildingAtPoint(featuresAtPoint, source);

		if (buildingAtPoint) {
			map.getCanvas().style.cursor = "pointer";
			// Remove existing state
			if (buildingID) {
				if (type == "vector") {
					map.removeFeatureState({
						source: source,
						sourceLayer: layer
					});
				} else {
					map.removeFeatureState({
						source: layer,
						id: buildingID
					});
				};
			};
			
			// Set new ID
			buildingID = featuresAtPoint[0].properties["Property Address"];
			
			// Hover to true
			if (type == "vector") {
				map.setFeatureState({
					source: source,
					sourceLayer: layer,
					id: buildingID
				}, {
					hover: true
				});
			} else {
				map.setFeatureState({
					source: layer,
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

	map.on("click", layer, function(e) {
		if (buildingAtPoint) {
			// loadProperty(buildingAtPoint.id);
		};
	});

	map.on("mouseleave", layer, function() {
		// Hover to false
		if (buildingID) {
			if (type == "vector") {
				map.setFeatureState({
					source: source,
					sourceLayer: layer,
					id: buildingID
				}, {
					hover: false
				});
			} else {
				map.setFeatureState({
					source: layer,
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
