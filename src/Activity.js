import React from 'react';
import Timer from "./Timer";
import {View,StyleSheet} from "react-native";
import BgTracking from './BgTracking';
import Map from "./Map";
import ModelManager from './Ml';

//Parent componenent of all the components in activity screen
export default class Activity extends React.Component{

    constructor(){
        super();
        this.incrementTime = this.incrementTime.bind(this);
        this.resetTime = this.resetTime.bind(this);
        this.changeActive = this.changeActive.bind(this);
        this.changeReset = this.changeReset.bind(this);
        this.changeRoute = this.changeRoute.bind(this);
        this.changeLoaded = this.changeLoaded.bind(this);
        this.changeRouteData = this.changeRouteData.bind(this);
        this.changeTime = this.changeTime.bind(this);
        this.Manager = ModelManager.getInstance();
    }
    //Draws invisible route and set default state values
    state = {
        time:0,
        modelready:false,
        isActive:false,
        reset: false,
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
        isLoaded: false,
        routeData: null,
    }
  
    /**
     * waits until TFJS and model are loaded
     */
    async pred(){
      await this.Manager.Load();
      this.setState({modelready:true});
    }

    /**
     * Adds  second to time state
     */
    incrementTime(){
        this.setState({time:this.state.time +1});
    }

    /**
     * Resets time state to 0
     */
    resetTime(){
        this.setState({time:0,reset:true});
    }
    
    /**
     * Changes isActive with given boolean value
     * @param bool 
     */
    changeActive(bool){
        this.setState({isActive: bool});
    }

    /**
     * Changeds time state with given value. This is due to the Freeze on calling the model prediction
     * @param newTime 
     */
    changeTime(newTime){
      this.setState({time:newTime});
    }

    /**
     * Change reset state with given boolean value
     * @param bool 
     */
    changeReset(bool){
      this.setState({reset: bool});
    }

    /**
     * Change route state with given route. Look at initialisation of route state to see the given value format.
     * @param rt 
     */
    changeRoute(rt){
        this.setState({route:rt});
    }

    /**
     * Changes isLoaded state with given boolean value
     * @param bool 
     */
    changeLoaded(bool){
        this.setState({isLoaded: bool});
    }

    /**
     * Changes recording state with given boolean value
     * @param bool 
     */
    changeRecording(bool){
        this.setState({recording: bool});
    }

    /**
     * Changes routeData value with the information gotten in route creation screen
     * @param data 
     */
    changeRouteData(data){
      this.setState({routeData: data});
    }
    
    /**
     * Loads TFJS and Model
     * Displays timer , bgTracking and map
     * Give these child components the states and functions they need
     */
    render(){
        if(this.state.modelready == false){
          this.pred();
        }
        return(
            <View style={{...StyleSheet.absoluteFillObject}}>
                <Timer incrementTime={this.incrementTime} 
                  resetTime={this.resetTime} 
                  time={this.state.time} 
                  changeActive={this.changeActive} 
                  isLoaded={this.state.isLoaded} 
                  changeLoaded={this.changeLoaded}>
                </Timer>

                <BgTracking isActive={this.state.isActive}
                  time={this.state.time}
                  reset = {this.state.reset}
                  changeReset = {this.changeReset} 
                  routeData={this.state.routeData}
                  changeTime={this.changeTime}>
                </BgTracking>

                <Map route={this.state.route}
                  changeRoute={this.changeRoute} 
                  changeLoaded={this.changeLoaded} 
                  changeRouteData={this.changeRouteData}>
                </Map>
            </View>
        );
    }
}