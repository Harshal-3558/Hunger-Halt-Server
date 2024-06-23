import bycrpt from "bcryptjs";

const saltRound = 10;

export const hashPassword = (password) => {
  const salt = bycrpt.genSaltSync(saltRound);
  return bycrpt.hashSync(password, salt);
};
