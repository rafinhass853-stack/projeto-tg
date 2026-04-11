import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Imports das telas
import LoginScreen from './src/LoginScreen';
import MenuMotorista from './src/MenuMotorista';
import HistoricoViagens from './src/HistoricoViagens';
import Abastecimento from './src/Abastecimento';
import Hodometro from './src/Hodometro';
import Escala from './src/Escala';
import Chat from './src/Chat';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />

        <Stack.Screen 
          name="MenuMotorista" 
          component={MenuMotorista}
          options={{ gestureEnabled: false }}
        />

        <Stack.Screen name="HistoricoViagens" component={HistoricoViagens} />
        <Stack.Screen name="Abastecimento" component={Abastecimento} />
        <Stack.Screen name="Hodometro" component={Hodometro} />
        <Stack.Screen name="Escala" component={Escala} />
        <Stack.Screen name="Chat" component={Chat} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}