import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  Truck, 
  ClipboardList, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  PlusCircle, 
  RefreshCw, 
  Info,
  Package,
  User,
  CreditCard,
  Hash,
  ExternalLink,
  ArrowRightLeft,
  Search,
  X,
  Printer,
  BarChart3,
  Filter,
  ChevronDown,
  Clock,
  TrendingUp,
  Edit3,
  Layers,
  Download
} from 'lucide-react';

interface CargaData {
  id?: string;
  veiculo: string;
  dt: string;
  peso: string;
  motorista: string;
  cpf: string;
  placa: string;
  carreta: string;
  coletaData: string;
  coletaLocal: string;
  coletaCidade: string;
  coletaLink: string;
  entregaData: string;
  entregaLocal: string;
  entregaCidade: string;
  entregaLink: string;
  obs: string;
  pvs: string[];
  tipo: 'normal' | 'com_troca';
  status: 'programada' | 'finalizada';
  troca?: {
    cliente: string;
    cidade: string;
    link: string;
  };
  criadoEm?: any;
}

const GerenciadorDeCargas: React.FC = () => {
  const [textoColado, setTextoColado] = useState('');
  const [cargaDetectada, setCargaDetectada] = useState<CargaData | null>(null);
  const [listaCargas, setListaCargas] = useState<CargaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Estados para Edição
  const [editandoCarga, setEditandoCarga] = useState<CargaData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estados para Filtros
  const [filtroDataColeta, setFiltroDataColeta] = useState('');
  const [filtroDataEntrega, setFiltroDataEntrega] = useState('');
  const [filtroCidadeColeta, setFiltroCidadeColeta] = useState('');
  const [filtroCidadeEntrega, setFiltroCidadeEntrega] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMotorista, setFiltroMotorista] = useState(''); // NOVO FILTRO
  const [filtroQuantidadeVeiculos, setFiltroQuantidadeVeiculos] = useState('');
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false); // NOVO ESTADO

  useEffect(() => {
    const q = query(collection(db, "cargas_programadas"), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: any[] = [];
      querySnapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setListaCargas(docs);
    });
    return () => unsubscribe();
  }, []);

  // Extrair clientes únicos
  const clientesUnicos = useMemo(() => {
    const clientes = new Map<string, number>();
    listaCargas.forEach(carga => {
      if (carga.coletaLocal) clientes.set(carga.coletaLocal, (clientes.get(carga.coletaLocal) || 0) + 1);
      if (carga.entregaLocal) clientes.set(carga.entregaLocal, (clientes.get(carga.entregaLocal) || 0) + 1);
    });
    return Array.from(clientes.entries()).sort((a, b) => b[1] - a[1]);
  }, [listaCargas]);

  // Lógica de Filtragem
  const cargasFiltradas = useMemo(() => {
    let resultado = listaCargas.filter(carga => {
      // Ajuste 1: Não aparecer finalizadas por padrão
      if (!mostrarFinalizadas && carga.status === 'finalizada') return false;

      const dataColetaFormatada = filtroDataColeta ? filtroDataColeta.split('-').reverse().join('/') : '';
      const dataEntregaFormatada = filtroDataEntrega ? filtroDataEntrega.split('-').reverse().join('/') : '';
      const bateDataColeta = !filtroDataColeta || (carga.coletaData && carga.coletaData.includes(dataColetaFormatada));
      const bateDataEntrega = !filtroDataEntrega || (carga.entregaData && carga.entregaData.includes(dataEntregaFormatada));
      const bateCidadeColeta = !filtroCidadeColeta || (carga.coletaCidade && carga.coletaCidade.toLowerCase() === filtroCidadeColeta.toLowerCase());
      const bateCidadeEntrega = !filtroCidadeEntrega || (carga.entregaCidade && carga.entregaCidade.toLowerCase() === filtroCidadeEntrega.toLowerCase());
      const bateCliente = !filtroCliente || 
        (carga.coletaLocal && carga.coletaLocal.toLowerCase().includes(filtroCliente.toLowerCase())) ||
        (carga.entregaLocal && carga.entregaLocal.toLowerCase().includes(filtroCliente.toLowerCase()));
      
      // Ajuste 2: Filtro por motorista
      const bateMotorista = !filtroMotorista || (carga.motorista && carga.motorista.toLowerCase().includes(filtroMotorista.toLowerCase()));

      return bateDataColeta && bateDataEntrega && bateCidadeColeta && bateCidadeEntrega && bateCliente && bateMotorista;
    });

    if (filtroQuantidadeVeiculos && filtroQuantidadeVeiculos !== 'todos') {
      const limite = parseInt(filtroQuantidadeVeiculos);
      if (!isNaN(limite)) resultado = resultado.slice(0, limite);
    }
    return resultado;
  }, [listaCargas, filtroDataColeta, filtroDataEntrega, filtroCidadeColeta, filtroCidadeEntrega, filtroCliente, filtroMotorista, filtroQuantidadeVeiculos, mostrarFinalizadas]);

  // Ajuste 4: Agrupamento de Cargas
  const cargasAgrupadas = useMemo(() => {
    const grupos: { [key: string]: CargaData[] } = {};
    cargasFiltradas.forEach(carga => {
      const chave = `${carga.coletaCidade || 'Sem Origem'} (${carga.coletaLocal || 'Sem Cliente'})`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(carga);
    });
    return grupos;
  }, [cargasFiltradas]);

  // Estatísticas (Relatório Comercial Melhorado)
  const stats = useMemo(() => {
    const cidadesColeta = new Map<string, number>();
    const cidadesEntrega = new Map<string, number>();
    let pesoTotal = 0;
    const clientesCount = new Map<string, number>();
    const motoristasCount = new Map<string, number>();
    
    cargasFiltradas.forEach(c => {
      if (c.coletaCidade) cidadesColeta.set(c.coletaCidade, (cidadesColeta.get(c.coletaCidade) || 0) + 1);
      if (c.entregaCidade) cidadesEntrega.set(c.entregaCidade, (cidadesEntrega.get(c.entregaCidade) || 0) + 1);
      if (c.coletaLocal) clientesCount.set(c.coletaLocal, (clientesCount.get(c.coletaLocal) || 0) + 1);
      if (c.entregaLocal) clientesCount.set(c.entregaLocal, (clientesCount.get(c.entregaLocal) || 0) + 1);
      if (c.motorista) motoristasCount.set(c.motorista, (motoristasCount.get(c.motorista) || 0) + 1);
      
      const pesoLimpo = parseFloat(c.peso?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      pesoTotal += pesoLimpo;
    });

    return {
      totalVeiculos: cargasFiltradas.length,
      pesoTotal: pesoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      distribuicaoColeta: Array.from(cidadesColeta.entries()).sort((a, b) => b[1] - a[1]),
      distribuicaoEntrega: Array.from(cidadesEntrega.entries()).sort((a, b) => b[1] - a[1]),
      clientesTop: Array.from(clientesCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      motoristasTop: Array.from(motoristasCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [cargasFiltradas]);

  const cidadesColeta = useMemo(() => {
    const cidades = new Map<string, number>();
    listaCargas.forEach(c => { if (c.coletaCidade) cidades.set(c.coletaCidade, (cidades.get(c.coletaCidade) || 0) + 1); });
    return Array.from(cidades.entries()).sort((a, b) => b[1] - a[1]);
  }, [listaCargas]);

  const cidadesEntrega = useMemo(() => {
    const cidades = new Map<string, number>();
    listaCargas.forEach(c => { if (c.entregaCidade) cidades.set(c.entregaCidade, (cidades.get(c.entregaCidade) || 0) + 1); });
    return Array.from(cidades.entries()).sort((a, b) => b[1] - a[1]);
  }, [listaCargas]);

  const parsearCarga = (texto: string) => {
    if (!texto.trim()) { setCargaDetectada(null); return; }
    try {
      const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);
      const novaCarga: CargaData = {
        veiculo: 'FROTA', dt: '', peso: '', motorista: '', cpf: '', placa: '', carreta: '',
        coletaData: '', coletaLocal: '', coletaCidade: '', coletaLink: '',
        entregaData: '', entregaLocal: '', entregaCidade: '', entregaLink: '',
        obs: '', pvs: [], tipo: 'normal', status: 'programada'
      };
      let blocoAtual: 'COLETA' | 'ENTREGA' | 'TROCA' | null = null;
      linhas.forEach((linha) => {
        if (linha.includes('DT:')) novaCarga.dt = linha.split('DT:')[1]?.trim();
        if (linha.includes('Peso:')) novaCarga.peso = linha.split('Peso:')[1]?.trim();
        if (linha.includes('Nome:')) novaCarga.motorista = linha.split('Nome:')[1]?.trim();
        if (linha.includes('CPF:')) novaCarga.cpf = linha.split('CPF:')[1]?.trim();
        if (linha.includes('Placa/Carreta')) {
          const conteudo = linha.replace('Placa/Carreta', '').trim();
          if (conteudo.includes('/')) {
            const partes = conteudo.split('/');
            novaCarga.placa = partes[0].trim();
            novaCarga.carreta = partes[1].trim();
          } else { novaCarga.placa = conteudo; }
        }
        if (linha.toUpperCase().startsWith('COLETA')) { novaCarga.coletaData = linha.replace(/COLETA/i, '').trim(); blocoAtual = 'COLETA'; }
        if (linha.toUpperCase().startsWith('ENTREGA')) { novaCarga.entregaData = linha.replace(/ENTREGA/i, '').trim(); blocoAtual = 'ENTREGA'; }
        if (linha.toUpperCase().includes('TROCA')) { 
          blocoAtual = 'TROCA'; novaCarga.tipo = 'com_troca';
          if (!novaCarga.troca) novaCarga.troca = { cliente: '', cidade: '', link: '' };
        }
        const valor = linha.split(':')[1]?.trim();
        if (linha.includes('Local:')) {
          if (blocoAtual === 'COLETA') novaCarga.coletaLocal = valor;
          else if (blocoAtual === 'ENTREGA') novaCarga.entregaLocal = valor;
        }
        if (linha.includes('Cidade:') || linha.includes('CIDADE:')) {
          if (blocoAtual === 'COLETA') novaCarga.coletaCidade = valor;
          else if (blocoAtual === 'ENTREGA') novaCarga.entregaCidade = valor;
          else if (blocoAtual === 'TROCA') novaCarga.troca!.cidade = valor;
        }
        if (linha.includes('Link:')) {
          const url = linha.split('Link:')[1]?.trim();
          if (blocoAtual === 'COLETA') novaCarga.coletaLink = url;
          else if (blocoAtual === 'ENTREGA') novaCarga.entregaLink = url;
          else if (blocoAtual === 'TROCA') novaCarga.troca!.link = url;
        }
        if (blocoAtual === 'TROCA' && linha.includes('CLIENTE:')) novaCarga.troca!.cliente = valor;
        if (linha.includes('Obs:')) novaCarga.obs = valor;
        if (linha.match(/^\d+$/) || (linha.includes('.') && linha.match(/\d/))) {
           if (!linha.includes('CPF') && !linha.includes('DT') && !linha.includes('Peso')) novaCarga.pvs.push(linha.trim());
        }
      });
      setCargaDetectada(novaCarga);
    } catch (err) { console.error("Erro no Parse:", err); }
  };

  const realizarAutoCadastros = async (dados: CargaData) => {
    if (dados.cpf) {
      const qMot = query(collection(db, "motoristas"), where("cpf", "==", dados.cpf));
      const snapMot = await getDocs(qMot);
      if (snapMot.empty) {
        await addDoc(collection(db, "motoristas"), {
          nome: dados.motorista, cpf: dados.cpf, createdAt: serverTimestamp(),
          temMopp: "Não", whatsapp: "", cidade: dados.coletaCidade || ""
        });
      }
    }
    if (dados.placa) {
      const qVei = query(collection(db, "veiculos"), where("placa", "==", dados.placa));
      const snapVei = await getDocs(qVei);
      if (snapVei.empty) await addDoc(collection(db, "veiculos"), { placa: dados.placa, dataCadastro: serverTimestamp() });
    }
  };

  const finalizarCargasAntigas = async (cpf: string) => {
    if (!cpf) return;
    const q = query(collection(db, "cargas_programadas"), where("cpf", "==", cpf), where("status", "==", "programada"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((docSnap) => batch.update(docSnap.ref, { status: 'finalizada' }));
      await batch.commit();
    }
  };

  const salvarTudo = async () => {
    if (!cargaDetectada) return;
    setLoading(true);
    try {
      await finalizarCargasAntigas(cargaDetectada.cpf);
      await addDoc(collection(db, "cargas_programadas"), { ...cargaDetectada, criadoEm: serverTimestamp() });
      await realizarAutoCadastros(cargaDetectada);
      setTextoColado(''); setCargaDetectada(null);
      alert("✅ Carga salva com sucesso!");
    } catch (err) { console.error(err); alert("❌ Erro ao salvar carga."); } finally { setLoading(false); }
  };

  const handleSalvarEdicao = async () => {
    if (!editandoCarga || !editandoCarga.id) return;
    setLoading(true);
    try {
      const cargaRef = doc(db, "cargas_programadas", editandoCarga.id);
      const { id, criadoEm, ...dadosParaAtualizar } = editandoCarga;
      await updateDoc(cargaRef, dadosParaAtualizar);
      setShowEditModal(false); setEditandoCarga(null);
      alert("✅ Carga atualizada com sucesso!");
    } catch (err) { console.error(err); alert("❌ Erro ao atualizar carga."); } finally { setLoading(false); }
  };

  const styles = {
    container: { padding: '40px 20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
    title: { fontSize: '32px', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '16px' },
    card: { backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', marginBottom: '32px', border: '1px solid #f1f5f9' },
    textarea: { width: '100%', height: '120px', padding: '20px', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '15px', marginBottom: '20px', outline: 'none', transition: 'all 0.2s', resize: 'none' as const },
    previewBox: { backgroundColor: '#f8fafc', borderRadius: '20px', padding: '24px', border: '1px solid #eef2ff' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' },
    infoItem: { display: 'flex', alignItems: 'center', gap: '12px' },
    iconBox: { padding: '10px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
    label: { fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, margin: '0 0 4px 0', letterSpacing: '0.5px' },
    value: { fontSize: '15px', color: '#1e293b', fontWeight: 700, margin: 0 },
    btnPrimary: { backgroundColor: '#4f46e5', color: '#fff', padding: '14px 28px', borderRadius: '14px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', width: '100%', justifyContent: 'center' },
    btnSecondary: { backgroundColor: '#fff', color: '#475569', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
    badge: { backgroundColor: '#eef2ff', color: '#4f46e5', padding: '8px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center' },
    filterBar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px', backgroundColor: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9' },
    filterGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    filterLabel: { fontSize: '12px', fontWeight: 700, color: '#64748b' },
    filterInput: { padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' },
    filterSelect: { padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#fff' },
    clearBtn: { padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 },
    itemCard: (status: string) => ({ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', marginBottom: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', opacity: status === 'finalizada' ? 0.8 : 1, transition: 'all 0.2s' }),
    itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '16px' },
    statusBadge: (status: string) => ({ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, backgroundColor: status === 'finalizada' ? '#ecfdf5' : '#fff7ed', color: status === 'finalizada' ? '#10b981' : '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }),
    logisticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' },
    locationBox: (color: string) => ({ padding: '20px', borderRadius: '20px', backgroundColor: `${color}05`, border: `1px solid ${color}15`, position: 'relative' as const }),
    dot: (color: string) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, position: 'absolute' as const, top: '24px', left: '12px' }),
    locationTitle: (color: string) => ({ fontSize: '11px', fontWeight: 800, color: color, margin: '0 0 12px 16px', letterSpacing: '1px' }),
    cityName: { fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' },
    localName: { fontSize: '14px', color: '#64748b', margin: 0, fontWeight: 500 },
    mapLink: (color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: color, textDecoration: 'none', fontWeight: 700, marginTop: '12px', padding: '6px 12px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }),
    trocaBanner: { padding: '20px', borderRadius: '20px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    vehicleDetails: { padding: '20px', borderRadius: '20px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' },
    detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' },
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' as const, gap: '12px' },
    actionBtn: (bg: string, color: string) => ({ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: bg, color: color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }),
    modalOverlay: { position: 'fixed' as const, top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: '#fff', borderRadius: '28px', width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', position: 'relative' as const },
    modalHeader: { padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, backgroundColor: '#fff', zIndex: 10, borderTopLeftRadius: '28px', borderTopRightRadius: '28px' },
    modalBody: { padding: '32px' },
    statCard: { backgroundColor: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #eef2ff', transition: 'transform 0.2s' },
    statNumber: { fontSize: '32px', fontWeight: 800, color: '#1e293b', margin: 0 },
    statLabel: { fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    formLabel: { fontSize: '13px', fontWeight: 700, color: '#475569' },
    formInput: { padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' },
    formSectionTitle: { fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: '24px 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' },
    groupHeader: { backgroundColor: '#f1f5f9', padding: '12px 24px', borderRadius: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #e2e8f0' },
    groupTitle: { fontSize: '16px', fontWeight: 800, color: '#475569', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @media print { 
          body * { visibility: hidden; } 
          #modal-report, #modal-report * { visibility: visible; } 
          #modal-report { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; } 
          .no-print { display: none !important; } 
          @page { size: landscape; margin: 1cm; } 
          .report-container { padding: 20px; background: white; }
          .report-header { border-bottom: 2px solid #1e293b; margin-bottom: 20px; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; } 
          th, td { border: 1px solid #cbd5e1; padding: 6px 4px; text-align: left; } 
          th { background-color: #f1f5f9; font-weight: 700; color: #1e293b; } 
          tr:nth-child(even) { background-color: #f8fafc; } 
          .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .stat-box { border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; }
        }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important; }
        button:hover { transform: translateY(-1px); filter: brightness(0.98); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={styles.header} className="no-print">
          <div>
            <h1 style={styles.title}>
              <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '10px', borderRadius: '16px' }}>
                <Truck size={32} color="#fff" />
              </div> Logística TG
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>Gestão Inteligente de Transportes</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={styles.btnSecondary} onClick={() => setShowModal(true)}><BarChart3 size={18} /> Relatório Comercial</button>
            <div style={styles.badge}><TrendingUp size={14} style={{ marginRight: '6px' }} /> {listaCargas.filter(c => c.status === 'programada').length} Cargas Ativas</div>
          </div>
        </header>

        <section style={styles.card} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '8px', borderRadius: '14px' }}><PlusCircle size={20} color="#fff" /></div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Lançar Nova Carga</h2>
          </div>
          <textarea style={styles.textarea} value={textoColado} onChange={(e) => { setTextoColado(e.target.value); parsearCarga(e.target.value); }} placeholder="Cole aqui o texto do WhatsApp com os dados da carga..." />
          {cargaDetectada && (
            <div style={styles.previewBox}>
              <div style={styles.grid4}>
                <div style={styles.infoItem}><div style={styles.iconBox}><User size={18} color="#4f46e5" /></div><div><p style={styles.label}>Motorista</p><p style={styles.value}>{cargaDetectada.motorista || '---'}</p></div></div>
                <div style={styles.infoItem}><div style={styles.iconBox}><Hash size={18} color="#4f46e5" /></div><div><p style={styles.label}>DT</p><p style={styles.value}>{cargaDetectada.dt || '---'}</p></div></div>
                <div style={styles.infoItem}><div style={styles.iconBox}><CreditCard size={18} color="#4f46e5" /></div><div><p style={styles.label}>Placa</p><p style={styles.value}>{cargaDetectada.placa || '---'}</p></div></div>
                <div style={styles.infoItem}><div style={styles.iconBox}><Package size={18} color="#4f46e5" /></div><div><p style={styles.label}>Peso</p><p style={styles.value}>{cargaDetectada.peso || '---'} kg</p></div></div>
              </div>
              <button style={styles.btnPrimary} onClick={salvarTudo} disabled={loading}>{loading ? <RefreshCw size={20} className="spin" /> : <CheckCircle2 size={20} />} Confirmar e Salvar no Sistema</button>
            </div>
          )}
        </section>

        <section className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><ClipboardList size={24} color="#64748b" /><h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Programação Ativa</h3></div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ ...styles.btnSecondary, backgroundColor: mostrarFinalizadas ? '#ecfdf5' : '#fff' }} 
                onClick={() => setMostrarFinalizadas(!mostrarFinalizadas)}
              >
                {mostrarFinalizadas ? <CheckCircle2 size={16} color="#10b981" /> : <Clock size={16} />} 
                {mostrarFinalizadas ? 'Exibindo Tudo' : 'Ocultar Finalizadas'}
              </button>
              <button style={styles.btnSecondary} onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'} <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} /></button>
            </div>
          </div>
          
          {showFilters && (
            <div style={styles.filterBar}>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>📅 Data Coleta</label><input type="date" style={styles.filterInput} value={filtroDataColeta} onChange={(e) => setFiltroDataColeta(e.target.value)} /></div>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>📅 Data Entrega</label><input type="date" style={styles.filterInput} value={filtroDataEntrega} onChange={(e) => setFiltroDataEntrega(e.target.value)} /></div>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>🏙️ Cidade Coleta</label><select style={styles.filterSelect} value={filtroCidadeColeta} onChange={(e) => setFiltroCidadeColeta(e.target.value)}><option value="">Todas as Cidades</option>{cidadesColeta.map(([cidade, qtd]) => (<option key={cidade} value={cidade}>{cidade} ({qtd})</option>))}</select></div>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>🏙️ Cidade Entrega</label><select style={styles.filterSelect} value={filtroCidadeEntrega} onChange={(e) => setFiltroCidadeEntrega(e.target.value)}><option value="">Todas as Cidades</option>{cidadesEntrega.map(([cidade, qtd]) => (<option key={cidade} value={cidade}>{cidade} ({qtd})</option>))}</select></div>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>🏢 Cliente</label><input type="text" style={styles.filterInput} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Nome do cliente..." list="clientes-list" /><datalist id="clientes-list">{clientesUnicos.map(([cliente]) => (<option key={cliente} value={cliente} />))}</datalist></div>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>👤 Motorista</label><input type="text" style={styles.filterInput} value={filtroMotorista} onChange={(e) => setFiltroMotorista(e.target.value)} placeholder="Nome do motorista..." /></div>
              <div style={styles.filterGroup}><label style={styles.filterLabel}>🚛 Limite</label><select style={styles.filterSelect} value={filtroQuantidadeVeiculos} onChange={(e) => setFiltroQuantidadeVeiculos(e.target.value)}><option value="todos">Todos</option><option value="5">5 veíc.</option><option value="10">10 veíc.</option><option value="20">20 veíc.</option><option value="50">50 veíc.</option></select></div>
              {(filtroDataColeta || filtroDataEntrega || filtroCidadeColeta || filtroCidadeEntrega || filtroCliente || filtroMotorista || filtroQuantidadeVeiculos !== 'todos') && (<div style={styles.filterGroup}><label style={styles.filterLabel}>&nbsp;</label><button style={styles.clearBtn} onClick={() => { setFiltroDataColeta(''); setFiltroDataEntrega(''); setFiltroCidadeColeta(''); setFiltroCidadeEntrega(''); setFiltroCliente(''); setFiltroMotorista(''); setFiltroQuantidadeVeiculos('todos'); }}><X size={16} /> Limpar</button></div>)}
            </div>
          )}

          <div style={{ marginBottom: '16px', padding: '12px 20px', backgroundColor: '#fff', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}><span style={{ fontSize: '13px', color: '#64748b' }}><strong>{cargasFiltradas.length}</strong> cargas encontradas</span><span style={{ fontSize: '13px', color: '#64748b' }}><strong>{stats.pesoTotal}</strong> kg total</span></div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{stats.clientesTop.slice(0, 3).map(([cliente, qtd]) => (<span key={cliente} style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', color: '#475569' }}>{cliente.substring(0, 20)}: {qtd}</span>))}</div>
          </div>

          {cargasFiltradas.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '60px', border: '2px dashed #e2e8f0', backgroundColor: 'transparent' }}><Search size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} /><p style={{ color: '#94a3b8', fontWeight: 500, fontSize: '16px' }}>Nenhuma carga encontrada com os filtros aplicados.</p><button style={{ ...styles.btnSecondary, marginTop: '16px' }} onClick={() => { setFiltroDataColeta(''); setFiltroDataEntrega(''); setFiltroCidadeColeta(''); setFiltroCidadeEntrega(''); setFiltroCliente(''); setFiltroMotorista(''); setFiltroQuantidadeVeiculos('todos'); }}>Limpar Filtros</button></div>
          ) : (
            Object.entries(cargasAgrupadas).map(([grupo, cargas]) => (
              <div key={grupo} style={{ marginBottom: '32px' }}>
                <div style={styles.groupHeader}>
                  <Layers size={18} color="#64748b" />
                  <h4 style={styles.groupTitle}>{grupo}</h4>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>{cargas.length} veículo(s)</span>
                </div>
                {cargas.map((item) => (
                  <div key={item.id} style={styles.itemCard(item.status)}>
                    <div style={styles.itemHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><div style={{ padding: '12px', borderRadius: '14px', backgroundColor: item.status === 'finalizada' ? '#ecfdf5' : '#eef2ff' }}><Truck size={24} color={item.status === 'finalizada' ? '#10b981' : '#4f46e5'} /></div><div><h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}><span style={{ backgroundColor: '#f1f5f9', padding: '2px 10px', borderRadius: '20px', fontSize: '14px' }}>DT: {item.dt || '---'}</span><span style={{ color: '#334155' }}>{item.motorista || 'Motorista não informado'}</span></h4><div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}><span style={styles.statusBadge(item.status)}>{item.status === 'finalizada' ? '✓ Finalizada' : '⏳ Programada'}</span><span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Coleta: {item.coletaData || '---'}</span></div></div></div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={styles.actionBtn('#f1f5f9', '#4f46e5')} onClick={() => { setEditandoCarga(item); setShowEditModal(true); }}><Edit3 size={16} /> Editar</button>
                        {item.status !== 'finalizada' && (<button style={styles.actionBtn('#ecfdf5', '#059669')} onClick={() => updateDoc(doc(db, "cargas_programadas", item.id!), { status: 'finalizada' })}><CheckCircle2 size={16} /> Finalizar</button>)}
                        <button style={styles.actionBtn('#fef2f2', '#dc2626')} onClick={() => { if(window.confirm('Excluir esta carga?')) deleteDoc(doc(db, "cargas_programadas", item.id!)) }}><Trash2 size={16} /> Excluir</button>
                      </div>
                    </div>
                    <div style={styles.logisticsGrid}>
                      <div style={styles.locationBox('#4f46e5')}><div style={styles.dot('#4f46e5')} /><p style={styles.locationTitle('#4f46e5')}>📍 ORIGEM / COLETA</p><p style={styles.cityName}>{item.coletaCidade || 'Cidade não informada'}</p><p style={styles.localName}>{item.coletaLocal || 'Local não informado'}</p><p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{item.coletaData || 'Data não informada'}</p>{item.coletaLink && (<a href={item.coletaLink} target="_blank" rel="noreferrer" style={styles.mapLink('#4f46e5')}><MapPin size={12} /> Ver no Mapa <ExternalLink size={10} /></a>)}</div>
                      {item.tipo === 'com_troca' && item.troca && (<div style={styles.trocaBanner}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}><ArrowRightLeft size={16} /><span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Troca de Nota Fiscal</span></div><p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{item.troca.cliente || 'Cliente não informado'}</p><p style={{ margin: 0, fontSize: '12px', color: '#78350f' }}>{item.troca.cidade || 'Cidade não informada'}</p>{item.troca.link && (<a href={item.troca.link} target="_blank" rel="noreferrer" style={styles.mapLink('#b45309')}><MapPin size={12} /> Ver no Mapa</a>)}</div>)}
                      <div style={styles.locationBox('#10b981')}><div style={styles.dot('#10b981')} /><p style={styles.locationTitle('#10b981')}>🎯 DESTINO / ENTREGA</p><p style={styles.cityName}>{item.entregaCidade || 'Cidade não informada'}</p><p style={styles.localName}>{item.entregaLocal || 'Local não informado'}</p><p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '4px' }}><Calendar size={12} style={{ marginRight: '4px' }} /> {item.entregaData || 'Data não informada'}</p>{item.entregaLink && (<a href={item.entregaLink} target="_blank" rel="noreferrer" style={styles.mapLink('#10b981')}><MapPin size={12} /> Ver no Mapa <ExternalLink size={10} /></a>)}</div>
                      <div style={styles.vehicleDetails}><p style={{ ...styles.locationTitle('#94a3b8'), marginBottom: '12px' }}>🚛 VEÍCULO & CARGA</p><div style={styles.detailRow}><span style={{ color: '#64748b' }}>Placa:</span><span style={{ fontWeight: 700 }}>{item.placa || '---'}</span></div><div style={styles.detailRow}><span style={{ color: '#64748b' }}>Carreta:</span><span style={{ fontWeight: 700 }}>{item.carreta || '---'}</span></div><div style={styles.detailRow}><span style={{ color: '#64748b' }}>Peso:</span><span style={{ fontWeight: 700, color: '#4f46e5' }}>{item.peso || '0'} kg</span></div></div>
                    </div>
                    <div style={styles.footer}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={14} color="#94a3b8" /><span style={{ fontSize: '12px', color: '#64748b' }}>PVs: <span style={{ fontWeight: 600, color: '#334155' }}>{item.pvs && item.pvs.length > 0 ? item.pvs.join(', ') : 'Nenhum'}</span></span></div>{item.obs && (<div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px' }}>Obs: {item.obs}</div>)}</div>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>
      </div>

      {/* MODAL DE RELATÓRIO COMERCIAL MELHORADO */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} id="modal-report">
            <div style={styles.modalHeader} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '10px', borderRadius: '14px' }}><BarChart3 size={22} color="#fff" /></div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Relatório Comercial Detalhado</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={styles.btnPrimary} onClick={() => window.print()}><Printer size={18} /> Imprimir PDF</button>
                <button style={{ ...styles.actionBtn('#f1f5f9', '#64748b'), padding: '10px 14px' }} onClick={() => setShowModal(false)}><X size={22} /></button>
              </div>
            </div>
            
            <div style={styles.modalBody} className="report-container">
              <div className="report-header">
                <h1 style={{ margin: 0, color: '#1e293b' }}>Logística TG - Relatório de Operações</h1>
                <p style={{ color: '#64748b' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div className="stat-grid">
                <div className="stat-box">
                  <p style={styles.statLabel}>Total de Viagens</p>
                  <p style={styles.statNumber}>{stats.totalVeiculos}</p>
                </div>
                <div className="stat-box">
                  <p style={styles.statLabel}>Peso Total Transportado</p>
                  <p style={styles.statNumber}>{stats.pesoTotal} kg</p>
                </div>
                <div className="stat-box">
                  <p style={styles.statLabel}>Principais Clientes</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0' }}>{stats.clientesTop[0]?.[0] || '---'}</p>
                </div>
                <div className="stat-box">
                  <p style={styles.statLabel}>Status Operacional</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0', color: '#10b981' }}>Ativo</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }} className="no-print">
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: '#1e293b' }}>Top 10 Clientes (Volume)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.clientesTop.map(([cliente, qtd]) => (
                      <div key={cliente} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{cliente}</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5' }}>{qtd} viagens</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: '#1e293b' }}>Top Motoristas</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.motoristasTop.map(([mot, qtd]) => (
                      <div key={mot} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{mot}</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>{qtd} viagens</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: '#1e293b' }}>Listagem Detalhada de Cargas</h3>
              <table>
                <thead>
                  <tr>
                    <th>DT</th>
                    <th>Motorista</th>
                    <th>Placa</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Peso (kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cargasFiltradas.map(c => (
                    <tr key={c.id}>
                      <td>{c.dt}</td>
                      <td>{c.motorista}</td>
                      <td>{c.placa}</td>
                      <td>{c.coletaCidade} - {c.coletaLocal}</td>
                      <td>{c.entregaCidade} - {c.entregaLocal}</td>
                      <td>{c.peso}</td>
                      <td style={{ color: c.status === 'finalizada' ? '#10b981' : '#f97316', fontWeight: 700 }}>
                        {c.status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CARGA */}
      {showEditModal && editandoCarga && (
        <div style={styles.modalOverlay} onClick={() => { setShowEditModal(false); setEditandoCarga(null); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '10px', borderRadius: '14px' }}><Edit3 size={22} color="#fff" /></div><h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Editar Carga</h2></div><button style={{ ...styles.actionBtn('#f1f5f9', '#64748b'), padding: '10px 14px' }} onClick={() => { setShowEditModal(false); setEditandoCarga(null); }}><X size={22} /></button></div>
            <div style={styles.modalBody}>
              <div style={styles.formSectionTitle}>Informações Básicas</div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}><label style={styles.formLabel}>Motorista</label><input style={styles.formInput} value={editandoCarga.motorista} onChange={e => setEditandoCarga({...editandoCarga, motorista: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>CPF</label><input style={styles.formInput} value={editandoCarga.cpf} onChange={e => setEditandoCarga({...editandoCarga, cpf: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>DT</label><input style={styles.formInput} value={editandoCarga.dt} onChange={e => setEditandoCarga({...editandoCarga, dt: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Peso (kg)</label><input style={styles.formInput} value={editandoCarga.peso} onChange={e => setEditandoCarga({...editandoCarga, peso: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Placa</label><input style={styles.formInput} value={editandoCarga.placa} onChange={e => setEditandoCarga({...editandoCarga, placa: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Carreta</label><input style={styles.formInput} value={editandoCarga.carreta} onChange={e => setEditandoCarga({...editandoCarga, carreta: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Status</label><select style={styles.formInput} value={editandoCarga.status} onChange={e => setEditandoCarga({...editandoCarga, status: e.target.value as any})}><option value="programada">Programada</option><option value="finalizada">Finalizada</option></select></div>
              </div>
              <div style={styles.formSectionTitle}>Origem / Coleta</div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}><label style={styles.formLabel}>Data Coleta</label><input style={styles.formInput} value={editandoCarga.coletaData} onChange={e => setEditandoCarga({...editandoCarga, coletaData: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Cidade Coleta</label><input style={styles.formInput} value={editandoCarga.coletaCidade} onChange={e => setEditandoCarga({...editandoCarga, coletaCidade: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Local Coleta</label><input style={styles.formInput} value={editandoCarga.coletaLocal} onChange={e => setEditandoCarga({...editandoCarga, coletaLocal: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Link Mapa Coleta</label><input style={styles.formInput} value={editandoCarga.coletaLink} onChange={e => setEditandoCarga({...editandoCarga, coletaLink: e.target.value})} /></div>
              </div>
              <div style={styles.formSectionTitle}>Destino / Entrega</div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}><label style={styles.formLabel}>Data Entrega</label><input style={styles.formInput} value={editandoCarga.entregaData} onChange={e => setEditandoCarga({...editandoCarga, entregaData: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Cidade Entrega</label><input style={styles.formInput} value={editandoCarga.entregaCidade} onChange={e => setEditandoCarga({...editandoCarga, entregaCidade: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Local Entrega</label><input style={styles.formInput} value={editandoCarga.entregaLocal} onChange={e => setEditandoCarga({...editandoCarga, entregaLocal: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Link Mapa Entrega</label><input style={styles.formInput} value={editandoCarga.entregaLink} onChange={e => setEditandoCarga({...editandoCarga, entregaLink: e.target.value})} /></div>
              </div>
              <div style={styles.formSectionTitle}>Troca de Nota (Opcional)</div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}><label style={styles.formLabel}>Tipo de Carga</label><select style={styles.formInput} value={editandoCarga.tipo} onChange={e => setEditandoCarga({...editandoCarga, tipo: e.target.value as any})}><option value="normal">Normal</option><option value="com_troca">Com Troca</option></select></div>
                {editandoCarga.tipo === 'com_troca' && (
                  <>
                    <div style={styles.formGroup}><label style={styles.formLabel}>Cliente Troca</label><input style={styles.formInput} value={editandoCarga.troca?.cliente || ''} onChange={e => setEditandoCarga({...editandoCarga, troca: {...(editandoCarga.troca || {cliente:'', cidade:'', link:''}), cliente: e.target.value}})} /></div>
                    <div style={styles.formGroup}><label style={styles.formLabel}>Cidade Troca</label><input style={styles.formInput} value={editandoCarga.troca?.cidade || ''} onChange={e => setEditandoCarga({...editandoCarga, troca: {...(editandoCarga.troca || {cliente:'', cidade:'', link:''}), cidade: e.target.value}})} /></div>
                    <div style={styles.formGroup}><label style={styles.formLabel}>Link Mapa Troca</label><input style={styles.formInput} value={editandoCarga.troca?.link || ''} onChange={e => setEditandoCarga({...editandoCarga, troca: {...(editandoCarga.troca || {cliente:'', cidade:'', link:''}), link: e.target.value}})} /></div>
                  </>
                )}
              </div>
              <div style={styles.formSectionTitle}>Outros Detalhes</div>
              <div style={styles.formGrid}><div style={styles.formGroup}><label style={styles.formLabel}>PVs (separados por vírgula)</label><input style={styles.formInput} value={editandoCarga.pvs?.join(', ') || ''} onChange={e => setEditandoCarga({...editandoCarga, pvs: e.target.value.split(',').map(s => s.trim())})} /></div><div style={styles.formGroup}><label style={styles.formLabel}>Observações</label><textarea style={{...styles.formInput, height: '80px', resize: 'none'}} value={editandoCarga.obs} onChange={e => setEditandoCarga({...editandoCarga, obs: e.target.value})} /></div></div>
              <div style={{ marginTop: '40px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}><button style={{ ...styles.btnSecondary, padding: '14px 32px' }} onClick={() => { setShowEditModal(false); setEditandoCarga(null); }}>Cancelar</button><button style={{ ...styles.btnPrimary, width: 'auto', padding: '14px 48px' }} onClick={handleSalvarEdicao} disabled={loading}>{loading ? <RefreshCw size={20} className="spin" /> : 'Salvar Alterações'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciadorDeCargas;