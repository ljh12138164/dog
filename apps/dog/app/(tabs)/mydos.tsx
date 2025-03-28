import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Dog, useDogs } from '@/http/useDogs';
import Toast from 'react-native-toast-message';
import { ShowToast } from '../_layout';
import { Link } from 'expo-router';

export default function TabTwoScreen() {
  const { data: dogs, isLoading, error } = useDogs();

  const renderDogItem = ({ item }: { item: Dog }) => (
    <Link href={`/detail/${item.id}`}>
      <ThemedView style={styles.dogCard}>
        {item.image_url && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.dogImage} />
          </View>
        )}
        <ThemedView style={styles.dogInfo}>
          <ThemedText type='defaultSemiBold' style={styles.dogName}>
            {item.name}
          </ThemedText>
          <View style={styles.dogDetails}>
            <ThemedText style={styles.detailText}>
              品种: {item.breed}
            </ThemedText>
            <ThemedText style={styles.detailText}>
              身高: {item.height} cm
            </ThemedText>
            <ThemedText style={styles.detailText}>
              体重: {item.weight} kg
            </ThemedText>
          </View>
        </ThemedView>
      </ThemedView>
    </Link>
  );

  return (
    <>
      <View style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type='title' style={styles.titleText}>
            我的狗狗
          </ThemedText>
        </ThemedView>

        {isLoading ? (
          <ThemedView
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <ActivityIndicator size='large' />
            <ThemedText>加载中...</ThemedText>
          </ThemedView>
        ) : error ? (
          <ThemedView style={{ padding: 20 }}>
            <ThemedText style={{ color: 'red' }}>
              加载失败: {error.message}
            </ThemedText>
          </ThemedView>
        ) : dogs && dogs.length > 0 ? (
          <FlatList
            data={dogs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDogItem}
            contentContainerStyle={styles.dogsList}
            scrollEnabled={true}
          />
        ) : (
          <ThemedView style={{ padding: 20, alignItems: 'center' }}>
            <ThemedText>暂无狗狗数据</ThemedText>
          </ThemedView>
        )}

        <Collapsible title='关于狗狗管理'>
          <ThemedText>
            这个页面展示了您的所有狗狗信息。您可以查看每只狗狗的详细信息，包括名称、品种、身高和体重等。
          </ThemedText>
        </Collapsible>
      </View>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    overflow: 'visible',
    height: '100%',
  },
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    paddingBottom: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
  },
  dogsList: {
    gap: 16,
    paddingBottom: 24,
  },
  dogCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eaeaea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#f9f9f9',
  },
  dogImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dogInfo: {
    padding: 16,
  },
  dogName: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  dogDetails: {
    gap: 6,
  },
  detailText: {
    fontSize: 15,
    color: '#555',
  },
});
