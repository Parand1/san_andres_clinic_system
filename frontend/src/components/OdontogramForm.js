import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider
} from '@mui/material';
import { useAuth } from '../AuthContext';

// Íconos para las herramientas
import CircleIcon from '@mui/icons-material/Circle';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// --- CONFIGURACIÓN DEL ODONTOGRAMA ---

const TOOLS = {
  CARIES: { id: 'caries', label: 'Caries (Rojo)', color: '#d32f2f', icon: <CircleIcon sx={{ color: '#d32f2f' }} /> },
  RESTAURACION: { id: 'restauracion', label: 'Restauración (Azul)', color: '#1976d2', icon: <CircleIcon sx={{ color: '#1976d2' }} /> },
  SELLANTE: { id: 'sellante', label: 'Sellante', color: '#388e3c', icon: <VerifiedIcon sx={{ color: '#388e3c' }} /> },
  AUSENTE: { id: 'ausente', label: 'Diente Ausente/Extracción', color: '#9e9e9e', icon: <CloseIcon /> },
  BORRAR: { id: 'borrar', label: 'Limpiar Superficie', color: 'inherit', icon: <DeleteOutlineIcon /> },
};

// Definición de Cuadrantes y Dientes (FDI)
const QUADRANTS = {
  Q1: [18, 17, 16, 15, 14, 13, 12, 11], // Superior Derecho
  Q2: [21, 22, 23, 24, 25, 26, 27, 28], // Superior Izquierdo
  Q3: [48, 47, 46, 45, 44, 43, 42, 41], // Inferior Derecho (Orden invertido visualmente)
  Q4: [31, 32, 33, 34, 35, 36, 37, 38], // Inferior Izquierdo
  // Temporales
  Q5: [55, 54, 53, 52, 51],
  Q6: [61, 62, 63, 64, 65],
  Q7: [85, 84, 83, 82, 81],
  Q8: [71, 72, 73, 74, 75],
};

// --- COMPONENTE VISUAL DE UN DIENTE (SVG) ---
const ToothGraphic = ({ toothNumber, data, onSurfaceClick }) => {
  // Lógica para determinar colores de superficies
  const getSurfaceColor = (surface) => {
    if (data.estado_general === 'ausente') return '#eeeeee'; // Diente completo gris si ausente
    const conditions = data.condiciones_superficies?.[surface] || [];
    
    if (conditions.includes('caries')) return '#ef5350'; // Rojo claro
    if (conditions.includes('restauracion')) return '#42a5f5'; // Azul claro
    if (conditions.includes('sellante')) return '#66bb6a'; // Verde claro
    return '#ffffff'; // Blanco por defecto
  };

  // Overlay para diente ausente (X grande)
  const isAbsent = data.estado_general === 'ausente';

  // Definición geométrica básica (0,0 a 100,100)
  const polyOcclusal = "35,35 65,35 65,65 35,65";
  const polyVestibular = "0,0 100,0 65,35 35,35"; // Arriba
  const polyLingual = "35,65 65,65 100,100 0,100"; // Abajo
  const polyMesial = "0,0 35,35 35,65 0,100"; // Izquierda
  const polyDistal = "100,0 100,100 65,65 65,35"; // Derecha
  
  const isUpper = [1, 2, 5, 6].some(q => Math.floor(toothNumber / 10) === q);
  const isRightSide = [1, 5, 4, 8].some(q => Math.floor(toothNumber / 10) === q); 

  // Asignación de caras basada en posición
  const mapPosToSurface = (pos) => {
      if (pos === 'center') return 'occlusal';
      if (pos === 'top') return isUpper ? 'vestibular' : 'lingual';
      if (pos === 'bottom') return isUpper ? 'palatino' : 'vestibular';
      if (pos === 'left') return isRightSide ? 'distal' : 'mesial'; 
      if (pos === 'right') return isRightSide ? 'mesial' : 'distal'; 
      return '';
  };

  const handleClick = (pos) => {
      const surface = mapPosToSurface(pos);
      onSurfaceClick(toothNumber, surface);
  };

  return (
    <Box sx={{ position: 'relative', width: 50, height: 65, m: 0.5, textAlign: 'center' }}>
      {/* Número del diente */}
      <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#555' }}>
          {toothNumber}
      </Typography>
      
      {/* SVG Interactivo */}
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.1))' }}>
        {/* Top */}
        <polygon 
            points={polyVestibular} 
            fill={getSurfaceColor(mapPosToSurface('top'))} 
            stroke="#757575" strokeWidth="1"
            onClick={() => handleClick('top')}
            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
        />
        {/* Bottom */}
        <polygon 
            points={polyLingual} 
            fill={getSurfaceColor(mapPosToSurface('bottom'))} 
            stroke="#757575" strokeWidth="1"
            onClick={() => handleClick('bottom')}
            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
        />
        {/* Left */}
        <polygon 
            points={polyMesial} 
            fill={getSurfaceColor(mapPosToSurface('left'))} 
            stroke="#757575" strokeWidth="1"
            onClick={() => handleClick('left')}
            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
        />
        {/* Right */}
        <polygon 
            points={polyDistal} 
            fill={getSurfaceColor(mapPosToSurface('right'))} 
            stroke="#757575" strokeWidth="1"
            onClick={() => handleClick('right')}
            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
        />
        {/* Center */}
        <polygon 
            points={polyOcclusal} 
            fill={getSurfaceColor(mapPosToSurface('center'))} 
            stroke="#757575" strokeWidth="1"
            onClick={() => handleClick('center')}
            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
        />
        
        {/* Overlay de Ausente (X) */}
        {isAbsent && (
            <line x1="0" y1="0" x2="100" y2="100" stroke="#ef5350" strokeWidth="8" style={{ pointerEvents: 'none' }} />
        )}
        {isAbsent && (
            <line x1="100" y1="0" x2="0" y2="100" stroke="#ef5350" strokeWidth="8" style={{ pointerEvents: 'none' }} />
        )}
      </svg>
    </Box>
  );
};

// --- COMPONENTE PRINCIPAL ---

function OdontogramForm({ attentionId, patientId, readOnly = false }, ref) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState('caries'); // Herramienta seleccionada por defecto
  const [dientes, setDientes] = useState([]);
  const [observaciones, setObservaciones] = useState('');

  // Inicializar estructura de dientes vacía
  const initTeeth = () => {
      const allTeethNumbers = [
          ...QUADRANTS.Q1, ...QUADRANTS.Q2, ...QUADRANTS.Q3, ...QUADRANTS.Q4,
          ...QUADRANTS.Q5, ...QUADRANTS.Q6, ...QUADRANTS.Q7, ...QUADRANTS.Q8
      ];
      return allTeethNumbers.map(num => ({
          numero: num.toString(),
          tipo: num < 50 ? 'permanente' : 'deciduo',
          estado_general: 'sano',
          condiciones_superficies: {},
          observaciones_diente: ''
      }));
  };

  useEffect(() => {
      // Cargar datos existentes
      const loadData = async () => {
          setLoading(true);
          try {
              let dataToLoad = null;
              let source = 'init'; // init, specific, latest

              // 1. Intentar cargar odontograma específico de la atención (Modo Edición/Lectura)
              if (attentionId) {
                  const res = await fetch(`/api/odontogram/${attentionId}`, {
                      headers: { Authorization: `Bearer ${token}` }
                  });
                  if (res.ok) {
                      dataToLoad = await res.json();
                      source = 'specific';
                  }
              }

              // 2. Si no hay específico y tenemos paciente, cargar el ÚLTIMO del historial (Modo Continuidad)
              if (!dataToLoad && patientId && !readOnly) {
                  const res = await fetch(`/api/odontogram/patient/${patientId}/latest`, {
                      headers: { Authorization: `Bearer ${token}` }
                  });
                  if (res.ok) {
                      dataToLoad = await res.json();
                      source = 'latest';
                  }
              }

              if (dataToLoad) {
                  if (source === 'specific') {
                      setObservaciones(dataToLoad.observaciones_generales || '');
                  } else {
                      setObservaciones(''); 
                  }

                  const base = initTeeth();
                  const merged = base.map(b => {
                      const existing = dataToLoad.dientes ? dataToLoad.dientes.find(d => d.numero_diente === b.numero) : null;
                      if (existing) {
                          return {
                              ...b,
                              estado_general: existing.estado_general,
                              condiciones_superficies: existing.condiciones_superficies || {},
                              observaciones_diente: source === 'specific' ? existing.observaciones_diente : ''
                          };
                      }
                      return b;
                  });
                  setDientes(merged);
              } else {
                  setDientes(initTeeth());
              }
          } catch (e) {
              console.error(e);
              setDientes(initTeeth());
          } finally {
              setLoading(false);
          }
      };
      loadData();
  }, [attentionId, patientId, token, readOnly]);

  // Lógica central de interacción
  const handleSurfaceInteraction = (toothNum, surface) => {
      if (readOnly) return;

      setDientes(prev => prev.map(d => {
          if (d.numero !== toothNum.toString()) return d;

          const newDiente = { ...d };
          
          if (activeTool === 'ausente') {
              newDiente.estado_general = newDiente.estado_general === 'ausente' ? 'sano' : 'ausente';
              if (newDiente.estado_general === 'ausente') newDiente.condiciones_superficies = {};
          } 
          else if (activeTool === 'borrar') {
              const newConds = { ...newDiente.condiciones_superficies };
              delete newConds[surface];
              newDiente.condiciones_superficies = newConds;
              newDiente.estado_general = 'sano'; 
          }
          else {
              const newConds = { ...newDiente.condiciones_superficies };
              newConds[surface] = [activeTool]; 
              newDiente.condiciones_superficies = newConds;
              if (newDiente.estado_general === 'ausente') newDiente.estado_general = 'sano';
          }

          return newDiente;
      }));
  };

  // Exponer método save al padre
  useImperativeHandle(ref, () => ({
      save: async (currentAttentionId) => {
          const dientesModificados = dientes.filter(d => {
              const tieneEstado = d.estado_general && d.estado_general.toLowerCase() !== 'sano';
              const tieneSuperficies = d.condiciones_superficies && Object.keys(d.condiciones_superficies).length > 0;
              const tieneObservacion = d.observaciones_diente && d.observaciones_diente.trim().length > 0;
              return tieneEstado || tieneSuperficies || tieneObservacion;
          });

          console.log('Guardando Odontograma. Dientes modificados:', dientesModificados.length);

          const payload = {
              atencion_id: currentAttentionId,
              observaciones_generales: observaciones,
              dientes: dientesModificados.map(d => ({
                  numero_diente: d.numero,
                  tipo_diente: d.tipo,
                  estado_general: d.estado_general,
                  condiciones_superficies: d.condiciones_superficies,
                  observaciones_diente: d.observaciones_diente
              }))
          };

          const response = await fetch('/api/odontogram', { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
              if (response.status === 405 || response.status === 409) {
                   const putRes = await fetch(`/api/odontogram/${currentAttentionId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify(payload)
                  });
                  if (!putRes.ok) throw new Error('Error al guardar odontograma');
                  return await putRes.json();
              }
              const errData = await response.json();
              throw new Error(errData.msg || 'Error al guardar');
          }
          return await response.json();
      }
  }), [dientes, observaciones, token]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ userSelect: 'none' }}>
        
        {/* BARRA DE HERRAMIENTAS */}
        <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" sx={{ mr: 2, fontWeight: 'bold' }}>HERRAMIENTAS:</Typography>
            <ToggleButtonGroup
                value={activeTool}
                exclusive
                onChange={(e, newTool) => { if (newTool) setActiveTool(newTool); }}
                aria-label="herramientas odontograma"
            >
                {Object.values(TOOLS).map((tool) => (
                    <ToggleButton key={tool.id} value={tool.id} sx={{ gap: 1, px: 2 }}>
                        {tool.icon}
                        <Typography variant="caption" fontWeight="bold">{tool.label}</Typography>
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Paper>

        {/* ODONTOGRAMA GRÁFICO */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: '#fff', overflowX: 'auto' }}>
            
            {/* DENTICIÓN PERMANENTE */}
            <Typography variant="overline" sx={{ display: 'block', textAlign: 'center', fontSize: '1rem', color: '#1565c0' }}>
                DENTICIÓN PERMANENTE
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* ARCO SUPERIOR (Q1 - Q2) */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
                {/* Q1 (Derecha Paciente -> Izquierda Pantalla) */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q1.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
                <Divider orientation="vertical" flexItem sx={{ borderRightWidth: 2, borderColor: '#000' }} />
                {/* Q2 */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q2.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
            </Box>

            {/* ARCO INFERIOR (Q4 - Q3) */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 6 }}>
                {/* Q4 (Derecha Paciente -> Izquierda Pantalla) */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q3.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
                <Divider orientation="vertical" flexItem sx={{ borderRightWidth: 2, borderColor: '#000' }} />
                {/* Q3 */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q4.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
            </Box>

            {/* DENTICIÓN TEMPORAL (DECIDUA) */}
            <Typography variant="overline" sx={{ display: 'block', textAlign: 'center', fontSize: '0.9rem', color: '#2e7d32', mt: 4 }}>
                DENTICIÓN TEMPORAL (NIÑOS)
            </Typography>
            <Divider sx={{ mb: 2 }} />

             <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
                {/* Q5 */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q5.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
                <Divider orientation="vertical" flexItem />
                {/* Q6 */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q6.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                {/* Q8 */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q7.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
                <Divider orientation="vertical" flexItem />
                {/* Q7 */}
                <Box sx={{ display: 'flex' }}>
                    {QUADRANTS.Q8.map(num => (
                        <ToothGraphic 
                            key={num} toothNumber={num} 
                            data={dientes.find(d => d.numero === num.toString()) || {}}
                            onSurfaceClick={handleSurfaceInteraction}
                        />
                    ))}
                </Box>
            </Box>

        </Paper>

    </Box>
  );
}

export default forwardRef(OdontogramForm);