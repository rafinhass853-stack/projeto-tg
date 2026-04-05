import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const CadastroCarretas = () => {
  const [form, setForm] = useState({
    placa: '',
    tipo: 'Sider',
    qtdPaletes: '',
    observacao: ''
  });
  const [loading, setLoading] = useState(false);

  const formatPlaca = (value: string) => {
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 7) v = v.slice(0, 7);
    if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa || !form.qtdPaletes) {
      alert("Placa e Quantidade de Paletes são obrigatórios!");
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'carretas'), where('placa', '==', form.placa));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert("Esta placa já está cadastrada!");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'carretas'), {
        placa: form.placa,
        tipo: form.tipo,
        qtdPaletes: parseInt(form.qtdPaletes),
        observacao: form.observacao || '',
        motoristaId: null,
        motoristaNome: null,
        createdAt: new Date().toISOString()
      });

      alert("✅ Carreta cadastrada com sucesso!");
      setForm({ placa: '', tipo: 'Sider', qtdPaletes: '', observacao: '' });
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar carreta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 30px', maxWidth: '620px' }}>
      <h2 style={{ color: '#1e2937', marginBottom: '30px' }}>Cadastro de Carretas</h2>

      <form onSubmit={handleSubmit} style={formCardStyle}>
        <label style={labelStyle}>Placa da Carreta <span style={{color:'red'}}>*</span></label>
        <input
          type="text"
          value={form.placa}
          onChange={(e) => setForm({ ...form, placa: formatPlaca(e.target.value) })}
          placeholder="ABC-1D23"
          maxLength={8}
          style={inputStyle}
          required
        />

        <label style={labelStyle}>Tipo de Carreta</label>
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
          <option value="Sider">Sider</option>
          <option value="Baú">Baú</option>
        </select>

        <label style={labelStyle}>Quantidade de Paletes <span style={{color:'red'}}>*</span></label>
        <input
          type="number"
          value={form.qtdPaletes}
          onChange={(e) => setForm({ ...form, qtdPaletes: e.target.value })}
          placeholder="Ex: 28"
          style={inputStyle}
          required
        />

        <label style={labelStyle}>Observação (opcional)</label>
        <textarea
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          placeholder="Observações sobre a carreta..."
          style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
        />

        <button type="submit" disabled={loading} style={saveButton}>
          {loading ? 'Cadastrando...' : 'Cadastrar Carreta'}
        </button>
      </form>
    </div>
  );
};

const formCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '35px',
  borderRadius: '16px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
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
  marginTop: '10px'
};

export default CadastroCarretas;