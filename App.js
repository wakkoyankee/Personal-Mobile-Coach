import React from "react";
import { View} from "react-native";
import Activity from "./src/Activity";
import Creator from "./src/Creator"
import {NavigationContainer} from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
//All the code is in src file

function HomeScreen() {
  // activity screen
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Activity></Activity>
    </View>
  );
}

function MapCreator() {
  //route creation screen
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Creator></Creator>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  //Starts the app and creates two screen with tab navigator
  return ( 
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen
            name="Home"
            options={{
              title: "Run",
            }}
            component={HomeScreen}/>
          <Tab.Screen name="MapCreator" component={MapCreator}/>
        </Tab.Navigator>
      </NavigationContainer>
    );
}
