/**
 * Términos de búsqueda para cada categoría de grupo muscular.
 * Configurables en el futuro desde DB o archivo YAML.
 */
export interface SearchTermsConfig {
  [category: string]: string[]
}

export const DEFAULT_SEARCH_TERMS: SearchTermsConfig = {
  Chest: [
    'chest workout',
    'muscular man chest',
    'bodybuilder chest',
    'bench press',
  ],
  Back: [
    'back workout',
    'lat muscles',
    'pull up back',
    'bodybuilder back',
  ],
  Legs: [
    'legs workout',
    'squat legs',
    'strong legs',
    'leg day gym',
  ],
  Shoulders: [
    'shoulder workout',
    'dumbbell press shoulders',
    'deltoids gym',
  ],
  Biceps: [
    'biceps curl',
    'arm workout biceps',
    'bicep gym',
  ],
  Triceps: [
    'triceps workout',
    'tricep dip',
    'arm extension',
  ],
  Core: [
    'abs workout',
    'six pack abs',
    'core strength',
  ],
  Cardio: [
    'running athlete',
    'cardio workout',
    'treadmill gym',
  ],
  'Full Body': [
    'full body workout',
    'gym strength training',
    'fitness gym',
  ],
  Default: [
    'gym workout',
    'fitness equipment',
    'athlete training',
  ],
}

// Tema especial para grupos de estilo griego/mitológico
export const GREEK_THEME_TERMS: string[] = [
  'greek statue gym',
  'hercules physique',
  'atlas bodybuilding',
  'zeus god fitness',
  'olympia bodybuilder',
]

/**
 * Retorna los términos de búsqueda para una categoría.
 * Si la categoría no existe, usa 'Default'.
 */
export function getSearchTerms(category: string, config?: SearchTermsConfig): string[] {
  const terms = config || DEFAULT_SEARCH_TERMS
  return terms[category] || terms['Default'] || terms['Default']
}
