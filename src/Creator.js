import React, { Component } from "react";
import { StyleSheet, View,Text, Button } from "react-native";
import MapboxGL from "@react-native-mapbox-gl/maps";
import AsyncStorage from '@react-native-community/async-storage';

//MAPBOX API KEY dont use mine
MapboxGL.setAccessToken("MAPBOX API KEY");
//loads scaler
const scaler = require('../assets/scaler.json');

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex:1,
    backgroundColor: "white",
  },
});

export default class Creator extends Component {
  
  constructor(){
    super();
    this.state = {
      coordinates: [],
      drawing : false,
      pointCpt : 0,
      route : {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {},
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  0,0
                ],
                [
                  0,0
                ]
              ]
            }
          }
        ]
      },
    };
    this.onPress = this.onPress.bind(this);
  }

  componentDidMount() {
    MapboxGL.setTelemetryEnabled(false);
  }
  
  /**
   * Request path from mapbox api and changes state route to draw map
   */
  getPath(){
    const Http = new XMLHttpRequest();
    var url = "https://api.mapbox.com/directions/v5/mapbox/walking/";
    for (let i = 0; i < this.state.coordinates.length; i++) {//adds the given points
      if(i!=0){
        url+=';'
      }
      url += this.state.coordinates[i][0] +',' + this.state.coordinates[i][1];
    }
    url += "?geometries=geojson&access_token=MAPBOX API KEY&overview=full";
    Http.open("GET", url);
    Http.send();
    Http.onreadystatechange = () => { //when receive response change state route
      if (Http.readyState == 4 && Http.status == 200) { 
        var ans = JSON.parse(Http.responseText);
        const directions = ans.routes[0].geometry;
        this.setState({route:directions});
      }
    }
  }

  /**
   * listen to press on screen to add markers
   */
  onPress(feature) {
    if(this.state.drawing){//if in drawing mode (click on add point button)
      const coords = Object.assign([], this.state.coordinates);
      coords.push(feature.geometry.coordinates);
      
      this.setState({coordinates: coords, drawing: false}, ()=>{//draws path if more than 1 point drawn
        if(this.state.coordinates.length >1){
          this.getPath()
        }
      });

    }
  }

  /**
   * allows the user to press on the screen to draw a point
   */
  drawingMode() {
    if(!this.state.drawing && this.state.pointCpt <=20){
      this.setState({drawing: true,pointCpt : this.state.pointCpt +1});
    }    
  }
  
  /**
   * reset route creation
   */
  async clearPoints(){
    this.setState({coordinates: [],route : {//draws invisible default route
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [
                0,0
              ],
              [
                0,0
              ]
            ]
          }
        }
      ]
    }});
    await AsyncStorage.setItem('run',"");//reset the previous route
  }

  /**
   * Saves drawn map
   */
  async saveRoute(){
    if(this.state.coordinates.length > 1 ){//if a path is drawn
      await AsyncStorage.setItem('run',"");//reset the stored data on the phone
      const Http = new XMLHttpRequest();//Api request for elevation data
      var url = 'https://api.airmap.com/elevation/v1/ele?points=';
      var points = this.state.route.coordinates;
      for (var i=0; i<points.length; i++) {
          url += points[i][1] + ',' + points[i][0];
          if (i < points.length-1) url += ',';
      }
      Http.open("GET", url);
      Http.setRequestHeader('X-API-Key', 'AIRMAP API KEY');
      Http.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
      Http.send();
  
      Http.onreadystatechange = async () => {//on elevation data received
        if (Http.readyState == 4 && Http.status == 200) { 
          var runData = JSON.stringify(this.state.route);
          runData = runData.slice(0,-1);
          runData = runData + ',';
          
          var dist = '\"distance\":[0.0,';
          var len = this.state.route.coordinates.length;
          var sumDist = 0;
          for (let i = 1; i < len; i++) {
             sumDist += this.getDistance(this.state.route.coordinates[i][1],this.state.route.coordinates[i][0],this.state.route.coordinates[i-1][1],this.state.route.coordinates[i-1][0]);
             dist = dist + sumDist;
             if(i != len-1){
              dist = dist + ',';
            }
          }
          dist = dist + '],';
          runData = runData + dist;
          dist = JSON.parse('{'+dist.slice(0, -1)+'}');
          var ans = JSON.parse(Http.responseText);
          ans = ans.data;

          var denN = ','+((0-scaler.mean[5])/scaler.scale[5])+'],'; // scale some data directly for optimization purposes
          var denP = ','+((0-scaler.mean[6])/scaler.scale[6])+'],';
          var slope = ','+((0-scaler.mean[2])/scaler.scale[2])+'],';
          var sumDenN = 0.0;
          var sumDenP = 0.0;
          for (let i = len-1;i>0;i--){
            if(ans[i]-ans[i-1]<0){
              sumDenN += (ans[i]-ans[i-1]);
            }else{
              sumDenP += (ans[i]-ans[i-1]);
            }
            denN = ((sumDenN-scaler.mean[4])/scaler.scale[4]).toString() + denN;
            denP = ((sumDenP-scaler.mean[5])/scaler.scale[5]).toString() + denP;
            slope = ((this.getSlope(ans[i-1], ans[i],dist.distance[i]-dist.distance[i-1])-scaler.mean[1])/scaler.scale[1]).toString() + slope;
            if(i!=1){
              denN = ',' + denN;
              denP = ',' + denP;
              slope = ',' + slope;
            }
          }
          denN = '\"denN\":['+denN;
          denP = '\"denP\":['+denP;
          slope = '\"slope\":['+slope;
          ans = JSON.stringify(ans);
          ans = ans.slice(1);
          ans = '\"elevation\":[' + ans + '}';
          runData = runData + denN + denP + slope + ans;
          console.log(runData);
          await AsyncStorage.setItem('run',runData);//store points, distances and elevation
        }
      }
    }
  }

  /**
   * Given 2 geo points return the distance between them (in m)
   * @param lat1 
   * @param lon1 
   * @param lat2 
   * @param lon2 
   */
  getDistance(lat1, lon1, lat2, lon2) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
      return 0;
    }
    else {
      var radlat1 = Math.PI * lat1/180;
      var radlat2 = Math.PI * lat2/180;
      var theta = lon1-lon2;
      var radtheta = Math.PI * theta/180;
      var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      if (dist > 1) {
        dist = 1;
      }
      dist = Math.acos(dist);
      dist = dist * 180/Math.PI;
      dist = dist * 60 * 1.1515;
      dist = dist * 1609.344
      return dist;
    }
  }

  /**
   *
   * @param alt1 
   * @param alt2 
   * @param dist 
   * @returns slope
   */
  getSlope(alt1, alt2,dist){
    var delta_e = alt2 - alt1;
    if(dist == 0){
      return 0;
    }else{
      return (delta_e/dist) *100;
    }
  }
  
  /**
   * Draws the marker on the map for a given point
   * @param counter 
   */
  renderAnnotation (counter) {
    const id = `pointAnnotation${counter}`;
    const coordinate = this.state.coordinates[counter];
    const title = `Longitude: ${this.state.coordinates[counter][0]} Latitude: ${this.state.coordinates[counter][1]}`;

    return (
      <MapboxGL.PointAnnotation
        key={id}
        id={id}
        title='A'
        coordinate={coordinate}>
      </MapboxGL.PointAnnotation>
    );
  }

  /**
   * Draws all the markers on the map
   */
  renderAnnotations () {
    const items = [];

    for (let i = 0; i < this.state.coordinates.length; i++) {
      items.push(this.renderAnnotation(i));
    }

    return items;
  }
  /**
  * render map, route, pins and Save route / AddPoint / ClearPoints buttons
  */
  render() {
    return (
        <View style={styles.container}>
          <Button title="save route" color="#00ff01" style={{flex:1}} onPress={this.saveRoute.bind(this)}>
          </Button>
          <MapboxGL.MapView style={{flex:9}}
          ref={(c) => (this._map = c)}
          onPress={this.onPress}>
          <MapboxGL.Camera
              defaultSettings={{
                centerCoordinate: [0,0],
                zoomLevel: 13,
              }} 
              followUserLocation={true}
              followZoomLevel={13}
              followUserMode="normal"
            />
          <MapboxGL.UserLocation/>
          {this.renderAnnotations()}

          <MapboxGL.ShapeSource id='line1' shape={this.state.route}>
            <MapboxGL.LineLayer id='linelayer1' style={{lineColor:'red'}} />
          </MapboxGL.ShapeSource>

          </MapboxGL.MapView>
          <Button title="add point" style={{flex:1}} onPress={this.drawingMode.bind(this)}>
          </Button>
          <Button title="clear points" color="#ff0001" style={{flex:1}} onPress={this.clearPoints.bind(this)}>
          </Button>
        </View>

    );
  }
}
