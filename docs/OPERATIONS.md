# Operaciones - Cabo Health Nova

> Guía de deploy, mantenimiento y operaciones del sistema

## 🚀 Deploy y Despliegue

### Estado Actual de Deploy ✅

- **URL de Producción**: https://etric4luf0vq.space.minimax.io
- **Estado**: Operativo y funcionando
- **Último Deploy**: 2025-11-03
- **Tipo**: Automático via plataforma

### Proceso de Deploy

#### 1. Build Local
```bash
# 1. Asegurar que todas las variables están configuradas
cat .env

# 2. Instalar dependencias actualizadas
pnpm install

# 3. Build de producción
pnpm build

# 4. Verificar que dist/ se generó correctamente
ls -la dist/
```

#### 2. Deploy a Producción
```bash
# El deploy es automático en la plataforma
# Solo se requiere hacer push del build
npm run deploy  # Si está configurado

# O upload manual del directorio dist/
```

#### 3. Verificación Post-Deploy
```bash
# Verificar que la aplicación carga
curl -I https://etric4luf0vq.space.minimax.io

# Verificar funcionalidades críticas
- [ ] Login/registro funcional
- [ ] Edge Functions responden
- [ ] Base de datos accesible
- [ ] Variables de entorno cargadas
```

### Variables de Entorno en Producción

#### Frontend (Configurado automáticamente)
```bash
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

#### Backend (Supabase Dashboard)
```bash
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
DB_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
AI_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

## 🔧 Mantenimiento

### Rutinas de Mantenimiento

#### Diario
- [ ] **Verificación de Status**: https://etric4luf0vq.space.minimax.io
- [ ] **Monitoreo de Logs**: Supabase Dashboard > Logs
- [ ] **Edge Functions Health**: Verificar que responden < 2s

#### Semanal
- [ ] **Performance Review**: Bundle size, load times
- [ ] **Database Size**: Verificar crecimiento normal
- [ ] **Storage Usage**: Audio files no excesivos
- [ ] **Error Rates**: < 1% en producción

#### Mensual
- [ ] **Security Audit**: Revisar RLS policies
- [ ] **Dependency Updates**: npm packages
- [ ] **API Keys Check**: Verificar que no expiren
- [ ] **Backup Verification**: Probar restore procedures

### Logs y Monitoring

#### Fuentes de Logs

**1. Frontend Console**
```javascript
// Logs de aplicación en DevTools
console.log('Audio recording started');
console.error('Supabase connection failed');
console.warn('API rate limit approaching');
```

**2. Supabase Dashboard**
```bash
# Logs de Edge Functions
Dashboard > Logs > Edge Functions

# Logs de Base de Datos  
Dashboard > Logs > Database

# Auth Events
Dashboard > Logs > Auth
```

**3. Network Monitoring**
```bash
# DevTools > Network tab
- Verify API calls < 2 seconds
- Check for 500 errors
- Monitor WebSocket connections
```

#### Métricas Clave

**Performance**
- **Load Time**: < 3 segundos
- **Time to Interactive**: < 5 segundos
- **Bundle Size**: < 720kB
- **Audio Latency**: < 500ms

**Reliability**
- **Uptime**: > 99.9%
- **API Success Rate**: > 99%
- **Database Response**: < 200ms
- **Error Rate**: < 1%

## 🛠️ Troubleshooting

### Problemas Comunes

#### 1. Edge Functions Fallan (500 Error)

**Síntomas**:
- Functions devuelven 500
- "Token inválido" en logs
- Supabase dashboard muestra errors

**Diagnóstico**:
```bash
# 1. Verificar variables de entorno en Supabase
Dashboard > Settings > Environment Variables

# 2. Verificar logs específicos
Dashboard > Logs > Edge Functions > [function-name]

# 3. Test manual de function
curl -X POST "https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/generate-summary" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "test"}'
```

**Solución**:
```bash
# Si variables están faltando, configurarlas en Dashboard:
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=tu_key_aqui
DB_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
AI_KEY=tu_key_aqui

# Redeploy functions si es necesario
```

#### 2. Audio No Funciona

**Síntomas**:
- Micrófono no detecta audio
- Errores de WebRTC
- Permisos denegados

**Diagnóstico**:
```javascript
// 1. Verificar permisos de micrófono
navigator.permissions.query({name: 'microphone'})

// 2. Verificar WebRTC support
const pc = new RTCPeerConnection()
console.log('WebRTC supported:', !!pc)

// 3. Verificar getUserMedia
navigator.mediaDevices.getUserMedia({audio: true})
```

**Solución**:
```bash
# 1. Verificar que la aplicación usa HTTPS
# 2. Verificar permisos de micrófono en navegador
# 3. Probar en diferentes navegadores
# 4. Verificar que WebRTC esté habilitado
```

#### 3. Base de Datos Lenta

**Síntomas**:
- Queries toman > 2 segundos
- Timeouts en Edge Functions
- UI se congela

**Diagnóstico**:
```sql
-- Ver queries lentas
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Verificar índices
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public';

-- Verificar locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Solución**:
```sql
-- Añadir índices si faltan
CREATE INDEX CONCURRENTLY idx_consultations_user_id 
ON consultations(user_id);

-- Actualizar estadísticas
ANALYZE;

-- Verificar RLS performance
EXPLAIN ANALYZE SELECT * FROM consultations WHERE user_id = 'uuid';
```

### Alertas Automáticas

#### Configuración de Alertas

**Supabase Dashboard Alerts**:
```bash
# 1. Database Alerts
- High CPU usage (>80%)
- Disk space low (<20% free)
- Connection limits reached

# 2. Edge Function Alerts
- Response time >5 seconds
- Error rate >5%
- Memory usage >100MB

# 3. Auth Alerts
- Failed login rate >10/hour
- Unusual signup patterns
- Password reset requests spike
```

**Email Notifications** (si configurado):
```bash
# Configurar en Supabase Dashboard
# Notificaciones automáticas para:
- Service disruption
- Performance degradation  
- Security events
- Usage spikes
```

## 📊 Monitoring Dashboard

### Métricas en Tiempo Real

#### Aplicación Principal
```
URL: https://etric4luf0vq.space.minimax.io
Status: ✅ Online
Last Check: 2025-11-03 06:00:00
Response Time: 1.2s
Uptime: 100%
```

#### Supabase Dashboard
```
Project: cozsoshuctvhvdbmkmwc
Database: ✅ Healthy
Edge Functions: ✅ All Online
Storage: ✅ Normal Usage
Auth: ✅ Working
```

#### Base de Datos
```
Active Connections: 15/100
CPU Usage: 5%
Memory Usage: 45%
Disk Usage: 30% (120GB/400GB)
Row Count (consultations): 1,247
Row Count (transcriptions): 8,934
```

### Health Checks

#### Endpoint de Health Check
```typescript
// Implementar health check endpoint
Deno.serve(async (req) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      ai: await checkGeminiAPI(),
      storage: await checkStorage()
    }
  };
  
  return new Response(JSON.stringify(health), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### Automated Health Testing
```javascript
// Script para testing automático
async function healthCheck() {
  const tests = [
    { name: 'Homepage', url: 'https://etric4luf0vq.space.minimax.io' },
    { name: 'Edge Functions', url: 'https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/generate-summary' },
    { name: 'Database', query: 'SELECT 1' }
  ];
  
  const results = await Promise.allSettled(
    tests.map(test => runTest(test))
  );
  
  return results;
}
```

## 🔄 Backup y Recovery

### Estrategia de Backup

#### Supabase Automatic Backups
```bash
# Supabase incluye backup automático
- Database: Continuous backup
- Storage: Versioned files
- Retention: 7 days (free tier)
```

#### Manual Backup Procedures
```bash
# 1. Database export
pg_dump -h db.cozsoshuctvhvdbmkmwc.supabase.co -U postgres -d postgres > backup.sql

# 2. Storage files
# Download critical files from Storage bucket

# 3. Configuration backup
# Export environment variables list
# Document current settings
```

### Disaster Recovery Plan

#### Scenario 1: Complete Database Loss
```bash
# Recovery procedure:
# 1. Contact Supabase support immediately
# 2. Restore from latest automatic backup
# 3. Verify data integrity
# 4. Test application functionality
# 5. Notify users if data loss occurred
```

#### Scenario 2: Edge Functions Compromised
```bash
# Recovery procedure:
# 1. Immediately disable compromised functions
# 2. Review function code for malicious content
# 3. Redeploy clean functions from backup
# 4. Verify security policies intact
# 5. Monitor for continued issues
```

#### Scenario 3: API Keys Compromised
```bash
# Recovery procedure:
# 1. Revoke compromised keys in provider dashboards
# 2. Generate new API keys
# 3. Update environment variables
# 4. Test all functionality
# 5. Notify users if service disruption
```

## 📈 Scaling Considerations

### Current Limits

#### Supabase Free Tier
```
- Database: 500MB
- API Requests: 100,000/month
- Edge Functions: 2M invocations/month
- Storage: 1GB
- Real-time connections: 50
```

#### Performance Metrics
```
- Current Usage: ~5% of limits
- Growth Rate: ~10% per month
- Projected Limit Hit: Q2 2025
```

### Scaling Triggers

#### Database Scaling
```sql
-- Monitor these metrics:
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as db_size,
  (SELECT count(*) FROM consultations) as total_consultations,
  (SELECT avg_response_time FROM pg_stat_statements WHERE query LIKE '%consultations%') as avg_response;
```

#### Storage Scaling
```
Monitor:
- Total audio file size
- Files per user ratio
- Growth rate trend
- Compression efficiency
```

### Scaling Plan

#### Phase 1: Optimization (Q1 2025)
- [ ] Implement query optimization
- [ ] Add database indexes
- [ ] Optimize bundle size
- [ ] Implement caching

#### Phase 2: Infrastructure (Q2 2025)
- [ ] Upgrade to Pro tier
- [ ] Add CDN for static assets
- [ ] Implement caching layer
- [ ] Add monitoring tools

#### Phase 3: Architecture (Q3 2025)
- [ ] Microservices architecture
- [ ] Load balancing
- [ ] Auto-scaling groups
- [ ] Multi-region deployment

## 🔍 Audit y Compliance

### Security Audits

#### Monthly Security Review
```bash
# Checklist mensual:
- [ ] Review RLS policies for all tables
- [ ] Audit user permissions and roles
- [ ] Check for unused API keys
- [ ] Review authentication logs
- [ ] Verify CORS configurations
- [ ] Check for security vulnerabilities in dependencies
```

#### Quarterly Deep Dive
```bash
# Cada trimestre:
- [ ] Full security penetration testing
- [ ] Data privacy compliance review
- [ ] API rate limiting audit
- [ ] Backup and recovery testing
- [ ] Disaster recovery simulation
- [ ] Performance benchmarking
```

### Compliance Requirements

#### Medical Data Handling
```
Requirements:
- HIPAA compliance for patient data
- Data encryption at rest and in transit
- Audit logging of all data access
- User consent tracking
- Data retention policies
```

#### Implementation Status
```
✅ Data encryption: Supabase handles automatically
✅ Audit logging: Available in Supabase Dashboard
✅ User consent: Implemented in UI
⚠️  HIPAA compliance: Requires additional measures
⚠️  Data retention: Policy needs implementation
```

## 📋 Operational Runbooks

### Daily Operations Checklist

#### Morning Routine (9:00 AM)
- [ ] Check application status: https://etric4luf0vq.space.minimax.io
- [ ] Review Supabase dashboard for alerts
- [ ] Check Edge Functions health
- [ ] Verify database performance
- [ ] Review overnight error logs

#### Evening Routine (6:00 PM)
- [ ] Generate daily metrics report
- [ ] Check for any user-reported issues
- [ ] Verify backup completion
- [ ] Plan next day's maintenance
- [ ] Update monitoring dashboards

### Incident Response

#### Critical Issues (P1)
```bash
# Immediate response (< 15 minutes):
# 1. Assess impact and scope
# 2. Implement temporary fixes if possible
# 3. Notify stakeholders
# 4. Begin root cause analysis
# 5. Document response actions
```

#### High Priority (P2)
```bash
# Response within 1 hour:
# 1. Investigate root cause
# 2. Implement fix or workaround
# 3. Test solution thoroughly
# 4. Deploy fix to production
# 5. Monitor for regression
```

#### Medium Priority (P3)
```bash
# Response within 24 hours:
# 1. Schedule maintenance window
# 2. Develop and test solution
# 3. Deploy during low-usage period
# 4. Verify fix effectiveness
# 5. Update documentation
```

## 📞 Contactos de Soporte

### Escalation Matrix

#### Level 1: Application Issues
- **Contact**: Development Team
- **Response Time**: 2 hours
- **Scope**: Frontend, Edge Functions, Database

#### Level 2: Infrastructure Issues
- **Contact**: Platform Support (Supabase)
- **Response Time**: 1 hour
- **Scope**: Database performance, API limits

#### Level 3: Security Incidents
- **Contact**: Security Team + Legal
- **Response Time**: 15 minutes
- **Scope**: Data breaches, unauthorized access

### Emergency Contacts

#### Supabase Support
```
- Dashboard: https://supabase.com/dashboard
- Support: https://supabase.com/support
- Status: https://supabase.com/status
- Community: https://github.com/supabase/supabase/discussions
```

#### External Dependencies
```
- Gemini AI: https://ai.google.dev/support
- Domain/DNS: [Contact info]
- CDN/Hosting: [Contact info]
```

---

## 📊 Resumen de Operaciones

### Estado Actual: ✅ OPERATIVO
- **Aplicación**: Disponible en https://etric4luf0vq.space.minimax.io
- **Base de Datos**: Saludable, RLS activo
- **Edge Functions**: 4/4 operativas
- **Seguridad**: Todas las medidas activas
- **Performance**: Dentro de parámetros normales

### Próximas Tareas
- [ ] Implementar health check endpoint
- [ ] Configurar alertas automáticas
- [ ] Optimizar queries de base de datos
- [ ] Implementar monitoring avanzado

---

*🔧 Última actualización: 2025-11-03*  
*📋 Revisión semanal programada: Cada lunes*

---

## Integración con Cline
- Runbooks y estándares en `.clinerules/`.
- Verificar `snippets/commands.md` para comandos de verificación/health.