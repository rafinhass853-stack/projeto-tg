import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { collectionGroup, query, orderBy, where, getDocs, doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const HistoricoViagens = ({ navigation, route }: any) => {
  const { nomeMotorista, cpfMotorista } = route.params || {};

  const [viagens, setViagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'abertas' | 'finalizadas'>('finalizadas');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedViagem, setSelectedViagem] = useState<any>(null);
  const [dataHoraChegada, setDataHoraChegada] = useState('');
  const [fotoChegada, setFotoChegada] = useState<string | null>(null);
  const [tipoFoto, setTipoFoto] = useState<'selfie' | 'documento'>('selfie');
  const [subindoFoto, setSubindoFoto] = useState(false);

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

      const q = query(
        collectionGroup(db, 'cargas'),
        where('cpf', '==', cpfMotorista),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(q);
      const lista: any[] = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, docId: doc.ref.path,...doc.data() });
      });

      setViagens(lista);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert("Erro", "Não foi possível carregar as viagens.");
    } finally {
      setLoading(false);
    }
  };

  const registrarChegadaColeta = async (viagem: any) => {
    setSelectedViagem(viagem);

    const agora = new Date();
    const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    setDataHoraChegada(dataFormatada);

    setFotoChegada(null);
    setTipoFoto('selfie');
    setModalVisible(true);
  };

  const tirarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status!== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setFotoChegada(result.assets[0].uri);
    }
  };

  const escolherFotoGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status!== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setFotoChegada(result.assets[0].uri);
    }
  };

  const uploadFoto = async (uri: string, viagemId: string) => {
    try {
      const storage = getStorage();
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `checkin_coleta_${viagemId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `motoristas/${cpfMotorista}/viagens/${viagemId}/${fileName}`);

      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    }
  };

  const confirmarChegada = async () => {
    if (!selectedViagem ||!fotoChegada) {
      Alert.alert('Atenção', 'Por favor, tire ou selecione uma foto para registrar a chegada.');
      return;
    }

    setSubindoFoto(true);

    try {
      const fotoUrl = await uploadFoto(fotoChegada, selectedViagem.id);

      const docRef = doc(db, selectedViagem.docId);
      const agora = new Date();
      const dataFormatada = dataHoraChegada;

      const checkinData = {
        chegadaColeta: { dataHora: dataFormatada, timestamp: agora, fotoUrl, tipoFoto },
        status: 'aguardando_carregamento',
        historicoStatus: {
     ...selectedViagem.historicoStatus,
          chegadaColeta: { dataHora: dataFormatada, timestamp: agora, fotoUrl },
          aguardandoCarregamento: { dataHora: dataFormatada, timestamp: agora },
        },
      };

      await updateDoc(docRef, checkinData);

      const historicoMotoristaRef = collection(db, `motoristas/${cpfMotorista}/historicoCheckins`);
      await addDoc(historicoMotoristaRef, {
        viagemId: selectedViagem.id,
        tipo: 'chegada_coleta',
        dataHora: dataFormatada,
        timestamp: agora,
        fotoUrl,
        tipoFoto,
        coletaCidade: selectedViagem.coletaCidade,
        coletaLocal: selectedViagem.coletaLocal,
      });

      Alert.alert('Sucesso!', 'Chegada na coleta registrada com sucesso.');
      setModalVisible(false);
      setFotoChegada(null);
      await carregarDados();

    } catch (error) {
      console.error('Erro ao registrar chegada:', error);
      Alert.alert('Erro', 'Não foi possível registrar a chegada. Tente novamente.');
    } finally {
      setSubindoFoto(false);
    }
  };

  const iniciarViagem = async (viagem: any) => {
    Alert.alert(
      'Iniciar Viagem',
      'Confirme que o carregamento foi concluído e você está pronto para seguir para a entrega.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const docRef = doc(db, viagem.docId);
              const agora = new Date();
              const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

              await updateDoc(docRef, {
                status: 'seguindo_para_entrega',
                inicioViagem: { dataHora: dataFormatada, timestamp: agora },
                historicoStatus: {
             ...viagem.historicoStatus,
                  seguindoParaEntrega: { dataHora: dataFormatada, timestamp: agora },
                },
              });

              const historicoMotoristaRef = collection(db, `motoristas/${cpfMotorista}/historicoCheckins`);
              await addDoc(historicoMotoristaRef, {
                viagemId: viagem.id,
                tipo: 'inicio_viagem',
                dataHora: dataFormatada,
                timestamp: agora,
                coletaCidade: viagem.coletaCidade,
                entregaCidade: viagem.entregaCidade,
              });

              Alert.alert('Sucesso!', 'Viagem iniciada com sucesso.');
              await carregarDados();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível iniciar a viagem.');
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (status = '') => {
    const s = status.toLowerCase().trim();
    if (s === 'finalizada' || s === 'concluída')
      return { label: 'FINALIZADA', color: '#22C55E', icon: 'checkmark-circle' as const };
    if (s === 'seguindo_para_entrega')
      return { label: 'EM ROTA', color: '#22C55E', icon: 'car-sport' as const };
    if (s === 'aguardando_carregamento')
      return { label: 'AGUARDANDO CARREGAMENTO', color: '#FFD700', icon: 'time' as const, acao: 'iniciar_viagem' };
    if (s === 'programada')
      return { label: 'PROGRAMADA', color: '#FFD700', icon: 'calendar' as const, acao: 'registrar_chegada' };
    return { label: 'EM ANDAMENTO', color: '#3B82F6', icon: 'time' as const };
  };

  const viagensFiltradas = viagens.filter((viagem) => {
    const status = (viagem.status || '').toLowerCase().trim();
    if (activeTab === 'abertas')
      return ['programada', 'aguardando_carregamento', 'seguindo_para_entrega'].includes(status);
    if (activeTab === 'finalizadas')
      return ['finalizada', 'concluída'].includes(status);
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
      </View>

      <View style={styles.tabs}>
        {(['abertas', 'finalizadas'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabAtivo]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextAtivo]}>
              {tab === 'abertas'? 'Em Aberto' : 'Finalizadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Carregando suas viagens...</Text>
        </View>
      ) : viagensFiltradas.length === 0? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={90} color="#333" />
          <Text style={styles.emptyText}>Nenhuma viagem encontrada</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {viagensFiltradas.map((viagem) => {
            const statusInfo = getStatusInfo(viagem.status);
            return (
              <View key={viagem.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.numeroViagem}>DT: {viagem.dt || '—'}</Text>
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
                    <Text style={styles.dataText}>Coleta • {viagem.coletaData}</Text>
                    {viagem.chegadaColeta && (
                      <Text style={styles.chegadaText}>✅ {viagem.chegadaColeta.dataHora}</Text>
                    )}
                  </View>

                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={24} color="#FFD700" />
                  </View>

                  <View style={styles.destino}>
                    <Text style={styles.cidadeLabel}>ENTREGA</Text>
                    <Text style={styles.cidade} numberOfLines={2}>{viagem.entregaCidade || '—'}</Text>
                    <Text style={styles.local} numberOfLines={2}>{viagem.clienteEntrega || viagem.entregaLocal || '—'}</Text>
                    <Text style={styles.dataText}>Entrega • {viagem.entregaData}</Text>
                  </View>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>🚛 {viagem.placa || '—'}</Text>
                  <Text style={styles.infoText}>🚚 {viagem.placaCarreta || viagem.carreta || '—'}</Text>
                  <Text style={styles.infoText}>⚖️ {viagem.peso || '—'} kg</Text>
                </View>

                {statusInfo.acao === 'registrar_chegada' && (
                  <TouchableOpacity style={styles.botaoAcao} onPress={() => registrarChegadaColeta(viagem)}>
                    <Ionicons name="location" size={20} color="#000" />
                    <Text style={styles.botaoAcaoText}>Registrar Chegada na Coleta</Text>
                  </TouchableOpacity>
                )}

                {statusInfo.acao === 'iniciar_viagem' && (
                  <TouchableOpacity style={[styles.botaoAcao, styles.botaoIniciar]} onPress={() => iniciarViagem(viagem)}>
                    <Ionicons name="car-sport" size={20} color="#000" />
                    <Text style={styles.botaoAcaoText}>Iniciar Viagem para Entrega</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Registrar Chegada na Coleta</Text>

            <View style={styles.infoViagemModal}>
              <Text style={styles.infoLabel}>Local</Text>
              <Text style={styles.infoValue}>{selectedViagem?.coletaLocal}</Text>
              <Text style={styles.infoLabel}>Cidade</Text>
              <Text style={styles.infoValue}>{selectedViagem?.coletaCidade}</Text>
            </View>

            <View style={styles.dataHoraContainer}>
              <Text style={styles.label}>Data e Hora da Chegada</Text>
              <TextInput
                style={styles.inputDataHora}
                value={dataHoraChegada}
                onChangeText={setDataHoraChegada}
                placeholder="DD/MM/AAAA HH:MM"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.tipoFotoContainer}>
              <Text style={styles.label}>Tipo de Comprovante</Text>
              <View style={styles.tipoFotoOptions}>
                <TouchableOpacity
                  style={[styles.tipoFotoOption, tipoFoto === 'selfie' && styles.tipoFotoOptionActive]}
                  onPress={() => setTipoFoto('selfie')}
                >
                  <Ionicons name="person" size={20} color={tipoFoto === 'selfie'? '#000' : '#FFD700'} />
                  <Text style={[styles.tipoFotoText, tipoFoto === 'selfie' && styles.tipoFotoTextActive]}>Selfie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoFotoOption, tipoFoto === 'documento' && styles.tipoFotoOptionActive]}
                  onPress={() => setTipoFoto('documento')}
                >
                  <Ionicons name="document" size={20} color={tipoFoto === 'documento'? '#000' : '#FFD700'} />
                  <Text style={[styles.tipoFotoText, tipoFoto === 'documento' && styles.tipoFotoTextActive]}>Comprovante</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fotoContainer}>
              <Text style={styles.label}>Foto de Comprovação</Text>
              {fotoChegada? (
                <View style={styles.fotoPreviewContainer}>
                  <Image source={{ uri: fotoChegada }} style={styles.fotoPreview} />
                  <TouchableOpacity style={styles.removerFoto} onPress={() => setFotoChegada(null)}>
                    <Ionicons name="close-circle" size={28} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.botoesFoto}>
                  <TouchableOpacity style={styles.botaoFoto} onPress={tirarFoto}>
                    <Ionicons name="camera" size={24} color="#FFD700" />
                    <Text style={styles.botaoFotoText}>Tirar Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botaoFoto} onPress={escolherFotoGaleria}>
                    <Ionicons name="images" size={24} color="#FFD700" />
                    <Text style={styles.botaoFotoText}>Galeria</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={() => { setModalVisible(false); setFotoChegada(null); }}>
                <Text style={styles.botaoCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoConfirmar} onPress={confirmarChegada} disabled={subindoFoto}>
                {subindoFoto? <ActivityIndicator color="#000" /> : <Text style={styles.botaoConfirmarText}>Confirmar Chegada</Text>}
              </TouchableOpacity>
            </View>
          </View>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  numeroViagem: { fontSize: 14, fontWeight: '600', color: '#888' },
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
  arrowContainer: { paddingHorizontal: 8, paddingTop: 20 },

  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1F1F1F', gap: 6 },
  infoText: { fontSize: 13, color: '#CCC', fontWeight: '600', flex: 1, textAlign: 'center' },

  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    gap: 8
  },
  botaoIniciar: { backgroundColor: '#22C55E' },
  botaoAcaoText: { color: '#000', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  modalTitulo: { fontSize: 22, fontWeight: '700', color: '#FFD700', marginBottom: 20, textAlign: 'center' },
  infoViagemModal: { backgroundColor: '#1A1A1A', padding: 14, borderRadius: 12, marginBottom: 18 },
  infoLabel: { fontSize: 12, color: '#666', marginTop: 8 },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#FFF', marginTop: 2 },

  label: { fontSize: 13, fontWeight: '600', color: '#AAA', marginBottom: 6 },
  inputDataHora: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#1A1A1A',
    color: '#FFF'
  },

  tipoFotoContainer: { marginBottom: 18 },
  tipoFotoOptions: { flexDirection: 'row', gap: 10 },
  tipoFotoOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 6
  },
  tipoFotoOptionActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  tipoFotoText: { fontSize: 14, color: '#FFD700', fontWeight: '600' },
  tipoFotoTextActive: { color: '#000' },

  fotoContainer: { marginBottom: 20 },
  botoesFoto: { flexDirection: 'row', gap: 10, marginTop: 8 },
  botaoFoto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    gap: 8
  },
  botaoFotoText: { fontSize: 14, color: '#FFD700', fontWeight: '600' },
  fotoPreviewContainer: { position: 'relative', marginTop: 8 },
  fotoPreview: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' },
  removerFoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 2
  },

  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botaoCancelar: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center'
  },
  botaoCancelarText: { fontSize: 15, color: '#888', fontWeight: '600' },
  botaoConfirmar: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center'
  },
  botaoConfirmarText: { fontSize: 15, color: '#000', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 20, fontSize: 16, color: '#666' },
});

export default HistoricoViagens;