# Estándares de Código - Cabo Health Nova

## TypeScript

### Configuración
- **Estricto**: TypeScript estricto habilitado
- **Target**: ES2020 o superior
- **Module**: ESNext
- **Path Mapping**: `@/*` mapea a `./src/*`

### Reglas de Tipado
```typescript
// ✅ CORRECTO - Interfaces para componentes
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

// ✅ CORRECTO - Props destructuring
function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  // implementation
}

// ❌ INCORRECTO - Usar 'any'
function component(props: any) { }

// ❌ INCORRECTO - Props sin tipado
function component(props) { }
```

### Tipos Preferidos
- **Interfaces** para props de componentes
- **Types** para unions y intersections
- **Enums** para constantes relacionadas
- **Generics** para componentes reutilizables

## React

### Componentes
```typescript
// ✅ CORRECTO - Componente funcional con hooks
function Component({ title }: ComponentProps) {
  const [state, setState] = useState();
  
  useEffect(() => {
    // effect logic
  }, []);
  
  return <div>{title}</div>;
}

// ❌ INCORRECTO - Class components (no usar)
class Component extends React.Component { }
```

### Estado Management
```typescript
// ✅ CORRECTO - Context API para estado global
const AuthContext = createContext<AuthContextType | null>(null);

// ✅ CORRECTO - Estado local con hooks
const [data, setData] = useState<DataType>(initialData);

// ❌ INCORRECTO - Estado global innecesario
const globalState = {};
```

### Props ychildren
```typescript
// ✅ CORRECTO - Props destructuring
function Card({ children, className }: CardProps) {
  return <div className={cn("base-class", className)}>{children}</div>;
}

// ✅ CORRECTO - children como React.ReactNode
interface ComponentProps {
  children: React.ReactNode;
}
```

## Supabase

### Cliente y Configuración
```typescript
// ✅ CORRECTO - Cliente configurado en lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Query Patterns
```typescript
// ✅ CORRECTO - Query con RLS
const { data, error } = await supabase
  .from('consultations')
  .select('*')
  .eq('user_id', user.id);

// ✅ CORRECTO - Insert con tipos
const { data, error } = await supabase
  .from('consultations')
  .insert({
    user_id: user.id,
    patient_name,
    // ...
  });
```

### Edge Functions
```typescript
// ✅ CORRECTO - Edge function con Deno
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  // function logic
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

## Estilos (TailwindCSS + Radix UI)

### Componentes UI
```typescript
// ✅ CORRECTO - Usar componentes Radix UI
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

function Modal() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button>Open</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### TailwindCSS
```typescript
// ✅ CORRECTO - Usar TailwindCSS
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-800">Title</h2>
</div>

// ❌ INCORRECTO - Inline styles excesivo
<div style={{ display: 'flex', padding: '16px' }}>
```

### Responsive Design
```typescript
// ✅ CORRECTO - Mobile-first
<div className="
  p-4 
  md:p-6 
  lg:p-8 
  flex 
  flex-col 
  md:flex-row
">
  <span className="text-sm md:text-base lg:text-lg">
    Responsive text
  </span>
</div>
```

## Formularios (React Hook Form)

### Configuración
```typescript
// ✅ CORRECTO - Con Zod validation
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema)
});
```

## Manejo de Errores

### Error Boundaries
```typescript
// ✅ CORRECTO - ErrorBoundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

### Supabase Error Handling
```typescript
// ✅ CORRECTO - Manejo de errores Supabase
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Supabase error:', error);
  throw error;
}
```

## Seguridad

### Sanitización HTML
```typescript
// ✅ CORRECTO - DOMPurify para contenido dinámico
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'table', 'tr', 'td', 'th'],
  ALLOWED_ATTR: ['href', 'class', 'id'],
});
```

### Variables de Entorno
```typescript
// ✅ CORRECTO - Usar import.meta.env para Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// ❌ INCORRECTO - Usar process.env (no funciona con Vite)
const apiKey = process.env.API_KEY;
```

## Performance

### Optimización de Bundle
```typescript
// ✅ CORRECTO - Lazy loading de componentes
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// ✅ CORRECTO - useCallback para funciones estables
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);

// ✅ CORRECTO - useMemo para cálculos costosos
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### Audio Processing
```typescript
// ✅ CORRECTO - Limpieza de recursos de audio
useEffect(() => {
  const audioContext = new AudioContext();
  
  return () => {
    audioContext.close();
    // cleanup other audio resources
  };
}, []);
```

## Nomenclatura

### Archivos y Carpetas
- **Componentes**: PascalCase (`AuthForm.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useAuth.ts`)
- **Utilidades**: camelCase (`audioUtils.ts`)
- **Servicios**: camelCase (`audioService.ts`)
- **Constantes**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)

### Variables y Funciones
- **Funciones**: camelCase (`getUserData`, `handleSubmit`)
- **Props**: camelCase (`onClick`, `userName`)
- **Estados**: camelCase (`userData`, `isLoading`)

---

## Linting y Formato

### ESLint Rules Aplicadas
- `react-hooks/exhaustive-deps`
- `react-refresh/only-export-components`
- `@typescript-eslint/no-unused-vars`
- `react-hooks/rules-of-hooks`

### Prettier Configuration
- **Print Width**: 80
- **Tab Width**: 2
- **Semicolons**: true
- **Quotes**: single
- **Trailing Commas**: es5

---

*Este documento debe actualizarse cuando se cambien estándares o se añadan nuevas tecnologías al proyecto.*