import React from 'react';
import {View, Text, Button,StyleSheet, Alert} from 'react-native';
import BackgroundTimer from "react-native-background-timer";

export default class Timer extends React.Component {
    _interval: any;

    constructor(props){
        super(props);
        this.state = {
            secs:0,
            mins:0,
            startReady : true,
        }
    }
    /**
     * Starts the timer if route is traced
     */
    startTimer(){

        if (this.state.startReady && this.props.isLoaded){
            this._interval = BackgroundTimer.setInterval(()=>{
                this.props.incrementTime();
                this.setState({mins: Math.floor(this.props.time/60),})
                this.setState({secs: Math.round(this.props.time%60),})
                },
            1000);
            this.setState({startReady:false});
            this.props.changeActive(true);
        }
        else if (!this.props.isLoaded){
            Alert.alert(
                "Alert",
                "You have to load a route first !",
                [
                  { text: "OK", onPress: () => console.log("OK Pressed") }
                ],
                { cancelable: false }
              );
        }
    }

    /**
     * Pauses the timer but not fixed for ML
     */
    onPause(){
        BackgroundTimer.clearInterval(this._interval);
        this.setState({startReady:true});
        this.props.changeActive(false);
    }

    /**
     * Stops the timer and tracking
     */
    onReset = () => {
        this.props.resetTime();
        this.setState({mins:0,secs:0});
        BackgroundTimer.clearInterval(this._interval);
        this.setState({startReady:true});
        this.props.changeActive(false);
    }
    /**
     * Displays start / pause / stop buttons and timer
     */
    render(){
        return(
        <View style={styles.container}>
        <Text>{(this.state.mins<=9?`0${this.state.mins}`: this.state.mins) +":"+(this.state.secs<=9?`0${this.state.secs}`: this.state.secs)}</Text>
        <View style={styles.buttonWrapper}>
        <Button
        title="Start"
        onPress={this.startTimer.bind(this)}
        color="#7CFC00"
        />
        <Button
        title="Pause"
        onPress={this.onPause.bind(this)}
        color="#FFA500"
        />
        <Button
        title="STOP"
        onPress={this.onReset.bind(this)}
        color="#DC143C"
        />
        </View>
        </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center'
    },buttonWrapper: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-around',
    },secondText: {
      fontSize: 25,
    }
 });