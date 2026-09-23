export const hasPermission = (permissions, module, action) => {
  return !!permissions?.[module]?.[action];
};