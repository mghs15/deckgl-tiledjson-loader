

const fs = require('fs');

const turf = require('@turf/turf');

const inputs = [
  "BldA",
  "RailTrCL",
  "RdCL"
];

const tmp = {};

//Reference: Slippy map tilenames
//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
const lon2tile = (lon,zoom) => { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
const lat2tile = (lat,zoom) => { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }
const lon2tiled = (lon,zoom) => { return ((lon+180)/360*Math.pow(2,zoom)); }
const lat2tiled = (lat,zoom) => { return ((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)); }

const zoom = 15;

inputs.forEach( input => {
  const path = `./data/${input}.geojson`;
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const features = d.features;
  features.forEach( f => {
    const center = turf.center(f);
    const [lon, lat] = center.geometry.coordinates;
    const x = lon2tile(lon, zoom);
    const y = lat2tile(lat, zoom);
    const key = `${zoom}-${x}-${y}-1`;
    
    if(!tmp[key]) tmp[key] = {};
    if(!tmp[key][input]) tmp[key][input] = [];
    tmp[key][input].push(f);
  });
});

const keys = Object.keys(tmp);
keys.forEach( key => {
  const path = `./tiles/${key}.json`;
  const data = tmp[key];
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
});




