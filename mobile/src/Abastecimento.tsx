import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Abastecimento({ navigation }) {
  const [litros, setLitros] = useState('');
  const [valor, setValor] = useState('');

  const handleSalvar = () => {
    alert('Abastecimento registrado!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Registrar Abastecimento</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Quantidade de Litros</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 50"
          keyboardType="numeric"
          value={litros}
          onChangeText={setLitros}
        />

        <Text style={styles.label}>Valor Total (R$)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 250.00"
          keyboardType="numeric"
          value={valor}
          onChangeText={setValor}
        />

        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>Salvar Registro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 15, color: '#1E2937' },
  form: { padding: 20 },
  label: { fontSize: 16, color: '#64748B', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16
  },
  button: {
    backgroundColor: '#F59E0B',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});