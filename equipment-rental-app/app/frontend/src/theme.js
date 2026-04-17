export const COLORS = {
  primary:   '#028090',
  primaryDark: '#0D2B2B',
  mint:      '#02C39A',
  mintLight: '#E1F5EE',
  orange:    '#F77F00',
  orangeLight: '#FFF3E0',
  red:       '#A32D2D',
  redLight:  '#FCEBEB',
  purple:    '#5E60CE',
  purpleLight: '#EEEDFE',
  gray:      '#6B7B8A',
  grayLight: '#F4F6F8',
  border:    '#E0E4E8',
  white:     '#FFFFFF',
  text:      '#1A1A1A',
  textSub:   '#6B7B8A',
  warning:   '#EF9F27',
  warningLight: '#FAEEDA',
};

export const STATUS = {
  AVAILABLE: { label: '대여 가능', color: COLORS.mint,     bg: COLORS.mintLight   },
  RENTED:    { label: '대여 중',   color: COLORS.red,      bg: COLORS.redLight    },
  REPAIRING: { label: '수리 중',   color: COLORS.warning,  bg: COLORS.warningLight},
  LOST:      { label: '분실',      color: COLORS.gray,     bg: COLORS.grayLight   },
};

export const RENTAL_STATUS = {
  ACTIVE:   { label: '대여 중',   color: COLORS.mint,    bg: COLORS.mintLight   },
  RETURNED: { label: '반납 완료', color: COLORS.gray,    bg: COLORS.grayLight   },
  OVERDUE:  { label: '연체',      color: COLORS.red,     bg: COLORS.redLight    },
};
