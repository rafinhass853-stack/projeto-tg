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
  ImageBackground, // Importado para o fundo
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha o email e a senha.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Por favor, digite um email válido.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      Alert.alert('Sucesso', `Bem-vindo!`);

      navigation.replace('MenuMotorista', {
        userId: user.uid,
        email: user.email,
      });

    } catch (error: any) {
      console.error('Erro no login:', error);
      let message = 'Erro ao fazer login. Tente novamente.';

      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          message = 'Email ou senha incorretos.';
          break;
        case 'auth/user-not-found':
          message = 'Usuário não encontrado. Verifique seu email.';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido.';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
          break;
        default:
          message = 'Ocorreu um erro inesperado. Tente novamente.';
      }

      Alert.alert('Falha no login', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
     // O ../ significa: sair da pasta 'src' e procurar a pasta 'assets' na raiz
source={require('../assets/tg-estrada.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoContainer}>
            {/* Ícone branco para destacar no fundo escuro */}
            <Ionicons name="bus" size={80} color="#fff" />
            <Text style={styles.title}>TG Logística</Text>
            <Text style={styles.subtitle}>Aplicativo do Motorista</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="seuemail@tglogistica.com.br"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite sua senha"
                placeholderTextColor="#999"
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
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>ENTRAR NO SISTEMA</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.footerText}>Sistema Seguro • Acesso Restrito</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flexGrow: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Camada escura para dar leitura sobre a foto
    justifyContent: 'center',
    padding: 25,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    marginTop: 4,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)', // Fundo branco levemente transparente
    borderRadius: 25,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1F3D',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  loginButton: {
    backgroundColor: '#2D5795', // Azul padrão da TG Logística
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2D5795',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footerText: {
    textAlign: 'center',
    color: '#fff',
    marginTop: 30,
    fontSize: 12,
    opacity: 0.8,
  }
});

export default LoginScreen;