import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface ListaMotoristasProps {
  onSelectMotorista: (id: string) => void;
}

const ListaMotoristas: React.FC<ListaMotoristasProps> = ({ onSelectMotorista }) => {
  const [lista, setLista] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'motoristas'), (snap) => {
      setLista(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este motorista?')) {
      await deleteDoc(doc(db, 'motoristas', id));
    }
  };

  const handleCardClick = (motorista: any, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onSelectMotorista(motorista.id);
  };

  return (
    <div style={{ padding: '40px 30px', backgroundColor: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e2937' }}>
          Motoristas Cadastrados
        </h2>
        <p style={{ color: '#64748b' }}>{lista.length} motoristas encontrados</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {lista.map(m => (
          <div
            key={m.id}
            onClick={(e) => handleCardClick(m, e)}
            style={cardStyle}
          >
            <div style={fotoWrapper}>
              <img
                src={m.fotoPerfilUrl || 'https://placehold.co/140x140?text=Foto'}
                alt={m.nome}
                style={fotoStyle}
              />
            </div>

            <div style={contentStyle}>
              <h3 style={nomeStyle}>{m.nome}</h3>
              <p style={cpfStyle}>CPF: {m.cpf}</p>
              
              <div style={detalhesStyle}>
                <p>📍 {m.cidade || 'Cidade não informada'}</p>
                <p>📱 {m.whatsapp || m.telefone || 'Sem contato'}</p>
                <p>🪪 CNH {m.cnhCategoria} {m.temMopp === 'Sim' ? '• MOPP' : ''}</p>
              </div>

              <div style={actionsStyle}>
                <button onClick={() => setEditando(m)} style={editBtn}>Editar</button>
                <button onClick={() => handleDelete(m.id)} style={deleteBtn}>Excluir</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== ESTILOS MODERNOS ====================
const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  cursor: 'pointer',
};

const fotoWrapper: React.CSSProperties = {
  height: '180px',
  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const fotoStyle: React.CSSProperties = {
  width: '130px',
  height: '130px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '6px solid white',
  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
};

const contentStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
};

const nomeStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1e2937',
  margin: '0 0 8px 0',
};

const cpfStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '15px',
  marginBottom: '16px',
};

const detalhesStyle: React.CSSProperties = {
  textAlign: 'left',
  color: '#475569',
  fontSize: '14.5px',
  lineHeight: '1.7',
  marginBottom: '24px',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
};

const editBtn: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer',
};

const deleteBtn: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  cursor: 'pointer',
};

export default ListaMotoristas;