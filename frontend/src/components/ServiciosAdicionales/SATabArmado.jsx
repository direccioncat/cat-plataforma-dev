/**
 * SATabArmado.jsx — v7
 * + Resumen pool vs vacantes
 * + Límite de módulos diarios cross-SSAA (MAX_MODULOS_DIA = 2)
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../../lib/api'
import { ROLES_OPERATIVOS } from '../../lib/rolesOperativos'

const MAX_MODULOS_DIA = 2

const ROLES = ROLES_OPERATIVOS
const ROLES_CONDUCCION = ['coordinador', 'supervisor']
const ROLES_TODOS = Object.keys(ROLES)
const ROL_DEFAULT = 'infante'
const MAPA_ROL = { jefe_general:'coordinador', jefe:'coordinador', agente:'infante', supervisor:'supervisor', motorizado:'motorizado', chofer:'chofer', chofer_grua:'chofer_grua', infante:'infante', jefe_operativo:'coordinador', coordinador:'coordinador' }
function mapearRol(r) { return MAPA_ROL[r] || 'infante' }
const MATCH_CONDUCCION = ['jefe_general','jefe','supervisor','jefe_operativo','coordinador']
const MATCH_MOTORIZADO = ['motorizado']
const MATCH_CHOFER = ['chofer','chofer_grua']
const MATCH_INFANTE = ['agente','infante']

function fmtHora(h) { return h ? String(h).slice(0,5) : '' }
function fmtFechaCorta(f) { if (!f) return ''; return new Date(String(f).slice(0,10)+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'}) }
function initials(n) { return (n||'?').split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase() }
function prioInfo(p) {
  if ((p.penalizaciones_activas||0)>0||(p.modulos_mes||0)>=2) return {color:'#A32D2D',bg:'#FCEBEB',label:'Baja'}
  if ((p.modulos_mes||0)===1) return {color:'#BA7517',bg:'#FAEEDA',label:'Media'}
  return {color:'#0F6E56',bg:'#E1F5EE',label:'Alta'}
}

function ChipAsignado({nodo,onQuitar,onCambiarRol,sobreLimite}) {
  const [showPop,setShowPop]=useState(false)
  const [popPos,setPopPos]=useState({top:0,left:0})
  const chipRef=useRef(null), popRef=useRef(null)
  const rol=ROLES[nodo.rol]||ROLES.infante
  const esCond=ROLES_CONDUCCION.includes(nodo.rol)
  useEffect(()=>{if(!showPop||!chipRef.current)return;const r=chipRef.current.getBoundingClientRect();const pH=260;setPopPos({top:window.innerHeight-r.bottom<pH?r.top-pH-4:r.bottom+4,left:Math.min(r.left,window.innerWidth-170)})},[showPop])
  useEffect(()=>{if(!showPop)return;const h=e=>{if(chipRef.current&&!chipRef.current.contains(e.target)&&popRef.current&&!popRef.current.contains(e.target))setShowPop(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[showPop])
  useEffect(()=>{if(!showPop)return;const h=()=>setShowPop(false);window.addEventListener('scroll',h,true);return()=>window.removeEventListener('scroll',h,true)},[showPop])
  const nombre=(nodo.nombre_completo||'').split(' ').slice(0,2).join(' ')
  return(<>
    <div ref={chipRef} style={{display:'inline-flex'}}>
      <div onClick={()=>setShowPop(!showPop)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 8px 5px 6px',borderRadius:20,border:sobreLimite?'1.5px solid #EF9F27':esCond?`1.5px solid ${rol.dot}`:'0.5px solid #e5e5ea',background:sobreLimite?'#FAEEDA':esCond?rol.bg:'#fff',fontSize:12,fontWeight:500,color:'#1d1d1f',cursor:'pointer',userSelect:'none',transition:'all 0.1s'}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 1px 6px rgba(0,0,0,0.08)'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none'}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:sobreLimite?'#EF9F27':rol.dot,flexShrink:0}}/>
        <span style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nombre}</span>
        {sobreLimite&&<span style={{fontSize:9,fontWeight:700,color:'#BA7517'}} title={`Supera el límite de ${MAX_MODULOS_DIA} módulos diarios`}>⚠</span>}
        {nodo.tipo_convocatoria==='ordinario'&&<span style={{fontSize:9,color:'#aeaeb2'}}>ord</span>}
        <span onClick={e=>{e.stopPropagation();onQuitar(nodo.id)}} style={{fontSize:14,color:'#c7c7cc',cursor:'pointer',lineHeight:1,marginLeft:1}} onMouseEnter={e=>{e.currentTarget.style.color='#A32D2D'}} onMouseLeave={e=>{e.currentTarget.style.color='#c7c7cc'}}>x</span>
      </div>
    </div>
    {showPop&&createPortal(<div ref={popRef} style={{position:'fixed',top:popPos.top,left:popPos.left,zIndex:9999,background:'#fff',border:'0.5px solid #e5e5ea',borderRadius:10,padding:5,minWidth:160,boxShadow:'0 8px 30px rgba(0,0,0,0.15)'}}>
      <div style={{fontSize:10,color:'#aeaeb2',padding:'3px 8px 5px',fontWeight:600}}>Cambiar rol</div>
      {ROLES_TODOS.map(k=>{const r=ROLES[k];const act=nodo.rol===k;return(<div key={k} onClick={()=>{onCambiarRol(nodo.id,k);setShowPop(false)}} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 8px',borderRadius:6,cursor:'pointer',background:act?r.bg:'transparent',transition:'background 0.1s'}} onMouseEnter={e=>{if(!act)e.currentTarget.style.background='#f5f5f7'}} onMouseLeave={e=>{if(!act)e.currentTarget.style.background='transparent'}}><div style={{width:7,height:7,borderRadius:'50%',background:r.dot}}/><span style={{fontSize:12,fontWeight:act?600:400,color:act?r.color:'#1d1d1f'}}>{r.label}</span>{act&&<span style={{marginLeft:'auto',fontSize:12,color:r.color}}>&#10003;</span>}</div>)})}
    </div>,document.body)}
  </>)
}

function CoberturaBar({label,actual,objetivo,color}) {
  const pct=objetivo>0?Math.min(100,Math.round((actual/objetivo)*100)):0
  return(<div style={{flex:1,minWidth:80}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:10,color:'#8e8e93'}}>{label}</span><span style={{fontSize:10,fontWeight:600,color:actual>=objetivo?color:'#8e8e93'}}>{actual}/{objetivo}</span></div><div style={{height:4,borderRadius:2,background:'#f0f0f5',overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',borderRadius:2,background:color,transition:'width 0.3s'}}/></div></div>)
}

function TurnoColumna({turno,estructura,onQuitar,onCambiarRol,onAutoAsignar,autoAsignando,disponibles,modulosDia,agentesConExceso}) {
  const turnoFecha=turno.fecha?String(turno.fecha).slice(0,10):null
  function sobreLimite(agente_id){
    if(agentesConExceso?.has(agente_id))return true
    if(turnoFecha){const mods=modulosDia?.[turnoFecha]?.[agente_id]||0;if(mods>MAX_MODULOS_DIA)return true}
    return false
  }
  const hora=[fmtHora(turno.hora_inicio),fmtHora(turno.hora_fin)].filter(Boolean).join(' \u2013 ')
  const porRol={};for(const e of estructura){const rk=e.rol||'infante';if(!porRol[rk])porRol[rk]=[];porRol[rk].push(e)}
  const secciones=ROLES_TODOS.filter(r=>porRol[r]?.length>0)
  const cntInf  =(porRol.infante    ||[]).length
  const cntSup  =(porRol.supervisor ||[]).length
  const cntMoto =(porRol.motorizado ||[]).length
  const cntChof =(porRol.chofer     ||[]).length
  const cntGrua =(porRol.chofer_grua||[]).length
  const cntCoor =(porRol.coordinador||[]).length
  const dotA=turno.dotacion_agentes||0, dotS=turno.dotacion_supervisores||0
  const dotM=turno.dotacion_motorizados||0, dotC=turno.dotacion_choferes||0
  const dotG=turno.dotacion_choferes_gruas||0, dotCoor=turno.dotacion_coordinadores||0
  const totalDot=dotA+dotS+dotM+dotC+dotG+dotCoor
  const totalAsig=estructura.length, faltanPlazas=totalDot>0&&totalAsig<totalDot
  const sinCandidatos = faltanPlazas && disponibles === 0
  return(
    <div style={{flex:1,minWidth:230,maxWidth:360,background:'#fff',borderRadius:14,border:'0.5px solid #e5e5ea',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'12px 14px',borderBottom:'0.5px solid #f0f0f5'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:14,fontWeight:600,color:'#1a2744'}}>{turno.nombre||fmtFechaCorta(turno.fecha)}</div>{hora&&<div style={{fontSize:12,color:'#8e8e93',marginTop:1}}>{hora}hs</div>}</div>
          <div style={{fontSize:20,fontWeight:600,color:'#1a2744'}}>{totalAsig}</div>
        </div>
        {totalDot>0&&(<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
          {dotA>0&&<CoberturaBar label="Infantes" actual={cntInf} objetivo={dotA} color="#1D9E75"/>}
          {dotS>0&&<CoberturaBar label="Supervisores" actual={cntSup} objetivo={dotS} color="#7F77DD"/>}
          {dotM>0&&<CoberturaBar label="Motorizados" actual={cntMoto} objetivo={dotM} color="#D85A30"/>}
          {dotC>0&&<CoberturaBar label="Choferes" actual={cntChof} objetivo={dotC} color="#888780"/>}
          {dotG>0&&<CoberturaBar label="Choferes de grúa" actual={cntGrua} objetivo={dotG} color="#818CF8"/>}
          {dotCoor>0&&<CoberturaBar label="Coordinadores" actual={cntCoor} objetivo={dotCoor} color="#D4537E"/>}
        </div>)}
        {faltanPlazas&&(
          <div>
            <button
              onClick={()=>!sinCandidatos&&onAutoAsignar(turno.id)}
              disabled={autoAsignando||sinCandidatos}
              style={{width:'100%',marginTop:8,padding:'7px',borderRadius:8,border:'none',background:sinCandidatos?'#f5f5f7':'#1a2744',color:sinCandidatos?'#aeaeb2':'#f5c800',fontSize:11,fontWeight:600,cursor:autoAsignando||sinCandidatos?'default':'pointer',opacity:autoAsignando?0.6:1,transition:'opacity 0.15s'}}
              onMouseEnter={e=>{if(!autoAsignando&&!sinCandidatos)e.currentTarget.style.opacity='0.85'}}
              onMouseLeave={e=>{e.currentTarget.style.opacity=autoAsignando?'0.6':'1'}}>
              {autoAsignando?'Asignando...':sinCandidatos?'Sin candidatos disponibles':`Auto-completar (faltan ${totalDot-totalAsig})`}
            </button>
            {sinCandidatos&&(
              <div style={{fontSize:10,color:'#aeaeb2',textAlign:'center',marginTop:4,lineHeight:1.4}}>
                No hay postulantes sin asignar para este turno
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{flex:1,padding:'10px 12px',overflowY:'auto'}}>
        {estructura.length===0?(<div style={{padding:20,textAlign:'center',border:'1px dashed #e5e5ea',borderRadius:10}}><div style={{fontSize:12,color:'#c7c7cc'}}>Sin asignaciones</div><div style={{fontSize:11,color:'#d1d1d6',marginTop:3}}>Usa el boton o selecciona postulantes</div></div>)
        :secciones.map(rol=>{const r=ROLES[rol]||ROLES.infante;const items=porRol[rol];return(<div key={rol} style={{marginBottom:12}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6}}><div style={{width:6,height:6,borderRadius:'50%',background:r.dot}}/><span style={{fontSize:10,fontWeight:600,color:'#8e8e93',textTransform:'uppercase',letterSpacing:'0.04em'}}>{r.label}</span><span style={{fontSize:10,color:'#c7c7cc'}}>({items.length})</span></div><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{items.map(e=><ChipAsignado key={e.id} nodo={e} onQuitar={onQuitar} onCambiarRol={onCambiarRol} sobreLimite={sobreLimite(e.agente_id)}/>)}</div></div>)})}
      </div>
    </div>)
}

function PostulanteRow({p,selected,turnosAsignado,onClick,limiteDiario}) {
  const pi=prioInfo(p),[hover,setHover]=useState(false),yaA=turnosAsignado>0,mods=p.modulos_mes||0
  const rolLabel=(ROLES[mapearRol(p.rol_solicitado)]||ROLES.infante).label
  const vetado=p.vetado
  return(<div onClick={vetado?undefined:onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:10,
      background:vetado?'#fff5f5':selected?'#E6F1FB':hover?'#f9f9fb':'transparent',
      opacity:vetado?0.7:yaA&&!selected?0.55:1,
      cursor:vetado?'not-allowed':'pointer',userSelect:'none',transition:'all 0.1s'}}>
    <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
      border:vetado?'1.5px solid #e0b0b0':selected?'1.5px solid #185FA5':'1.5px solid #d1d1d6',
      background:vetado?'#feecec':selected?'#185FA5':'transparent',
      display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.1s'}}>
      {vetado&&<span style={{fontSize:8,color:'#c0392b',fontWeight:700,lineHeight:1}}>✕</span>}
      {!vetado&&selected&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
    </div>
    <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,
      background:vetado?'#feecec':pi.bg,
      border:`1.5px solid ${vetado?'#c0392b':pi.color}`,
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,
      color:vetado?'#c0392b':pi.color}}>{initials(p.nombre_completo)}</div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:12,fontWeight:500,color:vetado?'#c0392b':'#1d1d1f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nombre_completo}</div>
      <div style={{fontSize:10,color:'#aeaeb2'}}>{p.legajo} · {rolLabel}</div>
    </div>
    {vetado&&<span style={{fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:10,background:'#c0392b',color:'#fff',flexShrink:0,letterSpacing:'0.03em'}}>SANCIONADO</span>}
    {!vetado&&mods>0&&<span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:10,flexShrink:0,background:pi.bg,color:pi.color,border:`1px solid ${pi.color}33`}}>{mods}m</span>}
    {!vetado&&(p.penalizaciones_activas||0)>0&&<span style={{fontSize:10,color:'#A32D2D',flexShrink:0,fontWeight:700}} title="Penalizado">!</span>}
    {!vetado&&yaA&&<span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:10,background:'#E6F1FB',color:'#185FA5',flexShrink:0}}>{turnosAsignado}t</span>}
    {!vetado&&limiteDiario&&<span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:10,background:'#FFF4E5',color:'#BA7517',border:'1px solid #EFC97333',flexShrink:0}} title={`Límite de ${MAX_MODULOS_DIA} módulos diarios alcanzado`}>límite</span>}
  </div>)
}

function ModalForzar({postulante,onConfirm,onCancel}) {
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onCancel}><div style={{background:'#fff',borderRadius:16,padding:24,width:380,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
    <div style={{fontSize:15,fontWeight:600,color:'#A32D2D',marginBottom:10}}>Prioridad baja</div>
    <div style={{fontSize:13,fontWeight:600,color:'#1d1d1f',marginBottom:8}}>{postulante.nombre_completo}</div>
    <div style={{background:'#FCEBEB',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,lineHeight:1.6}}>
      {(postulante.modulos_mes||0)>0&&<div style={{color:'#BA7517'}}>{postulante.modulos_mes} modulos este mes</div>}
      {(postulante.penalizaciones_activas||0)>0&&<div style={{color:'#A32D2D'}}>{postulante.penalizaciones_activas} penalizacion(es)</div>}
    </div>
    <div style={{fontSize:12,color:'#636366',marginBottom:20}}>Incluirlo de todas formas? Queda registrado como <strong>forzado</strong>.</div>
    <div style={{display:'flex',gap:8}}><button onClick={onCancel} style={{flex:1,padding:'9px',borderRadius:10,border:'0.5px solid #e5e5ea',background:'#fff',cursor:'pointer',fontSize:13,color:'#636366'}}>Cancelar</button><button onClick={onConfirm} style={{flex:2,padding:'9px',borderRadius:10,border:'none',background:'#A32D2D',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>Agregar igual</button></div>
  </div></div>)
}

function ModalAutoResultado({resultado,onClose}) {
  if(!resultado)return null
  const {asignados,faltantes,detalle,bloqueadosLimite,sinPool}=resultado
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}><div style={{background:'#fff',borderRadius:16,padding:24,width:420,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
    <div style={{fontSize:15,fontWeight:600,color:'#1a2744',marginBottom:12}}>Asignación automática</div>
    <div style={{fontSize:32,textAlign:'center',marginBottom:8}}>{asignados>0?'\u2705':'\u26A0\uFE0F'}</div>
    <div style={{fontSize:14,fontWeight:600,color:'#1d1d1f',textAlign:'center',marginBottom:8}}>{asignados} asignado{asignados!==1?'s':''}</div>
    {detalle&&detalle.length>0&&(<div style={{background:'#f9f9fb',borderRadius:10,padding:'10px 14px',marginBottom:12}}>{detalle.map((d,i)=>{const r=ROLES[d.rol]||ROLES.infante;return(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',borderBottom:i<detalle.length-1?'0.5px solid #f0f0f5':'none'}}><div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:6,height:6,borderRadius:'50%',background:r.dot}}/><span style={{fontSize:12,color:'#1d1d1f'}}>{r.label}</span></div><span style={{fontSize:12,fontWeight:600,color:d.asignados>=d.solicitados?'#0F6E56':'#BA7517'}}>{d.asignados}/{d.solicitados}</span></div>)})}</div>)}
    {faltantes>0&&(
      <div style={{background:'#FFF8EC',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:'#BA7517',marginBottom:6}}>Faltan {faltantes} para completar la dotación</div>
        {bloqueadosLimite>0&&<div style={{fontSize:11,color:'#636366',marginBottom:3}}>· {bloqueadosLimite} agente{bloqueadosLimite!==1?'s':''} bloqueado{bloqueadosLimite!==1?'s':''} por límite de {MAX_MODULOS_DIA} módulos diarios</div>}
        {sinPool>0&&<div style={{fontSize:11,color:'#636366'}}>· {sinPool} vacante{sinPool!==1?'s':''} sin postulantes disponibles en el pool</div>}
      </div>
    )}
    <button onClick={onClose} style={{width:'100%',marginTop:8,padding:'9px',borderRadius:10,border:'none',background:'#1a2744',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>Entendido</button>
  </div></div>)
}

export default function SATabArmado({servicioId}) {
  const [turnos,setTurnos]=useState([])
  const [estructuraPorTurno,setEstructuraPorTurno]=useState({})
  const [postulantes,setPostulantes]=useState([])
  const [modulosDia,setModulosDia]=useState({}) // { 'YYYY-MM-DD': { agente_id: modulos } }
  const [cargando,setCargando]=useState(true)
  const [selected,setSelected]=useState(new Set())
  const [busqueda,setBusqueda]=useState('')
  const [turnoFiltro,setTurnoFiltro]=useState('')
  const [confirmForzar,setConfirmForzar]=useState(null)
  const [autoAsignando,setAutoAsignando]=useState(false)
  const [autoResultado,setAutoResultado]=useState(null)
  const turnosRef = useRef([])
  useEffect(() => { turnosRef.current = turnos }, [turnos])

  const recargarModulosDia = useCallback(async (ts) => {
    const fechas = [...new Set(ts.filter(t=>t.fecha).map(t=>String(t.fecha).slice(0,10)))]
    if (!fechas.length) return
    const resultados = await Promise.all(fechas.map(f => api.get('/api/servicios-adicionales/modulos-dia?fecha='+f)))
    const map = {}
    fechas.forEach((f,i) => { map[f]={}; for(const row of resultados[i]) map[f][row.agente_id]=row.modulos })
    setModulosDia(map)
  }, [])

  useEffect(()=>{
    setCargando(true)
    Promise.all([
      api.get('/api/servicios-adicionales/'+servicioId+'/turnos'),
      api.get('/api/servicios-adicionales/'+servicioId+'/postulantes')
    ]).then(async([ts,ps])=>{
      setTurnos(ts); setPostulantes(ps)
      const por={}
      await Promise.all(ts.map(async t=>{try{por[t.id]=await api.get('/api/servicios-adicionales/'+servicioId+'/turnos/'+t.id+'/estructura')}catch{por[t.id]=[]}}))
      setEstructuraPorTurno(por)
      await recargarModulosDia(ts)
    }).catch(console.error).finally(()=>setCargando(false))
  },[servicioId, recargarModulosDia])

  const recargarTurno=useCallback(async(tid)=>{try{const d=await api.get('/api/servicios-adicionales/'+servicioId+'/turnos/'+tid+'/estructura');setEstructuraPorTurno(prev=>({...prev,[tid]:d}))}catch(e){console.error(e)}},[servicioId])
  const fetchEstructuraFresca=useCallback(async()=>{const por={};const ts=turnosRef.current;await Promise.all(ts.map(async t=>{try{por[t.id]=await api.get('/api/servicios-adicionales/'+servicioId+'/turnos/'+t.id+'/estructura')}catch{por[t.id]=[]}}));return por},[servicioId])
  const recargarTodos=useCallback(async()=>{
    const por=await fetchEstructuraFresca()
    setEstructuraPorTurno(por)
    await recargarModulosDia(turnosRef.current)
  },[fetchEstructuraFresca, recargarModulosDia])

  const asignarAturno=useCallback(async(turnoId,postIds,forzado=false)=>{
    for(const pid of postIds){const p=postulantes.find(x=>x.agente_id===pid||x.id===pid);if(!p)continue;if((estructuraPorTurno[turnoId]||[]).some(e=>e.agente_id===(p.agente_id||p.id)))continue;try{await api.post('/api/servicios-adicionales/'+servicioId+'/turnos/'+turnoId+'/estructura',{agente_id:p.agente_id||p.id,rol:ROL_DEFAULT,jefe_id:null,origen:forzado?'manual_forzado':'manual',tipo_convocatoria:'adicional'})}catch(e){console.error(e.message)}}
    await recargarTurno(turnoId);setSelected(new Set())
  },[postulantes,estructuraPorTurno,servicioId,recargarTurno])

  const handleAsignar=useCallback((turnoId)=>{
    const ids=Array.from(selected)
    const bajos=ids.filter(pid=>{const p=postulantes.find(x=>(x.agente_id||x.id)===pid);return p&&((p.penalizaciones_activas||0)>0||(p.modulos_mes||0)>=2)})
    if(bajos.length>0&&!confirmForzar){setConfirmForzar({postulantes:ids,turnoId,primerBajo:postulantes.find(x=>(x.agente_id||x.id)===bajos[0])});return}
    asignarAturno(turnoId,ids)
  },[selected,postulantes,asignarAturno,confirmForzar])

  const autoAsignar = useCallback(async (turnoId) => {
    setAutoAsignando(true)
    try {
      const turno=turnosRef.current.find(t=>t.id===turnoId); if(!turno)return
      const turnoFecha=turno.fecha?String(turno.fecha).slice(0,10):null
      const modulosTurno=turno.modulos||0
      const estrFresca=await fetchEstructuraFresca()
      const yaAsignados=estrFresca[turnoId]||[]; const yaEnEsteTurno=new Set(yaAsignados.map(e=>e.agente_id))
      const yaCond=yaAsignados.filter(e=>ROLES_CONDUCCION.includes(e.rol)).length
      const yaMoto=yaAsignados.filter(e=>e.rol==='motorizado').length
      const yaChof=yaAsignados.filter(e=>e.rol==='chofer').length
      const yaInf=yaAsignados.filter(e=>['infante','agente'].includes(e.rol)).length
      const slots=[
        {rolAsignar:'supervisor',match:MATCH_CONDUCCION,faltan:Math.max(0,(turno.dotacion_supervisores||0)-yaCond)},
        {rolAsignar:'motorizado',match:MATCH_MOTORIZADO,faltan:Math.max(0,(turno.dotacion_motorizados||0)-yaMoto)},
        {rolAsignar:'chofer',match:MATCH_CHOFER,faltan:Math.max(0,((turno.dotacion_choferes||0)+(turno.dotacion_choferes_gruas||0))-yaChof)},
        {rolAsignar:'infante',match:MATCH_INFANTE,faltan:Math.max(0,(turno.dotacion_agentes||0)-yaInf)},
      ].filter(s=>s.faltan>0)
      const totalFaltan=slots.reduce((s,sl)=>s+sl.faltan,0); if(totalFaltan<=0){setAutoAsignando(false);return}

      // Snap de modulos-dia actuales para este cálculo
      const modsDiaSnap = modulosDia[turnoFecha] || {}

      function puedeAsignar(pid) {
        if (!turnoFecha || modulosTurno <= 0) return true
        const modsDia = modsDiaSnap[pid] || 0
        return modsDia + modulosTurno <= MAX_MODULOS_DIA
      }

      const turnosDeAgente={};for(const[,estr]of Object.entries(estrFresca))for(const e of estr)turnosDeAgente[e.agente_id]=(turnosDeAgente[e.agente_id]||0)+1
      const disponibles=postulantes.filter(p=>{
        const pid=p.agente_id||p.id
        const dispTurno=p.todos_los_turnos||(p.turnos_ids||[]).includes(turnoId)
        return!yaEnEsteTurno.has(pid)&&!p.vetado&&(p.penalizaciones_activas||0)===0&&dispTurno&&puedeAsignar(pid)
      })
      const bloqueadosLimite=postulantes.filter(p=>{
        const pid=p.agente_id||p.id
        const dispTurno=p.todos_los_turnos||(p.turnos_ids||[]).includes(turnoId)
        return!yaEnEsteTurno.has(pid)&&!p.vetado&&(p.penalizaciones_activas||0)===0&&dispTurno&&!puedeAsignar(pid)
      }).length

      function scorear(lista){return lista.map(p=>({...p,_pid:p.agente_id||p.id,_ts:turnosDeAgente[p.agente_id||p.id]||0,_m:p.modulos_mes||0})).sort((a,b)=>a._ts!==b._ts?a._ts-b._ts:a._m-b._m)}
      const usados=new Set(); let asignados=0; const detalle=[]
      for(const slot of slots){
        const candidatos=scorear(disponibles.filter(p=>!usados.has(p.agente_id||p.id)&&slot.match.includes(p.rol_solicitado)))
        const tomar=candidatos.slice(0,slot.faltan); let slotAsignados=0
        for(const c of tomar){try{await api.post('/api/servicios-adicionales/'+servicioId+'/turnos/'+turnoId+'/estructura',{agente_id:c._pid,rol:mapearRol(c.rol_solicitado),jefe_id:null,origen:'scoring',tipo_convocatoria:'adicional'});asignados++;slotAsignados++;usados.add(c._pid);yaEnEsteTurno.add(c._pid);if(turnoFecha&&modulosTurno>0)modsDiaSnap[c._pid]=(modsDiaSnap[c._pid]||0)+modulosTurno}catch(e){console.error(e.message)}}
        detalle.push({rol:slot.rolAsignar,solicitados:slot.faltan,asignados:slotAsignados})
      }
      const sinPool=Math.max(0,totalFaltan-asignados-bloqueadosLimite)
      await recargarTodos()
      setAutoResultado({asignados,faltantes:Math.max(0,totalFaltan-asignados),detalle,bloqueadosLimite,sinPool})
    }catch(e){console.error(e)}finally{setAutoAsignando(false)}
  },[servicioId,postulantes,fetchEstructuraFresca,recargarTodos,modulosDia])

  const quitar=useCallback(async(nodoId)=>{const tid=Object.entries(estructuraPorTurno).find(([,estr])=>estr.some(e=>e.id===nodoId))?.[0];if(!tid)return;try{await api.delete('/api/servicios-adicionales/'+servicioId+'/turnos/'+tid+'/estructura/'+nodoId);await recargarTurno(tid)}catch(e){console.error(e.message)}},[estructuraPorTurno,servicioId,recargarTurno])
  const cambiarRol=useCallback(async(nodoId,nuevoRol)=>{const tid=Object.entries(estructuraPorTurno).find(([,estr])=>estr.some(e=>e.id===nodoId))?.[0];if(!tid)return;try{await api.patch('/api/servicios-adicionales/'+servicioId+'/turnos/'+tid+'/estructura/'+nodoId,{rol:nuevoRol});await recargarTurno(tid)}catch(e){console.error(e.message)}},[estructuraPorTurno,servicioId,recargarTurno])
  const toggleSelect=useCallback(pid=>{setSelected(prev=>{const n=new Set(prev);n.has(pid)?n.delete(pid):n.add(pid);return n})},[])

  const filtrados=useMemo(()=>{
    const q=busqueda.toLowerCase()
    let list=q?postulantes.filter(p=>(p.nombre_completo||'').toLowerCase().includes(q)||(p.legajo||'').includes(q)):postulantes
    if(turnoFiltro)list=list.filter(p=>p.todos_los_turnos||(p.turnos_ids||[]).includes(turnoFiltro))
    const asig=new Set(); for(const estr of Object.values(estructuraPorTurno))for(const e of estr)asig.add(e.agente_id)
    return[...list].sort((a,b)=>{
      if(a.vetado!==b.vetado)return a.vetado?1:-1
      return(asig.has(a.agente_id||a.id)?1:0)-(asig.has(b.agente_id||b.id)?1:0)
    })
  },[postulantes,busqueda,estructuraPorTurno,turnoFiltro])

  const selectAll=useCallback(()=>{const ids=filtrados.map(p=>p.agente_id||p.id);setSelected(prev=>{const n=new Set(prev);ids.every(id=>n.has(id))?ids.forEach(id=>n.delete(id)):ids.forEach(id=>n.add(id));return n})},[filtrados])
  const asignadoEn=useMemo(()=>{const m={};for(const[,estr]of Object.entries(estructuraPorTurno))for(const e of estr)m[e.agente_id]=(m[e.agente_id]||0)+1;return m},[estructuraPorTurno])

  // Disponibles por turno (respeta límite diario)
  const disponiblesPerTurno=useMemo(()=>{
    const result={}
    for(const turno of turnos){
      const yaEnTurno=new Set((estructuraPorTurno[turno.id]||[]).map(e=>e.agente_id))
      const fecha=turno.fecha?String(turno.fecha).slice(0,10):null
      const modulosTurno=turno.modulos||0
      result[turno.id]=postulantes.filter(p=>{
        const pid=p.agente_id||p.id
        if(yaEnTurno.has(pid))return false
        if(p.vetado)return false
        if((p.penalizaciones_activas||0)>0)return false
        const dispTurno=p.todos_los_turnos||(p.turnos_ids||[]).includes(turno.id)
        if(!dispTurno)return false
        if(fecha&&modulosTurno>0){const modsDia=(modulosDia[fecha]?.[pid]||0);if(modsDia+modulosTurno>MAX_MODULOS_DIA)return false}
        return true
      }).length
    }
    return result
  },[turnos,estructuraPorTurno,postulantes,modulosDia])

  // Resumen pool
  const totalVacantes=useMemo(()=>turnos.reduce((s,t)=>s+(t.dotacion_agentes||0)+(t.dotacion_supervisores||0)+(t.dotacion_choferes||0)+(t.dotacion_choferes_gruas||0)+(t.dotacion_motorizados||0)+(t.dotacion_coordinadores||0),0),[turnos])
  const totalAsignadosGlobal=useMemo(()=>Object.values(estructuraPorTurno).reduce((s,e)=>s+e.length,0),[estructuraPorTurno])
  const capacidadPool=useMemo(()=>Object.values(disponiblesPerTurno).reduce((s,n)=>s+n,0),[disponiblesPerTurno])

  // Agentes que superan el límite diario dentro de este servicio (intra-SSAA, sin depender de fecha)
  const agentesConExceso=useMemo(()=>{
    const modsPorFecha={}
    for(const t of turnos){
      const fecha=t.fecha?String(t.fecha).slice(0,10):'_'
      const mods=t.modulos||1
      for(const e of (estructuraPorTurno[t.id]||[])){
        if(!modsPorFecha[e.agente_id])modsPorFecha[e.agente_id]={}
        modsPorFecha[e.agente_id][fecha]=(modsPorFecha[e.agente_id][fecha]||0)+mods
      }
    }
    const result=new Set()
    for(const[agente_id,fechas]of Object.entries(modsPorFecha))
      if(Object.values(fechas).some(m=>m>MAX_MODULOS_DIA))result.add(agente_id)
    return result
  },[turnos,estructuraPorTurno])
  const vacantesRestantes=totalVacantes-totalAsignadosGlobal
  const poolInsuficiente=vacantesRestantes>0&&capacidadPool<vacantesRestantes

  // Límite diario para postulante en turno filtrado
  const turnoFiltradoObj=useMemo(()=>turnos.find(t=>t.id===turnoFiltro),[turnos,turnoFiltro])
  function tieneLimiteDiario(p) {
    if(!turnoFiltradoObj||!turnoFiltradoObj.fecha)return false
    const pid=p.agente_id||p.id
    const fecha=String(turnoFiltradoObj.fecha).slice(0,10)
    const modsDia=modulosDia[fecha]?.[pid]||0
    return modsDia+(turnoFiltradoObj.modulos||0)>MAX_MODULOS_DIA
  }

  if(cargando)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#aeaeb2',fontSize:14}}>Cargando...</div>
  if(!turnos.length)return(<div style={{padding:44,textAlign:'center',color:'#aeaeb2'}}><div style={{fontSize:28,marginBottom:8}}>&#128337;</div><div style={{fontSize:14,fontWeight:600,color:'#1d1d1f'}}>Primero defini los turnos</div><div style={{fontSize:12,color:'#aeaeb2',marginTop:4}}>Anda a la pestana "Turnos" para crear los horarios del servicio</div></div>)
  const todosSelFiltrados=filtrados.length>0&&filtrados.every(p=>selected.has(p.agente_id||p.id))

  return(
    <div style={{display:'flex',height:'100%',overflow:'hidden',background:'#f5f5f7'}}>
      {/* Panel postulantes */}
      <div style={{width:300,flexShrink:0,display:'flex',flexDirection:'column',background:'#fff',borderRight:'0.5px solid #e5e5ea',overflow:'hidden'}}>
        <div style={{padding:'14px 14px 10px',borderBottom:'0.5px solid #f0f0f5',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:14,fontWeight:600,color:'#1a2744'}}>Postulantes</span>
            <span style={{fontSize:11,color:'#aeaeb2'}}>{filtrados.length}</span>
          </div>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o legajo..." style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'0.5px solid #e5e5ea',fontSize:12,outline:'none',background:'#f9f9fb',color:'#1d1d1f',boxSizing:'border-box',marginBottom:6}}/>
          <select value={turnoFiltro} onChange={e=>{setTurnoFiltro(e.target.value);setSelected(new Set())}} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'0.5px solid #e5e5ea',fontSize:11,background:'#f9f9fb',color:turnoFiltro?'#185fa5':'#8e8e93',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}>
            <option value="">Todos los postulantes</option>
            {turnos.map((t,i)=><option key={t.id} value={t.id}>{t.nombre||('Turno '+(i+1))}{t.hora_inicio?' · '+String(t.hora_inicio).slice(0,5)+'hs':''}</option>)}
          </select>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
            <div onClick={selectAll} style={{width:16,height:16,borderRadius:4,flexShrink:0,cursor:'pointer',border:todosSelFiltrados?'1.5px solid #185FA5':'1.5px solid #d1d1d6',background:todosSelFiltrados?'#185FA5':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{todosSelFiltrados&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div>
            <span style={{fontSize:11,color:'#8e8e93',flex:1}}>{selected.size>0?selected.size+' seleccionado'+(selected.size>1?'s':''):'Seleccionar todos'}</span>
          </div>
          {selected.size>0&&(<div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>{turnos.map((t,i)=>(<button key={t.id} onClick={()=>handleAsignar(t.id)} style={{flex:1,padding:'6px 4px',borderRadius:8,border:'0.5px solid #B5D4F4',background:'#E6F1FB',color:'#185FA5',fontSize:11,fontWeight:600,cursor:'pointer',minWidth:0}} onMouseEnter={e=>{e.currentTarget.style.background='#B5D4F4'}} onMouseLeave={e=>{e.currentTarget.style.background='#E6F1FB'}}>{t.nombre||('T'+(i+1))}</button>))}</div>)}
          <div style={{display:'flex',gap:10,marginTop:8}}>{[{color:'#0F6E56',label:'Alta'},{color:'#BA7517',label:'Media'},{color:'#A32D2D',label:'Baja'}].map(l=>(<div key={l.label} style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:6,height:6,borderRadius:'50%',background:l.color}}/><span style={{fontSize:10,color:'#8e8e93'}}>{l.label}</span></div>))}</div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'4px 4px'}}>
          {filtrados.length===0?<div style={{textAlign:'center',padding:24,color:'#c7c7cc',fontSize:12}}>{busqueda?'Sin resultados':'Sin postulantes'}</div>
          :filtrados.map(p=>{const pid=p.agente_id||p.id;return<PostulanteRow key={pid} p={p} selected={selected.has(pid)} turnosAsignado={asignadoEn[pid]||0} onClick={()=>toggleSelect(pid)} limiteDiario={tieneLimiteDiario(p)}/>})}
        </div>
      </div>

      {/* Panel turnos */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'10px 16px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <span style={{fontSize:12,color:'#8e8e93'}}>Selecciona postulantes y usa los botones para asignarlos · Click en un chip para cambiar rol</span>
          {/* Banner resumen pool */}
          {totalVacantes>0&&(
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:poolInsuficiente?'#FFF4E5':'#F0FAF5',border:`1px solid ${poolInsuficiente?'#EFC973':'#6FCF97'}`,flexShrink:0}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:poolInsuficiente?'#BA7517':'#0F6E56'}}/>
              <span style={{fontSize:11,fontWeight:600,color:poolInsuficiente?'#BA7517':'#0F6E56'}}>
                {capacidadPool} asignaciones posibles · {vacantesRestantes} vacante{vacantesRestantes!==1?'s':''} restante{vacantesRestantes!==1?'s':''}
              </span>
              {poolInsuficiente&&<span style={{fontSize:10,color:'#BA7517'}}>— pool insuficiente</span>}
            </div>
          )}
        </div>
        <div style={{flex:1,display:'flex',gap:12,padding:'0 16px 16px',overflow:'auto',alignItems:'flex-start'}}>
          {turnos.map(t=><TurnoColumna key={t.id} turno={t} estructura={estructuraPorTurno[t.id]||[]} onQuitar={quitar} onCambiarRol={cambiarRol} onAutoAsignar={autoAsignar} autoAsignando={autoAsignando} disponibles={disponiblesPerTurno[t.id]??postulantes.length} modulosDia={modulosDia} agentesConExceso={agentesConExceso}/>)}
        </div>
      </div>

      {confirmForzar&&<ModalForzar postulante={confirmForzar.primerBajo} onConfirm={()=>{asignarAturno(confirmForzar.turnoId,confirmForzar.postulantes,true);setConfirmForzar(null)}} onCancel={()=>setConfirmForzar(null)}/>}
      <ModalAutoResultado resultado={autoResultado} onClose={()=>setAutoResultado(null)}/>
    </div>
  )
}
