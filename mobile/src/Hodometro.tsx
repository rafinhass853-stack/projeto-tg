import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Hodometro() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tela do Hodômetro em construção</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { fontSize: 18, color: '#333' }
});