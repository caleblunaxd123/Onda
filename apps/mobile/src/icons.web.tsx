import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import './icons.web.css';
export function Ionicons({name,size=24,color='currentColor'}:{name:keyof typeof glyphs;size?:number;color?:string}) {
 return <span aria-hidden="true" style={{fontFamily:'OndaIonicons',fontSize:size,color,lineHeight:1,fontStyle:'normal',display:'inline-block'}}>{String.fromCodePoint(glyphs[name])}</span>;
}
