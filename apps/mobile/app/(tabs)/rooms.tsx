import {Redirect, useLocalSearchParams} from 'expo-router';
export default function RoomsAlias() {
  const {view} = useLocalSearchParams<{view?: string}>();
  return <Redirect href={{pathname: '/', params: view ? {view} : {}}}/>;
}
