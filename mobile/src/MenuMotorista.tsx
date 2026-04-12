import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, limit, collectionGroup, orderBy, doc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MenuMotorista = ({ navigation, route }: any) => {
  const { userId, email: loggedEmail } = route.params || {};

  const [motorista, setMotorista] = useState({
    nome: 'Carregando...',
    cpf: '',
    whatsapp: '',
    cidade: '',
    cnh: '',
    email: loggedEmail || '',
    foto: 'https://i.pravatar.cc/150?u=motorista',
    temMopp: false,
  });

  const [viagemAtual, setViagemAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingViagem, setLoadingViagem] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [dataHoraChegada, setDataHoraChegada] = useState('');
  const [fotoChegada, setFotoChegada] = useState<string | null>(null);
  const [tipoFoto, setTipoFoto] = useState<'selfie' | 'documento'>('selfie');
  const [subindoFoto, setSubindoFoto] = useState(false);

  useEffect(() => {
    fetchMotoristaData();
  }, [userId]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (motorista.cpf) {
      unsubscribe = escutarViagemAtual(motorista.cpf);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [motorista.cpf]);

  const fetchMotoristaData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'motoristas'), where('uid', '==', userId), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setMotorista({
          nome: data.nome || 'Motorista',
          cpf: data.cpf || '',
          whatsapp: data.whatsapp || '',
          cidade: data.cidade || '',
          cnh: data.cnhCategoria || data.cnh || '',
          email: data.email || loggedEmail || '',
          foto: data.fotoPerfilUrl || `https://i.pravatar.cc/150?u=${userId}`,
          temMopp: data.temMopp === 'Sim',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const escutarViagemAtual = (cpf: string) => {
    if (!cpf) return;
    setLoadingViagem(true);

    const q = query(
      collectionGroup(db, 'cargas'),
      where('cpf', '==', cpf),
      where('status', 'in', ['programada', 'aguardando_carregamento', 'seguindo_para_entrega']),
      orderBy('criadoEm', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setViagemAtual({ id: doc.id, docId: doc.ref.path,...doc.data() });
      } else {
        setViagemAtual(null);
      }
      setLoadingViagem(false);
    }, (err) => {
      console.error('Erro ao escutar viagem atual:', err);
      setViagemAtual(null);
      setLoadingViagem(false);
    });

    return unsubscribe;
  };

  const registrarChegadaColeta = async () => {
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
    const storage = getStorage();
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = `checkin_coleta_${viagemId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `motoristas/${motorista.cpf}/viagens/${viagemId}/${fileName}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const confirmarChegada = async () => {
    if (!viagemAtual ||!fotoChegada) {
      Alert.alert('Atenção', 'Por favor, tire ou selecione uma foto para registrar a chegada.');
      return;
    }
    setSubindoFoto(true);
    try {
      const fotoUrl = await uploadFoto(fotoChegada, viagemAtual.id);
      const docRef = doc(db, viagemAtual.docId);
      const agora = new Date();

      const checkinData = {
        chegadaColeta: {
          dataHora: dataHoraChegada,
          timestamp: agora,
          fotoUrl,
          tipoFoto,
          cidade: motorista.cidade || viagemAtual.coletaCidade
        },
        status: 'aguardando_carregamento',
        historicoStatus: {
    ...viagemAtual.historicoStatus,
          chegadaColeta: { dataHora: dataHoraChegada, timestamp: agora, fotoUrl },
          aguardandoCarregamento: { dataHora: dataHoraChegada, timestamp: agora },
        },
      };

      await updateDoc(docRef, checkinData);

      const historicoMotoristaRef = collection(db, `motoristas/${motorista.cpf}/historicoCheckins`);
      await addDoc(historicoMotoristaRef, {
        viagemId: viagemAtual.id,
        tipo: 'chegada_coleta',
        dataHora: dataHoraChegada,
        timestamp: agora,
        fotoUrl,
        tipoFoto,
        coletaCidade: viagemAtual.coletaCidade,
        coletaLocal: viagemAtual.coletaLocal,
        cidadeMotorista: motorista.cidade,
      });

      Alert.alert('Sucesso!', 'Chegada na coleta registrada.');
      setModalVisible(false);
      setFotoChegada(null);
    } catch (error) {
      console.error('Erro ao registrar chegada:', error);
      Alert.alert('Erro', 'Não foi possível registrar a chegada.');
    } finally {
      setSubindoFoto(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja realmente sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => {
        await signOut(auth);
        navigation.replace('Login');
      }},
    ]);
  };

  const getStatusViagemAtual = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'programada': return { label: 'PROGRAMADA', color: '#FFD700', acao: 'checkin' };
      case 'aguardando_carregamento': return { label: 'AGUARDANDO CARREGAMENTO', color: '#FFD700' };
      case 'seguindo_para_entrega': return { label: 'EM ROTA PARA ENTREGA', color: '#22C55E' };
      default: return { label: 'EM ANDAMENTO', color: '#3B82F6' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  const statusAtual = viagemAtual? getStatusViagemAtual(viagemAtual.status) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>MENU MOTORISTA</Text>
          <Text style={styles.subtitle}>Bem-vindo de volta</Text>
        </View>

        <View style={styles.profileCard}>
          <Image source={{ uri: motorista.foto }} style={styles.profileImage} />
          <View style={styles.info}>
            <Text style={styles.nome} numberOfLines={1}>{motorista.nome}</Text>
            {motorista.cpf && <Text style={styles.cpf} numberOfLines={1}>CPF: {motorista.cpf}</Text>}
            <View style={styles.details}>
              {motorista.whatsapp && <Text style={styles.detail} numberOfLines={1}>📱 {motorista.whatsapp}</Text>}
              {motorista.cidade && <Text style={styles.detail} numberOfLines={1}>📍 {motorista.cidade}</Text>}
              {motorista.cnh && <Text style={styles.detail} numberOfLines={1}>🪪 CNH: {motorista.cnh}</Text>}
            </View>
            <Text style={styles.email} numberOfLines={1}>{motorista.email}</Text>
            {motorista.temMopp && (
              <View style={styles.moppBadge}>
                <MaterialIcons name="verified" size={12} color="#FFD700" />
                <Text style={styles.moppText}> MOPP</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.viagemAtualContainer}>
          <Text style={styles.sectionTitle}>SUA VIAGEM ATUAL</Text>

          {loadingViagem? (
            <View style={styles.noViagemCard}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={[styles.noViagemText, { marginTop: 12 }]}>Buscando viagem...</Text>
            </View>
          ) : viagemAtual? (
            <View style={styles.viagemAtualCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('HistoricoViagens', {
                  cpfMotorista: motorista.cpf,
                  nomeMotorista: motorista.nome
                })}
              >
                <View style={styles.linhaTopo}>
                  <View style={styles.dtContainer}>
                    <Text style={styles.dtLabel}>DT:</Text>
                    <Text style={styles.dtViagem}>{viagemAtual.dt || '—'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusAtual?.color + '20' }]}>
                    <Text style={[styles.statusText, { color: statusAtual?.color }]} numberOfLines={1}>
                      {statusAtual?.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.cidadeContainer}>
                    <Text style={styles.cidadeLabel}>COLETA</Text>
                    <Text style={styles.cidadeNome} numberOfLines={2}>{viagemAtual.coletaCidade || '—'}</Text>
                    <Text style={styles.dataText}>{viagemAtual.coletaData || '—'}</Text>
                    <Text style={styles.clienteText} numberOfLines={2}>
                      {viagemAtual.clienteColeta || viagemAtual.coletaLocal || '—'}
                    </Text>
                  </View>

                  <MaterialIcons name="arrow-forward" size={24} color="#FFD700" style={styles.arrowIcon} />

                  <View style={styles.cidadeContainer}>
                    <Text style={styles.cidadeLabel}>ENTREGA</Text>
                    <Text style={styles.cidadeNome} numberOfLines={2}>{viagemAtual.entregaCidade || '—'}</Text>
                    <Text style={styles.dataText}>{viagemAtual.entregaData || '—'}</Text>
                    <Text style={styles.clienteText} numberOfLines={2}>
                      {viagemAtual.clienteEntrega || viagemAtual.entregaLocal || '—'}
                    </Text>
                  </View>
                </View>

                {viagemAtual.chegadaColeta && (
                  <View style={styles.checkinInfo}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={styles.checkinText}>Checkin: {viagemAtual.chegadaColeta.dataHora}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>🚛 {viagemAtual.placa || '—'}</Text>
                  <Text style={styles.infoText}>🚚 {viagemAtual.placaCarreta || viagemAtual.carreta || '—'}</Text>
                  <Text style={styles.infoText}>⚖️ {viagemAtual.peso || '—'}kg</Text>
                </View>
              </TouchableOpacity>

              {statusAtual?.acao === 'checkin' && (
                <TouchableOpacity style={styles.botaoCheckin} onPress={registrarChegadaColeta}>
                  <Ionicons name="location" size={18} color="#000" />
                  <Text style={styles.botaoCheckinText}>Fazer Check-in na Coleta</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noViagemCard}>
              <Ionicons name="calendar-outline" size={60} color="#555" />
              <Text style={styles.noViagemText}>Você não tem viagem ativa no momento</Text>
            </View>
          )}
        </View>

        <Text style={styles.menuTitle}>MAIS OPÇÕES</Text>

        {/* MENU DE RODAPÉ AGORA AQUI - MAIS ALTO E PERTO DO "MAIS OPÇÕES" */}
        <View style={styles.bottomMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HistoricoViagens', {
              cpfMotorista: motorista.cpf,
              nomeMotorista: motorista.nome
            })}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="map-outline" size={30} color="#0EA5E9" />
            </View>
            <Text style={styles.menuText}>Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Abastecimento')}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="local-gas-station" size={30} color="#F59E0B" />
            </View>
            <Text style={styles.menuText}>Abastecer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Chat')}>
            <View style={styles.menuIcon}>
              <Ionicons name="chatbubble-outline" size={30} color="#8B5CF6" />
            </View>
            <Text style={styles.menuText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Escala')}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="event" size={30} color="#EC4899" />
            </View>
            <Text style={styles.menuText}>Escala</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Hodometro')}>
            <View style={styles.menuIcon}>
              <Ionicons name="speedometer-outline" size={30} color="#3B82F6" />
            </View>
            <Text style={styles.menuText}>Hodômetro</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <View style={styles.menuIcon}>
              <MaterialIcons name="logout" size={30} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Check-in na Coleta</Text>

            <View style={styles.infoViagemModal}>
              <Text style={styles.infoLabel}>Local</Text>
              <Text style={styles.infoValue}>{viagemAtual?.coletaLocal}</Text>
              <Text style={styles.infoLabel}>Cidade</Text>
              <Text style={styles.infoValue}>{viagemAtual?.coletaCidade}</Text>
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
              <Text style={styles.label}>Foto</Text>
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
                    <Text style={styles.botaoFotoText}>Câmera</Text>
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
                {subindoFoto? <ActivityIndicator color="#000" /> : <Text style={styles.botaoConfirmarText}>Confirmar</Text>}
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
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 16 },

  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15 },
  title: { fontSize: 27, fontWeight: '900', color: '#FFD700', letterSpacing: -1 },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },

  profileCard: {
    backgroundColor: '#0A0A0A',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: 20,
    minHeight: 100,
  },
  profileImage: { width: 68, height: 68, borderRadius: 34, marginRight: 14, borderWidth: 2.5, borderColor: '#FFD700' },
  info: { flex: 1, justifyContent: 'center' },
  nome: { fontSize: 17.5, fontWeight: '700', color: '#FFF' },
  cpf: { fontSize: 12.8, color: '#888', marginTop: 1 },
  details: { marginVertical: 4 },
  detail: { fontSize: 12.5, color: '#AAA', marginBottom: 1 },
  email: { fontSize: 12.8, color: '#FFD700', fontWeight: '500' },
  moppBadge: {
    backgroundColor: '#1F1F1F', paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 12,
    alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFD700'
  },
  moppText: { color: '#FFD700', fontWeight: '700', fontSize: 11, marginLeft: 3 },

  viagemAtualContainer: { marginHorizontal: 20, marginBottom: 25 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    paddingLeft: 12
  },
  viagemAtualCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dtContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dtLabel: { fontSize: 11, color: '#666', fontWeight: '700' },
  dtViagem: { fontSize: 13, color: '#888', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, maxWidth: '60%' },
  statusText: { fontSize: 10, fontWeight: '700' },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 4
  },
  cidadeContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  cidadeLabel: { fontSize: 9, color: '#666', marginBottom: 3, fontWeight: '700', letterSpacing: 0.5 },
  cidadeNome: { fontSize: 13.5, fontWeight: '700', color: '#FFF', textAlign: 'center', minHeight: 32 },
  dataText: { fontSize: 10.5, color: '#888', marginTop: 2 },
  clienteText: { fontSize: 11, color: '#AAA', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  arrowIcon: { marginTop: 20 },

  checkinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#22C55E15',
    padding: 6,
    borderRadius: 6,
    marginTop: 6
  },
  checkinText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    gap: 6
  },
  infoText: { fontSize: 11.5, color: '#CCC', fontWeight: '600', flex: 1, textAlign: 'center' },

  botaoCheckin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 10,
    gap: 6
  },
  botaoCheckinText: { color: '#000', fontSize: 14, fontWeight: '700' },

  noViagemCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  noViagemText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },

  menuTitle: {
    fontSize: 16.5,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    marginHorizontal: 20
  },

  // MENU AGORA FICA DENTRO DO SCROLL, LOGO ABAIXO DE "MAIS OPÇÕES"
  bottomMenu: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  menuItem: { alignItems: 'center', flex: 1 },
  logoutItem: { alignItems: 'center', flex: 1 },
  menuIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuText: { fontSize: 11.5, color: '#CCC', fontWeight: '600' },
  logoutText: { fontSize: 11.5, color: '#EF4444', fontWeight: '900' },

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

  dataHoraContainer: { marginBottom: 18 },
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
});

export default MenuMotorista;