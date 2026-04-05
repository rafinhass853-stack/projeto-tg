import React, { useEffect, useState } from 'react';
import { db, storage } from './firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ListaMotoristas = () => {
  const [lista, setLista] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [novaFotoPerfil, setNovaFotoPerfil] = useState<File | null>(null);
  const [novaFotoCNH, setNovaFotoCNH] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'motoristas'), (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLista(docs);
    });
    return () => unsub();
  }, []);

  // Máscara de CPF idêntica ao cadastro
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  };

  const handleUpload = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const motoristaRef = doc(db, 'motoristas', editando.id);
      const dadosAtualizados: any = {
        nome: editando.nome,
        cpf: editando.cpf,
        whatsapp: editando.whatsapp,
        cidade: editando.cidade,
        cnhCategoria: editando.cnhCategoria,
        temMopp: editando.temMopp
      };

      // Se o usuário selecionou novas fotos, faz o upload e atualiza a URL
      if (novaFotoPerfil) {
        dadosAtualizados.fotoPerfilUrl = await handleUpload(novaFotoPerfil, 'perfil');
      }
      if (novaFotoCNH) {
        dadosAtualizados.fotoCnhUrl = await handleUpload(novaFotoCNH, 'docs_cnh');
      }

      await updateDoc(motoristaRef, dadosAtualizados);
      alert('✅ Cadastro atualizado com sucesso!');
      fecharEdicao();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar motorista.');
    } finally {
      setLoading(false);
    }
  };

  const fecharEdicao = () => {
    setEditando(null);
    setNovaFotoPerfil(null);
    setNovaFotoCNH(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este motorista?')) {
      await deleteDoc(doc(db, 'motoristas', id));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {lista.map(m => (
          <div key={m.id} style={cardStyles.fifaCard}>
            <div style={cardStyles.cnhBadge}>{m.cnhCategoria}</div>
            <img src={m.fotoPerfilUrl || 'https://placehold.co/90x90?text=Foto'} style={cardStyles.img} alt="Perfil" />
            <h3 style={{ margin: '10px 0 5px 0', fontSize: '16px', color: '#1E2A44' }}>{m.nome.split(' ' )[0]}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold' }}>{m.cpf}</p>
            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <button onClick={() => setEditando(m)} style={cardStyles.editBtn}>✏️ Editar</button>
              <button onClick={() => handleDelete(m.id)} style={cardStyles.delBtn}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE EDIÇÃO COMPLETO */}
      {editando && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.content}>
            <h3 style={{ color: '#1E2A44', borderBottom: '2px solid #FFC400', paddingBottom: '10px' }}>Editar Cadastro</h3>
            <form onSubmit={handleUpdate} style={modalStyles.formGrid}>
              
              <div style={modalStyles.inputGroup}>
                <label>Nome Completo</label>
                <input value={editando.nome} onChange={e => setEditando({...editando, nome: e.target.value})} style={modalStyles.input} />
              </div>

              <div style={modalStyles.inputGroup}>
                <label>CPF</label>
                <input value={editando.cpf} onChange={e => setEditando({...editando, cpf: formatCPF(e.target.value)})} style={modalStyles.input} />
              </div>

              <div style={modalStyles.inputGroup}>
                <label>WhatsApp</label>
                <input value={editando.whatsapp} onChange={e => setEditando({...editando, whatsapp: e.target.value})} style={modalStyles.input} />
              </div>

              <div style={modalStyles.inputGroup}>
                <label>Cidade</label>
                <input value={editando.cidade} onChange={e => setEditando({...editando, cidade: e.target.value})} style={modalStyles.input} />
              </div>

              <div style={modalStyles.inputGroup}>
                <label>Categoria CNH</label>
                <input value={editando.cnhCategoria} onChange={e => setEditando({...editando, cnhCategoria: e.target.value})} style={modalStyles.input} />
              </div>

              <div style={modalStyles.inputGroup}>
                <label>Possui MOPP?</label>
                <select value={editando.temMopp} onChange={e => setEditando({...editando, temMopp: e.target.value})} style={modalStyles.input}>
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>

              <div style={modalStyles.inputGroup}>
                <label>Nova Foto Perfil (Opcional)</label>
                <input type="file" accept="image/*" onChange={e => setNovaFotoPerfil(e.target.files?.[0] ?? null)} style={{fontSize: '12px'}} />
              </div>

              <div style={modalStyles.inputGroup}>
                <label>Nova Foto CNH (Opcional)</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => setNovaFotoCNH(e.target.files?.[0] ?? null)} style={{fontSize: '12px'}} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={loading} style={modalStyles.saveBtn}>
                  {loading ? 'SALVANDO...' : 'ATUALIZAR DADOS'}
                </button>
                <button type="button" onClick={fecharEdicao} style={modalStyles.cancelBtn}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const cardStyles: { [key: string]: React.CSSProperties } = {
  fifaCard: { width: '180px', background: 'linear-gradient(135deg, #FFC400 0%, #E6B100 100%)', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', position: 'relative' },
  cnhBadge: { position: 'absolute', top: '10px', left: '10px', background: '#1E2A44', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' },
  img: { width: '80px', height: '80px', borderRadius: '50%', border: '2px solid white', objectFit: 'cover' },
  editBtn: { background: '#1E2A44', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' },
  delBtn: { background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }
};

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  content: { background: 'white', padding: '25px', borderRadius: '15px', width: '550px', maxHeight: '90vh', overflowY: 'auto' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  saveBtn: { background: '#1E2A44', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 2, fontWeight: 'bold' },
  cancelBtn: { background: '#95a5a6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 1 }
};

export default ListaMotoristas;
