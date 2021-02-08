import React, { Component } from "react";
import { StyleSheet, View, Text, Button,Platform} from "react-native";
import MapboxGL from "@react-native-mapbox-gl/maps";
import AsyncStorage from '@react-native-community/async-storage';
//Access token to Mapbox dont use mine
MapboxGL.setAccessToken("MAPBOX API KEY");

export default class Map extends Component {
    constructor(props){
      super(props);

      this.state = {
        centering: true,
        buttonTitle: "Me",
      }
    }
  
    componentDidMount() {
      MapboxGL.setTelemetryEnabled(false);
    }

    /**
     * On tap Me button centers around the user
     */
    clickedButton(){
      this.setState({centering: false}, ()=>{this.setState(this.setState({centering:true}))});
    }
    /**
     * Draws route from stored route in memory. Very specific syntax 
     */
    async loadButton(){
      var run = await AsyncStorage.getItem('run');
      if(run == null){
        this.props.changeLoaded(false);
        this.props.changeRoute({
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
        });
        this.props.changeRouteData(null);
      }
      else{
        this.props.changeLoaded(true);
        this.props.changeRouteData(JSON.parse(run));
        var ind = run.search('\"LineString\",');
        run = run.slice(0,ind+12);
        run = run+'}';
        run = JSON.parse(run);
        this.props.changeRoute(run);
      }
    }
    /**
     * Displays map and Me / load buttons
     */
    render() {
      return (
          <View style={styles.container}>
            <MapboxGL.MapView
            style={{flex: 9}}
            ref={(c) => this._map = c}
            textureMode={true}
            >
            <MapboxGL.Camera
              defaultSettings={{
                centerCoordinate: [0,0],
                zoomLevel: 17,
              }} 
              followUserLocation={this.state.centering}
              followZoomLevel={17}
              followUserMode="normal"
            />
            <MapboxGL.UserLocation/>

            <MapboxGL.ShapeSource id='line1' shape={this.props.route}>
              <MapboxGL.LineLayer id='linelayer1' style={{lineColor:'red'}} />
            </MapboxGL.ShapeSource>

            </MapboxGL.MapView>

            <Button title={this.state.buttonTitle} style={{flex:1}} onPress={this.clickedButton.bind(this)}>
            </Button>
            <Button title="load route" color="#00ff01" style={{flex:1}} onPress={this.loadButton.bind(this)}>
            </Button>

          </View>
      );
    }
}
const styles = StyleSheet.create({
  container: {
    flex : 1,
    backgroundColor: "white",
  },
});
