import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';

const LoginScreen = ({ navigation }: any) => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatCPF = (text: string): string => {
    let value = text.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return value;
  };

  const handleLogin = async () => {
    if (!cpf || !password) {
      Alert.alert('Erro', 'Por favor, preencha CPF e senha.');
      return;
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      Alert.alert('Erro', 'CPF inválido. Digite 11 números.');
      return;
    }

    const email = `${cleanCPF}@tglogistica.com`;

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('Home'); // Vai para a tela Home
    } catch (error: any) {
      console.error(error);
      let message = 'Erro ao fazer login. Tente novamente.';

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        message = 'CPF ou senha incorretos.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'Usuário não encontrado.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'CPF inválido.';
      }

      Alert.alert('Falha no login', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Ionicons name="truck" size={90} color="#0A1F3D" />
          <Text style={styles.title}>TG Logística</Text>
          <Text style={styles.subtitle}>Aplicativo do Motorista</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>CPF</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              value={cpf}
              onChangeText={(text) => setCpf(formatCPF(text))}
              maxLength={14}
            />
          </View>

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.loginButtonText}>ENTRAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0A1F3D',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  loginButton: {
    backgroundColor: '#0A1F3D',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;