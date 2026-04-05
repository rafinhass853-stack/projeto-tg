import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const ListaVeiculos = () => {
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'veiculos'), (snap) => {
      setVeiculos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const veiculoRef = doc(db, 'veiculos', editando.id);
      const updateData: any = {
        placa: editando.placa.toUpperCase(),
        tipo: editando.tipo
      };
      if (editando.tipo === 'truck') updateData.capacidade = editando.capacidade;

      await updateDoc(veiculoRef, updateData);
      alert('✅ Veículo atualizado!');
      setEditando(null);
    } catch (error) {
      alert('Erro ao atualizar.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este veículo?')) {
      await deleteDoc(doc(db, 'veiculos', id));
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        {veiculos.map(v => (
          <div key={v.id} style={styles.card}>
            <h4>🚛 {v.placa}</h4>
            <p>Tipo: {v.tipo}</p>
            {v.tipo === 'truck' && <p>Capacidade: {v.capacidade}</p>}
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setEditando(v)} style={styles.editBtn}>Editar</button>
              <button onClick={() => handleDelete(v.id)} style={styles.delBtn}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.content}>
            <h3>Editar Veículo</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={editando.placa} onChange={e => setEditando({...editando, placa: e.target.value})} style={modalStyles.input} placeholder="Placa" />
              <select value={editando.tipo} onChange={e => setEditando({...editando, tipo: e.target.value})} style={modalStyles.input}>
                <option value="toco">Toco</option>
                <option value="trucado">Trucado</option>
                <option value="truck">Truck</option>
              </select>
              {editando.tipo === 'truck' && (
                <input value={editando.capacidade} onChange={e => setEditando({...editando, capacidade: e.target.value})} style={modalStyles.input} placeholder="Capacidade" />
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={modalStyles.saveBtn}>SALVAR</button>
                <button type="button" onClick={() => setEditando(null)} style={modalStyles.cancelBtn}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: { background: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  editBtn: { background: '#FFC400', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  delBtn: { background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }
};

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  content: { background: 'white', padding: '30px', borderRadius: '15px', width: '350px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ddd' },
  saveBtn: { background: '#27ae60', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', flex: 1 },
  cancelBtn: { background: '#95a5a6', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', flex: 1 }
};

export default ListaVeiculos;
