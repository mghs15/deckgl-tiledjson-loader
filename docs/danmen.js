let isTrucking = false;
let firstPoint;
let danmenData;

map.on('load', function(){
  //GeoJSONとして追加するレイヤ用にSourceを用意
  map.addSource('danmen-base-line', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });
  map.addLayer({
    id: 'danmen-base-line',
    type: 'line',
    source: 'danmen-base-line',
    paint: {
      "line-color": "#FF0000",
      "line-width": 4,
    },
    layout: {
    }
  });
  map.addLayer({
    id: 'danmen-base-line-vertex',
    type: 'circle',
    source: 'danmen-base-line',
    paint: {
      "circle-color": "#FF0000",
      "circle-radius": 4,
    },
    layout: {
    }
  });
  
  
  map.addSource('danmen', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });
});

map.on('mousemove', e => {
  
  if(isTrucking){
    const endPoint = [e.lngLat.lng, e.lngLat.lat];
    map.getSource('danmen-base-line').setData({
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          firstPoint, endPoint
        ]
      },
      "properties": {}
    });
  }
});

map.on('click', e => {
  if(!document.getElementById("isCreateDanmen").checked) return;
  
  isTrucking = !isTrucking;
  
  if(isTrucking){
    firstPoint = [e.lngLat.lng, e.lngLat.lat];
  }else{
    const endPoint = [e.lngLat.lng, e.lngLat.lat];
    map.getSource('danmen-base-line').setData({
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          firstPoint, endPoint
        ]
      },
      "properties": {}
    });
    createDanmenData(firstPoint, endPoint)
    firstPoint = [];
  }
});

function createDanmenData(start, end){
  
  //console.log(start); console.log(end);
  
  const spt = maplibregl.MercatorCoordinate.fromLngLat({lng: start[0], lat: start[1]}, 0);
  const ept = maplibregl.MercatorCoordinate.fromLngLat({lng: end[0],   lat: end[1]  }, 0);
  
  //console.log(spt); console.log(ept);
  
  const u = 300;
  const ux = (ept.x - spt.x)/u;
  const uy = (ept.y - spt.y)/u;
  
  const pmset = [];
  
  for(let i=0; i < u+1; i++){
    const tx = spt.x + ux * i;
    const ty = spt.y + uy * i;
    const ll = new maplibregl.MercatorCoordinate(tx, ty, 0).toLngLat();
    //console.log(ll);
    const lng = ll.lng;
    const lat = ll.lat;
    
    const tx2 = spt.x + ux * (i + 1);
    const ty2 = spt.y + uy * (i + 1);
    const ll2 = new maplibregl.MercatorCoordinate(tx2, ty2, 0).toLngLat();
    //console.log(ll2);
    const lng2 = ll2.lng;
    const lat2 = ll2.lat;
    const cn = [
      (lng+lng2)/2,
      (lat+lat2)/2
    ];
    
    const pm = getElevTileValue(cn, {}).then( h => {
      const g = {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [lng, lat],
              [lng, lat2],
              [lng2, lat2],
              [lng2, lat],
              [lng, lat],
            ]
          ]
        },
        "properties": {
          "height": h
        }
      };
      return Promise.resolve(g);
    });
    
    pmset.push(pm);
    
  }
  
  Promise.all(pmset).then( features => {
  
    console.log(features);
    danmenData = features;
    updateDanmen();
    
  }).catch( e => {
    console.log(e);
  });
  
}


function updateDanmen(){

  if(map.getLayer('danmen')){
    map.removeLayer('danmen');
    map.removeLayer('danmen-back');
    
    map.getSource('danmen-base-line').setData({
      type: 'FeatureCollection',
      features: []
    });
  }
  
  if(!danmenData) return;
  
  if(!document.getElementById("isCreateDanmen").checked) return;
  
  const scale = +document.getElementById("elevScale").value || 0;
  
  map.getSource('danmen').setData({
    type: 'FeatureCollection',
    features: danmenData
  });
  
  map.addLayer({
    id: 'danmen',
    type: 'fill-extrusion',
    source: 'danmen',
    paint: {
      "fill-extrusion-color": "#663300",
      "fill-extrusion-height": ["*", ["get", "height"], scale],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.8,
    },
    layout: {
    }
  });
  
  map.addLayer({
    id: 'danmen-back',
    type: 'fill-extrusion',
    source: 'danmen',
    paint: {
      "fill-extrusion-color": "#FFFFFF",
      "fill-extrusion-height": ["+", ["*", ["get", "height"], scale], 50],
      "fill-extrusion-base": ["*", ["get", "height"], scale],
      "fill-extrusion-opacity": 0.5,
    },
    layout: {
    }
  });
}



