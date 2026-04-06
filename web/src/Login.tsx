import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Carregar email salvo
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validação básica de email
    if (!email.includes('@') || !email.includes('.')) {
      setError('Por favor, insira um email válido');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as string | undefined;

      if (role === 'gestor') {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        showNotification('✅ Login realizado com sucesso! Redirecionando...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else if (role === 'motorista') {
        setError('⚠️ Este é o Painel do Gestor. Use o App Mobile para motoristas.');
        await auth.signOut();
      } else {
        setError('⚠️ Usuário sem permissão definida. Contate o administrador.');
        await auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('❌ Usuário não encontrado. Verifique seu email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('❌ Senha incorreta. Tente novamente.');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ Email inválido. Verifique o formato.');
      } else {
        setError('❌ Email ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 24px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 12px;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  return (
    <div style={containerStyle}>
      {/* Background com gradiente */}
      <div style={backgroundStyle}>
        <div style={gradientOrb1Style}></div>
        <div style={gradientOrb2Style}></div>
        <div style={gradientOrb3Style}></div>
      </div>

      {/* Card de Login */}
      <div style={cardStyle}>
        <div style={logoContainerStyle}>
          <div style={logoIconStyle}>🚛</div>
          <h1 style={logoTitleStyle}>TG Logística</h1>
          <p style={subtitleStyle}>Painel do Gestor de Frotas</p>
        </div>

        <form onSubmit={handleLogin} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              <span style={labelIconStyle}>📧</span>
              Email
            </label>
            <div style={inputWrapperStyle}>
              <input
                type="email"
                placeholder="seuemail@tglogistica.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'email' ? '#FFC400' : '#e2e8f0',
                  boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(255, 196, 0, 0.1)' : 'none'
                }}
                required
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              <span style={labelIconStyle}>🔒</span>
              Senha
            </label>
            <div style={inputWrapperStyle}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'password' ? '#FFC400' : '#e2e8f0',
                  boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(255, 196, 0, 0.1)' : 'none'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={togglePasswordStyle}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div style={optionsStyle}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={checkboxStyle}
              />
              <span style={checkboxTextStyle}>Lembrar-me</span>
            </label>
            <a href="#" style={forgotPasswordStyle}>Esqueceu a senha?</a>
          </div>

          {error && (
            <div style={errorContainerStyle}>
              <span style={errorIconStyle}>⚠️</span>
              <span style={errorTextStyle}>{error}</span>
            </div>
          )}

          <button type="submit" style={loading ? buttonDisabledStyle : buttonStyle} disabled={loading}>
            {loading ? (
              <>
                <span style={spinnerStyle}></span>
                Entrando...
              </>
            ) : (
              'ENTRAR NO PAINEL'
            )}
          </button>

          <div style={footerStyle}>
            <p style={footerTextStyle}>
              Sistema seguro • Acesso restrito à gestão
            </p>
            <div style={securityBadgeStyle}>
              <span style={securityIconStyle}>🔐</span>
              <span style={securityTextStyle}>Criptografia SSL</span>
            </div>
          </div>
        </form>
      </div>

      {/* Estilos de animação */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

// ==================== ESTILOS MODERNOS ====================
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif"
};

const backgroundStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  overflow: 'hidden'
};

const gradientOrb1Style: React.CSSProperties = {
  position: 'absolute',
  top: '-50%',
  right: '-20%',
  width: '80%',
  height: '80%',
  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
  borderRadius: '50%',
  animation: 'float 8s ease-in-out infinite'
};

const gradientOrb2Style: React.CSSProperties = {
  position: 'absolute',
  bottom: '-30%',
  left: '-10%',
  width: '60%',
  height: '60%',
  background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
  borderRadius: '50%',
  animation: 'float 10s ease-in-out infinite reverse'
};

const gradientOrb3Style: React.CSSProperties = {
  position: 'absolute',
  top: '20%',
  left: '20%',
  width: '40%',
  height: '40%',
  background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)',
  borderRadius: '50%',
  animation: 'pulse 6s ease-in-out infinite'
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  background: 'rgba(255, 255, 255, 0.98)',
  backdropFilter: 'blur(10px)',
  padding: '50px 45px',
  borderRadius: '32px',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
  width: '100%',
  maxWidth: '440px',
  margin: '20px',
  animation: 'slideIn 0.5s ease'
};

const logoContainerStyle: React.CSSProperties = {
  marginBottom: '40px',
  textAlign: 'center'
};

const logoIconStyle: React.CSSProperties = {
  fontSize: '64px',
  marginBottom: '16px',
  display: 'inline-block'
};

const logoTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '800',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: '8px'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  marginTop: '8px'
};

const formStyle: React.CSSProperties = {
  width: '100%'
};

const inputGroupStyle: React.CSSProperties = {
  marginBottom: '24px'
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '10px',
  fontWeight: '600',
  color: '#334155',
  fontSize: '14px'
};

const labelIconStyle: React.CSSProperties = {
  fontSize: '16px'
};

const inputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: '15px',
  border: '2px solid #e2e8f0',
  borderRadius: '14px',
  backgroundColor: 'white',
  transition: 'all 0.3s ease',
  outline: 'none',
  fontFamily: 'inherit'
};

const togglePasswordStyle: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '18px',
  padding: '4px',
  borderRadius: '8px',
  transition: 'all 0.3s ease'
};

const optionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '28px'
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer'
};

const checkboxStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  cursor: 'pointer'
};

const checkboxTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#475569'
};

const forgotPasswordStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#667eea',
  textDecoration: 'none',
  fontWeight: '600',
  transition: 'all 0.3s ease'
};

const errorContainerStyle: React.CSSProperties = {
  background: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  padding: '12px 16px',
  borderRadius: '12px',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const errorIconStyle: React.CSSProperties = {
  fontSize: '18px'
};

const errorTextStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '13px',
  fontWeight: '500',
  flex: 1
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  fontSize: '16px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  marginBottom: '24px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.7,
  cursor: 'not-allowed'
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '16px',
  height: '16px',
  border: '2px solid white',
  borderTop: '2px solid transparent',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  marginRight: '8px',
  verticalAlign: 'middle'
};

const footerStyle: React.CSSProperties = {
  textAlign: 'center'
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '12px'
};

const securityBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  background: '#f1f5f9',
  borderRadius: '20px'
};

const securityIconStyle: React.CSSProperties = {
  fontSize: '12px'
};

const securityTextStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  fontWeight: '600'
};

export default Login;