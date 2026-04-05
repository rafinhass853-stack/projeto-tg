import React, { useState } from 'react';
import { db, storage, auth } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const initialForm = {
  nome: '', cpf: '', cnhCategoria: '', whatsapp: '', 
  cidade: '', temMopp: 'Não', email: '', senha: ''
};

const CadastroMotorista = () => {
  const [formData, setFormData] = useState(initialForm);
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [fotoCNH, setFotoCNH] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.cpf.length < 14) return alert('CPF incompleto!');
    if (formData.senha.length < 6) return alert('A senha deve ter no mínimo 6 caracteres!');

    setLoading(true);
    try {
      // 1. Verificar duplicidade de CPF no Firestore
      const q = query(collection(db, 'motoristas'), where('cpf', '==', formData.cpf));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert('❌ Este CPF já está cadastrado!');
        setLoading(false);
        return;
      }

      // 2. Criar conta no Firebase Authentication
      // Nota: Isso criará o usuário mas não fará login automático se você já estiver logado como gestor
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
      const uid = userCredential.user.uid;

      // 3. Upload de fotos
      const urlPerfil = fotoPerfil ? await handleUpload(fotoPerfil, 'perfil') : '';
      const urlCNH = fotoCNH ? await handleUpload(fotoCNH, 'docs_cnh') : '';

      // 4. Salvar perfil completo no Firestore
      await addDoc(collection(db, 'motoristas'), {
        uid: uid, // Vincula o documento ao usuário do Auth
        nome: formData.nome,
        cpf: formData.cpf,
        email: formData.email,
        whatsapp: formData.whatsapp,
        cidade: formData.cidade,
        cnhCategoria: formData.cnhCategoria,
        temMopp: formData.temMopp,
        fotoPerfilUrl: urlPerfil,
        fotoCnhUrl: urlCNH,
        role: 'motorista', // Define o papel para segurança futura
        createdAt: new Date()
      });

      alert('✅ Motorista cadastrado e conta de acesso criada com sucesso!');
      setFormData(initialForm);
      setFotoPerfil(null);
      setFotoCNH(null);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert('❌ Este e-mail já está em uso por outro usuário.');
      } else {
        alert('Erro ao realizar cadastro: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Novo Cadastro de Motorista</h2>
      <form onSubmit={handleSubmit} style={styles.formGrid}>
        <input type="text" placeholder="Nome Completo" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={styles.input} />
        <input type="text" placeholder="CPF: 000.000.000-00" required value={formData.cpf} onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})} style={styles.input} />
        
        {/* NOVOS CAMPOS DE ACESSO */}
        <input type="email" placeholder="E-mail para Login" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{...styles.input, borderColor: '#FFC400'}} />
        <input type="password" placeholder="Senha (mín. 6 dígitos)" required value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} style={{...styles.input, borderColor: '#FFC400'}} />
        
        <input type="text" placeholder="Categoria CNH" value={formData.cnhCategoria} onChange={e => setFormData({...formData, cnhCategoria: e.target.value})} style={styles.input} />
        <input type="text" placeholder="WhatsApp" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} style={styles.input} />
        <input type="text" placeholder="Cidade" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} style={styles.input} />
        <select value={formData.temMopp} onChange={e => setFormData({...formData, temMopp: e.target.value})} style={styles.input}>
          <option value="Não">Possui MOPP? Não</option>
          <option value="Sim">Possui MOPP? Sim</option>
        </select>
        <div style={styles.fileBox}><label>Foto Perfil:</label><input type="file" accept="image/*" onChange={e => setFotoPerfil(e.target.files?.[0] ?? null)} /></div>
        <div style={styles.fileBox}><label>Foto CNH:</label><input type="file" accept="image/*,application/pdf" onChange={e => setFotoCNH(e.target.files?.[0] ?? null)} /></div>
        <button type="submit" disabled={loading} style={styles.submitBtn}>{loading ? 'CRIANDO CONTA...' : 'FINALIZAR CADASTRO E CRIAR ACESSO'}</button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  title: { color: '#1E2A44', marginBottom: '20px', borderLeft: '5px solid #FFC400', paddingLeft: '15px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' },
  fileBox: { display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', fontWeight: 'bold' },
  submitBtn: { gridColumn: 'span 2', padding: '15px', backgroundColor: '#1E2A44', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' }
};

export default CadastroMotorista;
