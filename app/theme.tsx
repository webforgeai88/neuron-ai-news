'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {Sun,Moon,Monitor,Check,ChevronDown} from 'lucide-react';
type Theme='light'|'dark'|'system';
const ThemeContext=createContext<{theme:Theme;choose:(theme:Theme)=>void}>({theme:'system',choose:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}){
  const [theme,setTheme]=useState<Theme>('system');
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{const saved=localStorage.getItem('neuron-theme');if(saved==='light'||saved==='dark'||saved==='system')setTheme(saved);}catch{}setReady(true);},[]);
  useEffect(()=>{
    if(!ready)return;
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const apply=()=>{document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;};
    apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
  },[theme,ready]);
  const choose=(value:Theme)=>{setTheme(value);try{localStorage.setItem('neuron-theme',value);}catch{}};
  return <ThemeContext.Provider value={{theme,choose}}>{children}</ThemeContext.Provider>;
}
const choices=[{value:'light' as Theme,label:'Светлая',Icon:Sun},{value:'dark' as Theme,label:'Тёмная',Icon:Moon},{value:'system' as Theme,label:'Как на устройстве',Icon:Monitor}];
export function ThemeSwitch(){
  const {theme,choose}=useContext(ThemeContext);
  const Icon=choices.find(c=>c.value===theme)?.Icon||Monitor;
  return <details className="theme-switch"><summary aria-label="Выбрать цветовую тему"><Icon size={17}/><span>Тема</span><ChevronDown size={12}/></summary><div className="theme-options" role="group" aria-label="Цветовая тема"><p>Оформление сайта</p>{choices.map(({value,label,Icon})=><button key={value} type="button" aria-pressed={theme===value} onClick={e=>{choose(value);e.currentTarget.closest('details')?.removeAttribute('open');}}><Icon size={17}/><span>{label}</span>{theme===value&&<Check size={15}/>}</button>)}</div></details>;
}
