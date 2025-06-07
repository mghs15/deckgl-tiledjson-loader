# deckgl-tiledjson-loader
タイル分割した JSON を読んで deck.gl で 3D 風に表示する試行

デモサイト： https://mghs15.github.io/deckgl-tiledjson-loader/

> [!TIP]
> * 3次元電子国土基本図を Web 地図にしてみた
>   
> https://qiita.com/mg_kudo/items/722431f979f846f426e0
> 
> * 独自形式 3D データ用のタイルローダーを作った（deck.gl+MapLibre 用）
>   
> https://qiita.com/mg_kudo/items/fc93793acf17134d4985
> 


## 機能等の説明

メインの機能は `TileLoader` クラスに集約されています。

* [deckgl-3dmap-maplibre](https://github.com/mghs15/deckgl-3dmap-maplibre) レポジトリで作成できる 3D データ（JSON）をタイルとして読み込む
* 読み込んだタイルはマージして次の工程へ渡す
  * 動かすたびに、必要なタイルを読込み・マージして、3D 関係レイヤを再度作成しなおすこととなる
* タイルのキャッシュ機構とデータ取得中に地図が動き始めた時のキャンセル機能を付与（ChatGPT の出力をそのまま実装）

## サンプルデータ

※本レポジトリに同封しているツールで作成したものではなく、仕様も異なる場合があります。

* 神戸市新開地駅～谷上駅付近：最適化ベクトルタイル ZL 15 相当の情報（ZL 13 以上 16 未満で表示）
	* 神戸市すずらん台駅周辺は、最適化ベクトルタイル ZL 16 相当の建物・注記等情報を ZL 15 以上で追加で表示
* 尾道付近：最適化ベクトルタイル ZL 15 相当の情報（ZL 13 以上 16 未満で表示）
	* ZL 15 以上で３次元電子国土基本図試作データを加工したデータを表示可能

## ツール

関連ツールは、`tools` ディレクトリ内に格納しております。

* `modularize.js`: GeoJSON へ変換した３次元電子国土基本図試作データをタイル状に分割する
* `gettile.js`: 最適化ベクトルタイルと標高タイルを用いて、標高値が付与されたタイル状のデータを作成する（WIP）

### 生成されるデータの仕様（WIP）

* JSON 形式であり、任意の名前のメンバー（「レイヤ名」と呼ぶこととする）を持つ構造で、各メンバーの値は、GeoJSON の FeatureCollection か、Feature の配列であること。
* 座標値 coordinates は、GooJSON の仕様通り、Z値をとることができる。

```
{
  "layer-name-1": [
    {
      "type": "Feature",
      "geometry": {
         "type": "LineString",
         "coordinates": [
           [135.08746, 34.75884, 290],
           ...
           [135.08721, 34.75875, 320]
         ],
      },
      "properties": {...}
    },
    ...
  ], // Feature の配列
  ...
  "layer-name-2": {
    "type": "FeatureCollection",
    "features": [...] // <- ここは Feature の配列と同様
  } // FeatureCollection
}
```

※ デモサイトでは、FeatureCollection かFeatures の配列かを問わずに読み込めるように対応している。
```
// 対応例（`mergeTiles()` の一部）
const a = d[k].features || d[k];
data[k].push(...a);
```

※３次元電子国土基本図と組み合わせる場合、以下のような実装となっている
|ZL|データソース|レイヤ一覧|
|:-:|:-|:-|
|14 |最適化ベクトルタイル+標高タイル | "contour", "road", "railway", "waterarea", "border", "building", "symbol"|
|15 |3次元電子国土基本図 | "BldA", "RailTrCL", "RdCL"|


## 課題

### 0 m 以下の建物とパフォーマンス

* 0 m 以下の建物を表示するには、MapLibre の fill-extrusion ではなく、deck.gl の SolidPolygon を使う必要がある
* 一方、パフォーマンスは fill-extrusion の方が良さそう
	* 未検証だが、通常は fill-extrusion を用いて、0 m 以下となる建物のみ、 SolidPolygon を使うという手はある

### レイヤの制御

* 注記の文字が、建物（MapLibre のネイティブレイヤ（fill-extrusion）使用）よりも下に表示されてしまう
* 動くたびにレイヤを一式作成しなおしているため、動かすたびにデータが一瞬消えてしまってうるさい

#### 解消

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
