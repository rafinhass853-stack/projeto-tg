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
  getDocs 
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
  Building2,
  Clock,
  TrendingUp
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
}

const GerenciadorDeCargas: React.FC = () => {
  const [textoColado, setTextoColado] = useState('');
  const [cargaDetectada, setCargaDetectada] = useState<CargaData | null>(null);
  const [listaCargas, setListaCargas] = useState<CargaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Estados para Filtros
  const [filtroDataColeta, setFiltroDataColeta] = useState('');
  const [filtroDataEntrega, setFiltroDataEntrega] = useState('');
  const [filtroCidadeColeta, setFiltroCidadeColeta] = useState('');
  const [filtroCidadeEntrega, setFiltroCidadeEntrega] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroQuantidadeVeiculos, setFiltroQuantidadeVeiculos] = useState('');

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
      if (carga.coletaLocal) {
        clientes.set(carga.coletaLocal, (clientes.get(carga.coletaLocal) || 0) + 1);
      }
      if (carga.entregaLocal) {
        clientes.set(carga.entregaLocal, (clientes.get(carga.entregaLocal) || 0) + 1);
      }
    });
    return Array.from(clientes.entries()).sort((a, b) => b[1] - a[1]);
  }, [listaCargas]);

  // Lógica de Filtragem
  const cargasFiltradas = useMemo(() => {
    let resultado = listaCargas.filter(carga => {
      const dataColetaFormatada = filtroDataColeta ? filtroDataColeta.split('-').reverse().join('/') : '';
      const dataEntregaFormatada = filtroDataEntrega ? filtroDataEntrega.split('-').reverse().join('/') : '';

      const bateDataColeta = !filtroDataColeta || carga.coletaData.includes(dataColetaFormatada);
      const bateDataEntrega = !filtroDataEntrega || carga.entregaData.includes(dataEntregaFormatada);
      const bateCidadeColeta = !filtroCidadeColeta || carga.coletaCidade.toLowerCase() === filtroCidadeColeta.toLowerCase();
      const bateCidadeEntrega = !filtroCidadeEntrega || carga.entregaCidade.toLowerCase() === filtroCidadeEntrega.toLowerCase();
      const bateCliente = !filtroCliente || 
        carga.coletaLocal.toLowerCase().includes(filtroCliente.toLowerCase()) ||
        carga.entregaLocal.toLowerCase().includes(filtroCliente.toLowerCase());
      
      return bateDataColeta && bateDataEntrega && bateCidadeColeta && bateCidadeEntrega && bateCliente;
    });

    // Aplicar filtro de quantidade
    if (filtroQuantidadeVeiculos && filtroQuantidadeVeiculos !== 'todos') {
      const limite = parseInt(filtroQuantidadeVeiculos);
      if (!isNaN(limite)) {
        resultado = resultado.slice(0, limite);
      }
    }

    return resultado;
  }, [listaCargas, filtroDataColeta, filtroDataEntrega, filtroCidadeColeta, filtroCidadeEntrega, filtroCliente, filtroQuantidadeVeiculos]);

  // Estatísticas
  const stats = useMemo(() => {
    const cidadesColeta = new Map<string, number>();
    const cidadesEntrega = new Map<string, number>();
    let pesoTotal = 0;
    const clientesCount = new Map<string, number>();

    cargasFiltradas.forEach(c => {
      if (c.coletaCidade) {
        cidadesColeta.set(c.coletaCidade, (cidadesColeta.get(c.coletaCidade) || 0) + 1);
      }
      if (c.entregaCidade) {
        cidadesEntrega.set(c.entregaCidade, (cidadesEntrega.get(c.entregaCidade) || 0) + 1);
      }
      if (c.coletaLocal) {
        clientesCount.set(c.coletaLocal, (clientesCount.get(c.coletaLocal) || 0) + 1);
      }
      if (c.entregaLocal) {
        clientesCount.set(c.entregaLocal, (clientesCount.get(c.entregaLocal) || 0) + 1);
      }
      pesoTotal += parseFloat(c.peso.replace(/[^\d]/g, '')) || 0;
    });

    return {
      totalVeiculos: cargasFiltradas.length,
      pesoTotal: pesoTotal.toLocaleString('pt-BR'),
      distribuicaoColeta: Array.from(cidadesColeta.entries()).sort((a, b) => b[1] - a[1]),
      distribuicaoEntrega: Array.from(cidadesEntrega.entries()).sort((a, b) => b[1] - a[1]),
      clientesTop: Array.from(clientesCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
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
          } else {
            novaCarga.placa = conteudo;
          }
        }

        if (linha.toUpperCase().startsWith('COLETA')) { 
          novaCarga.coletaData = linha.replace(/COLETA/i, '').trim(); 
          blocoAtual = 'COLETA'; 
        }
        if (linha.toUpperCase().startsWith('ENTREGA')) { 
          novaCarga.entregaData = linha.replace(/ENTREGA/i, '').trim(); 
          blocoAtual = 'ENTREGA'; 
        }
        if (linha.toUpperCase().includes('TROCA')) { 
          blocoAtual = 'TROCA'; 
          novaCarga.tipo = 'com_troca';
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
           if (!linha.includes('CPF') && !linha.includes('DT') && !linha.includes('Peso')) {
             novaCarga.pvs.push(linha.trim());
           }
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
      if (snapVei.empty) {
        await addDoc(collection(db, "veiculos"), { placa: dados.placa, dataCadastro: serverTimestamp(), tipo: "Não Definido" });
      }
    }
    if (dados.carreta) {
      const qCar = query(collection(db, "carretas"), where("placa", "==", dados.carreta));
      const snapCar = await getDocs(qCar);
      if (snapCar.empty) {
        await addDoc(collection(db, "carretas"), { placa: dados.carreta, dataCadastro: serverTimestamp() });
      }
    }
  };

  const salvarTudo = async () => {
    if (!cargaDetectada) return;
    setLoading(true);
    try {
      await realizarAutoCadastros(cargaDetectada);
      await addDoc(collection(db, "cargas_programadas"), { ...cargaDetectada, criadoEm: serverTimestamp() });
      setTextoColado('');
      setCargaDetectada(null);
      alert("Sucesso: Carga salva e cadastros verificados!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar no sistema.");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: { 
      padding: '32px', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #eef2f6 100%)',
      minHeight: '100vh', 
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      color: '#1e293b' 
    },
    header: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '32px', 
      flexWrap: 'wrap' as const, 
      gap: '16px' 
    },
    title: { 
      fontSize: '28px', 
      fontWeight: 800, 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      margin: 0, 
      background: 'linear-gradient(135deg, #1e293b 0%, #4f46e5 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    badge: { 
      backgroundColor: '#fff', 
      padding: '8px 20px', 
      borderRadius: '40px', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
      border: '1px solid #e2e8f0', 
      fontSize: '14px', 
      fontWeight: 600, 
      color: '#4f46e5' 
    },
    card: { 
      backgroundColor: '#fff', 
      borderRadius: '24px', 
      boxShadow: '0 10px 40px rgba(0,0,0,0.06)', 
      border: '1px solid #eef2ff', 
      padding: '32px', 
      marginBottom: '32px',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    textarea: { 
      width: '100%', 
      minHeight: '120px', 
      padding: '16px', 
      backgroundColor: '#f8fafc', 
      border: '2px solid #e2e8f0', 
      borderRadius: '16px', 
      fontSize: '14px', 
      outline: 'none', 
      boxSizing: 'border-box' as const,
      fontFamily: 'monospace',
      transition: 'all 0.2s',
      ':focus': { borderColor: '#4f46e5', backgroundColor: '#fff' }
    },
    previewBox: { 
      marginTop: '20px', 
      padding: '24px', 
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', 
      borderRadius: '20px', 
      border: '1px solid #c7d2fe', 
      display: 'flex', 
      flexDirection: 'column' as const, 
      gap: '20px' 
    },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
    infoItem: { display: 'flex', alignItems: 'center', gap: '12px' },
    iconBox: { 
      padding: '10px', 
      backgroundColor: '#fff', 
      borderRadius: '14px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    label: { fontSize: '10px', textTransform: 'uppercase' as const, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.8px', margin: '0 0 2px 0' },
    value: { fontSize: '15px', fontWeight: 700, color: '#5b21b6', margin: 0 },
    btnPrimary: { 
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
      color: '#fff', 
      border: 'none', 
      padding: '14px 28px', 
      borderRadius: '14px', 
      fontWeight: 700, 
      fontSize: '15px', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '8px', 
      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
      transition: 'all 0.2s'
    },
    btnSecondary: { 
      backgroundColor: '#fff', 
      color: '#1e293b', 
      border: '1px solid #e2e8f0', 
      padding: '10px 20px', 
      borderRadius: '12px', 
      fontWeight: 600, 
      fontSize: '14px', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
    },
    
    filterBar: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
      gap: '16px', 
      marginBottom: '24px', 
      alignItems: 'flex-end',
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '20px',
      border: '1px solid #eef2ff'
    },
    filterGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    filterLabel: { fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.8px' },
    filterInput: { 
      padding: '10px 14px', 
      borderRadius: '12px', 
      border: '1.5px solid #e2e8f0', 
      outline: 'none', 
      fontSize: '14px', 
      backgroundColor: '#fafbff',
      transition: 'all 0.2s'
    },
    filterSelect: { 
      padding: '10px 14px', 
      borderRadius: '12px', 
      border: '1.5px solid #e2e8f0', 
      outline: 'none', 
      fontSize: '14px', 
      backgroundColor: '#fafbff', 
      cursor: 'pointer' 
    },
    clearBtn: { 
      padding: '10px 16px', 
      borderRadius: '12px', 
      border: '1.5px solid #fee2e2', 
      backgroundColor: '#fff', 
      color: '#ef4444', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '6px',
      fontWeight: 600,
      fontSize: '13px'
    },

    itemCard: (status: string) => ({ 
      backgroundColor: '#fff', 
      borderRadius: '20px', 
      borderLeft: `6px solid ${status === 'finalizada' ? '#10b981' : '#4f46e5'}`, 
      padding: '24px', 
      marginBottom: '20px', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
      display: 'flex', 
      flexDirection: 'column' as const, 
      gap: '20px',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }),
    itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap' as const, gap: '12px' },
    statusBadge: (status: string) => ({ 
      padding: '4px 14px', 
      borderRadius: '30px', 
      fontSize: '11px', 
      fontWeight: 800, 
      textTransform: 'uppercase' as const, 
      backgroundColor: status === 'finalizada' ? '#d1fae5' : '#e0e7ff', 
      color: status === 'finalizada' ? '#065f46' : '#3730a3' 
    }),
    logisticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' },
    locationBox: (color: string) => ({ position: 'relative' as const, paddingLeft: '20px', borderLeft: `3px solid ${color}` }),
    dot: (color: string) => ({ position: 'absolute' as const, left: '-7px', top: '0', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff', border: `3px solid ${color}` }),
    locationTitle: (color: string) => ({ fontSize: '10px', fontWeight: 800, color: color, textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '6px' }),
    cityName: { fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' },
    localName: { fontSize: '13px', color: '#64748b', margin: 0 },
    mapLink: (color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: color, textDecoration: 'none', fontWeight: 600, marginTop: '8px' }),
    vehicleDetails: { backgroundColor: '#fafbff', padding: '16px', borderRadius: '14px', border: '1px solid #eef2ff' },
    detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' },
    trocaBanner: { backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column' as const, gap: '8px', fontSize: '13px', color: '#92400e' },
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' as const, gap: '12px' },
    actionBtn: (bg: string, color: string) => ({ 
      padding: '8px 14px', 
      borderRadius: '10px', 
      border: 'none', 
      backgroundColor: bg, 
      color: color, 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px', 
      fontSize: '12px', 
      fontWeight: 600,
      transition: 'all 0.2s'
    }),

    modalOverlay: { 
      position: 'fixed' as const, 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      backgroundColor: 'rgba(15, 23, 42, 0.85)', 
      backdropFilter: 'blur(8px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000, 
      padding: '20px' 
    },
    modalContent: { 
      backgroundColor: '#fff', 
      borderRadius: '28px', 
      width: '100%', 
      maxWidth: '1100px', 
      maxHeight: '90vh', 
      overflowY: 'auto' as const, 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', 
      position: 'relative' as const 
    },
    modalHeader: { 
      padding: '24px 32px', 
      borderBottom: '1px solid #f1f5f9', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      position: 'sticky' as const, 
      top: 0, 
      backgroundColor: '#fff', 
      zIndex: 10,
      borderTopLeftRadius: '28px',
      borderTopRightRadius: '28px'
    },
    modalBody: { padding: '32px' },
    statCard: { 
      backgroundColor: '#f8fafc', 
      borderRadius: '20px', 
      padding: '20px', 
      border: '1px solid #eef2ff',
      transition: 'transform 0.2s'
    },
    cityPill: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '10px 18px', 
      backgroundColor: '#f1f5f9', 
      borderRadius: '30px', 
      fontSize: '13px', 
      fontWeight: 600,
      gap: '8px'
    },
    statNumber: { fontSize: '32px', fontWeight: 800, color: '#1e293b', margin: 0 },
    statLabel: { fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #modal-report, #modal-report * { visibility: visible; }
            #modal-report { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; }
            .no-print { display: none !important; }
            @page { size: landscape; margin: 1.5cm; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; color: #1e293b; }
            tr:nth-child(even) { background-color: #f8fafc; }
          }
          
          * {
            box-sizing: border-box;
          }
          
          input:focus, select:focus, textarea:focus {
            border-color: #4f46e5 !important;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important;
          }
          
          button:hover {
            transform: translateY(-1px);
            filter: brightness(0.98);
          }
        `}
      </style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={styles.header} className="no-print">
          <div>
            <h1 style={styles.title}>
              <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '10px', borderRadius: '16px' }}>
                <Truck size={32} color="#fff" />
              </div>
              Logística TG
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>Gestão Inteligente de Transportes</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={styles.btnSecondary} onClick={() => setShowModal(true)}>
              <BarChart3 size={18} /> Relatório Comercial
            </button>
            <div style={styles.badge}>
              <TrendingUp size={14} style={{ marginRight: '6px' }} />
              {listaCargas.length} Cargas Ativas
            </div>
          </div>
        </header>

        <section style={styles.card} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '8px', borderRadius: '14px' }}>
              <PlusCircle size={20} color="#fff" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Lançar Nova Carga</h2>
          </div>
          <textarea
            style={styles.textarea}
            value={textoColado}
            onChange={(e) => { setTextoColado(e.target.value); parsearCarga(e.target.value); }}
            placeholder="Cole aqui o texto do WhatsApp com os dados da carga..."
          />
          {cargaDetectada && (
            <div style={styles.previewBox}>
              <div style={styles.grid4}>
                <div style={styles.infoItem}>
                  <div style={styles.iconBox}><User size={18} color="#4f46e5" /></div>
                  <div><p style={styles.label}>Motorista</p><p style={styles.value}>{cargaDetectada.motorista || '---'}</p></div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.iconBox}><Hash size={18} color="#4f46e5" /></div>
                  <div><p style={styles.label}>DT</p><p style={styles.value}>{cargaDetectada.dt || '---'}</p></div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.iconBox}><CreditCard size={18} color="#4f46e5" /></div>
                  <div><p style={styles.label}>Placa</p><p style={styles.value}>{cargaDetectada.placa || '---'}</p></div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.iconBox}><Package size={18} color="#4f46e5" /></div>
                  <div><p style={styles.label}>Peso</p><p style={styles.value}>{cargaDetectada.peso || '---'} kg</p></div>
                </div>
              </div>
              <button style={styles.btnPrimary} onClick={salvarTudo} disabled={loading}>
                {loading ? <RefreshCw size={20} className="spin" /> : <CheckCircle2 size={20} />} 
                Confirmar e Salvar no Sistema
              </button>
            </div>
          )}
        </section>

        <section className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ClipboardList size={24} color="#64748b" />
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Programação Ativa</h3>
            </div>
            <button 
              style={styles.btnSecondary}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'} <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>

          {showFilters && (
            <div style={styles.filterBar}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>📅 Data Coleta</label>
                <input type="date" style={styles.filterInput} value={filtroDataColeta} onChange={(e) => setFiltroDataColeta(e.target.value)} />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>📅 Data Entrega</label>
                <input type="date" style={styles.filterInput} value={filtroDataEntrega} onChange={(e) => setFiltroDataEntrega(e.target.value)} />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>🏙️ Cidade Coleta</label>
                <select style={styles.filterSelect} value={filtroCidadeColeta} onChange={(e) => setFiltroCidadeColeta(e.target.value)}>
                  <option value="">Todas as Cidades</option>
                  {cidadesColeta.map(([cidade, qtd]) => (
                    <option key={cidade} value={cidade}>{cidade} ({qtd})</option>
                  ))}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>🏙️ Cidade Entrega</label>
                <select style={styles.filterSelect} value={filtroCidadeEntrega} onChange={(e) => setFiltroCidadeEntrega(e.target.value)}>
                  <option value="">Todas as Cidades</option>
                  {cidadesEntrega.map(([cidade, qtd]) => (
                    <option key={cidade} value={cidade}>{cidade} ({qtd})</option>
                  ))}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>🏢 Cliente</label>
                <input 
                  type="text" 
                  style={styles.filterInput} 
                  value={filtroCliente} 
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  list="clientes-list"
                />
                <datalist id="clientes-list">
                  {clientesUnicos.map(([cliente]) => (
                    <option key={cliente} value={cliente} />
                  ))}
                </datalist>
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>🚛 Limite Veículos</label>
                <select style={styles.filterSelect} value={filtroQuantidadeVeiculos} onChange={(e) => setFiltroQuantidadeVeiculos(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="5">5 veículos</option>
                  <option value="10">10 veículos</option>
                  <option value="20">20 veículos</option>
                  <option value="50">50 veículos</option>
                </select>
              </div>
              {(filtroDataColeta || filtroDataEntrega || filtroCidadeColeta || filtroCidadeEntrega || filtroCliente || filtroQuantidadeVeiculos !== 'todos') && (
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}> </label>
                  <button style={styles.clearBtn} onClick={() => { 
                    setFiltroDataColeta(''); 
                    setFiltroDataEntrega(''); 
                    setFiltroCidadeColeta(''); 
                    setFiltroCidadeEntrega('');
                    setFiltroCliente('');
                    setFiltroQuantidadeVeiculos('todos');
                  }}>
                    <X size={16} /> Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px', padding: '12px 20px', backgroundColor: '#fff', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                <strong>{cargasFiltradas.length}</strong> cargas encontradas
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                <strong>{stats.pesoTotal}</strong> kg total
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {stats.clientesTop.map(([cliente, qtd]) => (
                <span key={cliente} style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', color: '#475569' }}>
                  {cliente.substring(0, 20)}: {qtd}
                </span>
              ))}
            </div>
          </div>

          {cargasFiltradas.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '60px', border: '2px dashed #e2e8f0', backgroundColor: 'transparent' }}>
              <Search size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <p style={{ color: '#94a3b8', fontWeight: 500, fontSize: '16px' }}>Nenhuma carga encontrada com os filtros aplicados.</p>
              <button style={{ ...styles.btnSecondary, marginTop: '16px' }} onClick={() => { 
                setFiltroDataColeta(''); 
                setFiltroDataEntrega(''); 
                setFiltroCidadeColeta(''); 
                setFiltroCidadeEntrega('');
                setFiltroCliente('');
                setFiltroQuantidadeVeiculos('todos');
              }}>
                Limpar Filtros
              </button>
            </div>
          ) : (
            cargasFiltradas.map((item) => (
              <div key={item.id} style={styles.itemCard(item.status)}>
                <div style={styles.itemHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: item.status === 'finalizada' ? '#ecfdf5' : '#eef2ff' }}>
                      <Truck size={24} color={item.status === 'finalizada' ? '#10b981' : '#4f46e5'} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 10px', borderRadius: '20px', fontSize: '14px' }}>DT: {item.dt || '---'}</span>
                        <span style={{ color: '#334155' }}>{item.motorista || 'Motorista não informado'}</span>
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                        <span style={styles.statusBadge(item.status)}>
                          {item.status === 'finalizada' ? '✓ Finalizada' : '⏳ Programada'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Coleta: {item.coletaData || '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {item.status !== 'finalizada' && (
                      <button style={styles.actionBtn('#ecfdf5', '#059669')} onClick={() => updateDoc(doc(db, "cargas_programadas", item.id!), { status: 'finalizada' })}>
                        <CheckCircle2 size={16} /> Finalizar
                      </button>
                    )}
                    <button style={styles.actionBtn('#fef2f2', '#dc2626')} onClick={() => { if(window.confirm('Excluir esta carga?')) deleteDoc(doc(db, "cargas_programadas", item.id!)) }}>
                      <Trash2 size={16} /> Excluir
                    </button>
                  </div>
                </div>

                <div style={styles.logisticsGrid}>
                  <div style={styles.locationBox('#4f46e5')}>
                    <div style={styles.dot('#4f46e5')} />
                    <p style={styles.locationTitle('#4f46e5')}>📍 ORIGEM / COLETA</p>
                    <p style={styles.cityName}>{item.coletaCidade || 'Cidade não informada'}</p>
                    <p style={styles.localName}>{item.coletaLocal || 'Local não informado'}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{item.coletaData || 'Data não informada'}</p>
                    {item.coletaLink && (
                      <a href={item.coletaLink} target="_blank" rel="noreferrer" style={styles.mapLink('#4f46e5')}>
                        <MapPin size={12} /> Ver no Mapa <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {item.tipo === 'com_troca' && item.troca && (
                    <div style={styles.trocaBanner}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                        <ArrowRightLeft size={16} />
                        <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Troca de Nota Fiscal</span>
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{item.troca.cliente || 'Cliente não informado'}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#78350f' }}>{item.troca.cidade || 'Cidade não informada'}</p>
                      {item.troca.link && (
                        <a href={item.troca.link} target="_blank" rel="noreferrer" style={styles.mapLink('#b45309')}>
                          <MapPin size={12} /> Ver no Mapa
                        </a>
                      )}
                    </div>
                  )}

                  <div style={styles.locationBox('#10b981')}>
                    <div style={styles.dot('#10b981')} />
                    <p style={styles.locationTitle('#10b981')}>🎯 DESTINO / ENTREGA</p>
                    <p style={styles.cityName}>{item.entregaCidade || 'Cidade não informada'}</p>
                    <p style={styles.localName}>{item.entregaLocal || 'Local não informado'}</p>
                    <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>
                      <Calendar size={12} style={{ marginRight: '4px' }} /> {item.entregaData || 'Data não informada'}
                    </p>
                    {item.entregaLink && (
                      <a href={item.entregaLink} target="_blank" rel="noreferrer" style={styles.mapLink('#10b981')}>
                        <MapPin size={12} /> Ver no Mapa <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  <div style={styles.vehicleDetails}>
                    <p style={{ ...styles.locationTitle('#94a3b8'), marginBottom: '12px' }}>🚛 VEÍCULO & CARGA</p>
                    <div style={styles.detailRow}><span style={{ color: '#64748b' }}>Placa:</span><span style={{ fontWeight: 700 }}>{item.placa || '---'}</span></div>
                    <div style={styles.detailRow}><span style={{ color: '#64748b' }}>Carreta:</span><span style={{ fontWeight: 700 }}>{item.carreta || '---'}</span></div>
                    <div style={styles.detailRow}><span style={{ color: '#64748b' }}>Peso:</span><span style={{ fontWeight: 700, color: '#4f46e5' }}>{item.peso || '0'} kg</span></div>
                  </div>
                </div>

                <div style={styles.footer}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={14} color="#94a3b8" />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      PVs: <span style={{ fontWeight: 600, color: '#334155' }}>{item.pvs && item.pvs.length > 0 ? item.pvs.join(', ') : 'Nenhum'}</span>
                    </span>
                  </div>
                  {item.obs && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px' }}>
                      Obs: {item.obs}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* MODAL DE RELATÓRIO COMERCIAL - SEM PESO, PVs E OBS */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} id="modal-report">
            <div style={styles.modalHeader} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '10px', borderRadius: '14px' }}>
                  <BarChart3 size={22} color="#fff" />
                </div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Relatório Comercial de Cargas</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={styles.btnPrimary} onClick={() => window.print()}><Printer size={18} /> Imprimir / PDF</button>
                <button style={{ ...styles.actionBtn('#f1f5f9', '#64748b'), padding: '10px 14px' }} onClick={() => setShowModal(false)}><X size={22} /></button>
              </div>
            </div>

            <div style={styles.modalBody}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>Logística TG</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontWeight: 500 }}>Programação de Cargas</p>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  {filtroDataEntrega ? `📅 Entregas em: ${filtroDataEntrega.split('-').reverse().join('/')}` : 
                   filtroDataColeta ? `📅 Coletas em: ${filtroDataColeta.split('-').reverse().join('/')}` : '📅 Período: Geral'}
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '11px' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Total de Veículos</p>
                  <p style={styles.statNumber}>{stats.totalVeiculos}</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Cidades de Origem</p>
                  <p style={styles.statNumber}>{stats.distribuicaoColeta.length}</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Cidades de Destino</p>
                  <p style={styles.statNumber}>{stats.distribuicaoEntrega.length}</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Clientes Atendidos</p>
                  <p style={styles.statNumber}>{stats.clientesTop.length}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>📍 Principais Cidades de Origem</p>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.distribuicaoColeta.slice(0, 5).map(([cidade, qtd]) => (
                      <div key={cidade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{cidade}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#4f46e5' }}>{qtd} cargas</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>🎯 Principais Cidades de Destino</p>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.distribuicaoEntrega.slice(0, 5).map(([cidade, qtd]) => (
                      <div key={cidade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{cidade}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>{qtd} cargas</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto', marginTop: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: '#475569' }}>DT</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: '#475569' }}>Motorista</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: '#475569' }}>Placa / Carreta</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: '#475569' }}>Origem / Coleta</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: '#475569' }}>Destino / Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargasFiltradas.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                        <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px' }}>{item.dt || '---'}</td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>{item.motorista || '---'}</td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 600 }}>{item.placa || '---'}</span>
                          {item.carreta && <span style={{ color: '#64748b', fontSize: '11px' }}> / {item.carreta}</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.coletaCidade || '---'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.coletaLocal?.substring(0, 40)}</div>
                          <div style={{ fontSize: '10px', color: '#4f46e5', marginTop: '4px' }}>📅 {item.coletaData || '---'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.entregaCidade || '---'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.entregaLocal?.substring(0, 40)}</div>
                          <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>📅 {item.entregaData || '---'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '32px', borderTop: '1px solid #eef2ff', paddingTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Logística TG - Sistema de Gestão de Transportes</p>
                <p style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '4px' }}>Relatório gerado automaticamente - Todos os direitos reservados</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciadorDeCargas;