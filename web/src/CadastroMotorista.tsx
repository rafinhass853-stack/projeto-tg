import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const CadastroMotorista = () => {
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    whatsapp: '',
    cidade: '',
    cnhCategoria: '',
    temMopp: 'Não',
    carretaId: ''
  });

  const [carretasDisponiveis, setCarretasDisponiveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'carretas'), where('motoristaId', '==', null));
    const unsub = onSnapshot(q, (snap) => {
      setCarretasDisponiveis(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cpf) {
      alert("Nome e CPF são obrigatórios!");
      return;
    }

    setLoading(true);
    try {
      const novoMotoristaRef = await addDoc(collection(db, 'motoristas'), {
        nome: form.nome,
        cpf: form.cpf,
        whatsapp: form.whatsapp,
        cidade: form.cidade,
        cnhCategoria: form.cnhCategoria,
        temMopp: form.temMopp,
        createdAt: new Date().toISOString()
      });

      if (form.carretaId) {
        const carretaRef = doc(db, 'carretas', form.carretaId);
        await updateDoc(carretaRef, {
          motoristaId: novoMotoristaRef.id,
          motoristaNome: form.nome
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      setForm({
        nome: '',
        cpf: '',
        whatsapp: '',
        cidade: '',
        cnhCategoria: '',
        temMopp: 'Não',
        carretaId: ''
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar motorista.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🚛 Cadastro de Motorista</h1>
        <p style={subtitleStyle}>Preencha os dados abaixo para adicionar um novo motorista</p>
      </div>

      {success && (
        <div style={successToastStyle}>
          ✅ Motorista cadastrado com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} style={formCardStyle}>
        <div style={twoColumnGrid}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              Nome Completo <span style={requiredStar}>*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              style={inputStyle}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              CPF <span style={requiredStar}>*</span>
            </label>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              style={inputStyle}
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: formatWhatsApp(e.target.value) })}
              placeholder="(00) 00000-0000"
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Cidade</label>
            <input
              type="text"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              placeholder="Digite a cidade"
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Categoria CNH</label>
            <input
              type="text"
              value={form.cnhCategoria}
              onChange={(e) => setForm({ ...form, cnhCategoria: e.target.value.toUpperCase() })}
              placeholder="Ex: A, B, C, D, E"
              style={inputStyle}
              maxLength={2}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Possui MOPP?</label>
            <select 
              value={form.temMopp} 
              onChange={(e) => setForm({ ...form, temMopp: e.target.value })} 
              style={selectStyle}
            >
              <option value="Não">❌ Não</option>
              <option value="Sim">✅ Sim</option>
            </select>
          </div>
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Associar Carreta (opcional)</label>
          <select 
            value={form.carretaId} 
            onChange={(e) => setForm({ ...form, carretaId: e.target.value })} 
            style={selectStyle}
          >
            <option value="">📦 Nenhuma carreta</option>
            {carretasDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.placa} — {c.tipo} ({c.qtdPaletes} paletes)
              </option>
            ))}
          </select>
          {carretasDisponiveis.length === 0 && (
            <p style={helperTextStyle}>ℹ️ Nenhuma carreta disponível no momento</p>
          )}
        </div>

        <button type="submit" disabled={loading} style={loading ? buttonDisabledStyle : saveButton}>
          {loading ? (
            <>
              <span style={spinnerStyle}></span>
              Cadastrando Motorista...
            </>
          ) : (
            '📝 Cadastrar Motorista'
          )}
        </button>
      </form>
    </div>
  );
};

// ==================== ESTILOS MODERNOS ====================
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '30px'
};

const titleStyle: React.CSSProperties = {
  color: 'white',
  fontSize: '32px',
  fontWeight: '700',
  marginBottom: '10px',
  textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
};

const subtitleStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '16px'
};

const formCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '40px',
  borderRadius: '24px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  maxWidth: '900px',
  width: '100%',
  transition: 'transform 0.3s ease'
};

const twoColumnGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
  marginBottom: '10px'
};

const inputGroupStyle: React.CSSProperties = {
  marginBottom: '0'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  color: '#374151',
  fontSize: '14px'
};

const requiredStar: React.CSSProperties = {
  color: '#ef4444'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '2px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  outline: 'none',
  fontFamily: 'inherit'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  backgroundColor: 'white'
};

const helperTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  marginTop: '8px'
};

const saveButton: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  backgroundColor: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '30px',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px'
};

const buttonDisabledStyle: React.CSSProperties = {
  ...saveButton,
  backgroundColor: '#9ca3af',
  cursor: 'not-allowed',
  opacity: 0.7
};

const successToastStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  backgroundColor: '#10b981',
  color: 'white',
  padding: '12px 24px',
  borderRadius: '12px',
  fontWeight: '600',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 1000,
  animation: 'slideIn 0.3s ease'
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '16px',
  height: '16px',
  border: '2px solid white',
  borderTop: '2px solid transparent',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite'
};

// Adicione isso ao seu CSS global ou crie um componente de estilo
const globalStyles = `
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
  
  input:focus, select:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }
`;

// Injetar estilos globais
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

export default CadastroMotorista;