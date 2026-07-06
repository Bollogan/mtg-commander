# 📋 DIRECTRICES TÉCNICAS PARA CLAUDE CODE — MÓDULO DE FOROS
## Red Social & Deckbuilder de Magic: The Gathering

> **Instrucción obligatoria:** Claude debe utilizar skills de diseño (CSS moderno, animaciones fluidas, componentes reutilizables) y **preguntar dudas mediante `askUserQuestion`** antes de implementar cualquier funcionalidad donde la especificación sea ambigua.

---

## 1. ARQUITECTURA GENERAL DEL MÓDULO DE FOROS

### 1.1 Estructura de Datos (Modelos/Entidades)

```typescript
// Entidad Forum
interface Forum {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage?: string;
  bannerImage?: string;
  category: ForumCategory; // GENERAL, DECK_DISCUSSION, RULES, TRADE, LORE, CUSTOM
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  isNSFW: boolean;
  isPrivate: boolean;
  isPendingApproval: boolean; // Para moderación automática
  moderationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  rejectionReason?: string;
  tags: string[];
  memberCount: number;
  weeklyActivityScore: number; // Métrica para recomendaciones
  totalThreads: number;
  totalPosts: number;
  lastActivityAt: Date;
  settings: ForumSettings;
}

// Entidad ForumRole (sistema tipo Discord)
interface ForumRole {
  id: string;
  forumId: string;
  name: string;
  color: string; // Hex color
  icon?: string;
  position: number; // Jerarquía
  permissions: ForumPermissions;
  isDefault: boolean; // Rol asignado automáticamente al unirse
  isAdmin: boolean;
  createdAt: Date;
}

interface ForumPermissions {
  // Permisos tipo booleano SI/NO
  canView: boolean;
  canPost: boolean;
  canCreateThread: boolean;
  canEditOwnContent: boolean;
  canDeleteOwnContent: boolean;
  canDeleteAnyContent: boolean; // Moderación
  canPinThreads: boolean;
  canLockThreads: boolean;
  canManageRoles: boolean;
  canBanUsers: boolean;
  canInviteUsers: boolean;
  canEditForumSettings: boolean;
  canViewAuditLog: boolean;
  canModerate: boolean; // Super-moderador
}

// Entidad ForumMembership
interface ForumMembership {
  id: string;
  forumId: string;
  userId: string;
  roleId: string;
  joinedAt: Date;
  isBanned: boolean;
  banReason?: string;
  banExpiresAt?: Date;
}

// Entidad ForumThread
interface ForumThread {
  id: string;
  forumId: string;
  authorId: string;
  title: string;
  slug: string;
  content: string; // Rich text / Markdown
  isPinned: boolean;
  isLocked: boolean;
  isAnnouncement: boolean;
  moderationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  moderationFlags: ModerationFlag[];
  viewCount: number;
  replyCount: number;
  lastReplyAt: Date;
  lastReplyBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Entidad ForumPost
interface ForumPost {
  id: string;
  threadId: string;
  forumId: string;
  authorId: string;
  content: string;
  parentPostId?: string; // Para respuestas anidadas
  isEdited: boolean;
  editedAt?: Date;
  moderationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  moderationFlags: ModerationFlag[];
  createdAt: Date;
}

// Entidad ModerationFlag
interface ModerationFlag {
  id: string;
  type: 'PROFANITY' | 'HARASSMENT' | 'SPAM' | 'WIZARDS_VIOLATION' | 'SLUR' | 'OTHER';
  confidence: number; // 0-1, score del detector
  detectedWords: string[];
  detectedLanguage: string;
  createdAt: Date;
}
```

### 1.2 Stack Tecnológico Recomendado

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | React 18+ / Next.js 14+ | SSR para SEO de foros públicos |
| **Estado** | Zustand + React Query | Cache inteligente de foros y threads |
| **Estilos** | Tailwind CSS + Framer Motion | Animaciones fluidas, diseño atómico |
| **Backend** | Node.js / NestJS o Python / FastAPI | API REST + WebSockets |
| **Base de Datos** | PostgreSQL + Redis | Relacional para datos, Redis para trending |
| **Búsqueda** | Elasticsearch o Meilisearch | Búsqueda full-text avanzada |
| **WebSockets** | Socket.io | Actualizaciones en tiempo real |
| **Moderación** | AWS Comprehend / Perspective API / Custom NLP | Detección multilingüe |
| **Almacenamiento** | AWS S3 / Cloudflare R2 | Imágenes de foros, banners |

---

## 2. PANTALLA PRINCIPAL DE FOROS — VISTA DE RECOMENDACIONES

### 2.1 Layout Innovador (Romper lo Establecido)

**Concepto visual:** *"El Planeswalker Explorando los Planos"*

En lugar de una lista vertical aburrida, implementar un **mosaico dinámico tipo "constelación de planos"** donde cada foro es un "plano" que brilla con intensidad proporcional a su actividad.

```typescript
// Componente principal: ForumConstellation
// Inspirado en: Pinterest + Discord + Are.na
```

**Estructura de la vista:**

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]  FOROS  [Buscar... 🔍]  [Crear Foro +]  [👤 Perfil] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  🔥 TRENDING │  │  📈 RISING  │  │  🆕 NEW      │         │
│  │  Esta semana │  │  Últimas 24h│  │  Recientes  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  [MAPA DE CALOR / CONSTELACIÓN DE FOROS]             ║ │
│  ║                                                       ║ │
│  ║  Cada foro es un "nodo" con:                         ║ │
│  ║  • Tamaño ∝ actividad semanal                        ║ │
│  ║  • Color ∝ categoría (rojo=deck, azul=rules...)     ║ │
│  ║  • Brillo/pulso ∝ posts en la última hora            ║ │
│  ║  • Conexiones entre foros relacionados               ║ │
│  ║                                                       ║ │
│  ║  [Interacción: hover expande, click navega]          ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LISTA ALTERNATIVA (vista toggle):                  │   │
│  │  [Grid] [Lista] [Mapa] [Timeline]                   │   │
│  │  ─────────────────────────────────────────────────   │   │
│  │  [Filtros: Categoría ▼] [Actividad ▼] [Idioma ▼]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Algoritmo de Recomendaciones (Weekly Activity Score)

```typescript
// Fórmula de scoring para "Foros con más actividad"
function calculateWeeklyActivityScore(forum: Forum): number {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Métricas ponderadas
  const newThreads = forum.threads.filter(t => t.createdAt > oneWeekAgo).length;
  const newPosts = forum.posts.filter(p => p.createdAt > oneWeekAgo).length;
  const newMembers = forum.members.filter(m => m.joinedAt > oneWeekAgo).length;
  const uniquePosters = new Set(forum.posts
    .filter(p => p.createdAt > oneWeekAgo)
    .map(p => p.authorId)).size;

  // Fórmula exponencial decay para recencia
  const recencyBonus = forum.lastActivityAt > new Date(Date.now() - 24 * 60 * 60 * 1000) 
    ? 1.5 : 1.0;

  return Math.round(
    (newThreads * 10 + 
     newPosts * 3 + 
     newMembers * 5 + 
     uniquePosters * 8) * recencyBonus
  );
}

// Query para obtener top foros
// SELECT * FROM forums 
// WHERE moderationStatus = 'APPROVED'
// ORDER BY weeklyActivityScore DESC, lastActivityAt DESC
// LIMIT 20;
```

### 2.3 Sistema de Búsqueda Avanzada

```typescript
interface ForumSearchParams {
  query: string;                    // Texto libre
  searchIn: ('name' | 'description' | 'tags' | 'content')[];
  category?: ForumCategory;
  activityLevel?: 'high' | 'medium' | 'low' | 'all';
  memberCountRange?: { min: number; max: number };
  language?: string;
  sortBy: 'relevance' | 'activity' | 'members' | 'newest' | 'name';
  dateRange?: { from: Date; to: Date };
  isNSFW?: boolean;
  includePrivate?: boolean; // Solo si el usuario es miembro
}

// Implementación de búsqueda con debounce y sugerencias
// Sugerencias tipo: "¿Quieres buscar 'deck commander' en [Decks]?"
```

**UI del buscador:**

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Buscar foros, temas, cartas, jugadores...                │
│  ─────────────────────────────────────────────────────────   │
│  [Avanzado ▼]                                               │
│                                                             │
│  ┌─ Filtros ─────────────────────────────────────────┐     │
│  │ Buscar en: [✓] Nombre  [✓] Descripción  [ ] Tags │     │
│  │ Categoría: [Todas ▼]                              │     │
│  │ Actividad: [Alta ▼]                               │     │
│  │ Idioma: [Español ▼]                               │     │
│  │ Ordenar por: [Relevancia ▼]                       │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CREACIÓN DE FOROS

### 3.1 Flujo de Creación (Wizard de 3 pasos)

```typescript
// Paso 1: Información Básica
interface ForumCreationStep1 {
  name: string;           // Validación: único, 3-50 chars
  slug: string;           // Auto-generado, editable
  description: string;    // 10-500 chars
  category: ForumCategory;
  tags: string[];         // Max 5, sugerencias de MTG
  coverImage?: File;
  bannerImage?: File;
  language: string;       // Idioma principal
}

// Paso 2: Configuración de Privacidad
interface ForumCreationStep2 {
  isPrivate: boolean;
  isNSFW: boolean;
  requireApprovalToJoin: boolean;
  allowGuestViewing: boolean;
}

// Paso 3: Configuración Inicial de Roles
interface ForumCreationStep3 {
  roles: CreateRoleInput[];
  defaultRole: string;
}
```

**Validación en tiempo real:**
- Slug único (check async)
- Moderación automática del nombre y descripción ANTES de crear
- Preview del foro mientras se configura

---

## 4. SISTEMA DE ROLES Y PERMISOS (Tipo Discord)

### 4.1 Gestión de Roles por el Creador

```typescript
// Vista de administración de roles
interface RoleManagementUI {
  // Drag & drop para reordenar jerarquía
  // Color picker con preset de colores MTG (WUBRG)
  // Toggle switches para cada permiso

  defaultPermissions: ForumPermissions = {
    canView: true,
    canPost: true,
    canCreateThread: true,
    canEditOwnContent: true,
    canDeleteOwnContent: true,
    canDeleteAnyContent: false,
    canPinThreads: false,
    canLockThreads: false,
    canManageRoles: false,
    canBanUsers: false,
    canInviteUsers: true,
    canEditForumSettings: false,
    canViewAuditLog: false,
    canModerate: false,
  };
}
```

**UI de gestión de roles:**

```
┌─────────────────────────────────────────────────────────────┐
│  GESTIÓN DE ROLES — "Foro Commander 2024"                   │
├─────────────────────────────────────────────────────────────┤
│  [+ Nuevo Rol]  [Importar desde plantilla]                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⋮⋮  👑 Administrador          [Color: #FFD700]     │   │
│  │  ⋮⋮  🛡️ Moderador             [Color: #4169E1]     │   │
│  │  ⋮⋮  💬 Miembro Verificado    [Color: #32CD32]     │   │
│  │  ⋮⋮  👤 Miembro               [Color: #808080]     │   │
│  │  ⋮⋮  🚫 Silenciado            [Color: #FF0000]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Permisos de "Moderador" ─────────────────────────┐    │
│  │                                                    │    │
│  │  [✓] Ver foro              [✓] Publicar posts      │    │
│  │  [✓] Crear hilos           [✓] Editar propio      │    │
│  │  [✓] Eliminar propio       [✓] Eliminar cualquiera│    │
│  │  [✓] Fijar hilos           [✓] Cerrar hilos       │    │
│  │  [ ] Gestionar roles       [✓] Banear usuarios    │    │
│  │  [✓] Invitar usuarios      [ ] Editar configuración│   │
│  │  [✓] Ver registro de auditoría                     │    │
│  │  [✓] Moderar (super-moderador)                     │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  [Guardar cambios]  [Eliminar rol]  [Duplicar rol]         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Gestión de Usuarios por el Creador

```typescript
interface ForumUserManagement {
  // Lista de miembros con:
  // - Filtros por rol, actividad, fecha de unión
  // - Acciones: cambiar rol, banear, expulsar, silenciar
  // - Registro de auditoría de acciones del creador

  banUser(userId: string, reason: string, duration?: '1d' | '7d' | '30d' | 'permanent');
  assignRole(userId: string, roleId: string);
  removeUser(userId: string);
}
```

---

## 5. SISTEMA DE MODERACIÓN AUTOMÁTICA MULTILINGÜE

### 5.1 Motor de Detección de Contenido Inapropiado

```typescript
interface ContentModerationEngine {
  // Pipeline de moderación
  async moderateContent(content: string, context: ModerationContext): Promise<ModerationResult>;
}

interface ModerationContext {
  contentType: 'FORUM_CREATION' | 'THREAD_CREATION' | 'POST_CREATION' | 'FORUM_NAME' | 'FORUM_DESCRIPTION';
  authorId: string;
  forumId?: string;
  userReputation: number; // Historial del usuario
  userPreviousViolations: number;
}

interface ModerationResult {
  action: 'ALLOW' | 'PENDING_REVIEW' | 'BLOCK';
  confidence: number;
  flags: ModerationFlag[];
  suggestedAction: string;
  autoRejectReason?: string;
}
```

### 5.2 Diccionarios y Reglas por Idioma

```typescript
// Configuración de moderación multilingüe
const moderationConfig = {
  languages: ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh'],

  // Listas de palabras (actualizables sin deploy)
  wordLists: {
    profanity: {
      es: ['palabra1', 'palabra2', /* ... */],
      en: ['word1', 'word2', /* ... */],
      // ...
    },
    slurs: { /* ... */ },
    wizardsViolations: {
      // Términos que violan políticas de Wizards of the Coast
      // Ej: contenido sexual explícito, discurso de odio, etc.
      es: ['lista_específica'],
      en: ['specific_list'],
    }
  },

  // Reglas de Wizards of the Coast
  wizardsRules: {
    noHarassment: true,
    noHateSpeech: true,
    noExplicitContent: true,
    noCounterfeitDiscussion: true,
    noGamblingPromotion: true,
    noDoxxing: true,
    noImpersonation: true,
  },

  // Umbrales de confianza
  thresholds: {
    autoBlock: 0.85,      // Bloqueo automático
    pendingReview: 0.60,  // Revisión humana obligatoria
    flagForInfo: 0.40,    // Flag visible pero publicado
  }
};
```

### 5.3 Flujo de Moderación

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE MODERACIÓN                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Usuario envía contenido]                                  │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────┐                                │
│  │  PRE-FILTRADO RÁPIDO    │                                │
│  │  • Regex de palabras    │                                │
│  │  • Longitud mín/máx     │                                │
│  │  • Rate limiting        │                                │
│  └─────────────────────────┘                                │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────┐                                │
│  │  ANÁLISIS NLP MULTILINGÜE│                               │
│  │  • AWS Comprehend        │                                │
│  │  • Perspective API       │                                │
│  │  • Diccionario custom    │                                │
│  │  • Contexto semántico    │                                │
│  └─────────────────────────┘                                │
│         │                                                   │
│    ┌────┴────┬────────┬────────┐                            │
│    ▼         ▼        ▼        ▼                            │
│ [ALLOW]  [FLAG]  [PENDING] [BLOCK]                          │
│    │        │        │        │                             │
│    ▼        ▼        ▼        ▼                             │
│ Publica  Publica  Cola de  Rechaza                         │
│ directo  con aviso revisión  + notifica                     │
│          suave    admin    + explica                        │
│                                                             │
│  ┌─────────────────────────┐                                │
│  │  COLA DE REVISIÓN ADMIN │                                │
│  │  • Dashboard de mods     │                                │
│  │  • Contexto completo     │                                │
│  │  • Historial del usuario │                                │
│  │  • Acción: ✓ Aprobar / ✗ Rechazar / ⚠️ Editar          │
│  └─────────────────────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 UI de la Cola de Moderación (Para Administradores)

```
┌─────────────────────────────────────────────────────────────┐
│  COLA DE MODERACIÓN                    [🔔 12 pendientes]  │
├─────────────────────────────────────────────────────────────┤
│  [Todas] [Foros] [Hilos] [Posts] [Rechazadas] [Aprobadas]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ PENDIENTE  Hace 5 min                            │   │
│  │                                                     │   │
│  │  Foro: "Commander degenerado"                       │   │
│  │  Creador: @user123                                  │   │
│  │  Razón: Posible violación de Wizards (nombre)       │   │
│  │  Palabras detectadas: "degenerado" (confianza: 0.72)│   │
│  │  Idioma detectado: Español                          │   │
│  │                                                     │   │
│  │  [Ver completo] [✓ Aprobar] [✗ Rechazar] [✏️ Editar]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ PENDIENTE  Hace 12 min                           │   │
│  │                                                     │   │
│  │  Post en: "Foro de Estrategia"                      │   │
│  │  Autor: @player99                                   │   │
│  │  Razón: Lenguaje ofensivo detectado                 │   │
│  │  Palabras: [lista censurada]                        │   │
│  │  Contexto: "Esa carta es una [censurada] basura"   │   │
│  │  Nota: Contexto podría ser legítimo (opinión juego) │   │
│  │                                                     │   │
│  │  [✓ Aprobar] [✗ Rechazar] [✏️ Editar] [🚫 Banear]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. DISEÑO DE INTERFAZ (UI/UX) — INNOVACIÓN

### 6.1 Principios de Diseño

1. **"El Stack de Magic"**: La UI debe evocar la sensación de apilar cartas, con profundidad, sombras y capas.
2. **"Mana Gradient"**: Usar los colores de mana (WUBRG) como sistema de acento, no como tema principal.
3. **"Hover Revela"**: Información secundaria aparece en hover, manteniendo la vista limpia.
4. **"Micro-interacciones con significado"**: Cada acción tiene una animación que comunica estado.
5. **"Dark mode first"**: MTG es nocturno por naturaleza.

### 6.2 Componentes Visuales Clave

```css
/* Variables de diseño */
:root {
  --mana-white: #F0F2C0;
  --mana-blue: #67C0F1;
  --mana-black: #9E9E9E;
  --mana-red: #F06B5D;
  --mana-green: #4CAF50;
  --mana-colorless: #C0C0C0;

  --bg-primary: #0D0D0D;
  --bg-secondary: #1A1A1A;
  --bg-tertiary: #262626;
  --bg-card: #1E1E1E;

  --border-subtle: rgba(255,255,255,0.08);
  --border-glow: rgba(103, 192, 241, 0.3);

  --font-display: 'Cinzel', serif; /* Tipo carta Magic */
  --font-body: 'Inter', sans-serif;
}

/* Efecto "carta" para foros */
.forum-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* Sombra tipo carta Magic */
  box-shadow: 
    0 4px 6px -1px rgba(0,0,0,0.3),
    0 2px 4px -1px rgba(0,0,0,0.2);
}

.forum-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 20px 25px -5px rgba(0,0,0,0.5),
    0 0 20px var(--border-glow);
  border-color: var(--mana-blue);
}

/* Indicador de actividad tipo "brillo" */
.activity-pulse {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mana-green);
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  50% { transform: scale(2); opacity: 0; }
  100% { transform: scale(0.8); opacity: 0; }
}
```

### 6.3 Layout de la Vista de Foro (Interior)

```
┌─────────────────────────────────────────────────────────────┐
│  [Volver]  FOROS / Commander / [Foro Actual]    [🔍] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [BANNER DEL FORO - 1200x300]                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  [ICONO]  Nombre del Foro                   │    │   │
│  │  │  Descripción breve... • 1.2k miembros       │    │   │
│  │  │  [Unirse] [Compartir] [⋮ Más]               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Fijados] [Nuevos] [Populares] [Sin respuesta] [Míos]     │
│  [Crear Hilo +]                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📌 FIJADO                                            │   │
│  │  ┌───────────────────────────────────────────────┐   │   │
│  │  │ [Icono] Título del hilo fijado                │   │   │
│  │  │ Por @autor • hace 2h • 45 respuestas • 🔥 234 │   │   │
│  │  └───────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │  ┌───────────────────────────────────────────────┐   │   │
│  │  │ [Icono] Título del hilo normal                │   │   │
│  │  │ Por @autor • hace 5h • 12 respuestas          │   │   │
│  │  │ [Vista previa del primer mensaje...]          │   │   │
│  │  └───────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cargar más...]  o  Scroll infinito                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. ENDPOINTS API (REST + WebSocket)

### 7.1 REST Endpoints

```typescript
// Foros
GET    /api/forums?sort=activity&period=week&limit=20
GET    /api/forums/search?q={query}&filters={...}
POST   /api/forums                    // Crear foro (con moderación)
GET    /api/forums/:slug
PATCH  /api/forums/:id                // Solo creador/admin
DELETE /api/forums/:id                // Solo creador

// Roles
GET    /api/forums/:id/roles
POST   /api/forums/:id/roles          // Crear rol
PATCH  /api/forums/:id/roles/:roleId
DELETE /api/forums/:id/roles/:roleId

// Miembros
GET    /api/forums/:id/members
POST   /api/forums/:id/members        // Unirse
DELETE /api/forums/:id/members/:userId // Expulsar
PATCH  /api/forums/:id/members/:userId/role
POST   /api/forums/:id/members/:userId/ban

// Hilos
GET    /api/forums/:id/threads?sort=&filter=
POST   /api/forums/:id/threads        // Crear hilo (con moderación)
GET    /api/forums/:id/threads/:threadId
PATCH  /api/forums/:id/threads/:threadId
DELETE /api/forums/:id/threads/:threadId

// Posts
GET    /api/threads/:id/posts
POST   /api/threads/:id/posts         // Crear post (con moderación)
PATCH  /api/posts/:id
DELETE /api/posts/:id

// Moderación
GET    /api/moderation/queue          // Cola de revisión
POST   /api/moderation/:id/approve
POST   /api/moderation/:id/reject
GET    /api/moderation/stats
```

### 7.2 Eventos WebSocket

```typescript
// Eventos en tiempo real
forum:activity_update      // Score de actividad cambió
forum:new_thread           // Nuevo hilo en foro
forum:new_post             // Nuevo post en hilo
forum:member_joined        // Alguien se unió
forum:member_left          // Alguien se fue
forum:role_updated         // Cambio de permisos
moderation:content_flagged // Contenido marcado
moderation:content_resolved // Contenido aprobado/rechazado
```

---

## 8. IMPLEMENTACIÓN POR FASES (Roadmap)

| Fase | Funcionalidad | Prioridad |
|------|--------------|-----------|
| **Fase 1** | Estructura de datos, API base, creación de foros simple | Alta |
| **Fase 2** | Sistema de roles y permisos, gestión de miembros | Alta |
| **Fase 3** | Motor de búsqueda avanzada, recomendaciones | Alta |
| **Fase 4** | Moderación automática multilingüe, cola de revisión | Alta |
| **Fase 5** | UI innovadora, animaciones, dark mode, responsive | Media |
| **Fase 6** | WebSockets, notificaciones, tiempo real | Media |
| **Fase 7** | Optimización, cache, SEO, tests | Media |

---

## 9. PREGUNTAS OBLIGATORIAS PARA `askUserQuestion`

Claude **DEBE** preguntar antes de implementar:

1. **Stack tecnológico:** ¿Ya existe un stack definido o puedo proponer uno (React/Next.js + Node/NestJS + PostgreSQL)?

2. **Autenticación:** ¿Existe ya un sistema de usuarios/auth o debo implementarlo? ¿Qué proveedor (Auth0, Firebase, custom JWT)?

3. **Base de datos:** ¿Hay esquemas existentes para usuarios/decks que deba respetar? ¿Puedo ver el DDL actual?

4. **Moderación:** ¿Prefieres un servicio cloud (AWS Comprehend, Google Perspective) o un modelo local (transformers.js)? ¿Hay presupuesto para APIs de pago?

5. **Idiomas:** ¿Qué idiomas son prioritarios para la moderación? ¿Español e inglés son suficientes para el MVP?

6. **Diseño:** ¿Existe un design system o guía de estilo actual? ¿Debo crear uno desde cero?

7. **Almacenamiento de imágenes:** ¿Qué servicio usar para banners e iconos de foros (S3, Cloudinary, local)?

8. **Notificaciones:** ¿Se requieren notificaciones push/email cuando un contenido es aprobado/rechazado?

9. **Límites:** ¿Hay límites de tamaño para foros (máx miembros, máx posts)? ¿Rate limiting?

10. **Integración con decks:** ¿Los foros deben poder vincularse a cartas/decks específicos del deckbuilder?

---

## 10. CHECKLIST DE CALIDAD

Antes de dar por terminada cualquier funcionalidad, Claude debe verificar:

- [ ] Tests unitarios cubren >80% de la lógica de negocio
- [ ] Tests de integración para flujos críticos (creación, moderación, permisos)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accesibilidad (WCAG 2.1 AA mínimo)
- [ ] Dark mode funcional
- [ ] Animaciones respetan `prefers-reduced-motion`
- [ ] Rate limiting implementado en todos los endpoints públicos
- [ ] Sanitización de inputs (XSS, SQL injection)
- [ ] Logs de auditoría para acciones de moderación
- [ ] Documentación de API (OpenAPI/Swagger)
