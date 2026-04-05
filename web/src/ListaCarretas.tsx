import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const ListaCarretas = () => {
  const [carretas, setCarretas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'carretas'), (snap) => {
      setCarretas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDesassociar = async (carretaId: string) => {
    if (!confirm("Desassociar esta carreta do motorista?")) return;
    await updateDoc(doc(db, 'carretas', carretaId), {
      motoristaId: null,
      motoristaNome: null
    });
    alert("Carreta desassociada com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Excluir esta carreta?")) {
      await deleteDoc(doc(db, 'carretas', id));
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Carregando carretas...</div>;

  return (
    <div style={{ padding: '40px 30px', backgroundColor: '#f8fafc' }}>
      <h2 style={{ marginBottom: '30px', color: '#1e2937' }}>Carretas Cadastradas ({carretas.length})</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {carretas.map(c => (
          <div key={c.id} style={cardStyle}>
            <div style={placaHeader}>
              <strong>{c.placa}</strong>
              <span style={tipoBadge}>{c.tipo}</span>
            </div>

            <div style={infoStyle}>
              <p><strong>Paletes:</strong> {c.qtdPaletes}</p>
              {c.motoristaNome ? (
                <p style={{ color: '#16a34a' }}>Associada a: <strong>{c.motoristaNome}</strong></p>
              ) : (
                <p style={{ color: '#64748b' }}>Não associada a nenhum motorista</p>
              )}
              {c.observacao && <p><strong>Obs:</strong> {c.observacao}</p>}
            </div>

            <div style={actionsStyle}>
              {c.motoristaId && (
                <button onClick={() => handleDesassociar(c.id)} style={desassociarBtn}>
                  Desassociar
                </button>
              )}
              <button onClick={() => handleDelete(c.id)} style={deleteBtn}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
};

const placaHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '15px',
  fontSize: '22px',
  fontWeight: '700'
};

const tipoBadge: React.CSSProperties = {
  background: '#e0f2fe',
  color: '#0369a1',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: '600'
};

const infoStyle: React.CSSProperties = { marginBottom: '20px', lineHeight: '1.7' };
const actionsStyle: React.CSSProperties = { display: 'flex', gap: '12px' };

const desassociarBtn: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#eab308',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer'
};

const deleteBtn: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer'
};

export default ListaCarretas;