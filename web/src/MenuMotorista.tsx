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
      const docRef = doc(db, 'motoristas', motoristaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Motorista;
        setMotorista({ id: docSnap.id, ...data });
        setForm(data);
      }
      setLoading(false);
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
      alert('Preencha a descrição e o peso da carga.');
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

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Carregando dados do motorista...</div>;
  if (!motorista) return <div>Motorista não encontrado.</div>;

  return (
    <div style={styles.container}>
      <button onClick={onVoltar} style={styles.btnVoltar}>
        ← Voltar para a lista de motoristas
      </button>

      <div style={styles.header}>
        <div style={styles.fotoContainer}>
          <img 
            src={motorista.fotoPerfilUrl || 'https://placehold.co/160x160?text=Foto'} 
            alt={motorista.nome}
            style={styles.foto}
          />
        </div>
        <div style={styles.infoHeader}>
          <h1 style={styles.nome}>{motorista.nome}</h1>
          <p style={styles.cpf}>CPF: {motorista.cpf}</p>
        </div>
      </div>

      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <strong>Telefone / WhatsApp</strong>
          <p>{motorista.telefone || motorista.whatsapp || 'Não informado'}</p>
        </div>
        <div style={styles.infoCard}>
          <strong>Email</strong>
          <p>{motorista.email || 'Não informado'}</p>
        </div>
        <div style={styles.infoCard}>
          <strong>Cidade</strong>
          <p>{motorista.cidade || 'Não informado'}</p>
        </div>
        <div style={styles.infoCard}>
          <strong>CNH</strong>
          <p>{motorista.cnhCategoria} {motorista.temMopp === 'Sim' ? '• Possui MOPP' : ''}</p>
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={() => setEditMode(true)} style={styles.btnEditar}>
          ✏️ Editar Motorista
        </button>
        <button onClick={handleDelete} style={styles.btnExcluir}>
          🗑️ Excluir Motorista
        </button>
      </div>

      {editMode && (
        <div style={styles.editModal}>
          <h3>Editar Motorista</h3>
          <input 
            value={form.nome || ''} 
            onChange={e => setForm({ ...form, nome: e.target.value })} 
            placeholder="Nome completo" 
            style={styles.input}
          />
          <input 
            value={form.cpf || ''} 
            onChange={e => setForm({ ...form, cpf: e.target.value })} 
            placeholder="CPF" 
            style={styles.input}
          />
          <input 
            value={form.email || ''} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            placeholder="Email" 
            style={styles.input}
          />
          <input 
            value={form.telefone || ''} 
            onChange={e => setForm({ ...form, telefone: e.target.value })} 
            placeholder="Telefone / WhatsApp" 
            style={styles.input}
          />
          <div style={styles.modalButtons}>
            <button onClick={handleEdit} style={styles.btnSalvar}>Salvar Alterações</button>
            <button onClick={() => setEditMode(false)} style={styles.btnCancelar}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={styles.cargaSection}>
        <h2 style={styles.sectionTitle}>Lançar Nova Carga</h2>
        <div style={styles.cargaForm}>
          <input
            placeholder="Descrição da carga"
            value={cargaForm.descricao}
            onChange={e => setCargaForm({ ...cargaForm, descricao: e.target.value })}
            style={styles.inputCarga}
          />
          <input
            type="number"
            placeholder="Peso (kg)"
            value={cargaForm.peso}
            onChange={e => setCargaForm({ ...cargaForm, peso: e.target.value })}
            style={styles.inputCarga}
          />
          <input
            placeholder="Destino"
            value={cargaForm.destino}
            onChange={e => setCargaForm({ ...cargaForm, destino: e.target.value })}
            style={styles.inputCarga}
          />
          <button onClick={handleLancarCarga} style={styles.btnLancar}>
            Lançar Carga
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== ESTILOS (Inline) ====================
const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '30px', maxWidth: '1100px', margin: '0 auto' },
  btnVoltar: { 
    background: 'none', border: 'none', color: '#1E88E5', fontSize: '16px', 
    cursor: 'pointer', marginBottom: '20px', fontWeight: '500' 
  },
  header: { 
    display: 'flex', alignItems: 'center', gap: '30px', background: 'white', 
    padding: '30px', borderRadius: '16px', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', marginBottom: '30px' 
  },
  fotoContainer: { flexShrink: 0 },
  foto: { 
    width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', 
    border: '6px solid #1E2A44' 
  },
  infoHeader: {},
  nome: { fontSize: '32px', margin: '0', color: '#1E2A44' },
  cpf: { fontSize: '18px', color: '#555', margin: '8px 0 0 0' },
  infoGrid: { 
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
    gap: '20px', marginBottom: '40px' 
  },
  infoCard: { 
    background: 'white', padding: '22px', borderRadius: '12px', 
    boxShadow: '0 4px 15px rgba(0,0,0,0.06)' 
  },
  actions: { display: 'flex', gap: '15px', marginBottom: '40px' },
  btnEditar: { 
    padding: '14px 28px', backgroundColor: '#1E88E5', color: 'white', 
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' 
  },
  btnExcluir: { 
    padding: '14px 28px', backgroundColor: '#e74c3c', color: 'white', 
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' 
  },
  editModal: { 
    background: '#f8f9fa', padding: '30px', borderRadius: '16px', 
    border: '1px solid #ddd', marginBottom: '40px' 
  },
  input: { 
    width: '100%', padding: '14px', marginBottom: '12px', 
    border: '1px solid #ccc', borderRadius: '8px', fontSize: '16px' 
  },
  modalButtons: { display: 'flex', gap: '12px', marginTop: '15px' },
  btnSalvar: { 
    flex: 1, padding: '14px', backgroundColor: '#28a745', color: 'white', 
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px' 
  },
  btnCancelar: { 
    flex: 1, padding: '14px', backgroundColor: '#6c757d', color: 'white', 
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px' 
  },
  cargaSection: { 
    background: 'white', padding: '35px', borderRadius: '16px', 
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)' 
  },
  sectionTitle: { marginTop: '0', color: '#1E2A44', marginBottom: '20px' },
  cargaForm: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  inputCarga: { 
    flex: 1, minWidth: '220px', padding: '16px', border: '1px solid #ddd', 
    borderRadius: '10px', fontSize: '16px' 
  },
  btnLancar: { 
    padding: '16px 32px', backgroundColor: '#28a745', color: 'white', 
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' 
  }
};

export default MenuMotorista;