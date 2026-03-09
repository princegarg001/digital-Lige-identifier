/**
 * Maps English phonemes (ARPABET or IPA approximations) to Oculus Visemes.
 * Ready Player Me uses 15 standard Oculus Visemes for lip sync.
 */
export const phonemeToVisemeMap: Record<string, string> = {
  // Vowels
  'A': 'viseme_aa',
  'AA': 'viseme_aa',
  'AE': 'viseme_E', // 'bat'
  'AH': 'viseme_aa', // 'but'
  'AO': 'viseme_O', // 'bought'
  'AW': 'viseme_O', // 'cow'
  'AY': 'viseme_aa', // 'bite'
  'E': 'viseme_E',
  'EH': 'viseme_E', // 'bet'
  'ER': 'viseme_RR', // 'bird'
  'EY': 'viseme_E', // 'bait'
  'I': 'viseme_I',
  'IH': 'viseme_I', // 'bit'
  'IY': 'viseme_I', // 'beat'
  'O': 'viseme_O',
  'OW': 'viseme_O', // 'boat'
  'OY': 'viseme_O', // 'boy'
  'U': 'viseme_U',
  'UH': 'viseme_U', // 'book'
  'UW': 'viseme_U', // 'boot'

  // Consonants
  'B': 'viseme_PP',
  'P': 'viseme_PP',
  'M': 'viseme_PP',
  'F': 'viseme_FF',
  'V': 'viseme_FF',
  'TH': 'viseme_TH',
  'DH': 'viseme_TH',
  'T': 'viseme_DD',
  'D': 'viseme_DD',
  'S': 'viseme_SS',
  'Z': 'viseme_SS',
  'SH': 'viseme_CH',
  'ZH': 'viseme_CH',
  'CH': 'viseme_CH',
  'JH': 'viseme_CH', // 'J'
  'K': 'viseme_kk',
  'G': 'viseme_kk',
  'R': 'viseme_RR',
  'N': 'viseme_nn',
  'NG': 'viseme_nn',
  'L': 'viseme_nn',
  'Y': 'viseme_I',
  'W': 'viseme_U',
  'HH': 'viseme_CH', // 'H'
  
  // Silence / pauses
  'SIL': 'viseme_sil',
  ' ': 'viseme_sil',
};

export const OCULUS_VISEMES = [
  'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH',
  'viseme_DD', 'viseme_kk', 'viseme_CH', 'viseme_SS',
  'viseme_nn', 'viseme_RR', 'viseme_aa', 'viseme_E',
  'viseme_I', 'viseme_O', 'viseme_U'
];
