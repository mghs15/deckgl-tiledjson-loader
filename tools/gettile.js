// ChatGPT を使用
//--------------------------------------------------------

import pmtiles  from "pmtiles";
import fs from "fs";
import child_process from 'child_process';

import {VectorTile} from '@mapbox/vector-tile';
import Protobuf from 'pbf';

import sharp from 'sharp';

//--------------------------------------------------------

//Reference: Slippy map tilenames
//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
const lon2tile = (lon,zoom) => { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
const lat2tile = (lat,zoom) => { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }
const lon2tiled = (lon,zoom) => { return ((lon+180)/360*Math.pow(2,zoom)); }
const lat2tiled = (lat,zoom) => { return ((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)); }

const demurl = "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png";
const url = "https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles";
const p = new pmtiles.PMTiles(url);



const z = 14;
for(let x = 14216; x < 1417; x++){
  for(let y = 6528; y < 6529; y++){
    bindElevToMvt(z, x, y);
  }
}

async function bindElevToMvt(z, x, y) {
  
  let url = demurl.replace(/\{z\}/, z)
    .replace(/\{x\}/, x)
    .replace(/\{y\}/, y);
    
  console.log(url);
  
  const buf = await fetch( url )
    .then(response => {
      console.log(`${z}/${x}/${y} -> ${response.statusText}`);
      return response.arrayBuffer();
    })
    .then( data => {
      const buf = Buffer.from(data);
      return sharp( buf )
        .raw()
        .toBuffer()
    })
    .catch( data => {
      return null;
    });
    
  await p.getZxy(z, x, y).then( data => {

    //console.log(data);
    const tile = new VectorTile(new Protobuf(data.data));
    
    const layers = tile.layers;
    const layerNames = Object.keys(layers);
    const json = {};
    
    layerNames.forEach( layerName => {
      const layer = layers[layerName];
      const features = [];
      
      //console.log(`Layer: ${layerName}`);
      //console.log(layer);
      
      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        const geojson = feature.toGeoJSON(x, y, z);
        
        // マルチパートはシングルパートへ
        if(geojson.geometry.type.match("Multi")){
          geojson.geometry.coordinates.forEach( single => {
            features.push({
              type: geojson.type,
              geometry: {
                type: geojson.geometry.type.replace("Multi", ""),
                coordinates: single
              },
              properties: {
                //isMulti: 1,
                ...geojson.properties
              }
            });
          });
        }else{
          features.push(geojson);
        }
        
      }
      
      const getZ = (lnglat, option) => {
        
        const tileDetailX = lon2tiled(lnglat[0], z);
        const tileDetailY = lat2tiled(lnglat[1], z);
        const _x = Math.floor(tileDetailX);
        const _y = Math.floor(tileDetailY);
        let pixelX = Math.floor((tileDetailX - _x) * 255);
        let pixelY = Math.floor((tileDetailY - _y) * 255);
        
        // はみ出した際の対応
        if(x > _x) pixelX = 0;
        if(x < _x) pixelX = 255;
        if(y > _y) pixelY = 0;
        if(y < _y) pixelY = 255;
        
        if(!buf) return 0;
        
        const size = 256;
        const ch = buf.length / ( size * size );
        const t = pixelX + pixelY * 256;
        const [ r, g, b ] = [ buf[ t * ch ], buf[ t * ch + 1 ], buf[ t * ch + 2 ] ];
        
        const pow2_8 = Math.pow(2, 8);
        const pow2_16 = Math.pow(2, 16);
        const pow2_23 = Math.pow(2, 23);
        const pow2_24 = Math.pow(2, 24);
        
        let h = 0;
        if (r != 128 || g != 0 || b != 0) {
          const d = r * pow2_16 + g * pow2_8 + b;
          h = (d < pow2_23) ? d : d - pow2_24;
          if (h == -pow2_23) h = 0;
          else h *= 0.01;
          h = Math.floor(h * 100)/100;
        }else {
          // h = 0;
        }
        
        return h;
      }
      
      const option = {zl: z, propZ: "vt_alti"};
      let collection = {type: "FeatureCollection", features: features};
      
      /***
      // Polygon を LineString へ変換する等したい場合
      if(layerName == "WA"){
        collection = convertPolygonRingsToLineStrings(collection);
      }else if(layerName == "Cntr" || layerName == "AdmBdry"  || layerName == "Anno"){
        // そのまま
      }else if(layerName == "BldA" || layerName == "RailCL" || layerName == "RdCL"){
        // そのまま
      }else{
        return;
      }
      ***/
      
      const dataName = layerNameMap[layerName];
      if(layerName == "_"){
        json[dataName] = addZToGeoJSONSync(collection, getZ, option);
      }else{
        json[dataName] = addZToGeoJSONSync(collection, getZ, option).features;
      }
    });
    
    fs.writeFileSync(`./docs/tiles/${z}-${x}-${y}-1.json`, JSON.stringify(json, null, 2));
    console.log(`SUCCESS fetch pbf : ${z}/${x}/${y}`);
    
  }).catch( err => {
    console.log(`ERROR fetch pbf : ${z}/${x}/${y}`);
  });

}

const layerNameMap = {
  "Cntr" : "contour", 
  "RdCL" : "road", 
  "RailCL" : "railway", 
  "WA" : "waterarea" , 
  "AdmBdry" : "border", 
  "Anno" : "symbol", 
  "BldA" : "building",
}


// 非同期用
const addZToGeoJSONSync = (geojson, getElev, option = {}) => {

  // Helper function to process coordinates
  const processCoordinates = (coords, props) => {
    if (Array.isArray(coords[0])) {
      // Recursive case for nested arrays
      return coords.map( c => processCoordinates(c, props) );
    } else {
      // Base case: [x, y] 
      const [x, y] = coords;
      const propZ = option.propZ || "z";
      const z = props[propZ] || getElev([x, y], option) || 0;
      return [x, y, z];
    }
  };

  // Helper function to flatten multi-part geometries
  const flattenGeometry = (geometry) => {
    switch (geometry.type) {
      case "MultiPoint":
        return geometry.coordinates.map((coords) => ({
          type: "Point",
          coordinates: coords,
        }));
      case "MultiLineString":
        return geometry.coordinates.map((coords) => ({
          type: "LineString",
          coordinates: coords,
        }));
      case "MultiPolygon":
        return geometry.coordinates.map((coords) => ({
          type: "Polygon",
          coordinates: coords,
        }));
      default:
        return [geometry];
    }
  };

  // Extract and process features
  const features = [];
  for (const feature of geojson.features) {
    const { geometry, properties } = feature;
    const flattenedGeometries = flattenGeometry(geometry);
    for (const geom of flattenedGeometries) {
      const updatedCoordinates = processCoordinates(geom.coordinates, properties);
      features.push({
        type: "Feature",
        geometry: { type: geom.type, coordinates: updatedCoordinates },
        properties: { ...properties },
      });
    }
  }

  // Return the new GeoJSON
  //console.log(features);
  return {
    type: "FeatureCollection",
    features: features,
  };
}

//Polygon を LineString へ
function convertPolygonRingsToLineStrings(geojson) {
  if (geojson.type !== "FeatureCollection") {
    throw new Error("Input must be a GeoJSON FeatureCollection");
  }

  const output = {
    type: "FeatureCollection",
    features: []
  };

  geojson.features.forEach((feature, featureIndex) => {
    const geometry = feature.geometry;
    const properties = feature.properties;

    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      // それ以外の地物は無視する（必要なら処理を追加）
      return;
    }

    const rings = geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.coordinates.flat(); // MultiPolygonは [ [ [ ... ] ] ] 構造なので flatten

    rings.forEach((ring, ringIndex) => {
      output.features.push({
        type: "Feature",
        properties: {
          ...properties,
          //originalFeatureIndex: featureIndex,
          //ringIndex: ringIndex,
          //ringType: ringIndex === 0 ? "outer" : "inner"
        },
        geometry: {
          type: "LineString",
          coordinates: ring
        }
      });
    });
  });

  return output;
}


