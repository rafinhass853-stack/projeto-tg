import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase'; // <-- Caminho corrigido aqui

const Login = () => {
  const [cpfOrEmail, setCpfOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let email = cpfOrEmail.trim();

    // Se for CPF (11 números), converte para email
    if (/^\d{11}$/.test(email.replace(/\D/g, ''))) {
      const cleanCPF = email.replace(/\D/g, '');
      email = `${cleanCPF}@tglogistica.com`;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as string | undefined;

      if (role === 'gestor') {
        alert('✅ Login realizado com sucesso! Bem-vindo ao Painel do Gestor.');
      } else if (role === 'motorista') {
        setError('Este é o Painel do Gestor. Use o App Mobile para motoristas.');
        await auth.signOut();
      } else {
        setError('Usuário sem permissão definida. Contate o administrador.');
        await auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      setError('CPF/Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/src/assets/tg-logo.png" alt="TG Logística" style={styles.logoImage} />
          <p style={styles.subtitle}>Painel do Gestor</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email ou CPF</label>
            <input
              type="text"
              placeholder="seuemail@tglogistica.com.br"
              value={cpfOrEmail}
              onChange={(e) => setCpfOrEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Entrando...' : 'ENTRAR NO PAINEL'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E2A44', padding: '20px' },
  card: { backgroundColor: '#ffffff', padding: '50px 40px', borderRadius: '20px', boxShadow: '0 15px 40px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '440px', textAlign: 'center' },
  logoContainer: { marginBottom: '40px' },
  logoImage: { width: '220px', height: 'auto', marginBottom: '12px' },
  subtitle: { fontSize: '19px', color: '#FFC400', fontWeight: '600', margin: 0 },
  form: { width: '100%' },
  inputGroup: { marginBottom: '28px', textAlign: 'left' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '15.5px' },
  input: { width: '100%', padding: '15px 18px', fontSize: '17px', border: '1px solid #ccc', borderRadius: '10px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '17px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#FFC400', color: '#2D5795', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  error: { color: '#d32f2f', textAlign: 'center', margin: '12px 0', fontWeight: '500' },
};

export default Login;
