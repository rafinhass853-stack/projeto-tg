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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, limit, collectionGroup, orderBy, doc, updateDoc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Location from 'expo-location';

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

  const [motoristaDocId, setMotoristaDocId] = useState<string | null>(null);
  const [viagemAtual, setViagemAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingViagem, setLoadingViagem] = useState(false);
  
  // Estado para localização
  const [localizacaoAtual, setLocalizacaoAtual] = useState({
    cidade: 'Carregando...',
    estado: '',
    latitude: null,
    longitude: null,
    atualizando: false,
    ultimaAtualizacao: null
  });

  // Modal Check-in Coleta
  const [modalVisible, setModalVisible] = useState(false);
  const [dataHoraChegada, setDataHoraChegada] = useState('');
  const [fotoChegada, setFotoChegada] = useState<string | null>(null);
  const [tipoFoto, setTipoFoto] = useState<'selfie' | 'documento'>('selfie');
  const [subindoFoto, setSubindoFoto] = useState(false);

  // Modal Check-in Entrega - SEM FOTO
  const [modalEntregaVisible, setModalEntregaVisible] = useState(false);
  const [dataHoraEntrega, setDataHoraEntrega] = useState('');

  // Modal Devolução - FOTOS OPCIONAIS
  const [modalDevolucaoVisible, setModalDevolucaoVisible] = useState(false);
  const [fotosDevolucao, setFotosDevolucao] = useState<string[]>([]);
  const [subindoDevolucao, setSubindoDevolucao] = useState(false);

  // Modal Canhotos - FOTOS OPCIONAIS MÚLTIPLAS
  const [modalCanhotosVisible, setModalCanhotosVisible] = useState(false);
  const [fotosCanhotos, setFotosCanhotos] = useState<string[]>([]);
  const [subindoCanhotos, setSubindoCanhotos] = useState(false);

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

  // Iniciar localização quando tiver o motoristaDocId
  useEffect(() => {
    if (motoristaDocId) {
      iniciarRastreamentoLocalizacao();
    }
  }, [motoristaDocId]);

  const iniciarRastreamentoLocalizacao = async () => {
    // Solicitar permissão
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocalizacaoAtual(prev => ({ ...prev, cidade: 'Permissão negada' }));
      return;
    }

    // Buscar localização atual
    await buscarLocalizacaoAtual();

    // Configurar atualização periódica a cada 5 minutos
    const intervalId = setInterval(() => {
      buscarLocalizacaoAtual();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(intervalId);
  };

  const buscarLocalizacaoAtual = async () => {
    if (!motoristaDocId) return;
    
    setLocalizacaoAtual(prev => ({ ...prev, atualizando: true }));
    
    try {
      // Tentar obter localização com alta precisão
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(async () => {
        // Se falhar, tentar com precisão balanceada
        return await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      });

      const { latitude, longitude } = location.coords;
      
      // Tentar geocodificação reversa
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      // Se não conseguir obter a cidade, tentar obter a região aproximada
      if (!reverseGeocode || reverseGeocode.length === 0 || !reverseGeocode[0].city) {
        // Tentar obter apenas a região
        const regionGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
          useGoogleMaps: false,
        });
        
        if (regionGeocode && regionGeocode.length > 0) {
          const { city, region, subregion, name } = regionGeocode[0];
          const cidadeEncontrada = city || subregion || region || name || 'Área próxima';
          const estado = region || '';
          const cidadeFormatada = estado ? `${cidadeEncontrada} - ${estado}` : cidadeEncontrada;
          
          setLocalizacaoAtual({
            cidade: cidadeFormatada,
            estado: estado,
            latitude: latitude,
            longitude: longitude,
            atualizando: false,
            ultimaAtualizacao: new Date()
          });
          
          await salvarLocalizacaoFirebase(cidadeFormatada, estado, latitude, longitude, cidadeEncontrada);
          return;
        }
        
        // Último recurso: usar coordenadas para buscar cidade mais próxima via API de fallback
        const cidadeProxima = await buscarCidadeProximaPorCoordenadas(latitude, longitude);
        
        setLocalizacaoAtual({
          cidade: cidadeProxima,
          estado: '',
          latitude: latitude,
          longitude: longitude,
          atualizando: false,
          ultimaAtualizacao: new Date()
        });
        
        await salvarLocalizacaoFirebase(cidadeProxima, '', latitude, longitude, cidadeProxima);
        return;
      }

      const { city, region, country } = reverseGeocode[0];
      const nomeCidade = city || 'Área próxima';
      const estado = region || '';
      const cidadeFormatada = estado ? `${nomeCidade} - ${estado}` : nomeCidade;

      setLocalizacaoAtual({
        cidade: cidadeFormatada,
        estado: estado,
        latitude: latitude,
        longitude: longitude,
        atualizando: false,
        ultimaAtualizacao: new Date()
      });

      await salvarLocalizacaoFirebase(cidadeFormatada, estado, latitude, longitude, nomeCidade);
      
    } catch (error) {
      console.error('Erro ao buscar localização:', error);
      
      // Tentar obter localização aproximada (menos precisa)
      try {
        const approxLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
        });
        
        const { latitude, longitude } = approxLocation.coords;
        const cidadeProxima = await buscarCidadeProximaPorCoordenadas(latitude, longitude);
        
        setLocalizacaoAtual(prev => ({
          ...prev,
          cidade: cidadeProxima,
          latitude: latitude,
          longitude: longitude,
          atualizando: false,
          ultimaAtualizacao: new Date()
        }));
        
        await salvarLocalizacaoFirebase(cidadeProxima, '', latitude, longitude, cidadeProxima);
      } catch (fallbackError) {
        setLocalizacaoAtual(prev => ({
          ...prev,
          cidade: 'Localização aproximada',
          atualizando: false,
          ultimaAtualizacao: new Date()
        }));
      }
    }
  };

  const buscarCidadeProximaPorCoordenadas = async (latitude: number, longitude: number): Promise<string> => {
    // Fallback: retornar coordenadas formatadas caso não consiga obter a cidade
    return `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
  };

  const salvarLocalizacaoFirebase = async (cidadeFormatada: string, estado: string, latitude: number, longitude: number, cidadeNome: string) => {
    if (!motoristaDocId) return;

    try {
      const agora = new Date();
      const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
      
      // Salvar na subcoleção de localizações do motorista
      const localizacaoRef = collection(db, `motoristas/${motoristaDocId}/localizacoes`);
      await addDoc(localizacaoRef, {
        cidade: cidadeFormatada,
        cidadeNome: cidadeNome,
        estado: estado,
        latitude: latitude,
        longitude: longitude,
        dataHora: dataFormatada,
        timestamp: serverTimestamp(),
        viagemAtiva: viagemAtual ? {
          id: viagemAtual.id,
          dt: viagemAtual.dt,
          coletaCidade: viagemAtual.coletaCidade,
          entregaCidade: viagemAtual.entregaCidade,
          status: viagemAtual.status
        } : null
      });

      // Atualizar também a cidade atual no documento principal do motorista
      const motoristaRef = doc(db, `motoristas/${motoristaDocId}`);
      await updateDoc(motoristaRef, {
        ultimaLocalizacao: {
          cidade: cidadeFormatada,
          estado: estado,
          latitude: latitude,
          longitude: longitude,
          dataHora: dataFormatada,
          timestamp: agora
        }
      });

    } catch (error) {
      console.error('Erro ao salvar localização:', error);
    }
  };

  const fetchMotoristaData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'motoristas'), where('uid', '==', userId), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        setMotoristaDocId(doc.id);
        
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

        // Se tiver última localização salva, exibir
        if (data.ultimaLocalizacao?.cidade) {
          setLocalizacaoAtual(prev => ({
            ...prev,
            cidade: data.ultimaLocalizacao.cidade,
            estado: data.ultimaLocalizacao.estado,
            latitude: data.ultimaLocalizacao.latitude,
            longitude: data.ultimaLocalizacao.longitude,
            ultimaAtualizacao: data.ultimaLocalizacao.timestamp?.toDate() || null
          }));
        }
      } else {
        console.error('Documento do motorista não encontrado para uid:', userId);
        Alert.alert('Erro', 'Dados do motorista não encontrados. Contate o suporte.');
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
      where('status', 'in', ['programada', 'aguardando_carregamento', 'seguindo_para_entrega', 'chegou_entrega']),
      orderBy('criadoEm', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setViagemAtual({ id: docSnap.id, docId: docSnap.ref.path, ...docSnap.data() });
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

  const verificarPontualidade = (dataHoraChegada: string, dataHoraLimite: string) => {
    if (!dataHoraLimite) return 'Sem horário definido';
    
    try {
      const [dataChegada, horaChegada] = dataHoraChegada.split(' ');
      const [diaChegada, mesChegada, anoChegada] = dataChegada.split('/');
      const [horaChegadaStr, minutoChegadaStr] = horaChegada.split(':');
      
      const dataChegadaObj = new Date(
        parseInt(anoChegada),
        parseInt(mesChegada) - 1,
        parseInt(diaChegada),
        parseInt(horaChegadaStr),
        parseInt(minutoChegadaStr)
      );
      
      const [dataLimite, horaLimite] = dataHoraLimite.split(' ');
      const [diaLimite, mesLimite, anoLimite] = dataLimite.split('/');
      const [horaLimiteStr, minutoLimiteStr] = horaLimite.split(':');
      
      const dataLimiteObj = new Date(
        parseInt(anoLimite),
        parseInt(mesLimite) - 1,
        parseInt(diaLimite),
        parseInt(horaLimiteStr),
        parseInt(minutoLimiteStr)
      );
      
      return dataChegadaObj <= dataLimiteObj ? 'On Time' : 'No Show';
    } catch (error) {
      console.error('Erro ao verificar pontualidade:', error);
      return 'Erro na verificação';
    }
  };

  const registrarChegadaColeta = async () => {
    const agora = new Date();
    const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    setDataHoraChegada(dataFormatada);
    setFotoChegada(null);
    setTipoFoto('selfie');
    setModalVisible(true);
  };

  const registrarChegadaEntrega = async () => {
    const agora = new Date();
    const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    setDataHoraEntrega(dataFormatada);
    setModalEntregaVisible(true);
  };

  const iniciarViagem = async () => {
    if (!viagemAtual || !motoristaDocId) {
      Alert.alert('Erro', 'Dados da viagem ou motorista não carregados.');
      return;
    }

    Alert.alert(
      'Iniciar Viagem',
      'Confirme que o carregamento foi concluído e você está pronto para seguir para a entrega.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const docRef = doc(db, viagemAtual.docId);
              const agora = new Date();
              const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

              await updateDoc(docRef, {
                status: 'seguindo_para_entrega',
                inicioViagem: { dataHora: dataFormatada, timestamp: agora },
                historicoStatus: {
                  ...viagemAtual.historicoStatus,
                  seguindoParaEntrega: { dataHora: dataFormatada, timestamp: agora },
                },
              });

              const historicoMotoristaRef = collection(db, `motoristas/${motoristaDocId}/historicoCheckins`);
              await addDoc(historicoMotoristaRef, {
                viagemId: viagemAtual.id,
                tipo: 'inicio_viagem',
                dataHora: dataFormatada,
                timestamp: agora,
                coletaCidade: viagemAtual.coletaCidade,
                entregaCidade: viagemAtual.entregaCidade,
              });

              Alert.alert('Sucesso!', 'Viagem iniciada com sucesso.');
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Não foi possível iniciar a viagem.');
            }
          },
        },
      ]
    );
  };

  const tirarFoto = async (setFotoCallback: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setFotoCallback(result.assets[0].uri);
    }
  };

  const escolherFotoGaleria = async (setFotoCallback: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setFotoCallback(result.assets[0].uri);
    }
  };

  const adicionarFotoArray = async (array: string[], setArray: (arr: string[]) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setArray([...array, result.assets[0].uri]);
    }
  };

  const adicionarFotoGaleriaArray = async (array: string[], setArray: (arr: string[]) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setArray([...array, result.assets[0].uri]);
    }
  };

  const removerFotoArray = (index: number, array: string[], setArray: (arr: string[]) => void) => {
    const novasFotos = array.filter((_, i) => i !== index);
    setArray(novasFotos);
  };

  const uploadFoto = async (uri: string, viagemId: string, tipo: string) => {
    if (!motoristaDocId) throw new Error('Motorista ID não encontrado');
    const storage = getStorage();
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = `${tipo}_${viagemId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `motoristas/${motoristaDocId}/viagens/${viagemId}/${fileName}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const uploadMultiplasFotos = async (uris: string[], viagemId: string, tipo: string) => {
    const urls = [];
    for (const uri of uris) {
      const url = await uploadFoto(uri, viagemId, tipo);
      urls.push(url);
    }
    return urls;
  };

  const confirmarChegada = async () => {
    if (!viagemAtual || !fotoChegada || !motoristaDocId) {
      Alert.alert('Atenção', 'Por favor, tire ou selecione uma foto para registrar a chegada.');
      return;
    }
    setSubindoFoto(true);
    try {
      const fotoUrl = await uploadFoto(fotoChegada, viagemAtual.id, 'coleta');
      const docRef = doc(db, viagemAtual.docId);
      const agora = new Date();

      const pontualidade = verificarPontualidade(dataHoraChegada, viagemAtual.coletaData);

      const checkinData = {
        chegadaColeta: {
          dataHora: dataHoraChegada,
          timestamp: agora,
          fotoUrl,
          tipoFoto,
          cidade: motorista.cidade || viagemAtual.coletaCidade,
          pontualidade: pontualidade,
        },
        status: 'aguardando_carregamento',
        historicoStatus: {
          ...viagemAtual.historicoStatus,
          chegadaColeta: { 
            dataHora: dataHoraChegada, 
            timestamp: agora, 
            fotoUrl,
            pontualidade: pontualidade 
          },
          aguardandoCarregamento: { dataHora: dataHoraChegada, timestamp: agora },
        },
      };

      await updateDoc(docRef, checkinData);

      const historicoMotoristaRef = collection(db, `motoristas/${motoristaDocId}/historicoCheckins`);
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
        pontualidade: pontualidade,
      });

      Alert.alert('Sucesso!', `Chegada na coleta registrada. Status: ${pontualidade}`);
      setModalVisible(false);
      setFotoChegada(null);
    } catch (error) {
      console.error('Erro ao registrar chegada:', error);
      Alert.alert('Erro', 'Não foi possível registrar a chegada.');
    } finally {
      setSubindoFoto(false);
    }
  };

  const confirmarChegadaEntrega = async () => {
    if (!viagemAtual || !motoristaDocId) return;

    try {
      const docRef = doc(db, viagemAtual.docId);
      const agora = new Date();

      const pontualidade = verificarPontualidade(dataHoraEntrega, viagemAtual.entregaData);

      const checkinData = {
        chegadaEntrega: {
          dataHora: dataHoraEntrega,
          timestamp: agora,
          cidade: motorista.cidade || viagemAtual.entregaCidade,
          pontualidade: pontualidade,
        },
        status: 'chegou_entrega',
        historicoStatus: {
          ...viagemAtual.historicoStatus,
          chegadaEntrega: { 
            dataHora: dataHoraEntrega, 
            timestamp: agora,
            pontualidade: pontualidade 
          },
        },
      };

      await updateDoc(docRef, checkinData);

      const historicoMotoristaRef = collection(db, `motoristas/${motoristaDocId}/historicoCheckins`);
      await addDoc(historicoMotoristaRef, {
        viagemId: viagemAtual.id,
        tipo: 'chegada_entrega',
        dataHora: dataHoraEntrega,
        timestamp: agora,
        entregaCidade: viagemAtual.entregaCidade,
        entregaLocal: viagemAtual.entregaLocal,
        cidadeMotorista: motorista.cidade,
        pontualidade: pontualidade,
      });

      Alert.alert('Sucesso!', `Chegada na entrega registrada. Status: ${pontualidade}`);
      setModalEntregaVisible(false);
    } catch (error) {
      console.error('Erro ao registrar entrega:', error);
      Alert.alert('Erro', 'Não foi possível registrar a entrega.');
    }
  };

  const confirmarDevolucao = async () => {
    if (!viagemAtual || !motoristaDocId) return;
    setSubindoDevolucao(true);
    try {
      const docRef = doc(db, viagemAtual.docId);
      const agora = new Date();
      const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

      let fotosUrls: string[] = [];
      if (fotosDevolucao.length > 0) {
        fotosUrls = await uploadMultiplasFotos(fotosDevolucao, viagemAtual.id, 'devolucao');
      }

      const devolucaoData = {
        devolucao: {
          dataHora: dataFormatada,
          timestamp: agora,
          fotosUrls: fotosUrls.length > 0 ? fotosUrls : null,
        },
        historicoStatus: {
          ...viagemAtual.historicoStatus,
          devolucao: { dataHora: dataFormatada, timestamp: agora, fotosUrls },
        },
      };

      await updateDoc(docRef, devolucaoData);

      const historicoMotoristaRef = collection(db, `motoristas/${motoristaDocId}/historicoCheckins`);
      await addDoc(historicoMotoristaRef, {
        viagemId: viagemAtual.id,
        tipo: 'devolucao',
        dataHora: dataFormatada,
        timestamp: agora,
        fotosUrls,
      });

      Alert.alert('Sucesso!', 'Devolução registrada.');
      setModalDevolucaoVisible(false);
      setFotosDevolucao([]);
    } catch (error) {
      console.error('Erro ao registrar devolução:', error);
      Alert.alert('Erro', 'Não foi possível registrar a devolução.');
    } finally {
      setSubindoDevolucao(false);
    }
  };

  const confirmarCanhotos = async () => {
    if (!viagemAtual || !motoristaDocId) return;
    setSubindoCanhotos(true);
    try {
      const docRef = doc(db, viagemAtual.docId);
      const agora = new Date();
      const dataFormatada = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

      let fotosUrls: string[] = [];
      if (fotosCanhotos.length > 0) {
        fotosUrls = await uploadMultiplasFotos(fotosCanhotos, viagemAtual.id, 'canhoto');
      }

      // Apenas registra os canhotos e solicita finalização ao gestor - NÃO finaliza automaticamente
      const canhotosData = {
        canhotos: {
          dataHora: dataFormatada,
          timestamp: agora,
          fotosUrls: fotosUrls.length > 0 ? fotosUrls : null,
        },
        aguardandoFinalizacaoGestor: true,
        solicitacaoFinalizacao: {
          dataHora: dataFormatada,
          timestamp: agora,
          status: 'pendente',
          motoristaId: motoristaDocId,
          motoristaNome: motorista.nome
        },
        historicoStatus: {
          ...viagemAtual.historicoStatus,
          canhotos: { dataHora: dataFormatada, timestamp: agora, fotosUrls },
          aguardandoGestor: { dataHora: dataFormatada, timestamp: agora },
        },
      };

      await updateDoc(docRef, canhotosData);

      const historicoMotoristaRef = collection(db, `motoristas/${motoristaDocId}/historicoCheckins`);
      await addDoc(historicoMotoristaRef, {
        viagemId: viagemAtual.id,
        tipo: 'entrega_canhotos',
        dataHora: dataFormatada,
        timestamp: agora,
        fotosUrls,
        aguardandoGestor: true
      });

      Alert.alert(
        'Canhotos Registrados!', 
        'Os canhotos foram enviados com sucesso. O gestor irá verificar e finalizar a viagem.'
      );
      setModalCanhotosVisible(false);
      setFotosCanhotos([]);
    } catch (error) {
      console.error('Erro ao registrar canhotos:', error);
      Alert.alert('Erro', 'Não foi possível registrar os canhotos.');
    } finally {
      setSubindoCanhotos(false);
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
      case 'programada': return { label: 'PROGRAMADA', color: '#FFD700', acao: 'checkin_coleta' };
      case 'aguardando_carregamento': return { label: 'AGUARDANDO CARREGAMENTO', color: '#FFD700' };
      case 'seguindo_para_entrega': return { label: 'EM ROTA PARA ENTREGA', color: '#22C55E', acao: 'checkin_entrega' };
      case 'chegou_entrega': return { label: 'CHEGOU NA ENTREGA', color: '#3B82F6', acao: 'pos_entrega' };
      default: return { label: 'EM ANDAMENTO', color: '#3B82F6' };
    }
  };

  const formatarUltimaAtualizacao = () => {
    if (!localizacaoAtual.ultimaAtualizacao) return 'Nunca atualizado';
    const agora = new Date();
    const diff = Math.floor((agora.getTime() - localizacaoAtual.ultimaAtualizacao.getTime()) / 1000 / 60);
    if (diff < 1) return 'Agora mesmo';
    if (diff === 1) return 'Há 1 minuto';
    return `Há ${diff} minutos`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  const statusAtual = viagemAtual ? getStatusViagemAtual(viagemAtual.status) : null;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Card de Localização Atual - SEM BOTÃO DE ATUALIZAR */}
        <View style={styles.localizacaoCard}>
          <View style={styles.localizacaoHeader}>
            <Ionicons name="location" size={20} color="#FFD700" />
            <Text style={styles.localizacaoTitulo}>Localização Atual</Text>
            {localizacaoAtual.atualizando && (
              <ActivityIndicator size="small" color="#FFD700" style={styles.localizacaoLoader} />
            )}
          </View>
          
          <View style={styles.localizacaoContent}>
            <Ionicons name="navigate-circle" size={24} color="#FFD700" />
            <Text style={styles.localizacaoCidade}>{localizacaoAtual.cidade}</Text>
          </View>
          
          <Text style={styles.localizacaoAtualizacao}>
            Atualização automática a cada 5 minutos • Última: {formatarUltimaAtualizacao()}
          </Text>
        </View>

        <View style={styles.viagemAtualContainer}>
          <Text style={styles.sectionTitle}>SUA VIAGEM ATUAL</Text>

          {loadingViagem ? (
            <View style={styles.noViagemCard}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={[styles.noViagemText, { marginTop: 12 }]}>Buscando viagem...</Text>
            </View>
          ) : viagemAtual ? (
            <View style={styles.viagemAtualCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('HistoricoViagens', {
                  cpfMotorista: motorista.cpf,
                  nomeMotorista: motorista.nome,
                  motoristaDocId: motoristaDocId
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
                  <View style={[styles.checkinInfo, viagemAtual.chegadaColeta.pontualidade === 'No Show' ? styles.noShowInfo : styles.onTimeInfo]}>
                    <Ionicons 
                      name={viagemAtual.chegadaColeta.pontualidade === 'On Time' ? "checkmark-circle" : "alert-circle"} 
                      size={14} 
                      color={viagemAtual.chegadaColeta.pontualidade === 'On Time' ? "#22C55E" : "#EF4444"} 
                    />
                    <Text style={[styles.checkinText, viagemAtual.chegadaColeta.pontualidade === 'No Show' ? styles.noShowText : styles.onTimeText]}>
                      Checkin Coleta: {viagemAtual.chegadaColeta.dataHora} ({viagemAtual.chegadaColeta.pontualidade})
                    </Text>
                  </View>
                )}

                {viagemAtual.chegadaEntrega && (
                  <View style={[styles.checkinInfo, viagemAtual.chegadaEntrega.pontualidade === 'No Show' ? styles.noShowInfo : styles.onTimeInfo]}>
                    <Ionicons 
                      name={viagemAtual.chegadaEntrega.pontualidade === 'On Time' ? "checkmark-circle" : "alert-circle"} 
                      size={14} 
                      color={viagemAtual.chegadaEntrega.pontualidade === 'On Time' ? "#22C55E" : "#EF4444"} 
                    />
                    <Text style={[styles.checkinText, viagemAtual.chegadaEntrega.pontualidade === 'No Show' ? styles.noShowText : styles.onTimeText]}>
                      Chegada Entrega: {viagemAtual.chegadaEntrega.dataHora} ({viagemAtual.chegadaEntrega.pontualidade})
                    </Text>
                  </View>
                )}

                {viagemAtual.devolucao && (
                  <View style={styles.checkinInfo}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={styles.checkinText}>Devolução: {viagemAtual.devolucao.dataHora}</Text>
                  </View>
                )}

                {viagemAtual.canhotos && (
                  <View style={styles.checkinInfo}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={styles.checkinText}>Canhotos: {viagemAtual.canhotos.dataHora}</Text>
                  </View>
                )}

                {viagemAtual.aguardandoFinalizacaoGestor && (
                  <View style={[styles.checkinInfo, { backgroundColor: '#FFD70015' }]}>
                    <Ionicons name="hourglass" size={14} color="#FFD700" />
                    <Text style={[styles.checkinText, { color: '#FFD700' }]}>
                      Aguardando gestor finalizar viagem
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>🚛 {viagemAtual.placa || '—'}</Text>
                  <Text style={styles.infoText}>🚚 {viagemAtual.carreta || viagemAtual.placaCarreta || '—'}</Text>
                  <Text style={styles.infoText}>⚖️ {viagemAtual.peso || '—'}kg</Text>
                </View>
              </TouchableOpacity>

              {viagemAtual.status === 'programada' && (
                <TouchableOpacity style={styles.botaoCheckinColeta} onPress={registrarChegadaColeta}>
                  <Ionicons name="location" size={20} color="#000" />
                  <Text style={styles.botaoIniciarText}>Check-in Coleta</Text>
                </TouchableOpacity>
              )}

              {viagemAtual.status === 'aguardando_carregamento' && (
                <TouchableOpacity style={styles.botaoIniciarViagem} onPress={iniciarViagem}>
                  <Ionicons name="car-sport" size={20} color="#000" />
                  <Text style={styles.botaoIniciarText}>Iniciar Viagem para Entrega</Text>
                </TouchableOpacity>
              )}

              {viagemAtual.status === 'seguindo_para_entrega' && (
                <TouchableOpacity style={styles.botaoChegadaEntrega} onPress={registrarChegadaEntrega}>
                  <Ionicons name="flag" size={20} color="#000" />
                  <Text style={styles.botaoIniciarText}>Registrar Chegada na Entrega</Text>
                </TouchableOpacity>
              )}

              {viagemAtual.status === 'chegou_entrega' && (
                <>
                  {!viagemAtual.devolucao && (
                    <TouchableOpacity style={styles.botaoPosEntrega} onPress={() => setModalDevolucaoVisible(true)}>
                      <MaterialIcons name="assignment-return" size={20} color="#000" />
                      <Text style={styles.botaoIniciarText}>Registrar Devolução</Text>
                    </TouchableOpacity>
                  )}

                  {!viagemAtual.canhotos && !viagemAtual.aguardandoFinalizacaoGestor && (
                    <TouchableOpacity style={styles.botaoEntregarCanhotos} onPress={() => setModalCanhotosVisible(true)}>
                      <Ionicons name="document-text" size={20} color="#000" />
                      <Text style={styles.botaoIniciarText}>Entregar Canhotos</Text>
                    </TouchableOpacity>
                  )}

                  {viagemAtual.canhotos && !viagemAtual.aguardandoFinalizacaoGestor && (
                    <View style={styles.infoStatus}>
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                      <Text style={styles.infoStatusText}>Canhotos entregues. Aguardando gestor finalizar.</Text>
                    </View>
                  )}
                </>
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

        <View style={styles.bottomMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HistoricoViagens', {
              cpfMotorista: motorista.cpf,
              nomeMotorista: motorista.nome,
              motoristaDocId: motoristaDocId
            })}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="map-outline" size={30} color="#0EA5E9" />
            </View>
            <Text style={styles.menuText}>Histórico</Text>
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

      {/* MODAL CHECK-IN COLETA */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Check-in na Coleta</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoViagemModal}>
                <Text style={styles.infoLabel}>Local</Text>
                <Text style={styles.infoValue}>{viagemAtual?.coletaLocal || viagemAtual?.clienteColeta || '—'}</Text>
                <Text style={styles.infoLabel}>Cidade</Text>
                <Text style={styles.infoValue}>{viagemAtual?.coletaCidade || '—'}</Text>
                <Text style={styles.infoLabel}>Horário Programado</Text>
                <Text style={[styles.infoValue, styles.horarioDestaque]}>{viagemAtual?.coletaData || 'Não definido'}</Text>
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
                    <Ionicons name="person" size={20} color={tipoFoto === 'selfie' ? '#000' : '#FFD700'} />
                    <Text style={[styles.tipoFotoText, tipoFoto === 'selfie' && styles.tipoFotoTextActive]}>Selfie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tipoFotoOption, tipoFoto === 'documento' && styles.tipoFotoOptionActive]}
                    onPress={() => setTipoFoto('documento')}
                  >
                    <Ionicons name="document" size={20} color={tipoFoto === 'documento' ? '#000' : '#FFD700'} />
                    <Text style={[styles.tipoFotoText, tipoFoto === 'documento' && styles.tipoFotoTextActive]}>Comprovante</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fotoContainer}>
                <Text style={styles.label}>Foto do Comprovante</Text>
                {fotoChegada ? (
                  <View style={styles.fotoPreviewContainer}>
                    <Image source={{ uri: fotoChegada }} style={styles.fotoPreview} />
                    <TouchableOpacity style={styles.removerFoto} onPress={() => setFotoChegada(null)}>
                      <Ionicons name="close-circle" size={28} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.botoesFotoRow}>
                    <TouchableOpacity style={styles.botaoFotoHorizontal} onPress={() => tirarFoto(setFotoChegada)}>
                      <Ionicons name="camera" size={24} color="#FFD700" />
                      <Text style={styles.botaoFotoTextHorizontal}>Câmera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botaoFotoHorizontal} onPress={() => escolherFotoGaleria(setFotoChegada)}>
                      <Ionicons name="images" size={24} color="#FFD700" />
                      <Text style={styles.botaoFotoTextHorizontal}>Galeria</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => { setModalVisible(false); setFotoChegada(null); }}>
                  <Text style={styles.botaoCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoConfirmar, !fotoChegada && styles.botaoConfirmarDisabled]} onPress={confirmarChegada} disabled={subindoFoto || !fotoChegada}>
                  {subindoFoto ? <ActivityIndicator color="#000" /> : <Text style={styles.botaoConfirmarText}>Confirmar Check-in</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL CHECK-IN ENTREGA */}
      <Modal animationType="slide" transparent={true} visible={modalEntregaVisible} onRequestClose={() => setModalEntregaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Chegada na Entrega</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoViagemModal}>
                <Text style={styles.infoLabel}>Local</Text>
                <Text style={styles.infoValue}>{viagemAtual?.entregaLocal || viagemAtual?.clienteEntrega || '—'}</Text>
                <Text style={styles.infoLabel}>Cidade</Text>
                <Text style={styles.infoValue}>{viagemAtual?.entregaCidade || '—'}</Text>
                <Text style={styles.infoLabel}>Horário Programado</Text>
                <Text style={[styles.infoValue, styles.horarioDestaque]}>{viagemAtual?.entregaData || 'Não definido'}</Text>
              </View>

              <View style={styles.dataHoraContainer}>
                <Text style={styles.label}>Data e Hora da Chegada</Text>
                <TextInput
                  style={styles.inputDataHora}
                  value={dataHoraEntrega}
                  onChangeText={setDataHoraEntrega}
                  placeholder="DD/MM/AAAA HH:MM"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalEntregaVisible(false)}>
                  <Text style={styles.botaoCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoConfirmar, { backgroundColor: '#22C55E' }]} onPress={confirmarChegadaEntrega}>
                  <Text style={styles.botaoConfirmarText}>Confirmar Chegada</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DEVOLUÇÃO */}
      <Modal animationType="slide" transparent={true} visible={modalDevolucaoVisible} onRequestClose={() => setModalDevolucaoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Registrar Devolução</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoViagemModal}>
                <Text style={styles.infoLabel}>Viagem</Text>
                <Text style={styles.infoValue}>{viagemAtual?.coletaCidade} → {viagemAtual?.entregaCidade}</Text>
                <Text style={styles.infoLabel}>DT</Text>
                <Text style={styles.infoValue}>{viagemAtual?.dt || '—'}</Text>
              </View>

              <View style={styles.fotoContainer}>
                <Text style={styles.label}>Fotos da Devolução (Opcional)</Text>
                <Text style={styles.subLabel}>Adicione quantas fotos precisar</Text>
                
                {fotosDevolucao.length > 0 && (
                  <ScrollView horizontal style={styles.fotosArrayContainer} showsHorizontalScrollIndicator={false}>
                    {fotosDevolucao.map((uri, index) => (
                      <View key={index} style={styles.fotoArrayItem}>
                        <Image source={{ uri }} style={styles.fotoArrayPreview} />
                        <TouchableOpacity 
                          style={styles.removerFotoArray} 
                          onPress={() => removerFotoArray(index, fotosDevolucao, setFotosDevolucao)}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={styles.botoesFotoRow}>
                  <TouchableOpacity style={styles.botaoFotoHorizontal} onPress={() => adicionarFotoArray(fotosDevolucao, setFotosDevolucao)}>
                    <Ionicons name="camera" size={24} color="#FFD700" />
                    <Text style={styles.botaoFotoTextHorizontal}>Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botaoFotoHorizontal} onPress={() => adicionarFotoGaleriaArray(fotosDevolucao, setFotosDevolucao)}>
                    <Ionicons name="images" size={24} color="#FFD700" />
                    <Text style={styles.botaoFotoTextHorizontal}>Galeria</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => { setModalDevolucaoVisible(false); setFotosDevolucao([]); }}>
                  <Text style={styles.botaoCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoConfirmar, { backgroundColor: '#3B82F6' }]} onPress={confirmarDevolucao} disabled={subindoDevolucao}>
                  {subindoDevolucao ? <ActivityIndicator color="#000" /> : <Text style={styles.botaoConfirmarText}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL CANHOTOS */}
      <Modal animationType="slide" transparent={true} visible={modalCanhotosVisible} onRequestClose={() => setModalCanhotosVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Entregar Canhotos</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoViagemModal}>
                <Text style={styles.infoLabel}>Viagem</Text>
                <Text style={styles.infoValue}>{viagemAtual?.coletaCidade} → {viagemAtual?.entregaCidade}</Text>
                <Text style={styles.infoLabel}>DT</Text>
                <Text style={styles.infoValue}>{viagemAtual?.dt || '—'}</Text>
              </View>

              <View style={styles.fotoContainer}>
                <Text style={styles.label}>Fotos dos Canhotos (Opcional)</Text>
                <Text style={styles.subLabel}>Adicione quantas fotos precisar</Text>
                
                {fotosCanhotos.length > 0 && (
                  <ScrollView horizontal style={styles.fotosArrayContainer} showsHorizontalScrollIndicator={false}>
                    {fotosCanhotos.map((uri, index) => (
                      <View key={index} style={styles.fotoArrayItem}>
                        <Image source={{ uri }} style={styles.fotoArrayPreview} />
                        <TouchableOpacity 
                          style={styles.removerFotoArray} 
                          onPress={() => removerFotoArray(index, fotosCanhotos, setFotosCanhotos)}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={styles.botoesFotoRow}>
                  <TouchableOpacity style={styles.botaoFotoHorizontal} onPress={() => adicionarFotoArray(fotosCanhotos, setFotosCanhotos)}>
                    <Ionicons name="camera" size={24} color="#FFD700" />
                    <Text style={styles.botaoFotoTextHorizontal}>Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botaoFotoHorizontal} onPress={() => adicionarFotoGaleriaArray(fotosCanhotos, setFotosCanhotos)}>
                    <Ionicons name="images" size={24} color="#FFD700" />
                    <Text style={styles.botaoFotoTextHorizontal}>Galeria</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalBotoes}>
                <TouchableOpacity style={styles.botaoCancelar} onPress={() => { setModalCanhotosVisible(false); setFotosCanhotos([]); }}>
                  <Text style={styles.botaoCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoConfirmar, { backgroundColor: '#8B5CF6' }]} onPress={confirmarCanhotos} disabled={subindoCanhotos}>
                  {subindoCanhotos ? <ActivityIndicator color="#000" /> : <Text style={styles.botaoConfirmarText}>Enviar Canhotos</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    marginBottom: 15,
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

  localizacaoCard: {
    backgroundColor: '#0A0A0A',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  localizacaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  localizacaoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
    flex: 1,
  },
  localizacaoLoader: {
    marginLeft: 8,
  },
  localizacaoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 8,
  },
  localizacaoCidade: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 10,
  },
  localizacaoAtualizacao: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 0,
  },

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
    padding: 6,
    borderRadius: 6,
    marginTop: 6
  },
  onTimeInfo: { backgroundColor: '#22C55E15' },
  noShowInfo: { backgroundColor: '#EF444415' },
  checkinText: { fontSize: 11, fontWeight: '600' },
  onTimeText: { color: '#22C55E' },
  noShowText: { color: '#EF4444' },

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

  botaoCheckinColeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  botaoIniciarViagem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  botaoIniciarText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  botaoChegadaEntrega: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  botaoPosEntrega: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  botaoEntregarCanhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  infoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E15',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  infoStatusText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
  },

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
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: { alignItems: 'center', flex: 1, minWidth: 80 },
  logoutItem: { alignItems: 'center', flex: 1, minWidth: 80 },
  menuIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuText: { fontSize: 11.5, color: '#CCC', fontWeight: '600', textAlign: 'center' },
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
  horarioDestaque: { color: '#FFD700' },

  dataHoraContainer: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#AAA', marginBottom: 6 },
  subLabel: { fontSize: 11, color: '#666', marginBottom: 8 },
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
  botoesFotoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  botaoFotoHorizontal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#1A1A1A',
  },
  botaoFotoTextHorizontal: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
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
  botaoConfirmarDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },

  fotosArrayContainer: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  fotoArrayItem: { position: 'relative', marginRight: 10 },
  fotoArrayPreview: { width: 100, height: 100, borderRadius: 10 },
  removerFotoArray: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000',
    borderRadius: 12,
  },

  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
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