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

  // Busca carretas disponíveis (sem motorista associado)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cpf) {
      alert("Nome e CPF são obrigatórios!");
      return;
    }

    setLoading(true);
    try {
      // Cadastra o motorista
      const novoMotoristaRef = await addDoc(collection(db, 'motoristas'), {
        nome: form.nome,
        cpf: form.cpf,
        whatsapp: form.whatsapp,
        cidade: form.cidade,
        cnhCategoria: form.cnhCategoria,
        temMopp: form.temMopp,
        createdAt: new Date().toISOString()
      });

      // Se selecionou uma carreta, faz a associação
      if (form.carretaId) {
        const carretaRef = doc(db, 'carretas', form.carretaId);
        const carretaSelecionada = carretasDisponiveis.find(c => c.id === form.carretaId);

        await updateDoc(carretaRef, {
          motoristaId: novoMotoristaRef.id,
          motoristaNome: form.nome
        });
      }

      alert("✅ Motorista cadastrado com sucesso!");
      
      // Limpa o formulário
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
    <div style={{ padding: '40px 30px', maxWidth: '700px' }}>
      <h2 style={{ color: '#1e2937', marginBottom: '30px' }}>Cadastro de Motorista</h2>

      <form onSubmit={handleSubmit} style={formCardStyle}>
        
        <label style={labelStyle}>Nome Completo <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          style={inputStyle}
          required
        />

        <label style={labelStyle}>CPF <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          value={form.cpf}
          onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
          placeholder="000.000.000-00"
          style={inputStyle}
          required
        />

        <label style={labelStyle}>WhatsApp</label>
        <input
          type="text"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          style={inputStyle}
        />

        <label style={labelStyle}>Cidade</label>
        <input
          type="text"
          value={form.cidade}
          onChange={(e) => setForm({ ...form, cidade: e.target.value })}
          style={inputStyle}
        />

        <label style={labelStyle}>Categoria CNH</label>
        <input
          type="text"
          value={form.cnhCategoria}
          onChange={(e) => setForm({ ...form, cnhCategoria: e.target.value })}
          placeholder="Ex: A, B, C, D, E"
          style={inputStyle}
        />

        <label style={labelStyle}>Possui MOPP?</label>
        <select 
          value={form.temMopp} 
          onChange={(e) => setForm({ ...form, temMopp: e.target.value })} 
          style={inputStyle}
        >
          <option value="Não">Não</option>
          <option value="Sim">Sim</option>
        </select>

        {/* Campo de Carreta - Corrigido */}
        <label style={labelStyle}>Associar Carreta (opcional)</label>
        <select 
          value={form.carretaId} 
          onChange={(e) => setForm({ ...form, carretaId: e.target.value })} 
          style={inputStyle}
        >
          <option value="">Nenhuma carreta</option>
          {carretasDisponiveis.map((c) => (
            <option key={c.id} value={c.id}>
              {c.placa} — {c.tipo} ({c.qtdPaletes} paletes)
            </option>
          ))}
        </select>

        <button type="submit" disabled={loading} style={saveButton}>
          {loading ? 'Cadastrando Motorista...' : 'Cadastrar Motorista'}
        </button>
      </form>
    </div>
  );
};

// ==================== ESTILOS ====================
const formCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '40px',
  borderRadius: '16px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  color: '#374151'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  marginBottom: '22px',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  fontSize: '16px'
};

const saveButton: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '17px',
  fontWeight: '600',
  cursor: 'pointer',
  marginTop: '15px'
};

export default CadastroMotorista;