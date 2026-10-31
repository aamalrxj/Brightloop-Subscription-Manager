// more than 8 chars, 1 upper, 1 lower, 1 special
export const passwordRule =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;