import React, {Component} from 'react';
import {Alert} from 'react-native';
import {Text,StyleSheet,View} from "react-native";
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';
import ModelManager from './Ml';
//loads scaler values
const scaler = require('../assets/scaler.json');

class BgTracking extends Component {
  //All the data recordings that we need and more
  state = {
    prev_loc : null,
    prev_alt: null,
    distance : [],
    slope:[],
    time:[],
    altitude : [],
    denN : [],
    denP : [],
    remainingDist : [],
    difdist: [],
    index :-1,
    currSpeed: 0,
    routeIndex : 0,
    cumDist : 0,
    tenSegment: 0,
    denIndex : 0,
    firstTime : 0,
    arrTimeHour: 0,
    arrTimeMin : 0,
    arrTimeSec : 0,
    finished : true,
  }
  constructor(props){
    super(props);
    this.Manager = ModelManager.getInstance();
  }
  
  /**
   * Gives the distance between 2 geolographic points
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
   * Gives slope between 2 points
   * @param alt1 
   * @param alt2 
   * @param dist 
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
  * /!\ VERY IMPORTANT
  * Every thing here is based on distance travelled. We continously count the total distance travelled regardless of where the runner is.
  * From the total distance travelled we link to the route made in the route creation screen
  * There to get the next data / future data we take the closest bigger distance from the layout. And from this we get the next den,slope, ....
  * We just trust that the runner will follow the right path
  * @param dist 
  */
  getRemainingDen(dist){//get closest bigger distance from the layout
      var tmpInd= this.state.denIndex+1;
      if(tmpInd >=len-1){return}//handle out of index of the end 
      var min = this.props.routeData.distance[tmpInd-1] - dist;
      if(min <0){
        min = 10000;
      }
      var len = this.props.routeData.distance.length;
      for(let i = tmpInd; i< len; i++){
        var newMin = Math.abs(dist - this.props.routeData.distance[i]);
        if (newMin<min){
          min = newMin;
          tmpInd = i;
        }
        else{
          if(i == tmpInd){return}//no need to update
          break;
        }
      }
      this.setState({denIndex : tmpInd});
  }

  /**
   * Prepares the input data and calls the prediction
   * Then changes the expected time state with the result
   */
  async Prediction(){

    /*scaler order : time, slope, distance, rdist, denN, denP, diftime, difdist*/
    var ind = this.state.denIndex //where we are in the route data
    
    var currentPoint = this.state.distance.length; //where we are in the recording

    var tmpDist = this.state.distance.slice(currentPoint- 49); //takes the last 49 values
    var tmpRdist= this.state.remainingDist.slice(currentPoint - 49);
    var tmpDifdist = this.state.difdist.slice(currentPoint - 49);

    var nextdist = this.props.routeData.distance[ind]; //get next dist
    if(nextdist < tmpDist[tmpDist.length-1]){
      ind = ind +1;
      if(this.props.routeData.distance.length<= ind+1){return;}
      nextdist = this.props.routeData.distance[ind+1];
    }


    
    tmpDifdist.push(nextdist - tmpDist[tmpDist.length-1])//adds next distance
    tmpDist.push(nextdist);
    tmpRdist.push(this.state.remainingDist[0]- nextdist);
    
    var tmpTime = this.state.time.slice(currentPoint - 50);//takes the last 50 values
    
    var tmpSlope = this.state.slope.slice(currentPoint - 50); //already scaled
    var tmpdenN = this.state.denN.slice(currentPoint - 50);//already scaled
    var tmpdenP = this.state.denP.slice(currentPoint - 50);//already scaled
 

    tmpDist = tmpDist.map(x => (x - scaler.mean[2])/scaler.scale[2]); //scaling the others
    tmpRdist = tmpRdist.map(x => (x - scaler.mean[3])/scaler.scale[3]);
    tmpTime = tmpTime.map(x => (x - scaler.mean[0])/scaler.scale[0]);
    tmpDifdist = tmpDifdist.map(x => (x - scaler.mean[7])/scaler.scale[7]);


    /*input order : time, slope, distance, rdist, denN, denP, difdist*/
    var input = [] // First input
    for (let i = 0; i < tmpDist.length; i++){
      input.push([tmpTime[i],tmpSlope[i],tmpDist[i],tmpRdist[i],tmpdenN[i],tmpdenP[i],tmpDifdist[i]]);
    }
    var res  = await this.Manager.getPrediction(input); // First result

    for(let i = ind+1; i< this.props.routeData.distance.length;i++){//all future values
      input = input.slice(1);//deletes all first values of every feature from the input

      var tmp = (((input[48][0] *scaler.scale[0] + scaler.mean[0]) + (res *scaler.scale[6] + scaler.mean[6])) - scaler.mean[0]) / scaler.scale[0]; //get the predicted time
      input.push([tmp,
                this.props.routeData.slope[i],
                (this.props.routeData.distance[i]- scaler.mean[2])/scaler.scale[2],
                (this.state.remainingDist[0] - this.props.routeData.distance[i]- scaler.mean[4])/scaler.scale[4],
                this.props.routeData.denN[i],
                this.props.routeData.denP[i],
                (this.props.routeData.distance[i] - (input[48][2] * scaler.scale[2] + scaler.mean[2]) - scaler.mean[7]) /scaler.scale[7] ]);
      //make the new input and calls prediction
      res = await this.Manager.getPrediction(input);
    }

    var pred = ((input[49][0] *scaler.scale[0] + scaler.mean[0]) + (res *scaler.scale[6] + scaler.mean[6])); //get final result
    //console.log(pred);
    //updates UI with result
    this.setState({arrTimeHour : parseInt(pred/3600), arrTimeMin : parseInt((pred%3600)/60), arrTimeSec : parseInt(pred%60), finished:true});
  }

  /**
   * When geolocation system detects mouvement get the new location and record the data
   * @param location 
   */
  record(location){
    if(this.props.reset == true){ // when not running reinitialise everything
      this.setState({index : -1,distance : [], time : [], slope:[], altitude:[], remainingDist: [], denN: [], denP: [], difdist: [], denIndex:0});
      this.props.changeReset(false);
    }
    if(this.state.index == -1){//first recording
      console.log('beginning of the run');
      this.setState( state => ({
        distance: state.distance.concat(0.0),
        difdist : state.difdist.concat(0.0),
        time: state.time.concat(0),
        firstTime: location.time,
        slope : state.slope.concat(this.props.routeData.slope[0]),
        altitude : state.altitude.concat(location.altitude),
        remainingDist : state.remainingDist.concat(this.props.routeData.distance[this.props.routeData.distance.length-1]),
        denN : state.denN.concat(this.props.routeData.denN[0]),
        denP : state.denP.concat(this.props.routeData.denP[0]),
      }));
      this.setState({index : this.state.index +1});
      this.setState({prev_loc : [location.latitude,location.longitude], prev_alt: location.altitude});
    }
    else{
      this.props.changeTime((location.time - this.state.firstTime)/1000); //update time
      var dist = this.getDistance(location.latitude,location.longitude,this.state.prev_loc[0],this.state.prev_loc[1]);//difference in distance
      var travDist = this.state.distance[this.state.index]+dist;//total travelled distance
      if(travDist >= this.state.tenSegment){ //if in the 10 meters segment records data
        this.setState({tenSegment : Math.ceil(travDist/10+0.001)*10});
        var sp = (dist)/ ((location.time - this.state.firstTime)/1000 - this.state.time[this.state.time.length-1]);
        this.getRemainingDen(travDist);
        this.setState({
          distance : this.state.distance.concat([travDist]),
          difdist : this.state.difdist.concat(dist),
          time: this.state.time.concat((location.time - this.state.firstTime)/1000),
          currSpeed :Math.round(sp*100)/100,
          slope : this.state.slope.concat(this.props.routeData.slope[this.state.denIndex]),
          altitude : this.state.altitude.concat(location.altitude),
          remainingDist:this.state.remainingDist.concat(this.props.routeData.distance[this.props.routeData.distance.length-1]-travDist),
          denN : this.state.denN.concat(this.props.routeData.denN[this.state.denIndex]),
          denP : this.state.denP.concat(this.props.routeData.denP[this.state.denIndex]),
        });
        
        this.setState({index : this.state.index +1});

        this.setState({prev_loc : [location.latitude,location.longitude], prev_alt: location.altitude});
        if(this.state.distance.length%50 == 0 && this.state.finished == true){ // if enough new data starts prediction
          this.setState({finished : false});
          this.Prediction();
        }
      }

      }
  }

  /**
   * Geolocation library code
   */
  componentDidMount() {
    BackgroundGeolocation.configure({
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 5,
      distanceFilter: 1,
      notificationTitle: 'Background tracking',
      notificationText: 'disabled',
      debug: false,
      startOnBoot: false,
      stopOnTerminate: true,
      locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
      interval: 5000,
      fastestInterval: 3000,
      activitiesInterval: 5000,
      stopOnStillActivity: false,
      url: 'http://192.168.81.15:3000/location',
      httpHeaders: {
        'X-FOO': 'bar'
      },
      // customize post properties
      postTemplate: {
        lat: '@latitude',
        lon: '@longitude',
        foo: 'bar' // you can also add your own properties
      }
    });

    BackgroundGeolocation.on('location', (location) => {
      // handle your locations here
      // to perform long running operation on iOS
      // you need to create background task
      
      if(this.props.isActive){
        this.record(location);
        //location.altitude
      }
      

      //this.setState({currSpeed: Math.round(location.speed*100)/100});
      BackgroundGeolocation.startTask(taskKey => {
        // execute long running task
        // eg. ajax post location
        // IMPORTANT: task has to be ended by endTask
        BackgroundGeolocation.endTask(taskKey);
      });
    });

    BackgroundGeolocation.on('stationary', (stationaryLocation) => {
      // handle stationary locations here
      Actions.sendLocation(stationaryLocation);
    });

    BackgroundGeolocation.on('error', (error) => {
      console.log('[ERROR] BackgroundGeolocation error:', error);
    });

    BackgroundGeolocation.on('start', () => {
      console.log('[INFO] BackgroundGeolocation service has been started');
    });

    BackgroundGeolocation.on('stop', () => {
      console.log('[INFO] BackgroundGeolocation service has been stopped');
    });

    BackgroundGeolocation.on('authorization', (status) => {
      console.log('[INFO] BackgroundGeolocation authorization status: ' + status);
      if (status !== BackgroundGeolocation.AUTHORIZED) {
        // we need to set delay or otherwise alert may not be shown
        setTimeout(() =>
          Alert.alert('App requires location tracking permission', 'Would you like to open app settings?', [
            { text: 'Yes', onPress: () => BackgroundGeolocation.showAppSettings() },
            { text: 'No', onPress: () => console.log('No Pressed'), style: 'cancel' }
          ]), 1000);
      }
    });

    BackgroundGeolocation.on('background', () => {
      console.log('[INFO] App is in background');
    });

    BackgroundGeolocation.on('foreground', () => {
      console.log('[INFO] App is in foreground');
    });

    BackgroundGeolocation.on('abort_requested', () => {
      console.log('[INFO] Server responded with 285 Updates Not Required');

      // Here we can decide whether we want stop the updates or not.
      // If you've configured the server to return 285, then it means the server does not require further update.
      // So the normal thing to do here would be to `BackgroundGeolocation.stop()`.
      // But you might be counting on it to receive location updates in the UI, so you could just reconfigure and set `url` to null.
    });

    BackgroundGeolocation.on('http_authorization', () => {
      console.log('[INFO] App needs to authorize the http requests');
    });

    BackgroundGeolocation.checkStatus(status => {
      console.log('[INFO] BackgroundGeolocation service is running', status.isRunning);
      console.log('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled);
      console.log('[INFO] BackgroundGeolocation auth status: ' + status.authorization);

      // you don't need to check status before start (this is just the example)
      //if (!status.isRunning && this.props.isActive) {
        //BackgroundGeolocation.start(); //triggers start on start event
      //}
    });
      // you can also just start without checking for status
      // BackgroundGeolocation.start();
    BackgroundGeolocation.start();
  }

  componentWillUnmount() {
    // unregister all event listeners
    BackgroundGeolocation.removeAllListeners();
  }
  
  /**
   * shows current speed and expected arrival time
   */
  render(){
    return(
    <View style={styles.container}>
    <Text>Current speed: {this.state.currSpeed} m/s</Text>
    <Text>Expected arrival time: {(this.state.arrTimeHour<=9?`0${this.state.arrTimeHour}`: this.state.arrTimeHour)+"h "+(this.state.arrTimeMin<=9?`0${this.state.arrTimeMin}`: this.state.arrTimeMin) +"m "+(this.state.arrTimeSec<=9?`0${this.state.arrTimeSec}`: this.state.arrTimeSec)+"s"}</Text>
    </View>
    );
  }
}

export default BgTracking;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
