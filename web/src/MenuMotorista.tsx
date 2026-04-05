import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  cnhCategoria?: string;
  temMopp?: string;
  fotoPerfilUrl?: string;
  carretaPlaca?: string;   // caso já tenha associação
}

interface MenuMotoristaProps {
  motoristaId: string;
  onVoltar: () => void;
}

const MenuMotorista: React.FC<MenuMotoristaProps> = ({ motoristaId, onVoltar }) => {
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Motorista>>({});

  const [cargaForm, setCargaForm] = useState({
    descricao: '',
    peso: '',
    destino: ''
  });

  useEffect(() => {
    const fetchMotorista = async () => {
      try {
        const docRef = doc(db, 'motoristas', motoristaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Motorista;
          setMotorista({ id: docSnap.id, ...data });
          setForm(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMotorista();
  }, [motoristaId]);

  const handleEdit = async () => {
    if (!motorista) return;
    try {
      const docRef = doc(db, 'motoristas', motorista.id);
      await updateDoc(docRef, form);
      alert('✅ Motorista atualizado com sucesso!');
      setEditMode(false);
      window.location.reload();
    } catch (error) {
      alert('Erro ao atualizar motorista.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este motorista?')) return;
    await deleteDoc(doc(db, 'motoristas', motoristaId));
    alert('Motorista excluído!');
    onVoltar();
  };

  const handleLancarCarga = async () => {
    if (!motorista || !cargaForm.descricao || !cargaForm.peso) {
      alert('Preencha descrição e peso da carga.');
      return;
    }
    try {
      await addDoc(collection(db, 'cargas'), {
        motoristaId: motorista.id,
        descricao: cargaForm.descricao,
        peso: parseFloat(cargaForm.peso),
        destino: cargaForm.destino || 'Não informado',
        data: serverTimestamp(),
        status: 'pendente'
      });
      alert('✅ Carga lançada com sucesso!');
      setCargaForm({ descricao: '', peso: '', destino: '' });
    } catch (error) {
      alert('Erro ao lançar carga.');
    }
  };

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center', fontSize: '18px' }}>Carregando dados do motorista...</div>;
  }

  if (!motorista) {
    return <div style={{ padding: '80px', textAlign: 'center' }}>Motorista não encontrado.</div>;
  }

  return (
    <div style={containerStyle}>
      <button onClick={onVoltar} style={voltarStyle}>
        ← Voltar para a lista de motoristas
      </button>

      <div style={headerStyle}>
        <div style={fotoContainerStyle}>
          <img 
            src={motorista.fotoPerfilUrl || 'https://placehold.co/180x180?text=Foto'} 
            alt={motorista.nome}
            style={fotoStyle}
          />
        </div>
        <div style={infoHeaderStyle}>
          <h1 style={nomeStyle}>{motorista.nome}</h1>
          <p style={cpfStyle}>CPF: {motorista.cpf}</p>
          {motorista.carretaPlaca && (
            <p style={{ color: '#16a34a', fontWeight: '600', marginTop: '8px' }}>
              🚛 Carreta Associada: {motorista.carretaPlaca}
            </p>
          )}
        </div>
      </div>

      <div style={infoGridStyle}>
        <div style={infoCardStyle}>
          <strong>Telefone / WhatsApp</strong>
          <p>{motorista.telefone || motorista.whatsapp || 'Não informado'}</p>
        </div>
        <div style={infoCardStyle}>
          <strong>Email</strong>
          <p>{motorista.email || 'Não informado'}</p>
        </div>
        <div style={infoCardStyle}>
          <strong>Cidade</strong>
          <p>{motorista.cidade || 'Não informado'}</p>
        </div>
        <div style={infoCardStyle}>
          <strong>CNH</strong>
          <p>{motorista.cnhCategoria} {motorista.temMopp === 'Sim' ? '• MOPP' : ''}</p>
        </div>
      </div>

      <div style={actionsStyle}>
        <button onClick={() => setEditMode(true)} style={btnEditarStyle}>
          ✏️ Editar Motorista
        </button>
        <button onClick={handleDelete} style={btnExcluirStyle}>
          🗑️ Excluir Motorista
        </button>
      </div>

      {editMode && (
        <div style={editModalStyle}>
          <h3>Editar Motorista</h3>
          <input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome" style={inputStyle} />
          <input value={form.cpf || ''} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="CPF" style={inputStyle} />
          <input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" style={inputStyle} />
          <input value={form.telefone || ''} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone" style={inputStyle} />
          <div style={modalButtonsStyle}>
            <button onClick={handleEdit} style={btnSalvarStyle}>Salvar Alterações</button>
            <button onClick={() => setEditMode(false)} style={btnCancelarStyle}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={cargaSectionStyle}>
        <h2 style={sectionTitleStyle}>Lançar Nova Carga</h2>
        <div style={cargaFormStyle}>
          <input
            placeholder="Descrição da carga"
            value={cargaForm.descricao}
            onChange={e => setCargaForm({ ...cargaForm, descricao: e.target.value })}
            style={inputCargaStyle}
          />
          <input
            type="number"
            placeholder="Peso (kg)"
            value={cargaForm.peso}
            onChange={e => setCargaForm({ ...cargaForm, peso: e.target.value })}
            style={inputCargaStyle}
          />
          <input
            placeholder="Destino"
            value={cargaForm.destino}
            onChange={e => setCargaForm({ ...cargaForm, destino: e.target.value })}
            style={inputCargaStyle}
          />
          <button onClick={handleLancarCarga} style={btnLancarStyle}>
            Lançar Carga
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== ESTILOS ====================
const containerStyle: React.CSSProperties = { padding: '40px 30px', maxWidth: '1100px', margin: '0 auto' };

const voltarStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#3b82f6',
  fontSize: '16px',
  cursor: 'pointer',
  marginBottom: '25px',
  fontWeight: '500'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '30px',
  background: 'white',
  padding: '30px',
  borderRadius: '16px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  marginBottom: '30px'
};

const fotoContainerStyle: React.CSSProperties = { flexShrink: 0 };
const fotoStyle: React.CSSProperties = {
  width: '170px',
  height: '170px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '6px solid #1e2937'
};

const infoHeaderStyle: React.CSSProperties = {};
const nomeStyle: React.CSSProperties = { fontSize: '32px', margin: '0', color: '#1e2937' };
const cpfStyle: React.CSSProperties = { fontSize: '18px', color: '#475569', margin: '8px 0 0 0' };

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '20px',
  marginBottom: '40px'
};

const infoCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '22px',
  borderRadius: '14px',
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
};

const actionsStyle: React.CSSProperties = { display: 'flex', gap: '16px', marginBottom: '40px' };

const btnEditarStyle: React.CSSProperties = {
  padding: '14px 32px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600'
};

const btnExcluirStyle: React.CSSProperties = {
  padding: '14px 32px',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600'
};

const editModalStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '30px',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  marginBottom: '40px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  marginBottom: '14px',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  fontSize: '16px'
};

const modalButtonsStyle: React.CSSProperties = { display: 'flex', gap: '12px', marginTop: '20px' };

const btnSalvarStyle: React.CSSProperties = {
  flex: 1,
  padding: '14px',
  backgroundColor: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '16px'
};

const btnCancelarStyle: React.CSSProperties = {
  flex: 1,
  padding: '14px',
  backgroundColor: '#64748b',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '16px'
};

const cargaSectionStyle: React.CSSProperties = {
  background: 'white',
  padding: '35px',
  borderRadius: '16px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
};

const sectionTitleStyle: React.CSSProperties = { marginTop: '0', color: '#1e2937', marginBottom: '20px' };

const cargaFormStyle: React.CSSProperties = { display: 'flex', gap: '12px', flexWrap: 'wrap' };

const inputCargaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '220px',
  padding: '16px',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  fontSize: '16px'
};

const btnLancarStyle: React.CSSProperties = {
  padding: '16px 32px',
  backgroundColor: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600'
};

export default MenuMotorista;