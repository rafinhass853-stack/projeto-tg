import React, { useState, useEffect } from 'react';
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
  ImageBackground,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvarSenha, setSalvarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);

  // Carregar credenciais salvas ao iniciar
  useEffect(() => {
    carregarCredenciais();
  }, []);

  const carregarCredenciais = async () => {
    try {
      const emailSalvo = await AsyncStorage.getItem('@tg_email');
      const senhaSalva = await AsyncStorage.getItem('@tg_senha');
      const manterSalvo = await AsyncStorage.getItem('@tg_manter_conectado');
      const salvarSenhaSalvo = await AsyncStorage.getItem('@tg_salvar_senha');

      if (salvarSenhaSalvo === 'true' && emailSalvo && senhaSalva) {
        setEmail(emailSalvo);
        setPassword(senhaSalva);
        setSalvarSenha(true);
      }
      
      if (manterSalvo === 'true') {
        setManterConectado(true);
        // Se manter conectado estiver ativo, tentar login automático
        if (emailSalvo && senhaSalva) {
          setTimeout(() => {
            realizarLogin(emailSalvo, senhaSalva);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    }
  };

  const salvarCredenciais = async (emailSalvo: string, senhaSalva: string) => {
    try {
      if (salvarSenha) {
        await AsyncStorage.setItem('@tg_email', emailSalvo);
        await AsyncStorage.setItem('@tg_senha', senhaSalva);
        await AsyncStorage.setItem('@tg_salvar_senha', 'true');
      } else {
        await AsyncStorage.removeItem('@tg_email');
        await AsyncStorage.removeItem('@tg_senha');
        await AsyncStorage.setItem('@tg_salvar_senha', 'false');
      }
      
      await AsyncStorage.setItem('@tg_manter_conectado', manterConectado ? 'true' : 'false');
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
    }
  };

  const realizarLogin = async (emailLogin: string, senhaLogin: string) => {
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailLogin, senhaLogin);
      const user = userCredential.user;

      await salvarCredenciais(emailLogin, senhaLogin);

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

    await realizarLogin(email, password);
  };

  return (
    <ImageBackground 
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
            {/* Logo substituída pela imagem tg-logo.png */}
            <Image 
              source={require('../assets/tg-logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
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

            {/* Opções de Salvar Senha e Manter Conectado */}
            <View style={styles.optionsContainer}>
              <View style={styles.optionRow}>
                <View style={styles.optionItem}>
                  <Switch
                    value={salvarSenha}
                    onValueChange={setSalvarSenha}
                    trackColor={{ false: '#ccc', true: '#2D5795' }}
                    thumbColor={salvarSenha ? '#fff' : '#f4f3f4'}
                  />
                  <Text style={styles.optionText}>Salvar senha</Text>
                </View>

                <View style={styles.optionItem}>
                  <Switch
                    value={manterConectado}
                    onValueChange={setManterConectado}
                    trackColor={{ false: '#ccc', true: '#2D5795' }}
                    thumbColor={manterConectado ? '#fff' : '#f4f3f4'}
                  />
                  <Text style={styles.optionText}>Manter conectado</Text>
                </View>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 25,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
  optionsContainer: {
    marginBottom: 20,
    marginTop: 5,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#2D5795',
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