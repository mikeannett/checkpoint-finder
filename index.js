'use strict';
import 'ol/ol.css';
import 'ol-layerswitcher/src/ol-layerswitcher.css';

import Map from 'ol/Map';
import View from 'ol/View';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import {transform} from 'ol/proj';
import {Circle as CircleStyle, Fill, Icon, Stroke, Style} from 'ol/style';
import {Tile as LayerTile, Vector as LayerVector} from 'ol/layer';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import {Vector as VectorLayer} from 'ol/layer';

import LayerSwitcher from 'ol-layerswitcher';
import OsGridRef, { LatLon } from 'geodesy/osgridref.js';
//import OsGridRef from 'mt-osgridref';

// Hack used to avoid reload errors caused by hot loading before parcel has finshed preparing the distribution.
if (module.hot) {
  module.hot.accept(function () {
    setTimeout(function() {
      location.reload();
    }, 300);
  });
}

// get the layer with this name.
export function getLayer(name)
{
  let ret;
  map.getLayers().forEach(function(layer, i) {
    if (layer.get('name')==name)
    {
      ret=layer;
    }
  });
  return ret;
}

// Create a map centered on Win hill
function drawMap () {
  const winHill=new Point([ -1.721040,53.362571]).transform( 'EPSG:4326','EPSG:3857');
  const activityLayer = new LayerVector({
    style: function(feature) {
      return styles[feature.get('type')];
    },
    source: new VectorSource({}),
    name: 'activity' 
  });
  const animationLayer = new LayerVector({
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    source: new VectorSource({}),
    name: 'animation' 
  });
  
  const osmLayer = new LayerTile({
    title: 'Open Steet Map',
    type: 'base',
    source: new OSM()
  });

  const osmTopoLayer = new LayerTile({
    title: 'OSM Topo',
    type: 'base',
    visible: false,
    source: new XYZ({
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
    })
  });
  // OSMImpl.CycleMap(name)
  //{
  //  "url" : "http://tile2.opencyclemap.org/transport/{z}/{x}/{y}.png"
  // }
  // https://a.tile.thunderforest.com/cycle/15/16234/10624.png?apikey=a5dd6a2f1c934394bce6b0fb077203eb
  const arcGISEsriTopoLayer=new LayerTile({
    title: 'ArcGIS Esri Topographical',
    type: 'base',
    visible: false,
    source: new XYZ({
      attributions:
        'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
        'rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
      url:
        'https://server.arcgisonline.com/ArcGIS/rest/services/' +
        'World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    }),
  });
  const arcGISEsriImagaryLayer=new LayerTile({
    title: 'ArcGIS Esri Image',
    type: 'base',
    visible: false,
    source: new XYZ({
      attributions:
        'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
        'rest/services/World_Imagery/MapServer">ArcGIS</a>',
      url:
        'https://server.arcgisonline.com/ArcGIS/rest/services/' +
        'World_Imagery/MapServer/tile/{z}/{y}/{x}',
    }),
  }); 


  const map = new Map({
    target: document.getElementById('map'),
    view: new View({
      center: winHill.flatCoordinates,
      zoom: 14,
      minZoom: 2,
      maxZoom: 19
    }),
    layers: [
      arcGISEsriTopoLayer,osmTopoLayer,arcGISEsriImagaryLayer,osmLayer
    ]
  });
  
  var layerSwitcher = new LayerSwitcher();
  map.addControl(layerSwitcher);

  return map;
}

// Code to support page's Map section
const map=drawMap();



// Code to support page's Convert section
const osGridRef = document.getElementById("osGridRef");
const latLong = document.getElementById("LatLong");
const convertCopyDown = document.getElementById("convertCopyDown");
convertCopyDown.onclick = convertCopyDownHandler;
osGridRef.addEventListener('change', convertButtonHandler);

// Handler for the convert button
function convertButtonHandler() {
  const latlon = convertOsToLatLong1(osGridRef.value);
  latLong.innerText=`${latlon._lat.toFixed(6)}, ${latlon._lon.toFixed(6)}`;
}

// Convert an OS grid reference to latitude and longditude. Returned object has _lat and _lon properties
function convertOsToLatLong1(osGrid) {
  // SK188850
  const gridref = OsGridRef.parse(osGrid);
  //const latlon = OsGridRef.osGridToLatLong(gridref);
  const latlon = gridref.toLatLon();  // default is pWgs84
  return latlon;
}

// handler for the copy down button
function convertCopyDownHandler() {
  copyDown(latLong.innerText);
}


// Code to support page's Map Clicks section
const mapClickCopyDown = document.getElementById("mapClickCopyDown");
mapClickCopyDown.onclick = mapClickCopyDownHandler;

// map click handler to populate latLongClick HTML input
map.on('click', function(evt){
  const olPoint=transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
  const latLongClick= document.getElementById("LatLongClick");
  latLongClick.innerText=`${olPoint[1].toFixed(6)}, ${olPoint[0].toFixed(6)}`;
});

// handler for the copy down button
function mapClickCopyDownHandler() {
  const latLongClick= document.getElementById("LatLongClick");
  copyDown(latLongClick.innerText);
}

// Code to support page's Checkpoints section
const tableLen=10;
const markerLayer = new VectorLayer({
  source: new VectorSource({}),
  name: "marker"
});
map.addLayer(markerLayer);

for(let i=1;i<=tableLen;i++) {
  const ll=document.getElementById(`LatLong${i}`);
  ll.addEventListener('change', latLongChangeHandler);
  ll.onfocus=latLongOnfocusHandler;
  ll.onblur=latLongOnblurHandler;
}

// Take a string in the form "Lat, Lon", validate it, returning an array [lat,Lon]
function parseLatLong( str ) {
  const parts = str.split(",");
  if (parts.length != 2) return null;
  if (isNaN(parts[0] || isNaN(parts[1]))) return null;
  if (parts[0] < -90 || parts[0]>90) return null;
  if (parts[1] < -180 || parts[1]>180) return null;

  return parts;
}

// Return the number at the end of the supplied element identifier
// Our page has a table of HTML input with ids in the form "LatLong7" where n is the row number
function whichRow(id) {
  var matches = id.match(/\d+$/);
  if (matches==null || matches.length != 1) return 0;
  return matches[0];
}

let highlightPoint;

// Display a point on the map
function displayPoint( point, highlight ){

  const OlPoint = [point[1], point[0]]
  const possition=new Point(OlPoint).transform('EPSG:4326', 'EPSG:3857');
  const pointFeature = new Feature ( {geometry: possition});
  let pointStyle
  if (highlight) {
    pointStyle =  new Style({
      image: new Icon({
          src: 'data:image/svg+xml;utf8,<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" version="1.1"><circle cx="5" cy="5" r="4" fill="yellow"></circle></svg>' 
      })
    });
    highlightPoint=pointFeature;
  }
  else
    pointStyle =  new Style({
      image: new Icon({
          src: 'data:image/svg+xml;utf8,<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" version="1.1"><circle cx="5" cy="5" r="4" fill="Red"></circle></svg>' 
      })
    });
  pointFeature.setStyle(pointStyle);
  markerLayer.getSource().addFeature(pointFeature);
}

// Display all points on the map
function displayPoints(){
  let counter=0;
  let collection="";
  markerLayer.getSource().clear();

  for(let i=1;i<=tableLen;i++) {
    const ll=document.getElementById(`LatLong${i}`);
    const point=parseLatLong(ll.value);
    if (point) {
      displayPoint(point);
      collection=`${collection}${counter==0?"":", "}[${ll.value}]`;
      counter++;
    }
  }
  if (counter > 0)
  {
    let layerExtent = markerLayer.getSource().getExtent();
    if (layerExtent) {
      centreAndZoom(layerExtent)
    }

    let collectionPoint = document.getElementById("collectionPoint");
    collectionPoint.innerText=collection;
  }
}

// Change handler for the lat/Long items in the table.
function latLongChangeHandler(evt) {
  const thisRow=whichRow(this.id);
  const point=parseLatLong(this.value);

  displayPoints();
  displayDist();
}

// Onfocus handler for the lat/Long items in the table, display a highlighter point
function latLongOnfocusHandler(evt) {
  const thisRow=whichRow(this.id);
  const point=parseLatLong(this.value);
  if (point)
    displayPoint(point, true);
}

// Onblur handler for the lat/Long items in the table, remove a highlighter point
function latLongOnblurHandler(evt) {
  if (!highlightPoint) return;
  markerLayer.getSource().removeFeature(highlightPoint);
  highlightPoint=null;
}

// Trigger a change event on an element
function triggerChangeEvent(element) {
  let event = document.createEvent("HTMLEvents");
  event.initEvent("change", true, true);
  event.eventName = "change";
  element.dispatchEvent(event);
}

// Validate supplied Lat,Lon and put it in the first available slot in the table.
function copyDown(value) {
  const point=parseLatLong(value);
  if (!point) return;

  for(let i=1;i<=tableLen;i++) {
    const ll=document.getElementById(`LatLong${i}`);
    if (!ll.value) {
      ll.value=value;
      triggerChangeEvent(ll);
      break;
    }
  }
}

// 
function getPoints(){
  let points = [];
  for(let i=1;i<=tableLen;i++) {
    const ll=document.getElementById(`LatLong${i}`);
    points.push(parseLatLong(ll.value));
  }
  return points;
}

// Display Distance and Bearing between points in the table
function displayDist(){
  
  const points=getPoints();

  for (let i=1; i<points.length; i++) {
    const p1 = points[i-1];
    const p2 = points[i];
    // NB points[i] is derived from latlong2 
    const distElement = document.getElementById(`dist${i}`);
    const bearingElement = document.getElementById(`bearing${i}`);

    let dist = null;
    let bearing=null;
    if (p1 && p2) {
      dist=haversine(p1,p2);
      dist=`${parseInt(dist)}m`;

      bearing = calcBearing(p1,p2);
      bearing =`${parseInt(bearing)}°`;
    }
    distElement.innerText=dist;
    bearingElement.innerText=bearing;
  }
}

// Calculate the distances between 2 points
function haversine(point1, point2)
{
    const lat1 = point1[0];
    const lat2 = point2[0];
    const lon1 = point1[1];
    const lon2 = point2[1];
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres

    return d;
}

function calcBearing(point1, point2) {
  const lat1 = point1[0];
  const lat2 = point2[0];
  const lon1 = point1[1];
  const lon2 = point2[1];
  const Δλ = (lon2-lon1) * Math.PI/180;
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) -
            Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const brng = (θ*180/Math.PI + 360) % 360; // in degrees

  return brng;
}

// Centre and zoom map to the specified activity.
function centreAndZoom(extent) {
  // add 5% to the extent otherwise activity is pressed up against the side of the map
  var bitMore=(extent[0]-extent[2])*0.05;
  extent[0]+=bitMore
  extent[2]-=bitMore
  bitMore=(extent[1]-extent[3])*0.05;
  extent[1]+=bitMore
  extent[3]-=bitMore

  map.getView().fit(extent, map.getSize());
}