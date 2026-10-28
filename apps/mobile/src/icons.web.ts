import {createElement, type CSSProperties} from 'react';
import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import './icons.web.css';
export function Ionicons({name,size=24,color='currentColor',style}:{name:keyof typeof glyphs;size?:number;color?:string;style?:CSSProperties}) {
 return createElement('span',{'aria-hidden':true,style:{fontFamily:'OndaIonicons',fontSize:size,color,lineHeight:1,fontStyle:'normal',display:'inline-block',...style}},String.fromCodePoint(glyphs[name]));
}
