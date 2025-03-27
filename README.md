# deckgl-tiledjson-loader
タイル分割した JSON を読んで deck.gl で 3D 風に表示する試行

デモサイト： https://mghs15.github.io/deckgl-tiledjson-loader/

※神戸市新開地駅～谷上駅付近のサンプルデータを表示（ZL13 以上で表示）

## 機能等の説明

メインの機能は `TileLoader` クラスに集約されています。

* [deckgl-3dmap-maplibre](https://github.com/mghs15/deckgl-3dmap-maplibre) レポジトリで作成できる 3D データ（JSON）をタイルとして読み込む
* 読み込んだタイルはマージして次の工程へ渡す
  * 動かすたびに、必要なタイルを読込み・マージして、3D 関係レイヤを再度作成しなおすこととなる
* タイルのキャッシュ機構とデータ取得中に地図が動き始めた時のキャンセル機能を付与（ChatGPT の出力をそのまま実装）

## サンプルデータ
* 神戸市新開地駅～谷上駅付近：最適化ベクトルタイル ZL 15 相当の情報（ZL 13 以上 16 未満で表示）
	* 神戸市すずらん台駅周辺は、最適化ベクトルタイル ZL 16 相当の建物・注記等情報を ZL 15 以上で追加で表示
* 尾道付近：最適化ベクトルタイル ZL 15 相当の情報（ZL 13 以上 16 未満で表示）
	* ZL 15 以上で３次元電子国土基本図試作データを加工したデータを表示可能


## 課題

* 注記の文字が、建物（MapLibre のネイティブレイヤ（fill-extrusion）使用）よりも下に表示されてしまう
* 動くたびにレイヤを一式作成しなおしているため、動かすたびにデータが一瞬消えてしまってうるさい

### 解消

以下の通り変更したら修正できた

* 修正前
```
  if(g.deckOverlay){
    map.removeControl(g.deckOverlay);
    delete g.deckOverlay;
  }
  
  g.deckOverlay = new deck.MapboxOverlay({
    interleaved: true, layers: []
  });
  
  g.deckOverlay.setProps({
    layers: deckLayers
  });
  
  map.addControl(g.deckOverlay);
```

* 修正後
```
  if(!g.deckOverlay){
    g.deckOverlay = new deck.MapboxOverlay({
      interleaved: true, layers: []
    });
    map.addControl(g.deckOverlay);
  }
  
  g.deckOverlay.setProps({
    layers: deckLayers
  });
```


## 使用データ等

* 国土地理院最適化ベクトルタイル https://github.com/gsi-cyberjapan/optimal_bvmap
* 国土地理院標高タイル https://maps.gsi.go.jp/development/demtile.html
* 3次元電子国土基本図（試作データ） https://www.gsi.go.jp/kibanjoho/mapinfo3D.html

以下のレポジトリをベースにしているため、使用ライブラリ等はこちらを参照してください。

* https://github.com/mghs15/deckgl-3dmap-maplibre 

また、ChatGPT の支援を受けています。
