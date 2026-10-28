import {useWindowDimensions} from 'react-native';
export const useDesktop = () => useWindowDimensions().width >= 1000;
