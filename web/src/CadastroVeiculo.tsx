import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const CadastroVeiculo = () => {
  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState('toco');
  const [capacidade, setCapacidade] = useState('');
  const [loading, setLoading] = useState(false);

  // Máscara de Placa: AAA-0000 ou AAA-0A00 (Mercosul)
  const formatPlaca = (value: string) => {
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Apenas letras e números
    if (v.length > 7) v = v.slice(0, 7);
    
    if (v.length > 3) {
      return `${v.slice(0, 3)}-${v.slice(3)}`;
    }
    return v;
  };

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaca(formatPlaca(e.target.value));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dadosVeiculo: any = {
        placa,
        tipo,
        dataCadastro: new Date()
      };

      // Só salva capacidade se for Truck
      if (tipo === 'truck') {
        dadosVeiculo.capacidade = capacidade;
      }

      await addDoc(collection(db, 'veiculos'), dadosVeiculo);

      alert('✅ Veículo cadastrado!');
      setPlaca('');
      setTipo('toco');
      setCapacidade('');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Cadastro de Veículo</h2>
      <form onSubmit={handleSave} style={styles.form}>
        <label style={styles.label}>Placa</label>
        <input 
          placeholder="AAA-0000 ou AAA-0A00" 
          value={placa} 
          required 
          onChange={handlePlacaChange} 
          style={styles.input} 
        />

        <label style={styles.label}>Tipo de Veículo</label>
        <select 
          value={tipo} 
          onChange={e => setTipo(e.target.value)} 
          style={styles.input}
        >
          <option value="toco">Toco (2 eixos)</option>
          <option value="trucado">Trucado (3 eixos)</option>
          <option value="truck">Truck (Cavalo + Carreta)</option>
        </select>

        {/* CAMPO CONDICIONAL: Só aparece se for TRUCK */}
        {tipo === 'truck' && (
          <>
            <label style={styles.label}>Capacidade de Paletes</label>
            <input 
              placeholder="Ex: 28" 
              value={capacidade} 
              required={tipo === 'truck'} 
              onChange={e => setCapacidade(e.target.value)} 
              style={styles.input} 
            />
          </>
        )}

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'SALVANDO...' : 'CADASTRAR VEÍCULO'}
        </button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  title: { color: '#1E2A44', marginBottom: '20px', borderLeft: '5px solid #FFC400', paddingLeft: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '14px', fontWeight: 'bold', color: '#555', marginTop: '5px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' },
  submitBtn: { padding: '15px', background: '#1E2A44', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '15px' }
};

export default CadastroVeiculo;
