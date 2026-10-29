import {View} from 'react-native';
import {Page, ScreenHeader} from '../src/ui';
import {BackupCard} from '../src/backup-card';
export default function Backup() {return <View style={{flex: 1}}><ScreenHeader title="Respaldo de favoritas" back/><Page><BackupCard/></Page></View>;}
