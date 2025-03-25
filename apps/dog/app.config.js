import 'dotenv/config';

export default {
  name: 'DogApp',
  slug: 'dog',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  expo: {
    extra: {
      apiUrl: `http://${process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '127.0.0.1'}:8000/api`,
      appName: 'DogApp',
      debug: true,
    },
  },
};