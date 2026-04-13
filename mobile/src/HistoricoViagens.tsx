import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { collectionGroup, query, orderBy, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';

const { width } = Dimensions.get('window');

const HistoricoViagens = ({ navigation, route }: any) => {
  const { nomeMotorista, cpfMotorista, motoristaDocId: motoristaDocIdParam } = route.params || {};

  const [viagens, setViagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'abertas' | 'finalizadas'>('finalizadas');
  
  // Modal para visualizar fotos
  const [modalVisible, setModalVisible] = useState(false);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<string[]>([]);
  const [modalTitulo, setModalTitulo] = useState('');
  const [motoristaDocId, setMotoristaDocId] = useState<string | null>(null);
  const [detalhesViagem, setDetalhesViagem] = useState<any>(null);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [cpfMotorista]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      if (!cpfMotorista) {
        setLoading(false);
        return;
      }

      // Primeiro, buscar o motoristaDocId se não veio nos params
      if (!motoristaDocIdParam) {
        const motoristasQuery = query(collectionGroup(db, 'motoristas'), where('cpf', '==', cpfMotorista));
        const motoristaSnapshot = await getDocs(motoristasQuery);
        if (!motoristaSnapshot.empty) {
          setMotoristaDocId(motoristaSnapshot.docs[0].id);
        }
      } else {
        setMotoristaDocId(motoristaDocIdParam);
      }

      const q = query(
        collectionGroup(db, 'cargas'),
        where('cpf', '==', cpfMotorista),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(q);
      const lista: any[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const viagemId = doc.id;
        
        // Buscar fotos do storage se tiver motoristaDocId
        let fotosColeta: string[] = [];
        let fotosDevolucao: string[] = [];
        let fotosCanhotos: string[] = [];
        
        if (motoristaDocIdParam || motoristaDocId) {
          const storageRef = ref(getStorage(), `motoristas/${motoristaDocIdParam || motoristaDocId}/viagens/${viagemId}`);
          try {
            const result = await listAll(storageRef);
            for (const itemRef of result.items) {
              const url = await getDownloadURL(itemRef);
              if (itemRef.name.includes('coleta')) {
                fotosColeta.push(url);
              } else if (itemRef.name.includes('devolucao')) {
                fotosDevolucao.push(url);
              } else if (itemRef.name.includes('canhoto')) {
                fotosCanhotos.push(url);
              }
            }
          } catch (error) {
            console.log('Sem fotos para esta viagem');
          }
        }
        
        lista.push({ 
          id: viagemId, 
          docId: doc.ref.path, 
          ...data,
          fotosColeta,
          fotosDevolucao,
          fotosCanhotos
        });
      }

      setViagens(lista);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert("Erro", "Não foi possível carregar as viagens.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status = '') => {
    const s = status.toLowerCase().trim();
    if (s === 'entregue' || s === 'finalizada' || s === 'concluída')
      return { label: 'FINALIZADA', color: '#22C55E', icon: 'checkmark-circle' as const };
    if (s === 'seguindo_para_entrega')
      return { label: 'EM ROTA', color: '#22C55E', icon: 'car-sport' as const };
    if (s === 'aguardando_carregamento')
      return { label: 'AGUARDANDO CARREGAMENTO', color: '#FFD700', icon: 'time' as const };
    if (s === 'chegou_entrega')
      return { label: 'CHEGOU NA ENTREGA', color: '#3B82F6', icon: 'flag' as const };
    if (s === 'programada')
      return { label: 'PROGRAMADA', color: '#FFD700', icon: 'calendar' as const };
    return { label: 'EM ANDAMENTO', color: '#3B82F6', icon: 'time' as const };
  };

  const verPontualidade = (dataHoraReal: string, dataHoraProgramada: string) => {
    if (!dataHoraReal || !dataHoraProgramada) return 'Não verificado';
    try {
      const [dataReal, horaReal] = dataHoraReal.split(' ');
      const [diaReal, mesReal, anoReal] = dataReal.split('/');
      const [horaRealStr, minutoRealStr] = horaReal.split(':');
      
      const dataRealObj = new Date(
        parseInt(anoReal),
        parseInt(mesReal) - 1,
        parseInt(diaReal),
        parseInt(horaRealStr),
        parseInt(minutoRealStr)
      );
      
      const [dataProg, horaProg] = dataHoraProgramada.split(' ');
      const [diaProg, mesProg, anoProg] = dataProg.split('/');
      const [horaProgStr, minutoProgStr] = horaProg.split(':');
      
      const dataProgObj = new Date(
        parseInt(anoProg),
        parseInt(mesProg) - 1,
        parseInt(diaProg),
        parseInt(horaProgStr),
        parseInt(minutoProgStr)
      );
      
      return dataRealObj <= dataProgObj ? '✅ On Time' : '⚠️ No Show';
    } catch (error) {
      return 'Erro na verificação';
    }
  };

  const abrirModalFotos = (fotos: string[], titulo: string) => {
    setFotosSelecionadas(fotos);
    setModalTitulo(titulo);
    setModalVisible(true);
  };

  const abrirDetalhesViagem = (viagem: any) => {
    setDetalhesViagem(viagem);
    setModalDetalhesVisible(true);
  };

  const viagensFiltradas = viagens.filter((viagem) => {
    const status = (viagem.status || '').toLowerCase().trim();
    if (activeTab === 'abertas')
      return ['programada', 'aguardando_carregamento', 'seguindo_para_entrega', 'chegou_entrega'].includes(status);
    if (activeTab === 'finalizadas')
      return ['entregue', 'finalizada', 'concluída'].includes(status);
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={28} color="#FFD700" />
          <Text style={styles.voltarText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>HISTÓRICO DE VIAGENS</Text>
        <Text style={styles.subtitle}>{nomeMotorista || 'Motorista'}</Text>
        <Text style={styles.cpfText}>CPF: {cpfMotorista || '—'}</Text>
      </View>

      <View style={styles.tabs}>
        {(['abertas', 'finalizadas'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabAtivo]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextAtivo]}>
              {tab === 'abertas' ? 'Em Aberto' : 'Finalizadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Carregando suas viagens...</Text>
        </View>
      ) : viagensFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={90} color="#333" />
          <Text style={styles.emptyText}>Nenhuma viagem encontrada</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {viagensFiltradas.map((viagem) => {
            const statusInfo = getStatusInfo(viagem.status);
            const pontualidadeColeta = verPontualidade(viagem.chegadaColeta?.dataHora, viagem.coletaData);
            const pontualidadeEntrega = verPontualidade(viagem.chegadaEntrega?.dataHora, viagem.entregaData);
            
            return (
              <TouchableOpacity 
                key={viagem.id} 
                style={styles.card}
                onPress={() => abrirDetalhesViagem(viagem)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.numeroViagem}>DT: {viagem.dt || '—'}</Text>
                    <Text style={styles.viagemId}>ID: {viagem.id?.substring(0, 8)}...</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.origem}>
                    <Text style={styles.cidadeLabel}>COLETA</Text>
                    <Text style={styles.cidade} numberOfLines={2}>{viagem.coletaCidade || '—'}</Text>
                    <Text style={styles.local} numberOfLines={2}>{viagem.clienteColeta || viagem.coletaLocal || '—'}</Text>
                    <Text style={styles.dataText}>📅 Programado: {viagem.coletaData || '—'}</Text>
                    {viagem.chegadaColeta && (
                      <>
                        <Text style={styles.chegadaText}>✅ Realizado: {viagem.chegadaColeta.dataHora}</Text>
                        <Text style={[styles.pontualidadeText, pontualidadeColeta.includes('On Time') ? styles.onTime : styles.noShow]}>
                          {pontualidadeColeta}
                        </Text>
                        {viagem.chegadaColeta.fotoUrl && (
                          <TouchableOpacity 
                            style={styles.fotoLink}
                            onPress={() => abrirModalFotos([viagem.chegadaColeta.fotoUrl, ...viagem.fotosColeta], `Fotos da Coleta - ${viagem.coletaCidade}`)}
                          >
                            <Ionicons name="camera" size={14} color="#FFD700" />
                            <Text style={styles.fotoLinkText}>Ver foto do check-in</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    {viagem.fotosColeta.length > 0 && !viagem.chegadaColeta?.fotoUrl && (
                      <TouchableOpacity 
                        style={styles.fotoLink}
                        onPress={() => abrirModalFotos(viagem.fotosColeta, `Fotos da Coleta - ${viagem.coletaCidade}`)}
                      >
                        <Ionicons name="images" size={14} color="#FFD700" />
                        <Text style={styles.fotoLinkText}>Ver {viagem.fotosColeta.length} foto(s) da coleta</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={24} color="#FFD700" />
                  </View>

                  <View style={styles.destino}>
                    <Text style={styles.cidadeLabel}>ENTREGA</Text>
                    <Text style={styles.cidade} numberOfLines={2}>{viagem.entregaCidade || '—'}</Text>
                    <Text style={styles.local} numberOfLines={2}>{viagem.clienteEntrega || viagem.entregaLocal || '—'}</Text>
                    <Text style={styles.dataText}>📅 Programado: {viagem.entregaData || '—'}</Text>
                    {viagem.chegadaEntrega && (
                      <>
                        <Text style={styles.chegadaText}>✅ Realizado: {viagem.chegadaEntrega.dataHora}</Text>
                        <Text style={[styles.pontualidadeText, pontualidadeEntrega.includes('On Time') ? styles.onTime : styles.noShow]}>
                          {pontualidadeEntrega}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>🚛 {viagem.placa || '—'}</Text>
                  <Text style={styles.infoText}>🚚 {viagem.placaCarreta || viagem.carreta || '—'}</Text>
                  <Text style={styles.infoText}>⚖️ {viagem.peso || '—'} kg</Text>
                </View>

                {(viagem.devolucao || viagem.canhotos || viagem.fotosDevolucao.length > 0 || viagem.fotosCanhotos.length > 0) && (
                  <View style={styles.eventosContainer}>
                    {viagem.devolucao && (
                      <View style={styles.eventoItem}>
                        <Ionicons name="return-down-back" size={14} color="#3B82F6" />
                        <Text style={styles.eventoText}>Devolução: {viagem.devolucao.dataHora}</Text>
                      </View>
                    )}
                    {viagem.fotosDevolucao.length > 0 && (
                      <TouchableOpacity 
                        style={styles.eventoItem}
                        onPress={() => abrirModalFotos(viagem.fotosDevolucao, 'Fotos da Devolução')}
                      >
                        <Ionicons name="camera" size={14} color="#FFD700" />
                        <Text style={styles.eventoText}>Ver {viagem.fotosDevolucao.length} foto(s) da devolução</Text>
                      </TouchableOpacity>
                    )}
                    {viagem.canhotos && (
                      <View style={styles.eventoItem}>
                        <Ionicons name="document-text" size={14} color="#8B5CF6" />
                        <Text style={styles.eventoText}>Canhotos entregues: {viagem.canhotos.dataHora}</Text>
                      </View>
                    )}
                    {viagem.fotosCanhotos.length > 0 && (
                      <TouchableOpacity 
                        style={styles.eventoItem}
                        onPress={() => abrirModalFotos(viagem.fotosCanhotos, 'Fotos dos Canhotos')}
                      >
                        <Ionicons name="images" size={14} color="#FFD700" />
                        <Text style={styles.eventoText}>Ver {viagem.fotosCanhotos.length} foto(s) dos canhotos</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.criadoEmText}>
                    Criado em: {viagem.criadoEm?.toDate ? new Date(viagem.criadoEm.toDate()).toLocaleString() : viagem.criadoEm || '—'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Modal para visualizar fotos */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>{modalTitulo}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FFD700" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
              {fotosSelecionadas.map((foto, index) => (
                <Image key={index} source={{ uri: foto }} style={styles.fotoModal} resizeMode="cover" />
              ))}
            </ScrollView>
            <Text style={styles.modalInfoText}>Total de {fotosSelecionadas.length} foto(s)</Text>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes Completos da Viagem */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalhesVisible}
        onRequestClose={() => setModalDetalhesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalDetalhesContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalDetalhesHeader}>
              <Text style={styles.modalDetalhesTitulo}>Detalhes da Viagem</Text>
              <TouchableOpacity onPress={() => setModalDetalhesVisible(false)}>
                <Ionicons name="close" size={28} color="#FFD700" />
              </TouchableOpacity>
            </View>

            {detalhesViagem && (
              <View style={styles.detalhesContainer}>
                <View style={styles.detalhesSection}>
                  <Text style={styles.detalhesSectionTitulo}>Informações Gerais</Text>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>DT:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.dt || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Status:</Text>
                    <Text style={[styles.detalhesValor, { color: getStatusInfo(detalhesViagem.status).color }]}>
                      {getStatusInfo(detalhesViagem.status).label}
                    </Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Placa Cavalo:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.placa || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Placa Carreta:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.placaCarreta || detalhesViagem.carreta || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Peso:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.peso || '—'} kg</Text>
                  </View>
                </View>

                <View style={styles.detalhesSection}>
                  <Text style={styles.detalhesSectionTitulo}>Coleta</Text>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Cidade:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.coletaCidade || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Local:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.clienteColeta || detalhesViagem.coletaLocal || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Programado:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.coletaData || '—'}</Text>
                  </View>
                  {detalhesViagem.chegadaColeta && (
                    <>
                      <View style={styles.detalhesLinha}>
                        <Text style={styles.detalhesLabel}>Check-in Realizado:</Text>
                        <Text style={styles.detalhesValor}>{detalhesViagem.chegadaColeta.dataHora}</Text>
                      </View>
                      <View style={styles.detalhesLinha}>
                        <Text style={styles.detalhesLabel}>Pontualidade:</Text>
                        <Text style={[styles.detalhesValor, verPontualidade(detalhesViagem.chegadaColeta.dataHora, detalhesViagem.coletaData).includes('On Time') ? styles.onTime : styles.noShow]}>
                          {verPontualidade(detalhesViagem.chegadaColeta.dataHora, detalhesViagem.coletaData)}
                        </Text>
                      </View>
                      <View style={styles.detalhesLinha}>
                        <Text style={styles.detalhesLabel}>Tipo Comprovante:</Text>
                        <Text style={styles.detalhesValor}>{detalhesViagem.chegadaColeta.tipoFoto || '—'}</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.detalhesSection}>
                  <Text style={styles.detalhesSectionTitulo}>Entrega</Text>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Cidade:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.entregaCidade || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Local:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.clienteEntrega || detalhesViagem.entregaLocal || '—'}</Text>
                  </View>
                  <View style={styles.detalhesLinha}>
                    <Text style={styles.detalhesLabel}>Programado:</Text>
                    <Text style={styles.detalhesValor}>{detalhesViagem.entregaData || '—'}</Text>
                  </View>
                  {detalhesViagem.chegadaEntrega && (
                    <>
                      <View style={styles.detalhesLinha}>
                        <Text style={styles.detalhesLabel}>Chegada Realizada:</Text>
                        <Text style={styles.detalhesValor}>{detalhesViagem.chegadaEntrega.dataHora}</Text>
                      </View>
                      <View style={styles.detalhesLinha}>
                        <Text style={styles.detalhesLabel}>Pontualidade:</Text>
                        <Text style={[styles.detalhesValor, verPontualidade(detalhesViagem.chegadaEntrega.dataHora, detalhesViagem.entregaData).includes('On Time') ? styles.onTime : styles.noShow]}>
                          {verPontualidade(detalhesViagem.chegadaEntrega.dataHora, detalhesViagem.entregaData)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {detalhesViagem.inicioViagem && (
                  <View style={styles.detalhesSection}>
                    <Text style={styles.detalhesSectionTitulo}>Início da Viagem</Text>
                    <View style={styles.detalhesLinha}>
                      <Text style={styles.detalhesLabel}>Data/Hora:</Text>
                      <Text style={styles.detalhesValor}>{detalhesViagem.inicioViagem.dataHora}</Text>
                    </View>
                  </View>
                )}

                {detalhesViagem.devolucao && (
                  <View style={styles.detalhesSection}>
                    <Text style={styles.detalhesSectionTitulo}>Devolução</Text>
                    <View style={styles.detalhesLinha}>
                      <Text style={styles.detalhesLabel}>Data/Hora:</Text>
                      <Text style={styles.detalhesValor}>{detalhesViagem.devolucao.dataHora}</Text>
                    </View>
                  </View>
                )}

                {detalhesViagem.canhotos && (
                  <View style={styles.detalhesSection}>
                    <Text style={styles.detalhesSectionTitulo}>Canhotos</Text>
                    <View style={styles.detalhesLinha}>
                      <Text style={styles.detalhesLabel}>Data/Hora Entrega:</Text>
                      <Text style={styles.detalhesValor}>{detalhesViagem.canhotos.dataHora}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  voltar: { flexDirection: 'row', alignItems: 'center' },
  voltarText: { marginLeft: 10, fontSize: 18, fontWeight: '600', color: '#FFD700' },
  titulo: { fontSize: 24, fontWeight: '900', color: '#FFD700', marginTop: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  cpfText: { fontSize: 12, color: '#888', marginTop: 2 },

  tabs: { flexDirection: 'row', backgroundColor: '#0A0A0A', paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 20, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  tabAtivo: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  tabText: { fontWeight: '700', color: '#888', fontSize: 14 },
  tabTextAtivo: { color: '#000' },

  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  numeroViagem: { fontSize: 14, fontWeight: '600', color: '#888' },
  viagemId: { fontSize: 10, color: '#555', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 11.5, fontWeight: '700' },

  routeContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginVertical: 10, gap: 8 },
  origem: { flex: 1 },
  destino: { flex: 1, alignItems: 'flex-end' },
  cidadeLabel: { fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  cidade: { fontSize: 15, fontWeight: '700', color: '#FFF', minHeight: 38 },
  local: { fontSize: 12, color: '#AAA', marginTop: 4, minHeight: 32 },
  dataText: { fontSize: 11, color: '#666', marginTop: 4 },
  chegadaText: { fontSize: 11, color: '#22C55E', marginTop: 4, fontWeight: '600' },
  pontualidadeText: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  onTime: { color: '#22C55E' },
  noShow: { color: '#EF4444' },
  arrowContainer: { paddingHorizontal: 8, paddingTop: 20 },
  fotoLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  fotoLinkText: { fontSize: 10, color: '#FFD700', textDecorationLine: 'underline' },

  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1F1F1F', gap: 6 },
  infoText: { fontSize: 13, color: '#CCC', fontWeight: '600', flex: 1, textAlign: 'center' },

  eventosContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F1F1F', gap: 8 },
  eventoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventoText: { fontSize: 12, color: '#AAA' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F1F1F' },
  criadoEmText: { fontSize: 10, color: '#555' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 20, fontSize: 16, color: '#666' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 20, width: '95%', maxHeight: '80%', borderWidth: 1, borderColor: '#FFD700' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: '#FFD700', flex: 1 },
  fotosScroll: { marginBottom: 16 },
  fotoModal: { width: width - 80, height: 400, borderRadius: 12, marginRight: 10 },
  modalInfoText: { textAlign: 'center', color: '#666', fontSize: 12, marginTop: 12 },

  modalDetalhesContent: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 20, width: '95%', maxHeight: '90%', borderWidth: 1, borderColor: '#FFD700' },
  modalDetalhesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  modalDetalhesTitulo: { fontSize: 20, fontWeight: '700', color: '#FFD700' },
  detalhesContainer: { gap: 20 },
  detalhesSection: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 },
  detalhesSectionTitulo: { fontSize: 16, fontWeight: '700', color: '#FFD700', marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#FFD700', paddingLeft: 8 },
  detalhesLinha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' },
  detalhesLabel: { fontSize: 13, color: '#888', fontWeight: '600', width: '40%' },
  detalhesValor: { fontSize: 13, color: '#FFF', fontWeight: '500', width: '58%', textAlign: 'right' },
});

export default HistoricoViagens;