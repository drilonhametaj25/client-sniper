# Design system TrovaMi

Una pagina. Leggila prima di toccare una schermata.
Token: `app/globals.css` + `tailwind.config.js` · Primitive: `components/ui/`

---

## Le 3 regole che decidono tutto

1. **Una cosa sola per schermata.** C'e' un soggetto evidente; tutto il resto e'
   piu' piccolo, piu' grigio, piu' lontano. Se due elementi competono, uno e' nel
   posto sbagliato.
2. **Il contenuto e' l'interfaccia.** Il prodotto e' il lead e il motivo per cui
   vale. Bordi, box e decorazioni spariscono dietro al contenuto.
3. **Un solo accento.** Il blu marca UNA azione per schermata. Verde/ambra/rosso
   solo per stato, in tinta tenue.

---

## Colori — usa solo questi nomi

Non esistono `bg-white`, `text-gray-500`, `dark:bg-gray-800` nel codice nuovo.
Il tema scuro deriva dai token: se usi i nomi giusti, funziona da solo.

| Classe | Quando | Chiaro / Scuro |
|---|---|---|
| `bg-surface` | fondo pagina | `#FAFAFA` / `#17171A` |
| `bg-surface-elevated` | card, pannelli | `#FFFFFF` / `#1F1F23` |
| `bg-surface-subtle` | fill tenue: input, hover di riga, skeleton | `#F4F4F5` / `#26262B` |
| `bg-surface-overlay` | modali, dropdown, popover | `#FFFFFF` / `#27272C` |
| `text-content` | titoli e testo primario | `#18181B` / `#EDEDEF` |
| `text-content-muted` | testo secondario, frasi di spiegazione | `#52525B` / `#A1A1AA` |
| `text-content-subtle` | metadati, label, unita' di misura | `#6B6B75` / `#94949E` |
| `border-edge` | **default per ogni bordo** (hairline) | `#E4E4E7` / `#33333A` |
| `border-edge-strong` | separatore che deve leggersi | `#D4D4D8` / `#45454E` |
| `bg-accent` + `text-accent-on` | riempimento pieno: UN bottone per schermata | `#2563EB` (uguale nei due temi) |
| `bg-accent-hover` | hover del pieno | `#1D4ED8` (uguale nei due temi) |
| `bg-accent-soft` + `border-accent-edge` | sfondo tenue, riga evidenziata | `#EFF6FF` / `#1E2D4A` |
| `text-accent-ink` | accento come **testo o icona** su superficie neutra | `#1D4ED8` / `#60A5FA` |
| `text-success` `bg-success-soft` `border-success-edge` | esito positivo | `#15803D` / `#4ADE80` |
| `text-warning` `bg-warning-soft` `border-warning-edge` | attenzione | `#B45309` / `#FBBF24` |
| `text-danger` `bg-danger-soft` `border-danger-edge` | errore | `#B91C1C` / `#F87171` |
| `bg-danger-solid` | bottone distruttivo (solo eliminazioni) | `#DC2626` |
| `outline-focus` | anello di focus (usa `.focus-ring`) | `#2563EB` / `#60A5FA` |

`text-accent` (il pieno) come testo si legge male nel tema scuro: per il **testo
e le icone** usa sempre `text-accent-ink`. Il pieno d'accento e' identico nei due
temi di proposito, cosi' il bianco sopra resta sempre leggibile.

Tutte le coppie testo/sfondo qui sopra sono verificate a >= 4.5:1 in entrambi
i temi. Se inventi una coppia nuova, verificala.

---

## Tipografia — 8 voci, non una di piu'

| Classe | px / line-height | Uso |
|---|---|---|
| `text-metric` | 40 / 40 | il numero importante. **Sempre con `tabular-nums`** |
| `text-display` | 32 / 38 | hero di landing |
| `text-title` | 24 / 30 | titolo di pagina |
| `text-heading` | 18 / 24 | titolo di card o sezione |
| `text-body-lg` | 17 / 26 | lead di paragrafo |
| `text-body` | 15 / 24 | **corpo di default**, frasi intere in italiano |
| `text-caption` | 13 / 20 | testo secondario, didascalie |
| `text-micro` | 11 / 16 | metadati, label |

Pesi: `font-semibold` per i titoli, `font-medium` per bottoni e badge,
`font-normal` per tutto il resto. **Il testo secondario non e' mai in grassetto**:
per farlo arretrare si usa `text-content-muted`, non il peso.

---

## Forma, ombra, movimento

- Raggi: `rounded-control` (10px, bottoni/input/select) · `rounded-card` (14px,
  card) · `rounded-panel` (18px, modali e sheet) · `rounded-pill` (chip, pallini).
- Ombre: `shadow-card` (default, quasi invisibile) · `shadow-lift` (hover di card
  cliccabile) · `shadow-pop` (dropdown, modali). La profondita' la fa il bordo
  hairline, non l'ombra.
- Spazi: griglia da 4px. Dentro una card `p-6`; fra elementi correlati `gap-2`,
  fra blocchi diversi `gap-6`. Meglio meno informazioni con respiro.
- Movimento: `duration-fast` (120ms) · `duration-base` (160ms) ·
  `duration-slow` (220ms), con `ease-soft` o `ease-emphasized`. Solo come
  feedback a un'azione dell'utente. `prefers-reduced-motion` e' gia' gestito.
- Focus: classe `.focus-ring` (o `.focus-ring-inset` per righe e tab). Usa
  `outline` con offset trasparente: funziona sopra qualunque superficie.

---

## Primitive — `import { ... } from '@/components/ui'`

| Componente | Note |
|---|---|
| `Button` | `primary` \| `secondary` \| `ghost` \| `danger`; `sm/md/lg`; `loading`, `loadingText`, `icon`, `iconOnly`, `fullWidth`. `md` = 44px. `sm` (40px) solo su barre dense desktop. **Un solo `primary` per schermata.** |
| `Card` | `+ CardHeader / CardTitle / CardBody / CardFooter`. `padding` `none/sm/md/lg/xl`. Si solleva **solo** se `interactive` (cioe' cliccabile). |
| `Badge` | `neutral` (default) \| `accent` \| `success` \| `warning` \| `error` \| `outline`; `dot`, `pill`, `icon`. |
| `Input` / `Select` | 44px, label collegata, `error` annunciato via `aria-describedby`. `Select` e' nativo di proposito. |
| `EmptyState` | icona quieta + titolo + **una** riga + **una** azione. |
| `Skeleton` | `+ SkeletonText / SkeletonCard / SkeletonList`. Ha la forma del contenuto in arrivo, cosi' la pagina non salta. |
| `LoadingSpinner` | solo dove non si conosce la forma del contenuto (mappe, grafici). Mai nelle liste. |

Scrivi le classi con `cn()` da `@/lib/utils/cn`, e metti sempre `className`
per ultimo cosi' chi usa il componente puo' sovrascrivere.

---

## VIETATO

- **Gradienti** su card, superfici, bottoni, badge, testo. Nessun `bg-gradient-*`.
- **Glassmorphism**: `bg-white/70`, `backdrop-blur`, bordi semitrasparenti.
  `Card variant="glass"` esiste solo per retrocompatibilita' e rende come
  `default`.
- **Badge multicolore in fila.** In una card c'e' al massimo UN badge colorato;
  gli altri sono `neutral`. Se un badge non dice uno stato o un metadato, si toglie.
- **Emoji come icone di sistema.** Si usa `lucide-react`, 16px, `text-content-subtle`.
- **Colori hardcoded e classi `dark:*`** nel codice nuovo. Se ti serve un colore
  che non e' in tabella, il colore giusto e' un token che gia' esiste.
- **Bordi colorati spessi** (`border-l-4 border-blue-500`) e ombre colorate.
- **Animazioni decorative**: pulse infiniti, hover che scalano, entrate a molla.
- **Gerghi in prima battuta.** Non "Opportunita 73" ma "Sito senza HTTPS e senza
  tracciamento: puoi vendergli il rifacimento". Il gergo tecnico sta nei dettagli,
  che sono collassati.

---

## Prima di dire "fatto"

1. Tema chiaro **e** scuro (`.dark` su `<html>`): nessun testo invisibile,
   nessun rettangolo bianco nel buio.
2. 375px / 768px / 1280px: niente scroll orizzontale, niente testo troncato.
3. Tab da tastiera: il focus si vede sempre.
4. Ogni controllo con sola icona ha `aria-label`; ogni target touch >= 44px.
5. Copertura mentale: se togli un elemento e nessuno lo rimpiange, va tolto.
